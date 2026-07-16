'use client'
import { useState, useEffect } from 'react'
import LifeTracker from '@/components/LifeTracker'
import WeekStrip from '@/components/WeekStrip'
import AmbientField from '@/components/AmbientField'
import LifeHeroVisuals from '@/components/LifeHeroVisuals'
import { supabase } from '@/lib/supabase'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

export default function LifePage() {
  const [selected, setSelected] = useState(ymd(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)
  const [streak, setStreak] = useState(0)
  const [weekHits, setWeekHits] = useState(0)
  const [todayVitality, setTodayVitality] = useState(0)

  useEffect(() => {
    loadHeroStats()
  }, [refreshKey])

  async function loadHeroStats() {
    const { data: lifeAll } = await supabase.from('life_days').select('entry_date')
    const loggedDays = new Set((lifeAll ?? []).map((r) => r.entry_date))
    let s = 0
    const cur = new Date()
    if (!loggedDays.has(ymd(cur))) cur.setDate(cur.getDate() - 1)
    while (loggedDays.has(ymd(cur))) {
      s++
      cur.setDate(cur.getDate() - 1)
    }
    setStreak(s)

    const dates: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(ymd(d))
    }

    const [{ data: dayRows }, { data: woRows }] = await Promise.all([
      supabase.from('life_days').select('*').in('entry_date', dates),
      supabase.from('workouts').select('entry_date, minutes').in('entry_date', dates),
    ])

    let hits = 0
    for (const date of dates) {
      const day = dayRows?.find((r) => r.entry_date === date)
      const exercise = (woRows ?? [])
        .filter((w) => w.entry_date === date)
        .reduce((sum, w) => sum + Number(w.minutes), 0)
      const ratios = [
        (day?.work_hours ?? 0) / GOALS.work,
        (day?.sleep_hours ?? 0) / GOALS.sleep,
        exercise / GOALS.exercise,
        (day?.reading_minutes ?? 0) / GOALS.reading,
      ]
      hits += ratios.filter((r) => r >= 1).length
    }
    setWeekHits(hits)

    const today = ymd(new Date())
    const tDay = dayRows?.find((r) => r.entry_date === today)
    const tEx = (woRows ?? [])
      .filter((w) => w.entry_date === today)
      .reduce((sum, w) => sum + Number(w.minutes), 0)
    const ratios = [
      (tDay?.work_hours ?? 0) / GOALS.work,
      (tDay?.sleep_hours ?? 0) / GOALS.sleep,
      tEx / GOALS.exercise,
      (tDay?.reading_minutes ?? 0) / GOALS.reading,
    ]
    setTodayVitality(Math.round((ratios.reduce((a, b) => a + Math.min(b, 1.25), 0) / 4) * 100))
  }

  const selectedLabel = new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="hud-stage hud-stage-bleed">
      <AmbientField />
      <div className="hud-grid" aria-hidden />
      <div className="hud-scan" aria-hidden />

      <div className="hud-content mx-auto max-w-6xl pb-12">
        <header className="hero-command motion-fade-in-slow relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_55%,transparent)] p-5 sm:p-7 backdrop-blur-sm">
          <LifeHeroVisuals />
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />

          <div className="relative z-[1] status-rail text-xs text-[var(--ink-soft)]">
            <span className="inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--ok)_40%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_12%,transparent)] px-3 py-1 font-mono-metric tracking-wide text-[var(--ok)]">
              <span className="live-dot" />
              VITALS
            </span>
            <span className="font-mono-metric tracking-wider text-[var(--ink-faint)]">
              ZORO // LIFE
            </span>
          </div>

          <div className="relative z-[1] mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow eyebrow-accent">Self care systems</p>
              <h1 className="hero-title mt-2 font-display text-5xl tracking-tight text-[var(--ink)] sm:text-6xl lg:text-7xl">
                Life
              </h1>
              <div className="hero-title-rule mt-3 !bg-[linear-gradient(90deg,var(--ok),transparent)]" aria-hidden />
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--ink-soft)]">
                Protect the body that runs the job search. Close the rings, keep the streak, treat recovery like a deliverable.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)]/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Streak</div>
                <div className="mt-0.5 font-mono-metric text-2xl text-[var(--ok)] drop-shadow-[0_0_12px_color-mix(in_srgb,var(--ok)_40%,transparent)]">
                  {streak}
                </div>
              </div>
              <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)]/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Vitality</div>
                <div className="mt-0.5 font-mono-metric text-2xl text-[var(--accent)] drop-shadow-[0_0_12px_var(--accent-glow)]">
                  {todayVitality}%
                </div>
              </div>
              <div className="hero-stat interactive-row rounded-xl border border-[var(--line)] bg-[var(--card)]/80 px-4 py-3 backdrop-blur-sm">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Week rings</div>
                <div className="mt-0.5 font-mono-metric text-2xl text-[var(--ink)]">
                  {weekHits}
                  <span className="text-base text-[var(--ink-faint)]">/28</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <p className="motion-fade-in mt-6 font-mono-metric text-sm text-[var(--ink-soft)]" style={{ animationDelay: '40ms' }}>
          Editing <span className="text-[var(--accent)]">{selectedLabel}</span>
        </p>

        <div className="mt-3 space-y-5">
          <WeekStrip
            selected={selected}
            onSelectDay={setSelected}
            refreshKey={refreshKey}
          />
          <LifeTracker
            selected={selected}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  )
}
