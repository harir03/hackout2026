import { useEffect, useState, useMemo } from 'react'
import { useSearch, Link } from '@tanstack/react-router'
import { AlertTriangle, ShieldAlert, MessageSquare } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { fetchScore, fetchScoreById } from '@/lib/api'
import type { ScoreResponse, ShapFeature } from '@/lib/types'

function bandColor(band: string): string {
  if (band === 'Excellent') return 'text-emerald-500'
  if (band === 'Good') return 'text-green-500'
  if (band === 'Fair') return 'text-yellow-500'
  if (band === 'Poor') return 'text-orange-500'
  return 'text-red-500'
}

function ShapBar({ feature, maxAbs }: { feature: ShapFeature; maxAbs: number }) {
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
              className='absolute left-1/2 h-4 rounded-r bg-emerald-500/80'
              style={{ width: `${pct / 2}%` }}
            />
          ) : (
            <div
              className='absolute h-4 rounded-l bg-red-500/80'
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
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {feature.points > 0 ? '+' : ''}
          {feature.points.toFixed(1)}
        </span>
      </div>
      <Badge variant='outline' className='w-24 justify-center text-xs'>
        {feature.worker}
      </Badge>
    </div>
  )
}

export function ScorePage() {
  const search = useSearch({ strict: false }) as { userId?: string; sources?: string }
  const userId = search.userId || 'test-user-001'
  const consentedSources = search.sources?.split(',').filter(Boolean) ?? []

  const [data, setData] = useState<ScoreResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    const request = consentedSources.length > 0
      ? fetchScore(userId, consentedSources)
      : fetchScoreById(userId)
    request
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId])

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
      <div className='space-y-4'>
        <div className='flex flex-col items-center gap-3 py-12'>
          <div className='h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent' />
          <p className='text-sm text-muted-foreground'>
            Scoring your application across consented data sources…
          </p>
        </div>
        <div className='grid gap-4 md:grid-cols-3'>
          <Skeleton className='h-52' />
          <Skeleton className='col-span-2 h-52' />
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
        <h1 className='text-2xl font-bold tracking-tight'>Your Credit Score</h1>
        <p className='text-sm text-muted-foreground'>
          {data.tier} assessment
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='md:col-span-1'>
          <CardContent className='flex flex-col items-center justify-center py-8'>
            <div className='relative flex h-40 w-40 items-center justify-center'>
              <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
                <circle
                  cx='50' cy='50' r='42'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='6'
                  className='text-muted/20'
                />
                <circle
                  cx='50' cy='50' r='42'
                  fill='none'
                  strokeWidth='6'
                  strokeLinecap='round'
                  strokeDasharray={`${(data.score / 850) * 264} 264`}
                  style={{
                    stroke: data.score >= 700 ? '#10b981' :
                           data.score >= 500 ? '#22c55e' :
                           data.score >= 400 ? '#eab308' :
                           data.score >= 300 ? '#f97316' : '#ef4444',
                  }}
                />
              </svg>
              <div className='text-center'>
                <div className='text-4xl font-bold'>{data.score}</div>
                <div className='text-xs text-muted-foreground'>of 850</div>
              </div>
            </div>
            <div className={`mt-4 text-xl font-bold ${bandColor(data.risk_band)}`}>
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
              <ShapBar key={feat.label} feature={feat} maxAbs={maxAbs} />
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
        <Card className='mt-4 border-amber-500/30'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2 text-base text-amber-600 dark:text-amber-400'>
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
                className='flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 p-3'
              >
                <div className='flex items-center gap-2'>
                  <Badge className='bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'>
                    {conflict.positive_worker}: {conflict.positive_net_points > 0 ? '+' : ''}{conflict.positive_net_points.toFixed(1)} pts
                  </Badge>
                  <span className='text-xs text-muted-foreground'>vs</span>
                  <Badge className='bg-red-500/20 text-red-700 dark:text-red-400'>
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
