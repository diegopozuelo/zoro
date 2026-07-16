'use client'

import { useEffect } from 'react'

/** 0 = brightest day around 1pm, 1 = deepest night around 1am */
function nightFactor(d: Date) {
  const h = d.getHours() + d.getMinutes() / 60
  return 0.5 * (1 - Math.cos(((h - 13) * Math.PI) / 12))
}

function phaseLabel(n: number) {
  if (n < 0.28) return 'day'
  if (n < 0.55) return 'dusk'
  if (n < 0.78) return 'evening'
  return 'night'
}

export default function TimeTheme() {
  useEffect(() => {
    const apply = () => {
      const n = nightFactor(new Date())
      const root = document.documentElement
      root.style.setProperty('--night', n.toFixed(4))
      root.dataset.phase = phaseLabel(n)
    }
    apply()
    const id = window.setInterval(apply, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return null
}
