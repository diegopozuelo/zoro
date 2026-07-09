'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, User, KanbanSquare, MessageSquare,
  Send, CalendarCheck, NotebookPen, Lightbulb, Activity, StickyNote,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Today', icon: LayoutDashboard },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/assistant', label: 'Assistant', icon: MessageSquare },
  { href: '/outreach', label: 'Outreach', icon: Send },
  { href: '/planner', label: 'Planner', icon: CalendarCheck },
  { href: '/journal', label: 'Journal', icon: NotebookPen },
  { href: '/brainstorm', label: 'Brainstorm', icon: Lightbulb },
  { href: '/life', label: 'Life', icon: Activity },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-1 border-r border-neutral-200 bg-neutral-50 p-4">
      <div className="px-3 py-4">
        <span className="text-lg font-semibold tracking-tight">Zoro</span>
        <p className="text-xs text-neutral-400">DP Second Brain</p>
      </div>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </aside>
  )
}