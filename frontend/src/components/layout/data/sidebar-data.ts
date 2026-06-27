import {
  LayoutDashboard,
  Command,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Loan Officer',
    email: 'officer@ica.dev',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'AltGrade',
      logo: Command,
      plan: 'Alternate Scoring',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
  ],
}
