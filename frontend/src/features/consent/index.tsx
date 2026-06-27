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
import { submitConsent } from '@/lib/api'

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
  const [submitting, setSubmitting] = useState(false)
  const [userId] = useState(() => `applicant-${Date.now()}`)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [gmailConnecting, setGmailConnecting] = useState(false)
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
      navigate({ to: '/score', search: { userId, sources, consentId: res.consent_id } })
    } catch (err) {
      console.error('Consent submission failed:', err)
      const sources = consentedSourcesList.join(',')
      navigate({ to: '/score', search: { userId, sources } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
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
  )
}
