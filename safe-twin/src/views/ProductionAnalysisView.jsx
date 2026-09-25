/** ProductionAnalysisView — "Can the factory complete this order in time?" + what-if simulation. */

import { useEffect, useMemo, useState } from 'react'
import { Factory, Play, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Settings2 } from 'lucide-react'
import { analyzeProduction, fetchProductionParams } from '../services/schedulingApi.js'
import { MACHINES } from '../data/mockData.js'
import { useStore } from '../store/useStore.js'

const VERDICT_STYLE = {
  'CAPACITY AVAILABLE': { icon: CheckCircle2, fg: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.5)' },
  'CAPACITY AVAILABLE WITH ADJUSTMENTS': { icon: AlertTriangle, fg: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.5)' },
  'CAPACITY INSUFFICIENT': { icon: XCircle, fg: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.55)' },
}

export default function ProductionAnalysisView() {
  const machines = useStore((s) => s.machines)
  const [params, setParams] = useState({ defaults: {}, overrides: {} })
  const [order, setOrder] = useState({ quantity: 1000, productType: 'units', startTime: '13:00', deadline: '17:00' })
  const [selected, setSelected] = useState([])          // empty = entire line
  const [speedOverrides, setSpeedOverrides] = useState({})
  const [tempOverrides, setTempOverrides] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { fetchProductionParams().then(setParams).catch(() => {}) }, [])

  const kindParams = (m) => ({ ...(params.defaults[m.kind] ?? {}), ...(params.overrides[m.kind] ?? {}) })

  const analyze = async () => {
    setBusy(true)
    try {
      const payload = {
        quantity: Number(order.quantity) || 0,
        startTime: order.startTime, deadline: order.deadline, productType: order.productType,
        machineIds: selected.length ? selected : null,
        speedOverrides: Object.keys(speedOverrides).length ? speedOverrides : null,
        tempOverrides: Object.keys(tempOverrides).length ? tempOverrides : null,
      }
      setResult(await analyzeProduction(payload))
    } finally {
      setBusy(false)
    }
  }

  const machineRows = useMemo(() => {
    const ids = selected.length ? selected : machines.map((m) => m.id)
    return ids.map((id) => machines.find((m) => m.id === id)).filter(Boolean)
  }, [machines, selected])

  const vStyle = result ? (VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE['CAPACITY INSUFFICIENT']) : null
  const VerdictIcon = vStyle?.icon ?? CheckCircle2

  return (
    <div className="grid-bg h-full overflow-y-auto pr-1">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-[0.22em] text-[#e8f1f8]">
          <Factory size={15} className="text-sky-400" /> PRODUCTION ANALYSIS
        </h2>
        <div className="hud-label mt-0.5">Can the factory complete this order within the required deadline?</div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[380px_1fr]">
        {/* ── left: order + machines + what-if ── */}
        <div className="space-y-3">
          {/* order info */}
          <div className="panel panel-corner p-3">
            <div className="hud-label mb-2">Order Information</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="hud-label">REQUIRED QUANTITY
                <input type="number" min="1" value={order.quantity}
                  onChange={(e) => setOrder({ ...order, quantity: e.target.value })}
                  className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[12px] tabular-nums text-[#e8f1f8] outline-none focus:border-sky-500" />
              </label>
              <label className="hud-label">PRODUCT TYPE
                <input value={order.productType}
                  onChange={(e) => setOrder({ ...order, productType: e.target.value })}
                  className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[12px] text-[#e8f1f8] outline-none focus:border-sky-500" />
              </label>
              <label className="hud-label">START TIME
                <input type="time" value={order.startTime}
                  onChange={(e) => setOrder({ ...order, startTime: e.target.value })}
                  className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[12px] text-[#e8f1f8] outline-none focus:border-sky-500" />
              </label>
              <label className="hud-label">DEADLINE
                <input type="time" value={order.deadline}
                  onChange={(e) => setOrder({ ...order, deadline: e.target.value })}
                  className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[12px] text-[#e8f1f8] outline-none focus:border-sky-500" />
              </label>
            </div>
          </div>

          {/* machine selection */}
          <div className="panel panel-corner p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="hud-label">Machine Selection</div>
              <div className="flex gap-2 text-[10px] tracking-[0.1em]">
                <button className="text-sky-400 hover:text-sky-300" onClick={() => setSelected(machines.map((m) => m.id))}>SELECT ALL</button>
                <span className="text-[#243444]">|</span>
                <button className="text-[#7d92a5] hover:text-[#aebccb]" onClick={() => setSelected([])}>ENTIRE LINE</button>
              </div>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
              {machines.map((m) => {
                const p = kindParams(m)
                const on = selected.includes(m.id)
                return (
                  <label key={m.id}
                    className={`flex cursor-pointer items-center justify-between border px-2 py-1.5 text-[11px] transition-colors ${on ? 'border-sky-500/60 bg-sky-500/5' : 'border-[#1b2733] hover:border-[#243444]'}`}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={on}
                        onChange={() => setSelected(on ? selected.filter((x) => x !== m.id) : [...selected, m.id])}
                        className="accent-sky-500" />
                      <span className="font-bold text-[#e8f1f8]">{m.id}</span>
                      <span className="text-[#7d92a5]">{m.name}</span>
                    </span>
                    <span className="text-[10px] tabular-nums text-[#46586a]">
                      {p.unitsPerHour ?? '—'} u/h · {Math.round((p.efficiency ?? 0) * 100)}% eff
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-1.5 text-[10px] text-[#46586a]">
              {selected.length ? `${selected.length} machine(s) selected` : 'All machines will be used (entire line)'}
            </div>
          </div>

          {/* what-if */}
          <div className="panel panel-corner p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="hud-label flex items-center gap-1.5"><Settings2 size={11} /> What-If Simulation</div>
              <button className="text-[10px] tracking-[0.1em] text-[#7d92a5] hover:text-[#aebccb]"
                onClick={() => { setSpeedOverrides({}); setTempOverrides({}) }}>
                <RotateCcw size={10} className="mr-1 inline" />RESET
              </button>
            </div>
            <div className="space-y-2">
              {machineRows.map((m) => {
                const p = kindParams(m)
                return (
                  <div key={m.id} className="border border-[#131c26] px-2 py-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-[#e8f1f8]">{m.id}</span>
                      <span className="text-[10px] text-[#46586a]">safe ≤ {p.maxSafeTempC}°C</span>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      <label className="hud-label">SPEED (u/h)
                        <input type="number" min="0" value={speedOverrides[m.id] ?? p.unitsPerHour ?? ''}
                          onChange={(e) => setSpeedOverrides({ ...speedOverrides, [m.id]: Number(e.target.value) })}
                          className="mt-0.5 w-full border border-[#243444] bg-[#0d141d] px-1.5 py-1 text-[11px] tabular-nums text-[#e8f1f8] outline-none focus:border-sky-500" />
                      </label>
                      <label className="hud-label">TEMP (°C)
                        <input type="number" min="0" value={tempOverrides[m.id] ?? ''}
                          placeholder="nominal"
                          onChange={(e) => {
                            const v = e.target.value === '' ? null : Number(e.target.value)
                            const next = { ...tempOverrides }
                            if (v == null) delete next[m.id]
                            else next[m.id] = v
                            setTempOverrides(next)
                          }}
                          className="mt-0.5 w-full border border-[#243444] bg-[#0d141d] px-1.5 py-1 text-[11px] tabular-nums text-[#e8f1f8] outline-none focus:border-sky-500" />
                      </label>
                    </div>
                    {tempOverrides[m.id] != null && p.maxSafeTempC != null && tempOverrides[m.id] > p.maxSafeTempC && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-[#f87171]">
                        <AlertTriangle size={10} /> UNSAFE OPERATING CONDITION — exceeds configured safe limit ({p.maxSafeTempC}°C)
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <button onClick={analyze} disabled={busy}
              className="hud-btn hud-btn-primary mt-3 flex w-full items-center justify-center gap-2">
              <Play size={12} /> {busy ? 'ANALYZING…' : 'ANALYZE CAPACITY'}
            </button>
          </div>
        </div>

        {/* ── right: result ── */}
        <div className="space-y-3">
          {!result && (
            <div className="panel panel-corner grid place-items-center p-10 text-center">
              <div>
                <Factory size={36} className="mx-auto mb-3 text-[#243444]" />
                <div className="text-[12px] text-[#46586a]">Enter an order and run the analysis.<br />The engine combines machine rate × availability × efficiency × time window.</div>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* verdict banner */}
              <div className="panel-corner p-4" style={{ background: vStyle.bg, border: `1px solid ${vStyle.border}` }}>
                <div className="flex items-center gap-3">
                  <VerdictIcon size={30} style={{ color: vStyle.fg }} />
                  <div>
                    <div className="text-lg font-bold tracking-[0.14em]" style={{ color: vStyle.fg }}>
                      {result.verdict === 'CAPACITY AVAILABLE' ? '✓ CAPACITY AVAILABLE' :
                       result.verdict === 'CAPACITY AVAILABLE WITH ADJUSTMENTS' ? '⚠ CAPACITY AVAILABLE — WITH ADJUSTMENTS' :
                       '✕ CAPACITY INSUFFICIENT'}
                    </div>
                    <div className="text-[11px] text-[#7d92a5]">
                      Order of {result.requiredQuantity} {result.productType} · window {result.windowHours} h
                      {result.estCompletion && <> · estimated completion {result.estCompletion}</>}
                    </div>
                  </div>
                </div>
                {result.unsafeConditions?.length > 0 && (
                  <div className="mt-2 border border-[#f87171]/50 bg-[#f87171]/5 px-2 py-1.5 text-[10px] text-[#f87171]">
                    ⚠ UNSAFE OPERATING CONDITION — temperature request exceeds the configured safe operating limit and was clamped for calculation.
                  </div>
                )}
              </div>

              {/* numbers */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  { label: 'Required', v: result.requiredQuantity, c: '#e8f1f8' },
                  { label: 'Expected Output', v: result.expectedQuantity, c: '#34d399' },
                  { label: result.shortfall > 0 ? 'Shortfall' : 'Remaining Capacity', v: result.shortfall > 0 ? result.shortfall : result.remainingCapacity, c: result.shortfall > 0 ? '#f87171' : '#38bdf8' },
                  { label: 'Capacity Utilization', v: `${result.utilizationPct}%`, c: result.utilizationPct > 92 ? '#fbbf24' : '#e8f1f8' },
                ].map((s) => (
                  <div key={s.label} className="panel px-3 py-2">
                    <div className="text-xl font-bold tabular-nums" style={{ color: s.c }}>{s.v}</div>
                    <div className="hud-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* machine breakdown */}
              <div className="panel panel-corner overflow-x-auto p-3">
                <div className="hud-label mb-2">Capacity per machine — rate × availability × efficiency × window</div>
                <table className="w-full min-w-[520px] text-left text-[11px]">
                  <thead>
                    <tr className="hud-label border-b border-[#1b2733]">
                      <th className="py-1.5 pr-3">Machine</th>
                      <th className="py-1.5 pr-3">Rate</th>
                      <th className="py-1.5 pr-3">Avail.</th>
                      <th className="py-1.5 pr-3">Eff.</th>
                      <th className="py-1.5 pr-3">Risk</th>
                      <th className="py-1.5 pr-3">Capacity</th>
                      <th className="py-1.5">Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.machines.map((m) => (
                      <tr key={m.machineId} className="border-b border-[#131c26] text-[#aebccb]">
                        <td className="py-2 pr-3 font-bold text-[#e8f1f8]">{m.machineId}<span className="ml-1.5 font-normal text-[#7d92a5]">{m.kind}</span></td>
                        <td className="py-2 pr-3 tabular-nums">{m.unitsPerHour} u/h</td>
                        <td className="py-2 pr-3 tabular-nums">{Math.round(m.availability * 100)}%</td>
                        <td className="py-2 pr-3 tabular-nums">{Math.round(m.efficiency * 100)}%</td>
                        <td className="py-2 pr-3 tabular-nums" style={{ color: m.risk > 50 ? '#f87171' : m.risk > 30 ? '#fbbf24' : '#34d399' }}>{m.risk}%</td>
                        <td className="py-2 pr-3 font-bold tabular-nums text-[#e8f1f8]">{m.capacityUnits}</td>
                        <td className="py-2 tabular-nums text-[#7d92a5]">
                          {m.tempRequestedC != null ? `${m.tempRequestedC}°C${m.thermalDerated ? ' ⚠ derated' : ''}` : 'nominal'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* constraints */}
              {result.constraints?.length > 0 && (
                <div className="panel panel-corner p-3">
                  <div className="hud-label mb-1.5">Main Constraints</div>
                  <ul className="space-y-1 text-[11px] text-[#aebccb]">
                    {result.constraints.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber-400" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* alternatives */}
              {result.alternatives?.length > 0 && (
                <div className="panel panel-corner p-3">
                  <div className="hud-label mb-1.5">Possible Operational Alternatives <span className="text-[#46586a]">(not applied automatically)</span></div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {result.alternatives.map((a, i) => (
                      <div key={i} className="border border-[#1b2733] px-2.5 py-2">
                        <div className="text-[11px] font-bold text-sky-300">{a.option}</div>
                        <div className="mt-0.5 text-[10px] text-[#7d92a5]">{a.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
