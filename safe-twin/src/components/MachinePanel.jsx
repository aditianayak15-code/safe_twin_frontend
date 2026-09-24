/** MachinePanel — machine detail side panel, animates in on selection. */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, BrainCircuit, ArrowRight, Wrench, AlertTriangle } from 'lucide-react'
import { useStore, closeMachine, analyzeCascade, navigate, getState } from '../store/useStore.js'
import { fetchTelemetry } from '../services/api.js'
import { StatusDot, ValueRow, Chip, STATE_COLORS, STATE_LABELS, AnimatedNumber, Bar } from './ui.jsx'

export default function MachinePanel() {
  const selectedId = useStore((s) => s.selectedId)
  const machines = useStore((s) => s.machines)
  const tick = useStore((s) => s.tick)
  const machine = machines.find((m) => m.id === selectedId)

  const [channels, setChannels] = useState([])
  useEffect(() => {
    if (!selectedId) return
    let alive = true
    fetchTelemetry(selectedId, tick).then((ch) => { if (alive) setChannels(ch) })
    return () => { alive = false }
  }, [selectedId, tick])

  return (
    <AnimatePresence>
      {machine && (
        <motion.aside
          key={machine.id}
          initial={{ x: 420, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 420, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="panel panel-corner absolute top-4 right-4 bottom-20 z-30 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col"
        >
          {/* header */}
          <div className="flex items-start justify-between border-b border-[#1b2733] p-4">
            <div>
              <div className="hud-label">Machine</div>
              <div className="text-lg font-bold tracking-[0.12em] text-[#e8f1f8]">{machine.id}</div>
              <div className="text-[11px] text-[#7d92a5]">{machine.role}</div>
            </div>
            <button className="hud-btn !px-2 !py-1" onClick={closeMachine} title="Close">
              <X size={13} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* risk + status */}
            <section>
              <div className="flex items-end justify-between">
                <div>
                  <div className="hud-label">Failure Risk</div>
                  <div className="text-4xl font-bold tabular-nums text-glow-crit" style={{ color: STATE_COLORS[machine.state] }}>
                    <AnimatedNumber value={machine.risk} suffix="%" />
                  </div>
                </div>
                <Chip color={STATE_COLORS[machine.state]}>
                  <StatusDot state={machine.state} size={5} />
                  {STATE_LABELS[machine.state]}
                </Chip>
              </div>
              <div className="mt-2">
                <Bar value={machine.risk} color={STATE_COLORS[machine.state]} />
                <div className="mt-1 flex justify-between text-[9px] tracking-[0.14em] text-[#46586a] uppercase">
                  <span>0</span><span>50</span><span>100</span>
                </div>
              </div>
            </section>

            {/* live telemetry */}
            <section>
              <div className="hud-label mb-1">Live Telemetry</div>
              <div className="blink-soft mb-2 h-px bg-gradient-to-r from-sky-400/60 to-transparent" />
              {channels.map((ch) => (
                <ValueRow
                  key={ch.key}
                  label={ch.label}
                  value={ch.value}
                  unit={ch.unit}
                  warnAbove={ch.warnAbove}
                  critAbove={ch.critAbove}
                />
              ))}
            </section>

            {/* prediction */}
            {machine.predicts?.length > 0 && (
              <section className="border border-[#3a2222] bg-[#1a0f10]/60 p-3">
                <div className="hud-label mb-1 text-[#f87171]">Predicted Failure</div>
                <div className="flex items-center gap-2 text-[#fca5a5] font-semibold">
                  <AlertTriangle size={14} />
                  {machine.predicts[0]}
                </div>
                <div className="mt-1 text-[11px] text-[#7d92a5]">
                  Estimated horizon: <span className="text-[#f87171] font-semibold">~2 hours</span>
                </div>
              </section>
            )}

            {/* actions */}
            <section className="grid grid-cols-1 gap-2">
              <button
                className="hud-btn hud-btn-primary sweep flex items-center justify-center gap-2"
                onClick={() => analyzeCascade(machine.id)}
              >
                <BrainCircuit size={13} /> View Cascade
              </button>
              <button
                className="hud-btn flex items-center justify-center gap-2"
                onClick={() => { closeMachine(); navigate('scenarios') }}
              >
                <Wrench size={13} /> View Scenarios
              </button>
            </section>

            {/* production role footer */}
            <section className="border-t border-[#1b2733] pt-3 text-[10px] text-[#46586a] leading-relaxed">
              Digital-twin node synchronized. Telemetry streams from simulated edge
              gateway — swap to live backend via the service layer without UI changes.
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
