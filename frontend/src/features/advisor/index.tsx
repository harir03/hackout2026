import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Send, BookOpen, Loader2, Bot, User } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { askAdvisor } from '@/lib/api'
import type { AdvisorResponse } from '@/lib/types'

interface ChatEntry {
  role: 'user' | 'advisor'
  content: string
  sources?: AdvisorResponse['sources']
}

const SUGGESTED_QUESTIONS = [
  'Why was my return rate flagged?',
  'What can I do to improve my score in 6 months?',
  'Which data sources affected my score the most?',
  'Can I dispute inaccuracies in my telecom data?',
  'What happens if I withdraw consent for a data source?',
]

export function AdvisorPage() {
  const search = useSearch({ strict: false }) as { userId?: string }
  const userId = search.userId || 'test-user-001'

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChatEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleAsk(question: string) {
    if (!question.trim()) return
    setError(null)
    setHistory((prev) => [...prev, { role: 'user', content: question }])
    setInput('')
    setLoading(true)

    try {
      const response = await askAdvisor(userId, question)
      setHistory((prev) => [
        ...prev,
        {
          role: 'advisor',
          content: response.answer,
          sources: response.sources,
        },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to get a response right now'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>Credit Advisor</h1>
        <p className='text-sm text-muted-foreground'>
          Ask questions about your credit score, improvement steps, or your
          rights as a borrower. Answers reference your assessment data and
          regulatory guidelines.
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-4'>
        <div className='lg:col-span-3'>
          <Card className='flex h-[520px] flex-col hover:shadow-none'>
            <CardContent className='flex flex-1 flex-col overflow-hidden p-0'>
              <div className='flex-1 space-y-4 overflow-y-auto p-4'>
                {history.length === 0 && (
                  <div className='flex h-full flex-col items-center justify-center text-center'>
                    <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-vercel-blue/10'>
                      <Bot className='h-7 w-7 text-vercel-blue' />
                    </div>
                    <p className='text-sm text-muted-foreground'>
                      Ask a question about your credit assessment or select
                      one of the suggested questions.
                    </p>
                  </div>
                )}

                {history.map((entry, i) => (
                  <div key={i} className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : ''}`}>
                    {entry.role === 'advisor' && (
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vercel-blue/10'>
                        <Bot className='h-4 w-4 text-vercel-blue' />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-[16px] px-5 py-4 ${
                        entry.role === 'user'
                          ? 'bg-foreground text-background'
                          : 'bg-sky-wash text-ink dark:bg-sky-wash/10 dark:text-foreground'
                      }`}
                    >
                      <div className='whitespace-pre-wrap text-sm'>{entry.content}</div>
                      {entry.sources && entry.sources.length > 0 && (
                        <div className='mt-3 border-t border-border/50 pt-2'>
                          <p className='mb-1 text-xs font-semibold text-muted-foreground'>
                            Sources:
                          </p>
                          {entry.sources.map((src, j) => (
                            <div
                              key={j}
                              className='mb-1 rounded-md bg-background/50 p-2 text-xs'
                            >
                              <div className='flex items-center gap-1'>
                                <BookOpen className='h-3 w-3' />
                                <span className='font-medium'>
                                  [{j + 1}] {src.source.replace(/_/g, ' ')}
                                </span>
                                <Badge variant='outline' className='ml-auto text-xs'>
                                  {src.id}
                                </Badge>
                              </div>
                              <p className='mt-1 text-muted-foreground line-clamp-2'>
                                {src.excerpt}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {entry.role === 'user' && (
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground'>
                        <User className='h-4 w-4 text-background' />
                      </div>
                    )}
                  </div>
                ))}

                 {loading && (
                  <div className='flex gap-3'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-vercel-blue/10'>
                      <Bot className='h-4 w-4 text-vercel-blue' />
                    </div>
                    <div className='flex items-center gap-2 rounded-lg bg-sky-wash/30 text-ink px-4 py-3'>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      <span className='text-sm text-muted-foreground'>
                        Looking up relevant guidelines…
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
                    {error}
                  </div>
                )}
              </div>

              <div className='border-t border-dove/30 p-4 bg-fog/30 rounded-b-[24px]'>
                <div className='flex items-center gap-3 rounded-[20px] border border-dove/80 bg-background px-4 py-2 shadow-xs focus-within:border-graphite transition-colors duration-200'>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='Ask about your score, rights, or improvement steps…'
                    className='flex-1 min-h-[36px] resize-none border-none bg-transparent py-2.5 px-0 text-[15px] leading-relaxed placeholder:text-graphite shadow-none outline-none focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAsk(input)
                      }
                    }}
                  />
                  <Button
                    onClick={() => handleAsk(input)}
                    disabled={!input.trim() || loading}
                    className='shrink-0 h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center p-0 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 active:scale-95 transition-all duration-200'
                  >
                    <Send className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className='lg:col-span-1'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-sm'>Common Questions</CardTitle>
              <CardDescription className='text-xs'>
                Select a question or type your own
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-2'>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(q)}
                  disabled={loading}
                  className='w-full rounded-lg border px-3 py-2.5 text-left text-xs transition-all duration-200 hover:bg-muted hover:shadow-sm disabled:opacity-50'
                >
                  {q}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
