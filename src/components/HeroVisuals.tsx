'use client'

import { useEffect, useState } from 'react'

const TICKS = [
  'SYNCING PRIORITIES',
  'SCANNING PIPELINE',
  'CALIBRATING RINGS',
  'OUTREACH CHANNEL OPEN',
  'SYSTEM NOMINAL',
  'AWAITING NEXT MOVE',
]

export default function HeroVisuals() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const tickId = window.setInterval(() => {
      setTick((t) => (t + 1) % TICKS.length)
    }, 3200)

    return () => window.clearInterval(tickId)
  }, [])

  return (
    <div className="hero-visuals" aria-hidden>
      <div className="hero-glow" />
      <div className="hero-orbit hero-orbit-a">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-orbit hero-orbit-b" />
      <div className="hero-eq">
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.14}s` }} />
        ))}
      </div>
      <div className="hero-ticker font-mono-metric">
        <span className="hero-ticker-label">CORE</span>
        <span key={tick} className="hero-ticker-text">{TICKS[tick]}</span>
      </div>
    </div>
  )
}
