'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trash2 } from 'lucide-react'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type Workout = { id: number; entry_date: string; label: string; minutes: number }

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const RING_COLORS: Record<string, { base: string; over: string }> = {
  work: { base: '#3b82f6', over: '#1e3a8a' },
  sleep: { base: '#8b5cf6', over: '#4c1d95' },
  exercise: { base: '#22c55e', over: '#14532d' },
  reading: { base: '#f59e0b', over: '#92400e' },
}

function Ring({ kind, value, goal, unit }: { kind: string; value: number; goal: number; unit: string }) {
  const r = 52
  const circ = 2 * Math.PI * r
  const pct = goal > 0 ? value / goal : 0
  const base = Math.min(pct, 1)
  const over = pct > 1 ? Math.min(pct - 1, 1) : 0
  const colors = RING_COLORS[kind]

  return (
    <div className="flex flex-col items-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle cx="65" cy="65" r={r} fill="none" stroke="#f1f1f1" strokeWidth="12" />
        <circle
          cx="65" cy="65" r={r} fill="none" stroke={colors.base} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - base * circ}
        />
        {over > 0 && (
          <circle
            cx="65" cy="65" r={r} fill="none" stroke={colors.over} strokeWidth="12"
            strokeLinecap="round" strokeDasharray={circ}
            strokeDashoffset={circ - over * circ}
          />
        )}
      </svg>
      <div className="-mt-[82px] flex flex-col items-center">
        <span className="text-lg font-semibold">{value}</span>
        <span className="text-xs text-neutral-400">/ {goal} {unit}</span>
      </div>
      <span className="mt-6 text-sm font-medium capitalize">{kind}</span>
    </div>
  )
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

  useEffect(() => {
    loadDay()
  }, [selected])

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
    onSaved()
  }

  async function addWorkout() {
    if (!woLabel.trim() || !woMin) return
    const { data } = await supabase
      .from('workouts')
      .insert({ entry_date: selected, label: woLabel, minutes: Number(woMin) })
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

  return (
    <div>
      {/* Rings */}
      <div className="grid grid-cols-4 gap-4 rounded-2xl border border-neutral-200 p-8">
        <Ring kind="work" value={work} goal={GOALS.work} unit="h" />
        <Ring kind="sleep" value={sleep} goal={GOALS.sleep} unit="h" />
        <Ring kind="exercise" value={exerciseTotal} goal={GOALS.exercise} unit="min" />
        <Ring kind="reading" value={reading} goal={GOALS.reading} unit="min" />
      </div>

      {/* Inputs */}
      <div className="mt-6 grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-neutral-500">Log your day</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Sleep (h)</label>
              <input type="number" value={sleep} onChange={(e) => setSleep(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Work (h)</label>
              <input type="number" value={work} onChange={(e) => setWork(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Reading (min)</label>
              <input type="number" value={reading} onChange={(e) => setReading(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <button onClick={saveDay} disabled={saving}
            className="rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save day'}
          </button>
        </div>

        {/* Workouts */}
        <div>
          <h3 className="text-sm font-medium text-neutral-500">Workouts</h3>
          <div className="mt-3 flex gap-2">
            <input placeholder="e.g. Gym, Run" value={woLabel} onChange={(e) => setWoLabel(e.target.value)}
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            <input type="number" placeholder="min" value={woMin} onChange={(e) => setWoMin(e.target.value)}
              className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
            <button onClick={addWorkout}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
              Add
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {workouts.map((w) => (
              <div key={w.id} className="group flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <span>{w.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500">{w.minutes} min</span>
                  <button onClick={() => removeWorkout(w.id)} className="hidden text-neutral-400 hover:text-red-600 group-hover:block">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}