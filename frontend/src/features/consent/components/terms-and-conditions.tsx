import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, FileText, CheckCircle2, Lock, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TermsProps {
  onAgree: () => void
  onDecline?: () => void
}

export function TermsAndConditions({ onAgree, onDecline }: TermsProps) {
  const { t } = useTranslation()
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 text-white shadow-2xl">
      <div className="mb-6 flex items-center gap-3 border-b border-zinc-800 pb-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{t('terms.title')}</h2>
          <p className="text-xs text-zinc-400 sm:text-sm">{t('terms.subtitle')}</p>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-5 rounded-xl border border-zinc-850 bg-zinc-900/60 p-5 pr-4 text-sm text-zinc-300 scrollbar-thin scrollbar-thumb-zinc-700">
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-400">
            <FileText className="h-4 w-4" />
            {t('terms.section1Title')}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">{t('terms.section1Desc')}</p>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-400">
            <Lock className="h-4 w-4" />
            {t('terms.section2Title')}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">{t('terms.section2Desc')}</p>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-400">
            <Scale className="h-4 w-4" />
            {t('terms.section3Title')}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">{t('terms.section3Desc')}</p>
        </div>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 font-semibold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t('terms.section4Title')}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">{t('terms.section4Desc')}</p>
        </div>
      </div>

      <div className="mt-6 space-y-5 border-t border-zinc-800 pt-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            id="terms-agree"
            checked={agreed}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500 text-emerald-500 focus:ring-emerald-500"
          />
          <span className="text-xs text-zinc-300 sm:text-sm leading-snug">
            {t('terms.agreeCheckbox')}
          </span>
        </label>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          {onDecline && (
            <Button
              variant="outline"
              onClick={onDecline}
              className="w-full sm:w-auto border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
            >
              {t('terms.declineBtn')}
            </Button>
          )}
          <Button
            disabled={!agreed}
            onClick={onAgree}
            className="w-full sm:w-auto bg-emerald-500 text-black hover:bg-emerald-400 font-semibold disabled:opacity-50"
          >
            {t('terms.proceedBtn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
