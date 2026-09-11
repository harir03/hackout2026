import { useEffect, useState, useRef } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Send,
  Loader2,
  Bot,
  User,
  IndianRupee,
  Percent,
  Clock,
  Maximize2,
  Minimize2,
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
import { fetchDashboard, submitDecision, submitKnowledge, askAdvisor, fetchApplicantProfile, fetchEligibility, fetchInterviewSummary } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import type { DashboardOverview, ConflictApplicant, EligibilityResponse } from '@/lib/types'
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
  'Excellent': 'bg-brand-blue',
  'Good': 'bg-sky-wash',
  'Fair': 'bg-graphite',
  'Poor': 'bg-rust',
  'Not Eligible': 'bg-destructive',
}

const BAND_BG: Record<string, string> = {
  'Excellent': 'bg-brand-blue/15 text-brand-blue border-brand-blue/30',
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
          <CheckCircle2 className='h-4 w-4 text-brand-blue' />
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
          <AlertTriangle className='h-4 w-4 text-[var(--brand-warning)]' />
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
                              ? 'bg-brand-blue/15 text-brand-blue border-brand-blue/30'
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
          <ShieldCheck className='h-4 w-4 text-brand-blue' />
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

const EMPTY_DASHBOARD_DATA: DashboardOverview = {
  total_scored: 0,
  approval_rate: 0.0,
  conflict_count: 0,
  hard_cap_count: 0,
  band_distribution: [
    { band: 'Excellent', count: 0, percentage: 0.0 },
    { band: 'Good', count: 0, percentage: 0.0 },
    { band: 'Fair', count: 0, percentage: 0.0 },
    { band: 'Poor', count: 0, percentage: 0.0 },
    { band: 'Not Eligible', count: 0, percentage: 0.0 },
  ],
  flagged_applicants: [],
  fairness: {
    demographic_parity_ratio: 1.0,
    passes_four_fifths: true,
    last_audit: 'Empty'
  }
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
  const { auth } = useAuthStore()
  const user = auth.user
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSimulated, setIsSimulated] = useState(false)

  const [selectedApplicant, setSelectedApplicant] = useState<ConflictApplicant | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [interestRate, setInterestRate] = useState(10.5)
  const [terms, setTerms] = useState('36 months')
  const [approvedAmount, setApprovedAmount] = useState<number>(200000)
  const [interviewSummary, setInterviewSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedDecisions, setCompletedDecisions] = useState<Record<string, 'approved' | 'rejected'>>({})
  const [currentStep, setCurrentStep] = useState(1)


  const [applicantProfile, setApplicantProfile] = useState<{
    shap_details: Array<{ label: string; points: number; worker: string }>
    tier: string
  } | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  const [advisorMessages, setAdvisorMessages] = useState<Array<{ role: 'user' | 'advisor'; content: string }>>([])
  const [advisorInput, setAdvisorInput] = useState('')
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null)
  const [eligibilityLoading, setEligibilityLoading] = useState(false)

  useEffect(() => {
    const isAdminNoMock = user?.email === 'admin@altgrade.in' || user?.email === 'admin@altgrade.com'

    fetchDashboard(user?.email || undefined)
      .then((res) => {
        if (isAdminNoMock) {
          setData(res)
          setIsSimulated(false)
        } else {
          setData(res)
          setIsSimulated(res.total_scored === 1248)
        }
      })
      .catch((err) => {
        console.warn('Dashboard fetch failed, using fallback.', err)
        if (isAdminNoMock) {
          setData(EMPTY_DASHBOARD_DATA)
          setIsSimulated(false)
        } else {
          setData(SIMULATED_DASHBOARD_DATA)
          setIsSimulated(true)
        }
      })
      .finally(() => setLoading(false))
  }, [user?.email])

  function handleReview(applicant: ConflictApplicant) {
    setSelectedApplicant(applicant)
    setDecision(applicant.score >= 600 ? 'approved' : 'rejected')
    setInterestRate(10.5)
    setTerms('36 months')
    setApprovedAmount(200000)
    setInterviewSummary('')
    setNotes('')
    setCurrentStep(1)
    setAdvisorMessages([])
    setAdvisorInput('')
    setApplicantProfile(null)
    setDialogOpen(true)
    setIsExpanded(false)

    setProfileLoading(true)
    fetchApplicantProfile(applicant.user_id)
      .then((p) => setApplicantProfile({ shap_details: p.shap_details, tier: p.tier }))
      .catch(() => setApplicantProfile(null))
      .finally(() => setProfileLoading(false))

    setSummaryLoading(true)
    fetchInterviewSummary(applicant.user_id)
      .then((res) => {
        if (res.summary) {
          setInterviewSummary(res.summary)
        }
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false))

    setEligibilityLoading(true)
    setEligibility(null)
    fetchEligibility(applicant.user_id, applicant.score, applicant.band)
      .then((e) => {
        setEligibility(e)
        if (e.is_eligible) {
          setInterestRate(e.interest_rate_annual)
          setApprovedAmount(e.max_loan_amount)
          const maxTenure = e.tenure_options[e.tenure_options.length - 1]
          if (maxTenure) setTerms(`${maxTenure.tenure_months} months`)
        }
      })
      .catch(() => setEligibility(null))
      .finally(() => setEligibilityLoading(false))
  }

  async function handleAdvisorAsk() {
    if (!advisorInput.trim() || !selectedApplicant) return
    const question = advisorInput.trim()
    setAdvisorMessages((prev) => [...prev, { role: 'user', content: question }])
    setAdvisorInput('')
    setAdvisorLoading(true)
    try {
      const res = await askAdvisor(selectedApplicant.user_id, question)
      setAdvisorMessages((prev) => [...prev, { role: 'advisor', content: res.answer }])
    } catch {
      setAdvisorMessages((prev) => [...prev, { role: 'advisor', content: 'Unable to get a response. Please try again.' }])
    } finally {
      setAdvisorLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function handleDecisionSubmit() {
    if (!selectedApplicant) return
    setSubmitting(true)
    try {
      await submitDecision(selectedApplicant.user_id, decision, interestRate, terms, notes, approvedAmount)
      const chatLog = advisorMessages.map((m) => ({ role: m.role === 'advisor' ? 'assistant' : 'officer', content: m.content }))
      await submitKnowledge(selectedApplicant.user_id, notes, [
        { role: 'system', content: `Applicant core score: ${selectedApplicant.score}. Conflicting signals: ${selectedApplicant.conflicts.join(', ')}` },
        { role: 'officer', content: `Approved Amount: ₹${approvedAmount}. Interest rate set at ${interestRate}% for ${terms}. Decision: ${decision}.` },
        ...chatLog,
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
          {isSimulated && user?.email !== 'testadmin@altgrade.in' && (
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
          <DialogContent className={`transition-all duration-300 flex flex-col ${
            isExpanded
              ? 'max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] md:max-w-[95vw] lg:max-w-[95vw] xl:max-w-[95vw] p-6'
              : 'sm:max-w-[640px] max-h-[85vh] overflow-y-auto'
          }`}>
            <DialogHeader className='relative pr-10 shrink-0'>
              <div className='flex items-center justify-between'>
                <DialogTitle className='tracking-tight'>Review Credit Application</DialogTitle>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='absolute right-10 top-0 h-6 w-6 text-muted-foreground hover:text-foreground'
                >
                  {isExpanded ? <Minimize2 className='h-4 w-4' /> : <Maximize2 className='h-4 w-4' />}
                </Button>
              </div>
              <DialogDescription>
                Inspect per-source scores, consult the AI advisor, then log your final decision.
              </DialogDescription>
            </DialogHeader>

            <Stepper
              initialStep={1}
              onStepChange={setCurrentStep}
              onFinalStepCompleted={handleDecisionSubmit}
              onCancel={() => setDialogOpen(false)}
              nextButtonProps={{
                disabled: submitting || (currentStep === 4 && !notes.trim())
              }}
              backButtonProps={{
                disabled: submitting
              }}
              stepCircleContainerClassName='border-0 shadow-none bg-transparent w-full p-0 shrink-0'
              className={`w-full p-0 min-h-0 aspect-auto bg-transparent border-0 flex-1 flex flex-col ${isExpanded ? 'overflow-hidden' : 'flex-none'}`}
            >
              <Step>
                <div className={`space-y-4 py-2 text-sm ${isExpanded ? 'overflow-y-auto max-h-[70vh] pr-2' : ''}`}>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 1: Per-Source Score Breakdown</h3>
                  <div className='rounded-lg bg-neutral-50 p-3.5 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 space-y-2.5'>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Applicant</span>
                      <span className='font-mono font-medium'>{selectedApplicant.user_id}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Model Score</span>
                      <span className='font-bold'>{selectedApplicant.score} / 850</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-neutral-500 font-medium'>Risk Band</span>
                      <Badge variant='outline' className={BAND_BG[selectedApplicant.band] ?? ''}>{selectedApplicant.band}</Badge>
                    </div>
                  </div>

                  {profileLoading ? (
                    <div className='space-y-2'>
                      {[1,2,3,4,5].map((i) => <Skeleton key={i} className='h-5 w-full' />)}
                    </div>
                  ) : applicantProfile?.shap_details && applicantProfile.shap_details.length > 0 ? (
                    <div className='space-y-1.5'>
                      <span className='text-xs font-medium text-neutral-500 uppercase tracking-wider'>SHAP Feature Contributions</span>
                      {[...applicantProfile.shap_details]
                        .sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
                        .slice(0, 10)
                        .map((f, i) => {
                          const maxAbs = Math.max(...applicantProfile.shap_details.map(s => Math.abs(s.points)), 1)
                          const pct = Math.min((Math.abs(f.points) / maxAbs) * 100, 100)
                          const positive = f.points > 0
                          return (
                            <div key={i} className='flex items-center gap-2'>
                              <span className='w-32 shrink-0 text-right text-[11px] font-medium text-muted-foreground truncate'>
                                {f.label.replace(/^(bank_|telecom_|ecom_|loc_|psych_|merchant_)/, '')}
                              </span>
                              <div className='flex-1 h-4 relative'>
                                <div className='absolute left-1/2 h-full w-px bg-border' />
                                {positive ? (
                                  <div className='absolute left-1/2 h-full rounded-r bg-brand-blue/70' style={{ width: `${pct / 2}%` }} />
                                ) : (
                                  <div className='absolute h-full rounded-l bg-rust/70' style={{ width: `${pct / 2}%`, right: '50%' }} />
                                )}
                              </div>
                              <span className={`w-14 text-right text-[11px] font-semibold ${positive ? 'text-brand-blue' : 'text-rust'}`}>
                                {f.points > 0 ? '+' : ''}{f.points.toFixed(1)}
                              </span>
                              <Badge variant='outline' className='text-[10px] px-1.5 py-0'>{f.worker}</Badge>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground'>No detailed SHAP data available for this applicant.</p>
                  )}

                  <div className='space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800'>
                    <span className='text-xs font-medium text-neutral-500 uppercase tracking-wider'>Conflicting Signals</span>
                    {selectedApplicant.conflicts.map((c, i) => (
                      <p key={i} className='text-xs text-muted-foreground leading-relaxed'>• {c}</p>
                    ))}
                  </div>

                  {summaryLoading ? (
                    <div className='space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800'>
                      <span className='text-xs font-medium text-neutral-500 uppercase tracking-wider block'>AI Conflict Interview</span>
                      <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <Loader2 className='h-3 w-3 animate-spin text-neutral-500' /> Loading interview summary...
                      </div>
                    </div>
                  ) : interviewSummary ? (
                    <div className='space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 p-2.5 rounded-lg border border-rust/10'>
                      <span className='text-xs font-semibold text-rust uppercase tracking-wider block'>AI Conflict Interview Summary</span>
                      <p className='text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap'>{interviewSummary}</p>
                    </div>
                  ) : null}

                  <div className='space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800'>
                    <span className='text-xs font-medium text-neutral-500 uppercase tracking-wider'>Loan Eligibility</span>
                    {eligibilityLoading ? (
                      <div className='flex items-center gap-2 text-muted-foreground'>
                        <Loader2 className='h-3 w-3 animate-spin' />
                        <span className='text-xs'>Loading eligibility...</span>
                      </div>
                    ) : eligibility?.is_eligible ? (
                      <div className='grid grid-cols-3 gap-2'>
                        <div className='rounded-lg bg-brand-blue/5 border border-brand-blue/20 p-2.5 text-center'>
                          <IndianRupee className='h-3.5 w-3.5 text-brand-blue mx-auto mb-1' />
                          <div className='text-sm font-bold'>{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(eligibility.max_loan_amount)}</div>
                          <div className='text-[10px] text-muted-foreground'>Max Amount</div>
                        </div>
                        <div className='rounded-lg bg-brand-blue/5 border border-brand-blue/20 p-2.5 text-center'>
                          <Percent className='h-3.5 w-3.5 text-brand-blue mx-auto mb-1' />
                          <div className='text-sm font-bold'>{eligibility.interest_rate_annual}%</div>
                          <div className='text-[10px] text-muted-foreground'>Annual Rate</div>
                        </div>
                        <div className='rounded-lg bg-brand-blue/5 border border-brand-blue/20 p-2.5 text-center'>
                          <Clock className='h-3.5 w-3.5 text-brand-blue mx-auto mb-1' />
                          <div className='text-sm font-bold'>{eligibility.tenure_options[eligibility.tenure_options.length - 1]?.tenure_months || 0}m</div>
                          <div className='text-[10px] text-muted-foreground'>Max Tenure</div>
                        </div>
                      </div>
                    ) : (
                      <p className='text-xs text-rust'>Not eligible for loan based on current score.</p>
                    )}
                  </div>
                </div>
              </Step>

              <Step>
                <div className={`space-y-3 py-2 text-sm ${isExpanded ? 'flex flex-col flex-1 overflow-hidden h-[70vh] pr-2' : ''}`}>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 2: AI Credit Advisor</h3>
                  <p className='text-xs text-muted-foreground shrink-0'>Ask the AI about this applicant&apos;s score factors, risk indicators, or regulatory context.</p>

                  <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 flex flex-col transition-all duration-300 ${isExpanded ? 'flex-1 min-h-[300px]' : 'h-[240px]'}`}>
                    <div className='flex-1 overflow-y-auto p-3 space-y-3'>
                      {advisorMessages.length === 0 && (
                        <div className='flex flex-col items-center justify-center h-full gap-2 text-muted-foreground'>
                          <Bot className='h-6 w-6 opacity-40' />
                          <p className='text-xs'>Ask about this applicant&apos;s credit profile</p>
                        </div>
                      )}
                      {advisorMessages.map((msg, i) => (
                        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.role === 'advisor' && <Bot className='h-4 w-4 mt-1 shrink-0 text-brand-blue' />}
                          <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-foreground text-background'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-foreground'
                          }`}>
                            {msg.content}
                          </div>
                          {msg.role === 'user' && <User className='h-4 w-4 mt-1 shrink-0 text-muted-foreground' />}
                        </div>
                      ))}
                      {advisorLoading && (
                        <div className='flex gap-2 items-center text-muted-foreground'>
                          <Bot className='h-4 w-4 shrink-0 text-brand-blue' />
                          <Loader2 className='h-3 w-3 animate-spin' />
                          <span className='text-xs'>Thinking...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className='border-t border-neutral-200 dark:border-neutral-800 p-2 flex gap-2'>
                      <Input
                        placeholder='Why is the return rate flagged?'
                        value={advisorInput}
                        onChange={(e) => setAdvisorInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdvisorAsk()}
                        className='text-xs h-8'
                        disabled={advisorLoading}
                      />
                      <Button
                        size='sm'
                        onClick={handleAdvisorAsk}
                        disabled={advisorLoading || !advisorInput.trim()}
                        className='h-8 px-3'
                      >
                        <Send className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-1.5'>
                    {[
                      'Why is this score low?',
                      'Which source hurt the most?',
                      'Is the return rate concerning?',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => { setAdvisorInput(q); }}
                        className='text-[10px] px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-muted-foreground'
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </Step>

              <Step>
                <div className={`space-y-4 py-2 text-sm ${isExpanded ? 'overflow-y-auto max-h-[70vh] pr-2' : ''}`}>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 3: Credit Decision</h3>
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
                      <div className='grid grid-cols-2 gap-3.5 animate-fade-up'>
                        <div className='col-span-2 space-y-1.5'>
                          <Label htmlFor='amount'>Approved Loan Amount (₹)</Label>
                          <Input
                            id='amount'
                            type='number'
                            value={approvedAmount}
                            onChange={(e) => setApprovedAmount(parseInt(e.target.value, 10) || 0)}
                          />
                        </div>
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
                <div className={`space-y-4 py-2 text-sm ${isExpanded ? 'overflow-y-auto max-h-[70vh] pr-2' : ''}`}>
                  <h3 className='font-medium text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1'>Step 4: Reasoning & Audit Log</h3>
                  <div className='space-y-1.5'>
                    <Label htmlFor='notes'>Decision Notes & Reasoning</Label>
                    <Textarea
                      id='notes'
                      placeholder='Explain rationale for override, collateral status, or mitigating factors...'
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                    />
                    <p className='text-xs text-muted-foreground mt-1'>Notes are required to submit. Decision will be sent as a notification to the applicant.</p>
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
