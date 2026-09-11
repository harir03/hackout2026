import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, FileText, CheckCircle2, Lock, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface TermsProps {
  onAgree: () => void
  onDecline?: () => void
}

export function TermsAndConditions({ onAgree, onDecline }: TermsProps) {
  const { t } = useTranslation()
  const [agreed, setAgreed] = useState(false)

  return (
    <Card className="mx-auto max-w-3xl border-dove/40 shadow-subtle text-foreground">
      <CardHeader className="border-b border-dove/20 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="font-signifier text-xl font-normal leading-snug sm:text-2xl text-foreground">
              {t('terms.title')}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground sm:text-sm mt-0.5">
              {t('terms.subtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        <div className="max-h-96 overflow-y-auto space-y-5 rounded-2xl border border-dove/30 bg-muted/20 p-5 text-sm scrollbar-thin">
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-brand-blue">
              <FileText className="h-4 w-4" />
              {t('terms.section1Title')}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('terms.section1Desc')}</p>
          </div>

          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-brand-blue">
              <Lock className="h-4 w-4" />
              {t('terms.section2Title')}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('terms.section2Desc')}</p>
          </div>

          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-brand-blue">
              <Scale className="h-4 w-4" />
              {t('terms.section3Title')}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('terms.section3Desc')}</p>
          </div>

          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 font-semibold text-brand-blue">
              <CheckCircle2 className="h-4 w-4" />
              {t('terms.section4Title')}
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">{t('terms.section4Desc')}</p>
          </div>
        </div>

        <div className="space-y-5 border-t border-dove/20 pt-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              id="terms-agree"
              checked={agreed}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-dove bg-muted accent-foreground text-foreground focus:ring-brand-blue"
            />
            <span className="text-xs text-foreground sm:text-sm leading-snug">
              {t('terms.agreeCheckbox')}
            </span>
          </label>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
            {onDecline && (
              <Button
                variant="outline"
                onClick={onDecline}
                className="w-full sm:w-auto rounded-full border-dove/80 text-muted-foreground hover:text-foreground"
              >
                {t('terms.declineBtn')}
              </Button>
            )}
            <Button
              disabled={!agreed}
              onClick={onAgree}
              className="w-full sm:w-auto rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium disabled:opacity-50"
            >
              {t('terms.proceedBtn')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
