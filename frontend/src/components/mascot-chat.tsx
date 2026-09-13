import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader2,
  Maximize2,
  Minimize2,
  PhoneCall,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { sendMascotMessage, fetchMascotStatus, requestOutboundCall, getCallResults } from '@/lib/api'
import { getDefaultPhone, maskPhoneNumber } from '@/lib/utils'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  modelUsed?: string
}

const CYCLING_BUBBLES = [
  { lang: 'en', label: 'English', text: 'Prefer an on-call banking service? Tap to chat or request an instant callback 👋' },
  { lang: 'hi', label: 'हिंदी', text: 'फोन पर बैंकिंग सेवा पसंद करते हैं? सीधे कॉल बैक या चैट के लिए टैप करें 👋' },
  { lang: 'gu', label: 'ગુજરાતી', text: 'ફોન પર બેંકિંગ સેવા જોઈએ છે? સીધા કૉલ બેક અથવા ચેટ માટે ટૅપ કરો 👋' },
  { lang: 'ta', label: 'தமிழ்', text: 'ஃபோன் கால் மூலம் வங்கி சேவை தேவையா? உடனே பேச அல்லது கால் பேக் பெற தட்டவும் 👋' },
]

interface MascotTranslations {
  cardTitle: string
  cardDesc: string
  cardBtn: string
  zeroBureau: string
  vernacularSubtitle: string
  requestCallHeaderBtn: string
  drawerTitle: string
  drawerDesc: string
  voiceOption: string
  officerOption: string
  phonePlaceholder: string
  callBtn: string
  scheduleBtn: string
  listenBtn: string
  stopBtn: string
  inputPlaceholder: string
  footerTagline: string
  clickToChat: string
  assistantArrow: string
  thinking: string
  welcomeGreeting: string
  callbackVoiceConfirm: (phone: string) => string
  callbackOfficerConfirm: (phone: string) => string
  errorConnect: string
}

