import { Link, useSearch } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <div className="w-full rounded-xl border border-white/10 bg-[#121212] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-1 text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Sign in to AltGrade</h2>
          <p className="text-sm text-zinc-400">
            Enter your credentials to access your account.
          </p>
        </div>
        <UserAuthForm redirectTo={redirect} />
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link
              to='/sign-up'
              className="text-white font-medium hover:text-[#00dfd8] transition-colors"
            >
              Sign Up
            </Link>
          </p>
          <p className="text-xs text-zinc-600 text-center leading-relaxed">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
