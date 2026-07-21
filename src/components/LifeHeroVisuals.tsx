'use client'

import { useEffect, useState } from 'react'

const TICKS = [
  'RECOVERY ONLINE',
  'TRACKING RINGS',
  'ENERGY CALIBRATING',
  'BODY SYSTEMS NOMINAL',
  'PROTECT THE STREAK',
  'MOVE WITH INTENT',
]

export default function LifeHeroVisuals() {
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
      <div className="hero-glow life-breath" />
      <div className="hero-orbit hero-orbit-a life-orbit">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-orbit hero-orbit-b life-orbit" />
      <div className="hero-eq">
        {Array.from({ length: 8 }, (_, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.16}s` }} />
        ))}
      </div>
      <div className="hero-ticker font-mono-metric">
        <span className="hero-ticker-label">VITAL</span>
        <span key={tick} className="hero-ticker-text">{TICKS[tick]}</span>
      </div>
    </div>
  )
}
