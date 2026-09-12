import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearch, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ShieldAlert,
  MessageSquare,
  Loader2,
  IndianRupee,
  Send,
  Bot,
  User,
  ChevronDown,
  Volume2,
  VolumeX,
  PhoneCall,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  fetchScore,
  fetchScoreById,
  fetchUserNotifications,
  submitInterviewSummary,
  fetchPersonalization,
} from '@/lib/api'
import type { ScoreResponse, ShapFeature } from '@/lib/types'

function bandColor(band: string): string {
  const colors: Record<string, string> = {
    Excellent: 'text-brand-blue',
    Good: 'text-graphite',
    Fair: 'text-slate',
    Poor: 'text-rust',
  }
  return colors[band] || 'text-destructive'
}

function scoreGradient(score: number): string {
  if (score >= 700) return '#0284c7'
  if (score >= 500) return '#4b5563'
  return '#dc2626'
}

function ShapBar({ feature, maxAbs }: { feature: ShapFeature; maxAbs: number }) {
  const [expanded, setExpanded] = useState(false)
  const pct = Math.min((Math.abs(feature.points) / maxAbs) * 100, 100)
  const positive = feature.points > 0

  return (
    <div className='mb-1'>
      <button
        type='button'
        onClick={() => setExpanded(!expanded)}
        className='flex items-center gap-3 py-1.5 w-full text-left hover:bg-muted/30 rounded-md px-1 transition-colors group'
      >
        <div className='w-40 shrink-0 text-right text-xs font-medium text-muted-foreground truncate'>
          {feature.label.replace(/^(bank_|telecom_|ecom_|loc_|psych_|merchant_)/, '')}
        </div>
        <div className='flex flex-1 items-center gap-1'>
          <div className='relative flex h-5 w-full items-center'>
            <div className='absolute left-1/2 h-full w-px bg-border' />
            {positive ? (
              <div
                className='absolute left-1/2 h-4 rounded-r bg-brand-blue/80'
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
                  ? 'text-brand-blue'
                  : 'text-rust'
              }`}
            >
            {feature.points > 0 ? '+' : ''}
            {feature.points.toFixed(1)}
          </span>
        </div>
        <Badge variant='outline' className='w-28 justify-center text-xs'>
          {feature.worker}
        </Badge>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && feature.explanation && (
        <div className='ml-[11rem] mr-2 mt-1 mb-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 animate-fade-up'>
          <p className='text-xs text-muted-foreground leading-relaxed'>{feature.explanation}</p>
        </div>
      )}
    </div>
  )
}

export function ScorePage() {
  const { t } = useTranslation()
  const search = useSearch({ strict: false }) as {
    userId?: string
    sources?: string
    consentId?: string
    phone?: string
    answers?: string
    timeTaken?: string
    changesCount?: string
    locationHistory?: string
  }
  const userId = search.userId || 'test-user-001'
  const consentedSources = search.sources?.split(',').filter(Boolean) ?? []
  const consentId = search.consentId
  const phone = search.phone || ''
  const answers = search.answers
  const timeTaken = search.timeTaken ? parseInt(search.timeTaken, 10) : undefined
  const changesCount = search.changesCount ? parseInt(search.changesCount, 10) : undefined
  const locationHistory = search.locationHistory

  const [data, setData] = useState<ScoreResponse | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineStep, setPipelineStep] = useState(0)
  const [notification, setNotification] = useState<{
    has_notification: boolean
    decision?: string
    interest_rate?: number
    terms?: string
  } | null>(null)

  // AI Interview State
  const [interviewOpen, setInterviewOpen] = useState(false)
  const [interviewStep, setInterviewStep] = useState(0)
  const [interviewMessages, setInterviewMessages] = useState<Array<{ role: 'bot' | 'user'; content: string }>>([])
  const [interviewInput, setInterviewInput] = useState('')
  const [isInterviewSubmitted, setIsInterviewSubmitted] = useState(false)
  const [submittingSummary, setSubmittingSummary] = useState(false)
  const [userAnswersLog, setUserAnswersLog] = useState<string[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

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
      ? fetchScore(userId, consentedSources, consentId, phone, answers, timeTaken, changesCount, locationHistory)
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

    fetchUserNotifications(userId)
      .then((n) => setNotification(n))
      .catch(() => {})

    fetchPersonalization(userId)
      .then((p) => setPersonalizeData(p))
      .catch((err) => console.error("Failed to load personalization:", err))
  }, [userId])

  const [personalizeData, setPersonalizeData] = useState<any | null>(null)
  const [viewMode, setViewMode] = useState<'simple' | 'technical'>('simple')
  const [audioLang, setAudioLang] = useState<'gu' | 'hi' | 'ta' | 'en'>('gu')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [officerModalOpen, setOfficerModalOpen] = useState(false)
  const [officerRequested, setOfficerRequested] = useState(false)

  const handlePlayAudio = (langToPlay?: 'gu' | 'hi' | 'ta' | 'en') => {
    const targetLang = langToPlay || audioLang
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel()
      setIsPlayingAudio(false)
      return
    }

    if (!('speechSynthesis' in window)) {
      toast.error('Voice synthesis not supported in this browser')
      return
    }

    window.speechSynthesis.cancel()
    const script = personalizeData?.borrower_summary?.audio_scripts?.[targetLang] ||
      personalizeData?.borrower_summary?.plain_summary ||
      `Your AltGrade credit score is ${data?.score || 700}. You qualify for loan approval.`

    const utterance = new SpeechSynthesisUtterance(script)
    const langCodes: Record<string, string> = {
      gu: 'gu-IN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      en: 'en-IN',
    }
    utterance.lang = langCodes[targetLang] || 'en-US'
    utterance.rate = 0.92

    utterance.onend = () => setIsPlayingAudio(false)
    utterance.onerror = () => setIsPlayingAudio(false)

    setIsPlayingAudio(true)
    window.speechSynthesis.speak(utterance)
  }

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

  const interviewQuestions = useMemo(() => {
    if (!data) return []

    const feat = (label: string) => data.shap_details.find(f => f.label === label)
    const val = (label: string) => feat(label)?.feature_value ?? 0

    const formatInr = (v: number) => {
      if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`
      if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`
      if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`
      return `₹${v.toFixed(0)}`
    }

    const questions: Array<{ type: 'conflict' | 'financial' | 'verification'; text: string }> = []

    const bankInflow = val('bank_avg_monthly_inflow')
    const bankVolatility = val('bank_balance_volatility')
    const telecomMissed = val('telecom_missed_payments')
    const psychEngagement = val('psych_engagement_score')
    const completionTime = val('psych_completion_time_sec')
    const straightLine = val('psych_straight_line_ratio')
    const bankPaymentReg = val('bank_payment_regularity')

    const emailLower = userId.toLowerCase()
    const isFarmer = emailLower.includes('farmer')
    const isMsme = emailLower.includes('msme')

    if (isFarmer) {
      if (bankVolatility > 0.3) {
        questions.push({ type: 'conflict', text:
          `Your bank balance fluctuates by ${(bankVolatility * 100).toFixed(0)}% month-to-month. For agricultural income, seasonal variation is expected — but we need to understand your harvest cycle. Which months do you receive harvest income, and which months have the lowest cash flow? Do you receive PM-Kisan installments regularly?`
        })
      }

      if (psychEngagement < 60) {
        questions.push({ type: 'conflict', text:
          `Your psychometric assessment scored ${psychEngagement.toFixed(0)}/100 on financial discipline. As a farmer, understanding crop loan terms and KCC repayment schedules is important. Did you rush through the questionnaire, or do you find financial planning difficult during non-harvest months?`
        })
      }

      if (completionTime < 25 && straightLine > 0.4) {
        questions.push({ type: 'conflict', text:
          `You completed the assessment in ${completionTime.toFixed(0)} seconds with ${(straightLine * 100).toFixed(0)}% identical answers. This suggests you may not have read the questions carefully. Why should we trust your self-reported financial attitudes?`
        })
      }

      if (telecomMissed > 1) {
        questions.push({ type: 'conflict', text:
          `You have ${Math.round(telecomMissed)} missed telecom payments. Even with seasonal agricultural income, a small phone recharge should be manageable. Were these missed during a difficult harvest season, or is it a general pattern?`
        })
      }

      questions.push({ type: 'financial', text:
        `Describe your primary agricultural income sources. How many acres do you farm, what crops do you grow, and what is your approximate annual harvest income? Do you receive PM-Kisan Direct Benefit Transfer (₹6,000/year)? Do you have a Kisan Credit Card (KCC) — if yes, what is the credit limit and current outstanding?`
      })

      questions.push({ type: 'financial', text:
        `What are your main farming expenses — seeds, fertilizers, labor, equipment rental? How do you fund these during non-harvest months? Do you take seasonal crop loans from any bank or cooperative?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing loans — KCC, tractor loan, SHG borrowing, or informal debts from moneylenders? List each with the lender, amount, and repayment status. Have you ever defaulted on a crop loan?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your PM-Kisan enrollment and KCC records with the district agriculture office, will everything match what you have told us? Is there anything about your financial situation — pending land disputes, shared farming income, or family obligations — that you have not disclosed?`
      })

    } else if (isMsme) {
      const gstTurnover = val('merchant_annual_turnover')
      const gstFiling = val('merchant_filing_regularity')
      const gstMonths = val('merchant_months_operating')
      const hasGst = val('merchant_has_gst')

      if (hasGst < 0.5 || gstTurnover < 50000) {
        if (bankInflow > 20000) {
          questions.push({ type: 'conflict', text:
            `Your bank account receives ${formatInr(bankInflow)}/month in inflows, but your GST records show ${hasGst < 0.5 ? 'no registered GSTIN' : `only ${formatInr(gstTurnover)} annual turnover`}. For an MSME, this gap needs explanation. Is your business below the GST threshold, or are you operating informally? Provide exact revenue sources.`
          })
        }
      } else if (gstTurnover > 100000 && bankInflow < gstTurnover / 24) {
        questions.push({ type: 'conflict', text:
          `Your GST filings declare ${formatInr(gstTurnover)} annual turnover (~${formatInr(gstTurnover / 12)}/month). But bank inflows show only ${formatInr(bankInflow)}/month — ${((bankInflow * 12 / gstTurnover) * 100).toFixed(0)}% of declared revenue. Where is the remaining ${formatInr(gstTurnover / 12 - bankInflow)}/month? Are customers paying in cash?`
        })
      }

      if (gstFiling < 0.8 && gstMonths > 12) {
        questions.push({ type: 'conflict', text:
          `Your business has operated for ${Math.round(gstMonths)} months, but GST filing regularity is ${(gstFiling * 100).toFixed(0)}%. For an MSME seeking credit, irregular filings suggest cash flow problems or poor compliance. Which months were missed and why?`
        })
      }

      if (psychEngagement < 60 && (bankInflow > 30000 || gstTurnover > 200000)) {
        questions.push({ type: 'conflict', text:
          `Your business generates ${bankInflow > 30000 ? `${formatInr(bankInflow)}/month in bank inflows` : `${formatInr(gstTurnover)} annual turnover`}, but your financial literacy assessment scored only ${psychEngagement.toFixed(0)}/100. As a business owner handling this revenue, the gap is concerning. Did you rush the questionnaire?`
        })
      }

      questions.push({ type: 'financial', text:
        `What is your MSME's exact monthly revenue and profit margin? Break down your top 3 business expenses (rent, inventory, salaries) with amounts. What is your average monthly supplier payment cycle — do you pay within 15 days, 30 days, or longer?`
      })

      questions.push({ type: 'financial', text:
        `What is your business's yearly turnover for the last financial year? How much working capital do you maintain? Do you have any outstanding supplier credit or trade payables?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing business loans, CC/OD facilities, or equipment financing? List each with lender, EMI, and remaining tenure. Have you ever restructured a business loan?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your GST returns and bank statements with your CA, will the turnover figures match exactly? Are there any pending tax disputes, legal matters, or undisclosed business obligations?`
      })

    } else {
      const gstTurnover = val('merchant_annual_turnover')
      const hasGst = val('merchant_has_gst')
      const isMetro = val('loc_is_metro')

      if (hasGst < 0.5 || gstTurnover < 50000) {
        if (isMetro >= 0.5) {
          questions.push({ type: 'conflict', text:
            `Your location data shows you are in a Tier-1 metro city, yet your GST records show ${hasGst < 0.5 ? 'no registered GSTIN' : `an annual turnover of only ${formatInr(gstTurnover)}`}. Are you salaried, self-employed, or running an unregistered business? Explain your exact income source.`
          })
        }
        if (bankInflow > 20000) {
          questions.push({ type: 'conflict', text:
            `Your bank receives ${formatInr(bankInflow)}/month, but GST records show ${hasGst < 0.5 ? 'no GSTIN' : `only ${formatInr(gstTurnover)} annual turnover`}. If you are salaried, provide your employer name and designation. If self-employed, explain the income sources.`
          })
        }
      }

      if (psychEngagement < 60 && bankInflow > 30000) {
        questions.push({ type: 'conflict', text:
          `Your bank inflows are ${formatInr(bankInflow)}/month, but your financial literacy scored only ${psychEngagement.toFixed(0)}/100. Someone earning this much should demonstrate basic financial awareness. Did you rush through the questionnaire?`
        })
      }

      if (completionTime < 25 && straightLine > 0.4) {
        questions.push({ type: 'conflict', text:
          `You completed the assessment in ${completionTime.toFixed(0)} seconds with ${(straightLine * 100).toFixed(0)}% identical answers. This strongly suggests you did not read the questions. Why should we trust your self-reported attitudes?`
        })
      }

      if (telecomMissed > 1 && bankInflow > 20000) {
        questions.push({ type: 'conflict', text:
          `You have ${Math.round(telecomMissed)} missed telecom payments, yet your bank receives ${formatInr(bankInflow)}/month. If money is coming in, why are small bills being missed?`
        })
      }

      if (bankVolatility > 0.3 && bankPaymentReg < 0.7) {
        questions.push({ type: 'conflict', text:
          `Your bank balance swings by ${(bankVolatility * 100).toFixed(0)}% month-to-month and payment regularity is only ${(bankPaymentReg * 100).toFixed(0)}%. How will you handle an additional EMI?`
        })
      }

      questions.push({ type: 'financial', text:
        `State your exact monthly take-home income (salary or business profit after all costs). Then list your top 3 fixed monthly expenses (rent, EMIs, utilities) with exact amounts. We will cross-verify these against your bank data.`
      })

      questions.push({ type: 'financial', text:
        `How much do you save or invest each month? Where — bank savings, mutual funds, gold, cash at home? Does the math add up with your stated income and expenses?`
      })

      questions.push({ type: 'verification', text:
        `Do you have any existing loans, EMIs, or credit card outstanding balances? List each with lender name, monthly EMI, and remaining tenure. Have you ever taken a loan before?`
      })

      questions.push({ type: 'verification', text:
        `If we verify your income with your employer or CA, would the numbers match? Is there anything about your finances you have not disclosed — informal debts, family obligations, or pending liabilities?`
      })
    }

    if (questions.length < 5 && data.signal_conflicts.length > 0) {
      const c = data.signal_conflicts[0]
      const negFeats = data.shap_details.filter(f => f.worker === c.negative_worker && f.points < 0)
      const posFeats = data.shap_details.filter(f => f.worker === c.positive_worker && f.points > 0)
      const topNeg = negFeats[0]
      const topPos = posFeats[0]
      if (topNeg && topPos) {
        questions.push({ type: 'conflict', text:
          `${topPos.explanation.split('.')[0]}. But on the other hand, ${topNeg.explanation.split('.')[0].toLowerCase()}. These directly contradict each other. Explain precisely what is happening.`
        })
      }
    }

    const ordered = [
      ...questions.filter(q => q.type === 'conflict').slice(0, 4),
      ...questions.filter(q => q.type === 'financial'),
      ...questions.filter(q => q.type === 'verification'),
    ]
    return ordered.slice(0, 8)
  }, [data, userId])

  const totalInterviewQuestions = interviewQuestions.length

  const analyzeAnswer = (answer: string, questionIndex: number): { reaction: string; credibility: number } => {
    const words = answer.trim().split(/\s+/)
    const wordCount = words.length
    const hasNumbers = /\d/.test(answer)
    const hasRupee = /₹|rs|lakh|lac|crore|thousand|k\/month|per month/i.test(answer)
    const vagueWords = ['sometimes', 'usually', 'maybe', 'probably', 'i think', 'not sure', 'it depends', 'hard to say', 'generally', 'approximately', 'around', 'roughly']
    const vagueCount = vagueWords.filter(w => answer.toLowerCase().includes(w)).length
    const deflectionPhrases = ['none of your', 'why do you', 'i don\'t see why', 'that\'s personal', 'i prefer not', 'no comment']
    const isDeflecting = deflectionPhrases.some(p => answer.toLowerCase().includes(p))
    const q = interviewQuestions[questionIndex]

    let credibility = 50
    let reaction = ''

    if (wordCount < 5) {
      credibility -= 30
      reaction = `That is an extremely short answer for a question about your financial situation. A one-line response does not inspire confidence.`
    } else if (wordCount < 15) {
      credibility -= 15
      reaction = `Your answer lacks detail. When a loan officer reviews this, they will want specifics — not general statements.`
    } else if (wordCount > 30) {
      credibility += 10
    }

    if (q.type === 'financial' && !hasNumbers && !hasRupee) {
      credibility -= 20
      reaction += ` You were asked for exact amounts but did not provide any numbers. This makes your response unverifiable.`
    } else if (hasNumbers && hasRupee) {
      credibility += 15
      if (!reaction) reaction = `Thank you for providing specific numbers.`
    } else if (hasNumbers) {
      credibility += 5
    }

    if (vagueCount >= 2) {
      credibility -= 15
      reaction += ` Your answer uses vague language ("${vagueWords.find(w => answer.toLowerCase().includes(w))}") multiple times. This suggests uncertainty about your own financial situation.`
    }

    if (isDeflecting) {
      credibility -= 25
      reaction += ` Refusing to answer a financial verification question is a significant red flag that will be noted in your report.`
    }

    if (q.type === 'verification' && wordCount > 20 && hasNumbers) {
      credibility += 20
      if (!reaction) reaction = `Detailed and verifiable — this strengthens your credibility.`
    }

    credibility = Math.max(10, Math.min(95, credibility))
    if (!reaction) reaction = `Recorded.`

    return { reaction: reaction.trim(), credibility }
  }

  const [answerCredibilities, setAnswerCredibilities] = useState<number[]>([])

  useEffect(() => {
    if (interviewOpen && interviewMessages.length === 0) {
      setInterviewMessages([
        {
          role: 'bot',
          content: `I am the AltGrade AI Verification Auditor. I've found contradictions in your scoring data that require clarification.\n\nThis interview has ${totalInterviewQuestions} questions in 3 phases:\n• Conflict Resolution — explain data contradictions\n• Financial Verification — provide exact income and expense figures\n• Cross-Verification — confirm consistency and disclose obligations\n\nYour answers will be scored for credibility and sent to the Loan Officer.\n\nQuestion 1 of ${totalInterviewQuestions} [${interviewQuestions[0]?.type?.toUpperCase()}]:\n${interviewQuestions[0]?.text}`
        }
      ])
      setInterviewStep(0)
      setIsInterviewSubmitted(false)
      setUserAnswersLog([])
      setAnswerCredibilities([])
    }
  }, [interviewOpen, interviewQuestions, totalInterviewQuestions])

  const handleSendInterviewMessage = async () => {
    if (!interviewInput.trim()) return
    const userMsg = interviewInput.trim()
    setInterviewInput('')

    const updatedMessages = [...interviewMessages, { role: 'user' as const, content: userMsg }]
    const updatedAnswersLog = [...userAnswersLog, userMsg]
    setInterviewMessages(updatedMessages)
    setUserAnswersLog(updatedAnswersLog)

    const { reaction, credibility } = analyzeAnswer(userMsg, interviewStep)
    const updatedCredibilities = [...answerCredibilities, credibility]
    setAnswerCredibilities(updatedCredibilities)

    setTimeout(async () => {
      if (interviewStep < totalInterviewQuestions - 1) {
        const nextStep = interviewStep + 1
        setInterviewStep(nextStep)
        const nextQ = interviewQuestions[nextStep]
        const credLabel = credibility >= 70 ? '✓ Credible' : credibility >= 40 ? '⚠ Needs verification' : '✗ Low credibility'

        setInterviewMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `[Answer credibility: ${credLabel} (${credibility}/100)]\n\n${reaction}\n\nQuestion ${nextStep + 1} of ${totalInterviewQuestions} [${nextQ.type.toUpperCase()}]:\n${nextQ.text}`
          }
        ])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } else {
        setSubmittingSummary(true)
        const avgCred = Math.round(updatedCredibilities.reduce((a, b) => a + b, 0) / updatedCredibilities.length)
        const overallLabel = avgCred >= 70 ? 'HIGH' : avgCred >= 45 ? 'MEDIUM' : 'LOW'

        const credLabel = credibility >= 70 ? '✓ Credible' : credibility >= 40 ? '⚠ Needs verification' : '✗ Low credibility'

        setInterviewMessages((prev) => [
          ...prev,
          {
            role: 'bot',
            content: `[Answer credibility: ${credLabel} (${credibility}/100)]\n\n${reaction}\n\n━━━ Interview Complete ━━━\n\nOverall Credibility Score: ${avgCred}/100 (${overallLabel})\n\nCompiling detailed report with per-answer analysis and forwarding to your Loan Officer...`
          }
        ])
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

        const summaryLines = updatedAnswersLog.map((ans, i) => {
          const cred = updatedCredibilities[i] || 50
          const label = cred >= 70 ? 'CREDIBLE' : cred >= 40 ? 'NEEDS_VERIFICATION' : 'LOW_CREDIBILITY'
          return `[${interviewQuestions[i].type.toUpperCase()}] Q${i + 1}: "${interviewQuestions[i].text}"\nAnswer: "${ans}"\nCredibility: ${cred}/100 (${label})`
        }).join('\n\n')
        const summary = `AI VERIFICATION INTERVIEW REPORT\nDate: ${new Date().toISOString().split('T')[0]}\nOverall Credibility: ${avgCred}/100 (${overallLabel})\nQuestions: ${totalInterviewQuestions} (${interviewQuestions.filter(q => q.type === 'conflict').length} conflict, ${interviewQuestions.filter(q => q.type === 'financial').length} financial, ${interviewQuestions.filter(q => q.type === 'verification').length} verification)\n\n${summaryLines}\n\nRECOMMENDATION: ${avgCred >= 70 ? 'Applicant responses are detailed and consistent. Proceed with standard verification.' : avgCred >= 45 ? 'Some answers lack specificity. Recommend manual follow-up on financial verification answers.' : 'Multiple evasive or vague answers detected. Recommend in-person interview before proceeding.'}`

        try {
          await submitInterviewSummary(userId, summary)
          setInterviewMessages((prev) => [
            ...prev,
            {
              role: 'bot',
              content: `Report submitted to Loan Officer.\n\nYour overall credibility score is ${avgCred}/100 (${overallLabel}). ${avgCred >= 70 ? 'Your responses were detailed and consistent.' : avgCred >= 45 ? 'Some of your answers need further verification.' : 'Several of your answers were flagged as evasive or vague.'}\n\nYou may now close this window.`
            }
          ])
          setIsInterviewSubmitted(true)
        } catch (err) {
          console.error("Failed to submit summary:", err)
          setInterviewMessages((prev) => [
            ...prev,
            {
              role: 'bot',
              content: "Submission failed, but your responses have been saved locally. You may close this window."
            }
          ])
          setIsInterviewSubmitted(true)
        } finally {
          setSubmittingSummary(false)
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        }
      }
    }, 1200)
  }

  if (loading) {
    return (
      <div className='max-w-md mx-auto py-12 px-4 space-y-6 animate-fade-up'>
        <div className='text-center mb-6'>
          <h1 className='font-signifier text-3xl font-normal leading-[1.2] text-foreground flex items-center justify-center gap-2'>
            <Loader2 className='h-6 w-6 animate-spin text-brand-blue' />
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
              <Card key={idx} className={`shadow-subtle transition-all duration-300 ${isActive ? 'border-brand-blue bg-brand-blue/5' : ''} ${isCompleted ? 'opacity-60' : ''}`}>
                <CardHeader className='py-3 px-4 flex flex-row items-center justify-between space-y-0'>
                  <div className='flex items-center gap-3'>
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted ? 'bg-white text-black' : isActive ? 'bg-white/20 text-white animate-pulse' : 'bg-muted text-muted-foreground'}`}>
                      {isCompleted ? '✓' : idx + 1}
                    </div>
                    <span className={`text-sm font-medium ${isActive ? 'text-white font-semibold' : ''}`}>{name}</span>
                  </div>
                  {isActive && <span className='text-xs text-white/70 font-mono animate-pulse'>Processing...</span>}
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
      {notification?.has_notification && (
        <div className={`mb-6 rounded-lg border p-4 flex items-start gap-3 animate-fade-up ${
          notification.decision === 'approved'
            ? 'bg-brand-blue/5 border-brand-blue/30'
            : 'bg-rust/5 border-rust/30'
        }`}>
          <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
            notification.decision === 'approved' ? 'bg-brand-blue/20' : 'bg-rust/20'
          }`}>
            {notification.decision === 'approved' ? (
              <svg className='h-4 w-4 text-brand-blue' fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
                <path strokeLinecap='round' strokeLinejoin='round' d='M5 13l4 4L19 7' />
              </svg>
            ) : (
              <ShieldAlert className='h-4 w-4 text-rust' />
            )}
          </div>
          <div>
            <p className={`text-sm font-semibold ${
              notification.decision === 'approved' ? 'text-brand-blue' : 'text-rust'
            }`}>
              Loan Application {notification.decision === 'approved' ? 'Approved' : 'Rejected'}
            </p>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {notification.decision === 'approved'
                ? `Your loan application has been approved at ${notification.interest_rate}% interest for ${notification.terms}.`
                : 'Your loan application was not approved after officer review. You may reapply or contact support.'}
            </p>
          </div>
        </div>
      )}

      <div className='mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='font-signifier text-[36px] sm:text-[44px] font-normal leading-[1.1] tracking-[-0.66px] text-foreground'>
            {viewMode === 'simple' ? 'Your Credit Trust Report' : t('score.title', 'AltGrade Alternate Credit Score')}
          </h1>
          <p className='text-sm text-muted-foreground mt-1'>
            {viewMode === 'simple'
              ? 'Simple, voice-guided report based on your everyday bill payments and residence stability'
              : t('score.subtitle', 'Explainable risk estimation based on multi-source non-traditional financial data')}
          </p>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={() => setViewMode(viewMode === 'simple' ? 'technical' : 'simple')}
          className='self-start sm:self-auto text-xs gap-1.5 rounded-full border-border/80 hover:bg-muted'
        >
          {viewMode === 'simple' ? (
            <>
              <Eye className='h-3.5 w-3.5 text-brand-blue' />
              <span>Technical Breakdown (Advanced)</span>
            </>
          ) : (
            <>
              <EyeOff className='h-3.5 w-3.5 text-emerald-500' />
              <span>Simple Borrower View</span>
            </>
          )}
        </Button>
      </div>

      {viewMode === 'simple' ? (
        /* ================= RADICALLY SIMPLE BORROWER VIEW (LOW-LITERACY TAILORED - VERCEL MINIMALIST) ================= */
        <div className='space-y-5 animate-fade-up'>
          {/* Main Hero Card */}
          <Card className='overflow-hidden border border-white/10 bg-black shadow-none'>
            <div className='p-6 sm:p-8 flex flex-col md:flex-row items-center gap-8 justify-between'>
              {/* Left: Big Score & Trust Badge */}
              <div className='flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left'>
                <div className='relative flex h-36 w-36 shrink-0 items-center justify-center rounded-full bg-black border border-white/15 shadow-none'>
                  <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
                    <circle
                      cx='50' cy='50' r='42'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='4'
                      className='text-white/10'
                    />
                    <circle
                      cx='50' cy='50' r='42'
                      fill='none'
                      strokeWidth='4'
                      strokeLinecap='round'
                      strokeDasharray={`${(data.score / 850) * 264} 264`}
                      stroke='#ffffff'
                      className='transition-all duration-1000'
                    />
                  </svg>
                  <div className='flex flex-col items-center justify-center'>
                    <span className='text-3xl font-extrabold tracking-tight text-white font-mono'>{data.score}</span>
                    <span className='text-[10px] uppercase tracking-widest text-white/50 font-mono'>Score</span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/15 px-3 py-1 text-xs font-medium text-white/90 font-mono'>
                    <CheckCircle2 className='h-3.5 w-3.5 text-white' />
                    <span>Eligible for Credit Approval</span>
                  </div>
                  <h2 className='text-xl sm:text-2xl font-bold tracking-tight text-white'>
                    {data.score >= 700 ? 'High Financial Trust' : 'Good Financial Standing'}
                  </h2>
                  <p className='text-xs text-white/60 max-w-sm leading-relaxed'>
                    Pre-approved credit line limit up to{' '}
                    <span className='font-bold text-white font-mono'>
                      ₹{personalizeData?.credit_limit ? personalizeData.credit_limit.toLocaleString('en-IN') : '50,000'}
                    </span>{' '}
                    at fair regulated bank interest rates.
                  </p>
                </div>
              </div>

              {/* Right: Unmissable Vernacular Voice Audio Narration */}
              <div className='w-full md:w-auto shrink-0 flex flex-col items-center sm:items-end gap-3'>
                <div className='flex items-center gap-1.5 text-xs text-white/50 font-mono'>
                  <span>Audio Language:</span>
                  <div className='flex gap-1'>
                    {(
                      [
                        { code: 'te', label: 'తెలుగు' },
                        { code: 'hi', label: 'हिंदी' },
                        { code: 'ta', label: 'தமிழ்' },
                        { code: 'en', label: 'Eng' },
                      ] as const
                    ).map((l) => (
                      <button
                        key={l.code}
                        type='button'
                        onClick={() => {
                          setAudioLang(l.code)
                          if (isPlayingAudio) {
                            window.speechSynthesis?.cancel()
                            setIsPlayingAudio(false)
                          }
                        }}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono transition-all ${
                          audioLang === l.code
                            ? 'bg-white text-black font-semibold shadow-xs'
                            : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size='lg'
                  onClick={() => handlePlayAudio()}
                  className={`w-full sm:w-auto h-11 px-5 rounded-lg font-mono text-xs gap-2 transition-all ${
                    isPlayingAudio
                      ? 'bg-white/20 text-white border border-white/40 animate-pulse'
                      : 'bg-white text-black hover:bg-white/90 shadow-none'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX className='h-4 w-4' />
                      <span>Pause Audio Readout</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className='h-4 w-4' />
                      <span>
                        {audioLang === 'gu'
                          ? '🔊 અહેવાલ સાંભળો (Gujarati)'
                          : audioLang === 'hi'
                          ? '🔊 रिपोर्ट सुनें (Hindi)'
                          : audioLang === 'ta'
                          ? '🔊 கேட்க (Tamil)'
                          : '🔊 Listen to Audio Report'}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Plain-Language Explanations (Zero Jargon) */}
            <div className='border-t border-white/10 bg-white/[0.01] p-6 grid sm:grid-cols-2 gap-4'>
              <div className='rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-1.5'>
                <div className='flex items-center gap-2 text-xs font-semibold text-white'>
                  <Sparkles className='h-3.5 w-3.5 text-white/70' />
                  <span>Why You Qualify</span>
                </div>
                <p className='text-xs text-white/70 leading-relaxed'>
                  {personalizeData?.borrower_summary?.plain_summary ||
                    "Based on your long-term residency and disciplined everyday bill payments, you have built verified financial trust without traditional bank papers."}
                </p>
              </div>

              <div className='rounded-lg border border-white/10 bg-white/[0.02] p-4 space-y-1.5'>
                <div className='flex items-center gap-2 text-xs font-semibold text-white'>
                  <ShieldCheck className='h-3.5 w-3.5 text-white/70' />
                  <span>Everyday Tip to Grow Limit</span>
                </div>
                <p className='text-xs text-white/70 leading-relaxed'>
                  {personalizeData?.borrower_summary?.plain_tip ||
                    "Keep paying your mobile recharges and electricity bills before the 5th of each month to unlock a higher credit limit."}
                </p>
              </div>
            </div>
          </Card>

          {/* Action Row */}
          <div className='flex flex-col sm:flex-row items-center gap-3 justify-between pt-2'>
            <Button
              size='lg'
              onClick={() => setOfficerModalOpen(true)}
              className='w-full sm:w-auto h-11 px-5 rounded-lg bg-white text-black hover:bg-white/90 font-mono text-xs gap-2 shadow-none'
            >
              <PhoneCall className='h-3.5 w-3.5' />
              <span>Talk to Local Loan Officer</span>
            </Button>

            <div className='flex items-center gap-2.5 w-full sm:w-auto'>
              <Link
                to='/eligibility'
                search={{ userId, score: String(data.score), band: data.risk_band }}
                className='flex-1 sm:flex-none'
              >
                <Button variant='outline' size='lg' className='w-full h-11 rounded-lg text-xs font-mono gap-2 border-white/10 hover:bg-white/5'>
                  <IndianRupee className='h-3.5 w-3.5' />
                  <span>View Loan Options</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ================= TECHNICAL UNDERWRITER VIEW (SHAP FACTORS & ADVANCED METRICS) ================= */
        <div className='grid gap-4 md:grid-cols-3 animate-fade-up'>
          <Card className='md:col-span-1'>
            <CardContent className='flex flex-col items-center justify-center py-8'>
              <div className='relative flex h-40 w-40 items-center justify-center'>
                <svg className='absolute h-full w-full -rotate-90' viewBox='0 0 100 100'>
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
              <CardTitle className='text-base'>What Affected Your Score (SHAP Attribution)</CardTitle>
              <CardDescription>
                How each alternative data factor contributed (baseline: 600 pts). Click any row for mathematical explanation.
              </CardDescription>
            </CardHeader>
            <CardContent className='max-h-[500px] overflow-y-auto'>
              {sortedShap.map((feat) => (
                <ShapBar key={feat.label} feature={feat} maxAbs={maxAbs} />
              ))}
            </CardContent>
          </Card>
        </div>
      )}

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
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
              <div>
                <CardTitle className='flex items-center gap-2 text-base text-rust'>
                  <AlertTriangle className='h-4 w-4' />
                  Conflicting Signals
                </CardTitle>
                <CardDescription>
                  Some of your data sources provided contradicting information
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='border-rust/40 text-rust hover:bg-rust/5 font-semibold text-xs rounded-full'
                onClick={() => setInterviewOpen(true)}
              >
                Resolve via AI Interview
              </Button>
            </div>
          </CardHeader>
          <CardContent className='space-y-3'>
            {data.signal_conflicts.map((conflict, i) => (
              <div
                key={i}
                className='flex items-center justify-between rounded-lg border border-rust/20 bg-rust/5 p-3'
              >
                <div className='flex items-center gap-2'>
                  <Badge className='bg-brand-blue/15 text-brand-blue border-brand-blue/30' variant='outline'>
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
        <Link
          to='/eligibility'
          search={{ userId, score: String(data.score), band: data.risk_band }}
        >
          <Button>
            <IndianRupee className='mr-2 h-4 w-4' />
            View Loan Eligibility
          </Button>
        </Link>
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

      {/* AI Conflict Resolution Interview Modal */}
      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className='sm:max-w-[500px] max-h-[80vh] flex flex-col p-6 bg-neutral-950 border-neutral-800 text-foreground rounded-2xl'>
          <DialogHeader className='pb-3 border-b border-neutral-800 shrink-0'>
            <DialogTitle className='flex items-center gap-2 text-rust tracking-tight'>
              <AlertTriangle className='h-5 w-5' />
              AI Verification Interview
            </DialogTitle>
            <DialogDescription className='text-xs text-neutral-400'>
              Your answers are scored for credibility and sent to the Loan Officer.
            </DialogDescription>
          </DialogHeader>

          {/* Conversation history area */}
          <div className='flex-1 overflow-y-auto py-4 space-y-4 pr-1 min-h-[250px]'>
            {interviewMessages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && (
                  <div className='h-7 w-7 rounded-full bg-rust/10 flex items-center justify-center shrink-0 border border-rust/20'>
                    <Bot className='h-4 w-4 text-rust' />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-neutral-200 text-neutral-950 rounded-tr-none'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className='h-7 w-7 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0 border border-brand-blue/20'>
                    <User className='h-4 w-4 text-brand-blue' />
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input field */}
          <div className='pt-3 border-t border-neutral-800 shrink-0 flex gap-2'>
            <input
              type='text'
              value={interviewInput}
              onChange={(e) => setInterviewInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isInterviewSubmitted && handleSendInterviewMessage()}
              placeholder={isInterviewSubmitted ? 'Conversation finished.' : 'Explain details here...'}
              disabled={isInterviewSubmitted || submittingSummary}
              className='flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2.5 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-rust disabled:opacity-50'
            />
            <Button
              size='sm'
              onClick={handleSendInterviewMessage}
              disabled={isInterviewSubmitted || submittingSummary || !interviewInput.trim()}
              className='rounded-xl bg-rust text-white hover:bg-rust/90 px-4 h-9 text-xs font-medium gap-1.5'
            >
              {submittingSummary ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <><Send className='h-3.5 w-3.5' /> Send</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Field Officer Contact Request Modal - Vercel Minimalist */}
      <Dialog open={officerModalOpen} onOpenChange={setOfficerModalOpen}>
        <DialogContent className='sm:max-w-[420px] p-6 rounded-xl border border-white/10 bg-black text-white shadow-2xl'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-medium tracking-tight text-white'>
              <PhoneCall className='h-4 w-4 text-white/80' />
              <span>Connect with Field Loan Officer</span>
            </DialogTitle>
            <DialogDescription className='text-xs text-white/50 leading-relaxed'>
              A local Business Correspondent or MFI Field Officer will assist you with paperwork and government subsidy enrollment.
            </DialogDescription>
          </DialogHeader>

          {officerRequested ? (
            <div className='py-6 text-center space-y-3'>
              <div className='mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white border border-white/20'>
                <CheckCircle2 className='h-5 w-5' />
              </div>
              <h4 className='text-sm font-semibold text-white'>Request Dispatched</h4>
              <p className='text-xs text-white/60 max-w-xs mx-auto leading-relaxed'>
                Your local field representative will call you or visit your village location within 24–48 hours.
              </p>
              <Button size='sm' className='font-mono text-xs bg-white text-black hover:bg-white/90 rounded-md px-4 h-9' onClick={() => { setOfficerModalOpen(false); setOfficerRequested(false); }}>
                Close
              </Button>
            </div>
          ) : (
            <div className='space-y-4 py-2'>
              <div className='rounded-lg border border-white/10 bg-white/[0.02] p-3.5 space-y-1 text-xs'>
                <div className='font-mono font-medium text-white'>Assigned Branch Officer</div>
                <div className='text-white/60'>Anand Varma (District MFI Agent • Kovvur/Madurai Zone)</div>
                <div className='text-[11px] text-white/80 font-mono flex items-center gap-1.5 pt-0.5'>
                  <span className='h-1.5 w-1.5 rounded-full bg-white'></span>
                  Available for in-person village visit
                </div>
              </div>

              <div className='space-y-2 text-xs'>
                <label className='font-mono text-[11px] text-white/60'>Your Contact Number:</label>
                <input
                  type='text'
                  defaultValue={phone || '98765 43215'}
                  className='w-full h-9 rounded-md border border-white/15 bg-black px-3 text-xs text-white font-mono focus:border-white/40 focus:outline-none'
                />
              </div>

              <Button
                className='w-full rounded-md bg-white text-black hover:bg-white/90 font-mono text-xs h-10'
                onClick={() => {
                  setOfficerRequested(true)
                  toast.success('Field officer visit request dispatched!')
                }}
              >
                Confirm Field Visit Request
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
