import { createFileRoute } from '@tanstack/react-router'
import { AdvisorPage } from '@/features/advisor'

export const Route = createFileRoute('/_applicant/advisor')({
  component: AdvisorPage,
})
