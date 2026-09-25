/**
 * SCHEDULING + PRODUCTION ANALYSIS service calls.
 * Same liveOrMock pattern as api.js: hits the FastAPI backend, falls back to
 * local mock computation so the demo always runs.
 */

import { MACHINES } from '../data/mockData.js'

const API_BASE = import.meta.env?.VITE_API_BASE ?? '/api'

async function api(path, options = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: ctrl.signal,
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    })
    if (!res.ok) throw new Error(`API ${path}: ${res.status}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ── local fallback: same logic as backend, browser-side ──────────────────
const SEED = [
  { id: 's1', machineId: 'M-01', job: 'Infeed batch A14', start: '06:00', end: '14:00', expectedState: 'RUNNING', quantity: 4200, priority: 'normal', actualStart: '06:02', actualEnd: null },
  { id: 's2', machineId: 'M-04', job: 'Line 2 drive — bearing watch', start: '09:00', end: '13:00', expectedState: 'RUNNING', quantity: 1500, priority: 'critical', actualStart: '09:25', actualEnd: null },
  { id: 's3', machineId: 'M-07', job: 'Weld sequence W-77', start: '10:00', end: '15:00', expectedState: 'RUNNING', quantity: 2600, priority: 'high', actualStart: null, actualEnd: null },
  { id: 's4', machineId: 'M-16', job: 'Exit cell packaging', start: '08:00', end: '12:00', expectedState: 'RUNNING', quantity: 3000, priority: 'normal', actualStart: '08:00', actualEnd: '11:52' },
  { id: 's5', machineId: 'M-03', job: 'Compressor idle hold', start: '13:00', end: '17:00', expectedState: 'IDLE', quantity: null, priority: 'low', actualStart: null, actualEnd: null },
]

const PARAMS = {
  conveyor: { unitsPerHour: 900, efficiency: 0.92, maxSafeTempC: 85 },
  pump: { unitsPerHour: 600, efficiency: 0.88, maxSafeTempC: 80 },
  compressor: { unitsPerHour: 450, efficiency: 0.85, maxSafeTempC: 95 },
  motor: { unitsPerHour: 750, efficiency: 0.90, maxSafeTempC: 90 },
  robot: { unitsPerHour: 380, efficiency: 0.86, maxSafeTempC: 70 },
  cell: { unitsPerHour: 1200, efficiency: 0.94, maxSafeTempC: 60 },
}

const toMin = (hms) => { const [h, m] = hms.split(':').map(Number); return h * 60 + m }
const nowHms = () => new Date().toTimeString().slice(0, 8)
const nowMin = () => toMin(nowHms())

function fallbackStatus(job, grace = 10) {
  const s = toMin(job.start), e = toMin(job.end), n = nowMin()
  const running = true
  if (job.actualEnd) return { status: 'COMPLETED', severity: 'ok', delayMin: null, message: null }
  if (n > e + grace) {
    if (running) return { status: 'STOP DELAY', severity: 'warning', delayMin: n - e, message: `Machine ${job.machineId} is still running ${n - e} min after scheduled stop (${job.end}).` }
    if (!job.actualStart) return { status: 'MISSED', severity: 'critical', delayMin: null, message: `Machine ${job.machineId} did not complete scheduled job '${job.job}'.` }
    return { status: 'COMPLETED', severity: 'ok', delayMin: null, message: null }
  }
  if (n >= s) {
    if (job.expectedState === 'RUNNING') {
      if (job.actualStart) {
        const delay = toMin(job.actualStart) - s
        if (delay > grace) return { status: 'RUNNING LATE', severity: 'warning', delayMin: delay, message: `Machine ${job.machineId} started ${delay} min late.` }
        return { status: 'ON SCHEDULE', severity: 'ok', delayMin: Math.max(0, delay), message: null }
      }
      return { status: 'START DELAY', severity: n - s > grace ? 'critical' : 'warning', delayMin: n - s, message: `Machine ${job.machineId} has not started ${n - s} min after scheduled start (${job.start}).` }
    }
    return { status: 'ON SCHEDULE', severity: 'ok', delayMin: 0, message: null }
  }
  return { status: 'UPCOMING', severity: 'info', delayMin: null, message: null }
}

// ── API ────────────────────────────────────────────────────────────────────

export async function fetchSchedules() {
  try {
    return await api('/schedules')
  } catch {
    return SEED.map((j) => ({ ...j, ...fallbackStatus(j), graceMinutes: 10 }))
  }
}

export async function addSchedule(job) {
  try {
    return await api('/schedules', { method: 'POST', body: JSON.stringify(job) })
  } catch {
    const created = { id: `s${Date.now()}`, ...job, actualStart: null, actualEnd: null }
    SEED.push(created)
    return { ok: true, job: created }
  }
}

export async function completeSchedule(id) {
  try {
    return await api(`/schedules/${id}/complete`, { method: 'POST' })
  } catch {
    const j = SEED.find((x) => x.id === id)
    if (j) j.actualEnd = nowHms()
    return { ok: true }
  }
}

export async function fetchSchedulingAlerts() {
  try {
    return await api('/scheduling/alerts')
  } catch {
    return SEED
      .map((j) => ({ job: j, ...fallbackStatus(j) }))
      .filter((x) => x.message)
      .map((x) => ({ id: `sa-${x.job.id}`, machineId: x.job.machineId, job: x.job.job, scheduledStart: x.job.start, scheduledEnd: x.job.end, now: nowHms(), delayMin: x.delayMin, severity: x.severity, status: x.status, message: x.message, recommendedAction: 'Verify machine and adjust schedule' }))
  }
}

export async function analyzeProduction(payload) {
  try {
    return await api('/production/analyze', { method: 'POST', body: JSON.stringify(payload) })
  } catch {
    // browser-side capacity model mirroring the backend
    const ids = payload.machineIds?.length ? payload.machineIds : MACHINES.map((m) => m.id)
    const windowMin = toMin(payload.deadline) - toMin(payload.startTime)
    const hours = windowMin / 60
    let capacity = 0
    const machines = []
    const unsafe = []
    for (const id of ids) {
      const m = MACHINES.find((x) => x.id === id)
      if (!m) continue
      const p = PARAMS[m.kind] ?? PARAMS.pump
      const uph = payload.speedOverrides?.[id] ?? p.unitsPerHour
      let temp = payload.tempOverride?.[id] ?? null
      if (temp != null && temp > p.maxSafeTempC) {
        unsafe.push({ machineId: id, requestedTempC: temp, maxSafeTempC: p.maxSafeTempC })
        temp = p.maxSafeTempC
      }
      const avail = m.state === 'high' ? 0.55 : m.state === 'warning' ? 0.8 : 0.92
      const eff = p.efficiency * (temp != null && temp > 70 ? 0.9 : 1)
      const cap = uph * hours * avail * eff
      capacity += cap
      machines.push({ machineId: id, kind: m.kind, unitsPerHour: uph, efficiency: eff, availability: avail, capacityUnits: Math.round(cap), maxSafeTempC: p.maxSafeTempC })
    }
    const shortfall = Math.max(0, payload.quantity - capacity)
    const utilization = Math.round(Math.min(1, payload.quantity / Math.max(capacity, 1)) * 100)
    let verdict = 'CAPACITY INSUFFICIENT'
    let severity = 'critical'
    if (shortfall <= 0) { verdict = utilization > 92 ? 'CAPACITY AVAILABLE WITH ADJUSTMENTS' : 'CAPACITY AVAILABLE'; severity = utilization > 92 ? 'warning' : 'ok' }
    else if (shortfall / payload.quantity <= 0.3) { verdict = 'CAPACITY AVAILABLE WITH ADJUSTMENTS'; severity = 'warning' }
    const effRate = capacity / hours
    const compMin = effRate > 0 ? Math.round((payload.quantity / effRate) * 60) : null
    const base = toMin(payload.startTime) + (compMin ?? 0)
    const alternatives = shortfall > 0
      ? [
          { option: 'Extend production time', detail: `≈${Math.round(windowMin + (shortfall / Math.max(effRate, 1)) * 60)} min total` },
          { option: 'Add available machines', detail: MACHINES.filter((m) => !ids.includes(m.id)).map((m) => m.id).join(', ') || '—' },
          { option: 'Raise rates within safe limits', detail: '+15% on fastest machines' },
          { option: 'Split production across machines', detail: 'Balance over all compatible assets' },
          { option: 'Reschedule lower-priority jobs', detail: 'Free availability on loaded machines' },
        ]
      : []
    return {
      verdict, severity, requiredQuantity: payload.quantity, expectedQuantity: Math.round(capacity),
      windowHours: Math.round(hours * 100) / 100,
      estCompletion: compMin != null ? `${String(Math.floor(base / 60) % 24).padStart(2, '0')}:${String(base % 60).padStart(2, '0')}` : null,
      capacityUnits: Math.round(capacity), utilizationPct: utilization,
      remainingCapacity: Math.round(Math.max(0, capacity - payload.quantity)), shortfall: Math.round(shortfall),
      machines, constraints: shortfall > 0 ? ['Machine capacity', 'Existing scheduled jobs'] : [],
      alternatives, unsafeConditions: unsafe,
    }
  }
}

export async function fetchProductionParams() {
  try {
    return await api('/production/params')
  } catch {
    return { defaults: PARAMS, overrides: {} }
  }
}
