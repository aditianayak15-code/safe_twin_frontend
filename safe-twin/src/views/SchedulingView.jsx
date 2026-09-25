/** SchedulingView — Today's Production Schedule, live timeline, scheduling alerts. */

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, AlertTriangle, Plus, CheckCircle2 } from 'lucide-react'
import { fetchSchedules, addSchedule, completeSchedule, fetchSchedulingAlerts } from '../services/schedulingApi.js'
import { MACHINES } from '../data/mockData.js'

const STATUS_COLORS = {
  'ON SCHEDULE': { fg: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.45)' },
  'UPCOMING': { fg: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.4)' },
  'START DELAY': { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.45)' },
  'RUNNING LATE': { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.45)' },
  'STOP DELAY': { fg: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.45)' },
  'MISSED': { fg: '#f87171', bg: 'rgba(248,113,113,0.14)', border: 'rgba(248,113,113,0.5)' },
  'COMPLETED': { fg: '#7d92a5', bg: 'rgba(125,146,165,0.1)', border: 'rgba(125,146,165,0.35)' },
}

const toMin = (hms) => { const [h, m] = hms.split(':').map(Number); return h * 60 + m }
const DAY_START = 5 * 60   // 05:00
const DAY_END = 20 * 60    // 20:00

function StatusChip({ status }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.UPCOMING
  return (
    <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-[0.12em]"
      style={{ color: c.fg, background: c.bg, border: `1px solid ${c.border}` }}>
      {status}
    </span>
  )
}

