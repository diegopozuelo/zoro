'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Check, Plus } from 'lucide-react'

type Note = {
  id: number
  title: string
  description: string | null
  type: string
  priority: string
  due_date: string | null
  done: boolean
}

const CAP = 9

const priorityDot: Record<string, string> = {
  High: 'bg-red-500',
  Medium: 'bg-amber-500',
  Low: 'bg-neutral-300',
}

export default function TodayNotes({ initial, today }: { initial: Note[]; today: string }) {
    const [notes, setNotes] = useState<Note[]>(initial)
    const [quickText, setQuickText] = useState('')
    const [quickDesc, setQuickDesc] = useState('')
    const [quickType, setQuickType] = useState('Task')
    const [expanded, setExpanded] = useState(false)
    const [adding, setAdding] = useState(false)
  
    async function markDone(note: Note) {
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
      await supabase.from('notes').update({ done: true }).eq('id', note.id)
    }
  
    async function quickAdd() {
        if (!quickText.trim() || adding) return
        setAdding(true)
        const { data } = await supabase
          .from('notes')
          .insert({
            title: quickText.trim(),
            description: quickDesc.trim() || null,
            type: quickType,
            priority: 'High',
            due_date: today,
          })
          .select()
          .single()
        if (data) setNotes((prev) => [data as Note, ...prev])
        setQuickText('')
        setQuickDesc('')
        setQuickType('Task')
        setExpanded(false)
        setAdding(false)
      }

  const shown = notes.slice(0, CAP)
  const extra = notes.length - shown.length

  function dueLabel(due: string | null): { text: string; className: string } | null {
    if (!due) return null
    if (due < today) return { text: 'Overdue', className: 'text-red-600 font-semibold' }
    if (due === today) return { text: 'Due today', className: 'text-neutral-700 font-medium' }
    return null
  }

  return (
    <section className="mt-8">
      <h2 className="eyebrow">Focus today</h2>

{/* Quick add a task for today */}
<div className="mt-3">
        <div className="flex gap-2">
          <input
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !expanded && quickAdd()}
            placeholder="Add a task for today..."
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm outline-none focus:border-neutral-400"
          />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            title="Add details"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
          <button
            onClick={quickAdd}
            disabled={adding || !quickText.trim()}
            className="flex items-center gap-1 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {expanded && (
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <textarea
              rows={2}
              value={quickDesc}
              onChange={(e) => setQuickDesc(e.target.value)}
              placeholder="Description (optional)"
              className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
            <select
              value={quickType}
              onChange={(e) => setQuickType(e.target.value)}
              className="h-fit rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none"
            >
              <option value="Task">Task</option>
              <option value="Reminder">Reminder</option>
              <option value="Thought">Thought</option>
              <option value="Note">Note</option>
            </select>
          </div>
        )}
      </div>

{notes.length === 0 ? (
  <p className="mt-4 text-sm text-[var(--ink-faint)]">
    Nothing on deck. Add a task above or capture more in Notes.
  </p>
) : (
<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((n) => {
          const due = dueLabel(n.due_date)
          return (
            <div
              key={n.id}
              className="group relative rounded-xl border border-amber-200 bg-amber-100/70 p-4 shadow-sm transition"
            >
              <button
                onClick={() => markDone(n)}
                className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-500 opacity-0 transition hover:text-green-600 group-hover:opacity-100"
                title="Mark done"
              >
                <Check size={14} />
              </button>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[n.priority]}`} />
                <span className="text-xs font-medium text-amber-900/70">{n.type}</span>
                {due && <span className={`text-xs ${due.className}`}>· {due.text}</span>}
              </div>
              <p className="mt-2 pr-6 text-sm font-semibold leading-snug text-neutral-800">{n.title}</p>
              {n.description && (
                <p className="mt-1 line-clamp-3 text-xs text-neutral-600">{n.description}</p>
              )}
            </div>
          )
        })}

        {extra > 0 && (
          <Link
            href="/notes"
            className="group relative flex min-h-[140px] items-center justify-center"
          >
            {/* stacked paper effect behind */}
            <div className="absolute inset-x-3 top-2 h-full rounded-xl border border-amber-200 bg-amber-100/40" />
            <div className="absolute inset-x-1.5 top-1 h-full rounded-xl border border-amber-200 bg-amber-100/60" />
            <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-amber-300 bg-amber-100/80 p-4 text-center transition group-hover:bg-amber-200/80">
              <span className="font-display text-3xl text-amber-900">+{extra}</span>
              <span className="mt-1 text-sm font-medium text-amber-900/80">
                more {extra === 1 ? 'note' : 'notes'}
              </span>
              <span className="mt-0.5 text-xs text-amber-800/60">View all in Notes</span>
            </div>
          </Link>
        )}
      </div>
      )}
    </section>
  )
}