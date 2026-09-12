import { useState, useEffect, useRef } from 'react'
import {
  X,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Loader2,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { sendMascotMessage, fetchMascotStatus } from '@/lib/api'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  modelUsed?: string
}

const CYCLING_BUBBLES = [
  { lang: 'hi', label: 'हिंदी', text: 'नमस्ते! ऋण और स्कोर के बारे में कुछ भी पूछें 👋' },
  { lang: 'te', label: 'తెలుగు', text: 'నమస్కారం! లోన్ మరియు స్కోర్ గురించి ఏదైనా అడగండి 👋' },
  { lang: 'ta', label: 'தமிழ்', text: 'வணக்கம்! கடன் மற்றும் தகுதி பற்றி ஏதேனும் கேட்கலாம் 👋' },
  { lang: 'en', label: 'English', text: 'Hi! Ask me anything about getting a loan without CIBIL 👋' },
]

const QUICK_PROMPTS: Record<string, string[]> = {
  hi: [
    'बिना सिबिल के लोन कैसे मिलता है?',
    'कौन से कागजात आवश्यक हैं?',
    'क्या किसानों के लिए विशेष लोन हैं?',
    'क्या मेरा डेटा सुरक्षित है?',
  ],
  te: [
    'సిబిల్ స్కోర్ లేకుండా లోన్ ఎలా వస్తుంది?',
    'నాకు ఏ డాక్యుమెంట్లు కావాలి?',
    'రైతులకు ప్రత్యేక రుణాలు ఉన్నాయా?',
    'నా సమాచారం సురక్షితమేనా?',
  ],
  ta: [
    'சிபில் இல்லாமல் கடன் பெறுவது எப்படி?',
    'என்ன ஆவணங்கள் தேவை?',
    'விவசாயிகளுக்கு சிறப்பு கடன்கள் உள்ளதா?',
    'என் தரவு பாதுகாப்பானதா?',
  ],
  en: [
    'How do I qualify without a CIBIL score?',
    'What documents do I need to submit?',
    'Are there special loans for farmers?',
    'Is my banking data private and safe?',
  ],
}

