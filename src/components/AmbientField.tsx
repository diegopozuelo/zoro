'use client'

import { useEffect, useRef, useState } from 'react'

type Wave = {
  yBase: number
  amp: number
  freq: number
  speed: number
  phase: number
  tilt: number
  width: number
  alpha: number
}

function withAlpha(color: string, alpha: number) {
  const a = Math.max(0, Math.min(1, alpha))
  const rgb = color.match(/rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/)
  if (rgb) return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${a})`
  return `rgba(2, 132, 199, ${a})`
}

function buildWaves(h: number): Wave[] {
  const rows = 14
  return Array.from({ length: rows }, (_, i) => {
    const t = (i + 0.5) / rows
    return {
      yBase: h * (0.06 + t * 0.88),
      amp: 14 + (i % 4) * 12 + (i % 3) * 6,
      freq: 0.0032 + (i % 5) * 0.00115,
      speed: 0.85 + (i % 6) * 0.28 + (i % 2) * 0.15,
      phase: i * 0.85,
      tilt: (i % 2 === 0 ? 1 : -1) * (0.03 + (i % 4) * 0.022),
      width: 0.95 + (i % 4) * 0.45,
      alpha: 0.22 + (i % 5) * 0.07,
    }
  })
}

export default function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const probeRef = useRef<HTMLSpanElement>(null)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(mq.matches)
    const onChange = () => setReduce(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Cursor spotlight
  useEffect(() => {
    if (reduce) return
    const el = wrapRef.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = 0
    let tx = 50
    let ty = 30
    let cx = 50
    let cy = 30

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      tx = ((e.clientX - rect.left) / rect.width) * 100
      ty = ((e.clientY - rect.top) / rect.height) * 100
    }

    const tick = () => {
      cx += (tx - cx) * 0.08
      cy += (ty - cy) * 0.08
      el.style.setProperty('--spot-x', `${cx}%`)
      el.style.setProperty('--spot-y', `${cy}%`)
      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [reduce])

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    const probe = probeRef.current
    if (!canvas || !wrap || !probe) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let waves: Wave[] = []
    let raf = 0
    let accent = 'rgb(2, 132, 199)'
    let running = true
    let w = 1
    let h = 1
    let lastSample = 0

    const sampleAccent = () => {
      const c = getComputedStyle(probe).color
      if (c && c.startsWith('rgb')) accent = c
    }

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      // Cap DPR for performance
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      w = Math.max(1, Math.floor(rect.width))
      h = Math.max(1, Math.floor(rect.height))
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      waves = buildWaves(h)
      sampleAccent()
    }

    const draw = (now: number) => {
      if (!running) return
      const t = now / 1000

      if (now - lastSample > 800) {
        sampleAccent()
        lastSample = now
      }

      const night = Number(
        getComputedStyle(document.documentElement).getPropertyValue('--night') || '1'
      )

      ctx.clearRect(0, 0, w, h)

      // Step size: denser points for smoother moving waves
      const step = Math.max(6, Math.floor(w / 120))
      const visibility = 0.62 + night * 0.28

      for (const wave of waves) {
        ctx.beginPath()
        let started = false
        for (let x = -20; x <= w + 20; x += step) {
          const y =
            wave.yBase +
            x * wave.tilt +
            Math.sin(x * wave.freq + t * wave.speed + wave.phase) * wave.amp +
            Math.sin(x * wave.freq * 0.55 - t * wave.speed * 1.15 + wave.phase) *
              (wave.amp * 0.42) +
            Math.sin(x * wave.freq * 1.4 + t * wave.speed * 0.55) * (wave.amp * 0.18)
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = withAlpha(accent, wave.alpha * visibility)
        ctx.lineWidth = wave.width
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }

      // Crossing diagonals for denser tech overlap
      for (let i = 0; i < 5; i++) {
        const dir = i % 2 === 0 ? 1 : -1
        const base = h * (0.12 + i * 0.18)
        const amp = 16 + (i % 3) * 12
        const speed = 0.95 + i * 0.22
        ctx.beginPath()
        let started = false
        for (let x = -20; x <= w + 20; x += step) {
          const y =
            base +
            dir * x * (0.08 + (i % 3) * 0.03) +
            Math.sin(x * (0.005 + i * 0.001) + t * speed + i) * amp +
            Math.cos(x * 0.003 - t * speed * 0.8) * (amp * 0.3)
          if (!started) {
            ctx.moveTo(x, y)
            started = true
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = withAlpha(accent, (0.18 + night * 0.12) * visibility)
        ctx.lineWidth = 1.15 + (i % 2) * 0.35
        ctx.stroke()
      }

      if (!reduce) {
        raf = requestAnimationFrame(draw)
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    if (reduce) {
      draw(performance.now())
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [reduce])

  return (
    <div
      ref={wrapRef}
      className="ambient-field"
      aria-hidden
      style={{ ['--spot-x' as string]: '50%', ['--spot-y' as string]: '30%' }}
    >
      <span ref={probeRef} className="ambient-color-probe" />
      <div className="ambient-spot" />
      <div className="ambient-mesh" />
      <canvas ref={canvasRef} className="ambient-canvas ambient-canvas-flow" />
    </div>
  )
}
