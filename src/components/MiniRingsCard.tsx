const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

// base color plus a darker "over" color for exceeding the goal, matching LifeTracker
const RINGS = [
  { key: 'work', base: '#3b82f6', over: '#1e3a8a', r: 60 },
  { key: 'sleep', base: '#8b5cf6', over: '#4c1d95', r: 46 },
  { key: 'exercise', base: '#22c55e', over: '#14532d', r: 32 },
  { key: 'reading', base: '#f59e0b', over: '#92400e', r: 18 },
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

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90 shrink-0">
      {RINGS.map((ring) => {
        const circ = 2 * Math.PI * ring.r
        const pct = goals[ring.key] > 0 ? vals[ring.key] / goals[ring.key] : 0
        const base = Math.min(pct, 1)
        const over = pct > 1 ? Math.min(pct - 1, 1) : 0
        return (
          <g key={ring.key}>
            <circle cx={center} cy={center} r={ring.r} fill="none" stroke="#f1f1f1" strokeWidth="10" />
            <circle
              cx={center} cy={center} r={ring.r} fill="none" stroke={ring.base} strokeWidth="10"
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ - base * circ}
            />
            {over > 0 && (
              <circle
                cx={center} cy={center} r={ring.r} fill="none" stroke={ring.over} strokeWidth="10"
                strokeLinecap="round" strokeDasharray={circ}
                strokeDashoffset={circ - over * circ}
              />
            )}
          </g>
        )
      })}
    </svg>
  )
}