/** RiskCards — four live operational monitoring cards over the twin. */

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Cpu, AlertTriangle, Network, HardHat, ChevronRight } from 'lucide-react'
import { useStore, selectMachine, closeMachine, analyzeCascade, navigate } from '../store/useStore.js'
import { StatusDot, Chip, STATE_COLORS, STATE_LABELS, AnimatedNumber, Bar } from './ui.jsx'

function CardShell({ icon: Icon, title, sub, active, onClick, children, accent = '#38bdf8' }) {
  return (
    <motion.div
      layout
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`panel panel-corner cursor-pointer p-3 transition-colors ${active ? 'border-sky-400/60' : 'hover:border-[#243444]'}`}
      style={active ? { boxShadow: '0 0 30px rgba(56,189,248,0.12)' } : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: accent }} />
          <div>
            <div className="hud-label">{title}</div>
            <div className="text-[11px] text-[#7d92a5]">{sub}</div>
          </div>
        </div>
        <ChevronRight size={12} className="text-[#46586a]" />
      </div>
      {children}
    </motion.div>
  )
}

export default function RiskCards() {
  const machines = useStore((s) => s.machines)
  const selectedId = useStore((s) => s.selectedId)
  const [openOverview, setOpenOverview] = useState(false)

  const m04 = machines.find((m) => m.id === 'M-04')
  const m03 = machines.find((m) => m.id === 'M-03')
  const overviewMachines = ['M-02', 'M-03', 'M-04', 'M-05'].map((id) => machines.find((m) => m.id === id)).filter(Boolean)

  return (
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
      {/* 1 — machines monitored */}
      <CardShell
        icon={Cpu}
        title="Machines Monitored"
        sub="Production Cell"
        active={openOverview}
        onClick={() => setOpenOverview((v) => !v)}
      >
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums text-[#e8f1f8]">{machines.length || '—'}</span>
          <span className="text-[10px] text-[#7d92a5]">assets streaming</span>
        </div>
        <AnimatePresence>
          {openOverview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 border-t border-[#1b2733] pt-2">
                {overviewMachines.map((m) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); selectMachine(m.id) }}
                    className="flex w-full items-center justify-between px-1 py-1 text-left hover:bg-sky-400/5"
                  >
                    <span className="text-[11px] text-[#e8f1f8]">{m.id} <span className="text-[#7d92a5]">{m.name}</span></span>
                    <span className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase" style={{ color: STATE_COLORS[m.state] }}>
                      <StatusDot state={m.state} size={5} />
                      {m.state === 'normal' ? 'Normal' : m.state === 'warning' ? 'Medium' : STATE_LABELS[m.state]}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardShell>

      {/* 2 — high-risk asset */}
      <CardShell
        icon={AlertTriangle}
        title="High-Risk Assets"
        sub={m04 ? 'Bearing failure' : '—'}
        accent="#f87171"
        active={selectedId === 'M-04'}
        onClick={() => (selectedId === 'M-04' ? closeMachine() : selectMachine('M-04'))}
      >
        {m04 && (
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-[#e8f1f8]">{m04.id}</div>
              <div className="text-[10px] text-[#f87171]">{m04.predicts[0]}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-glow-crit text-[#f87171]">
                <AnimatedNumber value={m04.risk} suffix="%" />
              </div>
              <div className="hud-label">Risk</div>
            </div>
          </div>
        )}
        <div className="mt-2"><Bar value={m04?.risk ?? 0} color="#f87171" /></div>
        <div className="mt-1.5 text-[9px] tracking-[0.14em] text-[#46586a] uppercase">
          {selectedId === 'M-04' ? '◉ Linked to M-04 in twin' : 'Click to locate M-04'}
        </div>
      </CardShell>

      {/* 3 — cascade risk */}
      <CardShell
        icon={Network}
        title="Cascade Risk"
        sub="Trigger: M-04 Motor"
        accent="#fbbf24"
        onClick={() => navigate('cascade')}
      >
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div>
            <div className="text-base font-bold tabular-nums text-[#fbbf24]">68%</div>
            <div className="hud-label !text-[8px]">Prod. impact</div>
          </div>
          <div>
            <div className="text-base font-bold tabular-nums text-[#e8f1f8]">4</div>
            <div className="hud-label !text-[8px]">Assets hit</div>
          </div>
          <div>
            <div className="text-base font-bold tabular-nums text-[#f87171]">HIGH</div>
            <div className="hud-label !text-[8px]">Severity</div>
          </div>
        </div>
      </CardShell>

      {/* 4 — worker exposure */}
      <CardShell
        icon={HardHat}
        title="Worker Exposure"
        sub="Cell B perimeter"
        accent="#34d399"
        onClick={() => navigate('safety')}
      >
        <div className="mt-2 flex items-end justify-between">
          <div>
            <Chip color="#34d399">● Low</Chip>
            <div className="mt-1 max-w-[150px] text-[9px] leading-snug text-[#46586a]">
              No active intervention — continuous monitoring
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-[#34d399]">82<span className="text-xs text-[#7d92a5]">/100</span></div>
            <div className="hud-label">Safety score</div>
          </div>
        </div>
      </CardShell>
    </div>
  )
}
