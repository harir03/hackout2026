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
    __simulateVoiceInput?: (text: string) => void
  }
}

export function VoiceQuestionnaire({ questionText, options, onSelectOption }: VoiceQuestionnaireProps) {
  const { t, i18n } = useTranslation()
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [selectedFeedback, setSelectedFeedback] = useState<{ index: number; label: string } | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [recognition, setRecognition] = useState<any>(null)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])

  const LANG_MAP: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    gu: 'gu-IN',
    ta: 'ta-IN',
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

  // Expose test hook for automated verification in browser subagent
  useEffect(() => {
    window.__simulateVoiceInput = (text: string) => {
      setTranscript(text)
      matchOptionFromTranscript(text)
    }
    return () => {
      delete window.__simulateVoiceInput
    }
  }, [options, baseLang])

  useEffect(() => {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognitionClass) {
      setErrorMsg(t('voice.voiceNotSupported', 'Voice speech recognition is not supported in this browser.'))
      return
    }

    try {
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
        console.warn('Speech recognition event:', event.error)
        setIsListening(false)
        if (event.error === 'no-speech') {
          setErrorMsg(baseLang === 'gu' ? 'કોઈ અવાજ સંભળાયો નથી. કૃપા કરીને ફરી બોલો અથવા નીચે વિકલ્પ પર ટેપ કરો.' :
                      baseLang === 'hi' ? 'कोई आवाज़ सुनाई नहीं दी। कृपया पुनः बोलें या नीचे विकल्प चुनें।' :
                      'No speech detected. Please speak clearly or tap an option.')
        } else if (event.error === 'not-allowed') {
          setErrorMsg(baseLang === 'gu' ? 'માઇક્રોફોનની પરવાનગી નથી. કૃપા કરીને બ્રાઉઝરમાં પરવાનગી આપો.' :
                      baseLang === 'hi' ? 'माइक्रोफ़ोन की अनुमति नहीं है। कृपया ब्राउज़र में अनुमति दें।' :
                      'Microphone access blocked. Please enable mic permissions.')
        } else {
          setErrorMsg(`Voice notice: ${event.error}`)
        }
      }

      rec.onend = () => {
        setIsListening(false)
      }

      setRecognition(rec)
    } catch (e) {
      console.error('Failed to init speech recognition:', e)
    }
  }, [baseLang, questionText, options])

  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const targetLang = LANG_MAP[baseLang] || 'en-IN'
    const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices()
    
    const matchingVoice =
      voices.find((v) => v.lang.replace('_', '-').toLowerCase() === targetLang.toLowerCase()) ||
      voices.find((v) => v.lang.replace('_', '-').toLowerCase().startsWith(baseLang.toLowerCase())) ||
      voices.find((v) => {
        const name = v.name.toLowerCase()
        if (baseLang === 'hi') return name.includes('hindi') || name.includes('हिन्दी')
        if (baseLang === 'gu') return name.includes('gujarati') || name.includes('ગુજરાતી')
        return name.includes('india') || name.includes('english')
      })

    const createUtterance = (text: string) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = targetLang
      u.rate = 0.88
      if (matchingVoice) {
        u.voice = matchingVoice
      }
      return u
    }

    // 1. Speak Full Question First
    window.speechSynthesis.speak(createUtterance(questionText))

    // 2. Speak Options Intro & Each Option Sequentially
    if (options && options.length > 0) {
      const optionsHeader = baseLang === 'gu' ? 'વિકલ્પો:' : baseLang === 'hi' ? 'विकल्प:' : 'Options:'
      window.speechSynthesis.speak(createUtterance(optionsHeader))

      options.forEach((opt, idx) => {
        const optPrefix = baseLang === 'gu' ? `વિકલ્પ ${idx + 1}:` : baseLang === 'hi' ? `विकल्प ${idx + 1}:` : `Option ${idx + 1}:`
        window.speechSynthesis.speak(createUtterance(`${optPrefix} ${opt}`))
      })
    }
  }

  const toggleListening = () => {
    if (!recognition) {
      setErrorMsg(t('voice.voiceNotSupported', 'Voice recognition is not available.'))
      return
    }
    setErrorMsg(null)
    if (isListening) {
      try {
        recognition.stop()
      } catch {}
      setIsListening(false)
    } else {
      setTranscript('')
      setSelectedFeedback(null)
      try {
        recognition.start()
        setIsListening(true)
      } catch (err: any) {
        console.warn('Speech recognition start error:', err)
        setErrorMsg('Microphone is busy. Please try again.')
        setIsListening(false)
      }
    }
  }

  const matchOptionFromTranscript = (spokenText: string) => {
    if (!spokenText || !options || options.length === 0) return
    const lower = spokenText.toLowerCase().trim()
    setErrorMsg(null)

    // Option 1 Patterns (English, Hindi, Gujarati, Tamil, numbers & ordinals)
    const opt1Patterns = [
      '1', 'one', 'first', '1st', 'option 1', 'option one', 'choice 1',
      'એક', '૧', 'પહેલો', 'પહેલા', 'પ્રથમ', 'વિકલ્પ એક', 'વિકલ્પ ૧',
      'एक', '१', 'पहला', 'पहले', 'ऑप्शन 1', 'ऑप्शन एक', 'प्रथम',
      'ஒன்று', 'முதல்'
    ]
    if (opt1Patterns.some((p) => lower.includes(p))) {
      triggerSelection(0)
      return
    }

    // Option 2 Patterns
    const opt2Patterns = [
      '2', 'two', 'second', '2nd', 'option 2', 'option two', 'choice 2',
      'બે', '૨', 'બીજો', 'બીજા', 'દ્વિતીય', 'વિકલ્પ બે', 'વિકલ્પ ૨',
      'दो', '२', 'दूसरा', 'दूसरे', 'ऑप्शन 2', 'ऑप्शन दो', 'द्वितीय',
      'இரண்டு', 'இரண்டாவது'
    ]
    if (opt2Patterns.some((p) => lower.includes(p))) {
      triggerSelection(1)
      return
    }

    // Option 3 Patterns
    const opt3Patterns = [
      '3', 'three', 'third', '3rd', 'option 3', 'option three', 'choice 3',
      'ત્રણ', '૩', 'ત્રીજો', 'ત્રીજા', 'તૃતીય', 'વિકલ્પ ત્રણ', 'વિકલ્પ ૩',
      'तीन', '३', 'तीसरा', 'तीसरे', 'ऑप्शन 3', 'ऑप्शन तीन', 'तृतीय',
      'மூன்று', 'மூன்றாவது'
    ]
    if (opt3Patterns.some((p) => lower.includes(p))) {
      triggerSelection(2)
      return
    }

    // Option 4 Patterns
    const opt4Patterns = [
      '4', 'four', 'fourth', '4th', 'option 4', 'option four', 'choice 4',
      'ચાર', '૪', 'ચોથો', 'ચોથા', 'ચતુર્થ', 'વિકલ્પ ચાર', 'વિકલ્પ ૪',
      'चार', '४', 'चौथा', 'चौथे', 'ऑप्शन 4', 'ऑप्शन चार', 'चतुर्थ',
      'நான்கு', 'நான்காவது'
    ]
    if (opt4Patterns.some((p) => lower.includes(p))) {
      triggerSelection(3)
      return
    }

    // Direct and Semantic Word Matching
    let bestIndex = -1
    let highestScore = 0

    const stopWords = new Set(['the', 'is', 'a', 'an', 'and', 'or', 'in', 'for', 'to', 'of', 'છે', 'અને', 'કે', 'માટે', 'है', 'और', 'या'])

    options.forEach((opt, idx) => {
      const cleanOpt = opt.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
      
      // Full phrase match
      if (lower.includes(cleanOpt) || cleanOpt.includes(lower)) {
        highestScore = 99
        bestIndex = idx
        return
      }

      // Word-level match
      const tokens = cleanOpt.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w))
      let matchCount = 0
      tokens.forEach((t) => {
        if (lower.includes(t)) {
          matchCount++
        }
      })

      if (matchCount > highestScore) {
        highestScore = matchCount
        bestIndex = idx
      }
    })

    if (bestIndex >= 0 && highestScore > 0) {
      triggerSelection(bestIndex)
    } else {
      setErrorMsg(
        baseLang === 'gu'
          ? `"${spokenText}" સાંભળાયું, પરંતુ કોઈ વિકલ્પ સાથે મેળ નથી થયો. કૃપા કરીને "વિકલ્પ ૧", "વિકલ્પ ૨" કહો.`
          : baseLang === 'hi'
          ? `"${spokenText}" सुना गया, लेकिन किसी विकल्प से मेल नहीं हुआ। कृपया "विकल्प 1", "विकल्प 2" बोलें।`
          : `Heard "${spokenText}", but could not match an option. Please say "Option 1" or "Option 2".`
      )
    }
  }

  const triggerSelection = (idx: number) => {
    if (idx < 0 || idx >= options.length) return
    setSelectedFeedback({ index: idx, label: options[idx] })
    onSelectOption(idx)
  }

  return (
    <div className="rounded-xl border border-white/15 bg-black/60 p-4 text-white shadow-sm transition-all">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-white/20 bg-white/5 text-white font-mono text-[11px] px-2 py-0.5">
            {t('voice.voiceModeActive', 'Voice Mode Active')}
          </Badge>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={speakQuestion}
            className="h-7 gap-1 px-2.5 text-xs text-white/70 hover:text-white hover:bg-white/10 font-mono"
          >
            <Volume2 className="h-3.5 w-3.5 text-white" />
            {t('voice.listenQuestion', 'Listen Question')}
          </Button>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={toggleListening}
          className={`h-8 gap-2 px-3.5 text-xs font-mono font-medium rounded-full transition-all ${
            isListening
              ? 'bg-rose-500 text-white animate-pulse hover:bg-rose-600'
              : 'bg-white text-black hover:bg-white/90 shadow-sm'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="h-3.5 w-3.5" />
              {t('voice.stopListening', 'Stop Voice')}
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              {t('voice.speakAnswer', 'Voice Mode (Speak Answer)')}
            </>
          )}
        </Button>
      </div>

      {isListening && (
        <div className="flex items-center gap-2 rounded-lg bg-white/10 border border-white/15 p-2.5 text-xs text-white font-mono animate-fade-in">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          {t('voice.listening', 'Listening... Speak your answer now')}
        </div>
      )}

      {transcript && (
        <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-xs text-white/90 font-mono">
          <span className="font-semibold text-white/60 mr-1.5">Heard:</span> &quot;{transcript}&quot;
        </div>
      )}

      {selectedFeedback && (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2 text-xs text-emerald-300 font-mono animate-fade-in">
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-black text-[10px] font-bold">✓</span>
          <span>
            {baseLang === 'gu' ? 'પસંદ કરેલ' : baseLang === 'hi' ? 'चयनित' : 'Selected'}:{' '}
            <strong className="text-white">Option {selectedFeedback.index + 1}</strong> ({selectedFeedback.label})
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-400 font-mono">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
