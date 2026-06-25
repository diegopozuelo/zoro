import { supabase } from '@/lib/supabase'
import MiniRingsCard from '@/components/MiniRingsCard'
import Link from 'next/link'

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const statusColors: Record<string, string> = {
  Applied: 'bg-blue-50 text-blue-700',
  Interview: 'bg-green-50 text-green-700',
  Rejected: 'bg-red-50 text-red-700',
  Ghosted: 'bg-neutral-100 text-neutral-600',
  Watchlist: 'bg-amber-50 text-amber-700',
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function TodayPage() {
  // Pipeline stats
  const { data: rows } = await supabase
    .from('pipeline')
    .select('*')
    .order('date_added', { ascending: false })

  const total = rows?.length ?? 0
  const counts: Record<string, number> = {}
  rows?.forEach((r) => {
    const s = r.status || 'Unknown'
    counts[s] = (counts[s] || 0) + 1
  })
  const statusEntries = Object.entries(counts).sort((a, b) => b[1] - a[1])

  // Today's plan
  const todayStr = ymd(new Date())
  const { data: planItems } = await supabase
    .from('plan_items')
    .select('*')
    .eq('entry_date', todayStr)
    .order('sort_order', { ascending: true })

  // Yesterday's life data
  const y = new Date()
  y.setDate(y.getDate() - 1)
  const yStr = ymd(y)

  const { data: day } = await supabase
    .from('life_days')
    .select('*')
    .eq('entry_date', yStr)
    .maybeSingle()
  const { data: wos } = await supabase
    .from('workouts')
    .select('minutes')
    .eq('entry_date', yStr)

  const yWork = day?.work_hours ?? 0
  const ySleep = day?.sleep_hours ?? 0
  const yReading = day?.reading_minutes ?? 0
  const yExercise = (wos ?? []).reduce((sum, w) => sum + Number(w.minutes), 0)

  // Summary math
  const ratios = [
    yWork / GOALS.work,
    ySleep / GOALS.sleep,
    yExercise / GOALS.exercise,
    yReading / GOALS.reading,
  ]
  const goalsHit = ratios.filter((r) => r >= 1).length
  const avgPct = Math.round((ratios.reduce((a, b) => a + b, 0) / 4) * 100)
  const hasYesterday = yWork || ySleep || yReading || yExercise

  let summary = ''
  if (!hasYesterday) {
    summary = 'No data logged for yesterday. Log it on the Life page to start your streak.'
  } else if (goalsHit === 4) {
    summary = `You closed all 4 rings and averaged ${avgPct}% across your goals. Elite day.`
  } else if (goalsHit >= 2) {
    summary = `You hit ${goalsHit} of 4 goals and averaged ${avgPct}% across your rings. Solid day.`
  } else {
    summary = `You hit ${goalsHit} of 4 goals, averaging ${avgPct}%. Today is a fresh start.`
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const recent = rows?.slice(0, 5) ?? []

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold">Today</h1>
      <p className="mt-1 text-neutral-500">{today}</p>

      {/* Today's plan */}
      {planItems && planItems.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-neutral-500">Your plan for today</h2>
          <div className="mt-3 space-y-1.5">
            {planItems.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2.5">
                <span className="w-28 shrink-0 text-xs text-neutral-500">
                  {it.start_time} to {it.end_time}
                </span>
                <span className="flex-1 text-sm">{it.content}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {/* Yesterday recap */}
      <section className="mt-6 flex items-center gap-6 rounded-2xl border border-neutral-200 p-6">
        <MiniRingsCard work={yWork} sleep={ySleep} exercise={yExercise} reading={yReading} />
        <div>
          <p className="text-sm font-medium text-neutral-500">Yesterday</p>
          <p className="mt-1 text-neutral-800">{summary}</p>
        </div>
      </section>

      {/* Pipeline stats */}
      <section className="mt-8">
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-semibold">{total}</span>
          <span className="text-neutral-500">applications tracked</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                statusColors[status] ?? 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {status}: {count}
            </span>
          ))}
        </div>
      </section>

      {/* Priorities */}
      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">Top 3 priorities</h2>
        <div className="mt-3 space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-neutral-200 px-4 py-3 text-neutral-400">
              Priority {n}
            </div>
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="text-sm font-medium text-neutral-500">Recent activity</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
              <div>
                <p className="font-medium">{r.company}</p>
                <p className="text-sm text-neutral-500">{r.role_title}</p>
              </div>
              <span className="text-sm text-neutral-500">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}