import { Link } from '@tanstack/react-router'
import { Logo } from '@/assets/logo'
import { DotBackground } from '@/components/ui/dot-background'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative flex h-svh w-full items-center justify-center overflow-hidden bg-black text-white font-['Inter',-apple-system,sans-serif]">
      <DotBackground />
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" />
      <div className="relative z-[2] mx-auto flex w-full max-w-[420px] flex-col items-center justify-center space-y-2 px-4 py-8 sm:p-8">
        <div className="mb-4 flex items-center justify-center">
          <Link to='/pitch' className='flex items-center gap-2 hover:opacity-85 transition-opacity'>
            <Logo className='me-1' />
            <h1 className='text-xl font-semibold tracking-[-0.03em] text-white'>AltGrade</h1>
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
