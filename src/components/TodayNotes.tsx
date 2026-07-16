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
  High: 'bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]',
  Medium: 'bg-[var(--warn)] shadow-[0_0_6px_var(--warn)]',
  Low: 'bg-[var(--ink-faint)]',
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
    await supabase.from('notes').update({ done: true, completed_at: new Date().toISOString() }).eq('id', note.id)
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
    if (due < today) return { text: 'Overdue', className: 'text-[var(--danger)] font-semibold' }
    if (due === today) return { text: 'Due today', className: 'text-[var(--accent)] font-medium' }
    return null
  }

  return (
    <section className="motion-fade-in mt-10" style={{ animationDelay: '120ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Focus queue</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--ink-soft)]">
          High signal tasks for today. Clear the stack before deep work.
        </p>

      <div>
        <div className="flex gap-2">
          <input
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !expanded && quickAdd()}
            placeholder="Add a task for today..."
            className="input-dark flex-1 px-4 py-2 text-sm"
          />
          <button
            onClick={() => setExpanded((v) => !v)}
            className="btn-ghost"
            title="Add details"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
          <button
            onClick={quickAdd}
            disabled={adding || !quickText.trim()}
            className="btn-primary"
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
              className="input-dark flex-1 px-3 py-2 text-sm"
            />
            <select
              value={quickType}
              onChange={(e) => setQuickType(e.target.value)}
              className="input-dark h-fit px-2 py-2 text-sm"
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
                className="group relative rounded-xl border border-[color-mix(in_srgb,var(--accent)_22%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_8%,var(--card))] p-4 shadow-[0_0_20px_rgba(61,213,255,0.06)] transition duration-[var(--dur-med)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                <button
                  onClick={() => markDone(n)}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-elevated)] text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--ok)] group-hover:opacity-100"
                  title="Mark done"
                >
                  <Check size={14} />
                </button>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[n.priority] ?? priorityDot.Low}`} />
                  <span className="text-xs font-medium text-[var(--accent)]">{n.type}</span>
                  {due && <span className={`text-xs ${due.className}`}>· {due.text}</span>}
                </div>
                <p className="mt-2 pr-6 text-sm font-semibold leading-snug text-[var(--ink)]">{n.title}</p>
                {n.description && (
                  <p className="mt-1 line-clamp-3 text-xs text-[var(--ink-soft)]">{n.description}</p>
                )}
              </div>
            )
          })}

          {extra > 0 && (
            <Link
              href="/notes"
              className="group relative flex min-h-[140px] items-center justify-center"
            >
              <div className="absolute inset-x-3 top-2 h-full rounded-xl border border-[var(--line)] bg-[var(--card)]/40" />
              <div className="absolute inset-x-1.5 top-1 h-full rounded-xl border border-[var(--line)] bg-[var(--card)]/70" />
              <div className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[var(--accent-dim)] p-4 text-center transition group-hover:shadow-[0_0_24px_var(--accent-glow)]">
                <span className="font-mono-metric text-3xl text-[var(--accent)]">+{extra}</span>
                <span className="mt-1 text-sm font-medium text-[var(--ink)]">
                  more {extra === 1 ? 'note' : 'notes'}
                </span>
                <span className="mt-0.5 text-xs text-[var(--ink-soft)]">View all in Notes</span>
              </div>
            </Link>
          )}
        </div>
      )}
      </div>
    </section>
  )
}
