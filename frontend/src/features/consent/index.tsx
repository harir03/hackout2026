import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Landmark,
  Phone,
  ShoppingCart,
  MapPin,
  Brain,
  Store,
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
  const [consent, setConsent] = useState({
    d1_bank: false,
    d2_telecom: false,
    d3_ecommerce: false,
    d4_location: false,
    d5_questionnaire: false,
    d6_merchant: false,
  })

  const anyEnabled = Object.values(consent).some(Boolean)
  const hasBankData = consent.d1_bank
  const tier = hasBankData ? 'Tier 2 — Full Assessment' : 'Tier 1 — Zero-history'
  const enabledCount = Object.values(consent).filter(Boolean).length

  function handleToggle(key: keyof typeof consent) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSubmit() {
    const userId = `applicant-${Date.now()}`
    const sources = Object.entries(consent)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .join(',')
    navigate({ to: '/score', search: { userId, sources } })
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold tracking-tight'>
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
        {DATA_SOURCES.map((source) => {
          const Icon = source.icon
          const enabled = consent[source.key]
          return (
            <Card
              key={source.key}
              className={`transition-all duration-200 ${
                enabled
                  ? 'border-primary/50 bg-primary/5 shadow-sm'
                  : 'opacity-70'
              }`}
            >
              <CardHeader className='pb-3'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <Icon className='h-5 w-5 text-primary' />
                    <CardTitle className='text-sm font-semibold'>
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

      {!hasBankData && anyEnabled && (
        <div className='mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4'>
          <p className='text-sm text-amber-700 dark:text-amber-400'>
            Without Bank & UPI data, your assessment will use Tier 1 scoring
            with reduced data sources. For the most accurate assessment,
            enable Bank & UPI Transactions.
          </p>
        </div>
      )}

      <div className='mt-6 flex justify-end'>
        <Button
          size='lg'
          disabled={!anyEnabled}
          onClick={handleSubmit}
        >
          Submit Consent & Get Score
        </Button>
      </div>
    </div>
  )
}