const MASCOT_I18N: Record<'en' | 'hi' | 'gu' | 'ta', MascotTranslations> = {
  en: {
    cardTitle: 'Prefer an on-call banking service?',
    cardDesc: 'Speak directly with our AI Voice Officer in your language or request a field visit.',
    cardBtn: 'Request Call Back',
    zeroBureau: 'Zero Bureau Required',
    vernacularSubtitle: 'Vernacular Credit Intelligence',
    requestCallHeaderBtn: 'Request Call',
    drawerTitle: 'Request Spoken Assistance',
    drawerDesc: 'Direct phone connection in your language',
    voiceOption: 'AI Voice Officer (Immediate)',
    officerOption: 'Field Officer Visit',
    phonePlaceholder: 'Enter 10-digit mobile number',
    callBtn: 'Call Me Now',
    scheduleBtn: 'Schedule Visit',
    listenBtn: 'Listen',
    stopBtn: 'Stop',
    inputPlaceholder: 'Ask anything about alternative credit, loans or score...',
    footerTagline: 'Mitra Vernacular AI • Verified by AltGrade Engine',
    clickToChat: 'Click to chat',
    assistantArrow: 'Assistant →',
    thinking: 'Thinking in English...',
    welcomeGreeting:
      'Hello! I am Mitra, your credit & financial guide. AltGrade brings online banking for all—evaluating your everyday utility bills and UPI history to approve fair loans without a CIBIL score.\n\nPrefer an on-call banking service? You can request an immediate callback from our AI Voice Officer or ask any question right here!',
    callbackVoiceConfirm: (phone: string) =>
      `📞 On-Call Banking Callback requested for ${phone}. Arun (Personal Account Manager) is dialing your number to discuss loan options.`,
    callbackOfficerConfirm: (phone: string) =>
      `📋 Local Field Loan Officer visit requested for ${phone}. An assigned representative will contact you within 24–48 hours to assist with paperwork.`,
    errorConnect:
      'I am taking a moment to connect. AltGrade verifies your utility and UPI history to grant fair loans without traditional bureau requirements.',
  },
  gu: {
    cardTitle: 'શું તમે ફોન પર બેંકિંગ સેવા પસંદ કરો છો?',
    cardDesc: 'તમારી ભાષામાં અમારા એઆઈ વૉઇસ ઑફિસર સાથે સીધી વાત કરો અથવા ફિલ્ડ વિઝિટની વિનંતી કરો.',
    cardBtn: 'કૉલ બૅકની વિનંતી કરો',
    zeroBureau: 'કોઈ સિબિલ સ્કોર જરૂરી નથી',
    vernacularSubtitle: 'પ્રાદેશિક ક્રેડિટ બુદ્ધિમત્તા',
    requestCallHeaderBtn: 'કૉલ વિનંતી',
    drawerTitle: 'બોલીને સહાય મેળવો',
    drawerDesc: 'તમારી ભાષામાં સીધો ફોન સંપર્ક',
    voiceOption: 'એઆઈ વૉઇસ ઑફિસર (તરત)',
    officerOption: 'ફિલ્ડ ઑફિસર મુલાકાત',
    phonePlaceholder: '૧૦ અંકનો મોબાઈલ નંબર દાખલ કરો',
    callBtn: 'મને અત્યારે કૉલ કરો',
    scheduleBtn: 'મુલાકાત શેડ્યૂલ કરો',
    listenBtn: 'સાંભળો',
    stopBtn: 'બંધ કરો',
    inputPlaceholder: 'લોન અથવા વ્યાજ દર વિશે કંઈપણ પૂછો...',
    footerTagline: 'મિત્રા વેરનેક્યુલર AI • ઓલ્ટગ્રેડ એન્જિન દ્વારા ચકાસાયેલ',
    clickToChat: 'ચેટ કરવા માટે ટૅપ કરો',
    assistantArrow: 'સહાયક →',
    thinking: 'ગુજરાતીમાં વિચારી રહ્યા છીએ...',
    welcomeGreeting:
      'નમસ્તે! હું મિત્રા છું, તમારો ક્રેડિટ માર્ગદર્શક. ઑલ્ટગ્રેડ તમારા લાઈટ બિલ અને યુપીઆઈથી વગર સિબિલ સ્કોરે સરળ લોન અપાવે છે.\n\nશું તમે ફોન પર બેંકિંગ સેવા પસંદ કરો છો? તમે અમારા એઆઈ વૉઇસ ઑફિસર પાસેથી તરત કૉલ બૅકની વિનંતી કરી શકો છો!',
    callbackVoiceConfirm: (phone: string) =>
      `📞 ${phone} માટે ઓન-કૉલ બેંકિંગ કૉલબૅકની વિનંતી થઈ છે. અરુણ (પર્સનલ એકાઉન્ટ મેનેજર) ગુજરાતીમાં લોન વિકલ્પોની ચર્ચા કરવા માટે તમારા નંબર પર કૉલ કરી રહ્યા છે.`,
    callbackOfficerConfirm: (phone: string) =>
      `📋 ${phone} માટે સ્થાનિક ફિલ્ડ લોન ઓફિસર મુલાકાતની વિનંતી નોંધાઈ છે. અમારા પ્રતિનિધિ દસ્તાવેજો માટે 24–48 કલાકમાં તમારો સંપર્ક કરશે.`,
    errorConnect:
      'માફ કરશો, કનેક્શનમાં થોડો સમય લાગી રહ્યો છે. તમે તમારા નજીકના લોન અધિકારીનો સંપર્ક કરી શકો છો.',
  },
  hi: {
    cardTitle: 'क्या आप फोन पर बैंकिंग सेवा पसंद करते हैं?',
    cardDesc: 'अपनी भाषा में हमारे एआई वॉइस ऑफिसर से सीधे बात करें या फील्ड विजिट का अनुरोध करें।',
    cardBtn: 'कॉल बैक का अनुरोध करें',
    zeroBureau: 'बिना सिबिल स्कोर आवश्यक',
    vernacularSubtitle: 'क्षेत्रीय क्रेडिट इंटेलिजेंस',
    requestCallHeaderBtn: 'कॉल अनुरोध',
    drawerTitle: 'बोलकर सहायता का अनुरोध करें',
    drawerDesc: 'आपकी भाषा में सीधा फोन कनेक्शन',
    voiceOption: 'एआई वॉइस ऑफिसर (तत्काल)',
    officerOption: 'फील्ड ऑफिसर विजिट',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
    callBtn: 'मुझे अभी कॉल करें',
    scheduleBtn: 'विजिट शेड्यूल करें',
    listenBtn: 'सुनें',
    stopBtn: 'रोकें',
    inputPlaceholder: 'ऋण या ब्याज दर के बारे में कुछ भी पूछें...',
    footerTagline: 'मित्रा वर्नाक्युलर AI • ऑल्टग्रेड इंजन द्वारा सत्यापित',
    clickToChat: 'चैट करने के लिए टैप करें',
    assistantArrow: 'सहायक →',
    thinking: 'हिंदी में सोच रहे हैं...',
    welcomeGreeting:
      'नमस्ते! मैं मित्रा हूँ। ऑल्टग्रेड आपके बिजली बिल और यूपीआई से बिना सिबिल स्कोर के आसान लोन दिलाता है।\n\nक्या आप फोन पर बैंकिंग सेवा पसंद करते हैं? आप हमारे एआई वॉइस ऑफिसर से तुरंत कॉल बैक का अनुरोध कर सकते हैं!',
    callbackVoiceConfirm: (phone: string) =>
      `📞 ${phone} के लिए ऑन-कॉल बैंकिंग कॉलबैक का अनुरोध किया गया है। अरुण (पर्सनल अकाउंट मैनेजर) लोन विकल्पों पर चर्चा करने के लिए कॉल कर रहे हैं।`,
    callbackOfficerConfirm: (phone: string) =>
      `📋 ${phone} के लिए फील्ड लोन ऑफिसर विजिट का अनुरोध दर्ज किया गया है। 24–48 घंटों में संपर्क किया जाएगा।`,
    errorConnect:
      'क्षमा करें, कनेक्शन में कुछ समय लग रहा है। आप अपने नजदीकी लोन अधिकारी से संपर्क कर सकते हैं।',
  },
  ta: {
    cardTitle: 'ஃபோன் மூலம் வங்கி சேவையை விரும்புகிறீர்களா?',
    cardDesc: 'உங்கள் மொழியில் எங்கள் AI வாய்ஸ் ஆபிசருடன் நேரடியாகப் பேசுங்கள் அல்லது கள வருகையைக் கோருங்கள்.',
    cardBtn: 'கால் பேக் கோருங்கள்',
    zeroBureau: 'CIBIL தேவையில்லை',
    vernacularSubtitle: 'பிராந்திய கடன் நுண்ணறிவு',
    requestCallHeaderBtn: 'அழைப்பு கோரிக்கை',
    drawerTitle: 'பேசி உதவி பெற விண்ணப்பிக்கவும்',
    drawerDesc: 'உங்கள் மொழியில் நேரடி தொலைபேசி இணைப்பு',
    voiceOption: 'AI வாய்ஸ் ஆபிசர் (உடனடி)',
    officerOption: 'கள அதிகாரி வருகை',
    phonePlaceholder: '10 இலக்க மொபைல் எண்',
    callBtn: 'எனக்கு இப்போது அழைக்கவும்',
    scheduleBtn: 'வருகையைத் திட்டமிடுங்கள்',
    listenBtn: 'கேளுங்கள்',
    stopBtn: 'நிறுத்து',
    inputPlaceholder: 'கடன் அல்லது வட்டி பற்றி ஏதேனும் கேளுங்கள்...',
    footerTagline: 'மித்ரா வெர்னாகுலர் AI • ஆல்ட்கிரேட் என்ஜினால் சரிபார்க்கப்பட்டது',
    clickToChat: 'அரட்டை செய்ய தட்டவும்',
    assistantArrow: 'உதவியாளர் →',
    thinking: 'தமிழில் சிந்திக்கிறது...',
    welcomeGreeting:
      'வணக்கம்! நான் மித்ரா. மின் கட்டணம் மற்றும் UPI மூலம் CIBIL ஸ்கோர் இல்லாமலேயே நியாயமான கடன் பெறலாம்.\n\nஃபோன் கால் மூலம் வங்கி சேவையை விரும்புகிறீர்களா? எங்கள் AI வாய்ஸ் ஆபிசரிடமிருந்து உடனே கால் பேக் கோரலாம்!',
    callbackVoiceConfirm: (phone: string) =>
      `📞 ${phone} க்கான ஆன்-கால் பேங்கிங் கோரப்பட்டது. அருண் உங்கள் எண்ணை அழைக்கிறார்.`,
    callbackOfficerConfirm: (phone: string) =>
      `📋 ${phone} க்கான கள அதிகாரி வருகை பதிவு செய்யப்பட்டது.`,
    errorConnect:
      'மன்னிக்கவும், இணைப்பில் தாமதம் ஏற்படுகிறது. உங்கள் உள்ளூர் கடன் அதிகாரியைத் தொடர்பு கொள்ளலாம்.',
  },
}

