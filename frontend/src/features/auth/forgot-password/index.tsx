import { Link } from '@tanstack/react-router'
import { AuthLayout } from '../auth-layout'
import { ForgotPasswordForm } from './components/forgot-password-form'

export function ForgotPassword() {
  return (
    <AuthLayout>
      <div className="w-full rounded-xl border border-white/10 bg-[#121212] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-1 text-center mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-white">Forgot Password</h2>
          <p className="text-sm text-zinc-400">
            Enter your registered email and we will send you a link to reset your password.
          </p>
        </div>
        <ForgotPasswordForm />
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="text-sm text-zinc-500">
            Don't have an account?{' '}
            <Link
              to='/sign-up'
              className="text-white font-medium hover:text-[#00dfd8] transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  )
}
