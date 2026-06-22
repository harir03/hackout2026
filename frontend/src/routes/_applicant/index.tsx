import { createFileRoute } from '@tanstack/react-router'
import { ConsentPage } from '@/features/consent'

export const Route = createFileRoute('/_applicant/')({
  component: ConsentPage,
})
