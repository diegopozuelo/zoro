'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2, Plus, Check } from 'lucide-react'

type Workout = { id: number; entry_date: string; label: string; minutes: number }

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const RING_META: Record<
  string,
  { base: string; over: string; glow: string; unit: string; label: string }
> = {
  work: { base: '#60A5FA', over: '#93C5FD', glow: '#3B82F6', unit: 'h', label: 'Work' },
  sleep: { base: '#A78BFA', over: '#C4B5FD', glow: '#8B5CF6', unit: 'h', label: 'Sleep' },
  exercise: { base: '#34D399', over: '#6EE7B7', glow: '#10B981', unit: 'min', label: 'Exercise' },
  reading: { base: '#FBBF24', over: '#FCD34D', glow: '#F59E0B', unit: 'min', label: 'Reading' },
}

const PRESETS = [
  { label: 'Gym', minutes: 45 },
  { label: 'Run', minutes: 30 },
  { label: 'Walk', minutes: 20 },
  { label: 'Stretch', minutes: 15 },
]

function Ring({
  kind,
  value,
  goal,
  ready,
}: {
  kind: string
  value: number
  goal: number
  ready: boolean
}) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? value / goal : 0
  const base = Math.min(pct, 1)
  const over = pct > 1 ? Math.min(pct - 1, 1) : 0
  const colors = RING_META[kind]
  const baseOffset = ready ? circ - base * circ : circ
  const overOffset = ready ? circ - over * circ : circ
  const hit = value >= goal

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-[130px] w-[130px] items-center justify-center">
        {hit && (
          <div className="ring-orbit life-ring-orbit" aria-hidden>
            <span className="ring-orbit-dot" />
          </div>
        )}
        <svg width="130" height="130" className="relative -rotate-90" aria-hidden>
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="12"
          />
          <circle
            cx="65"
            cy="65"
            r={r}
            fill="none"
            stroke={colors.base}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={baseOffset}
            className="ring-progress"
          />
          {over > 0 && (
            <circle
              cx="65"
              cy="65"
              r={r}
              fill="none"
              stroke={colors.over}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={overOffset}
              className="ring-progress"
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono-metric text-xl text-[var(--ink)]">{value}</span>
          <span className="text-[10px] text-[var(--ink-faint)]">
            / {goal} {colors.unit}
          </span>
        </div>
      </div>
      <span className="mt-2 text-sm font-medium text-[var(--ink-soft)]">{colors.label}</span>
      <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, Math.round(pct * 100))}%`,
            background: hit ? 'var(--ok)' : colors.base,
            boxShadow: hit ? '0 0 8px var(--ok)' : `0 0 8px ${colors.glow}88`,
          }}
        />
      </div>
    </div>
  )
}

function coachNote(sleep: number, work: number, exercise: number, reading: number) {
  const hits = [
    work >= GOALS.work,
    sleep >= GOALS.sleep,
    exercise >= GOALS.exercise,
    reading >= GOALS.reading,
  ].filter(Boolean).length

  if (hits === 4) return 'All four rings closed. Elite recovery day. Keep the streak sacred.'
  if (sleep < GOALS.sleep && sleep > 0)
    return 'Sleep is under target. Protect tonight like a deadline. Everything else gets easier.'
  if (exercise < GOALS.exercise && work >= GOALS.work)
    return 'Work is strong. Move your body next so the brain stays sharp.'
  if (hits >= 2) return `You are ${hits} of 4 rings in. Finish the open ones before the day ends.`
  if (hits === 0 && work === 0 && sleep === 0 && exercise === 0 && reading === 0)
    return 'Fresh slate. Log sleep first, then stack movement and deep work.'
  return 'Small logs still count. Close one ring, then chase the next.'
}

export default function LifeTracker({
  selected,
  onSaved,
}: {
  selected: string
  onSaved: () => void
}) {
  const [sleep, setSleep] = useState(0)
  const [reading, setReading] = useState(0)
  const [work, setWork] = useState(0)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [woLabel, setWoLabel] = useState('')
  const [woMin, setWoMin] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadDay()
  }, [selected])

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setReady(false)
    if (reduce) {
      setReady(true)
      return
    }
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [selected, sleep, reading, work, workouts])

  async function loadDay() {
    const { data: day } = await supabase
      .from('life_days')
      .select('*')
      .eq('entry_date', selected)
      .maybeSingle()
    setSleep(day?.sleep_hours ?? 0)
    setReading(day?.reading_minutes ?? 0)
    setWork(day?.work_hours ?? 0)

    const { data: wos } = await supabase
      .from('workouts')
      .select('*')
      .eq('entry_date', selected)
      .order('created_at', { ascending: true })
    setWorkouts((wos as Workout[]) ?? [])
  }

  async function saveDay() {
    setSaving(true)
    await supabase.from('life_days').upsert(
      { entry_date: selected, sleep_hours: sleep, reading_minutes: reading, work_hours: work },
      { onConflict: 'entry_date' }
    )
    setSaving(false)
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1600)
    onSaved()
  }

  async function addWorkout(label?: string, minutes?: number) {
    const finalLabel = (label ?? woLabel).trim()
    const finalMin = minutes ?? Number(woMin)
    if (!finalLabel || !finalMin) return
    const { data } = await supabase
      .from('workouts')
      .insert({ entry_date: selected, label: finalLabel, minutes: finalMin })
      .select()
      .single()
    if (data) setWorkouts((prev) => [...prev, data as Workout])
    setWoLabel('')
    setWoMin('')
    onSaved()
  }

  async function removeWorkout(id: number) {
    await supabase.from('workouts').delete().eq('id', id)
    setWorkouts((prev) => prev.filter((w) => w.id !== id))
    onSaved()
  }

  const exerciseTotal = workouts.reduce((sum, w) => sum + Number(w.minutes), 0)
  const ratios = [
    work / GOALS.work,
    sleep / GOALS.sleep,
    exerciseTotal / GOALS.exercise,
    reading / GOALS.reading,
  ]
  const goalsHit = ratios.filter((r) => r >= 1).length
  const vitality = Math.round((ratios.reduce((a, b) => a + Math.min(b, 1.25), 0) / 4) * 100)
  const note = coachNote(sleep, work, exerciseTotal, reading)

  return (
    <div className="motion-fade-in space-y-5" style={{ animationDelay: '100ms' }}>
      <section className="hud-panel relative p-5 sm:p-8">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">Activity rings</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-mono-metric text-[var(--ok)]">{goalsHit}</span>
              <span className="text-[var(--ink-faint)]"> / 4 closed</span>
              <span className="mx-2 text-[var(--ink-faint)]">·</span>
              <span className="font-mono-metric text-[var(--accent)]">{vitality}%</span>
              <span className="text-[var(--ink-faint)]"> vitality</span>
            </p>
          </div>
          <div className="life-pulse-meter" aria-hidden>
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
          <Ring kind="work" value={work} goal={GOALS.work} ready={ready} />
          <Ring kind="sleep" value={sleep} goal={GOALS.sleep} ready={ready} />
          <Ring kind="exercise" value={exerciseTotal} goal={GOALS.exercise} ready={ready} />
          <Ring kind="reading" value={reading} goal={GOALS.reading} ready={ready} />
        </div>

        <div className="mt-8 rounded-xl border border-[color-mix(in_srgb,var(--ok)_25%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_8%,transparent)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--ok)]">Coach signal</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">{note}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="hud-panel relative p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Log your day</h2>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">Sleep (h)</label>
              <input
                type="number"
                value={sleep}
                onChange={(e) => setSleep(Number(e.target.value))}
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">Work (h)</label>
              <input
                type="number"
                value={work}
                onChange={(e) => setWork(Number(e.target.value))}
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">Reading (min)</label>
              <input
                type="number"
                value={reading}
                onChange={(e) => setReading(Number(e.target.value))}
                className="input-dark mt-1 w-full px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button onClick={saveDay} disabled={saving} className="btn-primary mt-4">
            <Check size={16} />
            {saving ? 'Saving...' : savedFlash ? 'Saved' : 'Save day'}
          </button>
        </section>

        <section className="hud-panel relative p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Workouts</h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => addWorkout(p.label, p.minutes)}
                className="rounded-lg border border-[var(--line)] bg-[var(--card)] px-2.5 py-1 text-xs text-[var(--ink-soft)] transition hover:border-[color-mix(in_srgb,var(--ok)_40%,var(--line))] hover:text-[var(--ok)]"
              >
                {p.label} · {p.minutes}m
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              placeholder="e.g. Gym, Run"
              value={woLabel}
              onChange={(e) => setWoLabel(e.target.value)}
              className="input-dark flex-1 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="min"
              value={woMin}
              onChange={(e) => setWoMin(e.target.value)}
              className="input-dark w-20 px-3 py-2 text-sm"
            />
            <button onClick={() => addWorkout()} className="btn-primary !px-3">
              <Plus size={16} />
              Add
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {workouts.length === 0 && (
              <p className="text-sm text-[var(--ink-faint)]">No workouts logged for this day.</p>
            )}
            {workouts.map((w) => (
              <div
                key={w.id}
                className="group interactive-row flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--ink)]">{w.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono-metric text-[var(--ink-soft)]">{w.minutes} min</span>
                  <button
                    onClick={() => removeWorkout(w.id)}
                    className="text-[var(--ink-faint)] opacity-0 transition hover:text-[var(--danger)] group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
