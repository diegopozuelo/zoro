'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight, Trash2, Sparkles } from 'lucide-react'

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
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [selected, setSelected] = useState(ymd(tomorrow))
  const [brainDump, setBrainDump] = useState('')
  const [items, setItems] = useState<PlanItem[]>([])
  const [status, setStatus] = useState('draft')
  const [generating, setGenerating] = useState(false)

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

    // save the brain-dump
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

  async function approve() {
    // wipe existing items for the day, then insert the current set
    await supabase.from('plan_items').delete().eq('entry_date', selected)
    const toInsert = items.map((it, i) => ({
      entry_date: selected,
      start_time: it.start_time,
      end_time: it.end_time,
      content: it.content,
      category: it.category,
      sort_order: i,
      done: false,
    }))
    await supabase.from('plan_items').insert(toInsert)
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
              <div key={i} className="group flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3">
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
                  className="flex-1 bg-transparent text-sm outline-none"
                />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catColor[it.category] ?? 'bg-neutral-100 text-neutral-600'}`}>
                  {it.category}
                </span>
                <button
                  onClick={() => removeItem(i)}
                  className="hidden text-neutral-400 hover:text-red-600 group-hover:block"
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