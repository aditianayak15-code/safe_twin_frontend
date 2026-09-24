/** CascadeView — failure cascade analysis + simulation + impact summary. */

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BrainCircuit, Play, RotateCcw, Zap, TriangleAlert, TrendingDown, Users, CircleStop } from 'lucide-react'
import { useStore, analyzeCascade, runSimulation, resetSim, showCascadeImpact, advanceSim, revealCascadeStep, getState } from '../store/useStore.js'
import { STATE_COLORS, Chip, AnimatedNumber, Bar } from '../components/ui.jsx'

const C = {
  line: '#243444',
  lineAlert: '#f87171',
  accent: '#38bdf8',
  ink: '#e8f1f8',
  dim: '#7d92a5',
  faint: '#46586a',
}

const stateColor = (s) => STATE_COLORS[s] ?? '#34d399'

/** 2D cascade network graph: trigger → hops → production loss (pure render). */
function CascadeGraph({ nodes, machines, revealed }) {
  const [layout, setLayout] = useState([])
  const [links, setLinks] = useState([])

  useEffect(() => {
    if (!nodes.length || !machines.length) return
    // left→right layout by depth
    const byDepth = {}
    nodes.forEach((n) => {
      byDepth[n.depth] = byDepth[n.depth] ?? []
      byDepth[n.depth].push(n)
    })
    const depths = Object.keys(byDepth).map(Number).sort((a, b) => a - b)
    const W = 760, H = 250
    const lay = []
    depths.forEach((d, di) => {
      byDepth[d].forEach((n, i) => {
        const m = machines.find((x) => x.id === n.machineId)
        lay.push({
          ...n,
          x: 90 + di * ((540 - 90) / Math.max(1, depths.length - 1)),
          y: H / 2 + (i - (byDepth[d].length - 1) / 2) * 70,
          label: n.machineId,
          name: m?.name ?? n.machineId,
          state: m?.state ?? 'normal',
        })
      })
    })
    setLayout(lay)
    setLinks(depths.slice(1).map((d, i) => ({ from: i, to: i + 1 })))
  }, [nodes, machines])

  const revealedNow = revealed
  const isRevealed = (id) => revealedNow.includes(id)

  return (
    <svg viewBox="0 0 760 250" className="h-auto w-full">
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={C.faint} />
        </marker>
        <marker id="arrow-hot" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={C.lineAlert} />
        </marker>
      </defs>

      {links.map((l, i) => {
        const a = layout[l.from], b = layout[l.to]
        if (!a || !b) return null
        const hot = isRevealed(b.machineId)
        return (
          <g key={i}>
            <motion.line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={hot ? C.lineAlert : C.line}
              strokeWidth={hot ? 2 : 1.2}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: hot ? 1 : 0.5 }}
              transition={{ duration: 0.7 }}
            />
            {hot && <FlowDots a={a} b={b} hot />}
          </g>
        )
      })}

      {layout.map((n) => {
        const on = isRevealed(n.machineId)
        const color = on ? (n.depth === 0 ? C.lineAlert : '#fb923c') : C.faint
        return (
          <motion.g
            key={n.machineId}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: on ? 1 : 0.35, scale: 1 }}
            style={{ originX: `${n.x}px`, originY: `${n.y}px` }}
          >
            {on && (
              <motion.circle
                cx={n.x} cy={n.y} r={26}
                fill="none" stroke={color} strokeWidth={1}
                initial={{ scale: 0.4, opacity: 0.8 }}
                animate={{ scale: 2.1, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
            )}
            <circle cx={n.x} cy={n.y} r={26} fill="#0d141d" stroke={color} strokeWidth={on ? 2 : 1} />
            <text x={n.x} y={n.y - 2} textAnchor="middle" fill={on ? C.ink : C.faint} fontSize="11" fontWeight="700" fontFamily="monospace">
              {n.label}
            </text>
            <text x={n.x} y={n.y + 11} textAnchor="middle" fill={C.dim} fontSize="7.5" letterSpacing="1" fontFamily="monospace">
              {on ? (n.depth === 0 ? 'TRIGGER' : 'AFFECTED') : 'STANDBY'}
            </text>
            <text x={n.x} y={n.y + 42} textAnchor="middle" fill={on ? '#fbbf24' : C.faint} fontSize="8" letterSpacing="0.5" fontFamily="monospace">
              {on && n.depth > 0 ? `${n.probability}%  ·  +${n.delaySec}s` : ''}
            </text>
            <text x={n.x} y={n.y - 34} textAnchor="middle" fill={C.dim} fontSize="8" letterSpacing="1.5" fontFamily="monospace">
              {n.name.toUpperCase()}
            </text>
          </motion.g>
        )
      })}

      {/* production loss terminal node */}
      {layout.length > 0 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: revealedNow.length >= layout.length ? 1 : 0.25 }}
          transition={{ delay: 0.3 }}
        >
          <rect
            x={layout[layout.length - 1].x + 62}
            y={layout[layout.length - 1].y - 20}
            width={118} height={40}
            fill={revealedNow.length >= layout.length ? 'rgba(248,113,113,0.12)' : '#0d141d'}
            stroke={revealedNow.length >= layout.length ? C.lineAlert : C.line}
            strokeDasharray="4 3"
          />
          <text
            x={layout[layout.length - 1].x + 121}
            y={layout[layout.length - 1].y + 4}
            textAnchor="middle"
            fill={revealedNow.length >= layout.length ? '#fca5a5' : C.faint}
            fontSize="9" letterSpacing="1.5" fontFamily="monospace"
          >
            PRODUCTION LOSS
          </text>
        </motion.g>
      )}
    </svg>
  )
}

