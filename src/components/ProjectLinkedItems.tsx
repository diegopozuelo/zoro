'use client'
import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Link2Off, Plus } from 'lucide-react'

type NoteRow = {
  id: number
  title: string
  type: string
  priority: string
  due_date: string | null
  done: boolean
  project_id: number | null
}

type LeadRow = {
  id: number
  company: string
  status: string
  project_id: number | null
}

type PipeRow = {
  id: number
  company: string
  role_title: string
  status: string
  project_id: number | null
}

const noteTypeColor: Record<string, string> = {
  Task: 'bg-blue-50 text-blue-700',
  Reminder: 'bg-amber-50 text-amber-700',
  Thought: 'bg-purple-50 text-purple-700',
  Note: 'bg-neutral-100 text-neutral-600',
}

const leadStatusColor: Record<string, string> = {
  Watchlist: 'bg-neutral-100 text-neutral-700',
  Researching: 'bg-blue-50 text-blue-700',
  Messaged: 'bg-amber-50 text-amber-700',
  Replied: 'bg-green-50 text-green-700',
  Archived: 'bg-neutral-100 text-neutral-400',
}

const pipeStatusColor: Record<string, string> = {
  Offer: 'bg-green-100 text-green-800',
  Interview: 'bg-blue-100 text-blue-800',
  Applied: 'bg-neutral-100 text-neutral-700',
  Watchlist: 'bg-amber-100 text-amber-800',
  Rejected: 'bg-red-100 text-red-700',
  Ghosted: 'bg-neutral-100 text-neutral-400',
}

