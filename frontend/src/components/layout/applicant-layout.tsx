import { Outlet, useMatches } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'

const STEPS = [
  { path: '/', label: 'Data Consent' },
  { path: '/score', label: 'Score Result' },
  { path: '/advisor', label: 'Credit Advisor' },
]

function StepIndicator({ currentPath }: { currentPath: string }) {
  const currentIndex = STEPS.findIndex((s) => s.path === currentPath)

  return (
    <div className='flex items-center justify-center gap-2'>
      {STEPS.map((step, i) => {
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
  const matches = useMatches()
  const currentPath = matches[matches.length - 1]?.pathname ?? '/'

  return (
    <div className='min-h-svh bg-background'>
      <header className='sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60'>
        <div className='mx-auto flex h-16 max-w-4xl items-center justify-between px-4'>
          <div className='flex items-center gap-2.5'>
            <div className='flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background'>
              IC
            </div>
            <span className='text-sm font-semibold tracking-[-0.02em]'>IntelliCredit</span>
          </div>
          <StepIndicator currentPath={currentPath} />
        </div>
      </header>

      <main className='mx-auto max-w-4xl px-4 py-8'>
        <Outlet />
      </main>

      <footer className='border-t py-4'>
        <p className='text-center text-xs text-muted-foreground'>
          All data shown is simulated for demonstration purposes.
        </p>
      </footer>
    </div>
  )
}
