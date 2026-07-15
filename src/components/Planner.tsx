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
  'ramp-up': 'bg-amber-100 text-amber-800',
  applications: 'bg-blue-100 text-blue-800',
  outreach: 'bg-green-100 text-green-800',
  'deep-work': 'bg-purple-100 text-purple-800',
  learning: 'bg-indigo-100 text-indigo-800',
  admin: 'bg-neutral-100 text-neutral-700',
  'wind-down': 'bg-rose-100 text-rose-800',
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
    // Merge: update existing rows in place, insert new ones, delete removed ones.
    // This keeps conversation_id and done on tasks that still exist.
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

  return (
    <div className="max-w-3xl">
      {/* Date nav */}
      <div className="flex items-center gap-3">
        <button onClick={() => shiftDay(-1)} className="rounded p-1 hover:bg-neutral-100">
          <ChevronLeft size={18} />
        </button>
        <span className="font-medium">{label}</span>
        <button onClick={() => shiftDay(1)} className="rounded p-1 hover:bg-neutral-100">
          <ChevronRight size={18} />
        </button>
        {status === 'approved' && (
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Approved
          </span>
        )}
      </div>

      {/* Brain dump */}
      <div className="mt-6">
        <label className="text-sm font-medium text-neutral-500">
          What do you want to get done? Brain-dump it.
        </label>
        <textarea
          rows={4}
          value={brainDump}
          onChange={(e) => setBrainDump(e.target.value)}
          placeholder="e.g. 10 applications, 10 outreach messages, advance Zoro, check OPT status, read science news, work on courses..."
          className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
        />
        <button
          onClick={generate}
          disabled={generating}
          className="mt-2 flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          <Sparkles size={16} />
          {generating ? 'Building your day...' : 'Generate plan'}
        </button>
      </div>

      {/* Generated plan */}
      {items.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">Your plan</h2>
            <button
              onClick={approve}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            >
              Approve plan
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {items.map((it, i) => (
              <div
                key={it.id ?? i}
                className={`group flex items-center gap-3 rounded-lg border px-4 py-3 ${
                  it.done ? 'border-neutral-100 bg-neutral-50' : 'border-neutral-200'
                }`}
              >
                {it.id && (
                  <button
                    onClick={() => toggleDone(i)}
                    className="shrink-0 text-neutral-400 hover:text-green-600"
                    title={it.done ? 'Mark not done' : 'Mark done'}
                  >
                    {it.done ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} />}
                  </button>
                )}
                <div className="flex w-32 shrink-0 items-center gap-1 text-xs text-neutral-500">
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
                  className={`flex-1 bg-transparent text-sm outline-none ${
                    it.done ? 'text-neutral-400 line-through' : ''
                  }`}
                />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catColor[it.category] ?? 'bg-neutral-100 text-neutral-600'}`}>
                  {it.category}
                </span>
                {it.id && (
                  <button
                    onClick={() => startWorking(i)}
                    disabled={starting === it.id}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    <Play size={12} />
                    {starting === it.id ? 'Starting...' : it.conversation_id ? 'Resume' : 'Start working'}
                  </button>
                )}
                <button
                  onClick={() => removeItem(i)}
                  className="hidden shrink-0 text-neutral-400 hover:text-red-600 group-hover:block"
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