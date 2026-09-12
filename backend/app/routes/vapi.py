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


def build_on_call_banking_system_prompt(language: str) -> str:
    lang_names = {"hi": "Hindi", "te": "Telugu", "ta": "Tamil", "en": "English"}
    lang_name = lang_names.get(language, "English")

    return f"""You are "Mitra", AltGrade's friendly, conversational, and respectful AI On-Call Banking Guide.
The caller requested an on-call banking assistance callback from the AltGrade home page.

LANGUAGE: Conduct this entire conversation warmly in {lang_name}. If the caller switches languages, follow them naturally.

YOUR ROLE & KNOWLEDGE:
1. Greet the caller warmly: "Namaste! This is Mitra, your AltGrade On-Call Banking Guide. You requested a callback from our website."
2. Inquire what financial goal or loan they are exploring today (e.g. farm input financing, kirana shop working capital, micro-credit, or checking loan eligibility).
3. Explain AltGrade's revolutionary zero-CIBIL model: AltGrade doesn't require prior bureau credit history. We evaluate regular electricity bill payments, mobile recharges, and UPI transaction frequency to approve loans from ₹10,000 up to ₹2,00,000 at transparent interest rates.
4. Documents required: 100% digital—only Aadhaar, PAN, and their registered bank-linked mobile number. No physical paperwork needed.
5. In-Person Assistance: If the user feels hesitant about online forms, offer to schedule a certified local Field Loan Officer visit to their doorstep.
6. CONVERSATION STYLE: Keep responses short, empathetic, patient, and conversational (1 to 3 sentences per reply). This is a general helpful banking consultation, NOT a rigid test or survey."""


def _build_banking_first_message(language: str, user_id: str) -> str:
    if language == "hi":
        return "नमस्ते! मैं ऑल्टग्रेड ऑन-कॉल बैंकिंग से मित्रा बात कर रहा हूँ। आपने हमारी वेबसाइट से कॉल बैक का अनुरोध किया था। मैं आज आपकी लोन सहायता में कैसे मदद कर सकता हूँ?"
    elif language == "te":
        return "నమస్కారం! నేను ఆల్ట్‌గ్రేడ్ ఆన్-కాల్ బ్యాంకింగ్ నుండి మిత్రాను. మీరు మా వెబ్‌సైట్ నుండి కాల్ బ్యాక్ అడిగారు. లోన్ మరియు క్రెడిట్ అర్హత గురించి నేను మీకు ఎలా సహాయపడగలను?"
    elif language == "ta":
        return "வணக்கம்! நான் ஆல்ட்கிரேட் ஆன்-கால் பேங்கிங்கில் இருந்து மித்ரா பேசுகிறேன். நீங்கள் கால் பேக் கோரியிருந்தீர்கள். கடன் அல்லது தகுதி பற்றி நான் உங்களுக்கு எவ்வாறு உதவலாம்?"
    return "Hello! This is Mitra from AltGrade On-Call Banking. You requested a callback from our home page. How can I help you today with your loan and credit options?"


class OutboundCallRequest(BaseModel):
    user_id: str
    phone: str
    language: str = "en"
    profession: str = "farmer"
    call_type: str = "assessment"  # "assessment" (questionnaire) or "on_call_banking" (general inquiry)
    vapi_api_key: str | None = None
    vapi_phone_number_id: str | None = None
    vapi_assistant_id: str | None = None


class OutboundCallResponse(BaseModel):
    status: str
    message: str
    call_id: str | None = None
    phone: str
    question_count: int = 10


import time

