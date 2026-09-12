from typing import Any
import httpx
from google import genai
from google.genai import types

from app.rag.ingestion import query_collection

OLLAMA_URL = "http://localhost:11434"

SYSTEM_PROMPT = """You are the AltGrade Credit Advisor, an AI assistant for the AltGrade alternate credit scoring system.

RESPONSE FORMAT (MANDATORY):
- Structure every answer with clear sections using **bold headers**.
- Use bullet points for listing factors, recommendations, or data points.
- When referencing score factors, format as: **Factor Name** (Source Worker): +/- X.X pts
- When citing regulations, use the format: *RBI Fair Practices Code §6.3* or *DPDP Act §12*.
- Keep paragraphs short (2-3 sentences max).
- End with a **Recommendation** section with 2-3 actionable steps.

MULTILINGUAL INSTRUCTION (CRITICAL):
- Detect the language of the user's question (e.g. Hindi, Gujarati, Tamil, English).
- You MUST respond in the EXACT SAME LANGUAGE as the user's question (e.g., if asked in Hindi or Hinglish, answer in Hindi/Hinglish; if asked in Gujarati, answer in Gujarati script).

RULES:
- Ground every answer in the applicant's actual score data AND the retrieved policy/precedent chunks provided below.
- If the question cannot be answered from the data or sources, say so explicitly. Do not fabricate information.
- Use simple, clear language appropriate for a first-time borrower.
- When suggesting score improvement actions, be specific about which data source they should focus on and give realistic timelines (e.g., "3-6 months of consistent UPI usage")."""


def _build_applicant_context(score_result: dict[str, Any]) -> str:
    from pathlib import Path
    import json
    user_id = score_result.get("user_id")
    
    lines = [
        f"Applicant User ID: {user_id or 'N/A'}",
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
        top_positive = [f for f in shap if f["points"] > 0][:5]
        top_negative = [f for f in shap if f["points"] < 0][:5]

        if top_positive:
            pos_lines = [f"{f['worker']}/{f['label']}: {f['points']:+.1f} pts (value: {f.get('feature_value')})" for f in top_positive]
            lines.append(f"Top Positive Factors: {', '.join(pos_lines)}")

        if top_negative:
            neg_lines = [f"{f['worker']}/{f['label']}: {f['points']:+.1f} pts (value: {f.get('feature_value')})" for f in top_negative]
            lines.append(f"Top Negative Factors: {', '.join(neg_lines)}")

    if user_id:
        project_root = Path(__file__).resolve().parents[3]
        
        # 1. Load profiles.json for raw values (e.g. city: Bengaluru)
        try:
            profiles_file = project_root / "demo_data" / "profiles.json"
            if profiles_file.exists():
                profiles = json.loads(profiles_file.read_text())
                search_id = user_id.lower()
                if search_id in ("testhari@altgrade.in", "hari@altgrade.in"):
                    search_id = "hari"
                if search_id in profiles:
                    prof = profiles[search_id]
                    lines.append(f"Applicant Profile Metadata: Mobile={prof.get('mobile')}, Risk Profile={prof.get('risk_profile')}")
                    if "location_data" in prof:
                        lines.append(f"Location Data: {json.dumps(prof['location_data'])}")
                    if "bank_data" in prof:
                        lines.append(f"Bank Data: {json.dumps(prof['bank_data'])}")
                    if "ecommerce_data" in prof:
                        lines.append(f"E-commerce Data: {json.dumps(prof['ecommerce_data'])}")
                    if "gst_data" in prof:
                        lines.append(f"GST/Merchant Data: {json.dumps(prof['gst_data'])}")
                    if "questionnaire_data" in prof:
                        lines.append(f"Questionnaire Data: {json.dumps(prof['questionnaire_data'])}")
        except Exception as e:
            print(f"Failed to load profile in advisor context: {e}")

        # 2. Load interview_summaries.json for applicant answers
        try:
            summaries_file = project_root / "demo_data" / "interview_summaries.json"
            if summaries_file.exists():
                summaries = json.loads(summaries_file.read_text())
                if user_id in summaries:
                    lines.append(f"AI Conflict/Verification Interview Report (applicant's exact answers and credibility scores):\n{summaries[user_id]}")
        except Exception as e:
            print(f"Failed to load interview summary in advisor context: {e}")

        # 3. Load notifications.json for previous decisions/notes
        try:
            notifs_file = project_root / "demo_data" / "notifications.json"
            if notifs_file.exists():
                notifs = json.loads(notifs_file.read_text())
                if user_id in notifs:
                    n = notifs[user_id]
                    lines.append(
                        f"Previous Loan Officer Decision Details:\n"
                        f"- Decision: {n.get('decision')}\n"
                        f"- Approved Amount: \u20b9{n.get('loan_amount') or 'N/A'}\n"
                        f"- Interest Rate: {n.get('interest_rate') or 'N/A'}%\n"
                        f"- Repayment Terms: {n.get('terms') or 'N/A'}\n"
                        f"- Officer Decision Notes/Reasoning: {n.get('notes') or 'None'}\n"
                        f"- Timestamp: {n.get('timestamp')}"
                    )
        except Exception as e:
            print(f"Failed to load previous officer decision notes in advisor context: {e}")

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

        model_to_use = "phi3:mini"
        try:
            async with httpx.AsyncClient() as client:
                models_res = await client.get(f"{OLLAMA_URL}/api/tags", timeout=15.0)
                if models_res.status_code == 200:
                    available = [m["name"] for m in models_res.json().get("models", [])]
                    if not any(x in available for x in ["phi3:mini", "phi3:latest", "phi3"]):
                        if "llama3:latest" in available:
                            model_to_use = "llama3:latest"
                        elif "llama3" in available:
                            model_to_use = "llama3"
                        elif available:
                            model_to_use = available[0]
        except Exception as e:
            print(f"Failed to query Ollama models: {e}")

        try:
            async with httpx.AsyncClient(timeout=600.0) as client:
                res = await client.post(
                    f"{OLLAMA_URL}/api/chat",
                    json={
                        "model": model_to_use,
                        "messages": [
                            {"role": "system", "content": SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "stream": False,
                        "keep_alive": "10m",
                        "options": {
                            "temperature": 0.3,
                            "num_ctx": 2048,
                            "num_predict": 512,
                        }
                    },
                    timeout=600.0
                )
                if res.status_code == 200:
                    answer_text = res.json()["message"]["content"]
                else:
                    raise Exception(f"Ollama returned status {res.status_code}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Ollama local chat generation failed using model {model_to_use}: {e}. Trying Gemini or fallback.")

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
