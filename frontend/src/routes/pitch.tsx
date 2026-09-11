import { createFileRoute } from '@tanstack/react-router'
import { PitchDeckPage } from '@/features/pitch'

export const Route = createFileRoute('/pitch')({
  component: PitchDeckPage,
})
