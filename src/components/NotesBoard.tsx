'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Circle, CheckCircle2, X } from 'lucide-react'

type Note = {
  id: number
  title: string
  description: string | null
  type: string
  priority: string
  due_date: string | null
  done: boolean
  created_at: string
}

const TYPES = ['Task', 'Reminder', 'Thought', 'Note']
const PRIORITIES = ['Low', 'Medium', 'High']

const typeColor: Record<string, string> = {
  Task: 'bg-blue-50 text-blue-700',
  Reminder: 'bg-amber-50 text-amber-700',
  Thought: 'bg-purple-50 text-purple-700',
  Note: 'bg-neutral-100 text-neutral-600',
}
const priorityColor: Record<string, string> = {
  Low: 'bg-neutral-100 text-neutral-500',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-red-50 text-red-700',
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
      })
      .select()
      .single()
    if (data) setNotes((prev) => [data as Note, ...prev])
    setDraft({ title: '', description: '', type: 'Task', priority: 'Medium', due_date: '' })
    setAdding(false)
    setSaving(false)
  }

  async function toggleDone(note: Note) {
    // marking done removes it from the active board
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    await supabase.from('notes').update({ done: true }).eq('id', note.id)
  }

  async function deleteNote(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notes').delete().eq('id', id)
  }

  const shown = filter === 'All' ? notes : notes.filter((n) => n.type === filter)

  return (
    <div className="mt-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {['All', ...TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                filter === t ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          <Plus size={16} />
          New note
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="card mt-4 p-5">
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title, e.g. Research 5 web tech options for the venture"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            autoFocus
          />
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Description (optional)"
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={draft.priority}
              onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="text-xs text-neutral-500">Due</label>
            <input
              type="date"
              value={draft.due_date}
              onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
              className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              onClick={addNote}
              disabled={saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add'}
            </button>
            <button onClick={() => setAdding(false)} className="text-sm text-neutral-500 hover:text-neutral-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes grid */}
      {shown.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--ink-faint)]">Nothing here yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((n) => (
            <div key={n.id} className="card group relative p-4">
              <button
                onClick={() => deleteNote(n.id)}
                className="absolute right-3 top-3 hidden text-neutral-300 hover:text-red-600 group-hover:block"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
              <div className="flex items-start gap-2">
                <button
                  onClick={() => toggleDone(n)}
                  className="mt-0.5 shrink-0 text-neutral-400 hover:text-green-600"
                  title="Mark done"
                >
                  <Circle size={16} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  {n.description && (
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">{n.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[n.type]}`}>
                      {n.type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[n.priority]}`}>
                      {n.priority}
                    </span>
                    {n.due_date && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        Due {new Date(n.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}