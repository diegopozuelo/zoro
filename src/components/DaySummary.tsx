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
    <section className="motion-fade-in mt-10" style={{ animationDelay: '180ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">Debrief</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              Close the loop with an AI read of what you shipped today.
            </p>
          </div>
          <button
            onClick={run}
            disabled={loading}
            className="btn-primary"
          >
            <Sparkles size={16} />
            {loading ? 'Reviewing your day...' : 'Summarize my day'}
          </button>
        </div>
        {summary && (
          <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[rgba(0,0,0,0.25)] p-5 text-sm leading-relaxed text-[var(--ink-soft)]">
            {summary}
          </div>
        )}
      </div>
    </section>
  )
}
