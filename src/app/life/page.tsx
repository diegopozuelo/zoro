'use client'
import { useState } from 'react'
import LifeTracker from '@/components/LifeTracker'
import WeekStrip from '@/components/WeekStrip'

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function LifePage() {
  const [selected, setSelected] = useState(ymd(new Date()))
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold">Life</h1>
      <p className="mt-1 text-neutral-500">Track your day. Hit your rings.</p>

      <div className="mt-6 space-y-6">
        <WeekStrip onSelectDay={setSelected} refreshKey={refreshKey} />
        <LifeTracker
          selected={selected}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      </div>
    </div>
  )
}