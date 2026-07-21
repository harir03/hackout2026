import { useEffect, useState } from 'react'
import { useSearch, Link } from '@tanstack/react-router'
import { Loader2, IndianRupee, Percent, Clock, MessageSquare, ChevronLeft, Phone, CheckCircle2 } from 'lucide-react'
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
import { fetchEligibility, submitLoanApplication } from '@/lib/api'
import type { EligibilityResponse, LoanTier, LoanApplicationResponse } from '@/lib/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function bandAccent(band: string): string {
  const accents: Record<string, string> = {
    Excellent: 'text-brand-blue',
    Good: 'text-graphite',
    Fair: 'text-slate',
    Poor: 'text-rust',
  }
  return accents[band] || 'text-destructive'
}

function TenureCard({
  tier,
  isSelected,
  onSelect,
}: {
  tier: LoanTier
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`rounded-xl border p-4 text-left transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-brand-blue bg-brand-blue/5 ring-1 ring-brand-blue/20'
          : 'border-border hover:border-foreground/20'
      }`}
    >
      <div className='text-2xl font-bold tracking-[-0.04em]'>
        {tier.tenure_months} <span className='text-sm font-normal text-muted-foreground'>months</span>
      </div>
      <div className='mt-3 space-y-1'>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>Monthly EMI</span>
          <span className='text-sm font-semibold'>{formatCurrency(tier.monthly_emi)}</span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-xs text-muted-foreground'>Total Repayment</span>
          <span className='text-xs text-muted-foreground'>{formatCurrency(tier.total_repayment)}</span>
        </div>
      </div>
    </button>
  )
}

