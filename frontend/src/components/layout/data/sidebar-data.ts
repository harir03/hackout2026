import {
  LayoutDashboard,
  Command,
  Home,
  ClipboardList,
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
      name: 'Minions',
      logo: Command,
      plan: 'Alternate Scoring',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Home',
          url: '/pitch',
          icon: Home,
        },
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'All Decisions',
          url: '/decisions',
          icon: ClipboardList,
        },
      ],
    },
  ],
}
