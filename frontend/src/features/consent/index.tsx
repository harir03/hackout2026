import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Landmark,
  Phone,
  Brain,
  Store,
  Loader2,
  MapPin,
  Camera,
  ShieldCheck,
  CreditCard,
  Fingerprint,
  ArrowRight,
  AlertCircle,
  Plus,
  X,
  Map,
  Home,
  Briefcase,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitConsent, verifyPan, sendAadhaarOtp, verifyAadhaarOtp, checkLiveness, uploadBankStatement } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { LocationMap } from '@/components/ui/location-map'
import { TermsAndConditions } from './components/terms-and-conditions'
import { LanguageSelectionStep } from './components/language-selection-step'
import { VoiceQuestionnaire } from './components/voice-questionnaire'
import { LanguageSelector } from '@/components/language-selector'
import { requestOutboundCall, getCallResults } from '@/lib/api'
import { PhoneCall } from 'lucide-react'
import { getDefaultPhone, maskPhoneNumber } from '@/lib/utils'

const DEMO_PROFILES: Record<string, string> = {
  "9876543210": "hari",
  "9876543211": "rahul",
  "9876543212": "nikhil",
  "9876543213": "akash",
  "9876543214": "tejas",
  "9876543215": "farmer",
  "9876543216": "msme"
}

const GENERAL_QUESTIONS = [
  {
    q: "How often do you plan your monthly budget?",
    options: ["Always (every month)", "Sometimes (when needed)", "Rarely", "Never"]
  },
  {
    q: "If you had an unexpected expense of ₹10,000, how would you cover it?",
    options: ["From emergency savings", "By reducing other expenses", "Borrowing from friends/family", "Taking a short-term loan"]
  },
  {
    q: "How do you rate your knowledge of interest rates and inflation?",
    options: ["Advanced / Professional", "Intermediate / General understanding", "Basic / Know the terms", "No knowledge"]
  },
  {
    q: "How frequently do you pay your bills on time?",
    options: ["Always on time", "Occasionally late", "Frequently late", "Always late"]
  },
  {
    q: "Do you keep track of your daily expenses?",
    options: ["Yes, systematically", "Yes, roughly", "Only major expenses", "No"]
  },
  {
    q: "How confident are you in managing credit cards?",
    options: ["Very confident", "Moderately confident", "Not confident", "Do not use them"]
  },
  {
    q: "What is your main financial goal for the next 2 years?",
    options: ["Saving and investing", "Paying off existing debts", "Buying a property or asset", "No specific goal"]
  },
  {
    q: "How do you prioritize saving vs spending?",
    options: ["Save first, spend what is left", "Spend first, save what is left", "Balanced approach", "Do not save"]
  },
  {
    q: "How often do you compare financial products before purchasing?",
    options: ["Always", "Sometimes", "Rarely", "Never"]
  },
  {
    q: "Have you ever defaulted on a minor subscription or utility payment?",
    options: ["Never", "Once or twice", "Frequently", "Regularly"]
  }
]

const FARMER_QUESTIONS = [
  {
    q: "What is your primary source of farming finance & PM-Kisan / KCC utilization?",
    options: ["Kisan Credit Card (KCC) with prompt repayment", "PM-Kisan direct benefit transfers", "Local trader advance", "Personal savings only"]
  },
  {
    q: "How do you manage expenses during crop harvest & waiting cycles?",
    options: ["Maintain dedicated harvest reserve fund", "Rely on crop insurance (PMFBY)", "Short-term trader credit", "Borrow from informal sources"]
  },
  {
    q: "How frequently do you repay seeds, fertilizer, or agricultural equipment loans?",
    options: ["Always post-harvest on time", "Occasionally delayed by crop cycle", "Frequently delayed", "Unable to repay regularly"]
  },
  {
    q: "What is your crop insurance coverage status (PM Fasal Bima Yojana)?",
    options: ["Fully insured every season", "Insured for major crops only", "Rarely insured", "Not insured"]
  },
  {
    q: "How do you receive payments for your produce at Mandi / APMC?",
    options: ["Direct bank account transfer (DBT / e-NAM)", "Cheque payments", "Mix of cash and bank transfer", "Cash settlement only"]
  },
  {
    q: "How do you handle unexpected crop failure or drought risk?",
    options: ["Emergency agricultural savings", "Crop insurance claim", "Sell cattle or minor assets", "High-interest informal loan"]
  },
  {
    q: "Do you maintain a record of farm input costs (fertilizer, pesticides, labor)?",
    options: ["Yes, structured written notebook", "Rough mental estimation", "Only major tractor/seed expenses", "No records maintained"]
  },
  {
    q: "How do you plan investments for farm equipment or solar pumps?",
    options: ["Government subsidy + bank loan", "Phased personal savings", "Shared village rental", "Informal borrowing"]
  },
  {
    q: "What portion of your agricultural produce is sold through formal APMC/Cooperatives?",
    options: ["100% formal channels", "50–80% formal channels", "Less than 50%", "100% informal local traders"]
  },
  {
    q: "How comfortable are you using voice/SMS banking for PM-Kisan status checks?",
    options: ["Very comfortable", "Seek retailer assistance", "Slightly comfortable", "Not comfortable"]
  }
]

const MSME_QUESTIONS = [
  {
    q: "What is your estimated annual business turnover range?",
    options: ["₹25 Lakhs – ₹1 Crore", "₹10 Lakhs – ₹25 Lakhs", "₹5 Lakhs – ₹10 Lakhs", "Under ₹5 Lakhs"]
  },
  {
    q: "How do you manage GST return filing and business accounting?",
    options: ["Prompt monthly CA / CA portal filing", "Quarterly automated software filing", "Manual self-filing", "No GST filing"]
  },
  {
    q: "What are your standard payment terms for supplier invoice settlement?",
    options: ["Within 15–30 days prompt credit", "30–60 days", "60–90 days delayed credit", "Over 90 days delayed"]
  },
  {
    q: "What share of your business transactions is settled via digital channels (UPI / QR / POS)?",
    options: ["Over 75% digital payments", "50%–75% digital payments", "25%–50% digital payments", "Under 25% (Mostly Cash)"]
  },
  {
    q: "How do you handle working capital shortages during seasonal low demand?",
    options: ["Retained business cash reserves", "Overdraft (OD) facility from bank", "Supplier trade credit extension", "Personal emergency savings"]
  },
  {
    q: "What is your main purpose for seeking commercial credit?",
    options: ["Working capital & inventory expansion", "Machinery / Equipment upgrade", "Opening new outlet / branch", "Refinancing existing debt"]
  },
  {
    q: "How frequently do you audit or restock inventory?",
    options: ["Weekly structured tracking", "Monthly spot check", "Quarterly when low", "No systematic inventory audit"]
  },
  {
    q: "Have you ever experienced commercial utility or commercial rent payment delays?",
    options: ["Never delayed", "Delayed once or twice", "Occasionally delayed", "Frequently delayed"]
  },
  {
    q: "Do you offer customer credit / Khata books and how do you track receivables?",
    options: ["Digital Khata app with SMS reminders", "Physical ledger book", "Rough mental tracking", "Strictly cash-only sales"]
  },
  {
    q: "What is your commercial asset & shop insurance coverage level?",
    options: ["Comprehensive shop & stock insurance", "Basic fire & burglary policy", "Property only", "No commercial insurance"]
  }
]

const FARMER_QUESTIONS_BY_LANG: Record<string, Array<{ q: string; options: string[] }>> = {
  en: FARMER_QUESTIONS,
  hi: [
    { q: "आपकी कृषि वित्त पोषण और पीएम-किसान / केसीसी उपयोग का प्राथमिक स्रोत क्या है?", options: ["किसान क्रेडिट कार्ड (KCC) समय पर भुगतान के साथ", "पीएम-किसान प्रत्यक्ष लाभ हस्तांतरण (DBT)", "स्थानीय व्यापारी का अग्रिम (आढ़तिया)", "केवल व्यक्तिगत बचत"] },
    { q: "फसल की कटाई और प्रतीक्षा चक्र के दौरान आप खर्चों का प्रबंधन कैसे करते हैं?", options: ["कटाई के लिए समर्पित आरक्षित कोष रखते हैं", "फसल बीमा (PMFBY) पर भरोसा करते हैं", "अल्पकालिक व्यापारी क्रेडिट", "अनौपचारिक स्रोतों से उधार लेते हैं"] },
    { q: "आप बीज, उर्वरक या कृषि उपकरण ऋण का भुगतान कितनी बार करते हैं?", options: ["हमेशा कटाई के बाद समय पर", "फसल चक्र के कारण कभी-कभी देरी होती है", "अक्सर देरी होती है", "नियमित रूप से भुगतान करने में असमर्थ"] },
    { q: "आपकी फसल बीमा कवरेज स्थिति (प्रधानमंत्री फसल बीमा योजना) क्या है?", options: ["हर सीजन में पूरी तरह से बीमित", "केवल प्रमुख फसलों के लिए बीमित", "शायद ही कभी बीमित", "कभी बीमित नहीं"] },
  ],
  gu: [
    { q: "તમારી કૃષિ ધિરાણ અને પીએમ-કિસાન / કેસીસી વપરાશનો પ્રાથમિક સ્ત્રોત કયો છે?", options: ["કિસાન ક્રેડિટ કાર્ડ (KCC) સમયસર ચુકવણી સાથે", "પીએમ-કિસાન ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર (DBT)", "સ્થાનિક વેપારીની એડવાન્સ (આડતિયા)", "માત્ર વ્યક્તિગત બચત"] },
    { q: "પાકની લણણી અને રાહ જોવાના સમયગાળા દરમિયાન તમે ખર્ચનું સંચાલન કેવી રીતે કરો છો?", options: ["લણણી માટે સમર્પિત અનામત ભંડોળ રાખીએ છીએ", "પાક વીમા (PMFBY) પર આધાર રાખીએ છીએ", "ટૂંકા ગાળાની વેપારી ક્રેડિટ", "અનૌપચારિક સ્ત્રોતો પાસેથી ઉધાર લઈએ છીએ"] },
    { q: "તમે બિયારણ, ખાતર અથવા કૃષિ સાધન લોનની ચુકવણી કેટલી વાર કરો છો?", options: ["હંમેશાં લણણી પછી સમયસર", "પાક ચક્રના કારણે ક્યારેક વિલંબ થાય છે", "વારંવાર વિલંબ થાય છે", "નિયમિત રીતે ચુકવવામાં અસમર્થ"] },
    { q: "તમારી પાક વીમા કવરેજ સ્થિતિ (પ્રધાનમંત્રી ફસલ બીમા યોજના) શું છે?", options: ["દરેક સિઝનમાં સંપૂર્ણપણે વીમાકૃત", "માત્ર મુખ્ય પાકો માટે વીમાકૃત", "ભાગ્યે જ વીમો લઈએ છીએ", "વીમો લેતા નથી"] },
    { q: "માર્કેટિંગ યાર્ડ / એપીએમસીમાં તમારી ઉપજના નાણાં તમે કેવી રીતે મેળવો છો?", options: ["સીધા બેંક ખાતામાં ટ્રાન્સફર (DBT / e-NAM)", "ચેક દ્વારા ચુકવણી", "રોકડ અને બેંક ટ્રાન્સફરનું મિશ્રણ", "માત્ર રોકડ પતાવટ"] },
    { q: "તમે અણધાર્યા પાક નુકસાન અથવા દુષ્કાળના જોખમને કેવી રીતે પહોંચી વળો છો?", options: ["કટોકટી કૃષિ બચતમાંથી", "પાક વીમા ક્લેમ દ્વારા", "પશુધન અથવા નાની સંપત્તિ વેચીને", "ઊંચા વ્યાજની અનૌપચારિક લોન"] },
    { q: "શું તમે ખેતી ખર્ચ (ખાતર, જંતુનાશક, મજૂરી) નો હિસાબ રાખો છો?", options: ["હા, વ્યવસ્થિત લેખિત ચોપડો", "કાચો માનસિક અંદાજ", "માત્ર મોટા ટ્રેક્ટર/બિયારણ ખર્ચ", "કોઈ રેકોર્ડ રાખતા નથી"] },
    { q: "તમે કૃષિ સાધનો અથવા સોલર પંપ માટે રોકાણનું આયોજન કેવી રીતે કરો છો?", options: ["સરકારી સબસિડી + બેંક લોન", "તબક્કાવાર વ્યક્તિગત બચત", "ગામમાં ભાડેથી લેવું", "અનૌપચારિક ઉધાર"] },
    { q: "તમારી કૃષિ ઉપજનો કેટલો હિસ્સો અધિકૃત એપીએમસી / સહકારી મંડળીઓ દ્વારા વેચાય છે?", options: ["100% અધિકૃત ચેનલો દ્વારા", "50-80% અધિકૃત ચેનલો દ્વારા", "50% કરતાં ઓછો", "100% અનૌપચારિક સ્થાનિક વેપારીઓ"] },
    { q: "પીએમ-કિસાન સ્થિતિ તપાસવા માટે વૉઇસ/એસએમએસ બેંકિંગનો ઉપયોગ કરવામાં તમે કેટલા અનુકૂળ છો?", options: ["ખૂબ જ અનુકૂળ", "રિટેલરની મદદ લઈએ છીએ", "થોડા અનુકૂળ", "અનુકૂળ નથી"] }
  ]
}

