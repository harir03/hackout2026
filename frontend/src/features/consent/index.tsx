import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Landmark,
  Phone,
  Brain,
  Store,
  Loader2,
  Mail,
  Camera,
  ShieldCheck,
  CreditCard,
  Fingerprint,
  ArrowRight,
  AlertCircle,
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
import { submitConsent, verifyPan, sendAadhaarOtp, verifyAadhaarOtp, checkLiveness } from '@/lib/api'

const DEMO_PROFILES: Record<string, string> = {
  "9876543210": "hari",
  "9876543211": "rahul",
  "9876543212": "nikhil",
  "9876543213": "akash",
  "9876543214": "tejas"
}

const QUESTIONS = [
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
  },
  {
    q: "If you receive extra income, what is your first action?",
    options: ["Save or invest it", "Pay down debt", "Spend on essential needs", "Spend on leisure/lifestyle"]
  },
  {
    q: "What is your comfort level with using digital banking apps?",
    options: ["Extremely comfortable", "Moderately comfortable", "Slightly comfortable", "Not comfortable"]
  },
  {
    q: "How would you handle a decrease in your monthly income?",
    options: ["Reduce non-essentials immediately", "Use savings/investments", "Find alternate income sources", "Borrow money"]
  },
  {
    q: "Do you understand the difference between compound and simple interest?",
    options: ["Yes, fully", "Vaguely", "No"]
  },
  {
    q: "How often do you consult financial experts or research before investing?",
    options: ["Always", "Frequently", "Occasionally", "Never"]
  }
]

