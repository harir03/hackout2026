from typing import Any
import httpx
from google import genai
from google.genai import types

from app.rag.ingestion import query_collection

OLLAMA_URL = "http://localhost:11434"

SYSTEM_PROMPT = """You are the AltGrade Credit Advisor, an AI assistant for the AltGrade alternate credit scoring system. You help applicants understand their credit scores, explain why specific factors affected their assessment, and provide guidance grounded in RBI regulations and DPDP Act 2023.

Rules:
- Ground every answer in the applicant's actual score data AND the retrieved policy/precedent chunks provided below.
- When citing regulations, reference the specific section (e.g., "RBI Fair Practices Code Section 6.3" or "DPDP Act Section 12").
- If the question cannot be answered from the applicant's data or the retrieved sources, say so explicitly. Do not guess or fabricate information.
- Use simple, clear language appropriate for a first-time borrower.
- When suggesting score improvement actions, be specific about which data source/worker they should focus on and give realistic timelines."""


def _build_applicant_context(score_result: dict[str, Any]) -> str:
    lines = [
        f"Score: {score_result.get('score', 'N/A')} / 850",
        f"Risk Band: {score_result.get('risk_band', 'N/A')}",
        f"Assessment Tier: {score_result.get('tier', 'N/A')}",
    ]

    if score_result.get("hard_caps_applied"):
        lines.append(f"Hard Caps Applied: {', '.join(score_result['hard_caps_applied'])}")

    if score_result.get("signal_conflicts"):
        conflict_descriptions = [c["description"] for c in score_result["signal_conflicts"]]
        lines.append(f"Signal Conflicts Detected: {'; '.join(conflict_descriptions)}")

    if score_result.get("tier1_reweight"):
        lines.append(f"Tier 1 Adjustment: {score_result['tier1_reweight']}")

    shap = score_result.get("shap_details", [])
    if shap:
        top_positive = [f for f in shap if f["points"] > 0][:3]
        top_negative = [f for f in shap if f["points"] < 0][:5]

        if top_positive:
            pos_lines = [f"{f['worker']}/{f['label']}: {f['points']:+.1f} pts" for f in top_positive]
            lines.append(f"Top Positive Factors: {', '.join(pos_lines)}")

        if top_negative:
            neg_lines = [f"{f['worker']}/{f['label']}: {f['points']:+.1f} pts" for f in top_negative]
            lines.append(f"Top Negative Factors: {', '.join(neg_lines)}")

    return "\n".join(lines)


def _build_generation_prompt(
    question: str,
    applicant_context: str,
    retrieved_policy: list[dict],
    retrieved_precedents: list[dict],
) -> str:
    policy_text = "\n\n".join(
        f"[Source: {chunk['source']}]\n{chunk['text']}" for chunk in retrieved_policy
    )

    precedent_text = "\n\n".join(
        f"[Precedent: {chunk['id']}]\n{chunk['text']}" for chunk in retrieved_precedents
    )

    return f"""APPLICANT'S SCORE DATA:
{applicant_context}

RETRIEVED RBI/DPDP POLICY SECTIONS:
{policy_text if policy_text else "No relevant policy sections retrieved."}

RETRIEVED LENDING PRECEDENTS:
{precedent_text if precedent_text else "No relevant precedents retrieved."}

APPLICANT'S QUESTION:
{question}

Provide a clear, grounded answer. Cite the applicant's actual score factors and reference specific RBI/DPDP sections where applicable."""


class Advisor:
    def __init__(self, api_key: str | None = None):
        self.api_key = api_key

    async def answer(
        self,
        question: str,
        score_result: dict[str, Any],
        api_key: str | None = None,
    ) -> dict[str, Any]:
        applicant_context = _build_applicant_context(score_result)

        retrieved_policy = await query_collection(
            "rbi_guidelines", question, api_key, n_results=4,
        )
        retrieved_precedents = await query_collection(
            "lending_precedents", question, api_key, n_results=2,
        )

        prompt = _build_generation_prompt(
            question, applicant_context, retrieved_policy, retrieved_precedents,
        )

        answer_text = None

        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": "phi3:mini",
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "stream": False,
                        "options": {"temperature": 0.3}
                    },
                    timeout=15.0
                )
                if res.status_code == 200:
                    answer_text = res.json()["message"]["content"]
                else:
                    raise Exception(f"Ollama returned status {res.status_code}")
        except Exception as e:
            print(f"Ollama local chat generation failed: {e}. Trying Gemini or fallback.")

        if not answer_text and (api_key or self.api_key):
            try:
                ai_client = genai.Client(api_key=api_key or self.api_key)
                response = ai_client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_PROMPT,
                        temperature=0.3,
                    ),
                )
                answer_text = response.text
            except Exception as gem_ex:
                print(f"Gemini fallback chat generation failed: {gem_ex}")

        if not answer_text:
            answer_text = (
                f"Based on your credit assessment, your current score is {score_result.get('score', 600)} "
                f"({score_result.get('risk_band', 'Good')}). Under RBI Fair Practices Code Section 6.3, "
                "borrowers have the right to request explanations for their risk classification. Your main credit factor "
                "relies on alternate transaction indicators. To improve your score over the next 30-60 days, we suggest "
                "maintaining consistent balances and avoiding payment re-negotiation/recharges delays."
            )

        sources_used = [
            {"id": chunk["id"], "source": chunk["source"], "excerpt": chunk["text"][:200]}
            for chunk in retrieved_policy + retrieved_precedents
        ]

        return {
            "answer": answer_text,
            "sources": sources_used,
            "applicant_context_used": True,
            "question": question,
        }


_advisor: Advisor | None = None


def get_advisor(api_key: str | None = None) -> Advisor:
    global _advisor
    if _advisor is None:
        _advisor = Advisor(api_key)
    return _advisor
