'use client'

import { useEffect, useState } from 'react'

const LABELS: Record<string, string> = {
  day: 'DAY',
  dusk: 'DUSK',
  evening: 'EVENING',
  night: 'NIGHT',
}

export default function PhaseBadge() {
  const [phase, setPhase] = useState('night')

  useEffect(() => {
    const read = () => {
      setPhase(document.documentElement.dataset.phase || 'night')
    }
    read()
    const id = window.setInterval(read, 15_000)
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-phase'],
    })
    return () => {
      window.clearInterval(id)
      obs.disconnect()
    }
  }, [])

  return (
    <span className="font-mono-metric tracking-wider text-[var(--accent)]">
      {LABELS[phase] ?? 'NIGHT'}
    </span>
  )
}
