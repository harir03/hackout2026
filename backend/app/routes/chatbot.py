import httpx
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from google import genai
from google.genai import types

router = APIRouter(prefix="/chat", tags=["Chatbot"])

OLLAMA_URL = "http://localhost:11434"

SYSTEM_PROMPT_TEMPLATE = """You are "Mitra" (मित्र / મિત્ર), a friendly, respectful, and helpful AI mascot for AltGrade.
AltGrade is an alternative credit scoring platform designed for Tier 2/3/4 citizens, farmers, kirana shopkeepers, daily earners, and people who have NO traditional credit score (CIBIL/bureau).

YOUR GOAL:
Answer user questions about how loans, credit scoring, consent, and documents work on AltGrade in simple, conversational, everyday words without any technical or financial jargon.

LANGUAGE RULE (MANDATORY):
You MUST respond in the language specified: {lang_name} ({lang_code}).
- If Hindi: Use natural, warm Hindi (e.g. "नमस्ते! मैं मित्रा हूँ...").
- If Gujarati: Use natural, warm Gujarati (e.g. "નમસ્તે! હું મિત્રા છું...").
- If Tamil: Use natural, warm Tamil (e.g. "வணக்கம்! நான் மித்ரா...").
- If English: Use simple, friendly English.

KNOWLEDGE BASE:
1. What is AltGrade?: An alternate credit platform. If you don't have a CIBIL score or formal bank history, AltGrade evaluates your stability using on-time mobile recharges, electricity bill payments, shop UPI sales, and residence stability.
2. How to apply?: Just 3 simple steps on this page: verify phone with Aadhaar/PAN, give digital consent for utility/UPI check, and get your score instantly!
3. Is data safe?: 100% safe and regulated under RBI Account Aggregator guidelines. Data is encrypted and used only with your explicit permission.
4. What loans are available?: Personal micro-credit, Kisan Credit Card (KCC) limit expansions, PM Fasal Bima Yojana (crop insurance), and MUDRA business loans up to ₹50,000 - ₹2,00,000.
5. What if I can't read English?: AltGrade has vernacular voice assistance in Hindi, Gujarati, and Tamil. A field loan officer can also visit your village.
6. On-Call Banking Service: Prefer an on-call banking service? Users can directly request an immediate callback from our AI Voice Officer in their native language or request a field visit by clicking the callback button.

TONE:
Warm, encouraging, patient, and concise (2-4 short sentences max). Avoid complex bullet points unless asked. Always end with an encouraging word."""

LANG_NAMES = {
    "hi": "Hindi (हिंदी)",
    "gu": "Gujarati (ગુજરાતી)",
    "ta": "Tamil (தமிழ்)",
    "en": "English",
}