export function MascotChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentBubbleIdx, setCurrentBubbleIdx] = useState(0)
  const [selectedLang, setSelectedLang] = useState<'hi' | 'te' | 'ta' | 'en'>('en')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am Mitra, your friendly credit guide. AltGrade helps you get fair loans using your everyday bill payments and UPI history—even with zero CIBIL score. How can I help you today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'local-model',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [isLocalModel, setIsLocalModel] = useState<boolean>(true)
  const [bubbleVisible, setBubbleVisible] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-cycle speech bubbles every 4 seconds when minimized
  useEffect(() => {
    if (isOpen) return

    const interval = setInterval(() => {
      setBubbleVisible(false)
      setTimeout(() => {
        setCurrentBubbleIdx((prev) => (prev + 1) % CYCLING_BUBBLES.length)
        setBubbleVisible(true)
      }, 300)
    }, 4000)

    return () => clearInterval(interval)
  }, [isOpen])

  // Check model status on mount
  useEffect(() => {
    fetchMascotStatus()
      .then((res) => {
        setIsLocalModel(res.ollama_online || res.status === 'ready')
      })
      .catch(() => setIsLocalModel(true))
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Handle language switch
  const handleLanguageChange = (lang: 'hi' | 'te' | 'ta' | 'en') => {
    setSelectedLang(lang)
    const greetings = {
      hi: 'नमस्ते! मैं मित्रा हूँ। आप मुझसे ऋण, दस्तावेज़ या ब्याज दरों के बारे में हिंदी में पूछ सकते हैं।',
      te: 'నమస్కారం! నేను మిత్రా. మీరు లోన్, అవసరమైన పత్రాలు లేదా వడ్డీ రేట్ల గురించి తెలుగులో నన్ను అడగవచ్చు.',
      ta: 'வணக்கம்! நான் மித்ரா. கடன், ஆவணங்கள் அல்லது வட்டி விகிதங்கள் பற்றி தமிழில் என்னிடம் கேட்கலாம்.',
      en: 'Hello! I am Mitra. Ask me anything about loans, required documents, or interest rates in English.',
    }
    setMessages((prev) => [
      ...prev,
      {
        id: `lang-switch-${Date.now()}`,
        role: 'assistant',
        content: greetings[lang],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'local-model',
      },
    ])
  }

  // Text-To-Speech reader
  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      window.speechSynthesis?.cancel()
      setSpeakingId(null)
      return
    }

    if (!('speechSynthesis' in window)) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)

    const langCodes: Record<string, string> = {
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      en: 'en-IN',
    }
    utterance.lang = langCodes[selectedLang] || 'en-US'
    utterance.rate = 0.95

    utterance.onend = () => setSpeakingId(null)
    utterance.onerror = () => setSpeakingId(null)

    setSpeakingId(id)
    window.speechSynthesis.speak(utterance)
  }

  // Send message
  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputValue).trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setIsLoading(true)

    try {
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await sendMascotMessage({
        message: text,
        language: selectedLang,
        history,
      })

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.model_used,
      }

      setMessages((prev) => [...prev, botMsg])
      if (res.is_local !== undefined) {
        setIsLocalModel(res.is_local)
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          selectedLang === 'hi'
            ? 'क्षमा करें, कनेक्शन में कुछ समय लग रहा है। आप अपने नजदीकी लोन अधिकारी से संपर्क कर सकते हैं।'
            : selectedLang === 'te'
            ? 'క్షమించండి, కనెక్షన్‌లో ఆలస్యం అవుతోంది. మీరు మీ స్థానిక లోన్ ఆఫీసర్‌ని సంప్రదించవచ్చు.'
            : 'I am taking a moment to connect. AltGrade verifies your utility and UPI history to grant fair loans without traditional bureau requirements.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'offline-agent',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const currentBubble = CYCLING_BUBBLES[currentBubbleIdx]

  return (
    <div className='fixed bottom-6 right-6 z-50 flex flex-col items-end'>
      {/* Floating Cycling Speech Bubble (when chat is closed) */}
      {!isOpen && (
        <div
          onClick={() => {
            setSelectedLang(currentBubble.lang as any)
            setIsOpen(true)
          }}
          className={`mb-3 max-w-xs cursor-pointer rounded-xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md transition-all duration-200 hover:border-white/30 hover:scale-[1.02] ${
            bubbleVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
          }`}
        >
          <div className='flex items-center gap-2 mb-1.5'>
            <span className='flex h-1.5 w-1.5 rounded-full bg-white animate-pulse' />
            <span className='text-[10px] font-mono tracking-widest uppercase text-white/70'>
              MITRA AI • {currentBubble.label}
            </span>
          </div>
          <p className='text-xs font-normal text-white/90 leading-relaxed font-sans'>
            {currentBubble.text}
          </p>
          <div className='mt-2.5 flex items-center justify-between text-[10px] font-mono text-white/40 border-t border-white/5 pt-1.5'>
            <span>Click to chat</span>
            <span className='text-white/80 hover:text-white transition-colors'>Assistant →</span>
          </div>
        </div>
      )}

      {/* Floating Mascot Button - Vercel Minimalist */}
      {!isOpen && (
        <button
          type='button'
          onClick={() => setIsOpen(true)}
          className='group relative flex h-14 w-14 items-center justify-center rounded-full bg-black border border-white/20 text-white shadow-2xl transition-all duration-200 hover:scale-105 hover:border-white active:scale-95'
          aria-label='Open AI Financial Guide'
        >
          {/* Subtle minimal hover halo */}
          <div className='absolute -inset-0.5 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 blur-sm transition duration-300' />

          {/* Minimal Geometric / Triangle Glyph (Vercel Style) */}
          <div className='relative flex h-full w-full items-center justify-center'>
            <svg
              viewBox='0 0 24 24'
              className='h-6 w-6 text-white transition-transform duration-200 group-hover:scale-110'
              fill='none'
              stroke='currentColor'
              strokeWidth='1.75'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M12 2L2 19.5h20L12 2z' fill='white' fillOpacity='0.1' />
              <path d='M12 2L2 19.5h20L12 2z' />
              <circle cx='12' cy='13' r='1.5' fill='white' />
            </svg>
          </div>

          {/* Minimal status pip */}
          <span className='absolute top-0 right-0 flex h-3 w-3'>
            <span className='relative inline-flex h-2.5 w-2.5 rounded-full border border-black bg-white' />
          </span>
        </button>
      )}

      {/* Expanded Chat Drawer / Card - Vercel Dark Minimalist */}
      {isOpen && (
        <div className='flex h-[540px] w-[360px] sm:w-[400px] flex-col rounded-2xl border border-white/10 bg-black/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden'>
          {/* Header */}
          <div className='flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3'>
            <div className='flex items-center gap-2.5'>
              <div className='relative flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 border border-white/15 text-white'>
                <Bot className='h-4 w-4' />
                <span className='absolute -top-1 -right-1 h-2 w-2 rounded-full border border-black bg-white' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h3 className='text-xs font-medium tracking-tight text-white font-mono'>Mitra AI</h3>
                  <Badge variant='outline' className='text-[9px] px-1.5 py-0 font-mono bg-white/5 text-white/70 border-white/15'>
                    {isLocalModel ? 'LOCAL' : 'EDGE'}
                  </Badge>
                </div>
                <p className='text-[10px] text-white/40 font-mono'>Vernacular Financial Intelligence</p>
              </div>
            </div>
            <Button
              variant='ghost'
              size='icon'
              className='h-7 w-7 rounded-md text-white/50 hover:text-white hover:bg-white/10'
              onClick={() => {
                window.speechSynthesis?.cancel()
                setIsOpen(false)
              }}
            >
              <X className='h-3.5 w-3.5' />
            </Button>
          </div>

          {/* Language Selection Tabs */}
          <div className='flex items-center justify-between border-b border-white/10 bg-black px-3 py-2 text-xs'>
            <span className='text-[10px] font-mono uppercase text-white/40'>Lang:</span>
            <div className='flex gap-1'>
              {(
                [
                  { code: 'en', label: 'EN' },
                  { code: 'hi', label: 'हिंदी' },
                  { code: 'te', label: 'తెలుగు' },
                  { code: 'ta', label: 'தமிழ்' },
                ] as const
              ).map((lang) => (
                <button
                  key={lang.code}
                  type='button'
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-mono transition-all ${
                    selectedLang === lang.code
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className='flex-1 overflow-y-auto p-4 space-y-3 font-sans'>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 border border-white/15 text-white mt-1'>
                    <Bot className='h-3 w-3' />
                  </div>
                )}
                <div
                  className={`group relative max-w-[82%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-white/90 border border-white/10'
                  }`}
                >
                  <p>{msg.content}</p>

                  <div className='mt-1.5 flex items-center justify-between gap-3 text-[9px] font-mono text-white/40'>
                    <span>{msg.timestamp}</span>

                    {msg.role === 'assistant' && (
                      <button
                        type='button'
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        className='flex items-center gap-1 rounded px-1 text-white/70 hover:text-white hover:bg-white/10 transition-colors'
                        title='Listen to this response'
                      >
                        {speakingId === msg.id ? (
                          <>
                            <VolumeX className='h-3 w-3 text-white animate-pulse' />
                            <span className='text-white'>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className='h-3 w-3' />
                            <span>Audio</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-black font-semibold text-[10px] mt-1'>
                    <User className='h-3 w-3' />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className='flex items-center gap-2 text-white/50 text-xs pl-1 font-mono'>
                <Loader2 className='h-3.5 w-3.5 animate-spin text-white' />
                <span>Generating response...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className='border-t border-white/10 bg-white/[0.02] p-2.5'>
            <div className='flex items-center gap-1 mb-1.5 text-[10px] font-mono text-white/40'>
              <HelpCircle className='h-3 w-3' />
              <span>PROMPTS:</span>
            </div>
            <div className='flex gap-1.5 overflow-x-auto pb-1 no-scrollbar'>
              {QUICK_PROMPTS[selectedLang]?.map((prompt, idx) => (
                <button
                  key={idx}
                  type='button'
                  onClick={() => handleSend(prompt)}
                  className='shrink-0 rounded-md border border-white/10 bg-black px-2 py-1 text-[10px] text-white/70 hover:border-white/40 hover:text-white transition-all text-left truncate max-w-[220px] font-mono'
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className='flex items-center gap-2 border-t border-white/10 bg-black p-3'
          >
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                selectedLang === 'hi'
                  ? 'अपना सवाल यहाँ पूछें...'
                  : selectedLang === 'te'
                  ? 'మీ ప్రశ్నను ఇక్కడ అడగండి...'
                  : selectedLang === 'ta'
                  ? 'உங்கள் கேள்வியை இங்கே கேளுங்கள்...'
                  : 'Ask a question in any language...'
              }
              className='h-9 text-xs rounded-lg border-white/10 bg-white/[0.03] text-white placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white focus-visible:border-white'
              disabled={isLoading}
            />
            <Button
              type='submit'
              size='icon'
              className='h-9 w-9 shrink-0 rounded-lg bg-white text-black hover:bg-white/90 transition-colors'
              disabled={!inputValue.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Send className='h-3.5 w-3.5' />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