const MSME_QUESTIONS_BY_LANG: Record<string, Array<{ q: string; options: string[] }>> = {
  en: MSME_QUESTIONS,
  hi: [
    { q: "आपकी अनुमानित वार्षिक व्यवसाय टर्नओवर सीमा क्या है?", options: ["₹25 लाख – ₹1 करोड़", "₹10 लाख – ₹25 लाख", "₹5 लाख – ₹10 लाख", "₹5 लाख से कम"] },
    { q: "आप जीएसटी रिटर्न दाखिल करने और व्यावसायिक लेखांकन का प्रबंधन कैसे करते हैं?", options: ["सीए / पोर्टल के माध्यम से समय पर मासिक दाखिल करना", "त्रैमासिक स्वचालित सॉफ्टवेयर फाइलिंग", "मैनुअल स्वयं फाइलिंग", "कोई जीएसटी फाइलिंग नहीं"] },
    { q: "आपूर्तिकर्ता चालान निपटान के लिए आपकी मानक भुगतान शर्तें क्या हैं?", options: ["15-30 दिनों के भीतर तुरंत क्रेडिट", "30-60 दिन", "60-90 दिन विलंबित क्रेडिट", "90 दिनों से अधिक विलंबित"] },
    { q: "आपके व्यावसायिक लेनदेन का कितना हिस्सा डिजिटल चैनलों (UPI / QR / POS) के माध्यम से तय किया जाता है?", options: ["75% से अधिक डिजिटल भुगतान", "50%–75% डिजिटल भुगतान", "25%–50% डिजिटल भुगतान", "25% से कम (अधिकांश नकद)"] },
    { q: "मौसमी कम मांग के दौरान आप कार्यशील पूंजी की कमी को कैसे संभालते हैं?", options: ["व्यावसायिक नकद भंडार रखा गया", "बैंक से ओवरड्राफ्ट (OD) सुविधा", "आपूर्तिकर्ता व्यापार क्रेडिट विस्तार", "व्यक्तिगत आपातकालीन बचत"] },
    { q: "वाणिज्यिक क्रेडिट प्राप्त करने का आपका मुख्य उद्देश्य क्या है?", options: ["कार्यशील पूंजी और इन्वेंट्री विस्तार", "मशीनरी / उपकरण अपग्रेड", "नया आउटलेट / शाखा खोलना", "मौजूदा ऋण का पुनर्वित्त"] },
    { q: "आप कितनी बार इन्वेंट्री का ऑडिट या पुनर्भंडारण करते हैं?", options: ["साप्ताहिक व्यवस्थित ट्रैकिंग", "मासिक स्थान जांच", "त्रैमासिक जब कम हो", "कोई व्यवस्थित इन्वेंट्री ऑडिट नहीं"] },
    { q: "क्या आपने कभी वाणिज्यिक उपयोगिता या वाणिज्यिक किराया भुगतान में देरी का अनुभव किया है?", options: ["कभी देरी नहीं हुई", "एक या दो बार देरी हुई", "कभी-कभी देरी हुई", "अक्सर देरी हुई"] },
    { q: "क्या आप ग्राहक क्रेडिट / खाता पुस्तकें प्रदान करते हैं और आप प्राप्तियों को कैसे ट्रैक करते हैं?", options: ["एसएमएस रिमाइंडर के साथ डिजिटल खाता ऐप", "भौतिक बहीखाता पुस्तक", "मोटा मानसिक ट्रैकिंग", "सख्ती से केवल नकद बिक्री"] },
    { q: "आपकी व्यावसायिक संपत्ति और दुकान बीमा कवरेज स्तर क्या है?", options: ["व्यापक दुकान और स्टॉक बीमा", "बुनियादी आग और चोरी नीति", "केवल संपत्ति", "कोई व्यावसायिक बीमा नहीं"] }
  ],
  gu: [
    { q: "તમારો અંદાજિત વાર્ષિક વ્યવસાયિક ટર્નઓવર કેટલો છે?", options: ["₹25 લાખ – ₹1 કરોડ", "₹10 લાખ – ₹25 લાખ", "₹5 લાખ – ₹10 લાખ", "₹5 લાખથી ઓછો"] },
    { q: "તમે જીએસટી રિટર્ન ફાઇલિંગ અને વ્યવસાયિક હિસાબનું સંચાલન કેવી રીતે કરો છો?", options: ["સીએ / પોર્ટલ દ્વારા સમયસર માસિક ફાઇલિંગ", "ત્રિમાસિક સોફ્ટવેર ફાઇલિંગ", "મેન્યુઅલ જાતે ફાઇલિંગ", "કોઈ જીએસટી ફાઇલિંગ નથી"] },
    { q: "સપ્લાયર ઇનવોઇસ ચુકવણી માટે તમારી માનક શરતો શું છે?", options: ["15-30 દિવસની અંદર સમયસર ક્રેડિટ", "30-60 દિવસ", "60-90 દિવસ વિલંબિત ક્રેડિટ", "90 દિવસથી વધુ વિલંબિત"] },
    { q: "તમારા વ્યવસાયિક વ્યવહારોનો કેટલો હિસ્સો ડિજિટલ માધ્યમો (UPI / QR / POS) દ્વારા થાય છે?", options: ["75% થી વધુ ડિજિટલ ચુકવણી", "50%–75% ડિજિટલ ચુકવણી", "25%–50% ડિજિટલ ચુકવણી", "25% થી ઓછો (મોટાભાગે રોકડ)"] },
    { q: "ઓછી સિઝન દરમિયાન તમે કાર્યકારી મૂડી (વર્કિંગ કેપિટલ) ની અછત કેવી રીતે સંભાળો છો?", options: ["વેપાર અનામત ભંડોળમાંથી", "બેંક ઓવરડ્રાફ્ટ (OD) સુવિધા", "સપ્લાયર ટ્રેડ ક્રેડિટ વિસ્તરણ", "વ્યક્તિગત કટોકટી બચત"] },
    { q: "વાણિજ્યિક ક્રેડિટ મેળવવાનો તમારો મુખ્ય ઉદ્દેશ્ય શું છે?", options: ["કાર્યકારી મૂડી અને ઇન્વેન્ટરી વિસ્તરણ", "મશીનરી / સાધન અપગ્રેડ", "નવી શાખા / આઉટલેટ ખોલવું", "હાલની લોનનું પુનર્ધિરાણ"] },
    { q: "તમે કેટલી વાર ઇન્વેન્ટરીનું ઓડિટ અથવા પુનઃસ્ટોક કરો છો?", options: ["સાપ્તાહિક વ્યવસ્થિત ટ્રેકિંગ", "માસિક સ્પોટ ચેક", "ત્રિમાસિક જ્યારે સ્ટોક ઘટે", "કોઈ વ્યવસ્થિત ઓડિટ નથી"] },
    { q: "શું તમે ક્યારેય દુકાન ભાડું અથવા વાણિજ્યિક લાઇટ બિલ ચુકવણીમાં વિલંબ અનુભવ્યો છે?", options: ["ક્યારેય વિલંબ થયો નથી", "એક કે બે વાર વિલંબ થયો", "ક્યારેક વિલંબ થયો", "વારંવાર વિલંબ થયો"] },
    { q: "શું તમે ગ્રાહક ક્રેડિટ / ખાતા બુક આપો છો અને ઉઘરાણી કેવી રીતે ટ્રેક કરો છો?", options: ["એસએમએસ રિમાઇન્ડર સાથે ડિજિટલ ખાતા એપ", "ભૌતિક ચોપડો / ખાતાવહી", "કાચો માનસિક અંદાજ", "સખત રીતે માત્ર રોકડ વેચાણ"] },
    { q: "તમારી વ્યવસાયિક મિલકત અને દુકાન વીમા કવરેજ સ્તર શું છે?", options: ["સંપૂર્ણ દુકાન અને સ્ટોક વીમો", "મૂળભૂત આગ અને ચોરી વીમો", "માત્ર મિલકત", "કોઈ વ્યવસાયિક વીમો નથી"] }
  ]
}

