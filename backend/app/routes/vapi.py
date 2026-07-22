import os
from typing import Any
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

router = APIRouter(prefix="/vapi", tags=["vapi"])

VAPI_BASE_URL = "https://api.vapi.ai"

FARMER_QUESTIONS = [
    {
        "q": "What is your primary source of farming finance and PM-Kisan or KCC utilization?",
        "options": [
            "Kisan Credit Card (KCC) with prompt repayment",
            "PM-Kisan direct benefit transfers",
            "Local trader advance",
            "Personal savings only",
        ],
    },
    {
        "q": "How do you manage expenses during crop harvest and waiting cycles?",
        "options": [
            "Maintain dedicated harvest reserve fund",
            "Rely on crop insurance (PMFBY)",
            "Short-term trader credit",
            "Borrow from informal sources",
        ],
    },
    {
        "q": "How frequently do you repay seeds, fertilizer, or agricultural equipment loans?",
        "options": [
            "Always post-harvest on time",
            "Occasionally delayed by crop cycle",
            "Frequently delayed",
            "Unable to repay regularly",
        ],
    },
    {
        "q": "What is your crop insurance coverage status under PM Fasal Bima Yojana?",
        "options": [
            "Fully insured every season",
            "Insured for major crops only",
            "Rarely insured",
            "Not insured",
        ],
    },
    {
        "q": "How do you receive payments for your produce at Mandi or APMC?",
        "options": [
            "Direct bank account transfer (DBT or e-NAM)",
            "Cheque payments",
            "Mix of cash and bank transfer",
            "Cash settlement only",
        ],
    },
    {
        "q": "How do you handle unexpected crop failure or drought risk?",
        "options": [
            "Emergency agricultural savings",
            "Crop insurance claim",
            "Sell cattle or minor assets",
            "High-interest informal loan",
        ],
    },
    {
        "q": "Do you maintain a record of farm input costs like fertilizer, pesticides, and labor?",
        "options": [
            "Yes, structured written notebook",
            "Rough mental estimation",
            "Only major tractor or seed expenses",
            "No records maintained",
        ],
    },
    {
        "q": "How do you plan investments for farm equipment or solar pumps?",
        "options": [
            "Government subsidy plus bank loan",
            "Phased personal savings",
            "Shared village rental",
            "Informal borrowing",
        ],
    },
    {
        "q": "What portion of your agricultural produce is sold through formal APMC or Cooperatives?",
        "options": [
            "100 percent formal channels",
            "50 to 80 percent formal channels",
            "Less than 50 percent",
            "100 percent informal local traders",
        ],
    },
    {
        "q": "How comfortable are you using voice or SMS banking for PM-Kisan status checks?",
        "options": [
            "Very comfortable",
            "Seek retailer assistance",
            "Slightly comfortable",
            "Not comfortable",
        ],
    },
]

