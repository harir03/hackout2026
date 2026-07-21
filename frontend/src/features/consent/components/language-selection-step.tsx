import { useTranslation } from 'react-i18next'
import { Languages, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧', desc: 'Proceed with English language interface and voice options' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳', desc: 'हिंदी इंटरफेस और वॉयस असिस्टेंट के साथ आगे बढ़ें' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', desc: 'తెలుగు ఇంటర్‌ఫేస్ మరియు వాయిస్ అసిస్టెంట్‌తో కొనసాగండి' },
]

interface LanguageSelectionStepProps {
  onContinue: () => void
}

export function LanguageSelectionStep({ onContinue }: LanguageSelectionStepProps) {
  const { i18n, t } = useTranslation()

  const handleSelectLanguage = (code: string) => {
    i18n.changeLanguage(code)
  }

  return (
    <Card className="mx-auto max-w-xl border-zinc-800 bg-zinc-950 text-white shadow-2xl">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Languages className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
          Select Your Preferred Language
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400 sm:text-sm">
          Choose the language for assessment screens, voice assistant, and AI phone callbacks.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {LANGUAGES.map((lang) => {
            const isSelected = i18n.language === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelectLanguage(lang.code)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base">{lang.native}</span>
                      <span className="text-xs text-zinc-400">({lang.label})</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">{lang.desc}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black">
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="pt-3">
          <Button
            onClick={onContinue}
            className="w-full gap-2 bg-emerald-500 text-black font-semibold hover:bg-emerald-400 py-5 rounded-xl text-sm"
          >
            {t('consent.nextStep')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
