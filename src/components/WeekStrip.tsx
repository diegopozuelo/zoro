'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

// four nested rings, outer to inner: work, sleep, exercise, reading
const RINGS = [
  { key: 'work', color: '#3b82f6', r: 30 },
  { key: 'sleep', color: '#8b5cf6', r: 23 },
  { key: 'exercise', color: '#22c55e', r: 16 },
  { key: 'reading', color: '#f59e0b', r: 9 },
]

type DayData = {
  date: string
  work: number
  sleep: number
  exercise: number
  reading: number
}

function MiniRings({ day }: { day: DayData }) {
  const goals: Record<string, number> = GOALS
  const vals: Record<string, number> = {
    work: day.work,
    sleep: day.sleep,
    exercise: day.exercise,
    reading: day.reading,
  }
  return (
    <svg width="74" height="74" viewBox="0 0 74 74" className="-rotate-90">
      {RINGS.map((ring) => {
        const circ = 2 * Math.PI * ring.r
        const pct = Math.min(vals[ring.key] / goals[ring.key], 1)
        return (
          <g key={ring.key}>
            <circle cx="37" cy="37" r={ring.r} fill="none" stroke="#f1f1f1" strokeWidth="5" />
            <circle
              cx="37" cy="37" r={ring.r} fill="none" stroke={ring.color} strokeWidth="5"
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ - pct * circ}
            />
          </g>
        )
      })}
    </svg>
  )
}

export default function WeekStrip({
  onSelectDay,
  refreshKey,
}: {
  onSelectDay: (date: string) => void
  refreshKey: number
}) {
  const [offset, setOffset] = useState(0) // 0 = ending today, -7 = previous week
  const [days, setDays] = useState<DayData[]>([])

  useEffect(() => {
    loadWeek()
  }, [offset, refreshKey])

  async function loadWeek() {
    // build the 7 dates
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

  return (
    <div className="rounded-2xl border border-neutral-200 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-500">Weekly progress</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400">{rangeLabel}</span>
          <button onClick={() => setOffset(offset - 7)} className="rounded p-1 hover:bg-neutral-100">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setOffset(Math.min(offset + 7, 0))}
            disabled={offset === 0}
            className="rounded p-1 hover:bg-neutral-100 disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const d = new Date(day.date + 'T00:00:00')
          const dow = d.toLocaleDateString('en-US', { weekday: 'short' })
          const dnum = d.getDate()
          return (
            <button
              key={day.date}
              onClick={() => onSelectDay(day.date)}
              className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-neutral-50"
            >
              <span className="text-xs text-neutral-400">{dow}</span>
              <MiniRings day={day} />
              <span className="text-xs text-neutral-500">{dnum}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}