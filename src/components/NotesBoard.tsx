'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Circle, Check } from 'lucide-react'
import ProjectSelect from '@/components/ProjectSelect'

type Note = {
  id: number
  title: string
  description: string | null
  type: string
  priority: string
  due_date: string | null
  done: boolean
  created_at: string
  project_id: number | null
}

const TYPES = ['Task', 'Reminder', 'Thought', 'Note']
const PRIORITIES = ['Low', 'Medium', 'High']

const typePill: Record<string, string> = {
  Task: 'status-pill status-pill-blue',
  Reminder: 'status-pill status-pill-amber',
  Thought: 'status-pill status-pill-purple',
  Note: 'status-pill status-pill-neutral',
}
const priorityPill: Record<string, string> = {
  Low: 'status-pill status-pill-neutral',
  Medium: 'status-pill status-pill-amber',
  High: 'status-pill status-pill-red',
}

export default function NotesBoard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState('All')
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    type: 'Task',
    priority: 'Medium',
    due_date: '',
    project_id: null as number | null,
  })

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('done', false)
      .order('created_at', { ascending: false })
    setNotes((data as Note[]) ?? [])
  }

  async function addNote() {
    if (!draft.title.trim() || saving) return
    setSaving(true)
    const { data } = await supabase
      .from('notes')
      .insert({
        title: draft.title,
        description: draft.description || null,
        type: draft.type,
        priority: draft.priority,
        due_date: draft.due_date || null,
        project_id: draft.project_id,
      })
      .select()
      .single()
    if (data) setNotes((prev) => [data as Note, ...prev])
    setDraft({ title: '', description: '', type: 'Task', priority: 'Medium', due_date: '', project_id: null })
    setAdding(false)
    setSaving(false)
  }

  async function toggleDone(note: Note) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    await supabase.from('notes').update({ done: true, completed_at: new Date().toISOString() }).eq('id', note.id)
  }

  async function setProject(note: Note, projectId: number | null) {
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, project_id: projectId } : n))
    )
    await supabase.from('notes').update({ project_id: projectId }).eq('id', note.id)
  }

  async function deleteNote(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  const shown = filter === 'All' ? notes : notes.filter((n) => n.type === filter)
  const counts = TYPES.reduce(
    (acc, t) => {
      acc[t] = notes.filter((n) => n.type === t).length
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <section className="motion-fade-in mt-8" style={{ animationDelay: '80ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">Active stack</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-mono-metric text-[var(--accent)]">{notes.length}</span>
              {' '}open
              {filter !== 'All' && (
                <span className="text-[var(--ink-faint)]">
                  {' '}· showing {shown.length}
                </span>
              )}
            </p>
          </div>
          <button onClick={() => setAdding((v) => !v)} className="btn-primary">
            <Plus size={16} />
            New note
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {['All', ...TYPES].map((t) => {
            const active = filter === t
            const count = t === 'All' ? notes.length : counts[t] ?? 0
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition duration-[var(--dur-med)] ${
                  active
                    ? 'bg-[var(--accent)] text-[#041018] shadow-[0_0_16px_var(--accent-glow)]'
                    : 'border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] hover:text-[var(--ink)]'
                }`}
              >
                {t}
                <span className={`ml-1.5 font-mono-metric text-xs ${active ? 'opacity-70' : 'text-[var(--ink-faint)]'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {adding && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--card))] p-4">
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Title, e.g. Research five web tech options for the venture"
              className="input-dark w-full px-3 py-2 text-sm"
              autoFocus
            />
            <textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Description (optional)"
              className="input-dark mt-2 w-full px-3 py-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={draft.type}
                onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                className="input-dark px-2 py-1.5 text-sm"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={draft.priority}
                onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                className="input-dark px-2 py-1.5 text-sm"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <label className="text-xs text-[var(--ink-faint)]">Due</label>
              <input
                type="date"
                value={draft.due_date}
                onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                className="input-dark px-2 py-1.5 text-sm"
              />
              <ProjectSelect
                value={draft.project_id}
                onChange={(projectId) => setDraft((d) => ({ ...d, project_id: projectId }))}
                className="input-dark px-2 py-1.5 text-sm"
              />
              <button onClick={addNote} disabled={saving} className="btn-primary !px-4 !py-2">
                <Check size={14} />
                {saving ? 'Saving...' : 'Add'}
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {shown.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--ink-faint)]">
            Nothing in this filter. Capture something above or switch filters.
          </p>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((n) => (
              <div
                key={n.id}
                className="group relative rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_90%,transparent)] p-4 transition duration-[var(--dur-med)] hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:shadow-[0_0_28px_var(--accent-glow)]"
              >
                <button
                  onClick={() => deleteNote(n.id)}
                  className="absolute right-3 top-3 text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleDone(n)}
                    className="mt-0.5 shrink-0 text-[var(--ink-faint)] transition hover:text-[var(--ok)]"
                    title="Mark done"
                  >
                    <Circle size={16} />
                  </button>
                  <div className="min-w-0 flex-1 pr-5">
                    <p className="text-sm font-semibold leading-snug text-[var(--ink)]">{n.title}</p>
                    {n.description && (
                      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{n.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className={typePill[n.type] ?? 'status-pill status-pill-neutral'}>
                        {n.type}
                      </span>
                      <span className={priorityPill[n.priority] ?? 'status-pill status-pill-neutral'}>
                        {n.priority}
                      </span>
                      {n.due_date && (
                        <span className="status-pill status-pill-neutral">
                          Due {new Date(n.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <ProjectSelect
                        value={n.project_id}
                        onChange={(projectId) => setProject(n, projectId)}
                        includeDoneIds={n.project_id ? [n.project_id] : []}
                        className="input-dark w-full px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
