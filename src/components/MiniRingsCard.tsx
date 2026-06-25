const GOALS = { work: 5, sleep: 8, exercise: 45, reading: 20 }

const RINGS = [
  { key: 'work', color: '#3b82f6', r: 34 },
  { key: 'sleep', color: '#8b5cf6', r: 26 },
  { key: 'exercise', color: '#22c55e', r: 18 },
  { key: 'reading', color: '#f59e0b', r: 10 },
]

export default function MiniRingsCard({
  work, sleep, exercise, reading,
}: {
  work: number; sleep: number; exercise: number; reading: number
}) {
  const vals: Record<string, number> = { work, sleep, exercise, reading }
  const goals: Record<string, number> = GOALS

  return (
    <svg width="86" height="86" viewBox="0 0 86 86" className="-rotate-90">
      {RINGS.map((ring) => {
        const circ = 2 * Math.PI * ring.r
        const pct = Math.min(vals[ring.key] / goals[ring.key], 1)
        return (
          <g key={ring.key}>
            <circle cx="43" cy="43" r={ring.r} fill="none" stroke="#f1f1f1" strokeWidth="6" />
            <circle
              cx="43" cy="43" r={ring.r} fill="none" stroke={ring.color} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={circ}
              strokeDashoffset={circ - pct * circ}
            />
          </g>
        )
      })}
    </svg>
  )
}