MSME_QUESTIONS = [
    {
        "q": "What is your estimated annual business turnover range?",
        "options": [
            "25 Lakhs to 1 Crore",
            "10 Lakhs to 25 Lakhs",
            "5 Lakhs to 10 Lakhs",
            "Under 5 Lakhs",
        ],
    },
    {
        "q": "How do you manage GST return filing and business accounting?",
        "options": [
            "Prompt monthly CA or portal filing",
            "Quarterly automated software filing",
            "Manual self-filing",
            "No GST filing",
        ],
    },
    {
        "q": "What are your standard payment terms for supplier invoice settlement?",
        "options": [
            "Within 15 to 30 days prompt credit",
            "30 to 60 days",
            "60 to 90 days delayed credit",
            "Over 90 days delayed",
        ],
    },
    {
        "q": "What share of your business transactions is settled via digital channels like UPI, QR, or POS?",
        "options": [
            "Over 75 percent digital payments",
            "50 to 75 percent digital payments",
            "25 to 50 percent digital payments",
            "Under 25 percent, mostly cash",
        ],
    },
    {
        "q": "How do you handle working capital shortages during seasonal low demand?",
        "options": [
            "Retained business cash reserves",
            "Overdraft facility from bank",
            "Supplier trade credit extension",
            "Personal emergency savings",
        ],
    },
    {
        "q": "What is your main purpose for seeking commercial credit?",
        "options": [
            "Working capital and inventory expansion",
            "Machinery or equipment upgrade",
            "Opening new outlet or branch",
            "Refinancing existing debt",
        ],
    },
    {
        "q": "How frequently do you audit or restock inventory?",
        "options": [
            "Weekly structured tracking",
            "Monthly spot check",
            "Quarterly when low",
            "No systematic inventory audit",
        ],
    },
    {
        "q": "Have you ever experienced commercial utility or rent payment delays?",
        "options": [
            "Never delayed",
            "Delayed once or twice",
            "Occasionally delayed",
            "Frequently delayed",
        ],
    },
    {
        "q": "Do you offer customer credit or Khata books and how do you track receivables?",
        "options": [
            "Digital Khata app with SMS reminders",
            "Physical ledger book",
            "Rough mental tracking",
            "Strictly cash-only sales",
        ],
    },
    {
        "q": "What is your commercial asset and shop insurance coverage level?",
        "options": [
            "Comprehensive shop and stock insurance",
            "Basic fire and burglary policy",
            "Property only",
            "No commercial insurance",
        ],
    },
]

GENERAL_QUESTIONS = [
    {
        "q": "How often do you plan your monthly budget?",
        "options": [
            "Always, every month",
            "Sometimes, when needed",
            "Rarely",
            "Never",
        ],
    },
    {
        "q": "If you had an unexpected expense of 10,000 rupees, how would you cover it?",
        "options": [
            "From emergency savings",
            "By reducing other expenses",
            "Borrowing from friends or family",
            "Taking a short-term loan",
        ],
    },
    {
        "q": "How do you rate your knowledge of interest rates and inflation?",
        "options": [
            "Advanced or professional",
            "Intermediate or general understanding",
            "Basic, know the terms",
            "No knowledge",
        ],
    },
    {
        "q": "How frequently do you pay your bills on time?",
        "options": [
            "Always on time",
            "Occasionally late",
            "Frequently late",
            "Always late",
        ],
    },
    {
        "q": "Do you keep track of your daily expenses?",
        "options": [
            "Yes, systematically",
            "Yes, roughly",
            "Only major expenses",
            "No",
        ],
    },
    {
        "q": "How confident are you in managing credit cards?",
        "options": [
            "Very confident",
            "Moderately confident",
            "Not confident",
            "Do not use them",
        ],
    },
    {
        "q": "What is your main financial goal for the next 2 years?",
        "options": [
            "Saving and investing",
            "Paying off existing debts",
            "Buying a property or asset",
            "No specific goal",
        ],
    },
    {
        "q": "How do you prioritize saving versus spending?",
        "options": [
            "Save first, spend what is left",
            "Spend first, save what is left",
            "Balanced approach",
            "Do not save",
        ],
    },
    {
        "q": "How often do you compare financial products before purchasing?",
        "options": [
            "Always",
            "Sometimes",
            "Rarely",
            "Never",
        ],
    },
    {
        "q": "Have you ever defaulted on a minor subscription or utility payment?",
        "options": [
            "Never",
            "Once or twice",
            "Frequently",
            "Regularly",
        ],
    },
]

QUESTION_SETS: dict[str, list[dict[str, Any]]] = {
    "farmer": FARMER_QUESTIONS,
    "msme": MSME_QUESTIONS,
    "general": GENERAL_QUESTIONS,
    "gig": GENERAL_QUESTIONS,
    "other": GENERAL_QUESTIONS,
}

call_results_store: dict[str, dict[str, Any]] = {}


