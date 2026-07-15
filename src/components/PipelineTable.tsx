'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'

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
}

const STATUSES = ['Watchlist', 'Applied', 'Interview', 'Rejected', 'Ghosted', 'Offer']

const statusStyle: Record<string, string> = {
    Offer: 'bg-green-100 text-green-800',
    Interview: 'bg-blue-100 text-blue-800',
    Applied: 'bg-neutral-100 text-neutral-700',
    Watchlist: 'bg-amber-100 text-amber-800',
    Rejected: 'bg-red-100 text-red-700',
    Ghosted: 'bg-neutral-100 text-neutral-400',
  }

const blank: Omit<Row, 'id'> = {
  company: '', role_title: '', role_type: '', city: '',
  status: 'Applied', date_applied: '', job_url: '', notes: '',
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

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          placeholder="Search company, role, status..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        />
        <button
          onClick={() => setBulkOpen((v) => !v)}
          className="whitespace-nowrap rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Paste list
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
        >
          <Plus size={16} />
          Add application
        </button>
      </div>

      {bulkOpen && (
        <div className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <label className="text-xs font-medium text-neutral-600">
            Paste applications, one per line
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Format: Company | Role | Location | URL | Status Date. Example: NumeralHQ | Solutions Engineer | Remote (US) | wellfound.com/... | Applied Jul 9
          </p>
          <textarea
            rows={6}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'NumeralHQ | Solutions Engineer | Remote (US) | wellfound.com/company/numeralhq-1/jobs | Applied Jul 9'}
            className="mt-2 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={addBulk}
              disabled={bulkSaving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {bulkSaving ? 'Adding...' : 'Add all'}
            </button>
            <button
              onClick={() => setBulkOpen(false)}
              className="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
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
          {rows
              .filter((r) => {
                const q = query.toLowerCase()
                return (
                  r.company?.toLowerCase().includes(q) ||
                  r.role_title?.toLowerCase().includes(q) ||
                  r.status?.toLowerCase().includes(q) ||
                  r.city?.toLowerCase().includes(q)
                )
              })
              .map((r) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-3 font-medium">{r.company}</td>
                <td className="px-4 py-3 text-neutral-700">{r.role_title}</td>
                <td className="px-4 py-3 text-neutral-500">{r.role_type}</td>
                <td className="px-4 py-3 text-neutral-500">{r.city}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[r.status] ?? 'bg-neutral-100 text-neutral-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-500">{r.date_applied ?? ''}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(r)}
                    className="text-neutral-400 hover:text-neutral-700"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4" onClick={close}>
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{editing ? 'Edit application' : 'Add application'}</h2>
            <div className="mt-4 space-y-3">
              {(['company', 'role_title', 'role_type', 'city', 'job_url'] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs text-neutral-500">{field.replace('_', ' ')}</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form[field] ?? ''}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-neutral-500">status</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-neutral-500">date applied</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    value={form.date_applied ?? ''}
                    onChange={(e) => setForm({ ...form, date_applied: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-500">notes</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                  value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={save} className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
                Save
              </button>
              <button onClick={close} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}