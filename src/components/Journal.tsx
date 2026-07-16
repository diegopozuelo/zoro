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

  useEffect(() => {
    async function loadDates() {
      const { data } = await supabase.from('journal').select('entry_date')
      if (data) setEntryDates(new Set(data.map((d) => d.entry_date)))
    }
    loadDates()
  }, [saving])

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

  const todayStr = ymd(today)
  const entryCount = entryDates.size

  return (
    <section
      className="motion-fade-in mt-8 grid grid-cols-1 gap-5 pb-10 lg:grid-cols-2"
      style={{ animationDelay: '80ms' }}
    >
      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="section-rail !mb-1">
              <h2 className="eyebrow eyebrow-accent !mb-0">Calendar</h2>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">
              <span className="font-mono-metric text-[var(--accent)]">{entryCount}</span>
              {' '}entries logged
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono-metric text-sm text-[var(--ink)]">{monthName}</span>
            <button onClick={prevMonth} className="btn-ghost !p-2" title="Previous month">
              <ChevronLeft size={18} />
            </button>
            <button onClick={nextMonth} className="btn-ghost !p-2" title="Next month">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-mono-metric text-[var(--ink-faint)]">
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
            const isToday = dateStr === todayStr
            return (
              <button
                key={i}
                onClick={() => setSelected(dateStr)}
                className={`relative aspect-square rounded-lg text-sm font-mono-metric transition duration-[var(--dur-med)] ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[#041018] shadow-[0_0_16px_var(--accent-glow)]'
                    : 'border border-transparent text-[var(--ink)] hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] hover:bg-[color-mix(in_srgb,var(--accent)_8%,var(--card))]'
                } ${isToday && !isSelected ? 'ring-1 ring-[color-mix(in_srgb,var(--accent)_50%,var(--line))]' : ''}`}
              >
                {d}
                {hasEntry && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--ok)] shadow-[0_0_6px_var(--ok)]" />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="hud-panel relative p-5 sm:p-6">
        <span className="hud-corners-tr" aria-hidden />
        <span className="hud-corners-bl" aria-hidden />

        <div className="section-rail">
          <h2 className="eyebrow eyebrow-accent !mb-0">Entry</h2>
        </div>
        <p className="font-mono-metric text-base text-[var(--ink)]">{selectedLabel}</p>
        {entryDates.has(selected) && (
          <span className="status-pill status-pill-green mt-2">Has entry</span>
        )}
        <textarea
          rows={12}
          placeholder="How did today go? What did you work on? Anything on your mind..."
          className="input-dark mt-4 w-full px-4 py-3 text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button
          onClick={save}
          disabled={saving}
          className="btn-primary mt-4"
        >
          {saving ? 'Saving...' : 'Save entry'}
        </button>
      </div>
    </section>
  )
}
