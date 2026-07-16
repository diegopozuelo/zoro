'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Circle, CheckCircle2 } from 'lucide-react'

type PriorityRow = { id: number; slot: number; content: string; done: boolean }
type Slot = { id: number | null; content: string; done: boolean }

export default function TodayPriorities({
  initial,
  entryDate,
}: {
  initial: PriorityRow[]
  entryDate: string
}) {
  const init: Slot[] = [0, 1, 2].map((s) => {
    const row = initial.find((p) => p.slot === s)
    return row
      ? { id: row.id, content: row.content, done: row.done }
      : { id: null, content: '', done: false }
  })
  const [slots, setSlots] = useState<Slot[]>(init)

  function setContent(i: number, content: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, content } : s)))
  }

  async function saveContent(i: number) {
    const s = slots[i]
    if (s.id) {
      await supabase.from('priorities').update({ content: s.content }).eq('id', s.id)
    } else if (s.content.trim()) {
      const { data } = await supabase
        .from('priorities')
        .insert({ entry_date: entryDate, slot: i, content: s.content, done: false })
        .select()
        .single()
      if (data) setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, id: data.id } : p)))
    }
  }

  async function toggleDone(i: number) {
    const s = slots[i]
    const done = !s.done
    setSlots((prev) => prev.map((x, idx) => (idx === i ? { ...x, done } : x)))
    if (s.id) {
      await supabase.from('priorities').update({ done }).eq('id', s.id)
    } else {
      const { data } = await supabase
        .from('priorities')
        .insert({ entry_date: entryDate, slot: i, content: s.content, done })
        .select()
        .single()
      if (data) setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, id: data.id } : p)))
    }
  }

  return (
    <section className="motion-fade-in mt-10" style={{ animationDelay: '160ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />
        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Priorities</h2>
        </div>
        <p className="mb-4 text-sm text-[var(--ink-soft)]">
          Three moves that matter most before the day ends.
        </p>
      <div className="space-y-2">
        {slots.map((s, i) => (
          <div
            key={i}
            className="interactive-row flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--card)] px-4 py-3"
          >
            <button
              onClick={() => toggleDone(i)}
              className="shrink-0 text-[var(--ink-faint)] hover:text-[var(--ok)]"
              title={s.done ? 'Mark not done' : 'Mark done'}
            >
              {s.done ? (
                <CheckCircle2 size={18} className="text-[var(--ok)]" />
              ) : (
                <Circle size={18} />
              )}
            </button>
            <input
              value={s.content}
              onChange={(e) => setContent(i, e.target.value)}
              onBlur={() => saveContent(i)}
              placeholder={`Priority ${i + 1}`}
              className={`flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-faint)] ${
                s.done ? 'text-[var(--ink-faint)] line-through' : 'text-[var(--ink)]'
              }`}
            />
          </div>
        ))}
      </div>
      </div>
    </section>
  )
}