def build_sequential_system_prompt(language: str, profession: str) -> str:
    lang_names = {"hi": "Hindi", "te": "Telugu", "en": "English"}
    lang_name = lang_names.get(language, "English")

    questions = QUESTION_SETS.get(profession, GENERAL_QUESTIONS)

    question_block = ""
    for i, q in enumerate(questions):
        opts = "\n".join(f"    Option {j+1}: {o}" for j, o in enumerate(q["options"]))
        question_block += f"""
Question {i+1}: "{q['q']}"
{opts}
"""

    return f"""You are AltGrade's AI Credit Voice Officer conducting a psychometric credit assessment interview over the phone.

LANGUAGE: Conduct this entire interview in {lang_name}. If the caller requests a different language, switch to it.

INTERVIEW RULES — FOLLOW STRICTLY:
1. Ask ONE question at a time. Wait for the caller's complete answer before moving to the next question.
2. After hearing the answer, briefly acknowledge it (e.g., "Thank you" or "Noted"), then ask the next question.
3. Read out all 4 options for each question so the caller can choose. Say "Option 1..., Option 2..., Option 3..., Option 4..."
4. If the caller's answer is unclear, politely ask them to repeat or clarify which option number they prefer.
5. Do NOT skip questions. Do NOT ask multiple questions at once.
6. After all {len(questions)} questions are answered, thank the caller and say "Your psychometric assessment is now complete. Your responses have been recorded for credit scoring. Thank you for your time."

SCORING (internal, do not reveal to caller):
- Option 1 = 3 points (best)
- Option 2 = 2 points
- Option 3 = 1 point
- Option 4 = 0 points (worst)

PROFESSION DETECTED: {profession}

QUESTIONS TO ASK (in order):
{question_block}

CALL FLOW:
1. Greet the caller warmly in {lang_name}. Introduce yourself as the AltGrade AI Credit Assessment Officer.
2. Confirm their name and that they are ready to proceed.
3. Ask each question ONE BY ONE in order. Read all 4 options clearly.
4. After each answer, note which option (1-4) they chose.
5. After all {len(questions)} questions, summarize by saying "Assessment complete. We recorded your {len(questions)} responses. Your credit profile analysis will be ready shortly."
6. End the call politely.

IMPORTANT: Be patient, speak slowly and clearly, and repeat options if the caller asks. This is a credit assessment for people who may not be tech-savvy."""


class OutboundCallRequest(BaseModel):
    user_id: str
    phone: str
    language: str = "en"
    profession: str = "farmer"
    vapi_api_key: str | None = None
    vapi_phone_number_id: str | None = None
    vapi_assistant_id: str | None = None


class OutboundCallResponse(BaseModel):
    status: str
    message: str
    call_id: str | None = None
    phone: str
    question_count: int = 10