FALLBACK_RESPONSES = {
    "hi": {
        "score": "अल्टग्रेड (AltGrade) आपकी नियमित बिजली बिल, मोबाइल रिचार्ज और यूपीआई लेन-देन के आधार पर क्रेडिट स्कोर बनाता है। अगर आपका कोई सिबिल (CIBIL) स्कोर नहीं है, तब भी आपको आसानी से लोन मिल सकता है!",
        "documents": "आपको केवल अपना आधार कार्ड, पैन कार्ड और वह मोबाइल नंबर चाहिए जो आपके बैंक से जुड़ा हो। कोई जटिल कागजी कार्रवाई नहीं है!",
        "safety": "आपका डेटा 100% सुरक्षित और एन्क्रिप्टेड है। यह भारतीय रिज़र्व बैंक (RBI) के नियमों के अनुसार केवल आपकी अनुमति से ही उपयोग किया जाता है।",
        "farmer": "हाँ! किसानों के लिए पीएम-किसान, पीएम फसल बीमा योजना और किसान क्रेडिट कार्ड (KCC) के तहत विशेष कृषि लोन उपलब्ध हैं।",
        "callback": "क्या आप फोन पर बैंकिंग सेवा पसंद करते हैं? आप सीधे हमारे एआई वॉइस ऑफिसर से तुरंत कॉल बैक का अनुरोध कर सकते हैं। बस 'Request Call' बटन दबाएं!",
        "default": "नमस्ते! मैं मित्रा हूँ, आपका वित्तीय साथी। ऑल्टग्रेड बिना सिबिल स्कोर के लोन दिलाता है। क्या आप फोन पर बैंकिंग सेवा पसंद करते हैं? आप सीधे कॉल बैक का अनुरोध भी कर सकते हैं!"
    },
    "gu": {
        "score": "ઓલ્ટગ્રેડ (AltGrade) તમારા નિયમિત વીજળી બિલ, મોબાઇલ રિચાર્જ અને UPI વ્યવહારોના આધારે ક્રેડિટ સ્કોર બનાવે છે. જો તમારી પાસે સિબિલ (CIBIL) સ્કોર ન હોય, તો પણ સરળતાથી લોન મળી શકે છે!",
        "documents": "તમારે ફક્ત તમારો આધાર કાર્ડ નંબર, પાન કાર્ડ અને તમારા બેંક ખાતા સાથે જોડાયેલો મોબાઇલ નંબર જોઈએ છે. કોઈ જટિલ કાગળિયાની જરૂર નથી!",
        "safety": "તમારો ડેટા 100% સુરક્ષિત અને એન્ક્રિપ્ટેડ છે. આરબીઆઈ (RBI) એકાઉન્ટ એગ્રીગેટર નિયમો મુજબ માત્ર તમારી સંમતિથી જ તેનો ઉપયોગ થાય છે.",
        "farmer": "હા! ખેડૂતો માટે પીએમ-કિસાન, પીએમ પાક વીમા યોજના અને કિસાન ક્રેડિટ કાર્ડ (KCC) હેઠળ વિશેષ કૃષિ લોન ઉપલબ્ધ છે.",
        "callback": "શું તમે ફોન પર બેંકિંગ સેવા પસંદ કરો છો? તમે સીધા અમારા એઆઈ વૉઇસ ઑફિસર પાસેથી ત્વરિત કૉલબેકની વિનંતી કરી શકો છો. ફક્ત 'Request Call' બટન પર ક્લિક કરો!",
        "default": "નમસ્તે! હું મિત્રા છું, તમારો નાણાકીય માર્ગદર્શક. ઓલ્ટગ્રેડ સિબિલ સ્કોર વિના સરળ લોન અપાવે છે. શું તમે ફોન પર બેંકિંગ સેવા પસંદ કરો છો? તમે હમણાં જ કૉલબેકની વિનંતી કરી શકો છો!"
    },
    "ta": {
        "score": "ஆல்ட்கிரேட் (AltGrade) உங்கள் மின் கட்டணம், மொபைல் ரீசார்ஜ் மற்றும் UPI பரிவர்த்தனைகள் அடிப்படையில் கடன் மதிப்பீட்டை வழங்குகிறது. சிபில் (CIBIL) இல்லாவிட்டாலும் கடன் பெறலாம்!",
        "documents": "ஆதார் அட்டை, பான் அட்டை மற்றும் உங்கள் வங்கி கணக்குடன் இணைக்கப்பட்ட மொபைல் எண் மட்டுமே தேவை. சிக்கலான ஆவணங்கள் தேவையில்லை!",
        "safety": "உங்கள் தரவு 100% பாதுகாப்பானது. ரிசர்வ் வங்கி (RBI) வழிகாட்டுதல்களின்படி உங்கள் அனுமதியுடன் மட்டுமே பயன்படுத்தப்படும்.",
        "farmer": "ஆம்! விவசாயிகளுக்கு பிஎம்-கிசான், பயிர் காப்பீடு மற்றும் கிசான் கிரெடிட் கார்டு மூலம் சிறப்பு கடன்கள் கிடைக்கின்றன.",
        "callback": "நீங்கள் ஃபோன் கால் மூலம் வங்கி சேவையை விரும்புகிறீர்களா? எங்கள் AI வாய்ஸ் ஆபிசரிடமிருந்து உடனே வாய்ஸ் கால் பெறலாம் அல்லது உள்ளூர் அதிகாரியை தொடர்பு கொள்ளலாம். 'Request Call' பட்டனை கிளிக் செய்யுங்கள்!",
        "default": "வணக்கம்! நான் மித்ரா, உங்கள் நிதி உதவியாளர். CIBIL இல்லாமல் கடன் பெறலாம். ஃபோன் கால் மூலம் வங்கி சேவையை விரும்புகிறீர்களா? உடனே கால் பேக் கோரலாம்!"
    },
    "en": {
        "score": "AltGrade builds your credit score from utility bills, telecom recharges, and UPI transactions. Even with zero prior credit history (no CIBIL), you can qualify for fair loans!",
        "documents": "You only need your Aadhaar number, PAN, and the mobile number linked to your bank account. No paper documents needed!",
        "safety": "Your data is 100% safe and encrypted. We operate strictly under RBI Account Aggregator guidelines with your explicit consent.",
        "farmer": "Yes! We support farmers with PM-KISAN verification, PM Fasal Bima Yojana crop insurance, and Kisan Credit Card (KCC) loan limits.",
        "callback": "Prefer an on-call banking service? You can directly request an immediate callback from our AI Voice Officer or schedule a local loan officer visit. Simply click the 'Request Call' button!",
        "default": "Hello! I am Mitra, your friendly credit guide. AltGrade provides alternative credit and online banking for all. Prefer an on-call banking service? You can request an instant callback anytime!"
    }
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    language: str = "en"
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    reply: str
    language: str
    model_used: str
    is_local: bool


@router.get("/status")
async def get_chatbot_status():
    ollama_online = False
    available_models: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{OLLAMA_URL}/api/tags")
            if res.status_code == 200:
                ollama_online = True
                available_models = [m["name"] for m in res.json().get("models", [])]
    except Exception:
        pass

    return {
        "ollama_online": ollama_online,
        "models": available_models,
        "has_gemini": bool(settings.gemini_api_key),
        "status": "ready"
    }


@router.post("/mascot", response_model=ChatResponse)
async def chat_with_mascot(req: ChatRequest):
    lang = req.language if req.language in LANG_NAMES else "en"
    lang_name = LANG_NAMES.get(lang, "English")
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(lang_name=lang_name, lang_code=lang)

    user_query = req.message.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    reply_text: str | None = None
    model_name = "local-fallback"
    is_local = False

    # 1. Try local Ollama model first
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=5.0)) as client:
            tags_res = await client.get(f"{OLLAMA_URL}/api/tags")
            if tags_res.status_code == 200:
                available = [m["name"] for m in tags_res.json().get("models", [])]
                chosen_model = None
                for candidate in ["phi3:mini", "llama3:latest", "llama3", "mistral", "gemma2"]:
                    if any(candidate in m for m in available):
                        chosen_model = next(m for m in available if candidate in m)
                        break
                if not chosen_model and available:
                    chosen_model = available[0]

                if chosen_model:
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in req.history[-4:]:
                        messages.append({"role": msg.role, "content": msg.content})
                    messages.append({"role": "user", "content": user_query})

                    chat_res = await client.post(
                        f"{OLLAMA_URL}/api/chat",
                        json={
                            "model": chosen_model,
                            "messages": messages,
                            "stream": False,
                            "options": {
                                "temperature": 0.4,
                                "num_predict": 256
                            }
                        },
                        timeout=30.0
                    )
                    if chat_res.status_code == 200:
                        reply_text = chat_res.json()["message"]["content"].strip()
                        model_name = f"ollama/{chosen_model}"
                        is_local = True
    except Exception:
        pass

    # 2. Try Gemini API fallback if available
    if not reply_text and settings.gemini_api_key:
        try:
            ai_client = genai.Client(api_key=settings.gemini_api_key)
            prompt_content = f"{system_prompt}\n\nUser Question: {user_query}"
            gemini_res = ai_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt_content,
                config=types.GenerateContentConfig(
                    temperature=0.4,
                    max_output_tokens=256
                )
            )
            if gemini_res.text:
                reply_text = gemini_res.text.strip()
                model_name = "gemini-2.5-flash"
                is_local = False
        except Exception:
            pass

    # 3. High-quality localized fallback bank
    if not reply_text:
        q_lower = user_query.lower()
        kb = FALLBACK_RESPONSES.get(lang, FALLBACK_RESPONSES["en"])

        if any(w in q_lower for w in ["call", "callback", "phone", "voice", "कॉल", "ఫోన్", "ஃபோன்", "speak", "talk", "agent", "officer", "banking"]):
            reply_text = kb.get("callback", kb["default"])
        elif any(w in q_lower for w in ["cibil", "score", "स्कोर", "స్కోర్", "மதிப்பீடு", "how"]):
            reply_text = kb["score"]
        elif any(w in q_lower for w in ["doc", "aadhaar", "pan", "कागजात", "పత్రాలు", "ஆவணங்கள்", "need"]):
            reply_text = kb["documents"]
        elif any(w in q_lower for w in ["safe", "security", "सुरक्षा", "రక్షణ", "பாதுகாப்பு", "trust"]):
            reply_text = kb["safety"]
        elif any(w in q_lower for w in ["farmer", "kisan", "किसान", "రైతు", "விவசாயி", "crop", "agriculture"]):
            reply_text = kb["farmer"]
        else:
            reply_text = kb["default"]

        model_name = "altgrade-rule-agent"
        is_local = True

    return ChatResponse(
        reply=reply_text,
        language=lang,
        model_used=model_name,
        is_local=is_local
    )
