'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, User, KanbanSquare, MessageSquare, Sparkles,
  Send, CalendarCheck, NotebookPen, Lightbulb, Activity, StickyNote, FolderKanban,
} from 'lucide-react'

const nav = [
  { href: '/', label: 'Today', icon: LayoutDashboard },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/fresh-batch', label: 'Fresh Batch', icon: Sparkles },
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
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--line)] bg-[var(--paper-elevated)] p-4">
      <div className="px-3 py-4">
        <span className="font-display text-lg tracking-tight text-[var(--ink)]">Zoro</span>
        <p className="mt-0.5 text-xs text-[var(--ink-faint)]">DP Second Brain</p>
      </div>
      {nav.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-[var(--dur-med)] ${
              active
                ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                : 'text-[var(--ink-soft)] hover:bg-white/5 hover:text-[var(--ink)]'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
            )}
            <Icon size={18} />
            {label}
          </Link>
        )
      })}
    </aside>
  )
}
