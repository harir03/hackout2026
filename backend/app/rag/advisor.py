from typing import Any

from google import genai
from google.genai import types

from app.rag.ingestion import query_collection

GENERATION_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are the ICA Credit Advisor, an AI assistant for the IntelliCredit Alternate credit scoring system. You help applicants understand their credit scores, explain why specific factors affected their assessment, and provide guidance grounded in RBI regulations and DPDP Act 2023.

Rules:
- Ground every answer in the applicant's actual score data AND the retrieved policy/precedent chunks provided below.
- When citing regulations, reference the specific section (e.g., "RBI Fair Practices Code Section 6.3" or "DPDP Act Section 12").
- If the question cannot be answered from the applicant's data or the retrieved sources, say so explicitly. Do not guess or fabricate information.
- Use simple, clear language appropriate for a first-time borrower.
- When suggesting score improvement actions, be specific about which data source/worker they should focus on and give realistic timelines.
- All data shown is simulated for demonstration purposes."""


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
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    def answer(
        self,
        question: str,
        score_result: dict[str, Any],
        api_key: str,
    ) -> dict[str, Any]:
        applicant_context = _build_applicant_context(score_result)

        retrieved_policy = query_collection(
            "rbi_guidelines", question, api_key, n_results=4,
        )
        retrieved_precedents = query_collection(
            "lending_precedents", question, api_key, n_results=2,
        )

        prompt = _build_generation_prompt(
            question, applicant_context, retrieved_policy, retrieved_precedents,
        )

        response = self.client.models.generate_content(
            model=GENERATION_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.3,
            ),
        )

        sources_used = [
            {"id": chunk["id"], "source": chunk["source"], "excerpt": chunk["text"][:200]}
            for chunk in retrieved_policy + retrieved_precedents
        ]

        return {
            "answer": response.text,
            "sources": sources_used,
            "applicant_context_used": True,
            "question": question,
        }


_advisor: Advisor | None = None


def get_advisor(api_key: str) -> Advisor:
    global _advisor
    if _advisor is None:
        _advisor = Advisor(api_key)
    return _advisor
