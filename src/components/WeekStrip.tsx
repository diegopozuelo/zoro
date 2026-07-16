'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const RINGS = [
  { key: 'work', color: '#60A5FA', r: 30 },
  { key: 'sleep', color: '#A78BFA', r: 23 },
  { key: 'exercise', color: '#34D399', r: 16 },
  { key: 'reading', color: '#FBBF24', r: 9 },
]

type DayData = {
  date: string
  work: number
  sleep: number
  exercise: number
  reading: number
}

function MiniRings({ day, active }: { day: DayData; active: boolean }) {
  const goals: Record<string, number> = GOALS
  const vals: Record<string, number> = {
    work: day.work,
    sleep: day.sleep,
    exercise: day.exercise,
    reading: day.reading,
  }
  const closed = RINGS.filter((r) => vals[r.key] >= goals[r.key]).length

  return (
    <div className="relative">
      <svg width="74" height="74" viewBox="0 0 74 74" className="-rotate-90">
        {RINGS.map((ring) => {
          const circ = 2 * Math.PI * ring.r
          const pct = Math.min(vals[ring.key] / goals[ring.key], 1)
          return (
            <g key={ring.key}>
              <circle
                cx="37"
                cy="37"
                r={ring.r}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="5"
              />
              <circle
                cx="37"
                cy="37"
                r={ring.r}
                fill="none"
                stroke={ring.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - pct * circ}
                className="ring-progress"
                style={{ filter: active || closed === 4 ? `drop-shadow(0 0 3px ${ring.color})` : undefined }}
              />
            </g>
          )
        })}
      </svg>
      {closed === 4 && (
        <span className="absolute inset-0 flex items-center justify-center rotate-90">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ok)] shadow-[0_0_8px_var(--ok)]" />
        </span>
      )}
    </div>
  )
}

export default function WeekStrip({
  selected,
  onSelectDay,
  refreshKey,
}: {
  selected: string
  onSelectDay: (date: string) => void
  refreshKey: number
}) {
  const [offset, setOffset] = useState(0)
  const [days, setDays] = useState<DayData[]>([])

  useEffect(() => {
    loadWeek()
  }, [offset, refreshKey])

  async function loadWeek() {
    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() + offset - i)
      dates.push(ymd(d))
    }

    const { data: dayRows } = await supabase
      .from('life_days')
      .select('*')
      .in('entry_date', dates)
    const { data: woRows } = await supabase
      .from('workouts')
      .select('entry_date, minutes')
      .in('entry_date', dates)

    const result: DayData[] = dates.map((date) => {
      const day = dayRows?.find((r) => r.entry_date === date)
      const exercise = (woRows ?? [])
        .filter((w) => w.entry_date === date)
        .reduce((sum, w) => sum + Number(w.minutes), 0)
      return {
        date,
        work: day?.work_hours ?? 0,
        sleep: day?.sleep_hours ?? 0,
        exercise,
        reading: day?.reading_minutes ?? 0,
      }
    })
    setDays(result)
  }

  const rangeLabel = (() => {
    if (days.length === 0) return ''
    const start = new Date(days[0].date + 'T00:00:00')
    const end = new Date(days[6].date + 'T00:00:00')
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${fmt(start)} to ${fmt(end)}`
  })()

  const weekClosed = days.reduce((sum, day) => {
    const hits = [
      day.work >= GOALS.work,
      day.sleep >= GOALS.sleep,
      day.exercise >= GOALS.exercise,
      day.reading >= GOALS.reading,
    ].filter(Boolean).length
    return sum + hits
  }, 0)

  return (
    <section className="hud-panel relative motion-fade-in p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
      <span className="hud-corners-tr" aria-hidden />
      <span className="hud-corners-bl" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="section-rail !mb-1">
            <h2 className="eyebrow eyebrow-accent !mb-0">Weekly progress</h2>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            <span className="font-mono-metric text-[var(--ok)]">{weekClosed}</span>
            <span className="text-[var(--ink-faint)]"> / 28 rings closed this week</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono-metric text-xs text-[var(--ink-faint)]">{rangeLabel}</span>
          <button onClick={() => setOffset(offset - 7)} className="btn-ghost !p-1.5" title="Previous week">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setOffset(Math.min(offset + 7, 0))}
            disabled={offset === 0}
            className="btn-ghost !p-1.5 disabled:opacity-30"
            title="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const d = new Date(day.date + 'T00:00:00')
          const dow = d.toLocaleDateString('en-US', { weekday: 'short' })
          const dnum = d.getDate()
          const active = day.date === selected
          const isToday = day.date === ymd(new Date())
          return (
            <button
              key={day.date}
              onClick={() => onSelectDay(day.date)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition duration-[var(--dur-med)] ${
                active
                  ? 'border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] bg-[var(--accent-dim)] shadow-[0_0_24px_var(--accent-glow)]'
                  : 'border-transparent hover:border-[var(--line)] hover:bg-[color-mix(in_srgb,var(--card)_80%,transparent)]'
              }`}
            >
              <span className={`text-[10px] uppercase tracking-wider ${isToday ? 'text-[var(--accent)]' : 'text-[var(--ink-faint)]'}`}>
                {dow}
              </span>
              <MiniRings day={day} active={active} />
              <span className={`font-mono-metric text-xs ${active ? 'text-[var(--accent)]' : 'text-[var(--ink-soft)]'}`}>
                {dnum}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
