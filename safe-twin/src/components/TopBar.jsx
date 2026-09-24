/** TopBar — industrial operations header with live system status. */

import { Activity, Server, Database, Globe, BrainCircuit, Boxes } from 'lucide-react'
import { useStore } from '../store/useStore.js'

const SERVICE_ICONS = {
  frontend: Globe,
  backend: Server,
  ml: BrainCircuit,
  twin: Boxes,
  database: Database,
}

export default function TopBar() {
  const status = useStore((s) => s.status)
  const clock = useStore((s) => s.clock)
  const time = clock.toTimeString().slice(0, 8)

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#1b2733] bg-[#070b11]/90 px-4 backdrop-blur">
      {/* left: identity */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center border border-sky-400/40 bg-sky-400/10">
            <Activity size={15} className="text-sky-400" />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold tracking-[0.22em] text-[#e8f1f8]">
              SAFE<span className="text-sky-400">-TWIN</span>
            </div>
            <div className="hidden text-[9px] tracking-[0.18em] text-[#7d92a5] uppercase sm:block">
              AI Failure Cascade &amp; Safe Maintenance Planning
            </div>
          </div>
        </div>
      </div>

      {/* right: operator + system status */}
      <div className="flex items-center gap-5">
        {/* operator */}
        <div className="hidden md:flex items-center gap-2 border border-[#1b2733] px-2.5 py-1">
          <div className="grid h-5 w-5 place-items-center bg-[#13202c] text-[9px] font-bold text-sky-400">OP</div>
          <div className="leading-none">
            <div className="text-[10px] text-[#e8f1f8]">Operator</div>
            <div className="text-[8px] tracking-[0.14em] text-[#7d92a5] uppercase">Shift B · Kowalski</div>
          </div>
        </div>

        {/* system status cluster */}
        <div className="hidden lg:flex items-center gap-3 border border-[#1b2733] bg-[#0a1017]/70 px-3 py-1.5">
          <span className="hud-label">System Status</span>
          {status.map((svc) => {
            const Icon = SERVICE_ICONS[svc.key] ?? Activity
            const online = svc.status === 'online'
            return (
              <div key={svc.key} className="flex items-center gap-1.5" title={`${svc.label} · ${svc.latencyMs} ms`}>
                <Icon size={11} className="text-[#46586a]" />
                <span className="text-[9px] tracking-[0.1em] text-[#7d92a5] uppercase">{svc.label}</span>
                <span className={`pulse-dot ${online ? '' : 'bg-red-400'}`} style={{ background: online ? '#34d399' : '#f87171', color: online ? '#34d399' : '#f87171' }} />
              </div>
            )
          })}
        </div>

        {/* sync clock */}
        <div className="hidden xl:block text-right leading-tight">
          <div className="hud-label">Last sync</div>
          <div className="text-[11px] tabular-nums text-sky-300">{time}</div>
        </div>
        <div className="pulse-dot" style={{ background: '#34d399', color: '#34d399' }} />
      </div>
    </header>
  )
}
