import { createFileRoute, redirect } from '@tanstack/react-router'
import { ApplicantLayout } from '@/components/layout/applicant-layout'
import { getCookie } from '@/lib/cookies'

export const Route = createFileRoute('/_applicant')({
  beforeLoad: () => {
    const cookieState = getCookie('thisisjustarandomstring')
    const token = cookieState ? JSON.parse(cookieState) : ''
    if (!token) {
      throw redirect({ to: '/pitch' })
    }
  },
  component: ApplicantLayout,
})
