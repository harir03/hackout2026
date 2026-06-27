import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Landmark,
  Phone,
  ShoppingCart,
  MapPin,
  Brain,
  Store,
  Loader2,
  Mail,
  Lock,
  CheckCircle2,
  Camera,
  ShieldCheck,
  CreditCard,
  Fingerprint,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitConsent } from '@/lib/api'

const DEMO_PROFILES: Record<string, string> = {
  "9876543210": "hari",
  "9876543211": "rahul",
  "9876543212": "nikhil",
  "9876543213": "akash",
  "9876543214": "tejas"
}

const DATA_SOURCES = [
  {
    key: 'd1_bank' as const,
    label: 'Bank & UPI Transactions',
    icon: Landmark,
    tier: 'Tier 2',
    description:
      'Monthly inflow, outflow patterns, UPI transaction frequency, payment regularity, and balance volatility from your linked bank account.',
  },
  {
    key: 'd2_telecom' as const,
    label: 'Telecom Payment History',
    icon: Phone,
    tier: 'Tier 1',
    description:
      'Mobile plan payment timeliness, active months, missed payments, and recharge consistency from your telecom provider.',
  },
  {
    key: 'd3_ecommerce' as const,
    label: 'E-commerce Activity',
    icon: ShoppingCart,
    tier: 'Tier 2',
    description:
      'Purchase frequency, average spend, return rate, category diversity, and account age from e-commerce platforms.',
  },
  {
    key: 'd4_location' as const,
    label: 'Geolocation Stability',
    icon: MapPin,
    tier: 'Tier 1',
    description:
      'Address stability, years at current residence, metro/non-metro classification, and frequency of address changes.',
  },
  {
    key: 'd5_questionnaire' as const,
    label: 'Psychometric Assessment',
    icon: Brain,
    tier: 'Tier 1',
    description:
      'Financial literacy and responsibility indicators from a short questionnaire — response consistency, completion time, and engagement level.',
  },
  {
    key: 'd6_merchant' as const,
    label: 'Merchant & GST Records',
    icon: Store,
    tier: 'Tier 2',
    description:
      'GST filing regularity, months in operation, annual turnover, platform rating, and business registration status for MSMEs.',
  },
]

