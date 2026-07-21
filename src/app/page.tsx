import { supabase } from '@/lib/supabase'
import MiniRingsCard from '@/components/MiniRingsCard'
import TodayPlan from '@/components/TodayPlan'
import TodayPriorities from '@/components/TodayPriorities'
import TodayNotes from '@/components/TodayNotes'
import DaySummary from '@/components/DaySummary'
import CommandClock from '@/components/CommandClock'
import PhaseBadge from '@/components/PhaseBadge'
import HeroVisuals from '@/components/HeroVisuals'
import HudShell from '@/components/HudShell'

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const statusPill: Record<string, string> = {
  Applied: 'status-pill status-pill-blue',
  Interview: 'status-pill status-pill-green',
  Rejected: 'status-pill status-pill-red',
  Ghosted: 'status-pill status-pill-neutral',
  Watchlist: 'status-pill status-pill-amber',
  Offer: 'status-pill status-pill-green',
  Researching: 'status-pill status-pill-blue',
  Messaged: 'status-pill status-pill-amber',
  Replied: 'status-pill status-pill-green',
  Archived: 'status-pill status-pill-neutral',
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function TodayPage() {
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

  const todayStr = ymd(new Date())
  const { data: planItems } = await supabase
    .from('plan_items')
    .select('*')
    .eq('entry_date', todayStr)
    .order('sort_order', { ascending: true })

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

  const { data: allEvents } = await supabase
    .from('outreach_events')
    .select('action_type, created_at')

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const msgToday = (allEvents ?? []).filter(
    (e) => e.action_type === 'messaged' && new Date(e.created_at) >= todayMidnight
  ).length
  const msgWeek = (allEvents ?? []).filter(
    (e) => e.action_type === 'messaged' && ymd(new Date(e.created_at)) >= weekStart
  ).length
  const msgTotal = (allEvents ?? []).filter((e) => e.action_type === 'messaged').length

  const { data: allLeads } = await supabase.from('leads').select('status')
  const leadCounts: Record<string, number> = {}
  ;(allLeads ?? []).forEach((l) => {
    const s = l.status || 'Watchlist'
    leadCounts[s] = (leadCounts[s] || 0) + 1
  })
  const leadTotal = allLeads?.length ?? 0
  const LEAD_STATUSES = ['Watchlist', 'Researching', 'Messaged', 'Replied', 'Archived']

  const { data: focusRaw } = await supabase
    .from('notes')
    .select('*')
    .eq('done', false)

  function rank(n: { due_date: string | null; priority: string }) {
    if (n.due_date && n.due_date < todayStr) return 0
    if (n.due_date === todayStr) return 1
    if (n.priority === 'High') return 2
    if (n.priority === 'Medium') return 3
    return 4
  }
  const focusNotes = [...(focusRaw ?? [])].sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })

  const recent = rows?.slice(0, 5) ?? []
  const planDone = (planItems ?? []).filter((i) => i.done).length
  const planTotal = (planItems ?? []).length

  return (
    <HudShell>
      {/* Command hero */}
      <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-7">
        <HeroVisuals />
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l-2 border-t-2 border-[color-mix(in_srgb,var(--accent)_70%,transparent)]" aria-hidden />
        <div className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-[color-mix(in_srgb,var(--accent)_70%,transparent)]" aria-hidden />

        <div className="status-rail relative z-[1] text-xs text-[var(--ink-soft)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ok)_35%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_10%,transparent)] px-3 py-1 font-mono-metric tracking-wide text-[var(--ok)]">
            <span className="live-dot" />
            LIVE
          </span>
          <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
            ZORO // OPS
          </span>
          <span className="hidden text-[var(--ink-faint)] sm:inline">·</span>
          <PhaseBadge />
          <span className="hidden text-[var(--ink-faint)] sm:inline">·</span>
          <span className="hidden sm:inline">{today}</span>
          <span className="ml-auto font-mono-metric text-sm">
            <CommandClock />
          </span>
        </div>

        <div className="relative z-[1] mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="relative">
            <p className="eyebrow eyebrow-accent">Command center</p>
            <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl">
              Today
            </h1>
            <div className="hero-title-rule mt-3" aria-hidden />
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
              Your job search ops board. Rings, outreach, pipeline, and the plan for the day in one view built to ship.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Plan</div>
              <div className="mt-0.5 font-mono-metric text-2xl text-[var(--ink)]">
                {planDone}
                <span className="text-[var(--ink-faint)]">/{planTotal || 0}</span>
              </div>
            </div>
            <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Streak</div>
              <div className="mt-0.5 font-mono-metric text-2xl text-[var(--accent)] ">
                {streak}
              </div>
            </div>
            <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Pipeline</div>
              <div className="mt-0.5 font-mono-metric text-2xl text-[var(--ink)]">{total}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Mission + pulse metrics */}
      <section
        className="motion-fade-in mt-10 grid gap-5 lg:grid-cols-12"
        style={{ animationDelay: '60ms' }}
      >
        <div className="hud-panel relative p-6 sm:p-8 lg:col-span-7">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Mission status</h2>
          </div>
          <div className="mt-2 flex flex-col gap-8 sm:flex-row sm:items-center">
            <div className="relative mx-auto sm:mx-0">
              <MiniRingsCard
                work={yWork}
                sleep={ySleep}
                exercise={yExercise}
                reading={yReading}
              />
            </div>
            <div className="flex-1">
              <p className="font-mono-metric text-4xl leading-none text-[var(--ink)] sm:text-5xl">
                {goalsHit}
                <span className="text-2xl text-[var(--ink-faint)]"> / 4</span>
              </p>
              <p className="mt-1 text-sm text-[var(--ink-faint)]">Goals closed yesterday</p>
              <p className="mt-4 text-sm leading-relaxed text-[var(--ink-soft)]">{summary}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { label: 'Work', value: yWork, goal: GOALS.work, unit: 'h' },
                  { label: 'Sleep', value: ySleep, goal: GOALS.sleep, unit: 'h' },
                  { label: 'Exercise', value: yExercise, goal: GOALS.exercise, unit: 'm' },
                  { label: 'Reading', value: yReading, goal: GOALS.reading, unit: 'm' },
                ].map((m) => {
                  const hit = m.value >= m.goal
                  const pct = Math.min(100, Math.round((m.value / m.goal) * 100))
                  return (
                    <div key={m.label}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
                          {m.label}
                        </span>
                        <span className="font-mono-metric text-xs text-[var(--ink)]">
                          {m.value}{m.unit}
                          <span className="text-[var(--ink-faint)]">/{m.goal}{m.unit}</span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: hit ? 'var(--ok)' : 'var(--accent)',
                            boxShadow: hit
                              ? '0 0 8px var(--ok)'
                              : '0 0 8px var(--accent-glow)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-1 lg:gap-3">
          {[
            { label: 'Applications this week', value: appsThisWeek, hint: 'Logged applies' },
            { label: 'Interviews active', value: interviewsActive, hint: 'In pipeline' },
            { label: 'Messages today', value: msgToday, hint: 'Outreach sent' },
            { label: 'Messages this week', value: msgWeek, hint: 'Weekly pace' },
          ].map((m, i) => (
            <div
              key={m.label}
              className="metric-tile motion-fade-in"
              style={{ animationDelay: `${100 + i * 40}ms` }}
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                {m.label}
              </div>
              <div className="mt-2 font-mono-metric text-4xl text-[var(--ink)]">{m.value}</div>
              <div className="mt-1 text-xs text-[var(--ink-soft)]">{m.hint}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Execution */}
      <TodayPlan initialItems={planItems ?? []} entryDate={todayStr} />

      <TodayNotes initial={focusNotes} today={todayStr} />

      {/* Ops twin panels */}
      <section
        className="motion-fade-in mt-10 grid gap-5 lg:grid-cols-2"
        style={{ animationDelay: '140ms' }}
      >
        <div className="hud-panel relative p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Outreach</h2>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono-metric text-5xl text-[var(--accent)] ">
              {leadTotal}
            </span>
            <span className="text-sm text-[var(--ink-soft)]">companies in play</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {LEAD_STATUSES.map((status) => (
              <span
                key={status}
                className={statusPill[status] ?? 'status-pill status-pill-neutral'}
              >
                {status}: {leadCounts[status] ?? 0}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { v: msgToday, l: 'Today' },
              { v: msgWeek, l: 'Week' },
              { v: msgTotal, l: 'All time' },
            ].map((x) => (
              <div
                key={x.l}
                className="rounded-lg border border-[var(--line)] bg-[rgba(0,0,0,0.25)] px-3 py-3"
              >
                <div className="font-mono-metric text-2xl">{x.v}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {x.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hud-panel relative p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Pipeline</h2>
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-mono-metric text-5xl text-[var(--ink)]">{total}</span>
            <span className="text-sm text-[var(--ink-soft)]">applications tracked</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusEntries.map(([status, count]) => (
              <span
                key={status}
                className={statusPill[status] ?? 'status-pill status-pill-neutral'}
              >
                {status}: {count}
              </span>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Recent activity
            </p>
            <div className="mt-2 space-y-0 overflow-hidden rounded-xl border border-[var(--line)]">
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--ink-faint)]">No applications yet.</p>
              ) : (
                recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(0,0,0,0.2)] px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">{r.company}</p>
                      <p className="truncate text-xs text-[var(--ink-soft)]">{r.role_title}</p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--ink-soft)]">{r.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <TodayPriorities initial={priorityRows ?? []} entryDate={todayStr} />

      <DaySummary date={todayStr} />
    </HudShell>
  )
}
