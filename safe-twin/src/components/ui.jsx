/** Shared UI primitives for the SAFE-TWIN HUD. */

import { useEffect, useRef, useState } from 'react'

export const STATE_COLORS = {
  normal: '#34d399',
  warning: '#fbbf24',
  high: '#f87171',
  failure: '#ef4444',
  maintenance: '#38bdf8',
}

export const STATE_LABELS = {
  normal: 'Normal',
  warning: 'Warning',
  high: 'High Risk',
  failure: 'FAILURE',
  maintenance: 'Maintenance',
}

/** Pulsing status dot driven by machine state. */
export function StatusDot({ state = 'normal', size = 6 }) {
  const color = STATE_COLORS[state] ?? '#34d399'
  const fast = state === 'high' || state === 'failure'
  return (
    <span
      className={fast ? 'pulse-dot blink-soft' : 'pulse-dot'}
      style={{ background: color, color, width: size, height: size }}
    />
  )
}

/** Animated number counter (eases toward target on change). */
export function AnimatedNumber({ value, decimals = 0, suffix = '', duration = 0.9, className = '' }) {
  const [display, setDisplay] = useState(value)
  const fromRef = useRef(value)
  const rafRef = useRef()

  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (value - from) * eased)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else fromRef.current = value
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className}>{display.toFixed(decimals)}{suffix}</span>
}

/** Horizontal meter bar. */
export function Bar({ value, max = 100, color = '#38bdf8', height = 4, track = 'rgba(36,52,68,0.6)' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full" style={{ height, background: track }}>
      <div
        className="h-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 10px ${color}66` }}
      />
    </div>
  )
}

/** Small uppercase chip. */
export function Chip({ children, color = '#7d92a5', bg, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase border ${className}`}
      style={{ color, borderColor: `${color}55`, background: bg ?? `${color}14` }}
    >
      {children}
    </span>
  )
}

/** Label/value telemetry row with live threshold color. */
export function ValueRow({ label, value, unit, warnAbove, critAbove, nominal, decimals = 1 }) {
  const isCrit = critAbove != null && value >= critAbove
  const isWarn = !isCrit && warnAbove != null && value >= warnAbove
  const color = isCrit ? '#f87171' : isWarn ? '#fbbf24' : '#e8f1f8'
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-[#1b2733] last:border-0">
      <span className="text-[10px] tracking-[0.16em] uppercase text-[#7d92a5]">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color }}>
        {value.toFixed(decimals)}
        <span className="text-[10px] text-[#7d92a5] ml-1">{unit}</span>
      </span>
    </div>
  )
}
