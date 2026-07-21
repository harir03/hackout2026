import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Volume2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface VoiceQuestionnaireProps {
  questionText: string
  options: string[]
  onSelectOption: (optionIndex: number) => void
}

// Declare Web Speech API types for TypeScript compatibility
declare global {
  interface Window {
    SpeechRecognition?: any
    webkitSpeechRecognition?: any
  }
}

export function VoiceQuestionnaire({ questionText, options, onSelectOption }: VoiceQuestionnaireProps) {
  const { t, i18n } = useTranslation()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<any>(null)

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      setErrorMsg(t('voice.voiceNotSupported'))
      return
    }

    const rec = new SpeechRecognitionClass()
    rec.continuous = false
    rec.interimResults = false

    const langMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      te: 'te-IN',
    }
    rec.lang = langMap[i18n.language] || 'en-US'

    rec.onresult = (event: any) => {
      const text = event.results[0][0].transcript
      setTranscript(text)
      setIsListening(false)
      matchOptionFromTranscript(text)
    }

    rec.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      setErrorMsg(`Voice error: ${event.error}`)
    }

    rec.onend = () => {
      setIsListening(false)
    }

    setRecognition(rec)
  }, [i18n.language, questionText])

  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(questionText)
    const langMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      te: 'te-IN',
    }
    utterance.lang = langMap[i18n.language] || 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  const toggleListening = () => {
    if (!recognition) return
    setErrorMsg(null)
    if (isListening) {
      recognition.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      recognition.start()
      setIsListening(true)
    }
  }

  const matchOptionFromTranscript = (spokenText: string) => {
    const lowerSpoken = spokenText.toLowerCase().trim()

    // Numerical index matching (1, 2, 3, 4)
    if (lowerSpoken.includes('one') || lowerSpoken.includes('1') || lowerSpoken.includes('पहला') || lowerSpoken.includes('ఒకటి')) {
      onSelectOption(0)
      return
    }
    if (lowerSpoken.includes('two') || lowerSpoken.includes('2') || lowerSpoken.includes('दूसरा') || lowerSpoken.includes('రెండు')) {
      onSelectOption(1)
      return
    }
    if (lowerSpoken.includes('three') || lowerSpoken.includes('3') || lowerSpoken.includes('तीसरा') || lowerSpoken.includes('మూడు')) {
      onSelectOption(2)
      return
    }
    if (lowerSpoken.includes('four') || lowerSpoken.includes('4') || lowerSpoken.includes('चौथा') || lowerSpoken.includes('నాలుగు')) {
      onSelectOption(3)
      return
    }

    // Keyword matching
    let bestIndex = 0
    let maxMatch = -1

    options.forEach((opt, idx) => {
      const words = opt.toLowerCase().split(/\s+/)
      let matches = 0
      words.forEach((word) => {
        if (word.length > 3 && lowerSpoken.includes(word)) {
          matches++
        }
      })
      if (matches > maxMatch) {
        maxMatch = matches
        bestIndex = idx
      }
    })

    onSelectOption(bestIndex)
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 text-xs">
            Voice Assistant Active
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={speakQuestion}
            className="h-7 gap-1 px-2 text-xs text-zinc-300 hover:text-white"
          >
            <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            Listen Question
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={toggleListening}
          className={`h-8 gap-2 px-3 text-xs font-semibold ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse hover:bg-rose-600'
              : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="h-3.5 w-3.5" />
              {t('voice.stopListening')}
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              {t('voice.speakAnswer')}
            </>
          )}
        </Button>
      </div>

      {isListening && (
        <div className="flex items-center gap-2 rounded-lg bg-zinc-900 p-2.5 text-xs text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          {t('voice.listening')}
        </div>
      )}

      {transcript && (
        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2.5 text-xs text-zinc-300">
          <span className="font-medium text-emerald-400">Heard:</span> &quot;{transcript}&quot;
        </div>
      )}

      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}