/** Animated packet dots along revealed links. */
function FlowDots({ a, b, hot }) {
  const dur = hot ? 1.1 : 2
  return (
    <>
      {[0, 1, 2].map((i) => (
        <circle key={i} r={hot ? 2.6 : 2} fill={hot ? C.lineAlert : C.accent}>
          <animateMotion
            dur={`${dur}s`}
            repeatCount="indefinite"
            path={`M ${a.x},${a.y} L ${b.x},${b.y}`}
            begin={`${i * (dur / 3)}s`}
          />
        </circle>
      ))}
    </>
  )
}

// ── main view ─────────────────────────────────────────────────────────────
export default function CascadeView() {
  const machines = useStore((s) => s.machines)
  const cascadeResult = useStore((s) => s.cascadeResult)
  const cascadeRevealed = useStore((s) => s.cascadeRevealed)
  const cascadeImpactShown = useStore((s) => s.cascadeImpactShown)
  const simRunning = useStore((s) => s.simRunning)
  const simStep = useStore((s) => s.simStep)
  const simSteps = useStore((s) => s.simSteps)

  const busy = simRunning

  // Orchestration: when a cascade exists, reveal nodes cinematically on a timer.
  useEffect(() => {
    if (!cascadeResult || simRunning) return
    if (cascadeImpactShown && cascadeRevealed.length >= cascadeResult.nodes.length) return
    const timers = []
    const nodes = cascadeResult.nodes
    nodes.forEach((n, i) => {
      if (i === 0) return // trigger already revealed
      timers.push(setTimeout(() => revealCascadeStep(n.machineId), i * 900))
    })
    timers.push(setTimeout(() => showCascadeImpact(), nodes.length * 900 + 400))
    return () => timers.forEach(clearTimeout)
  }, [cascadeResult, cascadeImpactShown, cascadeRevealed.length, simRunning])

  // Simulation runner: advance the store-driven sim step on a fixed beat.
  useEffect(() => {
    if (!simRunning) return
    const iv = setInterval(() => { advanceSim() }, 1100)
    return () => clearInterval(iv)
  }, [simRunning])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid h-full grid-rows-[auto_1fr_auto] gap-3"
    >
      {/* header */}
      <div className="panel panel-corner flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Zap size={14} className="text-amber-400" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.16em] text-[#e8f1f8]">FAILURE CASCADE ANALYSIS</div>
            <div className="text-[10px] text-[#7d92a5]">
              Trigger machine: <span className="text-[#fca5a5] font-semibold">M-04 Motor</span> · bearing failure propagation model
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!simRunning && (
            <button className="hud-btn hud-btn-primary sweep" onClick={() => analyzeCascade('M-04')}>
              <span className="flex items-center gap-2"><BrainCircuit size={13} /> Analyze Failure Cascade</span>
            </button>
          )}
          {(cascadeResult || simRunning) && (
            <button className="hud-btn" onClick={resetSim}>
              <span className="flex items-center gap-2"><RotateCcw size={12} /> Reset</span>
            </button>
          )}
          <button className="hud-btn hud-btn-danger" disabled={busy} onClick={() => runSimulation()}>
            <span className="flex items-center gap-2"><Play size={12} /> Run Simulation</span>
          </button>
        </div>
      </div>

      {/* graph */}
      <div className="panel panel-corner relative min-h-0 overflow-hidden p-3 grid-bg">
        {simRunning && (
          <div className="absolute top-3 left-3 z-10">
            <Chip color="#f87171">● SIMULATION RUNNING</Chip>
          </div>
        )}
        {cascadeResult ? (
          <CascadeGraph
            nodes={cascadeResult.nodes}
            machines={machines}
            revealed={cascadeRevealed}
            onComplete={showCascadeImpact}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="grid h-14 w-14 place-items-center border border-[#1b2733] bg-[#0d141d]">
              <BrainCircuit size={22} className="text-[#46586a]" />
            </div>
            <div className="hud-label">No cascade analysis loaded</div>
            <p className="max-w-sm text-[11px] leading-relaxed text-[#7d92a5]">
              Run <span className="text-sky-300">ANALYZE FAILURE CASCADE</span> to simulate how an
              M-04 bearing failure propagates through the production network — or press RUN SIMULATION
              for the full propagation experiment.
            </p>
          </div>
        )}
      </div>

      {/* impact summary / sim stepper */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        {/* impact summary */}
        <div className="panel panel-corner p-4">
          <div className="hud-label mb-3">Impact Summary</div>
          {cascadeImpactShown && cascadeResult ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {[
                { label: 'Machines affected', value: cascadeResult.machinesAffected, suffix: '', color: '#e8f1f8' },
                { label: 'Production impact', value: cascadeResult.productionImpact, suffix: '%', color: '#f87171' },
                { label: 'Cascade probability', value: cascadeResult.cascadeProbability, suffix: '%', color: '#fbbf24' },
                { label: 'Severity', text: cascadeResult.severity, color: '#fbbf24' },
                { label: 'Worker exposure', value: cascadeResult.workerExposure, suffix: '', color: '#38bdf8' },
              ].map((m) => (
                <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
                  <div className="text-xl font-bold tabular-nums" style={{ color: m.color }}>
                    {m.text ?? <AnimatedNumber value={m.value} suffix={m.suffix} />}
                  </div>
                  <div className="hud-label mt-0.5 !text-[8px]">{m.label}</div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-2 text-[11px] text-[#46586a]">
              Impact metrics populate after the cascade animation completes.
            </div>
          )}
          {cascadeResult && cascadeImpactShown && (
            <p className="mt-3 border-t border-[#1b2733] pt-2 text-[11px] leading-relaxed text-[#7d92a5]">
              {cascadeResult.summary}
            </p>
          )}
        </div>

        {/* simulation stepper */}
        <div className="panel panel-corner p-4">
          <div className="hud-label mb-2">Simulation Steps</div>
          {simSteps.length === 0 ? (
            <div className="text-[11px] text-[#46586a]">Press RUN SIMULATION to execute the propagation experiment.</div>
          ) : (
            <ol className="space-y-1.5">
              {simSteps.map((s, i) => {
                const on = i <= simStep
                const m = machines.find((x) => x.id === s.machineId)
                return (
                  <li key={i} className="flex items-center gap-2 text-[11px]">
                    <span
                      className="grid h-4 w-4 shrink-0 place-items-center border text-[8px] font-bold"
                      style={{
                        borderColor: on ? '#f87171' : '#243444',
                        color: on ? '#f87171' : '#46586a',
                        background: on ? 'rgba(248,113,113,0.12)' : 'transparent',
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: on ? '#e8f1f8' : '#46586a' }}>
                      {i === 0 ? 'Trigger machine' : m ? `${m.id} ${m.name} affected` : s.machineId}
                    </span>
                    <span className="ml-auto text-[9px] tabular-nums text-[#46586a]">+{s.atSec}s</span>
                  </li>
                )
              })}
              <li className="flex items-center gap-2 text-[11px]">
                <span className="grid h-4 w-4 shrink-0 place-items-center border border-[#243444] text-[8px] font-bold text-[#46586a]">Σ</span>
                <span className={simStep >= simSteps.length - 1 && !simRunning ? 'text-[#fca5a5]' : 'text-[#46586a]'}>
                  Production impact · worker exposure
                </span>
              </li>
            </ol>
          )}
        </div>
      </div>
    </motion.div>
  )
}
