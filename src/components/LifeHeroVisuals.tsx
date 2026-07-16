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
  const [bars, setBars] = useState(() => Array.from({ length: 10 }, () => 0.4))

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const tickId = window.setInterval(() => {
      setTick((t) => (t + 1) % TICKS.length)
    }, 3000)

    const barId = window.setInterval(() => {
      setBars((prev) =>
        prev.map((_, i) => {
          const wave = 0.2 + Math.abs(Math.sin(Date.now() / 500 + i * 0.7)) * 0.75
          return wave
        })
      )
    }, 140)

    return () => {
      window.clearInterval(tickId)
      window.clearInterval(barId)
    }
  }, [])

  return (
    <div className="hero-visuals" aria-hidden>
      <div className="life-breath" />
      <div className="hero-glow opacity-70" />
      <div className="hero-orbit hero-orbit-a life-orbit">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-orbit hero-orbit-b life-orbit">
        <span className="hero-orbit-dot" />
      </div>
      <div className="hero-sweep life-sweep" />
      <div className="hero-eq life-eq">
        {bars.map((h, i) => (
          <span key={i} style={{ height: `${Math.round(h * 100)}%` }} />
        ))}
      </div>
      <div className="hero-ticker font-mono-metric">
        <span className="hero-ticker-label text-[var(--ok)]">VITALS</span>
        <span key={tick} className="hero-ticker-text">
          {TICKS[tick]}
        </span>
      </div>
    </div>
  )
}
