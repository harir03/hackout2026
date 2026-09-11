import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { SignUpForm } from './components/sign-up-form'

export function SignUp() {
  return (
    <AuthLayout>
      <div className="w-full rounded-xl border border-white/10 bg-[#121212] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-1 text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Create an account</h2>
          <p className="text-sm text-zinc-400">
            Enter your details to get started with AltGrade.
          </p>
        </div>
        <SignUpForm />
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            Already have an account?{' '}
            <Link
              to='/sign-in'
              className="text-white font-medium hover:text-[#00dfd8] transition-colors"
            >
              Sign In
            </Link>
          </p>
          <p className="text-xs text-zinc-600 text-center leading-relaxed">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="text-zinc-500 hover:text-zinc-300 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-zinc-500 hover:text-zinc-300 transition-colors">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
