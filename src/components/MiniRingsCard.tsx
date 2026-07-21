'use client'
import { useEffect, useState } from 'react'

const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const RINGS = [
  { key: 'work', base: '#60A5FA', over: '#93C5FD', glow: '#3B82F6', r: 60 },
  { key: 'sleep', base: '#A78BFA', over: '#C4B5FD', glow: '#8B5CF6', r: 46 },
  { key: 'exercise', base: '#34D399', over: '#6EE7B7', glow: '#10B981', r: 32 },
  { key: 'reading', base: '#FBBF24', over: '#FCD34D', glow: '#F59E0B', r: 18 },
]

export default function MiniRingsCard({
  work, sleep, exercise, reading,
}: {
  work: number; sleep: number; exercise: number; reading: number
}) {
  const vals: Record<string, number> = { work, sleep, exercise, reading }
  const goals: Record<string, number> = GOALS
  const size = 152
  const center = size / 2
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setReady(true)
      return
    }
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90 shrink-0"
      aria-hidden
    >
      {RINGS.map((ring) => {
        const circ = 2 * Math.PI * ring.r
        const pct = goals[ring.key] > 0 ? vals[ring.key] / goals[ring.key] : 0
        const base = Math.min(pct, 1)
        const over = pct > 1 ? Math.min(pct - 1, 1) : 0
        const baseOffset = ready ? circ - base * circ : circ
        const overOffset = ready ? circ - over * circ : circ
        return (
          <g key={ring.key}>
            <circle
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="10"
            />
            <circle
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke={ring.base}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={baseOffset}
              className="ring-progress"
              style={{ color: ring.glow }}
            />
            {over > 0 && (
              <circle
                cx={center}
                cy={center}
                r={ring.r}
                fill="none"
                stroke={ring.over}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={overOffset}
                className="ring-progress"
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}
