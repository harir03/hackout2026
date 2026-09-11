import { useEffect, useState, useRef } from 'react'
import { Send, Bot, User, Loader2, Search, Filter } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { fetchAllDecisions, askAdvisor } from '@/lib/api'
import type { DecisionRecord } from '@/lib/api'

type FilterStatus = 'all' | 'approved' | 'rejected'

export function DecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')

  const [selectedDecision, setSelectedDecision] = useState<DecisionRecord | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [advisorMessages, setAdvisorMessages] = useState<Array<{ role: 'user' | 'advisor'; content: string }>>([])
  const [advisorInput, setAdvisorInput] = useState('')
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchAllDecisions()
      .then(setDecisions)
      .catch(() => setDecisions([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = decisions.filter((d) => {
    const matchesStatus = statusFilter === 'all' || d.decision === statusFilter
    const matchesSearch = !searchQuery || d.user_id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const approvedCount = decisions.filter((d) => d.decision === 'approved').length
  const rejectedCount = decisions.filter((d) => d.decision === 'rejected').length

  function openAdvisorChat(d: DecisionRecord) {
    setSelectedDecision(d)
    setAdvisorMessages([])
    setAdvisorInput('')
    setDialogOpen(true)
  }

  async function handleAdvisorAsk() {
    if (!advisorInput.trim() || !selectedDecision) return
    const question = advisorInput.trim()
    setAdvisorMessages((prev) => [...prev, { role: 'user', content: question }])
    setAdvisorInput('')
    setAdvisorLoading(true)
    try {
      const res = await askAdvisor(selectedDecision.user_id, question)
      setAdvisorMessages((prev) => [...prev, { role: 'advisor', content: res.answer }])
    } catch {
      setAdvisorMessages((prev) => [...prev, { role: 'advisor', content: 'Unable to get a response. Please try again.' }])
    } finally {
      setAdvisorLoading(false)
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='ml-auto flex items-center space-x-4'>
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-6'>
          <h1 className='text-2xl font-bold tracking-tight'>All Decisions</h1>
          <p className='text-sm text-muted-foreground'>
            Review all approved and rejected credit applications with officer notes.
          </p>
        </div>

        <div className='grid gap-4 md:grid-cols-3 mb-6'>
          <Card className='cursor-pointer transition-colors hover:border-foreground/20' onClick={() => setStatusFilter('all')}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Total Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold'>{decisions.length}</div>
            </CardContent>
          </Card>
          <Card className='cursor-pointer transition-colors hover:border-brand-blue/40' onClick={() => setStatusFilter('approved')}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-brand-blue'>{approvedCount}</div>
            </CardContent>
          </Card>
          <Card className='cursor-pointer transition-colors hover:border-rust/40' onClick={() => setStatusFilter('rejected')}>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium text-muted-foreground'>Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-3xl font-bold text-rust'>{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className='pb-3'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <CardTitle className='text-base'>Decision Log</CardTitle>
              <div className='flex items-center gap-2'>
                <div className='relative'>
                  <Search className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input
                    placeholder='Search applicant...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-8 h-8 text-xs w-48'
                  />
                </div>
                <div className='flex items-center gap-1 border border-border rounded-md p-0.5'>
                  <Filter className='h-3.5 w-3.5 text-muted-foreground ml-1.5' />
                  {(['all', 'approved', 'rejected'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={`text-[11px] px-2 py-1 rounded transition-colors capitalize ${
                        statusFilter === s
                          ? 'bg-foreground text-background font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='space-y-3'>
                {[1, 2, 3].map((i) => <Skeleton key={i} className='h-12 w-full' />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className='text-sm text-muted-foreground text-center py-8'>
                No decisions found{statusFilter !== 'all' ? ` with status "${statusFilter}"` : ''}.
              </p>
            ) : (
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='text-xs'>Applicant</TableHead>
                      <TableHead className='text-xs'>Status</TableHead>
                      <TableHead className='text-xs'>Rate</TableHead>
                      <TableHead className='text-xs'>Terms</TableHead>
                      <TableHead className='text-xs'>Officer Notes</TableHead>
                      <TableHead className='text-xs'>Date</TableHead>
                      <TableHead className='text-xs text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((d) => (
                      <TableRow key={d.user_id}>
                        <TableCell className='font-mono text-xs'>{d.user_id}</TableCell>
                        <TableCell>
                          <Badge
                            variant='outline'
                            className={d.decision === 'approved'
                              ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
                              : 'bg-rust/10 text-rust border-rust/30'
                            }
                          >
                            {d.decision}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-xs'>
                          {d.decision === 'approved' ? `${d.interest_rate}%` : '—'}
                        </TableCell>
                        <TableCell className='text-xs'>
                          {d.decision === 'approved' ? d.terms : '—'}
                        </TableCell>
                        <TableCell className='text-xs max-w-[200px] truncate text-muted-foreground'>
                          {d.notes || '—'}
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {d.timestamp ? new Date(d.timestamp).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            size='sm'
                            variant='outline'
                            className='h-7 text-xs'
                            onClick={() => openAdvisorChat(d)}
                          >
                            AI Chat
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </Main>

      {selectedDecision && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className='sm:max-w-[560px] max-h-[80vh] overflow-y-auto'>
            <DialogHeader>
              <DialogTitle className='tracking-tight text-base'>
                AI Advisor — {selectedDecision.user_id}
              </DialogTitle>
            </DialogHeader>

            <div className='rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-3 space-y-1.5 text-xs'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground font-medium'>Decision</span>
                <Badge
                  variant='outline'
                  className={selectedDecision.decision === 'approved'
                    ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/30'
                    : 'bg-rust/10 text-rust border-rust/30'
                  }
                >
                  {selectedDecision.decision}
                </Badge>
              </div>
              {selectedDecision.decision === 'approved' && (
                <>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground font-medium'>Rate</span>
                    <span>{selectedDecision.interest_rate}%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground font-medium'>Terms</span>
                    <span>{selectedDecision.terms}</span>
                  </div>
                </>
              )}
              {selectedDecision.notes && (
                <div className='pt-1.5 border-t border-neutral-100 dark:border-neutral-800'>
                  <span className='text-muted-foreground font-medium block mb-0.5'>Officer Notes</span>
                  <p className='text-foreground leading-relaxed'>{selectedDecision.notes}</p>
                </div>
              )}
            </div>

            <div className='rounded-lg border border-neutral-200 dark:border-neutral-800 h-[280px] flex flex-col'>
              <div className='flex-1 overflow-y-auto p-3 space-y-3'>
                {advisorMessages.length === 0 && (
                  <div className='flex flex-col items-center justify-center h-full gap-2 text-muted-foreground'>
                    <Bot className='h-6 w-6 opacity-40' />
                    <p className='text-xs'>Ask the AI about this applicant&apos;s credit profile</p>
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
                  placeholder='Why was this applicant approved/rejected?'
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
                'Why was this decision made?',
                'What were the key risk factors?',
                'How can this applicant improve?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setAdvisorInput(q)}
                  className='text-[10px] px-2 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-muted-foreground'
                >
                  {q}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
