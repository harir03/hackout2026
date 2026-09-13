import { useTranslation } from 'react-i18next'
import { Languages, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧', desc: 'Proceed with English language interface and voice options' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', flag: '🇮🇳', desc: 'हिंदी इंटरफेस और वॉयस असिस्टेंट के साथ आगे बढ़ें' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳', desc: 'ગુજરાતી ઇન્ટરફેસ અને વૉઇસ આસિસ્ટન્ટ સાથે આગળ વધો' },
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
    <Card className="mx-auto max-w-xl border-dove/40 shadow-subtle text-foreground">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3 py-1 text-[11px] font-medium text-brand-blue">
          <span>Online Banking for All</span>
          <span className="text-muted-foreground">•</span>
          <span>Bharat Edition</span>
        </div>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
          <Languages className="h-6 w-6" />
        </div>
        <CardTitle className="font-signifier text-xl font-normal leading-snug sm:text-2xl text-foreground">
          Select Your Preferred Language
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground sm:text-sm mt-1 max-w-md mx-auto">
          AI-Powered Hyper-Personalized Banking for Bharat. Choose your preferred language for vernacular onboarding, hands-free voice assistance, and AI callbacks.
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
                className={`flex items-center justify-between rounded-[14px] border p-4 text-left transition-all ${
                  isSelected
                    ? 'border-brand-blue bg-brand-blue/5 text-foreground shadow-sm'
                    : 'border-dove/50 bg-background hover:bg-muted/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm sm:text-base text-foreground">{lang.native}</span>
                      <span className="text-xs text-muted-foreground">({lang.label})</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{lang.desc}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
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
            className="w-full gap-2 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium py-5 text-sm"
          >
            {t('consent.nextStep')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
