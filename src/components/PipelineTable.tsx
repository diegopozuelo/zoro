'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'
import ProjectSelect from '@/components/ProjectSelect'

type Row = {
  id: number
  company: string
  role_title: string
  role_type: string
  city: string
  status: string
  date_applied: string | null
  job_url: string
  notes: string
  project_id: number | null
}

const STATUSES = ['Watchlist', 'Applied', 'Interview', 'Rejected', 'Ghosted', 'Offer']

const statusStyle: Record<string, string> = {
  Offer: 'status-pill status-pill-green',
  Interview: 'status-pill status-pill-blue',
  Applied: 'status-pill status-pill-neutral',
  Watchlist: 'status-pill status-pill-amber',
  Rejected: 'status-pill status-pill-red',
  Ghosted: 'status-pill status-pill-neutral',
}

const blank: Omit<Row, 'id'> = {
  company: '', role_title: '', role_type: '', city: '',
  status: 'Applied', date_applied: '', job_url: '', notes: '', project_id: null,
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
}

// Parse "Applied Jul 9" -> { status: 'Applied', date: '2026-07-09' }
function parseStatusDate(raw: string): { status: string; date: string | null } {
  const parts = raw.trim().split(/\s+/)
  const status = parts[0] || 'Applied'
  const rest = parts.slice(1).join(' ').toLowerCase()
  const m = rest.match(/([a-z]{3})[a-z]*\s+(\d{1,2})/)
  if (m && MONTHS[m[1]]) {
    const year = new Date().getFullYear()
    const day = m[2].padStart(2, '0')
    return { status, date: `${year}-${MONTHS[m[1]]}-${day}` }
  }
  return { status, date: null }
}

export default function PipelineTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [editing, setEditing] = useState<Row | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Omit<Row, 'id'>>(blank)
  const [query, setQuery] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  async function addBulk() {
    if (!bulkText.trim() || bulkSaving) return
    setBulkSaving(true)
    const d = new Date()
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    // Format per line: Company | Role | Location | URL | Applied Jul 9
    const payloads = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [company, role, location, url, statusDate] = line.split('|').map((s) => s?.trim() ?? '')
        const parsed = statusDate ? parseStatusDate(statusDate) : { status: 'Applied', date: null }
        return {
          company: company || 'Untitled',
          role_title: role || '',
          role_type: '',
          city: location || '',
          status: parsed.status || 'Applied',
          date_applied: parsed.date || today,
          job_url: url || '',
          notes: '',
        }
      })
    const { data } = await supabase.from('pipeline').insert(payloads).select()
    if (data) setRows((prev) => [...(data as Row[]), ...prev])
    setBulkText('')
    setBulkOpen(false)
    setBulkSaving(false)
  }

  function openAdd() {
    setForm(blank)
    setAdding(true)
  }

  function openEdit(row: Row) {
    setForm({ ...row })
    setEditing(row)
  }

  async function save() {
    const payload = {
      company: form.company,
      role_title: form.role_title,
      role_type: form.role_type,
      city: form.city,
      status: form.status,
      date_applied: form.date_applied || null,
      job_url: form.job_url,
      notes: form.notes,
      project_id: form.project_id ?? null,
    }
    if (editing) {
      await supabase.from('pipeline').update(payload).eq('id', editing.id)
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)))
      setEditing(null)
    } else {
      const { data } = await supabase.from('pipeline').insert(payload).select().single()
      if (data) setRows((prev) => [data as Row, ...prev])
      setAdding(false)
    }
  }

  function close() {
    setEditing(null)
    setAdding(false)
  }

  const showForm = adding || editing !== null
  const filtered = rows.filter((r) => {
    const q = query.toLowerCase()
    return (
      r.company?.toLowerCase().includes(q) ||
      r.role_title?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q)
    )
  })

  return (
    <section className="motion-fade-in mt-8" style={{ animationDelay: '80ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search company, role, status..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-dark flex-1 px-4 py-2 text-sm"
          />
          <button
            onClick={() => setBulkOpen((v) => !v)}
            className="btn-ghost whitespace-nowrap"
          >
            Paste list
          </button>
          <button onClick={openAdd} className="btn-primary whitespace-nowrap">
            <Plus size={16} />
            Add application
          </button>
        </div>

        {bulkOpen && (
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--accent)_6%,var(--card))] p-4">
            <label className="eyebrow">Paste applications, one per line</label>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Format: Company | Role | Location | URL | Status Date. Example: NumeralHQ | Solutions Engineer | Remote (US) | wellfound.com/... | Applied Jul 9
            </p>
            <textarea
              rows={6}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'NumeralHQ | Solutions Engineer | Remote (US) | wellfound.com/company/numeralhq-1/jobs | Applied Jul 9'}
              className="input-dark mt-2 w-full px-3 py-2 font-mono text-xs"
            />
            <div className="mt-2 flex gap-2">
              <button onClick={addBulk} disabled={bulkSaving} className="btn-primary">
                {bulkSaving ? 'Adding...' : 'Add all'}
              </button>
              <button
                onClick={() => setBulkOpen(false)}
                className="text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full text-sm">
            <thead className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_70%,transparent)] text-left text-[var(--ink-faint)]">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">City</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="interactive-row border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_50%,transparent)]"
                >
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{r.company}</td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">{r.role_title}</td>
                  <td className="px-4 py-3 text-[var(--ink-faint)]">{r.role_type}</td>
                  <td className="px-4 py-3 text-[var(--ink-faint)]">{r.city}</td>
                  <td className="px-4 py-3">
                    <span className={statusStyle[r.status] ?? 'status-pill status-pill-neutral'}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono-metric text-xs text-[var(--ink-faint)]">{r.date_applied ?? ''}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(r)}
                      className="text-sm text-[var(--ink-faint)] transition hover:text-[var(--accent)]"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-[color-mix(in_srgb,#041018_60%,transparent)] p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="hud-panel w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="hud-corners-tr" aria-hidden />
            <span className="hud-corners-bl" aria-hidden />
            <h2 className="font-display text-2xl text-[var(--ink)]">
              {editing ? 'Edit application' : 'Add application'}
            </h2>
            <div className="mt-4 space-y-3">
              {(['company', 'role_title', 'role_type', 'city', 'job_url'] as const).map((field) => (
                <div key={field}>
                  <label className="eyebrow">{field.replace('_', ' ')}</label>
                  <input
                    className="input-dark mt-1 w-full px-3 py-2 text-sm"
                    value={form[field] ?? ''}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="eyebrow">status</label>
                  <select
                    className="input-dark mt-1 w-full px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="eyebrow">date applied</label>
                  <input
                    type="date"
                    className="input-dark mt-1 w-full px-3 py-2 text-sm"
                    value={form.date_applied ?? ''}
                    onChange={(e) => setForm({ ...form, date_applied: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="eyebrow">notes</label>
                <textarea
                  rows={3}
                  className="input-dark mt-1 w-full px-3 py-2 text-sm"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div>
                <label className="eyebrow">project</label>
                <ProjectSelect
                  value={form.project_id ?? null}
                  onChange={(projectId) => setForm({ ...form, project_id: projectId })}
                  includeDoneIds={form.project_id ? [form.project_id] : []}
                  className="input-dark mt-1 w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={save} className="btn-primary">
                Save
              </button>
              <button onClick={close} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