export function EligibilityPage() {
  const search = useSearch({ strict: false }) as {
    userId?: string
    score?: string
    band?: string
  }
  const userId = search.userId || 'test-user-001'
  const score = search.score ? parseInt(search.score, 10) : 0
  const band = search.band || 'Not Eligible'

  const [data, setData] = useState<EligibilityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTenure, setSelectedTenure] = useState(0)

  const [applyPhone, setApplyPhone] = useState('')
  const [applyName, setApplyName] = useState('')
  const [applying, setApplying] = useState(false)
  const [applicationResult, setApplicationResult] = useState<LoanApplicationResponse | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    fetchEligibility(userId, score, band)
      .then((res) => {
        setData(res)
        if (res.tenure_options.length > 0) {
          const midIndex = Math.floor(res.tenure_options.length / 2)
          setSelectedTenure(midIndex)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [userId, score, band])

  useEffect(() => {
    if (userId === 'testhari@altgrade.in') {
      setApplyPhone('9876543210')
      setApplyName('Hari R')
    } else if (userId === 'farmer@altgrade.in') {
      setApplyPhone('9876543215')
      setApplyName('Farmer Ram')
    } else if (userId === 'msme@altgrade.in') {
      setApplyPhone('9876543216')
      setApplyName('MSME Vendor')
    }
  }, [userId])

  async function handleApply() {
    if (!data || !selected) return
    if (!applyPhone || applyPhone.length < 10) {
      setApplyError('Please enter a valid 10-digit phone number')
      return
    }
    setApplying(true)
    setApplyError(null)
    try {
      const result = await submitLoanApplication({
        userId,
        score: data.score,
        riskBand: data.risk_band,
        loanAmount: data.max_loan_amount,
        tenureMonths: selected.tenure_months,
        monthlyEmi: selected.monthly_emi,
        interestRate: data.interest_rate_annual,
        phone: applyPhone,
        name: applyName,
      })
      setApplicationResult(result)
    } catch (err: any) {
      setApplyError(err?.response?.data?.detail || err.message || 'Failed to submit application')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className='max-w-lg mx-auto py-16 flex flex-col items-center gap-3'>
        <Loader2 className='h-8 w-8 animate-spin text-brand-blue' />
        <p className='text-sm text-muted-foreground'>Calculating your loan eligibility...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className='max-w-lg mx-auto py-12 px-4'>
        <Alert variant='destructive'>
          <AlertTitle>Unable to load eligibility</AlertTitle>
          <AlertDescription>{error || 'Please try again later'}</AlertDescription>
        </Alert>
        <Link to='/score' search={{ userId }}>
          <Button variant='ghost' className='mt-4'>
            <ChevronLeft className='mr-1 h-4 w-4' /> Back to Score
          </Button>
        </Link>
      </div>
    )
  }

  if (!data.is_eligible) {
    return (
      <div className='max-w-lg mx-auto py-12 px-4 space-y-6 animate-fade-up'>
        <div>
          <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
            Loan Eligibility
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>Based on your AltGrade credit score</p>
        </div>

        <Card className='border-rust/30'>
          <CardContent className='py-8 text-center space-y-3'>
            <div className='mx-auto h-12 w-12 rounded-full bg-rust/10 flex items-center justify-center'>
              <IndianRupee className='h-6 w-6 text-rust' />
            </div>
            <h2 className='text-xl font-bold text-rust'>Not Eligible</h2>
            <p className='text-sm text-muted-foreground max-w-xs mx-auto'>
              Your current score of {data.score} does not meet the minimum threshold for loan eligibility.
              Improve your score by building a consistent digital footprint.
            </p>
          </CardContent>
        </Card>

        <div className='flex gap-3'>
          <Link to='/advisor' search={{ userId }}>
            <Button>
              <MessageSquare className='mr-2 h-4 w-4' />
              Ask How to Improve
            </Button>
          </Link>
          <Link to='/score' search={{ userId }}>
            <Button variant='ghost'>
              <ChevronLeft className='mr-1 h-4 w-4' /> Back to Score
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const selected = data.tenure_options[selectedTenure]

  return (
    <div className='max-w-2xl mx-auto py-8 px-4 space-y-6 animate-fade-up'>
      <div>
        <Link to='/score' search={{ userId }}>
          <Button variant='ghost' size='sm' className='mb-2 -ml-2 text-muted-foreground'>
            <ChevronLeft className='mr-1 h-3 w-3' /> Back to Score
          </Button>
        </Link>
        <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
          Loan Eligibility
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>Based on your AltGrade credit score</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-3'>
        <Card>
          <CardContent className='py-5 flex flex-col items-center gap-1'>
            <IndianRupee className='h-5 w-5 text-brand-blue mb-1' />
            <div className='text-2xl font-bold tracking-[-0.04em]'>
              {formatCurrency(data.max_loan_amount)}
            </div>
            <span className='text-xs text-muted-foreground'>Max Loan Amount</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='py-5 flex flex-col items-center gap-1'>
            <Percent className='h-5 w-5 text-brand-blue mb-1' />
            <div className='text-2xl font-bold tracking-[-0.04em]'>
              {data.interest_rate_annual}%
            </div>
            <span className='text-xs text-muted-foreground'>Annual Interest Rate</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='py-5 flex flex-col items-center gap-1'>
            <Clock className='h-5 w-5 text-brand-blue mb-1' />
            <div className='text-2xl font-bold tracking-[-0.04em]'>
              {data.tenure_options[data.tenure_options.length - 1]?.tenure_months || 0}
            </div>
            <span className='text-xs text-muted-foreground'>Max Tenure (months)</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='text-base'>Choose Repayment Tenure</CardTitle>
              <CardDescription>Select a tenure to see your monthly EMI</CardDescription>
            </div>
            <Badge variant='outline' className={bandAccent(data.risk_band)}>
              Score: {data.score} · {data.risk_band}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {data.tenure_options.map((tier, idx) => (
              <TenureCard
                key={tier.tenure_months}
                tier={tier}
                isSelected={idx === selectedTenure}
                onSelect={() => setSelectedTenure(idx)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {selected && !applicationResult && (
        <Card className='border-brand-blue/30 bg-brand-blue/5'>
          <CardContent className='py-6 space-y-5'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
              <div>
                <p className='text-xs text-muted-foreground uppercase tracking-wider font-medium'>
                  Selected Plan
                </p>
                <p className='text-3xl font-bold tracking-[-0.04em] mt-1'>
                  {formatCurrency(selected.monthly_emi)}
                  <span className='text-sm font-normal text-muted-foreground'> /month</span>
                </p>
                <p className='text-xs text-muted-foreground mt-1'>
                  {selected.tenure_months} months · Total: {formatCurrency(selected.total_repayment)}
                </p>
              </div>
            </div>

            <div className='border-t border-border/50 pt-4 space-y-3'>
              <p className='text-sm font-medium'>Apply for this loan — request a callback</p>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div>
                  <label className='text-xs text-muted-foreground block mb-1'>Your Name</label>
                  <input
                    type='text'
                    value={applyName}
                    onChange={(e) => setApplyName(e.target.value)}
                    placeholder='Full Name'
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue'
                  />
                </div>
                <div>
                  <label className='text-xs text-muted-foreground block mb-1'>Phone Number</label>
                  <input
                    type='tel'
                    value={applyPhone}
                    onChange={(e) => setApplyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder='10-digit mobile number'
                    maxLength={10}
                    className='w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue'
                  />
                </div>
              </div>

              {applyError && (
                <p className='text-xs text-destructive'>{applyError}</p>
              )}

              <Button
                size='lg'
                className='w-full sm:w-auto'
                onClick={handleApply}
                disabled={applying || !applyPhone || applyPhone.length < 10}
              >
                {applying ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Phone className='mr-2 h-4 w-4' />
                    Apply & Request Callback
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {applicationResult && (
        <Card>
          <CardContent className='py-8 text-center space-y-4'>
            <div className='mx-auto h-14 w-14 rounded-full bg-brand-blue/10 flex items-center justify-center'>
              <CheckCircle2 className='h-8 w-8 text-brand-blue' />
            </div>
            <div>
              <h2 className='text-xl font-bold text-brand-blue'>Application Submitted!</h2>
              <p className='text-xs text-muted-foreground mt-1'>
                Application ID: <span className='font-mono font-semibold text-foreground'>{applicationResult.application_id}</span>
              </p>
            </div>
            <p className='text-sm text-muted-foreground max-w-md mx-auto'>
              {applicationResult.message}
            </p>
            <div className='pt-2 border-t border-border/30 mt-4'>
              <div className='grid grid-cols-3 gap-4 text-center max-w-sm mx-auto'>
                <div>
                  <p className='text-lg font-bold'>{formatCurrency(selected!.monthly_emi)}</p>
                  <p className='text-[10px] text-muted-foreground'>Monthly EMI</p>
                </div>
                <div>
                  <p className='text-lg font-bold'>{selected!.tenure_months}m</p>
                  <p className='text-[10px] text-muted-foreground'>Tenure</p>
                </div>
                <div>
                  <p className='text-lg font-bold'>{data.interest_rate_annual}%</p>
                  <p className='text-[10px] text-muted-foreground'>Interest Rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className='flex gap-3'>
        <Link to='/advisor' search={{ userId }}>
          <Button variant='outline'>
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
