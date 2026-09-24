/** Copilot — AI Safety Copilot dock, narrating the demo story. */

import { motion, AnimatePresence } from 'motion/react'
import { BrainCircuit, ChevronUp, ChevronDown, CircleUserRound, ArrowDown } from 'lucide-react'
import { useStore, toggleCopilot, advanceCopilotStep, navigate } from '../store/useStore.js'
import { Chip } from './ui.jsx'

/**
 * DEMO RESPONSE — simulated copilot narrative (backend-ready: replace with
 * POST /copilot/advise once the ML assistant endpoint exists).
 */
function useCopilotNarrative() {
  const cascadeResult = useStore((s) => s.cascadeResult)
  const approval = useStore((s) => s.approval)
  const machines = useStore((s) => s.machines)
  const m04 = machines.find((m) => m.id === 'M-04')

  const failure = m04?.predicts?.[0] ?? null

  const steps = [
    {
      q: 'What happened?',
      a: `M-04 Motor anomaly detected. Vibration signature has drifted from its baseline envelope.`,
      tag: 'DETECTION',
    },
    {
      q: 'Why is it happening?',
      a: failure
        ? `ML engine attributes the signature to progressive ${failure.toLowerCase()} — temperature and torque rising in lockstep.`
        : 'Telemetry within nominal envelope — no active prediction.',
      tag: 'DIAGNOSIS',
    },
    {
      q: 'What could happen next?',
      a: failure
        ? `Predicted ${failure.toLowerCase()} within ~2 hours (risk ${m04?.risk ?? 0}%).`
        : 'No failure prediction active.',
      tag: 'PREDICTION',
    },
    {
      q: 'Which assets are affected?',
      a: cascadeResult
        ? `${cascadeResult.machinesAffected} machines in the propagation path: ${cascadeResult.nodes.map((n) => n.machineId).join(' → ')}. Production impact ${cascadeResult.productionImpact}%.`
        : 'Run cascade analysis to map propagation through the production network.',
      tag: 'CASCADE',
    },
    {
      q: 'What should you consider?',
      a: 'Immediate controlled maintenance keeps exposure Low and safety score at 91. Deferring pushes the cell toward uncontrolled failure.',
      tag: 'PLANNING',
    },
    {
      q: 'What intervention is appropriate?',
      a: 'LOTO bearing replacement at M-04. Awaiting YOUR approval — the AI does not act on the plant by itself.',
      tag: 'ACTION',
    },
  ]
  return { steps, failure }
}

export default function Copilot() {
  const open = useStore((s) => s.copilotOpen)
  const step = useStore((s) => s.copilotStep)
  const approval = useStore((s) => s.approval)
  const { steps } = useCopilotNarrative()
  const visible = steps.slice(0, step + 1)

  return (
    <motion.div
      initial={false}
      className="panel panel-corner pointer-events-auto absolute bottom-4 left-4 z-30 w-[330px] max-w-[calc(100vw-2rem)]"
    >
      {/* header */}
      <button
        onClick={toggleCopilot}
        className="flex w-full items-center justify-between border-b border-[#1b2733] px-3 py-2 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="relative grid h-7 w-7 place-items-center border border-sky-400/40 bg-sky-400/10">
            <BrainCircuit size={14} className="text-sky-400" />
            <span className="pulse-dot absolute -top-1 -right-1" style={{ background: '#38bdf8', color: '#38bdf8', width: 5, height: 5 }} />
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-[0.16em] text-[#e8f1f8]">AI SAFETY COPILOT</div>
            <div className="text-[9px] tracking-[0.14em] text-[#46586a] uppercase">Simulated reasoning · demo data</div>
          </div>
        </div>
        {open ? <ChevronDown size={13} className="text-[#7d92a5]" /> : <ChevronUp size={13} className="text-[#7d92a5]" />}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="max-h-[280px] space-y-2 overflow-y-auto p-3">
              {visible.map((s, i) => (
                <motion.div
                  key={s.q}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-l-2 border-sky-400/40 pl-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Chip color="#38bdf8">{s.tag}</Chip>
                    <span className="text-[11px] font-semibold text-[#e8f1f8]">{s.q}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#7d92a5]">{s.a}</p>
                </motion.div>
              ))}

              {step < steps.length - 1 && (
                <button onClick={advanceCopilotStep} className="hud-btn hud-btn-primary w-full">
                  Continue analysis
                </button>
              )}

              {/* human-in-the-loop footer */}
              <div className="mt-3 border border-[#1b2733] bg-[#0a1017]/80 p-2.5">
                <div className="hud-label mb-1.5">Human-in-the-loop chain</div>
                <div className="space-y-0.5 text-[9px] tracking-[0.12em] uppercase">
                  {['AI analysis', 'Recommended action', 'Human review', 'Human approval', 'Maintenance action'].map((s, i) => {
                    const phase = ['pending', 'pending', 'review', approval === 'approved' ? 'approved' : 'pending', approval === 'complete' ? 'done' : 'pending'][i]
                    const done = approval === 'complete' || (approval === 'approved' && i <= 2) || (approval === 'in_progress' && i <= 3)
                    const activeNow = (approval === 'pending' && i === 2) || (approval === 'approved' && i === 4)
                    return (
                      <div key={s} className="flex items-center gap-1.5">
                        <span
                          className="h-1 w-1 rounded-full"
                          style={{ background: done ? '#34d399' : activeNow ? '#38bdf8' : '#2a3947' }}
                        />
                        <span style={{ color: done ? '#34d399' : activeNow ? '#7dd3fc' : '#46586a' }}>{s}</span>
                        {i < 4 && <ArrowDown size={7} className="text-[#2a3947] ml-auto" />}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[9px] text-[#46586a]">
                  <CircleUserRound size={11} className="text-sky-400" />
                  Operator stays in control — AI recommends, human approves.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