@router.post("/outbound-call", response_model=OutboundCallResponse)
async def trigger_outbound_call(body: OutboundCallRequest) -> OutboundCallResponse:
    api_key = body.vapi_api_key or os.environ.get("VAPI_API_KEY", "")
    phone_number_id = body.vapi_phone_number_id or os.environ.get("VAPI_PHONE_NUMBER_ID", "")
    assistant_id = body.vapi_assistant_id or os.environ.get("VAPI_ASSISTANT_ID", "")

    phone_clean = body.phone.strip().replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if len(phone_clean) == 10:
            phone_clean = f"+91{phone_clean}"
        else:
            phone_clean = f"+{phone_clean}"

    profession = body.profession or "general"
    questions = QUESTION_SETS.get(profession, GENERAL_QUESTIONS)
    system_prompt = build_sequential_system_prompt(body.language, profession)

    if not api_key:
        return OutboundCallResponse(
            status="simulated",
            message=(
                f"Simulated AI Call requested for {phone_clean} in {body.language.upper()} ({profession}). "
                f"{len(questions)} profession-specific questions will be asked one-by-one with per-answer scoring. "
                f"Add VAPI_API_KEY in backend/.env for live phone dialing."
            ),
            call_id=f"vapi-sim-{body.user_id}",
            phone=phone_clean,
            question_count=len(questions),
        )

    lang_voice_map = {
        "hi": "hi-IN-Wavenet-A",
        "te": "te-IN-Standard-A",
        "en": "en-IN-Wavenet-D",
    }

    payload: dict[str, Any] = {
        "customer": {
            "number": phone_clean,
            "name": body.user_id,
        },
        "assistantOverrides": {
            "firstMessage": _build_first_message(body.language, body.user_id),
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt,
                    }
                ],
            },
            "voice": {
                "provider": "google",
                "voiceId": lang_voice_map.get(body.language, "en-IN-Wavenet-D"),
            },
        },
    }

    if phone_number_id:
        payload["phoneNumberId"] = phone_number_id
    if assistant_id:
        payload["assistantId"] = assistant_id

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)) as client:
            res = await client.post(
                f"{VAPI_BASE_URL}/call/phone",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if res.status_code in (200, 201):
                data = res.json()
                return OutboundCallResponse(
                    status="success",
                    message=f"Live Vapi AI phone call initiated! {len(questions)} questions will be asked one-by-one.",
                    call_id=data.get("id"),
                    phone=phone_clean,
                    question_count=len(questions),
                )
            else:
                return OutboundCallResponse(
                    status="error",
                    message=f"Vapi API returned error ({res.status_code}): {res.text}",
                    call_id=None,
                    phone=phone_clean,
                    question_count=len(questions),
                )
    except Exception as ex:
        print(f"Vapi call dispatch exception: {ex}")
        return OutboundCallResponse(
            status="simulated",
            message=f"AI Voice Call simulated for {phone_clean}. Dispatch error: {str(ex)}",
            call_id=f"vapi-sim-{body.user_id}",
            phone=phone_clean,
            question_count=len(questions),
        )


def _build_first_message(language: str, user_id: str) -> str:
    greetings = {
        "hi": f"नमस्ते! मैं AltGrade AI क्रेडिट असेसमेंट ऑफिसर हूँ। क्या आप {user_id} हैं? मैं आपका साइकोमेट्रिक क्रेडिट मूल्यांकन करने के लिए कॉल कर रहा हूँ। क्या आप तैयार हैं?",
        "te": f"నమస్కారం! నేను AltGrade AI క్రెడిట్ అసెస్‌మెంట్ ఆఫీసర్‌ని. మీరు {user_id} గారా? మీ సైకోమెట్రిక్ క్రెడిట్ అసెస్‌మెంట్ కోసం కాల్ చేస్తున్నాను. మీరు సిద్ధంగా ఉన్నారా?",
        "en": f"Hello! This is the AltGrade AI Credit Assessment Officer calling for {user_id}. I will be conducting your psychometric credit assessment. Are you ready to begin?",
    }
    return greetings.get(language, greetings["en"])


@router.post("/webhook")
async def vapi_webhook(request: Request) -> dict[str, Any]:
    data = await request.json()
    message_type = data.get("message", {}).get("type")

    if message_type == "end-of-call-report":
        report = data.get("message", {})
        call_id = report.get("call", {}).get("id")
        transcript = report.get("transcript", "")
        analysis = report.get("analysis", {})
        summary = analysis.get("summary", "")
        customer_name = report.get("call", {}).get("customer", {}).get("name", "")

        print(f"[VAPI WEBHOOK] Call Ended ({call_id}) for user={customer_name}")
        print(f"[VAPI WEBHOOK] Summary: {summary[:300] if summary else 'N/A'}")
        print(f"[VAPI WEBHOOK] Transcript: {transcript[:500] if transcript else 'N/A'}")

        if customer_name and call_id:
            call_results_store[customer_name] = {
                "call_id": call_id,
                "transcript": transcript,
                "summary": summary,
                "analysis": analysis,
            }

    return {"status": "ok"}


@router.get("/call-results/{user_id}")
async def get_call_results(user_id: str) -> dict[str, Any]:
    result = call_results_store.get(user_id)
    if not result:
        return {"status": "not_found", "user_id": user_id, "message": "No call results found for this user."}
    return {"status": "found", "user_id": user_id, **result}
