'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Trash2, Sparkles, Play, Circle, CheckCircle2 } from 'lucide-react'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type PlanItem = {
  id?: number
  start_time: string
  end_time: string
  content: string
  category: string
  done?: boolean
  sort_order?: number
  conversation_id?: number | null
}

const catColor: Record<string, string> = {
  'ramp-up': 'status-pill status-pill-amber',
  applications: 'status-pill status-pill-blue',
  outreach: 'status-pill status-pill-green',
  'deep-work': 'status-pill status-pill-purple',
  learning: 'status-pill status-pill-indigo',
  admin: 'status-pill status-pill-neutral',
  'wind-down': 'status-pill status-pill-rose',
}

export default function Planner() {
  const router = useRouter()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [selected, setSelected] = useState(ymd(tomorrow))
  const [brainDump, setBrainDump] = useState('')
  const [items, setItems] = useState<PlanItem[]>([])
  const [status, setStatus] = useState('draft')
  const [generating, setGenerating] = useState(false)
  const [starting, setStarting] = useState<number | null>(null)

  useEffect(() => {
    load()
  }, [selected])

  async function load() {
    const { data: meta } = await supabase
      .from('plan_meta')
      .select('*')
      .eq('entry_date', selected)
      .maybeSingle()
    setBrainDump(meta?.brain_dump ?? '')
    setStatus(meta?.status ?? 'draft')

    const { data: planItems } = await supabase
      .from('plan_items')
      .select('*')
      .eq('entry_date', selected)
      .order('sort_order', { ascending: true })
    setItems((planItems as PlanItem[]) ?? [])
  }

  async function generate() {
    if (!brainDump.trim() || generating) return
    setGenerating(true)

    await supabase
      .from('plan_meta')
      .upsert({ entry_date: selected, brain_dump: brainDump, status: 'draft' }, { onConflict: 'entry_date' })

    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brainDump, targetDate: selected }),
    })
    const data = await res.json()
    setGenerating(false)
    if (data.items) {
      setItems(data.items.map((it: PlanItem, i: number) => ({ ...it, sort_order: i, done: false })))
    }
  }

  function updateItem(index: number, field: keyof PlanItem, value: string) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function toggleDone(index: number) {
    const it = items[index]
    const next = !it.done
    setItems((prev) => prev.map((x, i) => (i === index ? { ...x, done: next } : x)))
    if (it.id) await supabase.from('plan_items').update({ done: next }).eq('id', it.id)
  }

  async function startWorking(index: number) {
    const it = items[index]
    if (!it.id) return
    if (it.conversation_id) {
      router.push('/assistant?chat=' + it.conversation_id)
      return
    }
    setStarting(it.id)
    const res = await fetch('/api/start-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: it.id,
        content: it.content,
        start_time: it.start_time,
        end_time: it.end_time,
        category: it.category,
      }),
    })
    const data = await res.json()
    setStarting(null)
    if (data.conversationId) {
      setItems((prev) => prev.map((x, i) => (i === index ? { ...x, conversation_id: data.conversationId } : x)))
      router.push('/assistant?chat=' + data.conversationId)
    }
  }

  async function approve() {
    const { data: existing } = await supabase
      .from('plan_items')
      .select('id')
      .eq('entry_date', selected)
    const existingIds = new Set((existing ?? []).map((r) => r.id as number))
    const keptIds = new Set<number>()

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.id && existingIds.has(it.id)) {
        await supabase
          .from('plan_items')
          .update({
            start_time: it.start_time,
            end_time: it.end_time,
            content: it.content,
            category: it.category,
            sort_order: i,
            done: it.done ?? false,
          })
          .eq('id', it.id)
        keptIds.add(it.id)
      } else {
        const { data: inserted } = await supabase
          .from('plan_items')
          .insert({
            entry_date: selected,
            start_time: it.start_time,
            end_time: it.end_time,
            content: it.content,
            category: it.category,
            sort_order: i,
            done: it.done ?? false,
            conversation_id: it.conversation_id ?? null,
          })
          .select()
          .single()
        if (inserted) keptIds.add(inserted.id)
      }
    }

    for (const id of existingIds) {
      if (!keptIds.has(id)) {
        await supabase.from('plan_items').delete().eq('id', id)
      }
    }

    await supabase
      .from('plan_meta')
      .upsert({ entry_date: selected, brain_dump: brainDump, status: 'approved' }, { onConflict: 'entry_date' })
    setStatus('approved')
    load()
  }

  function shiftDay(n: number) {
    const d = new Date(selected + 'T00:00:00')
    d.setDate(d.getDate() + n)
    setSelected(ymd(d))
  }

  const label = new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const doneCount = items.filter((i) => i.done).length

  return (
    <div className="motion-fade-in mt-8 space-y-5 pb-10" style={{ animationDelay: '80ms' }}>
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => shiftDay(-1)}
            className="btn-ghost !p-2"
            title="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-mono-metric text-base text-[var(--ink)] sm:text-lg">{label}</span>
          <button
            onClick={() => shiftDay(1)}
            className="btn-ghost !p-2"
            title="Next day"
          >
            <ChevronRight size={18} />
          </button>
          {status === 'approved' && (
            <span className="status-pill status-pill-green">Approved</span>
          )}
          {status === 'draft' && items.length > 0 && (
            <span className="status-pill status-pill-amber">Draft</span>
          )}
        </div>

        <div className="mt-5">
          <div className="section-rail">
            <h2 className="eyebrow eyebrow-accent !mb-0">Brain dump</h2>
          </div>
          <p className="text-sm text-[var(--ink-soft)]">
            What do you want to get done? Dump it raw and generate a plan.
          </p>
          <textarea
            rows={4}
            value={brainDump}
            onChange={(e) => setBrainDump(e.target.value)}
            placeholder="e.g. 10 applications, 10 outreach messages, advance Zoro, check OPT status, read science news, work on courses..."
            className="input-dark mt-3 w-full px-4 py-3 text-sm"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="btn-primary mt-3"
          >
            <Sparkles size={16} />
            {generating ? 'Building your day...' : 'Generate plan'}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="hud-panel relative p-5 sm:p-6">
          <span className="hud-corners-tr" aria-hidden />
          <span className="hud-corners-bl" aria-hidden />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="section-rail !mb-1">
                <h2 className="eyebrow eyebrow-accent !mb-0">Your plan</h2>
              </div>
              <p className="text-sm text-[var(--ink-soft)]">
                <span className="font-mono-metric text-[var(--accent)]">
                  {doneCount}/{items.length}
                </span>
                {' '}blocks
              </p>
            </div>
            <button
              onClick={approve}
              className="rounded-lg bg-[var(--ok)] px-4 py-2 text-sm font-semibold text-[#041018] shadow-[0_0_16px_color-mix(in_srgb,var(--ok)_35%,transparent)] transition hover:brightness-110"
            >
              Approve plan
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {items.map((it, i) => (
              <div
                key={it.id ?? i}
                className={`group interactive-row flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                  it.done
                    ? 'border-[var(--line)] bg-[var(--paper-elevated)]/50 opacity-70'
                    : 'border-[var(--line)] bg-[var(--card)]'
                }`}
              >
                {it.id && (
                  <button
                    onClick={() => toggleDone(i)}
                    className="shrink-0 text-[var(--ink-faint)] hover:text-[var(--ok)]"
                    title={it.done ? 'Mark not done' : 'Mark done'}
                  >
                    {it.done ? (
                      <CheckCircle2 size={18} className="text-[var(--ok)]" />
                    ) : (
                      <Circle size={18} />
                    )}
                  </button>
                )}
                <div className="flex w-32 shrink-0 items-center gap-1 font-mono-metric text-xs text-[var(--ink-faint)]">
                  <input
                    value={it.start_time}
                    onChange={(e) => updateItem(i, 'start_time', e.target.value)}
                    className="w-14 bg-transparent outline-none"
                  />
                  <span>to</span>
                  <input
                    value={it.end_time}
                    onChange={(e) => updateItem(i, 'end_time', e.target.value)}
                    className="w-14 bg-transparent outline-none"
                  />
                </div>
                <input
                  value={it.content}
                  onChange={(e) => updateItem(i, 'content', e.target.value)}
                  className={`min-w-[10rem] flex-1 bg-transparent text-sm outline-none ${
                    it.done ? 'text-[var(--ink-faint)] line-through' : 'text-[var(--ink)]'
                  }`}
                />
                <span className={`shrink-0 !px-2 !py-0.5 !text-xs ${catColor[it.category] ?? 'status-pill status-pill-neutral'}`}>
                  {it.category}
                </span>
                {it.id && (
                  <button
                    onClick={() => startWorking(i)}
                    disabled={starting === it.id}
                    className="btn-primary !px-3 !py-1.5 !text-xs"
                  >
                    <Play size={12} />
                    {starting === it.id ? 'Starting...' : it.conversation_id ? 'Resume' : 'Start working'}
                  </button>
                )}
                <button
                  onClick={() => removeItem(i)}
                  className="hidden shrink-0 text-[var(--ink-faint)] hover:text-[var(--danger)] group-hover:block"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
