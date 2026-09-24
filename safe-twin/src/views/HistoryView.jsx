/** HistoryView — interactive animated ops timeline. */

import { motion } from 'motion/react'
import { History, AlertTriangle, Brain, Network, Wrench, UserCheck, CircleCheck, CircleAlert, Info } from 'lucide-react'
import { useStore, selectMachine } from '../store/useStore.js'
import { Chip } from '../components/ui.jsx'

const KIND_META = {
  warning:  { icon: AlertTriangle, color: '#fbbf24' },
  critical: { icon: CircleAlert,    color: '#f87171' },
  info:     { icon: Info,           color: '#38bdf8' },
  success:  { icon: CircleCheck,    color: '#34d399' },
  approval: { icon: UserCheck,      color: '#22d3ee' },
}

export default function HistoryView() {
  const history = useStore((s) => s.history)
  const approval = useStore((s) => s.approval)

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
          <History size={14} className="text-sky-400" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.16em] text-[#e8f1f8]">OPERATIONS HISTORY</div>
            <div className="text-[10px] text-[#7d92a5]">Incidents · predictions · cascade analyses · interventions · approvals</div>
          </div>
        </div>
        <div className="hud-label">{history.length} events · shift B</div>
      </div>

      {/* timeline */}
      <div className="panel panel-corner grid-bg min-h-0 overflow-y-auto p-5">
        <div className="relative mx-auto max-w-3xl">
          <div className="absolute top-0 bottom-0 left-[15px] w-px bg-gradient-to-b from-sky-400/40 via-[#243444] to-transparent" />
          {history.map((ev, i) => {
            const meta = KIND_META[ev.kind] ?? KIND_META.info
            const Icon = meta.icon
            return (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: Math.min(i * 0.08, 0.6), duration: 0.45 }}
                className="group relative mb-4 flex cursor-pointer gap-4 pl-0"
                onClick={() => ev.machineId && selectMachine(ev.machineId)}
              >
                <div
                  className="relative z-10 grid h-8 w-8 shrink-0 place-items-center border bg-[#0d141d]"
                  style={{ borderColor: `${meta.color}66`, boxShadow: `0 0 12px ${meta.color}33` }}
                >
                  <Icon size={14} style={{ color: meta.color }} />
                </div>
                <div className={`panel flex-1 p-3 transition-colors group-hover:border-sky-400/40 ${ev.machineId ? '' : 'cursor-default'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold tabular-nums text-[#e8f1f8]">{ev.time}</span>
                      <span className="text-[12px] text-[#e8f1f8]">{ev.title}</span>
                      {ev.machineId && <Chip color={meta.color}>{ev.machineId}</Chip>}
                    </div>
                    <span className="hud-label">{ev.kind}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#7d92a5]">{ev.detail}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
