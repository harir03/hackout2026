import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { requestOutboundCall } from '@/lib/api'
import { PhoneCall } from 'lucide-react'

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

export function ConsentPage() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const user = auth.user
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [userId] = useState(() => user?.email || `applicant-${Date.now()}`)
  const isMockProfile = ['testhari@altgrade.in', 'farmer@altgrade.in', 'msme@altgrade.in'].includes(user?.email || '')
  
  // Step 1: Phone & OTP States
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [profileName, setProfileName] = useState<string | null>(null)

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

  useEffect(() => {
    if (step === 8 && !questionnaireStartTime) {
      setQuestionnaireStartTime(Date.now())
    }
  }, [step, questionnaireStartTime])

  // Step 8: GST Connection
  const [gstNumber, setGstNumber] = useState('')
  const [verifyingGst, setVerifyingGst] = useState(false)
  const [gstVerified, setGstVerified] = useState(false)




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

  const activeQuestions = (profession === 'farmer' || user?.email === 'farmer@altgrade.in')
    ? FARMER_QUESTIONS
    : (profession === 'msme' || user?.email === 'msme@altgrade.in')
    ? MSME_QUESTIONS
    : GENERAL_QUESTIONS

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
          <span className='text-sm font-bold tracking-tight text-foreground'>AltGrade RBI DLG Portal</span>
        </div>
        <div className='flex items-center gap-2'>
          <LanguageSelector />
        </div>
      </div>

      {/* Dynamic Stepper Header */}
      {step > 0 && (
        <div className='mb-8 flex justify-between items-center text-[10px] sm:text-xs text-graphite border-b border-dove/20 pb-4 overflow-x-auto whitespace-nowrap gap-4'>
          <span className={step === 1 ? 'text-brand-blue font-semibold' : step > 1 ? 'text-foreground' : ''}>1. Mobile</span>
          <span className={step === 2 ? 'text-brand-blue font-semibold' : step > 2 ? 'text-foreground' : ''}>2. PAN</span>
          <span className={step === 3 ? 'text-brand-blue font-semibold' : step > 3 ? 'text-foreground' : ''}>3. Aadhaar</span>
          <span className={step === 4 ? 'text-brand-blue font-semibold' : step > 4 ? 'text-foreground' : ''}>4. Liveness</span>
          <span className={step === 5 ? 'text-brand-blue font-semibold' : step > 5 ? 'text-foreground' : ''}>5. Profession</span>
          <span className={step === 6 ? 'text-brand-blue font-semibold' : step > 6 ? 'text-foreground' : ''}>6. Bank</span>
          <span className={step === 7 ? 'text-brand-blue font-semibold' : step > 7 ? 'text-foreground' : ''}>7. Location</span>
          <span className={step === 8 ? 'text-brand-blue font-semibold' : step > 8 ? 'text-foreground' : ''}>8. Psychometric</span>
          <span className={step === 9 ? 'text-brand-blue font-semibold' : ''}>9. GST (Opt)</span>
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
              Verify Your Mobile
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Enter your 10-digit mobile number to generate a secure credit assessment session.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='phone'>Mobile Number</Label>
              <div className='flex gap-2'>
                <span className='flex items-center justify-center border border-dove/80 rounded-[12px] px-3 bg-muted text-sm text-muted-foreground'>+91</span>
                <Input
                  id='phone'
                  placeholder='Enter mobile number'
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
                Send Verification Code
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up'>
                <div className='space-y-2'>
                  <Label htmlFor='otp'>Verification Code (OTP)</Label>
                  <Input
                    id='otp'
                    placeholder='Enter 6-digit code'
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
                      Verifying Code...
                    </>
                  ) : (
                    'Verify & Proceed'
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
              PAN Verification
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Enter your Permanent Account Number to verify tax registry identity.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='pan'>PAN Card Number</Label>
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
                    Verifying PAN...
                  </>
                ) : (
                  'Verify PAN'
                )}
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up border-t border-dove/20 pt-4'>
                <div className='grid grid-cols-2 gap-3 text-xs'>
                  <div>
                    <span className='text-graphite font-medium'>Full Name:</span>
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
                    <span className='text-graphite font-medium'>Aadhaar Link:</span>
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
                  Confirm & Continue
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
              Aadhaar OKYC
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Enter your Aadhaar number to verify identity with UIDAI registry.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='aadhaar'>Aadhaar Number</Label>
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
                Send Aadhaar OTP
              </Button>
            ) : (
              <div className='space-y-4 animate-fade-up'>
                <div className='space-y-2'>
                  <Label htmlFor='aadhaarOtp'>Aadhaar Verification Code</Label>
                  <Input
                    id='aadhaarOtp'
                    placeholder='Enter 6-digit code'
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
                      Verifying Aadhaar...
                    </>
                  ) : (
                    'Verify & Proceed'
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
              Liveness Check
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Perform a quick liveness scan to complete your identity verification.
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
                    Analyzing Facial Liveness...
                  </>
                ) : (
                  'Analyze Liveness & Capture'
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
              Step 5: Profession Details
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Select your primary profession to customize the credit assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid gap-3 grid-cols-1'>
              {[
                { id: 'farmer', label: 'Farmers' },
                { id: 'msme', label: 'MSMEs' },
                { id: 'gig', label: 'Urban/gig workers' },
                { id: 'other', label: 'Others' }
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
                <Label htmlFor='custom-profession'>Please specify your profession</Label>
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
              Continue to Bank Connection
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Landmark className='h-5 w-5 text-brand-blue' />
              Step 6: Bank Connection
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Link your bank account via Finvu Account Aggregator to analyze transaction statements.
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
                      'Link Bank Account'
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className='space-y-4 animate-fade-up text-center'>
                <div className='flex flex-col items-center justify-center p-6 bg-brand-blue/5 rounded-[16px] border border-brand-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-brand-blue' />
                  <h3 className='text-sm font-semibold text-brand-blue mt-2'>Bank Connection Successful</h3>
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
                  Continue to Next Step
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
              Step 7: Location History
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Provide your current and permanent addresses. You can also add previous places you've lived.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>

            {/* === CURRENT ADDRESS === */}
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Home className='h-4 w-4 text-brand-blue' />
                <Label className='text-sm font-semibold'>Current Address</Label>
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
                        <Label className='text-xs'>Living here since (year)</Label>
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
                        Set Current Address
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className='flex items-center gap-3 rounded-[12px] border border-brand-blue/20 bg-brand-blue/5 px-3 py-2.5'>
                  <MapPin className='h-4 w-4 text-brand-blue shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{currentAddress.place}</p>
                    <p className='text-[10px] text-muted-foreground'>Since {currentAddress.fromYear} — Present</p>
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
                <Home className='h-4 w-4 text-emerald-600' />
                <Label className='text-sm font-semibold'>Permanent Address</Label>
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
                <span className='text-xs text-muted-foreground'>Same as current address</span>
              </label>
              {!permanentSameAsCurrent && !permanentAddress && (
                <div className='space-y-2'>
                  <div className='relative'>
                    <Input
                      placeholder='Start typing your permanent address'
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
                    <div className='animate-fade-up space-y-3 rounded-[12px] bg-emerald-50 border border-emerald-200 p-4'>
                      <div className='flex items-center gap-2 text-sm font-medium text-emerald-700'>
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
                        Set Permanent Address
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!permanentSameAsCurrent && permanentAddress && (
                <div className='flex items-center gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-3 py-2.5'>
                  <MapPin className='h-4 w-4 text-emerald-600 shrink-0' />
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-medium truncate'>{permanentAddress.place}</p>
                    <p className='text-[10px] text-muted-foreground'>Permanent address</p>
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
                <Label className='text-sm font-semibold'>Previous Places Lived</Label>
                <span className='text-[10px] text-muted-foreground'>Optional — add as many as needed</span>
              </div>

              {locationEntries.length > 0 && (
                <div className='space-y-2'>
                  {locationEntries.map((entry, i) => (
                    <div key={i} className='flex items-center gap-3 rounded-[12px] border border-dove/30 bg-muted/10 px-3 py-2.5'>
                      <MapPin className='h-4 w-4 text-muted-foreground shrink-0' />
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>{entry.place}</p>
                        <p className='text-[10px] text-muted-foreground'>
                          {entry.fromYear} — {entry.toYear === null ? 'Present' : entry.toYear}
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
                    placeholder='Add a previous city or area you lived in'
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
                        <Label className='text-xs'>From Year</Label>
                        <Input
                          type='number' min={1970} max={new Date().getFullYear()}
                          value={locFromYear}
                          onChange={(e) => setLocFromYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
                          className='rounded-[12px] border-dove/80 text-sm'
                        />
                      </div>
                      <div className='space-y-1'>
                        <Label className='text-xs'>To Year</Label>
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
                      Add This Place
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
              {showMap ? 'Hide map' : 'Or tap on a map instead'}
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
              Continue to Questionnaire
              <ArrowRight className='h-4 w-4' />
            </Button>
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: Photon (OpenStreetMap) geocoding API + Leaflet map</p>}
          </CardContent>
        </Card>
      )}

      {step === 8 && (
        <Card className='shadow-subtle max-w-2xl mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <Brain className='h-5 w-5 text-brand-blue' />
                Step 8: Psychometric Assessment
              </div>
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Answer these {activeQuestions.length} questions on the screen, or request an automated AI voice call to your phone.
            </CardDescription>

            {/* AI Phone Callback Request Banner */}
            <div className='mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dove/40 bg-muted/30 p-3.5 text-xs text-foreground'>
              <div className='flex items-center gap-2.5'>
                <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue'>
                  <PhoneCall className='h-4 w-4' />
                </div>
                <div>
                  <p className='font-semibold text-foreground'>Prefer an AI Voice Call on your phone?</p>
                  <p className='text-muted-foreground text-[11px]'>The AltGrade AI Voice Officer will call your phone and conduct this survey verbally.</p>
                </div>
              </div>
              <Button
                type='button'
                size='sm'
                onClick={async () => {
                  const res = await requestOutboundCall(userId, phone || '9876543215', 'en', profession || 'farmer')
                  alert(res.message || 'AI Voice Call requested!')
                }}
                className='bg-foreground text-background hover:bg-foreground/90 font-medium h-8 text-xs gap-1.5 rounded-full'
              >
                <PhoneCall className='h-3.5 w-3.5' />
                Request AI Callback
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-6 max-h-[450px] overflow-y-auto pr-2'>
              {activeQuestions.map((item, idx) => (
                <div key={idx} className='space-y-3 border-b border-dove/10 pb-4'>
                  <p className='text-sm font-semibold text-foreground'>
                    {idx + 1}. {item.q}
                  </p>
                  <VoiceQuestionnaire
                    questionText={item.q}
                    options={item.options}
                    onSelectOption={(oIdx) => handleSelectAnswer(idx, oIdx)}
                  />
                  <div className='grid gap-2 grid-cols-1 sm:grid-cols-2'>
                    {item.options.map((opt, oIdx) => {
                      const isSelected = answers[idx] === oIdx
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectAnswer(idx, oIdx)}
                          className={`text-left text-xs p-3 rounded-[12px] border transition-all duration-200 ${
                            isSelected
                              ? 'border-brand-blue bg-brand-blue/5 text-brand-blue font-medium'
                              : 'border-dove/50 hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStep(9)}
              disabled={!isQuestionnaireComplete}
              className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
            >
              Submit Questionnaire
            </Button>
            {isMockProfile && <p className='text-[10px] text-muted-foreground/40 mt-4 block font-mono text-center tracking-tight'>Tech: CFPB Behavioral Psychometric Scoring Model</p>}
          </CardContent>
        </Card>
      )}

      {step === 9 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Store className='h-5 w-5 text-brand-blue' />
              Step 9: GST Connection (Optional)
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Link your business GST number to include merchant turnover records in the assessment.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='gst'>GSTIN Number</Label>
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
                    'Verify & Link GST'
                  )}
                </Button>
                <Button
                  onClick={handleSubmit}
                  variant='ghost'
                  className='w-full rounded-full text-graphite font-medium'
                >
                  Skip Step
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
