/** SafetyView — worker safety, zone visualization, human approval workflow. */

import { motion } from 'motion/react'
import { ShieldCheck, HardHat, UserCheck, PlayCircle, CheckCircle2, Lock } from 'lucide-react'
import { useStore, recordApproval, startMaintenance, completeMaintenance, openCopilot, navigate } from '../store/useStore.js'
import { Chip, Bar, AnimatedNumber, STATE_COLORS } from '../components/ui.jsx'

const ZONES = [
  { name: 'SAFE ZONE', color: '#34d399', note: 'Full access — routine operation' },
  { name: 'WARNING ZONE', color: '#fbbf24', note: 'PPE required — elevated vibration zone near M-04' },
  { name: 'RESTRICTED ZONE', color: '#f87171', note: 'No entry without LOTO authorization' },
]

export default function SafetyView() {
  const safety = useStore((s) => s.safety)
  const approval = useStore((s) => s.approval)
  const machines = useStore((s) => s.machines)
  const m04 = machines.find((m) => m.id === 'M-04')
  const riskState = m04?.state === 'normal' ? 'clear' : 'caution'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid h-full auto-rows-min grid-rows-[auto_1fr] gap-3 overflow-y-auto"
    >
      {/* header */}
      <div className="panel panel-corner flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <ShieldCheck size={14} className="text-emerald-400" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.16em] text-[#e8f1f8]">SAFETY — WORKER EXPOSURE &amp; APPROVAL</div>
            <div className="text-[10px] text-[#7d92a5]">Safety-zone model around M-04 · zones rendered live in the twin</div>
          </div>
        </div>
        <button className="hud-btn" onClick={() => navigate('twin')}>
          Show zones in twin
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[340px_1fr_300px]">
        {/* left: exposure + zones */}
        <div className="space-y-3">
          <div className="panel panel-corner p-4">
            <div className="hud-label">Safety Score</div>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums text-[#34d399]">
                <AnimatedNumber value={safety?.safetyScore ?? 82} />
              </span>
              <span className="text-xs text-[#7d92a5]">/ 100</span>
            </div>
            <div className="mt-2"><Bar value={safety?.safetyScore ?? 82} color="#34d399" height={5} /></div>

            <div className="mt-4 space-y-2 border-t border-[#1b2733] pt-3 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#7d92a5]">Worker exposure</span>
                <Chip color={safety?.workerExposure === 'Low' ? '#34d399' : '#fbbf24'}>{safety?.workerExposure ?? 'Low'}</Chip>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d92a5]">Risk state</span>
                <Chip color={riskState === 'clear' ? '#34d399' : '#fbbf24'}>{riskState.toUpperCase()}</Chip>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7d92a5]">Current intervention</span>
                <span className="max-w-[160px] text-right text-[#e8f1f8]">{safety?.currentIntervention ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="panel panel-corner p-4">
            <div className="hud-label mb-2">Factory safety zones</div>
            <div className="space-y-2">
              {ZONES.map((z) => {
                const hot = z.name === 'RESTRICTED ZONE' && riskState !== 'clear'
                return (
                  <div key={z.name} className={`flex items-start gap-2 border p-2 ${hot ? 'border-red-400/40 bg-red-400/5' : 'border-[#1b2733]'}`}>
                    <span className="mt-1 h-2.5 w-2.5 shrink-0" style={{ background: z.color, boxShadow: `0 0 8px ${z.color}` }} />
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.14em]" style={{ color: z.color }}>{z.name}</div>
                      <div className="text-[10px] text-[#7d92a5]">{z.note}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* middle: approval workflow */}
        <div className="panel panel-corner p-4">
          <div className="hud-label mb-3">Human-in-the-loop approval workflow</div>
          <div className="space-y-0">
            {[
              { key: 'ai', label: 'AI analysis', desc: 'ML engine detects bearing anomaly, predicts failure in ~2 h' },
              { key: 'rec', label: 'Recommended action', desc: 'LOTO bearing replacement at M-04, immediate window' },
              { key: 'review', label: 'Human review', desc: 'Operator evaluates AI reasoning and scenario data' },
              { key: 'approval', label: 'Human approval', desc: 'Shift supervisor authorizes the intervention plan' },
              { key: 'action', label: 'Maintenance action', desc: 'Crew executes under lockout-tagout; twin tracks state' },
            ].map((step, i) => {
              const idx = ['ai', 'rec', 'review', 'approval', 'action'].indexOf(step.key)
              const done =
                (idx <= 2) ||
                (idx === 3 && (approval === 'approved' || approval === 'in_progress' || approval === 'complete')) ||
                (idx === 4 && approval === 'complete')
              const activeNow =
                (idx === 3 && approval === 'pending') ||
                (idx === 4 && approval === 'approved')
              const color = done ? '#34d399' : activeNow ? '#38bdf8' : '#46586a'
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="grid h-5 w-5 place-items-center border text-[9px] font-bold" style={{ borderColor: color, color }}>
                      {done ? '✓' : i + 1}
                    </span>
                    {i < 4 && <span className="w-px flex-1" style={{ background: color, opacity: 0.35 }} />}
                  </div>
                  <div className="pb-4">
                    <div className="text-[12px] font-semibold" style={{ color }}>{step.label}</div>
                    <div className="text-[10px] text-[#7d92a5]">{step.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* approval actions */}
          <div className="mt-2 flex flex-wrap gap-2 border-t border-[#1b2733] pt-3">
            {approval === 'pending' && (
              <button className="hud-btn hud-btn-primary sweep" onClick={recordApproval}>
                <span className="flex items-center gap-2"><UserCheck size={13} /> Approve Intervention Plan</span>
              </button>
            )}
            {approval === 'approved' && (
              <button className="hud-btn hud-btn-primary" onClick={startMaintenance}>
                <span className="flex items-center gap-2"><PlayCircle size={13} /> Begin LOTO Maintenance</span>
              </button>
            )}
            {approval === 'in_progress' && (
              <>
                <Chip color="#38bdf8">● Maintenance in progress — LOTO active</Chip>
                <button className="hud-btn hud-btn-primary" onClick={completeMaintenance}>
                  <span className="flex items-center gap-2"><CheckCircle2 size={13} /> Complete Maintenance</span>
                </button>
              </>
            )}
            {approval === 'complete' && (
              <div className="flex items-center gap-2 text-[12px] text-[#34d399]">
                <CheckCircle2 size={14} /> M-04 restored to production. Risk 5%. Safety score 97.
              </div>
            )}
          </div>
        </div>

        {/* right: exposure model */}
        <div className="panel panel-corner p-4">
          <div className="hud-label mb-3">Exposure model</div>
          <div className="space-y-3">
            {[
              { label: 'Proximity risk', value: m04?.state === 'normal' ? 12 : 44, color: '#f87171' },
              { label: 'Vibration exposure', value: m04?.state === 'normal' ? 8 : 61, color: '#fbbf24' },
              { label: 'Noise level', value: 31, color: '#38bdf8' },
              { label: 'Emergency egress', value: 95, color: '#34d399' },
            ].map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-[9px] tracking-[0.14em] uppercase">
                  <span className="text-[#7d92a5]">{r.label}</span>
                  <span className="tabular-nums" style={{ color: r.color }}>{r.value}</span>
                </div>
                <Bar value={r.value} color={r.color} />
              </div>
            ))}
          </div>
          <div className="mt-4 border border-[#1b2733] bg-[#0a1017]/80 p-2.5 text-[10px] leading-relaxed text-[#7d92a5]">
            <Lock size={11} className="mb-1 inline text-sky-400" /> Zone radii derive from the active risk
            state. A high-risk asset expands the restricted zone and lowers the safety score until the
            intervention is approved and executed.
          </div>
        </div>
      </div>
    </motion.div>
  )
}
