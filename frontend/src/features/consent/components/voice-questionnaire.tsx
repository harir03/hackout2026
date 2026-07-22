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
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  const LANG_MAP: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
  }

  const baseLang = (i18n.language || 'en').split('-')[0]

  useEffect(() => {
    if (!('speechSynthesis' in window)) return

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        setAvailableVoices(voices)
      }
    }

    loadVoices()
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [])

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      setErrorMsg(t('voice.voiceNotSupported'))
      return
    }

    const rec = new SpeechRecognitionClass()
    rec.continuous = false
    rec.interimResults = false
    rec.lang = LANG_MAP[baseLang] || 'en-IN'

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
  }, [baseLang, questionText])

  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    let textToSpeak = `${questionText}.`
    if (options && options.length > 0) {
      if (baseLang === 'hi') {
        textToSpeak += ` विकल्प: ${options.map((opt, idx) => `${idx + 1}: ${opt}`).join('. ')}`
      } else if (baseLang === 'te') {
        textToSpeak += ` ఎంపికలు: ${options.map((opt, idx) => `${idx + 1}: ${opt}`).join('. ')}`
      } else {
        textToSpeak += ` Options: ${options.map((opt, idx) => `${idx + 1}: ${opt}`).join('. ')}`
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak)
    const targetLang = LANG_MAP[baseLang] || 'en-IN'
    utterance.lang = targetLang
    utterance.rate = 0.9

    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
    const matchingVoice =
      voices.find((v) => v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase()) ||
      voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(baseLang.toLowerCase()))
    if (matchingVoice) {
      utterance.voice = matchingVoice
    }

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
    <div className="rounded-xl border border-dove/40 bg-muted/20 p-4 text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-brand-blue/30 bg-brand-blue/5 text-brand-blue text-xs">
            {t('voice.voiceModeActive', 'Voice Mode Active')}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={speakQuestion}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Volume2 className="h-3.5 w-3.5 text-brand-blue" />
            {t('voice.listenQuestion', 'Listen Question')}
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={toggleListening}
          className={`h-8 gap-2 px-3 text-xs font-medium rounded-full ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse hover:bg-rose-600'
              : 'bg-foreground text-background hover:bg-foreground/90'
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
        <div className="flex items-center gap-2 rounded-lg bg-muted/60 p-2.5 text-xs text-brand-blue">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
          </span>
          {t('voice.listening')}
        </div>
      )}

      {transcript && (
        <div className="mt-2 rounded-lg border border-dove/30 bg-muted/40 p-2.5 text-xs text-foreground">
          <span className="font-medium text-brand-blue">Heard:</span> &quot;{transcript}&quot;
        </div>
      )}

      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-500">
          <AlertCircle className="h-3.5 w-3.5" />
          {errorMsg}
        </div>
      )}
    </div>
  )
}
