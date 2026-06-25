'use client'
import { useState } from 'react'

const ANGLES = [
  'Warm reconnect',
  'Direct cold outreach',
  'Generalist pitch (can build and operate)',
  'Referral follow-up',
  'Application follow-up',
]

export default function OutreachPage() {
  const [company, setCompany] = useState('')
  const [person, setPerson] = useState('')
  const [role, setRole] = useState('')
  const [angle, setAngle] = useState(ANGLES[2])
  const [context, setContext] = useState('')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function generate() {
    if (!company.trim() || loading) return
    setLoading(true)
    setDraft('')
    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, person, role, angle, context }),
    })
    const data = await res.json()
    setDraft(data.draft)
    setLoading(false)
  }

  function copy() {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Outreach</h1>
      <p className="mt-1 text-neutral-500">Draft a tailored message in your voice.</p>

      <div className="mt-6 grid grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500">Company</label>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Person (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Role or area (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Angle</label>
            <select
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
            >
              {ANGLES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Extra context (optional)</label>
            <textarea
              rows={4}
              placeholder="Paste the job description, a shared connection, anything relevant..."
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {loading ? 'Drafting...' : 'Draft message'}
          </button>
        </div>

        {/* Output */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-neutral-500">Draft</label>
            {draft && (
              <button onClick={copy} className="text-xs text-neutral-500 hover:text-neutral-800">
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
          <div className="mt-1 min-h-[300px] whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
            {draft || <span className="text-neutral-400">Your draft will appear here.</span>}
          </div>
        </div>
      </div>
    </div>
  )
}