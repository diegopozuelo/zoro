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
  const [bars, setBars] = useState(() => Array.from({ length: 12 }, () => 0.35))

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const tickId = window.setInterval(() => {
      setTick((t) => (t + 1) % TICKS.length)
    }, 2800)

    const barId = window.setInterval(() => {
      setBars((prev) => prev.map((_, i) => {
        const wave = 0.25 + Math.abs(Math.sin(Date.now() / 400 + i * 0.55)) * 0.7
        return wave * (0.85 + Math.random() * 0.15)
      }))
    }, 120)

    return () => {
      window.clearInterval(tickId)
      window.clearInterval(barId)
    }
  }, [])

  return (
    <div className="hero-visuals" aria-hidden>
      <div className="hero-glow" />
      <div className="hero-orbit hero-orbit-a">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-orbit hero-orbit-b">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-orbit hero-orbit-c" />
      <div className="hero-sweep" />
      <div className="hero-eq">
        {bars.map((h, i) => (
          <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      <div className="hero-ticker font-mono-metric">
        <span className="hero-ticker-label">CORE</span>
        <span key={tick} className="hero-ticker-text">{TICKS[tick]}</span>
      </div>
    </div>
  )
}