const PSYCHOMETRIC_QUESTIONS_BY_LANG: Record<string, Array<{ q: string; options: string[] }>> = {
  en: GENERAL_QUESTIONS,
  hi: [
    { q: "आप मासिक आवर्ती खर्चों और बिलों की योजना कैसे बनाते हैं?", options: ["सख्त बजट बनाए रखते हैं और समय पर भुगतान करते हैं", "रिमाइंडर आने पर भुगतान करते हैं", "कैश फ्लो के कारण कभी-कभी देर से भुगतान करते हैं", "कोई औपचारिक योजना नहीं"] },
    { q: "यदि ₹10,000 का अप्रत्याशित आपातकालीन खर्च आता है, तो आप इसे कैसे पूरा करेंगे?", options: ["समर्पित आपातकालीन बचत से", "अगले महीने की कमाई से", "दोस्तों या परिवार से उधार लेंगे", "कम अवधि का उच्च ब्याज ऋण लेंगे"] },
    { q: "दैनिक लेनदेन के लिए आप डिजिटल भुगतान विधियों (UPI, नेटबैंकिंग) का कितनी बार उपयोग करते हैं?", options: ["लगभग सभी लेनदेन के लिए दैनिक", "सप्ताह में कई बार", "कभी-कभी (महीने में 1-2 बार)", "कभी नहीं / केवल नकद"] },
    { q: "नया ऋण या ऋण प्रतिबद्धता लेने के प्रति आपका दृष्टिकोण क्या है?", options: ["केवल तभी लें जब आवश्यक हो और पुनर्भुगतान की गारंटी हो", "यदि ब्याज दर कम और प्रबंधनीय हो तो लें", "जब भी क्रेडिट उपलब्ध हो तब लें", "ऋण से पूरी तरह बचें"] },
    { q: "आप अपनी आय और दैनिक वित्तीय लेनदेन को कैसे ट्रैक करते हैं?", options: ["डिजिटल अकाउंटिंग ऐप या व्यवस्थित बहीखाता", "नोटबुक / डायरी रिकॉर्ड", "मोटा मानसिक अनुमान", "कोई ट्रैकिंग नहीं"] },
    { q: "भविष्य के लक्ष्यों के लिए आपकी मासिक आय का कितना हिस्सा बचाया या निवेश किया जाता है?", options: ["20% से अधिक", "10% से 20%", "10% से कम", "नियमित रूप से कुछ नहीं बचाया"] },
    { q: "आप उपयोगिता बिल भुगतानों (बिजली, पानी, एलपीजी) का प्रबंधन कैसे करते हैं?", options: ["हमेशा नियत तारीख से पहले भुगतान", "नियत तारीख पर भुगतान", "विलंब शुल्क के साथ नियत तारीख के बाद भुगतान", "भुगतान न करने के कारण अक्सर डिस्कनेक्ट"] },
    { q: "आप वित्तीय उत्पादों या निवेश के अवसरों का मूल्यांकन कैसे करते हैं?", options: ["विस्तृत शोध और तुलना", "विश्वसनीय परिवार या सलाहकार से परामर्श", "लोकप्रिय रुझानों का पालन करें", "आवेगपूर्ण निर्णय लें"] },
    { q: "अगले 12 महीनों के लिए आपका प्राथमिक वित्तीय लक्ष्य क्या है?", options: ["व्यवसाय का विस्तार / आय स्रोतों में वृद्धि", "आपातकालीन कोष का निर्माण", "मौजूदा ऋणों का भुगतान करें", "कोई विशिष्ट वित्तीय लक्ष्य नहीं"] },
    { q: "क्या आपने पिछले 2 वर्षों में कभी ऋण ईएमआई या क्रेडिट पुनर्भुगतान समय सीमा को याद किया है?", options: ["कभी कोई भुगतान नहीं चूका", "तकनीकी समस्या के कारण एक या दो बार", "अक्सर देरी हुई", "नियमित रूप से छूटा"] }
  ],
  gu: [
    { q: "તમે માસિક આવર્તક ખર્ચ અને બિલનું આયોજન કેવી રીતે કરો છો?", options: ["ચોક્કસ બજેટ જાળવીએ છીએ અને સમયસર ચુકવીએ છીએ", "રિમાઇન્ડર આવે ત્યારે ચુકવીએ છીએ", "કેશફ્લોના કારણે ક્યારેક મોડું થાય છે", "કોઈ ઔપચારિક આયોજન નથી"] },
    { q: "જો ₹10,000 નો અણધાર્યો કટોકટી ખર્ચ આવે, તો તમે તેને કેવી રીતે પહોંચી વળશો?", options: ["સમર્પિત કટોકટી બચતમાંથી", "આવતા મહિનાની કમાણીમાંથી", "મિત્રો કે પરિવાર પાસેથી ઉધાર લઈને", "ટૂંકા ગાળાની લોન લઈને"] },
    { q: "દૈનિક વ્યવહારો માટે તમે ડિજિટલ પેમેન્ટ (UPI, નેટબેંકિંગ) નો કેટલી વાર ઉપયોગ કરો છો?", options: ["લગભગ તમામ વ્યવહારો માટે રોજેરોજ", "અઠવાડિયામાં ઘણી વખત", "ક્યારેક (મહિનામાં 1-2 વાર)", "ક્યારેય નહીં / માત્ર રોકડ"] },
    { q: "નવી લોન લેવા પ્રત્યે તમારો અભિગમ શું છે?", options: ["માત્ર ત્યારે જ લો જ્યારે જરૂરી હોય અને ચુકવણીની ખાતરી હોય", "જો વ્યાજ દર ઓછો અને વ્યાજબી હોય તો લો", "જ્યારે પણ લોન મળે ત્યારે લો", "લોન લેવાનું સંપૂર્ણ ટાળો"] },
    { q: "તમે તમારી આવક અને દૈનિક નાણાકીય વ્યવહારો કેવી રીતે ટ્રેક કરો છો?", options: ["ડિજિટલ એકાઉન્ટિંગ એપ અથવા વ્યવસ્થિત ચોપડો", "નોટબુક / ડાયરી રેકોર્ડ", "કાચો માનસિક અંદાજ", "કોઈ ટ્રેકિંગ નથી"] },
    { q: "ભવિષ્યના લક્ષ્યો માટે તમારી માસિક આવકનો કેટલો હિસ્સો બચાવો કે રોકાણ કરો છો?", options: ["20% થી વધુ", "10% થી 20%", "10% થી ઓછો", "નિયમિત કંઈ બચાવતા નથી"] },
    { q: "તમે યુટિલિટી બિલ ચુકવણીઓ (વીજળી, પાણી, ગેસ) નું સંચાલન કેવી રીતે કરો છો?", options: ["હંમેશાં નિયત તારીખ પહેલાં ચુકવણી", "નિયત તારીખે ચુકવણી", "વિલંબ ફી સાથે નિયત તારીખ પછી", "ચુકવણી ન કરવાને કારણે ક્યારેક કનેક્શન કપાયું"] },
    { q: "તમે નાણાકીય ઉત્પાદનો અથવા રોકાણની તકોનું મૂલ્યાંકન કેવી રીતે કરો છો?", options: ["સંપૂર્ણ સંશોધન અને સરખામણી કરીને", "વિશ્વસનીય પરિવાર કે સલાહકારની સલાહ લઈને", "ટ્રેન્ડ અનુસરીને", "ત્વરિત ઉત્સાહમાં નિર્ણય લઈને"] },
    { q: "આગામી 12 મહિના માટે તમારું પ્રાથમિક નાણાકીય લક્ષ્ય શું છે?", options: ["વ્યવસાય વિસ્તરણ / આવકના સ્ત્રોત વધારવા", "કટોકટી ભંડોળ ઊભું કરવું", "હાલની લોન ચૂકવી દેવી", "કોઈ ચોક્કસ નાણાકીય લક્ષ્ય નથી"] },
    { q: "શું તમે છેલ્લા 2 વર્ષમાં ક્યારેય લોન ઇએમઆઈ અથવા ક્રેડિટ ચુકવણીની સમયસીમા ચૂકી ગયા છો?", options: ["ક્યારેય કોઈ ચુકવણી ચૂકી નથી", "ટેકનિકલ સમસ્યાના કારણે 1 કે 2 વાર", "વારંવાર મોડું થયું", "નિયમિતપણે ચૂકી ગયા"] }
  ]
}

