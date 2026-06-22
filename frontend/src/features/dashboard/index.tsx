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
import { ThemeSwitch } from '@/components/theme-switch'
import { fetchDashboard } from '@/lib/api'
import type { DashboardOverview } from '@/lib/types'

const BAND_COLORS: Record<string, string> = {
  'Excellent': 'bg-emerald-500',
  'Good': 'bg-green-500',
  'Fair': 'bg-yellow-500',
  'Poor': 'bg-orange-500',
  'Not Eligible': 'bg-red-500',
}

const BAND_BG: Record<string, string> = {
  'Excellent': 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
  'Good': 'bg-green-500/20 text-green-700 dark:text-green-400',
  'Fair': 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  'Poor': 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
  'Not Eligible': 'bg-red-500/20 text-red-700 dark:text-red-400',
}

function StatsCards({ data }: { data: DashboardOverview }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Total Scored</CardTitle>
          <Users className='h-4 w-4 text-muted-foreground' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{data.total_scored}</div>
          <p className='text-xs text-muted-foreground'>Applicants assessed</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Approval Rate</CardTitle>
          <CheckCircle2 className='h-4 w-4 text-emerald-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{data.approval_rate}%</div>
          <p className='text-xs text-muted-foreground'>Score ≥ 500 (Good or above)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Contradiction Review</CardTitle>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{data.conflict_count}</div>
          <p className='text-xs text-muted-foreground'>
            Flagged for conflicting signals
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='text-sm font-medium'>Hard Blocked</CardTitle>
          <ShieldAlert className='h-4 w-4 text-red-500' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{data.hard_cap_count}</div>
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
                    className={`absolute left-0 top-0 h-full rounded-md transition-all ${BAND_COLORS[band.band] ?? 'bg-muted-foreground'}`}
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

function ConflictsTable({ data }: { data: DashboardOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-base'>
          <AlertTriangle className='h-4 w-4 text-amber-500' />
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flagged_applicants.map((applicant) => (
                <TableRow key={applicant.user_id}>
                  <TableCell className='font-mono text-sm'>
                    {applicant.user_id}
                  </TableCell>
                  <TableCell className='font-semibold'>
                    {applicant.score}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='secondary'
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
                </TableRow>
              ))}
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
          <ShieldCheck className='h-4 w-4 text-emerald-500' />
          Fairness Audit
        </CardTitle>
        <CardDescription>
          Demographic parity check across protected groups
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div className='flex items-center justify-between'>
          <span className='text-sm'>Disparate Impact Ratio</span>
          <span className='text-lg font-bold'>
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

export function LoanOfficerDashboard() {
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Header>
        <div className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>
            Loan Officer Dashboard
          </h1>
          <p className='text-sm text-muted-foreground'>
            Assessment population overview and contradiction review queue
          </p>
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

            <ConflictsTable data={data} />
          </div>
        )}
      </Main>
    </>
  )
}
