/** ScenariosView — compare maintenance interventions; factory state follows selection. */

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { GitCompareArrows, Check, Clock, ShieldAlert, RotateCcw } from 'lucide-react'
import { useStore, applyScenario, clearScenario } from '../store/useStore.js'
import { fetchScenarios } from '../services/api.js'
import { Chip, Bar, AnimatedNumber, STATE_COLORS } from '../components/ui.jsx'

const DIMENSIONS = [
  { key: 'failureRisk', label: 'Failure risk', max: 100, invert: true, color: '#f87171' },
  { key: 'cascadeRisk', label: 'Cascade risk', max: 100, invert: true, color: '#fb923c' },
  { key: 'productionImpact', label: 'Production impact', max: 100, invert: true, color: '#fbbf24' },
  { key: 'workerExposure', label: 'Worker exposure', max: 100, invert: true, color: '#38bdf8' },
  { key: 'safetyScore', label: 'Safety score', max: 100, invert: false, color: '#34d399' },
]

export default function ScenariosView() {
  const activeScenario = useStore((s) => s.activeScenario)
  const scenarioMode = useStore((s) => s.scenarioMode)
  const [scenarios, setScenarios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScenarios('M-04').then((s) => { setScenarios(s); setLoading(false) })
  }, [])

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
          <GitCompareArrows size={14} className="text-sky-400" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.16em] text-[#e8f1f8]">MAINTENANCE SCENARIOS — M-04</div>
            <div className="text-[10px] text-[#7d92a5]">
              Intervention options evaluated by the planning engine · factory twin reacts to your selection
            </div>
          </div>
        </div>
        {scenarioMode !== 'baseline' && (
          <button className="hud-btn" onClick={clearScenario}>
            <span className="flex items-center gap-2"><RotateCcw size={12} /> Back to baseline</span>
          </button>
        )}
      </div>

      {/* scenario columns */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {loading && <div className="hud-label">Loading scenarios…</div>}
        {scenarios.map((s) => {
          const active = scenarioMode === s.id
          return (
            <motion.button
              key={s.id}
              layout
              onClick={() => applyScenario(s.id)}
              whileHover={{ y: -3 }}
              className={`panel panel-corner p-4 text-left transition-shadow ${active ? 'border-sky-400/70' : ''}`}
              style={active ? { boxShadow: '0 0 34px rgba(56,189,248,0.15)' } : undefined}
            >
              {/* title */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tracking-[0.1em] text-[#e8f1f8]">{s.name}</span>
                    {s.recommended && <Chip color="#34d399">AI recommended</Chip>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#7d92a5]">
                    <Clock size={10} /> {s.tagline} · {s.durationHours}
                  </div>
                </div>
                {active && <Check size={15} className="text-sky-400" />}
              </div>

              {/* animated comparison bars */}
              <div className="mt-4 space-y-2.5">
                {DIMENSIONS.map((d) => (
                  <div key={d.key}>
                    <div className="mb-0.5 flex justify-between text-[9px] tracking-[0.14em] uppercase">
                      <span className="text-[#7d92a5]">{d.label}</span>
                      <span className="tabular-nums" style={{ color: d.color }}>
                        {s[d.key]}{d.key === 'safetyScore' ? '/100' : '%'}
                      </span>
                    </div>
                    <Bar value={s[d.key]} color={d.color} height={5} />
                  </div>
                ))}
              </div>

              {/* safety implications */}
              <div className="mt-4 border-t border-[#1b2733] pt-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={12} style={{ color: s.safetyImplication === 'Low' ? '#34d399' : s.safetyImplication === 'Medium' ? '#fbbf24' : '#f87171' }} />
                  <span className="hud-label">Safety implication</span>
                  <Chip color={s.safetyImplication === 'Low' ? '#34d399' : s.safetyImplication === 'Medium' ? '#fbbf24' : '#f87171'}>
                    {s.safetyImplication}
                  </Chip>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[#7d92a5]">{s.safetyNote}</p>
                <p className="mt-2 border-l-2 border-sky-400/40 pl-2 text-[11px] leading-relaxed text-[#9fb3c8]">
                  {s.recommendation}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </motion.div>
  )
}
