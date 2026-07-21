import { createFileRoute } from '@tanstack/react-router'
import { EligibilityPage } from '@/features/eligibility'

export const Route = createFileRoute('/_applicant/eligibility')({
  component: EligibilityPage,
})
