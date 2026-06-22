import { createFileRoute } from '@tanstack/react-router'
import { ApplicantLayout } from '@/components/layout/applicant-layout'

export const Route = createFileRoute('/_applicant')({
  component: ApplicantLayout,
})