/** Gantt-style timeline: scheduled bar + actual overlay + now cursor. */
function ScheduleTimeline({ jobs }) {
  const [now, setNow] = useState(toMin(new Date().toTimeString().slice(0, 5)))
  useEffect(() => {
    const t = setInterval(() => setNow(toMin(new Date().toTimeString().slice(0, 5))), 15000)
    return () => clearInterval(t)
  }, [])
  const span = DAY_END - DAY_START
  const pct = (min) => ((min - DAY_START) / span) * 100

  return (
    <div className="panel panel-corner p-3">
      <div className="hud-label mb-2 flex items-center justify-between">
        <span>Live schedule timeline — scheduled vs actual</span>
        <span className="text-[#7d92a5]">now {String(Math.floor(now / 60)).padStart(2, '0')}:{String(now % 60).padStart(2, '0')}</span>
      </div>
      <div className="relative">
        {/* hour ruler */}
        <div className="relative mb-1 h-4">
          {Array.from({ length: 16 }, (_, i) => 5 + i).map((h) => (
            <div key={h} className="absolute text-[9px] text-[#46586a]" style={{ left: `${pct(h * 60)}%` }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        {/* rows */}
        <div className="space-y-1.5">
          {jobs.map((j) => {
            const s = toMin(j.start), e = toMin(j.end)
            const as = j.actualStart ? toMin(j.actualStart) : null
            const ae = j.actualEnd ? toMin(j.actualEnd) : (j.status === 'ON SCHEDULE' || j.status === 'RUNNING LATE' ? now : null)
            const c = STATUS_COLORS[j.status] ?? STATUS_COLORS.UPCOMING
            const machine = MACHINES.find((m) => m.id === j.machineId)
            return (
              <div key={j.id} className="relative h-7" title={`${j.job} — ${j.status}`}>
                {/* track */}
                <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-sm" style={{ background: 'rgba(20,30,42,0.6)' }} />
                {/* scheduled bar */}
                <div className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm"
                  style={{ left: `${pct(s)}%`, width: `${pct(e) - pct(s)}%`, border: `1px dashed ${c.border}`, background: 'transparent' }} />
                {/* actual bar */}
                {as != null && ae != null && (
                  <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm"
                    style={{ left: `${pct(Math.max(as, DAY_START))}%`, width: `${Math.max(0.5, pct(Math.min(ae, DAY_END)) - pct(Math.max(as, DAY_START)))}%`, background: c.fg, opacity: 0.85 }} />
                )}
                {/* now cursor segment */}
                {as == null && now > s && now <= e && (
                  <div className="absolute top-1/2 h-2 -translate-y-1/2 animate-pulse rounded-sm"
                    style={{ left: `${pct(s)}%`, width: `${pct(now) - pct(s)}%`, background: '#f87171', opacity: 0.5 }} />
                )}
                {/* label */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold" style={{ color: c.fg, textShadow: '0 0 4px rgba(0,0,0,0.9)' }}>
                  {j.machineId} · {machine?.name ?? ''}
                </div>
              </div>
            )
          })}
        </div>
        {/* now line */}
        {now >= DAY_START && now <= DAY_END && (
          <div className="pointer-events-none absolute bottom-0 top-4 w-px bg-sky-400" style={{ left: `${pct(now)}%`, boxShadow: '0 0 8px #38bdf8' }} />
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[9px] tracking-[0.14em] text-[#46586a]">
        <span><span className="mr-1 inline-block h-2 w-4 border border-dashed border-sky-700" />SCHEDULED</span>
        <span><span className="mr-1 inline-block h-2 w-4 bg-emerald-400/80" />ACTUAL</span>
        <span><span className="mr-1 inline-block h-2 w-px bg-sky-400" />NOW</span>
      </div>
    </div>
  )
}

export default function SchedulingView() {
  const [jobs, setJobs] = useState([])
  const [alerts, setAlerts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [grace, setGrace] = useState(10)
  const [form, setForm] = useState({ machineId: 'M-01', job: '', start: '14:00', end: '18:00', expectedState: 'RUNNING', quantity: '', priority: 'normal' })

  const load = async () => {
    setJobs(await fetchSchedules())
    setAlerts(await fetchSchedulingAlerts())
  }
  useEffect(() => {
    load()
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [])

  const counts = useMemo(() => {
    const c = { ok: 0, warn: 0, crit: 0, upcoming: 0 }
    for (const j of jobs) {
      if (j.status === 'UPCOMING') c.upcoming++
      else if (j.severity === 'ok') c.ok++
      else if (j.severity === 'critical') c.crit++
      else c.warn++
    }
    return c
  }, [jobs])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.job.trim()) return
    await addSchedule({ ...form, quantity: form.quantity ? Number(form.quantity) : null })
    setShowForm(false)
    setForm({ ...form, job: '', quantity: '' })
    load()
  }

  return (
    <div className="grid-bg h-full overflow-y-auto pr-1">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-[0.22em] text-[#e8f1f8]">
            <CalendarClock size={15} className="text-sky-400" /> SCHEDULING
          </h2>
          <div className="hud-label mt-0.5">Expected machine schedule vs actual activity — live monitoring</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="hud-label flex items-center gap-1">
            GRACE
            <input type="number" min="0" max="120" value={grace}
              onChange={(e) => setGrace(Number(e.target.value) || 0)}
              className="w-14 border border-[#243444] bg-[#0d141d] px-1.5 py-1 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500" />
            <span className="text-[#46586a]">min</span>
          </label>
          <button className="hud-btn hud-btn-primary flex items-center gap-1.5" onClick={() => setShowForm((v) => !v)}>
            <Plus size={12} /> Schedule Job
          </button>
        </div>
      </div>

      {/* summary strip */}
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'On Schedule', v: counts.ok, c: '#34d399' },
          { label: 'Upcoming', v: counts.upcoming, c: '#38bdf8' },
          { label: 'Delays', v: counts.warn, c: '#fbbf24' },
          { label: 'Critical', v: counts.crit, c: '#f87171' },
        ].map((s) => (
          <div key={s.label} className="panel px-3 py-2">
            <div className="text-xl font-bold tabular-nums" style={{ color: s.c }}>{s.v}</div>
            <div className="hud-label">{s.label}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} className="panel panel-corner mb-3 grid grid-cols-2 gap-2 p-3 md:grid-cols-4">
          <label className="hud-label">MACHINE
            <select value={form.machineId} onChange={(e) => setForm({ ...form, machineId: e.target.value })}
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500">
              {MACHINES.map((m) => <option key={m.id} value={m.id}>{m.id} — {m.name}</option>)}
            </select>
          </label>
          <label className="hud-label col-span-2">JOB
            <input value={form.job} onChange={(e) => setForm({ ...form, job: e.target.value })} placeholder="Production/job name"
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500" />
          </label>
          <label className="hud-label">EXPECTED STATE
            <select value={form.expectedState} onChange={(e) => setForm({ ...form, expectedState: e.target.value })}
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500">
              <option>RUNNING</option><option>IDLE</option><option>STOPPED</option>
            </select>
          </label>
          <label className="hud-label">START
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500" />
          </label>
          <label className="hud-label">END
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500" />
          </label>
          <label className="hud-label">QUANTITY
            <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="units (optional)"
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500" />
          </label>
          <label className="hud-label">PRIORITY
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="mt-1 w-full border border-[#243444] bg-[#0d141d] px-2 py-1.5 text-[11px] text-[#e8f1f8] outline-none focus:border-sky-500">
              <option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="critical">critical</option>
            </select>
          </label>
          <div className="col-span-2 flex items-end md:col-span-4">
            <button type="submit" className="hud-btn hud-btn-primary">Add To Schedule</button>
          </div>
        </form>
      )}

      {/* schedule table */}
      <div className="panel panel-corner mb-3 overflow-x-auto p-3">
        <div className="hud-label mb-2">Today's Production Schedule</div>
        <table className="w-full min-w-[640px] text-left text-[11px]">
          <thead>
            <tr className="hud-label border-b border-[#1b2733]">
              <th className="py-1.5 pr-3">Machine</th>
              <th className="py-1.5 pr-3">Job</th>
              <th className="py-1.5 pr-3">Scheduled</th>
              <th className="py-1.5 pr-3">Actual</th>
              <th className="py-1.5 pr-3">Qty</th>
              <th className="py-1.5 pr-3">Priority</th>
              <th className="py-1.5 pr-3">Status</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const machine = MACHINES.find((m) => m.id === j.machineId)
              return (
                <tr key={j.id} className="border-b border-[#131c26] text-[#aebccb]">
                  <td className="py-2 pr-3 font-bold text-[#e8f1f8]">{j.machineId}<span className="ml-1.5 font-normal text-[#7d92a5]">{machine?.name}</span></td>
                  <td className="py-2 pr-3">{j.job}</td>
                  <td className="py-2 pr-3 tabular-nums">{j.start} → {j.end}</td>
                  <td className="py-2 pr-3 tabular-nums text-[#7d92a5]">{j.actualStart ?? '—'} → {j.actualEnd ?? (j.status === 'ON SCHEDULE' ? 'running' : '—')}</td>
                  <td className="py-2 pr-3 tabular-nums">{j.quantity ?? '—'}</td>
                  <td className="py-2 pr-3 text-[#7d92a5]">{j.priority}</td>
                  <td className="py-2 pr-3"><StatusChip status={j.status} /></td>
                  <td className="py-2">
                    {!j.actualEnd && (
                      <button title="Mark completed" className="text-[#46586a] transition-colors hover:text-emerald-400"
                        onClick={async () => { await completeSchedule(j.id); load() }}>
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mb-3">
        <ScheduleTimeline jobs={jobs} />
      </div>

      {/* scheduling alerts */}
      <div className="panel panel-corner p-3">
        <div className="hud-label mb-2 flex items-center gap-1.5">
          <AlertTriangle size={12} className={alerts.length ? 'text-amber-400' : 'text-[#46586a]'} />
          Scheduling Alerts {alerts.length > 0 && <span className="text-amber-400">({alerts.length})</span>}
        </div>
        {alerts.length === 0 ? (
          <div className="py-2 text-[11px] text-[#46586a]">No schedule violations — all machines within expected operating windows.</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="border px-3 py-2 text-[11px]"
                style={{ borderColor: a.severity === 'critical' ? 'rgba(248,113,113,0.5)' : 'rgba(251,191,36,0.45)', background: a.severity === 'critical' ? 'rgba(248,113,113,0.06)' : 'rgba(251,191,36,0.05)' }}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={a.status} />
                  <span className="font-bold text-[#e8f1f8]">{a.machineId}</span>
                  {a.delayMin != null && <span className="text-[#7d92a5]">delay {a.delayMin} min</span>}
                  <span className="text-[#46586a]">{a.scheduledStart}–{a.scheduledEnd} · now {a.now}</span>
                </div>
                <div className="mt-1 text-[#aebccb]">{a.message}</div>
                <div className="mt-0.5 text-[10px] text-sky-300/80">→ {a.recommendedAction}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
