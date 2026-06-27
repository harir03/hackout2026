import { useEffect, useState, useMemo } from 'react'
import { useSearch, Link } from '@tanstack/react-router'
import { AlertTriangle, ShieldAlert, MessageSquare, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { fetchScore, fetchScoreById } from '@/lib/api'
import type { ScoreResponse, ShapFeature } from '@/lib/types'

function bandColor(band: string): string {
  const colors: Record<string, string> = {
    Excellent: 'text-vercel-blue',
    Good: 'text-graphite',
    Fair: 'text-slate',
    Poor: 'text-rust',
  }
  return colors[band] || 'text-destructive'
}

function scoreGradient(score: number): string {
  if (score >= 700) return 'url(#gradient-develop)'
  if (score >= 500) return 'url(#gradient-preview)'
  return 'url(#gradient-ship)'
}

function ShapBar({ feature, maxAbs, ecomSource }: { feature: ShapFeature; maxAbs: number; ecomSource?: string }) {
  const pct = Math.min((Math.abs(feature.points) / maxAbs) * 100, 100)
  const positive = feature.points > 0

  return (
    <div className='flex items-center gap-3 py-1.5'>
      <div className='w-40 shrink-0 text-right text-xs font-medium text-muted-foreground truncate'>
        {feature.label.replace(/^(bank_|telecom_|ecom_|loc_|psych_|merchant_)/, '')}
      </div>
      <div className='flex flex-1 items-center gap-1'>
        <div className='relative flex h-5 w-full items-center'>
          <div className='absolute left-1/2 h-full w-px bg-border' />
          {positive ? (
            <div
              className='absolute left-1/2 h-4 rounded-r bg-vercel-blue/80'
              style={{ width: `${pct / 2}%` }}
            />
          ) : (
            <div
              className='absolute h-4 rounded-l bg-rust/80'
              style={{
                width: `${pct / 2}%`,
                right: '50%',
              }}
            />
          )}
        </div>
      </div>
      <div className='w-20 shrink-0 text-right'>
        <span
          className={`text-xs font-semibold ${
            positive
              ? 'text-vercel-blue'
              : 'text-rust'
          }`}
        >
          {feature.points > 0 ? '+' : ''}
          {feature.points.toFixed(1)}
        </span>
      </div>
      <Badge variant='outline' className='w-28 justify-center text-xs'>
        {feature.worker === 'E-commerce' && ecomSource === 'gmail' ? 'E-commerce (Gmail)' : feature.worker}
      </Badge>
    </div>
  )
}

export function ScorePage() {
  const search = useSearch({ strict: false }) as { userId?: string; sources?: string; consentId?: string }
  const userId = search.userId || 'test-user-001'
  const consentedSources = search.sources?.split(',').filter(Boolean) ?? []
  const consentId = search.consentId

  const [data, setData] = useState<ScoreResponse | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineStep, setPipelineStep] = useState(0)

  const activePipelines = useMemo(() => {
    return consentedSources.map((s) => {
      if (s === 'd1_bank') return 'Bank & UPI Transactions'
      if (s === 'd2_telecom') return 'Telecom Payment History'
      if (s === 'd3_ecommerce') return 'E-commerce Activity'
      if (s === 'd4_location') return 'Geolocation Stability'
      if (s === 'd5_questionnaire') return 'Psychometric Assessment'
      if (s === 'd6_merchant') return 'Merchant & GST Records'
      return s
    })
  }, [consentedSources])

  useEffect(() => {
    const request = consentedSources.length > 0
      ? fetchScore(userId, consentedSources, consentId)
      : fetchScoreById(userId, consentId)
    request
      .then((res) => {
        setData(res)
        setDataLoaded(true)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [userId])

  useEffect(() => {
    if (activePipelines.length > 0) {
      const interval = setInterval(() => {
        setPipelineStep((prev) => {
          if (prev >= activePipelines.length - 1) {
            clearInterval(interval)
            const checkDataInterval = setInterval(() => {
              if (dataLoaded || error) {
                clearInterval(checkDataInterval)
                setLoading(false)
              }
            }, 100)
            return prev
          }
          return prev + 1
        })
      }, 1200)
      return () => clearInterval(interval)
    } else {
      setLoading(false)
    }
  }, [activePipelines, dataLoaded, error])

  const sortedShap = useMemo(() => {
    if (!data) return []
    return [...data.shap_details].sort(
      (a, b) => Math.abs(b.points) - Math.abs(a.points)
    )
  }, [data])

  const maxAbs = useMemo(() => {
    if (!sortedShap.length) return 1
    return Math.abs(sortedShap[0].points)
  }, [sortedShap])

  if (loading) {
    return (
      <div className='max-w-md mx-auto py-12 px-4 space-y-6 animate-fade-up'>
        <div className='text-center mb-6'>
          <h1 className='font-signifier text-3xl font-normal leading-[1.2] text-foreground flex items-center justify-center gap-2'>
            <Loader2 className='h-6 w-6 animate-spin text-vercel-blue' />
            Running Pipeline Workers
          </h1>
          <p className='text-sm text-muted-foreground mt-2'>
            Analyzing alternative data footprint and validating risk bands...
          </p>
        </div>

        <div className='space-y-4'>
          {activePipelines.map((name, idx) => {
            const isCompleted = idx < pipelineStep
            const isActive = idx === pipelineStep
            return (
              <Card key={idx} className={`shadow-subtle transition-all duration-300 ${isActive ? 'border-vercel-blue bg-vercel-blue/5' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                <CardHeader className='py-3 px-4 flex flex-row items-center justify-between space-y-0'>
                  <div className='flex items-center gap-3'>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted ? 'bg-vercel-blue text-white' : isActive ? 'bg-vercel-blue/20 text-vercel-blue animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-vercel-blue font-semibold' : ''}`}>{name}</span>
                  </div>
                  {isActive && <span className='text-xs text-vercel-blue font-medium animate-pulse'>Processing...</span>}
                  {isCompleted && <span className='text-xs text-graphite font-medium'>Completed</span>}
                </CardHeader>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Alert variant='destructive'>
        <AlertTriangle className='h-4 w-4' />
        <AlertTitle>Unable to retrieve your score</AlertTitle>
        <AlertDescription>{error || 'Please try again later'}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>Your Credit Score</h1>
        <p className='text-sm text-muted-foreground'>
          {data.tier} assessment
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='md:col-span-1'>
          <CardContent className='flex flex-col items-center justify-center py-8'>
            <div className='relative flex h-40 w-40 items-center justify-center'>
              <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
                <defs>
                  <linearGradient id='gradient-develop' x1='0%' y1='0%' x2='100%' y2='0%'>
                    <stop offset='0%' stopColor='#007cf0' />
                    <stop offset='100%' stopColor='#a3a6af' />
                  </linearGradient>
                  <linearGradient id='gradient-preview' x1='0%' y1='0%' x2='100%' y2='0%'>
                    <stop offset='0%' stopColor='#a3a6af' />
                    <stop offset='100%' stopColor='#5d2a1a' />
                  </linearGradient>
                  <linearGradient id='gradient-ship' x1='0%' y1='0%' x2='100%' y2='0%'>
                    <stop offset='0%' stopColor='#5d2a1a' />
                    <stop offset='100%' stopColor='#ee0000' />
                  </linearGradient>
                </defs>
                <circle
                  cx='50' cy='50' r='42'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='6'
                  className='text-muted'
                />
                <circle
                  cx='50' cy='50' r='42'
                  fill='none'
                  strokeWidth='6'
                  strokeLinecap='round'
                  strokeDasharray={`${(data.score / 850) * 264} 264`}
                  stroke={scoreGradient(data.score)}
                  className='transition-all duration-1000'
                />
              </svg>
              <div className='text-center'>
                <div className='text-4xl font-bold tracking-[-0.04em]'>{data.score}</div>
                <div className='text-xs text-muted-foreground'>of 850</div>
              </div>
            </div>
            <div className={`mt-4 text-xl font-bold tracking-[-0.02em] ${bandColor(data.risk_band)}`}>
              {data.risk_band}
            </div>
            <Badge variant='outline' className='mt-2'>
              {data.tier}
            </Badge>
          </CardContent>
        </Card>

        <Card className='md:col-span-2'>
          <CardHeader>
            <CardTitle className='text-base'>What Affected Your Score</CardTitle>
            <CardDescription>
              How each factor contributed (baseline: 600)
            </CardDescription>
          </CardHeader>
          <CardContent className='max-h-[400px] overflow-y-auto'>
            {sortedShap.map((feat) => (
              <ShapBar key={feat.label} feature={feat} maxAbs={maxAbs} ecomSource={data.ecom_source} />
            ))}
          </CardContent>
        </Card>
      </div>

      {data.has_hard_cap && (
        <Alert variant='destructive' className='mt-4'>
          <ShieldAlert className='h-4 w-4' />
          <AlertTitle>Score Cap Applied</AlertTitle>
          <AlertDescription>
            {data.hard_caps_applied.map((cap, i) => (
              <p key={i}>{cap}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {data.has_conflicts && (
        <Card className='mt-4 border-rust/30 shadow-none'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base text-rust'>
              <AlertTriangle className='h-4 w-4' />
              Conflicting Signals
            </CardTitle>
            <CardDescription>
              Some of your data sources provided contradicting information
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {data.signal_conflicts.map((conflict, i) => (
              <div
                key={i}
                className='flex items-center justify-between rounded-lg border border-rust/20 bg-rust/5 p-3'
              >
                <div className='flex items-center gap-2'>
                  <Badge className='bg-vercel-blue/15 text-vercel-blue border-vercel-blue/30' variant='outline'>
                    {conflict.positive_worker}: {conflict.positive_net_points > 0 ? '+' : ''}{conflict.positive_net_points.toFixed(1)} pts
                  </Badge>
                  <span className='text-xs text-muted-foreground'>vs</span>
                  <Badge className='bg-rust/15 text-rust border-rust/30' variant='outline'>
                    {conflict.negative_worker}: {conflict.negative_net_points.toFixed(1)} pts
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.tier1_reweight && (
        <Alert className='mt-4'>
          <AlertTitle>Score Adjustment</AlertTitle>
          <AlertDescription>{data.tier1_reweight}</AlertDescription>
        </Alert>
      )}

      <div className='mt-6 flex gap-3'>
        <Link to='/advisor' search={{ userId }}>
          <Button>
            <MessageSquare className='mr-2 h-4 w-4' />
            Ask About Your Score
          </Button>
        </Link>
        <Link to='/'>
          <Button variant='ghost'>Modify Consent</Button>
        </Link>
      </div>
    </div>
  )
}
