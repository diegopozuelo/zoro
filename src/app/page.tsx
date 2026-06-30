import { supabase } from '@/lib/supabase'
import MiniRingsCard from '@/components/MiniRingsCard'
import TodayPlan from '@/components/TodayPlan'
import TodayPriorities from '@/components/TodayPriorities'
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

  // This week stats
  function startOfWeek(d: Date) {
    const x = new Date(d)
    const dow = x.getDay()
    const back = (dow + 6) % 7
    x.setDate(x.getDate() - back)
    return x
  }
  const weekStart = ymd(startOfWeek(new Date()))
  const appsThisWeek = (rows ?? []).filter(
    (r) => r.date_applied && r.date_applied >= weekStart
  ).length
  const interviewsActive = counts['Interview'] ?? 0

  const { data: lifeAll } = await supabase.from('life_days').select('entry_date')
  const loggedDays = new Set((lifeAll ?? []).map((r) => r.entry_date))
  let streak = 0
  const cur = new Date()
  if (!loggedDays.has(ymd(cur))) cur.setDate(cur.getDate() - 1)
  while (loggedDays.has(ymd(cur))) {
    streak++
    cur.setDate(cur.getDate() - 1)
  }

  const { data: priorityRows } = await supabase
    .from('priorities')
    .select('id, slot, content, done')
    .eq('entry_date', todayStr)
    .order('slot', { ascending: true })

  const recent = rows?.slice(0, 5) ?? []

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-5xl">Today</h1>
      <p className="mt-1 font-display text-xl text-[var(--ink-soft)]">{today}</p>

      {/* Today's plan */}
      {planItems && planItems.length > 0 && (
        <TodayPlan initialItems={planItems} entryDate={todayStr} />
      )}
      {/* Yesterday recap */}
      <section className="card mt-8 flex items-center gap-6 p-6">
        <MiniRingsCard work={yWork} sleep={ySleep} exercise={yExercise} reading={yReading} />
        <div>
          <p className="text-sm font-medium text-neutral-500">Yesterday</p>
          <p className="mt-1 text-neutral-800">{summary}</p>
        </div>
      </section>

      {/* Pipeline stats */}
      <section className="mt-10">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-6xl">{total}</span>
          <span className="text-[var(--ink-soft)]">applications tracked</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {statusEntries.map(([status, count]) => (
            <span
              key={status}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusColors[status] ?? 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {status}: {count}
            </span>
          ))}
        </div>
      </section>

      {/* This week */}
      <section className="mt-10">
        <h2 className="eyebrow">This week</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="card px-5 py-4">
            <div className="font-display text-4xl">{appsThisWeek}</div>
            <div className="mt-1 text-xs text-[var(--ink-soft)]">Applications</div>
          </div>
          <div className="card px-5 py-4">
            <div className="font-display text-4xl">{interviewsActive}</div>
            <div className="mt-1 text-xs text-[var(--ink-soft)]">Interviews active</div>
          </div>
          <div className="card px-5 py-4">
            <div className="font-display text-4xl">{streak}</div>
            <div className="mt-1 text-xs text-[var(--ink-soft)]">Day logging streak</div>
          </div>
        </div>
      </section>

      {/* Priorities */}
      <TodayPriorities initial={priorityRows ?? []} entryDate={todayStr} />

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="eyebrow">Recent activity</h2>
        <div className="card mt-3 overflow-hidden">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5 last:border-b-0">
              <div>
                <p className="font-medium">{r.company}</p>
                <p className="text-sm text-[var(--ink-soft)]">{r.role_title}</p>
              </div>
              <span className="text-sm text-[var(--ink-soft)]">{r.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}