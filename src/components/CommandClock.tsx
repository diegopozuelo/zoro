'use client'
import { useEffect, useState } from 'react'

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export default function CommandClock() {
  const [time, setTime] = useState<string | null>(null)

  useEffect(() => {
    setTime(formatTime(new Date()))
    const id = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span
      className="inline-block min-w-[7.5ch] font-mono-metric tabular-nums tracking-wider text-[var(--accent)]"
      suppressHydrationWarning
    >
      {time ?? '--:--:--'}
    </span>
  )
}
