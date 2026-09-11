import { createFileRoute } from '@tanstack/react-router'
import { LoanOfficerDashboard } from '@/features/dashboard'

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: LoanOfficerDashboard,
})
