import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'
import { getCookie } from '@/lib/cookies'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    const cookieState = getCookie('thisisjustarandomstring')
    const token = cookieState ? JSON.parse(cookieState) : ''
    if (!token) {
      throw redirect({
        to: '/sign-in',
        search: { redirect: location.href },
      })
    }

    const savedUser = localStorage.getItem('altgrade-user')
    if (savedUser) {
      const user = JSON.parse(savedUser)
      if (!user.role?.includes('admin')) {
        throw redirect({ to: '/' })
      }
    }
  },
  component: AuthenticatedLayout,
})