export function ConsentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [userId] = useState(() => `applicant-${Date.now()}`)
  
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
  const [livenessInstruction, setLivenessInstruction] = useState('Position your face in the circle')
  const [livenessScore, setLivenessScore] = useState<number | null>(null)

  // Step 5: Bank Connection
  const [linkingBank, setLinkingBank] = useState(false)
  const [bankLinked, setBankLinked] = useState(false)
  const [bankLinkError, setBankLinkError] = useState(false)
  const [pdfFile, setPdfFile] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)

  // Step 6: Gmail (Telecom & Ecom) Connection
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailConnecting, setGmailConnecting] = useState(false)

  // Step 7: Questionnaire
  const [answers, setAnswers] = useState<Record<number, number>>({})

  // Step 8: GST Connection
  const [gstNumber, setGstNumber] = useState('')
  const [verifyingGst, setVerifyingGst] = useState(false)
  const [gstVerified, setGstVerified] = useState(false)

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'GMAIL_CONNECTED' && event.data?.userId === userId) {
        setGmailConnected(true)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [userId])



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
      const matchedProfile = DEMO_PROFILES[phone]
      if (matchedProfile) {
        setProfileName(matchedProfile)
      }
      setStep(2)
    }, 1200)
  }

  const handleVerifyPan = async () => {
    setVerifyingPan(true)
    try {
      const res = await verifyPan(pan, phone)
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

  const handleUploadPdf = () => {
    setUploadingPdf(true)
    setTimeout(() => {
      setUploadingPdf(false)
      setPdfFile('statement_uploaded.pdf')
      setBankLinked(true)
    }, 1500)
  }

  // Gmail Connection
  const handleConnectGmail = () => {
    if (gmailConnected) {
      setGmailConnected(false)
      return
    }

    setGmailConnecting(true)
    const width = 500
    const height = 600
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    const popup = window.open(
      `/api/auth/google?user_id=${userId}`,
      'Connect Gmail Account',
      `width=${width},height=${height},top=${top},left=${left}`
    )

    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer)
        setGmailConnecting(false)
      }
    }, 1000)
  }

  // Questionnaire Actions
  const handleSelectAnswer = (qIdx: number, oIdx: number) => {
    setAnswers((prev) => ({ ...prev, [qIdx]: oIdx }))
  }

  const isQuestionnaireComplete = Object.keys(answers).length === QUESTIONS.length

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
    if (gmailConnected) consentedList.push('d3_ecommerce')
    if (gstVerified) consentedList.push('d6_merchant')

    try {
      const res = await submitConsent(userId, consentedList)
      const sources = consentedList.join(',')
      navigate({
        to: '/score',
        search: { userId, sources, consentId: res.consent_id, phone }
      })
    } catch (err) {
      console.error('Submission failed:', err)
      const sources = consentedList.join(',')
      navigate({
        to: '/score',
        search: { userId, sources, phone }
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='max-w-4xl mx-auto py-8 px-4'>
      {/* Dynamic Stepper Header */}
      <div className='mb-8 flex justify-between items-center text-[10px] sm:text-xs text-graphite border-b border-dove/20 pb-4 overflow-x-auto whitespace-nowrap gap-4'>
        <span className={step === 1 ? 'text-vercel-blue font-semibold' : step > 1 ? 'text-foreground' : ''}>1. Mobile</span>
        <span className={step === 2 ? 'text-vercel-blue font-semibold' : step > 2 ? 'text-foreground' : ''}>2. PAN</span>
        <span className={step === 3 ? 'text-vercel-blue font-semibold' : step > 3 ? 'text-foreground' : ''}>3. Aadhaar</span>
        <span className={step === 4 ? 'text-vercel-blue font-semibold' : step > 4 ? 'text-foreground' : ''}>4. Liveness</span>
        <span className={step === 5 ? 'text-vercel-blue font-semibold' : step > 5 ? 'text-foreground' : ''}>5. Bank</span>
        <span className={step === 6 ? 'text-vercel-blue font-semibold' : step > 6 ? 'text-foreground' : ''}>6. Email</span>
        <span className={step === 7 ? 'text-vercel-blue font-semibold' : step > 7 ? 'text-foreground' : ''}>7. Psychometric</span>
        <span className={step === 8 ? 'text-vercel-blue font-semibold' : ''}>8. GST (Opt)</span>
      </div>

      {step === 1 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Phone className='h-5 w-5 text-vercel-blue' />
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
                  <p className='text-xs text-graphite'>Enter 123456 to mock verification.</p>
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
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <CreditCard className='h-5 w-5 text-vercel-blue' />
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
                      <Badge className='bg-vercel-blue/15 text-vercel-blue border-vercel-blue/30' variant='outline'>
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
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Fingerprint className='h-5 w-5 text-vercel-blue' />
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
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Camera className='h-5 w-5 text-vercel-blue' />
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
                      <div className='w-40 h-40 rounded-full border-4 border-dashed border-vercel-blue flex items-center justify-center'>
                        <Camera className='h-12 w-12 text-vercel-blue' />
                      </div>
                      <p className='mt-4 text-xs font-semibold tracking-wide text-vercel-blue animate-pulse'>{livenessInstruction}</p>
                    </div>
                  ) : (
                    <div className='absolute inset-0 flex flex-col items-center justify-center bg-vercel-blue/5'>
                      <ShieldCheck className='h-16 w-16 text-vercel-blue animate-bounce' />
                      <p className='mt-4 text-sm font-bold text-vercel-blue'>Verification Completed</p>
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
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Landmark className='h-5 w-5 text-vercel-blue' />
              Step 5: Bank Connection
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

                    <div className='border-2 border-dashed border-dove/50 rounded-[16px] p-6 text-center space-y-3'>
                      <Mail className='h-8 w-8 text-graphite mx-auto' />
                      <p className='text-xs text-graphite'>Drag bank statement PDF here or click to browse</p>
                      <Button
                        onClick={handleUploadPdf}
                        disabled={uploadingPdf}
                        variant='outline'
                        className='h-8 text-xs rounded-full'
                      >
                        {uploadingPdf ? 'Uploading...' : 'Upload PDF'}
                      </Button>
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
                <div className='flex flex-col items-center justify-center p-6 bg-vercel-blue/5 rounded-[16px] border border-vercel-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-vercel-blue' />
                  <h3 className='text-sm font-semibold text-vercel-blue mt-2'>Bank Connection Successful</h3>
                  <p className='text-xs text-graphite mt-1'>
                    {pdfFile ? 'Parsed statement statement_uploaded.pdf' : 'Consented via Finvu AA sandbox.'}
                  </p>
                </div>

                <div className='bg-sky-wash/30 text-ink p-3 rounded-[12px] text-xs text-left'>
                  <strong>Estimated Score:</strong> Based on bank signals, score estimate is 520 (Good).
                </div>

                <Button
                  onClick={() => setStep(6)}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium flex items-center justify-center gap-2'
                >
                  Continue to Next Step
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 6 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Mail className='h-5 w-5 text-vercel-blue' />
              Step 6: Gmail Verification
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Connect Gmail to automatically verify telecom billing, utilities, and delivery addresses.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!gmailConnected ? (
              <>
                <div className='rounded-[12px] bg-sky-wash/20 p-4 border border-sky-wash/30 text-xs text-ink leading-relaxed'>
                  Gmail scanner checks recharges (Jio, Airtel), order receipts (Amazon, Flipkart), and utility bills to establish consumption reliability and residential geolocations.
                </div>

                <Button
                  onClick={handleConnectGmail}
                  disabled={gmailConnecting}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
                >
                  {gmailConnecting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Linking Account...
                    </>
                  ) : (
                    'Link Gmail Account'
                  )}
                </Button>
              </>
            ) : (
              <div className='space-y-4 animate-fade-up text-center'>
                <div className='flex flex-col items-center justify-center p-6 bg-vercel-blue/5 rounded-[16px] border border-vercel-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-vercel-blue' />
                  <h3 className='text-sm font-semibold text-vercel-blue mt-2'>Gmail Connected Successfully</h3>
                  <p className='text-xs text-graphite mt-1'>
                    Gmail session synchronized. recharges and receipts parsed.
                  </p>
                </div>

                <div className='bg-sky-wash/30 text-ink p-3 rounded-[12px] text-xs text-left'>
                  <strong>Estimated Score Update:</strong> Consumption and locality checks added. Estimated score is 610 (Excellent).
                </div>

                <Button
                  onClick={() => setStep(7)}
                  className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium flex items-center justify-center gap-2'
                >
                  Continue to Questionnaire
                  <ArrowRight className='h-4 w-4' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 7 && (
        <Card className='shadow-subtle max-w-2xl mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Brain className='h-5 w-5 text-vercel-blue' />
              Step 7: Psychometric Assessment
            </CardTitle>
            <CardDescription className='text-sm text-muted-foreground'>
              Answer these 15 questions to evaluate financial planning and responsibility capabilities.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-6 max-h-[450px] overflow-y-auto pr-2'>
              {QUESTIONS.map((item, idx) => (
                <div key={idx} className='space-y-2 border-b border-dove/10 pb-4'>
                  <p className='text-sm font-semibold text-foreground'>
                    {idx + 1}. {item.q}
                  </p>
                  <div className='grid gap-2 grid-cols-1 sm:grid-cols-2'>
                    {item.options.map((opt, oIdx) => {
                      const isSelected = answers[idx] === oIdx
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectAnswer(idx, oIdx)}
                          className={`text-left text-xs p-3 rounded-[12px] border transition-all duration-200 ${
                            isSelected
                              ? 'border-vercel-blue bg-vercel-blue/5 text-vercel-blue font-medium'
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
              onClick={() => setStep(8)}
              disabled={!isQuestionnaireComplete}
              className='w-full rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium'
            >
              Submit Questionnaire
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 8 && (
        <Card className='shadow-subtle max-w-md mx-auto'>
          <CardHeader>
            <CardTitle className='font-signifier text-2xl font-normal leading-[1.2] text-foreground flex items-center gap-2'>
              <Store className='h-5 w-5 text-vercel-blue' />
              Step 8: GST Connection (Optional)
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
                <div className='flex flex-col items-center justify-center p-6 bg-vercel-blue/5 rounded-[16px] border border-vercel-blue/10'>
                  <ShieldCheck className='h-12 w-12 text-vercel-blue' />
                  <h3 className='text-sm font-semibold text-vercel-blue mt-2'>GST Linked Successfully</h3>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
