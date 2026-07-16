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

const noteTypePill: Record<string, string> = {
  Task: 'status-pill status-pill-blue',
  Reminder: 'status-pill status-pill-amber',
  Thought: 'status-pill status-pill-purple',
  Note: 'status-pill status-pill-neutral',
}

const leadStatusPill: Record<string, string> = {
  Watchlist: 'status-pill status-pill-neutral',
  Researching: 'status-pill status-pill-blue',
  Messaged: 'status-pill status-pill-amber',
  Replied: 'status-pill status-pill-green',
  Archived: 'status-pill status-pill-neutral',
}

const pipeStatusPill: Record<string, string> = {
  Offer: 'status-pill status-pill-green',
  Interview: 'status-pill status-pill-blue',
  Applied: 'status-pill status-pill-neutral',
  Watchlist: 'status-pill status-pill-amber',
  Rejected: 'status-pill status-pill-red',
  Ghosted: 'status-pill status-pill-neutral',
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
    <section className="hud-panel relative mt-6 p-5 sm:p-6">
      <span className="hud-corners-tr" aria-hidden />
      <span className="hud-corners-bl" aria-hidden />

      <div className="section-rail">
        <h2 className="eyebrow eyebrow-accent !mb-0">Linked items</h2>
      </div>
      <p className="mb-6 text-xs text-[var(--ink-soft)]">
        Connect existing notes, outreach leads, and applications to this project.
      </p>

      <div className="space-y-8">
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">Tasks</h3>
            <Link href="/notes" className="text-xs text-[var(--ink-soft)] hover:text-[var(--accent)]">
              Open Notes
            </Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {tasks.length === 0 && (
              <p className="text-sm text-[var(--ink-faint)]">No tasks linked yet.</p>
            )}
            {tasks.map((n) => (
              <LinkedRow
                key={n.id}
                title={n.title}
                badges={[
                  <span key="t" className={noteTypePill.Task}>Task</span>,
                  n.done ? (
                    <span key="d" className="text-xs text-[var(--ok)]">Done</span>
                  ) : null,
                ]}
                onUnlink={() => unlinkNote(n.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">Notes</h3>
          <div className="mt-3 space-y-1.5">
            {otherNotes.length === 0 && (
              <p className="text-sm text-[var(--ink-faint)]">No other notes linked yet.</p>
            )}
            {otherNotes.map((n) => (
              <LinkedRow
                key={n.id}
                title={n.title}
                badges={[
                  <span key="t" className={noteTypePill[n.type] ?? 'status-pill status-pill-neutral'}>
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
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">Outreach</h3>
            <Link href="/outreach" className="text-xs text-[var(--ink-soft)] hover:text-[var(--accent)]">
              Open Outreach
            </Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {leads.length === 0 && (
              <p className="text-sm text-[var(--ink-faint)]">No leads linked yet.</p>
            )}
            {leads.map((l) => (
              <LinkedRow
                key={l.id}
                title={l.company}
                badges={[
                  <span key="s" className={leadStatusPill[l.status] ?? 'status-pill status-pill-neutral'}>
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
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-2xl tracking-tight text-[var(--ink)]">Pipeline</h3>
            <Link href="/pipeline" className="text-xs text-[var(--ink-soft)] hover:text-[var(--accent)]">
              Open Pipeline
            </Link>
          </div>
          <div className="mt-3 space-y-1.5">
            {apps.length === 0 && (
              <p className="text-sm text-[var(--ink-faint)]">No applications linked yet.</p>
            )}
            {apps.map((a) => (
              <LinkedRow
                key={a.id}
                title={`${a.company}${a.role_title ? ` · ${a.role_title}` : ''}`}
                badges={[
                  <span key="s" className={pipeStatusPill[a.status] ?? 'status-pill status-pill-neutral'}>
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
        </div>
      </div>
    </section>
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
    <div className="group interactive-row flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--ink)]">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">{badges}</div>
      </div>
      <button
        onClick={onUnlink}
        className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--ink-faint)] hover:text-[var(--danger)] group-hover:flex"
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
        className="input-dark flex-1 px-3 py-2 text-sm"
      >
        <option value="">{options.length ? label : 'No unlinked items'}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        onClick={onLink}
        disabled={!value || linking}
        className="btn-primary !px-3 !py-2"
      >
        <Plus size={14} />
        Link
      </button>
    </div>
  )
}
