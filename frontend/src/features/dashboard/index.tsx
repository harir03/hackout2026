import { useEffect, useState } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { fetchDashboard, submitDecision, submitKnowledge } from '@/lib/api'
import type { DashboardOverview, ConflictApplicant } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Stepper, Step } from '@/components/ui/stepper'

const BAND_COLORS: Record<string, string> = {
  'Excellent': 'bg-vercel-blue',
  'Good': 'bg-sky-wash',
  'Fair': 'bg-graphite',
  'Poor': 'bg-rust',
  'Not Eligible': 'bg-destructive',
}

const BAND_BG: Record<string, string> = {
  'Excellent': 'bg-vercel-blue/15 text-vercel-blue border-vercel-blue/30',
  'Good': 'bg-sky-wash/40 text-graphite border-sky-wash/60',
  'Fair': 'bg-graphite/15 text-graphite border-graphite/30',
  'Poor': 'bg-rust/15 text-rust border-rust/30',
  'Not Eligible': 'bg-destructive/15 text-destructive border-destructive/30',
}

function StatsCards({ data }: { data: DashboardOverview }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card className='animate-fade-up'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Total Scored</CardTitle>
          <Users className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-[-0.04em]'>{data.total_scored}</div>
          <p className='text-xs text-muted-foreground'>Applicants assessed</p>
        </CardContent>
      </Card>

      <Card className='animate-fade-up [animation-delay:50ms]'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Approval Rate</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-vercel-blue' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-[-0.04em]'>{data.approval_rate}%</div>
          <p className='text-xs text-muted-foreground'>Score ≥ 500 (Good or above)</p>
        </CardContent>
      </Card>

      <Card className='animate-fade-up [animation-delay:100ms]'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Contradiction Review</CardTitle>
          <AlertTriangle className='h-4 w-4 text-rust' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-[-0.04em]'>{data.conflict_count}</div>
          <p className='text-xs text-muted-foreground'>
            Flagged for conflicting signals
          </p>
        </CardContent>
      </Card>

      <Card className='animate-fade-up [animation-delay:150ms]'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Hard Blocked</CardTitle>
          <ShieldAlert className='h-4 w-4 text-[var(--destructive)]' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold tracking-[-0.04em]'>{data.hard_cap_count}</div>
          <p className='text-xs text-muted-foreground'>
            Wilful defaulter or EMI burden cap
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function DistributionChart({ data }: { data: DashboardOverview }) {
  const maxCount = Math.max(...data.band_distribution.map((b) => b.count), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Score Distribution</CardTitle>
        <CardDescription>
          Across {data.total_scored} applicants in the assessment population
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {data.band_distribution.map((band) => (
            <div key={band.band} className='flex items-center gap-3'>
              <div className='w-28 shrink-0 text-right text-sm font-medium'>
                {band.band}
              </div>
              <div className='flex flex-1 items-center gap-2'>
                <div className='relative h-6 flex-1 rounded-md bg-muted'>
                  <div
                    className={`absolute left-0 top-0 h-full rounded-md transition-all duration-500 ${BAND_COLORS[band.band] ?? 'bg-muted-foreground'}`}
                    style={{ width: `${(band.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
              <div className='w-16 text-right text-sm'>
                <span className='font-semibold'>{band.count}</span>
                <span className='text-muted-foreground'> ({band.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ConflictsTable({
  data,
  completedDecisions,
  onReview,
}: {
  data: DashboardOverview
  completedDecisions: Record<string, 'approved' | 'rejected'>
  onReview: (applicant: ConflictApplicant) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <AlertTriangle className='h-4 w-4 text-[var(--vercel-warning)]' />
          Applicants Flagged for Contradiction Review
        </CardTitle>
        <CardDescription>
          Applicants where data sources provided conflicting assessments
          (combined magnitude &gt; 50 score points)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.flagged_applicants.length === 0 ? (
          <p className='py-4 text-center text-sm text-muted-foreground'>
            No applicants flagged for contradiction review
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Conflicting Workers</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flagged_applicants.map((applicant) => {
                const decision = completedDecisions[applicant.user_id]
                return (
                  <TableRow key={applicant.user_id}>
                    <TableCell className='font-mono text-sm'>
                      {applicant.user_id}
                    </TableCell>
                    <TableCell className='font-semibold'>
                      {applicant.score}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={BAND_BG[applicant.band] ?? ''}
                      >
                        {applicant.band}
                      </Badge>
                    </TableCell>
                    <TableCell className='max-w-xs'>
                      {applicant.conflicts.map((c, i) => (
                        <p key={i} className='text-xs text-muted-foreground'>
                          {c}
                        </p>
                      ))}
                    </TableCell>
                    <TableCell className='text-right'>
                      {decision ? (
                        <Badge
                          variant='outline'
                          className={
                            decision === 'approved'
                              ? 'bg-vercel-blue/15 text-vercel-blue border-vercel-blue/30'
                              : 'bg-destructive/15 text-destructive border-destructive/30'
                          }
                        >
                          {decision.toUpperCase()}
                        </Badge>
                      ) : (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={() => onReview(applicant)}
                        >
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function FairnessCard({ data }: { data: DashboardOverview }) {
  const f = data.fairness
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <ShieldCheck className='h-4 w-4 text-vercel-blue' />
          Fairness Audit
        </CardTitle>
        <CardDescription>
          Demographic parity check across protected groups
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Disparate Impact Ratio</span>
          <span className='text-lg font-bold tracking-[-0.02em]'>
            {f.demographic_parity_ratio.toFixed(4)}
          </span>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Four-Fifths Rule (≥ 0.80)</span>
          <Badge variant={f.passes_four_fifths ? 'default' : 'destructive'}>
            {f.passes_four_fifths ? 'Passes' : 'Fails'}
          </Badge>
        </div>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Last Audit</span>
          <span className='text-sm text-muted-foreground'>{f.last_audit}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className='pb-2'>
              <Skeleton className='h-4 w-24' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-16' />
              <Skeleton className='mt-1 h-3 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <Skeleton className='h-5 w-40' />
          </CardHeader>
          <CardContent className='space-y-3'>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className='h-6 w-full' />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className='h-5 w-32' />
          </CardHeader>
          <CardContent className='space-y-3'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-6 w-full' />
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

const SIMULATED_DASHBOARD_DATA: DashboardOverview = {
  total_scored: 1248,
  approval_rate: 68.4,
  conflict_count: 5,
  hard_cap_count: 32,
  band_distribution: [
    { band: 'Excellent', count: 420, percentage: 33.6 },
    { band: 'Good', count: 434, percentage: 34.7 },
    { band: 'Fair', count: 242, percentage: 19.3 },
    { band: 'Poor', count: 120, percentage: 9.6 },
    { band: 'Not Eligible', count: 32, percentage: 2.5 },
  ],
  flagged_applicants: [
    {
      user_id: 'USR-8931A',
      score: 540,
      band: 'Fair',
      conflicts: [
        'E-Commerce spend is highly positive (+110 pts) but Questionnaire shows irregular seasonal income (-65 pts)',
        'Merchant POS inflows indicate active daily trades (+85 pts) but Bank balance volatility is extremely high (-70 pts)'
      ]
    },
    {
      user_id: 'USR-1049C',
      score: 495,
      band: 'Poor',
      conflicts: [
        'Location logs show high frequency of urban metro visits (+75 pts) but Telecom recharge frequency has declined by 60% (-80 pts)'
      ]
    },
    {
      user_id: 'USR-2947F',
      score: 615,
      band: 'Good',
      conflicts: [
        'Bank statement monthly inflow exceeds 50k (+140 pts) but psychometrics flag high impulse risk behavior (-95 pts)'
      ]
    },
    {
      user_id: 'USR-5821D',
      score: 520,
      band: 'Fair',
      conflicts: [
        'E-Commerce transaction count is high (+90 pts) but Aadhaar identity verification was updated within last 30 days (-55 pts)'
      ]
    },
    {
      user_id: 'USR-7391B',
      score: 410,
      band: 'Poor',
      conflicts: [
        'Telecom data shows 5+ years of active tenure (+60 pts) but monthly debt service ratio exceeds 70% (-110 pts)'
      ]
    }
  ],
  fairness: {
    demographic_parity_ratio: 0.8682,
    passes_four_fifths: true,
    last_audit: new Date().toISOString().split('T')[0]
  }
}

export function LoanOfficerDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSimulated, setIsSimulated] = useState(false)

  // Review states
  const [selectedApplicant, setSelectedApplicant] = useState<ConflictApplicant | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [interestRate, setInterestRate] = useState(10.5)
  const [terms, setTerms] = useState('36 months')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedDecisions, setCompletedDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [currentStep, setCurrentStep] = useState(1)

  useEffect(() => {
    fetchDashboard()
      .then((res) => {
        setData(res)
        setIsSimulated(false)
      })
      .catch((err) => {
        console.warn('Dashboard fetch failed, using simulated fallback.', err)
        setData(SIMULATED_DASHBOARD_DATA)
        setIsSimulated(true)
      })
      .finally(() => setLoading(false))
  }, [])

  function handleReview(applicant: ConflictApplicant) {
    setSelectedApplicant(applicant)
    setDecision(applicant.score >= 600 ? 'approved' : 'rejected')
    setInterestRate(10.5)
    setTerms('36 months')
    setNotes('')
    setCurrentStep(1)
    setDialogOpen(true)
  }

  async function handleDecisionSubmit() {
    if (!selectedApplicant) return
    setSubmitting(true)
    try {
      await submitDecision(selectedApplicant.user_id, decision, interestRate, terms)
      await submitKnowledge(selectedApplicant.user_id, notes, [
        { role: 'system', content: `Applicant core score: ${selectedApplicant.score}. Conflicting signals: ${selectedApplicant.conflicts.join(', ')}` },
        { role: 'officer', content: `Interest rate set at ${interestRate}% for ${terms}. Decision: ${decision}.` }
      ])
      
      setCompletedDecisions((prev) => ({
        ...prev,
        [selectedApplicant.user_id]: decision,
      }))
      setDialogOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header>
        <div className='me-auto' />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6 flex items-center justify-between'>
          <div>
            <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
              Loan Officer Dashboard
            </h1>
            <p className='text-sm text-muted-foreground'>
              Assessment population overview and contradiction review queue
            </p>
          </div>
          {isSimulated && (
            <Badge variant='outline' className='bg-yellow-500/10 text-yellow-500 border-yellow-500/20 px-3 py-1 font-mono text-xs animate-pulse'>
              Simulated Data
            </Badge>
          )}
        </div>

        {loading || !data ? (
          <div className='space-y-4'>
            <LoadingSkeleton />
          </div>
        ) : (
          <div className='space-y-4'>
            <StatsCards data={data} />

            <div className='grid gap-4 lg:grid-cols-3'>
              <div className='lg:col-span-2'>
                <DistributionChart data={data} />
              </div>
              <FairnessCard data={data} />
            </div>

            <ConflictsTable
              data={data}
              completedDecisions={completedDecisions}
              onReview={handleReview}
            />
          </div>
        )}
      </Main>

      {selectedApplicant && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className='sm:max-w-[480px]'>
            <DialogHeader>
              <DialogTitle className='tracking-tight'>Review Credit Application</DialogTitle>
              <DialogDescription>
                Resolve contradictory indicators and log final officer decision parameters.
              </DialogDescription>
            </DialogHeader>

            <Stepper
              initialStep={1}
              onStepChange={setCurrentStep}
              onFinalStepCompleted={handleDecisionSubmit}
              onCancel={() => setDialogOpen(false)}
              nextButtonProps={{
                disabled: submitting || (currentStep === 3 && !notes.trim())
              }}
              backButtonProps={{
                disabled: submitting
              }}
              stepCircleContainerClassName='border-0 shadow-none bg-transparent w-full p-0'
              className='w-full p-0 min-h-0 aspect-auto bg-transparent border-0 flex-none'
            >
              <Step>
                <div className='space-y-4 py-2 text-sm'>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 1: Applicant Signals</h3>
                  <div className='rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-2.5'>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Applicant UUID</span>
                      <span className='font-mono font-medium'>{selectedApplicant.user_id.slice(0, 18)}...</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Model Score</span>
                      <span className='font-bold'>{selectedApplicant.score} / 850</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Risk Band</span>
                      <span className='font-semibold'>{selectedApplicant.band}</span>
                    </div>
                    <div className='space-y-1 pt-1.5 border-t border-neutral-100 dark:border-neutral-800'>
                      <span className='text-neutral-500 font-medium block'>Conflicting Signals</span>
                      {selectedApplicant.conflicts.map((c, i) => (
                        <p key={i} className='text-xs text-muted-foreground leading-relaxed'>• {c}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </Step>

              <Step>
                <div className='space-y-4 py-2 text-sm'>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 2: Credit Decision</h3>
                  <div className='space-y-3.5'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='decision'>Officer Credit Decision</Label>
                      <select
                        id='decision'
                        value={decision}
                        onChange={(e) => setDecision(e.target.value as 'approved' | 'rejected')}
                        className='w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-50'
                      >
                        <option value='approved'>Approve Loan</option>
                        <option value='rejected'>Reject Loan</option>
                      </select>
                    </div>

                    {decision === 'approved' && (
                      <div className='grid grid-cols-2 gap-3.5'>
                        <div className='space-y-1.5'>
                          <Label htmlFor='rate'>Interest Rate (%)</Label>
                          <Input
                            id='rate'
                            type='number'
                            step='0.1'
                            value={interestRate}
                            onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className='space-y-1.5'>
                          <Label htmlFor='terms'>Repayment Terms</Label>
                          <Input
                            id='terms'
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Step>

              <Step>
                <div className='space-y-4 py-2 text-sm'>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 3: Reasoning & Audit Log</h3>
                  <div className='space-y-1.5'>
                    <Label htmlFor='notes'>Decision Notes & Reasoning</Label>
                    <Textarea
                      id='notes'
                      placeholder='Explain rationale for override, collateral status, or mitigating factors...'
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                    <p className='text-xs text-muted-foreground mt-1'>Notes are required to submit overriding decision logs.</p>
                  </div>
                </div>
              </Step>
            </Stepper>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