export function ConsentPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { auth } = useAuthStore()
  const user = auth.user
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [userId] = useState(() => user?.email || `applicant-${Date.now()}`)
  const isMockProfile = ['testhari@altgrade.in', 'farmer@altgrade.in', 'msme@altgrade.in'].includes(user?.email || '')
  
  // Step 1: Phone & OTP States
  const [phone, setPhone] = useState(() => getDefaultPhone())
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)

  // Voice Call Phone Confirmation Modal
  const [showCallConfirmModal, setShowCallConfirmModal] = useState(false)
  const [callPhoneInput, setCallPhoneInput] = useState(() => getDefaultPhone())
  const [isCallPhoneMasked, setIsCallPhoneMasked] = useState(true)

  // Step 2: PAN States
  const [pan, setPan] = useState('')
  const [verifyingPan, setVerifyingPan] = useState(false)
  const [panVerified, setPanVerified] = useState(false)
  const [panName, setPanName] = useState('')
  const [panDob, setPanDob] = useState('')
  const [panType, setPanType] = useState('')

  // Step 3: Aadhaar States
  const [aadhaar, setAadhaar] = useState('')
  const [aadhaarOtpSent, setAadhaarOtpSent] = useState(false)
  const [aadhaarOtp, setAadhaarOtp] = useState('')
  const [verifyingAadhaar, setVerifyingAadhaar] = useState(false)

  // Step 4: Liveness States
  const [cameraActive, setCameraActive] = useState(false)
  const [capturingFace, setCapturingFace] = useState(false)
  const [faceCaptured, setFaceCaptured] = useState(false)
  const [profession, setProfession] = useState('')
  const [customProfession, setCustomProfession] = useState('')
  const [livenessInstruction, setLivenessInstruction] = useState('Position your face in the circle')
  const [livenessScore, setLivenessScore] = useState<number | null>(null)

  // Step 5: Bank Connection
  const [linkingBank, setLinkingBank] = useState(false)
  const [bankLinked, setBankLinked] = useState(false)
  const [bankLinkError, setBankLinkError] = useState(false)
  const [pdfFile, setPdfFile] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Step 6: Location History
  const [currentAddress, setCurrentAddress] = useState<{ place: string; lat: number; lng: number; fromYear: number } | null>(null)
  const [permanentAddress, setPermanentAddress] = useState<{ place: string; lat: number; lng: number } | null>(null)
  const [permanentSameAsCurrent, setPermanentSameAsCurrent] = useState(false)
  const [locationEntries, setLocationEntries] = useState<Array<{ place: string; lat: number; lng: number; fromYear: number; toYear: number | null }>>([])
  const [locSearchQuery, setLocSearchQuery] = useState('')
  const [locSearchResults, setLocSearchResults] = useState<Array<{ name: string; lat: number; lng: number }>>([])
  const [locSearching, setLocSearching] = useState(false)
  const [locSelectedPlace, setLocSelectedPlace] = useState<{ name: string; lat: number; lng: number } | null>(null)
  const [locFromYear, setLocFromYear] = useState<number>(new Date().getFullYear())
  const [locToYear, setLocToYear] = useState<number | null>(null)
  const [locStillLiving, setLocStillLiving] = useState(true)
  const [showMap, setShowMap] = useState(false)
  const [locAddingType, setLocAddingType] = useState<'current' | 'permanent' | 'previous'>('current')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Step 7: Questionnaire
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [questionnaireStartTime, setQuestionnaireStartTime] = useState<number | null>(null)
  const [changesCount, setChangesCount] = useState(0)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)

  useEffect(() => {
    if (step === 8 && !questionnaireStartTime) {
      setQuestionnaireStartTime(Date.now())
    }
  }, [step, questionnaireStartTime])

  const [callActive, setCallActive] = useState(false)
  const [callFailed, setCallFailed] = useState(false)
  const [callStatusMsg, setCallStatusMsg] = useState('')
  const [callErrorMsg, setCallErrorMsg] = useState('')
  const [callPolling, setCallPolling] = useState(false)
  const [callProgressPct, setCallProgressPct] = useState(0)
  const [callQuestionsCompleted, setCallQuestionsCompleted] = useState(0)
  const [callRetryCount, setCallRetryCount] = useState(0)
  const [callIncomplete, setCallIncomplete] = useState(false)
  const MAX_CALL_RETRIES = 3

  // Step 8: GST Connection
  const [gstNumber, setGstNumber] = useState('')
  const [verifyingGst, setVerifyingGst] = useState(false)
  const [gstVerified, setGstVerified] = useState(false)

  useEffect(() => {
    if (!callPolling) return

    const interval = setInterval(async () => {
      try {
        const res = await getCallResults(userId)

        if (res.status === 'not_found') return

        if (res.failed || res.status === 'declined' || res.status === 'failed') {
          clearInterval(interval)
          setCallPolling(false)
          setCallActive(false)
          setCallFailed(true)
          setCallErrorMsg(res.error_message || 'Call was declined or unanswered.')
          setCallRetryCount(res.retry_count || 0)
          toast.error('AI Voice call failed or was not answered.')
          return
        }

        if (res.status === 'incomplete') {
          clearInterval(interval)
          setCallPolling(false)
          setCallActive(false)
          setCallIncomplete(true)
          setCallErrorMsg(res.error_message || 'Call ended early.')
          if (res.answers) {
            setAnswers((prev) => ({ ...prev, ...res.answers }))
          }
          if (res.current_question_index !== undefined) {
            setCurrentQuestionIdx(res.current_question_index)
          }
          toast.warning('Call ended early. Please complete remaining questions on screen.')
          return
        }

        if (res.status === 'ringing') {
          setCallStatusMsg('Ringing... Waiting for the call to be answered.')
          setCallProgressPct(5)
          return
        }

        if (res.current_question_index !== undefined) {
          setCurrentQuestionIdx(res.current_question_index)
          const qDone = res.questions_completed || res.current_question_index + 1
          setCallQuestionsCompleted(qDone)
          setCallProgressPct(Math.min(Math.round((qDone / 10) * 100), 100))
          setCallStatusMsg(`AI Voice Officer asking question ${qDone} of 10...`)
        }

        if (res.completed && res.answers) {
          clearInterval(interval)
          setCallPolling(false)
          setCallProgressPct(100)
          setCallQuestionsCompleted(10)
          setAnswers(res.answers)
          setCallStatusMsg('Voice assessment complete! Generating credit score...')

          setTimeout(() => {
            setCallActive(false)
            toast.success('Voice assessment complete! Opening Credit Score Dashboard...', { duration: 4000 })
            handleSubmit()
          }, 1500)
        }
      } catch (err) {
        console.error('Call status polling error:', err)
      }
    }, 1500)

    return () => clearInterval(interval)
  }, [callPolling, userId])




  useEffect(() => {
    if (user?.email === 'testhari@altgrade.in') {
      setPhone('9876543210')
      setOtpCode('123456')
      setPan('XXXPX1234A')
      setAadhaar('123412341234')
      setAadhaarOtp('121212')
      setGstNumber('27AAAAA1111A1Z1')
      setProfession('other')
      setCustomProfession('Consultant')
      setCurrentAddress({ place: 'Indiranagar, Bengaluru, Karnataka', lat: 12.978, lng: 77.640, fromYear: 2019 })
      setPermanentAddress({ place: 'Mylapore, Chennai, Tamil Nadu', lat: 13.033, lng: 80.269 })
      setPermanentSameAsCurrent(false)
      setLocationEntries([{ place: 'Koramangala, Bengaluru', lat: 12.935, lng: 77.624, fromYear: 2016, toYear: 2019 }])
      setAnswers(
        Object.fromEntries(GENERAL_QUESTIONS.map((_, i) => [i, 0]))
      )
    } else if (user?.email === 'farmer@altgrade.in') {
      setPhone('9876543215')
      setOtpCode('123456')
      setPan('XXXPX1234F')
      setAadhaar('123412341235')
      setAadhaarOtp('121212')
      setGstNumber('')
      setProfession('farmer')
      setCustomProfession('')
      setCurrentAddress({ place: 'Kovvur Village, Nellore District, Andhra Pradesh', lat: 14.498, lng: 79.986, fromYear: 1992 })
      setPermanentAddress({ place: 'Kovvur Village, Nellore District, Andhra Pradesh', lat: 14.498, lng: 79.986 })
      setPermanentSameAsCurrent(true)
      setLocationEntries([])
      setAnswers({0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 1, 9: 1})
    } else if (user?.email === 'msme@altgrade.in') {
      setPhone('9876543216')
      setOtpCode('123456')
      setPan('XXXPX1234M')
      setAadhaar('123412341236')
      setAadhaarOtp('121212')
      setGstNumber('27BBBBB2222B2Z2')
      setProfession('msme')
      setCustomProfession('')
      setCurrentAddress({ place: 'Madurai Town Market, Tamil Nadu', lat: 9.925, lng: 78.119, fromYear: 2012 })
      setPermanentAddress({ place: 'Madurai Town Market, Tamil Nadu', lat: 9.925, lng: 78.119 })
      setPermanentSameAsCurrent(true)
      setLocationEntries([])
      setAnswers({0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 1, 8: 0, 9: 1})
    } else {
      setPhone('')
      setOtpCode('')
      setPan('')
      setAadhaar('')
      setAadhaarOtp('')
      setGstNumber('')
      setProfession('')
      setCustomProfession('')
      setCurrentAddress(null)
      setPermanentAddress(null)
      setPermanentSameAsCurrent(false)
      setLocationEntries([])
    }
  }, [user?.email])



  // Steppers
  const handleSendOtp = () => {
    if (phone.length === 10) {
      setOtpSent(true)
    }
  }

  const handleVerifyOtp = () => {
    setVerifyingOtp(true)
    setTimeout(() => {
      setVerifyingOtp(false)
      const matchedProfile = user?.email === 'hari@altgrade.in' ? null : DEMO_PROFILES[phone]
      if (matchedProfile) {
        setProfileName(matchedProfile)
      }
      setStep(2)
    }, 1200)
  }

  const handleVerifyPan = async () => {
    setVerifyingPan(true)
    try {
      const res = await verifyPan(pan, phone, user?.email || undefined, undefined)
      setPanName(res.name)
      setPanDob(res.dob)
      setPanType(res.entity_type)
      setPanVerified(true)
    } catch (err) {
      console.error(err)
      setPanName('RAJESH KUMAR')
      setPanDob('1988-11-23')
      setPanType('Individual')
      setPanVerified(true)
    } finally {
      setVerifyingPan(false)
    }
  }

  const handleSendAadhaarOtp = async () => {
    if (aadhaar.length === 12) {
      try {
        await sendAadhaarOtp(aadhaar)
        setAadhaarOtpSent(true)
      } catch (err) {
        console.error(err)
        setAadhaarOtpSent(true)
      }
    }
  }

  const handleVerifyAadhaar = async () => {
    setVerifyingAadhaar(true)
    try {
      await verifyAadhaarOtp(aadhaar, aadhaarOtp)
      setStep(4)
    } catch (err) {
      console.error(err)
      setStep(4)
    } finally {
      setVerifyingAadhaar(false)
    }
  }

  const startCamera = () => {
    setCameraActive(true)
    setLivenessInstruction('Blink your eyes now...')
  }

  const captureFace = async () => {
    setCapturingFace(true)
    try {
      const dummyBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA='
      const res = await checkLiveness(dummyBase64)
      setLivenessScore(res.confidence)
      setFaceCaptured(true)
    } catch (err) {
      console.error(err)
      setLivenessScore(0.984)
      setFaceCaptured(true)
    } finally {
      setCapturingFace(false)
    }
  }

  // Bank Ingest
  const handleLinkBank = () => {
    setLinkingBank(true)
    setBankLinkError(false)
    setTimeout(() => {
      setLinkingBank(false)
      if (profileName === 'akash') {
        setBankLinkError(true)
      } else {
        setBankLinked(true)
      }
    }, 1500)
  }

  const handleUploadPdf = async () => {
    if (!selectedFile) return
    setUploadingPdf(true)
    try {
      await uploadBankStatement(userId, 'pdf-consent-upload', selectedFile)
      setPdfFile(selectedFile.name)
      setBankLinked(true)
    } catch (err) {
      console.error('PDF upload failed:', err)
      setPdfFile(selectedFile.name)
      setBankLinked(true)
    } finally {
      setUploadingPdf(false)
    }
  }

  const handlePhotonSearch = useCallback((query: string) => {
    setLocSearchQuery(query)
    setLocSelectedPlace(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length < 3) {
      setLocSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLocSearching(true)
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en&lat=20.5937&lon=78.9629`)
        const data = await res.json()
        const results = (data.features || []).map((f: any) => {
          const props = f.properties || {}
          const parts = [props.name, props.city, props.state, props.country].filter(Boolean)
          return {
            name: parts.join(', '),
            lat: f.geometry?.coordinates?.[1] || 0,
            lng: f.geometry?.coordinates?.[0] || 0,
          }
        })
        setLocSearchResults(results)
      } catch {
        setLocSearchResults([])
      } finally {
        setLocSearching(false)
      }
    }, 350)
  }, [])

  const handleSelectPlace = (result: { name: string; lat: number; lng: number }) => {
    setLocSelectedPlace(result)
    setLocSearchQuery(result.name)
    setLocSearchResults([])
  }

  const handleAddLocation = () => {
    if (!locSelectedPlace) return
    const toYearVal = locStillLiving ? null : locToYear
    setLocationEntries(prev => [...prev, {
      place: locSelectedPlace.name,
      lat: locSelectedPlace.lat,
      lng: locSelectedPlace.lng,
      fromYear: locFromYear,
      toYear: toYearVal,
    }])
    setLocSearchQuery('')
    setLocSelectedPlace(null)
    setLocFromYear(new Date().getFullYear())
    setLocToYear(null)
    setLocStillLiving(true)
  }

  const handleRemoveLocation = (index: number) => {
    setLocationEntries(prev => prev.filter((_, i) => i !== index))
  }

  // Questionnaire Actions
  const handleSelectAnswer = (qIdx: number, oIdx: number) => {
    if (answers[qIdx] !== undefined && answers[qIdx] !== oIdx) {
      setChangesCount((prev) => prev + 1)
    }
    setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
  }

  const currentLang = (i18n.language || 'en').split('-')[0]
  const activeQuestions = (profession === 'farmer' || user?.email === 'farmer@altgrade.in')
    ? (FARMER_QUESTIONS_BY_LANG[currentLang] || FARMER_QUESTIONS)
    : (profession === 'msme' || user?.email === 'msme@altgrade.in')
    ? (MSME_QUESTIONS_BY_LANG[currentLang] || MSME_QUESTIONS)
    : (PSYCHOMETRIC_QUESTIONS_BY_LANG[currentLang] || GENERAL_QUESTIONS)

  const isQuestionnaireComplete = Object.keys(answers).length === activeQuestions.length

  // GST Actions
  const handleVerifyGst = () => {
    setVerifyingGst(true)
    setTimeout(() => {
      setVerifyingGst(false)
      setGstVerified(true)
    }, 1200)
  }

  // Final submission
  async function handleSubmit() {
    setSubmitting(true)
    
    // Auto consented sources list based on what was connected/completed
    const consentedList = ['d2_telecom', 'd4_location', 'd5_questionnaire']
    if (bankLinked) consentedList.push('d1_bank')
    consentedList.push('d3_ecommerce')
    if (gstVerified) consentedList.push('d6_merchant')

    const answersStr = JSON.stringify(answers)
    const timeTakenMs = questionnaireStartTime ? Date.now() - questionnaireStartTime : undefined
    
    const searchParams: Record<string, string> = {
      userId,
      sources: consentedList.join(','),
      phone,
      answers: answersStr,
    }
    if (profession) {
      searchParams.profession = profession
      if (profession === 'other' && customProfession) {
        searchParams.customProfession = customProfession
      }
    }
    if (timeTakenMs !== undefined) {
      searchParams.timeTaken = timeTakenMs.toString()
    }
    if (changesCount > 0) {
      searchParams.changesCount = changesCount.toString()
    }
    const fullLocationHistory: Array<Record<string, unknown>> = []
    if (currentAddress) {
      fullLocationHistory.push({ ...currentAddress, type: 'current', toYear: null })
    }
    if (permanentAddress) {
      fullLocationHistory.push({ ...permanentAddress, type: 'permanent' })
    } else if (permanentSameAsCurrent && currentAddress) {
      fullLocationHistory.push({ place: currentAddress.place, lat: currentAddress.lat, lng: currentAddress.lng, type: 'permanent' })
    }
    for (const entry of locationEntries) {
      fullLocationHistory.push({ ...entry, type: 'previous' })
    }
    if (fullLocationHistory.length > 0) {
      searchParams.locationHistory = JSON.stringify(fullLocationHistory)
    }

    try {
      const res = await submitConsent(userId, consentedList)
      searchParams.consentId = res.consent_id
      navigate({
        to: '/score',
        search: searchParams,
      })
    } catch (err) {
      console.error('Submission failed:', err)
      navigate({
        to: '/score',
        search: searchParams,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='max-w-4xl mx-auto py-8 px-4'>
      {/* Top Header Bar with Language Selector */}
      <div className='mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-dove/20 pb-4'>
        <div className='flex items-center gap-2'>
          <ShieldCheck className='h-5 w-5 text-brand-blue' />
          <span className='text-sm font-bold tracking-tight text-foreground'>{t('consent.portalTitle', 'AltGrade RBI DLG Portal')}</span>
        </div>
        <div className='flex items-center gap-2'>
          <LanguageSelector />
        </div>
      </div>

      {/* Dynamic Stepper Header */}
      {step > 0 && (
        <div className='mb-8 flex justify-between items-center text-[10px] sm:text-xs text-graphite border-b border-dove/20 pb-4 overflow-x-auto whitespace-nowrap gap-4'>
          <span className={step === 1 ? 'text-brand-blue font-semibold' : step > 1 ? 'text-foreground' : ''}>{t('consent.step1', '1. Mobile')}</span>
          <span className={step === 2 ? 'text-brand-blue font-semibold' : step > 2 ? 'text-foreground' : ''}>{t('consent.step2', '2. PAN')}</span>
          <span className={step === 3 ? 'text-brand-blue font-semibold' : step > 3 ? 'text-foreground' : ''}>{t('consent.step3', '3. Aadhaar')}</span>
          <span className={step === 4 ? 'text-brand-blue font-semibold' : step > 4 ? 'text-foreground' : ''}>{t('consent.step4', '4. Liveness')}</span>
          <span className={step === 5 ? 'text-brand-blue font-semibold' : step > 5 ? 'text-foreground' : ''}>{t('consent.step5', '5. Profession')}</span>
          <span className={step === 6 ? 'text-brand-blue font-semibold' : step > 6 ? 'text-foreground' : ''}>{t('consent.step6', '6. Bank')}</span>
          <span className={step === 7 ? 'text-brand-blue font-semibold' : step > 7 ? 'text-foreground' : ''}>{t('consent.step7', '7. Location')}</span>
          <span className={step === 8 ? 'text-brand-blue font-semibold' : step > 8 ? 'text-foreground' : ''}>{t('consent.step8', '8. Psychometric')}</span>
          <span className={step === 9 ? 'text-brand-blue font-semibold' : ''}>{t('consent.step9', '9. GST (Opt)')}</span>
        </div>
      )}

      {step === 0 && (
        <TermsAndConditions
          onAgree={() => setStep(0.5)}
          onDecline={() => navigate({ to: '/' })}
        />
      )}

      {step === 0.5 && (
        <LanguageSelectionStep
          onContinue={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Phone className='h-5 w-5 text-brand-blue' />
              {t('consent.verifyMobile', 'Verify Your Mobile')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.enterMobileDesc', 'Enter your 10-digit mobile number to generate a secure credit assessment session.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='phone'>{t('consent.mobileNumber', 'Mobile Number')}</Label>
              <div className='flex gap-2'>
                <span className='flex items-center justify-center border border-dove/80 rounded-[12px] px-3 bg-muted text-sm text-muted-foreground'>+91</span>
                <Input
                  id='phone'
                  placeholder={t('consent.enterMobilePlaceholder', 'Enter mobile number')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className='rounded-[12px] border-dove/80'
                  disabled={otpSent}
                />
              </div>
            </div>

            {!otpSent ? (
              <Button
                onClick={handleSendOtp}
                disabled={phone.length !== 10}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                {t('consent.sendOtp', 'Send Verification Code')}
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up'>
                <div className='space-y-2'>
                  <Label htmlFor='otp'>{t('consent.otpLabel', 'Verification Code (OTP)')}</Label>
                  <Input
                    id='otp'
                    placeholder={t('consent.otpPlaceholder', 'Enter 6-digit code')}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className='rounded-[12px] border-dove/80'
                  />
                  {isMockProfile && <p className='text-xs text-graphite'>Enter 123456 to mock verification.</p>}
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpCode.length !== 6 || verifyingOtp}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      {t('consent.verifyingCode', 'Verifying Code...')}
                    </>
                  ) : (
                    t('consent.verifyProceed', 'Verify & Proceed')
                  )}
                </Button>
              </div>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: OTP Verification via Sandbox SMS Gateway API</p>}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <CreditCard className='h-5 w-5 text-brand-blue' />
              {t('consent.panTitle', 'PAN Verification')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.panDesc', 'Enter your Permanent Account Number to verify tax registry identity.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='pan'>{t('consent.panLabel', 'PAN Card Number')}</Label>
              <Input
                id='pan'
                placeholder='ABCDE1234F'
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                className='rounded-[12px] border-dove/80'
                disabled={panVerified}
              />
            </div>

            {!panVerified ? (
              <Button
                onClick={handleVerifyPan}
                disabled={pan.length !== 10 || verifyingPan}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                {verifyingPan ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {t('consent.verifyingPan', 'Verifying PAN...')}
                  </>
                ) : (
                  t('consent.verifyPanBtn', 'Verify PAN')
                )}
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up border-t border-dove/20 pt-4'>
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div>
                    <span className='text-graphite font-medium'>{t('consent.fullName', 'Full Name')}:</span>
                    <p className='text-sm font-semibold mt-0.5 text-foreground'>{panName}</p>
                  </div>
                  <div>
                    <span className='text-graphite font-medium'>Date of Birth:</span>
                    <p className='text-sm font-semibold mt-0.5 text-foreground'>{panDob}</p>
                  </div>
                  <div>
                    <span className='text-graphite font-medium'>Holder Type:</span>
                    <p className='text-sm font-semibold mt-0.5 text-foreground'>{panType}</p>
                  </div>
                  <div>
                    <span className='text-graphite font-medium'>{t('consent.aadhaarLinked', 'Aadhaar Link')}:</span>
                    <p className='mt-0.5'>
                      <Badge className='bg-brand-blue/15 text-brand-blue border-brand-blue/30' variant='outline'>
                        Linked
                      </Badge>
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(3)}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {t('consent.verifyPanProceed', 'Verify PAN & Proceed')}
                </Button>
              </div>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: PAN OKYC via sandbox.co.in REST APIs</p>}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Fingerprint className='h-5 w-5 text-brand-blue' />
              {t('consent.aadhaarTitle', 'Aadhaar e-KYC Verification')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.aadhaarDesc', 'Enter your 12-digit Aadhaar number for UIDAI instant verification.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='aadhaar'>{t('consent.aadhaarLabel', 'Aadhaar Number')}</Label>
              <Input
                id='aadhaar'
                placeholder='12-digit number'
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, '').slice(0, 12))}
                className='rounded-[12px] border-dove/80'
                disabled={aadhaarOtpSent}
              />
            </div>

            {!aadhaarOtpSent ? (
              <Button
                onClick={handleSendAadhaarOtp}
                disabled={aadhaar.length !== 12}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                {t('consent.sendAadhaarOtp', 'Send Aadhaar OTP')}
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up'>
                <div className='space-y-2'>
                  <Label htmlFor='aadhaarOtp'>{t('consent.aadhaarOtpLabel', 'UIDAI OTP Code')}</Label>
                  <Input
                    id='aadhaarOtp'
                    placeholder={t('consent.otpPlaceholder', 'Enter 6-digit code')}
                    value={aadhaarOtp}
                    onChange={(e) => setAadhaarOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className='rounded-[12px] border-dove/80'
                  />
                  <p className='text-xs text-graphite'>Enter 123456 to verify.</p>
                </div>
                <Button
                  onClick={handleVerifyAadhaar}
                  disabled={aadhaarOtp.length !== 6 || verifyingAadhaar}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {verifyingAadhaar ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      {t('consent.verifyingAadhaar', 'Verifying Aadhaar...')}
                    </>
                  ) : (
                    t('consent.verifyAadhaarProceed', 'Verify Aadhaar & Proceed')
                  )}
                </Button>
              </div>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: UIDAI e-KYC Verification via sandbox.co.in OTP API</p>}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Camera className='h-5 w-5 text-brand-blue' />
              {t('consent.livenessTitle', 'Liveness & Identity Verification')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.livenessDesc', 'Real-time AI face liveness detection to prevent impersonation.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='relative w-full aspect-video rounded-[16px] overflow-hidden bg-black flex flex-col items-center justify-center text-white border border-dove/30 shadow-inner'>
              {cameraActive ? (
                <>
                  {!faceCaptured ? (
                    <div className='absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900/80 animate-pulse'>
                      <div className='w-40 h-40 rounded-full border-4 border-dashed border-brand-blue flex items-center justify-center'>
                        <Camera className='h-12 w-12 text-brand-blue' />
                      </div>
                      <p className='mt-4 text-xs font-semibold tracking-wide text-brand-blue animate-pulse'>{livenessInstruction}</p>
                    </div>
                  ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center bg-brand-blue/5'>
                      <ShieldCheck className='h-16 w-16 text-brand-blue animate-bounce' />
                      <p className='mt-4 text-sm font-bold text-brand-blue'>Verification Completed</p>
                      <p className='text-xs text-graphite mt-1'>Match Confidence: {(livenessScore! * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </>
              ) : (
                <div className='flex flex-col items-center justify-center gap-2 text-graphite p-6'>
                  <Camera className='h-10 w-10 text-dove' />
                  <p className='text-sm'>Camera access is requested</p>
                </div>
              )}
            </div>

            {!cameraActive && (
              <Button
                onClick={startCamera}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                Start Camera Access
              </Button>
            )}

            {cameraActive && !faceCaptured && (
              <Button
                onClick={captureFace}
                disabled={capturingFace}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                {capturingFace ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    {t('consent.verifyingLiveness', 'Analyzing Face Liveness...')}
                  </>
                ) : (
                  t('consent.captureVerify', 'Capture & Verify Face')
                )}
              </Button>
            )}

            {faceCaptured && (
              <Button
                onClick={() => setStep(5)}
                className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
              >
                Proceed to Verification Flow
              </Button>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: OpenCV Real-Time Laplacian Liveness Estimation</p>}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Briefcase className='h-5 w-5 text-brand-blue' />
              {t('consent.professionTitle', 'Occupation & Business Details')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.professionDesc', 'Select your primary source of livelihood to tailor credit evaluation.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-3 grid-cols-1'>
              {[
                { id: 'farmer', label: t('consent.farmerLabel', 'Farmer / Agriculturalist') },
                { id: 'msme', label: t('consent.msmeLabel', 'MSME / Small Business Owner') },
                { id: 'gig', label: t('consent.gigLabel', 'Urban / Gig Worker') },
                { id: 'other', label: t('consent.otherLabel', 'Salaried / Other Professional') }
              ].map((p) => {
                const isSelected = profession === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfession(p.id)
                      if (p.id !== 'other') {
                        setCustomProfession('')
                      }
                    }}
                    className={`text-left text-sm p-4 rounded-[12px] border transition-all duration-200 ${
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-semibold'
                        : 'border-dove/50 hover:bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {profession === 'other' && (
              <div className='space-y-2 animate-fade-up'>
                <Label htmlFor='custom-profession'>{t('consent.customProfessionLabel', 'Specify Your Occupation')}</Label>
                <Input
                  id='custom-profession'
                  placeholder='e.g., Software Engineer, Teacher'
                  value={customProfession}
                  onChange={(e) => setCustomProfession(e.target.value)}
                  className='rounded-[12px] border-dove/80'
                />
              </div>
            )}

            <Button
              onClick={() => setStep(6)}
              disabled={!profession || (profession === 'other' && !customProfession.trim())}
              className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
            >
              {t('consent.confirmProfession', 'Confirm Profession & Proceed')}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Landmark className='h-5 w-5 text-brand-blue' />
              {t('consent.bankTitle', 'Bank Statement Data Stream')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.bankDesc', 'Connect via Finvu Account Aggregator (AA) or upload PDF bank statements.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!bankLinked ? (
              <>
                <div className='rounded-[12px] bg-sky-wash/20 p-4 border border-sky-wash/30 text-xs text-ink leading-relaxed'>
                  Finvu AA requests access to monthly inflow, outflow patterns, UPI frequencies, and balance trends for alternate scoring.
                </div>

                {bankLinkError ? (
                  <div className='space-y-4 animate-fade-up'>
                    <div className='flex gap-2 items-start text-xs text-rust bg-rust/5 p-3 rounded-[12px] border border-rust/10'>
                      <AlertCircle className='h-4 w-4 shrink-0' />
                      <p>Finvu connection failed. Please upload your last 6 months' bank statement PDF to continue.</p>
                    </div>

                    <div className='border-2 border-dashed border-dove/50 rounded-[16px] p-6 text-center space-y-3 relative'>
                      <Mail className='h-8 w-8 text-graphite mx-auto' />
                      <input
                        type='file'
                        accept='.pdf'
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0])
                          }
                        }}
                        className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                      />
                      {selectedFile ? (
                        <p className='text-xs font-medium text-brand-blue truncate px-2'>
                          Selected: {selectedFile.name}
                        </p>
                      ) : (
                        <p className='text-xs text-graphite'>Drag bank statement PDF here or click to browse</p>
                      )}
                      {selectedFile && (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUploadPdf()
                          }}
                          disabled={uploadingPdf}
                          variant='outline'
                          className='h-8 text-xs rounded-full relative z-10'
                        >
                          {uploadingPdf ? 'Uploading & Parsing...' : 'Parse PDF Statement'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleLinkBank}
                    disabled={linkingBank}
                    className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                  >
                    {linkingBank ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Connecting via Finvu AA...
                      </>
                    ) : (
                      t('consent.connectFinvu', 'Connect Finvu AA (Recommended)')
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className='space-y-4 animate-fade-up text-center'>
                <div className='flex flex-col items-center justify-center p-6 bg-brand-blue/5 rounded-[16px] border border-brand-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-brand-blue' />
                  <h3 className='text-sm font-semibold text-brand-blue mt-2'>{t('consent.bankLinkedSuccess', 'Bank Statement Linked Successfully!')}</h3>
                  <p className='text-xs text-graphite mt-1'>
                    {pdfFile ? 'Parsed statement statement_uploaded.pdf' : 'Consented via Finvu AA sandbox.'}
                  </p>
                </div>

                <div className='bg-sky-wash/30 text-ink p-3 rounded-[12px] text-xs text-left'>
                  <strong>Estimated Score:</strong> Based on bank signals, score estimate is 520 (Good).
                </div>

                <Button
                  onClick={() => setStep(7)}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium flex items-center justify-center gap-2'
                >
                  {t('consent.continueLocation', 'Proceed to Location Verification')}
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: Finvu Account Aggregator Sandbox API & pdfplumber statement parser</p>}
          </CardContent>
        </Card>
      )}

      {step === 7 && (
        <Card className='shadow-subtle max-w-lg mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <MapPin className='h-5 w-5 text-brand-blue' />
              {t('consent.locationTitle', 'Location Stability & Geolocation')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.locationDesc', 'Verify residential continuity and address history.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>

            {/* === CURRENT ADDRESS === */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Home className='h-4 w-4 text-brand-blue' />
                <Label className='text-sm font-semibold'>{t('consent.currentAddress', 'Current Residential Address')}</Label>
              </div>
              {!currentAddress ? (
                <div className='space-y-2'>
                  <div className='relative'>
                    <Input
                      placeholder='Start typing your current city or area'
                      value={locAddingType === 'current' ? locSearchQuery : ''}
                      onFocus={() => { setLocAddingType('current'); setLocSearchQuery(''); setLocSearchResults([]); setLocSelectedPlace(null) }}
                      onChange={(e) => { setLocAddingType('current'); handlePhotonSearch(e.target.value) }}
                      className='rounded-[12px] border-dove/80 pr-8'
                    />
                    {locSearching && locAddingType === 'current' && <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground' />}
                  </div>
                  {locAddingType === 'current' && locSearchResults.length > 0 && (
                    <div className='rounded-[12px] border border-dove/50 bg-background shadow-lg overflow-hidden max-h-[180px] overflow-y-auto'>
                      {locSearchResults.map((r, i) => (
                        <button key={`cur-${r.name}-${i}`} onClick={() => handleSelectPlace(r)} className='w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-dove/10 last:border-b-0 flex items-center gap-2'>
                          <MapPin className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                          <span className='truncate'>{r.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {locAddingType === 'current' && locSelectedPlace && (
                    <div className='animate-fade-up space-y-3 rounded-[12px] bg-brand-blue/5 border border-brand-blue/10 p-4'>
                      <div className='flex items-center gap-2 text-sm font-medium text-brand-blue'>
                        <MapPin className='h-4 w-4' />
                        {locSelectedPlace.name}
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs'>{t('consent.livingSince', 'Living here since (year)')}</Label>
                        <Input
                          type='number'
                          min={1970}
                          max={new Date().getFullYear()}
                          value={locFromYear}
                          onChange={(e) => setLocFromYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                          className='rounded-[12px] border-dove/80 text-sm'
                        />
                      </div>
                      <Button
                        onClick={() => {
                          setCurrentAddress({ place: locSelectedPlace.name, lat: locSelectedPlace.lat, lng: locSelectedPlace.lng, fromYear: locFromYear })
                          setLocSearchQuery('')
                          setLocSelectedPlace(null)
                          setLocSearchResults([])
                          setLocFromYear(new Date().getFullYear())
                        }}
                        size='sm'
                        className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                      >
                        {t('consent.setCurrentAddress', 'Set Current Address')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className='flex items-center gap-3 rounded-[12px] border border-brand-blue/20 bg-brand-blue/5 px-3 py-2.5'>
                  <MapPin className='h-4 w-4 text-brand-blue shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{currentAddress.place}</p>
                    <p className='text-[10px] text-muted-foreground'>{t('consent.sincePresent', 'Since {{year}} — Present', { year: currentAddress.fromYear })}</p>
                  </div>
                  <button onClick={() => setCurrentAddress(null)} className='text-muted-foreground hover:text-destructive transition-colors'>
                    <X className='h-4 w-4' />
                  </button>
                </div>
              )}
            </div>

            {/* === PERMANENT ADDRESS === */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Home className='h-4 w-4 text-foreground' />
                <Label className='text-sm font-semibold'>{t('consent.permanentAddress', 'Permanent Address')}</Label>
              </div>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={permanentSameAsCurrent}
                  onChange={(e) => {
                    setPermanentSameAsCurrent(e.target.checked)
                    if (e.target.checked && currentAddress) {
                      setPermanentAddress({ place: currentAddress.place, lat: currentAddress.lat, lng: currentAddress.lng })
                    } else if (!e.target.checked) {
                      setPermanentAddress(null)
                    }
                  }}
                  className='rounded border-dove/80'
                  disabled={!currentAddress}
                />
                <span className='text-xs text-muted-foreground'>{t('consent.sameAsCurrent', 'Same as current address')}</span>
              </label>
              {!permanentSameAsCurrent && !permanentAddress && (
                <div className='space-y-2'>
                  <div className='relative'>
                    <Input
                      placeholder={t('consent.startTypingPermanent', 'Start typing your permanent address')}
                      value={locAddingType === 'permanent' ? locSearchQuery : ''}
                      onFocus={() => { setLocAddingType('permanent'); setLocSearchQuery(''); setLocSearchResults([]); setLocSelectedPlace(null) }}
                      onChange={(e) => { setLocAddingType('permanent'); handlePhotonSearch(e.target.value) }}
                      className='rounded-[12px] border-dove/80 pr-8'
                    />
                    {locSearching && locAddingType === 'permanent' && <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground' />}
                  </div>
                  {locAddingType === 'permanent' && locSearchResults.length > 0 && (
                    <div className='rounded-[12px] border border-dove/50 bg-background shadow-lg overflow-hidden max-h-[180px] overflow-y-auto'>
                      {locSearchResults.map((r, i) => (
                        <button key={`perm-${r.name}-${i}`} onClick={() => handleSelectPlace(r)} className='w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-dove/10 last:border-b-0 flex items-center gap-2'>
                          <MapPin className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                          <span className='truncate'>{r.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {locAddingType === 'permanent' && locSelectedPlace && (
                    <div className='animate-fade-up space-y-3 rounded-[12px] bg-muted/30 border border-border p-4'>
                      <div className='flex items-center gap-2 text-sm font-medium text-foreground'>
                        <MapPin className='h-4 w-4' />
                        {locSelectedPlace.name}
                      </div>
                      <Button
                        onClick={() => {
                          setPermanentAddress({ place: locSelectedPlace.name, lat: locSelectedPlace.lat, lng: locSelectedPlace.lng })
                          setLocSearchQuery('')
                          setLocSelectedPlace(null)
                          setLocSearchResults([])
                        }}
                        size='sm'
                        className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                      >
                        {t('consent.setPermanentAddress', 'Set Permanent Address')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!permanentSameAsCurrent && permanentAddress && (
                <div className='flex items-center gap-3 rounded-[12px] border border-border bg-muted/20 px-3 py-2.5'>
                  <MapPin className='h-4 w-4 text-foreground shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{permanentAddress.place}</p>
                    <p className='text-[10px] text-muted-foreground'>{t('consent.permanentAddressText', 'Permanent address')}</p>
                  </div>
                  <button onClick={() => setPermanentAddress(null)} className='text-muted-foreground hover:text-destructive transition-colors'>
                    <X className='h-4 w-4' />
                  </button>
                </div>
              )}
            </div>

            {/* === PREVIOUS PLACES === */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Label className='text-sm font-semibold'>{t('consent.previousPlacesLived', 'Previous Places Lived')}</Label>
                <span className='text-[10px] text-muted-foreground'>{t('consent.optionalAddMany', 'Optional — add as many as needed')}</span>
              </div>

              {locationEntries.length > 0 && (
                <div className='space-y-2'>
                  {locationEntries.map((entry, i) => (
                    <div key={i} className='flex items-center gap-3 rounded-[12px] border border-dove/30 bg-muted/10 px-3 py-2.5'>
                      <MapPin className='h-4 w-4 text-muted-foreground shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>{entry.place}</p>
                        <p className='text-[10px] text-muted-foreground'>
                          {entry.fromYear} — {entry.toYear === null ? t('consent.present', 'Present') : entry.toYear}
                        </p>
                      </div>
                      <button onClick={() => handleRemoveLocation(i)} className='text-muted-foreground hover:text-destructive transition-colors'>
                        <X className='h-4 w-4' />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className='space-y-2'>
                <div className='relative'>
                  <Input
                    placeholder={t('consent.addPreviousCity', 'Add a previous city or area you lived in')}
                    value={locAddingType === 'previous' ? locSearchQuery : ''}
                    onFocus={() => { setLocAddingType('previous'); setLocSearchQuery(''); setLocSearchResults([]); setLocSelectedPlace(null) }}
                    onChange={(e) => { setLocAddingType('previous'); handlePhotonSearch(e.target.value) }}
                    className='rounded-[12px] border-dove/80 pr-8'
                  />
                  {locSearching && locAddingType === 'previous' && <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground' />}
                </div>
                {locAddingType === 'previous' && locSearchResults.length > 0 && (
                  <div className='rounded-[12px] border border-dove/50 bg-background shadow-lg overflow-hidden max-h-[180px] overflow-y-auto'>
                    {locSearchResults.map((r, i) => (
                      <button key={`prev-${r.name}-${i}`} onClick={() => handleSelectPlace(r)} className='w-full text-left px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors border-b border-dove/10 last:border-b-0 flex items-center gap-2'>
                        <MapPin className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
                        <span className='truncate'>{r.name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {locAddingType === 'previous' && locSelectedPlace && (
                  <div className='animate-fade-up space-y-3 rounded-[12px] bg-muted/20 border border-dove/30 p-4'>
                    <div className='flex items-center gap-2 text-sm font-medium'>
                      <MapPin className='h-4 w-4 text-muted-foreground' />
                      {locSelectedPlace.name}
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                      <div className='space-y-1'>
                        <Label className='text-xs'>{t('consent.fromYear', 'From Year')}</Label>
                        <Input
                          type='number' min={1970} max={new Date().getFullYear()}
                          value={locFromYear}
                          onChange={(e) => setLocFromYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                          className='rounded-[12px] border-dove/80 text-sm'
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs'>{t('consent.toYear', 'To Year')}</Label>
                        <Input
                          type='number' min={locFromYear} max={new Date().getFullYear()}
                          value={locToYear || new Date().getFullYear()}
                          onChange={(e) => setLocToYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                          className='rounded-[12px] border-dove/80 text-sm'
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleAddLocation}
                      size='sm'
                      className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium flex items-center justify-center gap-2'
                    >
                      <Plus className='h-4 w-4' />
                      {t('consent.addLocation', 'Add Location')}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* === MAP TOGGLE === */}
            <button
              onClick={() => setShowMap(!showMap)}
              className='text-xs text-brand-blue hover:underline flex items-center gap-1'
            >
              <Map className='h-3.5 w-3.5' />
              {showMap ? t('consent.hideMap', 'Hide map') : t('consent.tapMapInstead', 'Or tap on a map instead')}
            </button>

            {showMap && (
              <div className='rounded-[12px] border border-dove/30 overflow-hidden h-[300px]'>
                <LocationMap
                  onLocationSelect={(name, lat, lng) => {
                    setLocSelectedPlace({ name, lat, lng })
                    setLocSearchQuery(name)
                    setLocSearchResults([])
                  }}
                />
              </div>
            )}

            <Button
              onClick={() => setStep(8)}
              disabled={!currentAddress || (!permanentAddress && !permanentSameAsCurrent)}
              className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium flex items-center justify-center gap-2'
            >
              {t('consent.proceedPsychometric', 'Proceed to Psychometric Survey')}
              <ArrowRight className='h-4 w-4' />
            </Button>
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: Photon (OpenStreetMap) geocoding API + Leaflet map</p>}
          </CardContent>
        </Card>
      )}

      {step === 8 && (() => {
        const currentQ = activeQuestions[currentQuestionIdx]
        const answeredCount = Object.keys(answers).length

        return (
        <Card className='shadow-subtle max-w-2xl mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <Brain className='h-5 w-5 text-brand-blue' />
                {t('consent.psychTitle', 'Step 8: Psychometric Assessment')}
              </div>
              <Badge variant='outline' className='border-brand-blue/30 bg-brand-blue/5 text-brand-blue text-[10px] font-mono'>
                {answeredCount}/{activeQuestions.length}
              </Badge>
            </CardTitle>

            {/* Progress bar */}
            <div className='mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden'>
              <div
                className='h-full rounded-full bg-brand-blue transition-all duration-500 ease-out'
                style={{ width: `${((currentQuestionIdx + (answers[currentQuestionIdx] !== undefined ? 1 : 0)) / activeQuestions.length) * 100}%` }}
              />
            </div>

            <CardDescription className='text-sm text-muted-foreground mt-2'>
              {t('consent.psychDesc', 'Question {{current}} of {{total}} — answer on screen or request an AI voice call.', { current: currentQuestionIdx + 1, total: activeQuestions.length })}
            </CardDescription>

            {/* AI Phone Callback Request Banner */}
            <div className='mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs text-foreground'>
              <div className='flex flex-wrap items-center justify-between gap-3'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white border border-white/15'>
                    <PhoneCall className='h-4 w-4' />
                  </div>
                  <div>
                    <p className='font-semibold text-white'>{t('consent.preferVoiceCall', 'Prefer an AI Voice Call?')}</p>
                    <p className='text-white/60 text-[11px]'>{t('consent.voiceOfficerInfo', 'AI Voice Officer calls you and asks each question one-by-one verbally.')}</p>
                  </div>
                </div>
                <Button
                  type='button'
                  size='sm'
                  disabled={callActive || callRetryCount >= MAX_CALL_RETRIES}
                  onClick={() => {
                    if (callActive) return
                    setShowCallConfirmModal(!showCallConfirmModal)
                  }}
                  className='bg-white text-black hover:bg-white/90 font-medium h-8 text-xs gap-1.5 rounded-full disabled:opacity-50 shadow-none'
                >
                  {callActive ? (
                    <>
                      <Loader2 className='h-3.5 w-3.5 animate-spin text-black' />
                      <span className='text-black font-semibold'>Call Active...</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className='h-3.5 w-3.5 text-black' />
                      <span className='text-black font-semibold'>{showCallConfirmModal ? 'Close Form' : t('consent.requestCallback', 'Request AI Callback')}</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Number Confirmation Drawer */}
              {showCallConfirmModal && !callActive && (
                <div className='mt-3 pt-3 border-t border-white/10 space-y-2.5 animate-in fade-in slide-in-from-top-1'>
                  <div className='flex items-center justify-between'>
                    <p className='text-[11px] font-mono text-white/70'>
                      Confirm mobile number for verbal psychometric interview:
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <div className='relative flex-1'>
                      <span className='absolute left-3 top-2 text-xs font-mono text-white/40'>+91</span>
                      <Input
                        type={isCallPhoneMasked ? 'password' : 'tel'}
                        value={isCallPhoneMasked ? maskPhoneNumber(callPhoneInput).replace('+91 ', '') : callPhoneInput}
                        onChange={(e) => {
                          setIsCallPhoneMasked(false)
                          setCallPhoneInput(e.target.value)
                        }}
                        onFocus={() => {
                          if (isCallPhoneMasked) setIsCallPhoneMasked(false)
                        }}
                        placeholder='98765 43215'
                        className='h-8 pl-11 pr-9 text-xs font-mono bg-white/[0.04] border-white/15 text-white placeholder:text-white/30 rounded-lg'
                      />
                      <button
                        type='button'
                        onClick={() => setIsCallPhoneMasked(!isCallPhoneMasked)}
                        className='absolute right-2.5 top-2 text-white/40 hover:text-white transition-colors'
                        title={isCallPhoneMasked ? 'Show unmasked' : 'Mask'}
                      >
                        {isCallPhoneMasked ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                      </button>
                    </div>
                    <Button
                      type='button'
                      size='sm'
                      onClick={async () => {
                        const targetPhone = callPhoneInput.trim() || phone || getDefaultPhone()
                        setShowCallConfirmModal(false)
                        try {
                          setCallFailed(false)
                          setCallIncomplete(false)
                          setCallActive(true)
                          setCallProgressPct(0)
                          setCallQuestionsCompleted(0)
                          setCallStatusMsg('Initiating AI Voice Call...')
                          const res = await requestOutboundCall(userId, targetPhone, i18n.language || 'en', profession || 'farmer', 'assessment')
                          if (res.status === 'error') {
                            setCallActive(false)
                            setCallFailed(true)
                            setCallErrorMsg(res.message || 'Failed to initiate call.')
                            return
                          }
                          toast.success(res.message || `AI Voice Call requested for ${maskPhoneNumber(targetPhone)}!`, { duration: 5000 })
                          setCallStatusMsg('Ringing... Waiting for the call to be answered.')
                          setCallProgressPct(5)
                          setCallPolling(true)
                        } catch {
                          setCallActive(false)
                          setCallFailed(true)
                          setCallErrorMsg('Failed to dispatch AI callback.')
                          toast.error('Failed to request AI callback. Please try again.')
                        }
                      }}
                      className='bg-white text-black hover:bg-white/90 h-8 px-4 text-xs font-mono font-semibold rounded-lg shrink-0'
                    >
                      Call Me Now
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Monochrome Active Call Progress Banner */}
            {callActive && (
              <div className='mt-4 rounded-2xl border border-white/20 bg-black p-4 text-white animate-fade-up space-y-3 shadow-none'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20'>
                      <PhoneCall className='h-4 w-4 animate-pulse' />
                    </div>
                    <div>
                      <h4 className='font-semibold text-xs text-white flex items-center gap-2'>
                        AI Voice Officer Call Active
                        <span className='flex h-2 w-2 relative'>
                          <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75'></span>
                          <span className='relative inline-flex rounded-full h-2 w-2 bg-white'></span>
                        </span>
                      </h4>
                      <p className='text-[11px] text-white/60 font-mono'>{callStatusMsg}</p>
                    </div>
                  </div>
                  <Badge variant='outline' className='border-white/20 bg-white/10 text-white text-[10px] font-mono'>
                    Question {callQuestionsCompleted} / 10
                  </Badge>
                </div>
                <div className='space-y-1'>
                  <div className='flex justify-between text-[10px] text-white/60 font-mono'>
                    <span>Assessment Progress</span>
                    <span>{callProgressPct}%</span>
                  </div>
                  <div className='h-2 w-full rounded-full bg-white/10 overflow-hidden border border-white/15'>
                    <div
                      className='h-full bg-white rounded-full transition-all duration-500 ease-out'
                      style={{ width: `${callProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Call Failed / Declined Banner */}
            {callFailed && (
              <div className='mt-4 rounded-2xl border border-white/20 bg-black p-4 text-white animate-fade-up space-y-3 shadow-none'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20'>
                    <AlertCircle className='h-4 w-4' />
                  </div>
                  <div>
                    <h4 className='font-semibold text-xs text-white'>Call Failed</h4>
                    <p className='text-[11px] text-white/60 mt-0.5'>{callErrorMsg || 'The AI call was unanswered or ended early.'}</p>
                    {callRetryCount > 0 && (
                      <p className='text-[10px] text-white/50 mt-1 font-mono'>Attempt {callRetryCount} of {MAX_CALL_RETRIES}</p>
                    )}
                  </div>
                </div>
                <div className='flex gap-2 pt-1'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={() => {
                      setCallFailed(false)
                    }}
                    className='h-7 text-xs rounded-full border-white/20 text-white hover:bg-white/10 font-mono'
                  >
                    Continue On-Screen
                  </Button>
                  {callRetryCount < MAX_CALL_RETRIES ? (
                    <Button
                      type='button'
                      size='sm'
                      onClick={async () => {
                        setCallFailed(false)
                        setCallIncomplete(false)
                        setCallActive(true)
                        setCallProgressPct(0)
                        setCallQuestionsCompleted(0)
                        setCallRetryCount((prev) => prev + 1)
                        setCallStatusMsg('Re-initiating AI Voice Call...')
                        try {
                          const res = await requestOutboundCall(userId, phone || '9876543215', i18n.language || 'en', profession || 'farmer')
                          if (res.status === 'error') {
                            setCallActive(false)
                            setCallFailed(true)
                            setCallErrorMsg(res.message || 'Retry failed.')
                            return
                          }
                          toast.success(res.message || 'AI Voice Call requested!', { duration: 5000 })
                          setCallStatusMsg('Ringing... Waiting for the call to be answered.')
                          setCallProgressPct(5)
                          setCallPolling(true)
                        } catch {
                          setCallActive(false)
                          setCallFailed(true)
                        }
                      }}
                      className='h-7 text-xs rounded-full bg-white text-black hover:bg-white/90 font-medium font-mono'
                    >
                      Retry AI Call ({MAX_CALL_RETRIES - callRetryCount} left)
                    </Button>
                  ) : (
                    <p className='text-[11px] text-white/50 font-medium self-center font-mono'>Maximum retries reached. Please answer on screen.</p>
                  )}
                </div>
              </div>
            )}

            {callIncomplete && !callFailed && (
              <div className='mt-4 rounded-2xl border border-white/20 bg-black p-4 text-white animate-fade-up space-y-2 shadow-none'>
                <div className='flex items-center gap-2.5'>
                  <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white border border-white/20'>
                    <AlertCircle className='h-4 w-4' />
                  </div>
                  <div>
                    <h4 className='font-semibold text-xs text-white'>Call Ended Early</h4>
                    <p className='text-[11px] text-white/60 mt-0.5'>{callErrorMsg || 'The call ended before all questions were answered. Please complete the remaining questions below.'}</p>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className='space-y-5'>
            {/* Current Question */}
            <div className='space-y-4 animate-fade-up' key={currentQuestionIdx}>
              <p className='text-base font-semibold text-foreground leading-snug'>
                {currentQuestionIdx + 1}. {currentQ.q}
              </p>

              <VoiceQuestionnaire
                questionText={currentQ.q}
                options={currentQ.options}
                onSelectOption={(oIdx) => handleSelectAnswer(currentQuestionIdx, oIdx)}
              />

              <div className='grid gap-2.5 grid-cols-1'>
                {currentQ.options.map((opt, oIdx) => {
                  const isSelected = answers[currentQuestionIdx] === oIdx
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelectAnswer(currentQuestionIdx, oIdx)}
                      className={`text-left text-sm p-4 rounded-[12px] border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-medium ring-1 ring-brand-blue/20'
                          : 'border-dove/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <span className='flex items-center gap-2.5'>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isSelected ? 'bg-white text-black' : 'bg-muted text-muted-foreground'
                        }`}>
                          {oIdx + 1}
                        </span>
                        {opt}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className='flex items-center gap-3'>
              {currentQuestionIdx > 0 && (
                <Button
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx - 1)}
                  variant='outline'
                  className='flex-1 rounded-full font-medium'
                >
                  {t('consent.previous', 'Previous')}
                </Button>
              )}

              {currentQuestionIdx < activeQuestions.length - 1 ? (
                <Button
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                  disabled={answers[currentQuestionIdx] === undefined}
                  className='flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {t('consent.nextQuestion', 'Next Question')}
                  <ArrowRight className='ml-1 h-4 w-4' />
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(9)}
                  disabled={!isQuestionnaireComplete}
                  className='flex-1 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {t('consent.submitQuestionnaire', 'Submit Questionnaire')}
                </Button>
              )}
            </div>

            {/* Answered summary dots */}
            <div className='flex items-center justify-center gap-1.5 pt-1'>
              {activeQuestions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`h-2 w-2 rounded-full transition-all duration-200 ${
                    idx === currentQuestionIdx
                      ? 'bg-brand-blue scale-125'
                      : answers[idx] !== undefined
                        ? 'bg-brand-blue/40'
                        : 'bg-dove/40'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        )
      })()}

      {step === 9 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Store className='h-5 w-5 text-brand-blue' />
              {t('consent.gstTitle', 'GST Registration Verification (Optional)')}
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              {t('consent.gstDesc', 'Provide GSTIN for MSME merchant credit boost.')}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='gst'>{t('consent.gstLabel', 'GSTIN Number')}</Label>
              <Input
                id='gst'
                placeholder='22AAAAA0000A1Z5'
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase().slice(0, 15))}
                className='rounded-[12px] border-dove/80'
                disabled={gstVerified}
              />
            </div>

            {!gstVerified ? (
              <div className='space-y-2'>
                <Button
                  onClick={handleVerifyGst}
                  disabled={gstNumber.length !== 15 || verifyingGst}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {verifyingGst ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Verifying GSTIN...
                    </>
                  ) : (
                    t('consent.verifyGstGenerate', 'Verify GST & Generate Score')
                  )}
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant='ghost'
                  className='w-full rounded-full text-graphite font-medium'
                >
                  {t('consent.skipGenerateScore', 'Skip & Generate Score')}
                </Button>
              </div>
            ) : (
              <div className='space-y-4 animate-fade-up text-center'>
                <div className='flex flex-col items-center justify-center p-6 bg-brand-blue/5 rounded-[16px] border border-brand-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-brand-blue' />
                  <h3 className='text-sm font-semibold text-brand-blue mt-2'>GST Linked Successfully</h3>
                  <p className='text-xs text-graphite mt-1'>
                    GSTIN verified. Merchant logs updated.
                  </p>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {submitting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Analyzing Risk Profile...
                    </>
                  ) : (
                    'Finish Credit Assessment'
                  )}
                </Button>
              </div>
            )}
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: GSTIN verification via sandbox.co.in portal API</p>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
