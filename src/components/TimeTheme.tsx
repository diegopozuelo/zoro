'use client'

import { useEffect } from 'react'

/**
 * 0 = day, 1 = night.
 * Full day 9:00–16:00, full night 20:00–5:00, linear ramps between.
 */
export function nightFactor(d: Date) {
  const h = d.getHours() + d.getMinutes() / 60
  if (h >= 9 && h < 16) return 0
  if (h >= 20 || h < 5) return 1
  if (h >= 16 && h < 20) return (h - 16) / 4
  return 1 - (h - 5) / 4
}

function phaseLabel(n: number) {
  if (n < 0.2) return 'day'
  if (n < 0.55) return 'dusk'
  if (n < 0.85) return 'evening'
  return 'night'
}

export default function TimeTheme() {
  useEffect(() => {
    const root = document.documentElement

    const apply = () => {
      const n = nightFactor(new Date())
      root.style.setProperty('--night', n.toFixed(4))
      root.dataset.phase = phaseLabel(n)
    }

    apply()
    // Enable transitions only after the first correct value is set
    root.dataset.themeReady = '1'

    const id = window.setInterval(apply, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return null
}
