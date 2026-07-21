from typing import Any
import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/vapi", tags=["vapi"])

VAPI_BASE_URL = "https://api.vapi.ai"

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

@router.post("/outbound-call", response_model=OutboundCallResponse)
async def trigger_outbound_call(body: OutboundCallRequest) -> OutboundCallResponse:
    api_key = body.vapi_api_key or settings.vapi_api_key if hasattr(settings, "vapi_api_key") else None
    
    # Format phone number for E.164 (+91)
    phone_clean = body.phone.strip().replace(" ", "").replace("-", "")
    if not phone_clean.startswith("+"):
        if len(phone_clean) == 10:
            phone_clean = f"+91{phone_clean}"
        else:
            phone_clean = f"+{phone_clean}"

    if not api_key:
        # Return simulated success response when API key is not configured
        return OutboundCallResponse(
            status="simulated",
            message=f"Simulated AI Call requested for {phone_clean} in {body.language.upper()} ({body.profession}). Add VAPI_API_KEY in backend/.env for live phone dialing.",
            call_id=f"vapi-sim-{body.user_id}",
            phone=phone_clean,
        )

    # Prepare system prompt override based on language & profession
    lang_instructions = {
      "hi": "Speak in polite Hindi (हिंदी). Ask questions clearly and listen for spoken answers or DTMF numbers.",
      "te": "Speak in polite Telugu (తెలుగు). Ask questions clearly and listen for spoken answers or DTMF numbers.",
      "en": "Speak in clear English. Ask questions clearly and listen for spoken answers or DTMF numbers."
    }
    instruction = lang_instructions.get(body.language, lang_instructions["en"])

    payload = {
        "phoneNumberId": body.vapi_phone_number_id,
        "assistantId": body.vapi_assistant_id,
        "customer": {
            "number": phone_clean,
            "name": body.user_id,
        },
        "assistantOverrides": {
            "firstMessage": f"Namaste! This is the AltGrade AI Credit Assistant calling for {body.user_id}. Are you ready to complete your psychometric assessment?",
            "model": {
                "provider": "openai",
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": f"You are AltGrade's AI Credit Voice Officer. {instruction} Conduct a 3-question psychometric interview for loan assessment. Record exact answers."
                    }
                ]
            }
        }
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                f"{VAPI_BASE_URL}/call/phone",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload
            )
            if res.status_code in (200, 201):
                data = res.json()
                return OutboundCallResponse(
                    status="success",
                    message="Live Vapi AI phone call initiated successfully!",
                    call_id=data.get("id"),
                    phone=phone_clean,
                )
            else:
                return OutboundCallResponse(
                    status="error",
                    message=f"Vapi API returned error ({res.status_code}): {res.text}",
                    call_id=None,
                    phone=phone_clean,
                )
    except Exception as ex:
        print(f"Vapi call dispatch exception: {ex}")
        return OutboundCallResponse(
            status="simulated",
            message=f"AI Voice Call simulated for {phone_clean}. Dispatch error: {str(ex)}",
            call_id=f"vapi-sim-{body.user_id}",
            phone=phone_clean,
        )

@router.post("/webhook")
async def vapi_webhook(request: Request) -> dict[str, Any]:
    data = await request.json()
    message_type = data.get("message", {}).get("type")
    
    if message_type == "end-of-call-report":
        report = data.get("message", {})
        call_id = report.get("call", {}).get("id")
        transcript = report.get("transcript")
        analysis = report.get("analysis", {})
        print(f"[VAPI WEBHOOK] Call Ended ({call_id}). Transcript summary: {transcript[:200] if transcript else 'N/A'}")
        
    return {"status": "ok"}
