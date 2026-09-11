import { createFileRoute } from '@tanstack/react-router'
import { ScorePage } from '@/features/score'

export const Route = createFileRoute('/_applicant/score')({
  component: ScorePage,
})
