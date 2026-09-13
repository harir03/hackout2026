import { useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Send, BookOpen, Loader2, Bot, User, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
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

const LANG_BCP47: Record<string, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  gu: 'gu-IN',
  ta: 'ta-IN',
}

export function AdvisorPage() {
  const { t, i18n } = useTranslation()
  const search = useSearch({ strict: false }) as { userId?: string }
  const userId = search.userId || 'test-user-001'

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<ChatEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null)

  function handleToggleSpeak(index: number, text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    if (speakingIndex === index) {
      window.speechSynthesis.cancel()
      setSpeakingIndex(null)
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    const lang = i18n?.language || 'en'
    utterance.lang = LANG_BCP47[lang] || 'en-IN'
    utterance.rate = 0.95
    utterance.onend = () => setSpeakingIndex(null)
    utterance.onerror = () => setSpeakingIndex(null)
    setSpeakingIndex(index)
    window.speechSynthesis.speak(utterance)
  }

  function toggleListening() {
    if (typeof window === 'undefined') return
    const win = window as any
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      setError(t('advisor.speechNotSupported', 'Voice recognition is not supported in this browser.'))
      return
    }

    if (isListening) {
      setIsListening(false)
      return
    }

    try {
      const rec = new SpeechRecognitionClass()
      rec.continuous = false
      rec.interimResults = false
      const lang = i18n?.language || 'en'
      rec.lang = LANG_BCP47[lang] || 'en-IN'

      rec.onstart = () => setIsListening(true)
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        if (transcript.trim()) {
          setInput((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()))
        }
      }
      rec.onerror = () => setIsListening(false)
      rec.onend = () => setIsListening(false)
      rec.start()
    } catch {
      setIsListening(false)
    }
  }

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
        <h1 className='font-signifier text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>{t('advisor.title', 'AI Credit Advisor & RAG Assistant')}</h1>
        <p className='text-sm text-muted-foreground'>
          {t('advisor.subtitle', 'Ask questions about your credit score, improvement steps, or your rights as a borrower.')}
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-4'>
        <div className='lg:col-span-3'>
          <Card className='flex h-[520px] flex-col hover:shadow-none'>
            <CardContent className='flex flex-1 flex-col overflow-hidden p-0'>
              <div className='flex-1 space-y-4 overflow-y-auto p-4'>
                {history.length === 0 && (
                  <div className='flex h-full flex-col items-center justify-center text-center'>
                    <div className='mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue/10'>
                      <Bot className='h-7 w-7 text-brand-blue' />
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
                      <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10'>
                        <Bot className='h-4 w-4 text-brand-blue' />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-[16px] px-5 py-4 ${
                        entry.role === 'user'
                          ? 'bg-foreground text-background'
                          : 'bg-sky-wash text-ink dark:bg-sky-wash/10 dark:text-foreground'
                      }`}
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div className='whitespace-pre-wrap text-sm leading-relaxed'>{entry.content}</div>
                        {entry.role === 'advisor' && (
                          <button
                            type='button'
                            onClick={() => handleToggleSpeak(i, entry.content)}
                            className='shrink-0 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors'
                            title={speakingIndex === i ? 'Stop readout' : 'Read answer aloud'}
                          >
                            {speakingIndex === i ? (
                              <VolumeX className='h-4 w-4 text-brand-blue animate-pulse' />
                            ) : (
                              <Volume2 className='h-4 w-4' />
                            )}
                          </button>
                        )}
                      </div>
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
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue/10'>
                      <Bot className='h-4 w-4 text-brand-blue' />
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
                    placeholder={t('advisor.placeholder', 'Ask a question about your score, loan eligibility, or financial advice...')}
                    className='flex-1 min-h-[36px] resize-none border-none bg-transparent py-2.5 px-0 text-[15px] leading-relaxed placeholder:text-graphite shadow-none outline-none focus-visible:border-none focus-visible:ring-0 focus-visible:ring-offset-0'
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAsk(input)
                      }
                    }}
                  />
                  <button
                    type='button'
                    onClick={toggleListening}
                    className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    title={isListening ? 'Listening… click to stop' : 'Click to speak your question'}
                  >
                    {isListening ? <MicOff className='h-4 w-4' /> : <Mic className='h-4 w-4' />}
                  </button>
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
              <CardTitle className='text-sm'>{t('advisor.suggestedQuestions', 'Suggested Questions')}</CardTitle>
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
