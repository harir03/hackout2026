import { Outlet, useMatches, Link, useNavigate } from '@tanstack/react-router'
import { CheckCircle2, ArrowLeft, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'

function StepIndicator({ currentPath }: { currentPath: string }) {
  const { t } = useTranslation()
  const steps = [
    { path: '/', label: t('nav.consent', 'Data Consent') },
    { path: '/score', label: t('nav.score', 'Score Result') },
    { path: '/advisor', label: t('nav.advisor', 'Credit Advisor') },
  ]
  const currentIndex = steps.findIndex((s) => s.path === currentPath)

  return (
    <div className='flex items-center justify-center gap-2'>
      {steps.map((step, i) => {
        const isActive = i === currentIndex
        const isComplete = i < currentIndex

        return (
          <div key={step.path} className='flex items-center gap-2'>
            {i > 0 && (
              <div
                className={`h-px w-8 transition-colors duration-300 sm:w-12 ${
                  isComplete ? 'bg-foreground' : 'bg-border'
                }`}
              />
            )}
            <div className='flex items-center gap-1.5'>
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-foreground text-background'
                    : isComplete
                      ? 'bg-foreground/10 text-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className='h-4 w-4' />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-sm tracking-[-0.01em] sm:inline ${
                  isActive
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ApplicantLayout() {
  const { t } = useTranslation()
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname ?? '/'
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const steps = [
    { path: '/', label: t('nav.consent', 'Data Consent') },
    { path: '/score', label: t('nav.score', 'Score Result') },
    { path: '/advisor', label: t('nav.advisor', 'Credit Advisor') },
  ]
  const currentIndex = steps.findIndex((s) => s.path === currentPath)
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null

  function handleSignOut() {
    auth.reset()
    navigate({ to: '/pitch', replace: true })
  }

  return (
    <div className='min-h-svh bg-background'>
      <header className='sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'>
        <div className='mx-auto flex h-16 max-w-4xl items-center justify-between px-4'>
          <div className='flex items-center gap-3'>
            {prevStep ? (
              <Link
                to={prevStep.path}
                className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                <ArrowLeft className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>{t('nav.back', 'Back')}</span>
              </Link>
            ) : (
              <Link
                to='/pitch'
                className='flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors'
              >
                <ArrowLeft className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>{t('nav.home', 'Home')}</span>
              </Link>
            )}
            <Link to='/pitch' className='flex items-center gap-2.5 hover:opacity-80 transition-opacity'>
              <div className='flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background'>
                AG
              </div>
              <span className='text-sm font-semibold tracking-[-0.02em]'>{t('nav.brand', 'AltGrade')}</span>
            </Link>
          </div>

          <StepIndicator currentPath={currentPath} />

          <button
            onClick={handleSignOut}
            className='flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors'
          >
            <LogOut className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>{t('nav.signOut', 'Sign Out')}</span>
          </button>
        </div>
      </header>

      <main className='mx-auto max-w-4xl px-4 py-8'>
        <Outlet />
      </main>

      <footer className='border-t py-4'>
      </footer>
    </div>
  )
}
