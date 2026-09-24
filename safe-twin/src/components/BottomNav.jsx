/** BottomNav — primary view navigation, industrial HUD style. */

import { Activity, Waves, GitBranch, GitCompareArrows, ShieldCheck, History } from 'lucide-react'
import { useStore, navigate } from '../store/useStore.js'

const ITEMS = [
  { id: 'telemetry', label: 'Telemetry', icon: Waves },
  { id: 'cascade', label: 'Cascade', icon: GitBranch },
  { id: 'scenarios', label: 'Scenarios', icon: GitCompareArrows },
  { id: 'safety', label: 'Safety', icon: ShieldCheck },
  { id: 'history', label: 'History', icon: History },
]

export default function BottomNav() {
  const view = useStore((s) => s.view)

  return (
    <nav className="relative z-30 flex h-14 shrink-0 items-center justify-center gap-1 border-t border-[#1b2733] bg-[#070b11]/92 px-3 backdrop-blur">
      <button
        onClick={() => navigate('twin')}
        className={`hud-btn flex items-center gap-2 !border-transparent !bg-transparent ${view === 'twin' ? '!text-sky-300' : 'text-[#7d92a5]'}`}
        title="Digital twin overview"
      >
        <Activity size={13} />
        <span className="hidden sm:inline">Twin</span>
      </button>
      <div className="h-5 w-px bg-[#1b2733]" />
      {ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`hud-btn relative flex items-center gap-2 !border-transparent !bg-transparent ${active ? '!text-sky-300' : 'text-[#7d92a5]'}`}
          >
            <Icon size={13} />
            <span className="hidden sm:inline">{label}</span>
            {active && <span className="absolute -bottom-[13px] left-2 right-2 h-px bg-sky-400" style={{ boxShadow: '0 0 8px #38bdf8' }} />}
          </button>
        )
      })}
    </nav>
  )
}
