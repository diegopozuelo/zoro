'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Journal() {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState(ymd(today))
  const [content, setContent] = useState('')
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Load which dates have entries (for dots on the calendar)
  useEffect(() => {
    async function loadDates() {
      const { data } = await supabase.from('journal').select('entry_date')
      if (data) setEntryDates(new Set(data.map((d) => d.entry_date)))
    }
    loadDates()
  }, [saving])

  // Load the selected day's entry
  useEffect(() => {
    async function loadEntry() {
      const { data } = await supabase
        .from('journal')
        .select('content')
        .eq('entry_date', selected)
        .maybeSingle()
      setContent(data?.content ?? '')
    }
    loadEntry()
  }, [selected])

  async function save() {
    setSaving(true)
    await supabase
      .from('journal')
      .upsert({ entry_date: selected, content }, { onConflict: 'entry_date' })
    setSaving(false)
  }

  // Build the calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else setViewMonth(viewMonth - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else setViewMonth(viewMonth + 1)
  }

  const selectedLabel = new Date(selected + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Calendar */}
      <div>
        <div className="flex items-center justify-between">
          <span className="font-medium">{monthName}</span>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="rounded p-1 hover:bg-neutral-100">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="rounded p-1 hover:bg-neutral-100">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-neutral-400">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="py-1">{d}</div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />
            const dateStr = ymd(new Date(viewYear, viewMonth, d))
            const isSelected = dateStr === selected
            const hasEntry = entryDates.has(dateStr)
            return (
              <button
                key={i}
                onClick={() => setSelected(dateStr)}
                className={`relative aspect-square rounded-lg text-sm ${
                  isSelected
                    ? 'bg-neutral-900 text-white'
                    : 'hover:bg-neutral-100'
                }`}
              >
                {d}
                {hasEntry && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-green-500" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Entry editor */}
      <div>
        <p className="font-medium">{selectedLabel}</p>
        <textarea
          rows={12}
          placeholder="How did today go? What did you work on? Anything on your mind..."
          className="mt-3 w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={save}
          disabled={saving}
          className="mt-3 rounded-lg bg-neutral-900 px-5 py-2 text-sm text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>
    </div>
  )
}