export default function ProjectLinkedItems({ projectId }: { projectId: number }) {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [apps, setApps] = useState<PipeRow[]>([])
  const [availNotes, setAvailNotes] = useState<NoteRow[]>([])
  const [availLeads, setAvailLeads] = useState<LeadRow[]>([])
  const [availApps, setAvailApps] = useState<PipeRow[]>([])
  const [pickNote, setPickNote] = useState('')
  const [pickLead, setPickLead] = useState('')
  const [pickApp, setPickApp] = useState('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    const [linkedNotes, freeNotes, linkedLeads, freeLeads, linkedApps, freeApps] =
      await Promise.all([
        supabase
          .from('notes')
          .select('id, title, type, priority, due_date, done, project_id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('notes')
          .select('id, title, type, priority, due_date, done, project_id')
          .is('project_id', null)
          .eq('done', false)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('leads')
          .select('id, company, status, project_id')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        supabase
          .from('leads')
          .select('id, company, status, project_id')
          .is('project_id', null)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('pipeline')
          .select('id, company, role_title, status, project_id')
          .eq('project_id', projectId)
          .order('date_added', { ascending: false }),
        supabase
          .from('pipeline')
          .select('id, company, role_title, status, project_id')
          .is('project_id', null)
          .order('date_added', { ascending: false })
          .limit(50),
      ])

    setNotes((linkedNotes.data as NoteRow[]) ?? [])
    setAvailNotes((freeNotes.data as NoteRow[]) ?? [])
    setLeads((linkedLeads.data as LeadRow[]) ?? [])
    setAvailLeads((freeLeads.data as LeadRow[]) ?? [])
    setApps((linkedApps.data as PipeRow[]) ?? [])
    setAvailApps((freeApps.data as PipeRow[]) ?? [])
  }

  async function linkNote() {
    const id = Number(pickNote)
    if (!id || linking) return
    setLinking(true)
    await supabase.from('notes').update({ project_id: projectId }).eq('id', id)
    setPickNote('')
    await load()
    setLinking(false)
  }

  async function unlinkNote(id: number) {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    await supabase.from('notes').update({ project_id: null }).eq('id', id)
    await load()
  }

  async function linkLead() {
    const id = Number(pickLead)
    if (!id || linking) return
    setLinking(true)
    await supabase.from('leads').update({ project_id: projectId }).eq('id', id)
    setPickLead('')
    await load()
    setLinking(false)
  }

  async function unlinkLead(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    await supabase.from('leads').update({ project_id: null }).eq('id', id)
    await load()
  }

  async function linkApp() {
    const id = Number(pickApp)
    if (!id || linking) return
    setLinking(true)
    await supabase.from('pipeline').update({ project_id: projectId }).eq('id', id)
    setPickApp('')
    await load()
    setLinking(false)
  }

  async function unlinkApp(id: number) {
    setApps((prev) => prev.filter((a) => a.id !== id))
    await supabase.from('pipeline').update({ project_id: null }).eq('id', id)
    await load()
  }

  const tasks = notes.filter((n) => n.type === 'Task')
  const otherNotes = notes.filter((n) => n.type !== 'Task')

  return (
    <div className="mt-10 space-y-8">
      <div>
        <h2 className="eyebrow">Linked items</h2>
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          Connect existing notes, outreach leads, and applications to this project.
        </p>
      </div>

      {/* Tasks (notes typed as Task) */}
      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-2xl">Tasks</h3>
          <Link href="/notes" className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]">
            Open Notes
          </Link>
        </div>
        <div className="mt-3 space-y-1.5">
          {tasks.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">No tasks linked yet.</p>
          )}
          {tasks.map((n) => (
            <LinkedRow
              key={n.id}
              title={n.title}
              badges={[
                <span key="t" className={`rounded-full px-2 py-0.5 text-xs font-medium ${noteTypeColor.Task}`}>
                  Task
                </span>,
                n.done ? (
                  <span key="d" className="text-xs text-green-600">
                    Done
                  </span>
                ) : null,
              ]}
              onUnlink={() => unlinkNote(n.id)}
            />
          ))}
        </div>
      </section>

      {/* Other notes */}
      <section>
        <h3 className="font-display text-2xl">Notes</h3>
        <div className="mt-3 space-y-1.5">
          {otherNotes.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">No other notes linked yet.</p>
          )}
          {otherNotes.map((n) => (
            <LinkedRow
              key={n.id}
              title={n.title}
              badges={[
                <span
                  key="t"
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    noteTypeColor[n.type] ?? 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {n.type}
                </span>,
              ]}
              onUnlink={() => unlinkNote(n.id)}
            />
          ))}
        </div>
        <LinkPicker
          label="Link a note"
          value={pickNote}
          onChange={setPickNote}
          onLink={linkNote}
          linking={linking}
          options={availNotes.map((n) => ({
            value: String(n.id),
            label: `${n.type}: ${n.title}`,
          }))}
        />
      </section>

      {/* Leads */}
      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-2xl">Outreach</h3>
          <Link href="/outreach" className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]">
            Open Outreach
          </Link>
        </div>
        <div className="mt-3 space-y-1.5">
          {leads.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">No leads linked yet.</p>
          )}
          {leads.map((l) => (
            <LinkedRow
              key={l.id}
              title={l.company}
              badges={[
                <span
                  key="s"
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    leadStatusColor[l.status] ?? 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {l.status}
                </span>,
              ]}
              onUnlink={() => unlinkLead(l.id)}
            />
          ))}
        </div>
        <LinkPicker
          label="Link a lead"
          value={pickLead}
          onChange={setPickLead}
          onLink={linkLead}
          linking={linking}
          options={availLeads.map((l) => ({
            value: String(l.id),
            label: `${l.company} (${l.status})`,
          }))}
        />
      </section>

      {/* Pipeline */}
      <section>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-2xl">Pipeline</h3>
          <Link href="/pipeline" className="text-xs text-[var(--ink-soft)] hover:text-[var(--ink)]">
            Open Pipeline
          </Link>
        </div>
        <div className="mt-3 space-y-1.5">
          {apps.length === 0 && (
            <p className="text-sm text-[var(--ink-soft)]">No applications linked yet.</p>
          )}
          {apps.map((a) => (
            <LinkedRow
              key={a.id}
              title={`${a.company}${a.role_title ? ` · ${a.role_title}` : ''}`}
              badges={[
                <span
                  key="s"
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    pipeStatusColor[a.status] ?? 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {a.status}
                </span>,
              ]}
              onUnlink={() => unlinkApp(a.id)}
            />
          ))}
        </div>
        <LinkPicker
          label="Link an application"
          value={pickApp}
          onChange={setPickApp}
          onLink={linkApp}
          linking={linking}
          options={availApps.map((a) => ({
            value: String(a.id),
            label: `${a.company}${a.role_title ? ` · ${a.role_title}` : ''} (${a.status})`,
          }))}
        />
      </section>
    </div>
  )
}

function LinkedRow({
  title,
  badges,
  onUnlink,
}: {
  title: string
  badges: ReactNode[]
  onUnlink: () => void
}) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div>
      </div>
      <button
        onClick={onUnlink}
        className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-neutral-400 hover:text-red-600 group-hover:flex"
        title="Unlink from project"
      >
        <Link2Off size={14} />
        Unlink
      </button>
    </div>
  )
}

function LinkPicker({
  label,
  value,
  onChange,
  onLink,
  linking,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onLink: () => void
  linking: boolean
  options: { value: string; label: string }[]
}) {
  return (
    <div className="mt-3 flex gap-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
      >
        <option value="">{options.length ? label : `No unlinked items`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        onClick={onLink}
        disabled={!value || linking}
        className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
      >
        <Plus size={14} />
        Link
      </button>
    </div>
  )
}
