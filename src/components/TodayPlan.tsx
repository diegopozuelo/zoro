'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Play, Circle, CheckCircle2, Trash2, Plus, Check, X, Wand2 } from 'lucide-react'

type PlanItem = {
  id: number
  start_time: string
  end_time: string
  content: string
  category: string
  done: boolean
  sort_order: number
  conversation_id: number | null
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
const CATEGORIES = Object.keys(catColor)

function timeToMinutes(t: string): number {
  if (!t || !t.trim()) return Infinity
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return Infinity
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const mer = m[3]?.toUpperCase()
  if (mer === 'PM' && h !== 12) h += 12
  if (mer === 'AM' && h === 12) h = 0
  return h * 60 + min
}

export default function TodayPlan({
  initialItems,
  entryDate,
}: {
  initialItems: PlanItem[]
  entryDate: string
}) {
  const router = useRouter()
  const [items, setItems] = useState<PlanItem[]>(initialItems)
  const [starting, setStarting] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Partial<PlanItem>>({})
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState({
    start_time: '',
    end_time: '',
    content: '',
    category: 'deep-work',
  })

  const [replanOpen, setReplanOpen] = useState(false)
  const [replanText, setReplanText] = useState('')
  const [replanning, setReplanning] = useState(false)

  async function runReplan() {
    if (!replanText.trim() || replanning) return
    setReplanning(true)
    const now = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const res = await fetch('/api/replan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, instruction: replanText, currentTime: now }),
    })
    const data = await res.json()
    if (data.items && Array.isArray(data.items)) {
      type Incoming = {
        start_time: string
        end_time: string
        content: string
        category: string
        done?: boolean
      }
      const incoming = data.items as Incoming[]
      const unused = [...items]
      const next: PlanItem[] = []

      for (let i = 0; i < incoming.length; i++) {
        const it = incoming[i]
        const matchIdx = unused.findIndex(
          (e) => e.content.trim() === (it.content ?? '').trim()
        )
        if (matchIdx >= 0) {
          const match = unused.splice(matchIdx, 1)[0]
          const done = it.done ?? match.done
          const patch = {
            start_time: it.start_time,
            end_time: it.end_time,
            content: it.content,
            category: it.category,
            sort_order: i,
            done,
          }
          await supabase.from('plan_items').update(patch).eq('id', match.id)
          next.push({ ...match, ...patch })
        } else {
          const row = {
            entry_date: entryDate,
            start_time: it.start_time,
            end_time: it.end_time,
            content: it.content,
            category: it.category,
            sort_order: i,
            done: it.done ?? false,
          }
          const { data: inserted } = await supabase
            .from('plan_items')
            .insert(row)
            .select()
            .single()
          if (inserted) next.push(inserted as PlanItem)
        }
      }

      // Drop blocks that no longer appear in the revised plan
      for (const leftover of unused) {
        await supabase.from('plan_items').delete().eq('id', leftover.id)
      }

      setItems(next)
      setReplanText('')
      setReplanOpen(false)
    }
    setReplanning(false)
  }

  async function toggleDone(it: PlanItem) {
    const next = !it.done
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, done: next } : x)))
    await supabase.from('plan_items').update({ done: next }).eq('id', it.id)
  }

  function startEdit(it: PlanItem) {
    setEditingId(it.id)
    setDraft({
      start_time: it.start_time,
      end_time: it.end_time,
      content: it.content,
      category: it.category,
    })
  }

  async function saveEdit(id: number) {
    const patch = {
      start_time: draft.start_time ?? '',
      end_time: draft.end_time ?? '',
      content: draft.content ?? '',
      category: draft.category ?? 'deep-work',
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    setEditingId(null)
    await supabase.from('plan_items').update(patch).eq('id', id)
  }

  async function removeItem(id: number) {
    if (!window.confirm('Delete this task?')) return
    setItems((prev) => prev.filter((x) => x.id !== id))
    await supabase.from('plan_items').delete().eq('id', id)
  }

  async function addItem() {
    if (!newItem.content.trim()) return
    const maxSort = items.reduce((m, x) => Math.max(m, x.sort_order), -1)
    const row = {
      entry_date: entryDate,
      start_time: newItem.start_time,
      end_time: newItem.end_time,
      content: newItem.content,
      category: newItem.category,
      sort_order: maxSort + 1,
      done: false,
    }
    const { data } = await supabase.from('plan_items').insert(row).select().single()
    if (data) {
      setItems((prev) => [...prev, data as PlanItem])
      setAdding(false)
      setNewItem({ start_time: '', end_time: '', content: '', category: 'deep-work' })
    }
  }

  async function startWorking(it: PlanItem) {
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
      setItems((prev) =>
        prev.map((x) => (x.id === it.id ? { ...x, conversation_id: data.conversationId } : x))
      )
      router.push('/assistant?chat=' + data.conversationId)
    }
  }

  const sorted = [...items].sort(
    (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
  )

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
      <h2 className="eyebrow">Your plan for today</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReplanOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Wand2 size={14} />
            Replan with AI
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Plus size={14} />
            Add task
          </button>
        </div>
      </div>

      {replanOpen && (
        <div className="mt-3 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
          <textarea
            rows={3}
            value={replanText}
            onChange={(e) => setReplanText(e.target.value)}
            placeholder="Tell me what changed. e.g. Did the first two, skipped task three for a break, no beach today, add a work block from now to 4:30 on the app."
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={runReplan}
              disabled={replanning}
              className="flex items-center gap-1 rounded-lg bg-neutral-900 px-4 py-2 text-xs text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              <Wand2 size={14} />
              {replanning ? 'Rebuilding your day...' : 'Update my plan'}
            </button>
            <button
              onClick={() => setReplanOpen(false)}
              className="rounded-lg px-3 py-2 text-xs text-neutral-500 hover:text-neutral-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1.5">
        {sorted.map((it) => {
          const isEditing = editingId === it.id
          if (isEditing) {
            return (
              <div key={it.id} className="flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5">
                <div className="flex w-28 shrink-0 items-center gap-1 text-xs text-neutral-500">
                  <input
                    value={draft.start_time ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
                    className="w-12 rounded border border-neutral-200 bg-transparent px-1 outline-none"
                  />
                  <span>to</span>
                  <input
                    value={draft.end_time ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
                    className="w-12 rounded border border-neutral-200 bg-transparent px-1 outline-none"
                  />
                </div>
                <input
                  value={draft.content ?? ''}
                  onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                  className="flex-1 rounded border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none"
                />
                <select
                  value={draft.category ?? 'deep-work'}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="rounded border border-neutral-200 bg-transparent px-1 py-1 text-xs outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button onClick={() => saveEdit(it.id)} className="text-green-600 hover:text-green-700" title="Save">
                  <Check size={16} />
                </button>
                <button onClick={() => setEditingId(null)} className="text-neutral-400 hover:text-neutral-600" title="Cancel">
                  <X size={16} />
                </button>
              </div>
            )
          }
          return (
            <div
              key={it.id}
              className={`group flex items-center gap-3 rounded-lg border px-4 py-2.5 ${
                it.done ? 'border-neutral-100 bg-neutral-50' : 'border-neutral-200'
              }`}
            >
              <button
                onClick={() => toggleDone(it)}
                className="shrink-0 text-neutral-400 hover:text-green-600"
                title={it.done ? 'Mark not done' : 'Mark done'}
              >
                {it.done ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} />}
              </button>
              <span className="w-28 shrink-0 text-xs text-neutral-500">
                {it.start_time} to {it.end_time}
              </span>
              <button
                onClick={() => startEdit(it)}
                className={`flex-1 text-left text-sm ${it.done ? 'text-neutral-400 line-through' : ''}`}
                title="Click to edit"
              >
                {it.content}
              </button>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${catColor[it.category] ?? 'bg-neutral-100 text-neutral-600'}`}>
                {it.category}
              </span>
              <button
                onClick={() => startWorking(it)}
                disabled={starting === it.id}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 disabled:opacity-50"
              >
                <Play size={12} />
                {starting === it.id ? 'Starting...' : it.conversation_id ? 'Resume' : 'Start working'}
              </button>
              <button
                onClick={() => removeItem(it.id)}
                className="hidden shrink-0 text-neutral-400 hover:text-red-600 group-hover:block"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )
        })}

        {adding && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5">
            <div className="flex w-28 shrink-0 items-center gap-1 text-xs text-neutral-500">
              <input
                value={newItem.start_time}
                onChange={(e) => setNewItem((n) => ({ ...n, start_time: e.target.value }))}
                placeholder="9:00 AM"
                className="w-12 rounded border border-neutral-200 bg-transparent px-1 outline-none"
              />
              <span>to</span>
              <input
                value={newItem.end_time}
                onChange={(e) => setNewItem((n) => ({ ...n, end_time: e.target.value }))}
                placeholder="10:00 AM"
                className="w-12 rounded border border-neutral-200 bg-transparent px-1 outline-none"
              />
            </div>
            <input
              value={newItem.content}
              onChange={(e) => setNewItem((n) => ({ ...n, content: e.target.value }))}
              placeholder="What are you doing?"
              className="flex-1 rounded border border-neutral-200 bg-transparent px-2 py-1 text-sm outline-none"
              autoFocus
            />
            <select
              value={newItem.category}
              onChange={(e) => setNewItem((n) => ({ ...n, category: e.target.value }))}
              className="rounded border border-neutral-200 bg-transparent px-1 py-1 text-xs outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={addItem} className="text-green-600 hover:text-green-700" title="Add">
              <Check size={16} />
            </button>
            <button onClick={() => setAdding(false)} className="text-neutral-400 hover:text-neutral-600" title="Cancel">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}