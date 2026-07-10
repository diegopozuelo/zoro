'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export default function DaySummary({ date }: { date: string }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  async function run() {
    setLoading(true)
    setSummary('')
    const res = await fetch('/api/day-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    })
    const data = await res.json()
    setSummary(data.summary || 'Could not generate a summary.')
    setLoading(false)
  }

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">End of day</h2>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {loading ? 'Reviewing your day...' : 'Summarize my day'}
        </button>
      </div>
      {summary && (
        <div className="card mt-3 whitespace-pre-wrap p-6 text-sm leading-relaxed text-neutral-800">
          {summary}
        </div>
      )}
    </section>
  )
}