export function MascotChat() {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [currentBubbleIdx, setCurrentBubbleIdx] = useState(0)
  const [selectedLang, setSelectedLang] = useState<'hi' | 'gu' | 'ta' | 'en'>(() => {
    const curr = i18n.language
    return (curr === 'hi' || curr === 'gu' || curr === 'ta' || curr === 'en') ? curr : 'en'
  })
  const t = MASCOT_I18N[selectedLang] || MASCOT_I18N.en
  const [showCallbackForm, setShowCallbackForm] = useState(false)
  const [callbackPhone, setCallbackPhone] = useState(() => getDefaultPhone())
  const [isPhoneMasked, setIsPhoneMasked] = useState(true)
  const [callbackType, setCallbackType] = useState<'voice' | 'officer'>('voice')
  const [isRequestingCall, setIsRequestingCall] = useState(false)
  const [, setActiveCallId] = useState<string | null>(null)
  const [callStageMsg, setCallStageMsg] = useState<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const curr = i18n.language
    const initialLang = (curr === 'hi' || curr === 'gu' || curr === 'ta' || curr === 'en') ? curr : 'en'
    const dict = MASCOT_I18N[initialLang as 'en' | 'hi' | 'gu' | 'ta'] || MASCOT_I18N.en
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: dict.welcomeGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'local-model',
      },
    ]
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isLocalModel, setIsLocalModel] = useState<boolean>(true)
  const [bubbleVisible, setBubbleVisible] = useState(true)
  const [isBubbleDismissed, setIsBubbleDismissed] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with global i18n language changes from navbar or elsewhere
  useEffect(() => {
    if (i18n.language && ['en', 'hi', 'gu', 'ta'].includes(i18n.language)) {
      setSelectedLang(i18n.language as any)
    }
  }, [i18n.language])

  // Cleanup polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  // Auto-cycle speech bubbles every 4 seconds when minimized
  useEffect(() => {
    if (isOpen) return

    const interval = setInterval(() => {
      setBubbleVisible(false)
      setTimeout(() => {
        setCurrentBubbleIdx((prev) => (prev + 1) % CYCLING_BUBBLES.length)
        setBubbleVisible(true)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Check model status on mount
  useEffect(() => {
    fetchMascotStatus()
      .then((res) => {
        setIsLocalModel(res.ollama_online || res.status === 'ready')
      })
      .catch(() => setIsLocalModel(true))
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Handle language switch (syncs globally with i18n!)
  const handleLanguageChange = (lang: 'hi' | 'gu' | 'ta' | 'en') => {
    setSelectedLang(lang)
    i18n.changeLanguage(lang) // Updates the entire application globally!

    const dict = MASCOT_I18N[lang] || MASCOT_I18N.en
    setMessages((prev) => [
      ...prev,
      {
        id: `lang-switch-${Date.now()}`,
        role: 'assistant',
        content: dict.welcomeGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'local-model',
      },
    ])
  }

  // Text-To-Speech reader
  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      window.speechSynthesis?.cancel()
      setSpeakingId(null)
      return
    }

    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)

    const langCodes: Record<string, string> = {
      hi: 'hi-IN',
      gu: 'gu-IN',
      ta: 'ta-IN',
      en: 'en-IN',
    }
    utterance.lang = langCodes[selectedLang] || 'en-US'
    utterance.rate = 0.95

    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)

    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  // Send message
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await sendMascotMessage({
        message: text,
        language: selectedLang,
        history,
      })

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.model_used,
      }

      setMessages((prev) => [...prev, botMsg])
      if (res.is_local !== undefined) {
        setIsLocalModel(res.is_local)
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          selectedLang === 'hi'
            ? 'क्षमा करें, कनेक्शन में कुछ समय लग रहा है। आप अपने नजदीकी लोन अधिकारी से संपर्क कर सकते हैं।'
            : selectedLang === 'gu'
            ? 'માફ કરશો, કનેક્શનમાં થોડો સમય લાગી રહ્યો છે. તમે તમારા નજીકના લોન અધિકારીનો સંપર્ક કરી શકો છો.'
            : selectedLang === 'ta'
            ? 'மன்னிக்கவும், இணைப்பில் தாமதம் ஏற்படுகிறது. உங்கள் உள்ளூர் கடன் அதிகாரியைத் தொடர்பு கொள்ளலாம்.'
            : 'I am taking a moment to connect. AltGrade verifies your utility and UPI history to grant fair loans without traditional bureau requirements.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'offline-agent',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // Poll call progress and automatically handoff to Loan Dashboard upon completion
  const startCallPolling = (userId: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    let lastStage = ''

    pollTimerRef.current = setInterval(async () => {
      try {
        const result = await getCallResults(userId)
        if (result.stage && result.stage !== lastStage) {
          lastStage = result.stage
          setCallStageMsg(result.message || null)

          if (result.stage === 'needs_discovery') {
            toast.info('Arun (Account Manager) connected: Discussing your banking needs...')
          } else if (result.stage === 'secure_verification') {
            toast.info('Secure Verification: Last 4 digits of Aadhaar & phone verified.')
          } else if (result.stage === 'credit_scoring') {
            toast.info('Credit Scoring: Calculating zero-CIBIL pre-approved limits...')
          }
        }

        if (result.completed) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setActiveCallId(null)
          setCallStageMsg(null)

          const offer = result.loan_offer || result.ai_suggestion
          const offerLine = offer
            ? `\n\n🎉 Pre-Approved Offer: ₹${offer.credit_limit?.toLocaleString('en-IN')} at ${offer.annual_interest_rate}% interest (Monthly EMI: ₹${offer.emi?.toLocaleString('en-IN')}).\n\n🚀 Transferring you directly to your Loan Dashboard...`
            : '\n\n🚀 Transferring you directly to your Loan Dashboard...'

          const completionMsg: ChatMessage = {
            id: `call-complete-${Date.now()}`,
            role: 'assistant',
            content: `✅ On-Call Banking & Credit Scoring Completed with Account Manager Arun!${offerLine}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: 'account-manager-arun',
          }
          setMessages((prev) => [...prev, completionMsg])
          toast.success('On-call credit scoring completed! Unlocking Loan Dashboard...')

          // Automatically navigate to the Loan Dashboard after call completion
          setTimeout(() => {
            window.location.href = '/_applicant/score'
          }, 2200)
        } else if (result.failed) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setActiveCallId(null)
          setCallStageMsg(null)
          toast.error(result.error_message || 'Call ended or could not be completed.')
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)
  }

  // Handle request a call back
  const handleRequestCallback = async () => {
    const phone = callbackPhone.trim() || getDefaultPhone()
    setIsRequestingCall(true)
    try {
      if (callbackType === 'voice') {
        const res = await requestOutboundCall('guest-user', phone, selectedLang, 'farmer', 'on_call_banking')
        if (res.status === 'error') {
          toast.error(res.message || 'Call request could not be dispatched.')
        } else {
          toast.success(res.message || 'AI On-Call Banking callback initiated!')
          setActiveCallId(res.call_id || 'guest-user')
          startCallPolling('guest-user')
        }
      } else {
        toast.success('Field Loan Officer callback request confirmed!')
      }

      const maskedPhone = maskPhoneNumber(phone)
      const confirmationMsg: ChatMessage = {
        id: `callback-${Date.now()}`,
        role: 'assistant',
        content:
          callbackType === 'voice'
            ? `📞 On-Call Banking Callback requested for ${maskedPhone}. Arun (Personal Account Manager) is dialing your number to discuss loan options in ${selectedLang.toUpperCase()}.`
            : `📋 Local Field Loan Officer visit requested for ${maskedPhone}. An assigned representative will contact you within 24–48 hours to assist with paperwork.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'account-manager-arun',
      }
      setMessages((prev) => [...prev, confirmationMsg])
      setShowCallbackForm(false)
    } catch {
      toast.error('Failed to dispatch call back. Please try again.')
    } finally {
      setIsRequestingCall(false)
    }
  }

  const currentBubble = CYCLING_BUBBLES[currentBubbleIdx]

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end'>
      {/* Floating Cycling Speech Bubble (when chat is closed) */}
      {!isOpen && !isBubbleDismissed && (
        <div
          onClick={() => {
            setSelectedLang(currentBubble.lang as any)
            setIsOpen(true)
          }}
          className={`relative mb-3 max-w-xs cursor-pointer rounded-xl border border-white/15 bg-black/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-200 hover:border-white/30 hover:scale-[1.02] ${
            bubbleVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 pointer-events-none'
          }`}
        >
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              setIsBubbleDismissed(true)
            }}
            className='absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-colors'
            title='Dismiss'
          >
            <X className='h-3 w-3' />
          </button>
          <div className='flex items-center gap-2 mb-1.5 pr-5'>
            <span className='flex h-1.5 w-1.5 rounded-full bg-white animate-pulse' />
            <span className='text-[10px] font-mono tracking-widest uppercase text-white/70'>
              MITRA AI • {currentBubble.label}
            </span>
          </div>
          <p className='text-xs font-normal text-white/90 leading-relaxed font-sans'>
            {currentBubble.text}
          </p>
          <div className='mt-2.5 flex items-center justify-between text-[10px] font-mono text-white/40 border-t border-white/5 pt-1.5'>
            <span>{t.clickToChat}</span>
            <span className='text-white/80 hover:text-white transition-colors'>{t.assistantArrow}</span>
          </div>
        </div>
      )}

      {/* Floating Mascot Button - Vercel Minimalist */}
      {!isOpen && (
        <button
          type='button'
          onClick={() => setIsOpen(true)}
          className='group relative flex h-14 w-14 items-center justify-center rounded-full bg-black border border-white/20 text-white shadow-2xl transition-all duration-200 hover:scale-105 hover:border-white active:scale-95'
          aria-label='Open AI Financial Guide'
        >
          {/* Subtle minimal hover halo */}
          <div className='absolute -inset-0.5 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 blur-sm transition duration-300' />

          {/* Minimal Geometric / Triangle Glyph (Vercel Style) */}
          <div className='relative flex h-full w-full items-center justify-center'>
            <svg
              viewBox='0 0 24 24'
              className='h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.75'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M12 2L2 19.5h20L12 2z' fill='white' fillOpacity='0.1' />
              <path d='M12 2L2 19.5h20L12 2z' />
              <circle cx='12' cy='13' r='1.5' fill='white' />
            </svg>
          </div>

          {/* Minimal status pip */}
          <span className='absolute top-0 right-0 flex h-3 w-3'>
            <span className='relative inline-flex h-2.5 w-2.5 rounded-full border border-black bg-white' />
          </span>
        </button>
      )}

      {/* Modern AI Chat Window - Vercel Dark Minimalist */}
      {isOpen && (
        <div
          className={`flex flex-col rounded-3xl border border-white/15 bg-[#0a0a0c]/95 shadow-[0_24px_70px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'h-[86vh] max-h-[760px] w-[94vw] sm:w-[720px] md:w-[800px]'
              : 'h-[580px] w-[380px] sm:w-[420px]'
          }`}
        >
          {/* Unified Sleek Header */}
          <div className='border-b border-white/10 bg-white/[0.02]'>
            {/* Top Bar: Identity & Actions */}
            <div className='flex items-center justify-between px-4 py-3 sm:px-5'>
              <div className='flex items-center gap-3'>
                <div className='relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/15 text-white shadow-sm'>
                  <Bot className='h-4 w-4' />
                  <span className='absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0c] bg-white' />
                </div>
                <div>
                  <div className='flex items-center gap-2'>
                    <h3 className='text-sm font-semibold tracking-tight text-white font-sans'>Mitra</h3>
                    <Badge
                      variant='outline'
                      className='text-[9px] px-1.5 py-0 font-mono bg-white/5 text-white/70 border-white/15 uppercase tracking-wider'
                    >
                      {isLocalModel ? 'Local AI' : 'Edge AI'}
                    </Badge>
                  </div>
                  <p className='text-[11px] text-white/45 font-mono'>{t.vernacularSubtitle}</p>
                </div>
              </div>

              <div className='flex items-center gap-1.5'>
                {/* Voice Call Assistance Button */}
                <button
                  type='button'
                  onClick={() => setShowCallbackForm(!showCallbackForm)}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono transition-all ${
                    showCallbackForm
                      ? 'bg-white text-black font-semibold'
                      : 'border border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                  title='Request Voice Callback'
                >
                  <PhoneCall className='h-3 w-3' />
                  <span className='hidden xs:inline'>{t.requestCallHeaderBtn}</span>
                </button>

                {/* Window Controls */}
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10'
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Contract window' : 'Expand layout'}
                  aria-label={isExpanded ? 'Contract window' : 'Expand layout'}
                >
                  {isExpanded ? <Minimize2 className='h-3.5 w-3.5' /> : <Maximize2 className='h-3.5 w-3.5' />}
                </Button>

                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10'
                  onClick={() => {
                    window.speechSynthesis?.cancel()
                    setIsOpen(false)
                  }}
                  aria-label='Close assistant'
                >
                  <X className='h-4 w-4' />
                </Button>
              </div>
            </div>

            {/* Bottom Sub-bar: Language Segmented Control & Status */}
            <div className='flex items-center justify-between px-4 pb-2.5 sm:px-5'>
              <div className='flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5'>
                {(
                  [
                    { code: 'en', label: 'English' },
                    { code: 'hi', label: 'हिंदी' },
                    { code: 'gu', label: 'ગુજરાતી' },
                    { code: 'ta', label: 'தமிழ்' },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.code}
                    type='button'
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-mono transition-all ${
                      selectedLang === lang.code
                        ? 'bg-white text-black font-semibold shadow-sm'
                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <div className='hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-white/40'>
                <span className='h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse' />
                <span>{t.zeroBureau}</span>
              </div>
            </div>
          </div>

          {/* Slide-Down Callback Request Drawer */}
          {showCallbackForm && (
            <div className='border-b border-white/15 bg-black/95 p-4 sm:p-5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <div className='flex h-7 w-7 items-center justify-center rounded-md bg-white text-black'>
                    <PhoneCall className='h-3.5 w-3.5' />
                  </div>
                  <div>
                    <h4 className='text-xs font-semibold text-white font-sans'>{t.drawerTitle}</h4>
                    <p className='text-[10px] text-white/50 font-mono'>{t.drawerDesc}</p>
                  </div>
                </div>
                <button
                  type='button'
                  onClick={() => setShowCallbackForm(false)}
                  className='text-white/40 hover:text-white transition-colors p-1'
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              </div>

              <div className='flex rounded-lg border border-white/10 bg-white/[0.02] p-1 gap-1 text-[11px] font-mono'>
                <button
                  type='button'
                  onClick={() => setCallbackType('voice')}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
                    callbackType === 'voice'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t.voiceOption}
                </button>
                <button
                  type='button'
                  onClick={() => setCallbackType('officer')}
                  className={`flex-1 py-1.5 px-2 rounded-md transition-all text-center ${
                    callbackType === 'officer'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t.officerOption}
                </button>
              </div>

              <div className='flex gap-2 pt-1'>
                <div className='relative flex-1'>
                  <span className='absolute left-3 top-2.5 text-xs font-mono text-white/40'>+91</span>
                  <Input
                    type={isPhoneMasked ? 'password' : 'tel'}
                    value={isPhoneMasked ? maskPhoneNumber(callbackPhone).replace('+91 ', '') : callbackPhone}
                    onChange={(e) => {
                      setIsPhoneMasked(false)
                      setCallbackPhone(e.target.value)
                    }}
                    onFocus={() => {
                      if (isPhoneMasked) {
                        setIsPhoneMasked(false)
                      }
                    }}
                    placeholder={t.phonePlaceholder}
                    className='h-9 pl-11 pr-9 text-xs font-mono bg-white/[0.04] border-white/15 text-white placeholder:text-white/30 rounded-xl focus-visible:ring-1 focus-visible:ring-white'
                  />
                  <button
                    type='button'
                    onClick={() => setIsPhoneMasked(!isPhoneMasked)}
                    className='absolute right-2.5 top-2.5 text-white/40 hover:text-white transition-colors'
                    title={isPhoneMasked ? 'Show unmasked phone number' : 'Mask phone number'}
                  >
                    {isPhoneMasked ? <EyeOff className='h-3.5 w-3.5' /> : <Eye className='h-3.5 w-3.5' />}
                  </button>
                </div>
                <Button
                  type='button'
                  size='sm'
                  disabled={isRequestingCall}
                  onClick={handleRequestCallback}
                  className='h-9 px-4 text-xs font-mono font-semibold bg-white text-black hover:bg-white/90 rounded-xl shrink-0'
                >
                  {isRequestingCall ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin text-black' />
                  ) : (
                    callbackType === 'voice' ? t.callBtn : t.scheduleBtn
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Active Call In-Progress Banner */}
          {callStageMsg && (
            <div className='mx-4 mt-3 flex items-center gap-2.5 rounded-xl border border-white/20 bg-black px-3.5 py-2.5 text-xs font-mono text-white animate-pulse'>
              <PhoneCall className='h-4 w-4 shrink-0 text-white animate-bounce' />
              <div className='flex-1 truncate'>
                <span className='font-semibold text-white'>Account Manager Call:</span> {callStageMsg}
              </div>
            </div>
          )}

          {/* Centered Conversation Thread (Solves the empty black void in expanded mode) */}
          <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4 font-sans'>
            <div className='max-w-2xl mx-auto w-full space-y-4'>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/15 text-white mt-1 shadow-sm'>
                      <Bot className='h-3.5 w-3.5' />
                    </div>
                  )}

                  <div className={`space-y-1.5 ${msg.role === 'user' ? 'max-w-[80%]' : 'max-w-[88%] sm:max-w-[82%]'}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs sm:text-[13px] leading-relaxed transition-all ${
                        msg.role === 'user'
                          ? 'bg-white text-zinc-950 font-medium rounded-tr-sm shadow-sm'
                          : 'bg-white/[0.04] border border-white/[0.09] text-zinc-100 rounded-tl-sm backdrop-blur-sm'
                      }`}
                    >
                      <p className='whitespace-pre-wrap'>{msg.content}</p>

                      {/* Interactive On-Call Banking Callout Card */}
                      {(msg.id === 'welcome' ||
                        msg.id.startsWith('lang-switch-') ||
                        msg.content.toLowerCase().includes('on-call banking') ||
                        msg.content.toLowerCase().includes('call back') ||
                        msg.content.includes('કૉલ બૅક') ||
                        msg.content.includes('કૉલ બેક') ||
                        msg.content.includes('બેંકિંગ સેવા') ||
                        msg.content.includes('કૉલબેક') ||
                        msg.content.includes('कॉल बैक') ||
                        msg.content.includes('கால் பேக்')) && (
                        <div className='mt-3.5 space-y-2.5 pt-3 border-t border-white/[0.08]'>
                          <div className='rounded-xl border border-white/15 bg-white/[0.04] p-3 transition-all hover:border-white/25'>
                            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5'>
                              <div className='space-y-0.5'>
                                <div className='flex items-center gap-1.5 text-xs font-semibold text-white'>
                                  <PhoneCall className='h-3.5 w-3.5 text-white' />
                                  <span>{t.cardTitle}</span>
                                </div>
                                <p className='text-[11px] text-white/60 font-mono leading-relaxed'>
                                  {t.cardDesc}
                                </p>
                              </div>
                              <button
                                type='button'
                                onClick={() => setShowCallbackForm(true)}
                                className='shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-mono font-semibold text-black hover:bg-white/90 transition-all active:scale-95 shadow-sm flex items-center gap-1.5'
                              >
                                <PhoneCall className='h-3 w-3' />
                                <span>{t.cardBtn}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions Footer */}
                    <div
                      className={`flex items-center gap-2 text-[10px] font-mono text-white/40 px-1 ${
                        msg.role === 'user' ? 'justify-end' : 'justify-between'
                      }`}
                    >
                      <span>{msg.timestamp}</span>

                      {msg.role === 'assistant' && (
                        <div className='flex items-center gap-2'>
                          {msg.modelUsed && (
                            <span className='text-[9px] text-white/30 font-mono hidden xs:inline'>
                              {msg.modelUsed === 'local-model' ? 'Ollama' : msg.modelUsed}
                            </span>
                          )}
                          <button
                            type='button'
                            onClick={() => handleSpeak(msg.id, msg.content)}
                            className='flex items-center gap-1 rounded-md px-1.5 py-0.5 text-white/60 hover:text-white hover:bg-white/10 transition-colors'
                            title='Listen to this response'
                          >
                            {speakingId === msg.id ? (
                              <>
                                <VolumeX className='h-3 w-3 text-white animate-pulse' />
                                <span className='text-white'>{t.stopBtn}</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className='h-3 w-3' />
                                <span>{t.listenBtn}</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black font-semibold mt-1 shadow-sm'>
                      <User className='h-3.5 w-3.5' />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className='flex items-center gap-2.5 text-white/60 text-xs pl-2 font-mono py-2'>
                  <div className='flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-white'>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  </div>
                  <span>{t.thinking}</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Unified Composer Bar */}
          <div className='border-t border-white/10 bg-[#0a0a0c]/90 px-4 py-3 sm:px-6 sm:py-3.5 backdrop-blur-md'>
            <div className='max-w-2xl mx-auto w-full'>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className='relative flex items-center rounded-2xl border border-white/15 bg-white/[0.03] transition-all focus-within:border-white/40 focus-within:bg-white/[0.05] focus-within:ring-1 focus-within:ring-white/20 shadow-inner px-3 py-1'
              >
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t.inputPlaceholder}
                  className='h-10 text-xs sm:text-[13px] bg-transparent border-0 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:outline-none shadow-none py-1.5'
                  disabled={isLoading}
                />
                <Button
                  type='submit'
                  size='icon'
                  className='h-8 w-8 shrink-0 rounded-xl bg-white text-black hover:bg-white/90 disabled:opacity-30 disabled:hover:bg-white transition-all active:scale-95 shadow-sm'
                  disabled={!inputValue.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <Send className='h-3.5 w-3.5' />
                  )}
                </Button>
              </form>

              <p className='mt-2 text-center text-[10px] font-mono text-white/30 tracking-wide'>
                {t.footerTagline}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