export function ConsentPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [userId] = useState(() => `applicant-${Date.now()}`)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailConnecting, setGmailConnecting] = useState(false)
  
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

  // Step 5: Consent States
  const [consent, setConsent] = useState({
    d1_bank: false,
    d2_telecom: false,
    d3_ecommerce: false,
    d4_location: false,
    d5_questionnaire: false,
    d6_merchant: false,
  })

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'GMAIL_CONNECTED' && event.data?.userId === userId) {
        setGmailConnected(true)
        setConsent((prev) => ({ ...prev, d3_ecommerce: true }))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [userId])

  const anyEnabled = Object.values(consent).some(Boolean)
  const hasBankData = consent.d1_bank
  const tier = hasBankData ? 'Tier 2 — Full Assessment' : 'Tier 1 — Zero-history'
  const enabledCount = Object.values(consent).filter(Boolean).length

  function handleToggle(key: keyof typeof consent) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Onboarding Helpers
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

  const handleVerifyPan = () => {
    setVerifyingPan(true)
    setTimeout(() => {
      setVerifyingPan(false)
      setPanVerified(true)
      if (profileName) {
        setPanName(profileName.toUpperCase())
        setPanDob('1992-04-15')
        setPanType('Individual')
      } else {
        setPanName('RAJESH KUMAR')
        setPanDob('1988-11-23')
        setPanType('Individual')
      }
    }, 1200)
  }

  const handleSendAadhaarOtp = () => {
    if (aadhaar.length === 12) {
      setAadhaarOtpSent(true)
    }
  }

  const handleVerifyAadhaar = () => {
    setVerifyingAadhaar(true)
    setTimeout(() => {
      setVerifyingAadhaar(false)
      setStep(4)
    }, 1200)
  }

  const startCamera = () => {
    setCameraActive(true)
    setLivenessInstruction('Blink your eyes now...')
  }

  const captureFace = () => {
    setCapturingFace(true)
    setTimeout(() => {
      setCapturingFace(false)
      setFaceCaptured(true)
      setLivenessScore(0.984)
    }, 1500)
  }

  function handleConnectGmail() {
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

  async function handleSubmit() {
    setSubmitting(true)
    const consentedSourcesList = Object.entries(consent)
      .filter(([, v]) => v)
      .map(([k]) => k)

    try {
      const res = await submitConsent(userId, consentedSourcesList)
      const sources = consentedSourcesList.join(',')
      navigate({
        to: '/score',
        search: { userId, sources, consentId: res.consent_id, phone }
      })
    } catch (err) {
      console.error('Consent submission failed:', err)
      const sources = consentedSourcesList.join(',')
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
      {/* Stepper Header */}
      <div className='mb-8 flex justify-between items-center text-xs text-graphite border-b border-dove/20 pb-4'>
        <span className={step === 1 ? 'text-vercel-blue font-semibold' : step > 1 ? 'text-foreground' : ''}>1. Mobile Verification</span>
        <span className={step === 2 ? 'text-vercel-blue font-semibold' : step > 2 ? 'text-foreground' : ''}>2. PAN Verification</span>
        <span className={step === 3 ? 'text-vercel-blue font-semibold' : step > 3 ? 'text-foreground' : ''}>3. Aadhaar OKYC</span>
        <span className={step === 4 ? 'text-vercel-blue font-semibold' : step > 4 ? 'text-foreground' : ''}>4. Liveness Check</span>
        <span className={step === 5 ? 'text-vercel-blue font-semibold' : ''}>5. DPDP Consent</span>
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
                Proceed to Consent
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <div className='animate-fade-up'>
          <div className='mb-6'>
            <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
              Select Your Data Sources
            </h1>
            <p className='mt-1 text-muted-foreground'>
              Choose which data sources you consent to share for your credit
              assessment. Each source is processed independently and you may withdraw
              consent at any time.
            </p>
          </div>

          <div className='mb-4 flex items-center gap-3'>
            <Badge variant={anyEnabled ? 'default' : 'secondary'}>
              {enabledCount} of 6 sources selected
            </Badge>
            <Badge variant={hasBankData ? 'default' : 'outline'}>
              {tier}
            </Badge>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            {DATA_SOURCES.map((source, i) => {
              const Icon = source.icon
              const enabled = consent[source.key]
              return (
                <Card
                  key={source.key}
                  className={`animate-fade-up transition-all duration-200 ${
                    enabled
                      ? 'border-foreground bg-muted shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <CardHeader className='pb-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Icon className={`h-5 w-5 ${enabled ? 'text-foreground' : 'text-muted-foreground'}`} />
                        <CardTitle className='text-sm font-semibold tracking-[-0.01em]'>
                          {source.label}
                        </CardTitle>
                      </div>
                      <Switch
                        id={source.key}
                        checked={enabled}
                        onCheckedChange={() => handleToggle(source.key)}
                      />
                    </div>
                    <Badge variant='outline' className='w-fit text-xs'>
                      {source.tier}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className='text-xs leading-relaxed'>
                      {source.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Card className={`mt-6 border transition-all duration-300 ${
            gmailConnected
              ? 'border-vercel-blue bg-vercel-blue/5'
              : 'border-dove/50 bg-fog/30 hover:border-graphite'
          }`}>
            <CardHeader className='pb-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className={`rounded-lg p-2 ${gmailConnected ? 'bg-vercel-blue/15 text-vercel-blue' : 'bg-muted text-muted-foreground'}`}>
                    <Mail className='h-5 w-5' />
                  </div>
                  <div>
                    <CardTitle className='text-base font-semibold tracking-[-0.01em] flex items-center gap-2'>
                      Connect Gmail Account
                      <Badge variant='secondary' className='text-[10px] font-normal tracking-normal px-2 py-0 h-4 bg-muted text-muted-foreground'>
                        Optional
                  </Badge>
                    </CardTitle>
                    <CardDescription className='text-xs mt-0.5 text-muted-foreground/80'>
                      Order confirmation emails are parsed to extract real e-commerce transactional signal.
                    </CardDescription>
                  </div>
                </div>
                <div>
                  <Button
                    variant={gmailConnected ? 'destructive' : 'outline'}
                    size='sm'
                    onClick={handleConnectGmail}
                    disabled={gmailConnecting}
                    className='h-8 px-3 text-xs'
                  >
                    {gmailConnecting ? (
                      <>
                        <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
                        Connecting...
                      </>
                    ) : gmailConnected ? (
                      'Disconnect'
                    ) : (
                      'Link Account'
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-2 rounded-lg bg-fog border border-dove/20 p-3 text-xs leading-relaxed text-muted-foreground'>
                <div className='flex items-center gap-2'>
                  <Lock className='h-3.5 w-3.5 text-graphite' />
                  <span><strong>Privacy Policy:</strong> Read-only access to transaction receipt headers from Amazon, Flipkart, and Meesho. Message bodies are not stored.</span>
                </div>
                {gmailConnected && (
                  <div className='flex items-center gap-2 text-vercel-blue mt-1 font-medium'>
                    <CheckCircle2 className='h-3.5 w-3.5 text-vercel-blue animate-pulse' />
                    <span>Connected as user-gmail-session. E-commerce metrics will reflect real email parser results.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {!hasBankData && anyEnabled && (
            <div className='mt-4 rounded-[12px] border border-rust/20 bg-rust/5 p-4'>
              <p className='text-sm text-rust'>
                Without Bank & UPI data, your assessment will use Tier 1 scoring
                with reduced data sources. For the most accurate assessment,
                enable Bank & UPI Transactions.
              </p>
            </div>
          )}

          <div className='mt-6 flex justify-end'>
            <Button
              size='lg'
              disabled={!anyEnabled || submitting}
              onClick={handleSubmit}
              className='rounded-full'
            >
              {submitting ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Submitting Consent...
                </>
              ) : (
                'Submit Consent & Get Score'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