@router.post("/outbound-call", response_model=OutboundCallResponse)
async def trigger_outbound_call(body: OutboundCallRequest) -> OutboundCallResponse:
    api_key = body.vapi_api_key or os.environ.get("VAPI_API_KEY") or os.environ.get("ICA_VAPI_API_KEY", "")
    phone_number_id = body.vapi_phone_number_id or os.environ.get("VAPI_PHONE_NUMBER_ID") or os.environ.get("ICA_VAPI_PHONE_NUMBER_ID", "")
    assistant_id = body.vapi_assistant_id or os.environ.get("VAPI_ASSISTANT_ID") or os.environ.get("ICA_VAPI_ASSISTANT_ID", "")

    raw_phone = os.environ.get("DEFAULT_TARGET_PHONE", "").strip() or body.phone.strip()
    phone_clean = raw_phone.replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if len(phone_clean) == 10:
            phone_clean = f"+91{phone_clean}"
        else:
            phone_clean = f"+{phone_clean}"

    call_type = getattr(body, "call_type", "assessment") or "assessment"
    profession = body.profession or "general"
    questions = QUESTION_SETS.get(profession, GENERAL_QUESTIONS)

    if call_type == "on_call_banking":
        system_prompt = build_on_call_banking_system_prompt(body.language)
        first_msg = _build_banking_first_message(body.language, body.user_id)
        call_desc = f"AI On-Call Banking Callback requested for {phone_clean} in {body.language.upper()}."
    else:
        system_prompt = build_sequential_system_prompt(body.language, profession)
        first_msg = _build_first_message(body.language, body.user_id)
        call_desc = f"Psychometric Credit Assessment Interview requested for {phone_clean} in {body.language.upper()} ({profession}). {len(questions)} questions will be asked."

    call_id_generated = f"vapi-{int(time.time())}-{body.user_id}"

    prev_store = call_results_store.get(body.user_id, {})
    retry_count = prev_store.get("retry_count", 0)
    if prev_store.get("failed") or prev_store.get("status") in ("declined", "failed", "incomplete"):
        retry_count += 1

    call_results_store[body.user_id] = {
        "call_id": call_id_generated,
        "phone": phone_clean,
        "profession": profession,
        "language": body.language,
        "call_type": call_type,
        "status": "ringing",
        "created_at": time.time(),
        "ringing_since": time.time(),
        "in_call": False,
        "completed": False,
        "failed": False,
        "question_count": len(questions) if call_type == "assessment" else 0,
        "current_question_index": 0,
        "questions_completed": 0,
        "retry_count": retry_count,
    }

    if not api_key:
        return OutboundCallResponse(
            status="simulated",
            message=call_desc,
            call_id=call_id_generated,
            phone=phone_clean,
            question_count=len(questions) if call_type == "assessment" else 0,
        )

    azure_voice_map = {
        "hi": "hi-IN-SwaraNeural",
        "te": "te-IN-ShrutiNeural",
        "ta": "ta-IN-PallaviNeural",
        "en": "en-IN-NeerjaNeural",
    }

    payload: dict[str, Any] = {
        "customer": {
            "number": phone_clean,
            "name": body.user_id,
        },
        "assistantOverrides": {
            "firstMessage": first_msg,
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
                "provider": "azure",
                "voiceId": azure_voice_map.get(body.language, "en-IN-NeerjaNeural"),
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
                vapi_call_id = data.get("id", call_id_generated)
                call_results_store[body.user_id]["call_id"] = vapi_call_id
                return OutboundCallResponse(
                    status="success",
                    message=f"Live Vapi AI phone call initiated! {len(questions)} questions will be asked one-by-one.",
                    call_id=vapi_call_id,
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
            message=f"AI Voice Call initiated for {phone_clean}.",
            call_id=call_id_generated,
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


@router.post("/save-rating")
async def save_rating(request: Request) -> dict[str, Any]:
    data = await request.json()
    user_id = data.get("user_id") or data.get("customer_name") or data.get("name")
    q_idx = data.get("question_index", 0)
    rating_score = data.get("rating_score", 2)
    spoken_answer = data.get("spoken_answer", "")

    if user_id and user_id in call_results_store:
        store = call_results_store[user_id]
        if "answers" not in store:
            store["answers"] = {}
        store["answers"][q_idx] = rating_score
        next_q = min(q_idx + 1, 9)
        store["current_question_index"] = next_q
        store["questions_completed"] = q_idx + 1
        print(f"[VAPI SAVE RATING] Recorded rating for user={user_id}, Q{q_idx}={rating_score}, spoken='{spoken_answer}'")

    return {"status": "ok", "recorded_question": q_idx, "next_question": min(q_idx + 1, 9)}


@router.post("/webhook")
async def vapi_webhook(request: Request) -> dict[str, Any]:
    data = await request.json()
    message = data.get("message", {})
    message_type = message.get("type")

    customer_name = (
        message.get("call", {}).get("customer", {}).get("name")
        or message.get("customer", {}).get("name")
    )

    if message_type == "status-update":
        status = message.get("status")
        print(f"[VAPI WEBHOOK] Status Update: {status} for user={customer_name}")
        if customer_name and customer_name in call_results_store:
            store = call_results_store[customer_name]
            if status in ("ringing", "queued"):
                store["status"] = "ringing"
                if "ringing_since" not in store:
                    store["ringing_since"] = time.time()
            elif status == "in-call":
                store["status"] = "in_progress"
                store["in_call"] = True
            elif status in ("ended", "forwarding"):
                if not store.get("in_call") and not store.get("completed"):
                    store["status"] = "failed"
                    store["failed"] = True
                    store["error_message"] = "Call ended without being answered."

    elif message_type in ("function-call", "tool-calls"):
        fn_call = message.get("functionCall") or message.get("toolCall") or {}
        args = fn_call.get("parameters") or fn_call.get("arguments") or {}
        q_idx = args.get("question_index", 0)
        score = args.get("rating_score", 2)
        print(f"[VAPI WEBHOOK] Function Call: q_idx={q_idx}, score={score} for user={customer_name}")
        if customer_name and customer_name in call_results_store:
            store = call_results_store[customer_name]
            if "answers" not in store:
                store["answers"] = {}
            store["answers"][q_idx] = score
            next_q = min(q_idx + 1, 9)
            store["current_question_index"] = next_q
            store["questions_completed"] = q_idx + 1

    elif message_type == "transcript":
        transcript_text = message.get("transcript", "")
        role = message.get("role", "")
        if customer_name and customer_name in call_results_store:
            store = call_results_store[customer_name]
            if "transcript" not in store:
                store["transcript"] = ""
            store["transcript"] += f"\n{role.capitalize()}: {transcript_text}"
            # Count user turns in live speech to advance question index
            user_turns = store["transcript"].count("User:")
            if user_turns > 0:
                q_idx = min(user_turns, 9)
                store["current_question_index"] = q_idx
                store["questions_completed"] = q_idx

    elif message_type == "end-of-call-report":
        call_id = message.get("call", {}).get("id")
        transcript = message.get("transcript", "")
        analysis = message.get("analysis", {})
        summary = analysis.get("summary", "")
        ended_reason = message.get("endedReason", "")

        print(f"[VAPI WEBHOOK] Call Ended ({call_id}) for user={customer_name}, reason={ended_reason}")

        FAILED_REASONS = {
            "customer-ended-call", "customer-busy", "customer-did-not-answer",
            "declined", "failed", "busy", "no-answer", "phone-call-provider-closed-websocket"
        }

        if customer_name:
            existing_store = call_results_store.get(customer_name, {})
            retry_count = existing_store.get("retry_count", 0)

            if ended_reason in FAILED_REASONS and not transcript:
                call_results_store[customer_name] = {
                    "call_id": call_id or f"vapi-{customer_name}",
                    "status": "declined",
                    "completed": False,
                    "failed": True,
                    "ended_reason": ended_reason,
                    "error_message": f"Call was declined or unanswered ({ended_reason}).",
                    "retry_count": retry_count,
                    "current_question_index": 0,
                    "questions_completed": 0,
                }
            else:
                existing_answers = existing_store.get("answers", {})
                questions_answered = len(existing_answers)

                if questions_answered >= 10:
                    call_results_store[customer_name] = {
                        "call_id": call_id or f"vapi-{customer_name}",
                        "transcript": transcript,
                        "summary": summary,
                        "analysis": analysis,
                        "completed": True,
                        "failed": False,
                        "status": "completed",
                        "current_question_index": 9,
                        "questions_completed": 10,
                        "answers": existing_answers,
                        "retry_count": retry_count,
                    }
                else:
                    call_results_store[customer_name] = {
                        "call_id": call_id or f"vapi-{customer_name}",
                        "transcript": transcript,
                        "summary": summary,
                        "analysis": analysis,
                        "completed": False,
                        "failed": False,
                        "status": "incomplete",
                        "current_question_index": max(questions_answered - 1, 0),
                        "questions_completed": questions_answered,
                        "answers": existing_answers,
                        "ended_reason": ended_reason,
                        "error_message": f"Call ended after {questions_answered}/10 questions. Please complete remaining on screen.",
                        "retry_count": retry_count,
                    }

    return {"status": "ok"}


CALL_TIMEOUT_SECONDS = 60
RINGING_TIMEOUT_SECONDS = 30


@router.get("/call-results/{user_id}")
async def get_call_results(user_id: str) -> dict[str, Any]:
    result = call_results_store.get(user_id)
    if not result:
        return {
            "status": "not_found",
            "user_id": user_id,
            "completed": False,
            "failed": False,
            "current_question_index": 0,
            "questions_completed": 0,
            "retry_count": 0,
            "message": "No active call found."
        }

    if result.get("failed") or result.get("status") in ("declined", "failed"):
        return {
            "status": result.get("status", "failed"),
            "user_id": user_id,
            "completed": False,
            "failed": True,
            "ended_reason": result.get("ended_reason", "declined"),
            "error_message": result.get("error_message", "Call was declined or failed."),
            "current_question_index": result.get("current_question_index", 0),
            "questions_completed": result.get("questions_completed", 0),
            "retry_count": result.get("retry_count", 0),
        }

    if result.get("status") == "incomplete":
        return {
            "status": "incomplete",
            "user_id": user_id,
            "completed": False,
            "failed": False,
            "current_question_index": result.get("current_question_index", 0),
            "questions_completed": result.get("questions_completed", 0),
            "answers": result.get("answers", {}),
            "error_message": result.get("error_message", "Call ended early."),
            "retry_count": result.get("retry_count", 0),
        }

    if result.get("completed"):
        return {
            "status": "completed",
            "user_id": user_id,
            "completed": True,
            "failed": False,
            "current_question_index": 9,
            "questions_completed": 10,
            "answers": result.get("answers", {}),
            "summary": result.get("summary", "Assessment complete."),
            "retry_count": result.get("retry_count", 0),
        }

    created_at = result.get("created_at", 0)
    elapsed = time.time() - created_at if created_at > 0 else 0

    ringing_since = result.get("ringing_since", 0)
    ringing_elapsed = time.time() - ringing_since if ringing_since > 0 else 0
    in_call = result.get("in_call", False)

    if not in_call and ringing_elapsed > RINGING_TIMEOUT_SECONDS:
        result["status"] = "failed"
        result["failed"] = True
        result["error_message"] = "Call was not answered (ringing timed out)."
        return {
            "status": "failed",
            "user_id": user_id,
            "completed": False,
            "failed": True,
            "error_message": result["error_message"],
            "current_question_index": 0,
            "questions_completed": 0,
            "retry_count": result.get("retry_count", 0),
        }

    if elapsed > CALL_TIMEOUT_SECONDS and result.get("questions_completed", 0) == 0:
        result["status"] = "failed"
        result["failed"] = True
        result["error_message"] = "Call timed out without any responses."
        return {
            "status": "failed",
            "user_id": user_id,
            "completed": False,
            "failed": True,
            "error_message": result["error_message"],
            "current_question_index": 0,
            "questions_completed": 0,
            "retry_count": result.get("retry_count", 0),
        }

    return {
        "status": result.get("status", "in_progress"),
        "user_id": user_id,
        "completed": False,
        "failed": False,
        "current_question_index": result.get("current_question_index", 0),
        "questions_completed": result.get("questions_completed", 0),
        "in_call": in_call,
        "retry_count": result.get("retry_count", 0),
    }
