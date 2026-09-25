/**
 * API SERVICE LAYER — the ONLY module the UI touches for data.
 *
 * LIVE BACKEND: the FastAPI service (backend/main.py) serves machines, telemetry,
 * risk (AI4I 2020 dataset), cascade, scenarios, safety, history, approvals,
 * country climate, technician alerts and speed control. If any call fails
 * (backend down), we automatically fall back to the mock dataset so the demo
 * ALWAYS runs.
 */

import {
  MACHINES, LINKS, CASCADE_NODES, CASCADE_SUMMARY, SCENARIOS,
  HISTORY_SEED, SERVICES_SEED,
} from '../data/mockData.js'
import { seededRandom } from '../utils/math.js'

// ── config ────────────────────────────────────────────────────────────────
export const USE_MOCK = false // real backend is the default; fallback is automatic
const API_BASE = import.meta.env?.VITE_API_BASE ?? '/api'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** fetch with timeout + JSON; throws on network/HTTP errors */
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

/** run a live call, fall back to mock implementation on any failure */
async function liveOrMock(liveFn, mockFn) {
  if (USE_MOCK) return mockFn()
  try {
    return await liveFn()
  } catch (err) {
    console.warn(`[api] backend unavailable (${err.message}) — using mock fallback`)
    return mockFn()
  }
}



// ── machine status ────────────────────────────────────────────────────────
/** GET /machines → Machine[] */
export async function fetchMachines() {
  return liveOrMock(
    () => api('/machines'),
    async () => {
      await delay(80)
      return MACHINES.map((m) => ({ ...m }))
    },
  )
}

/** GET /machines/:id → Machine */
export async function fetchMachine(id) {
  const all = await fetchMachines()
  return all.find((m) => m.id === id) ?? null
}

// ── telemetry ─────────────────────────────────────────────────────────────
// Baseline sensor channels per machine family. M-04 rides its fault curve.
const TELEMETRY_BASE = {
  'M-04': [
    { key: 'temperature', label: 'Temperature', unit: '°C',    value: 82,   nominal: 65,   warnAbove: 78, critAbove: 88 },
    { key: 'vibration',   label: 'Vibration',   unit: 'mm/s', value: 7.4,  nominal: 2.1,  warnAbove: 4.5, critAbove: 7.1 },
    { key: 'torque',      label: 'Torque',      unit: 'Nm',   value: 61,   nominal: 48,   warnAbove: 58, critAbove: 70 },
    { key: 'speed',       label: 'Speed',       unit: 'RPM',  value: 1430, nominal: 1500, warnAbove: 1480, critAbove: 1450 },
  ],
  DEFAULT: [
    { key: 'temperature', label: 'Temperature', unit: '°C',    value: 62,   nominal: 60,   warnAbove: 78, critAbove: 88 },
    { key: 'vibration',   label: 'Vibration',   unit: 'mm/s', value: 2.0,  nominal: 2,    warnAbove: 4.5, critAbove: 7.1 },
    { key: 'torque',      label: 'Torque',      unit: 'Nm',   value: 47,   nominal: 48,   warnAbove: 58, critAbove: 70 },
    { key: 'speed',       label: 'Speed',       unit: 'RPM',  value: 1490, nominal: 1500, warnAbove: 1480, critAbove: 1450 },
  ],
}

/**
 * GET /machines/:id/telemetry → TelemetryChannel[] snapshot.
 * Mock mode drifts values realistically around the fault curve with seeded
 * noise so charts stream but stay deterministic per tick.
 */
export async function fetchTelemetry(id, tick = 0) {
  return liveOrMock(
    () => api(`/machines/${id}/telemetry`),
    async () => {
      await delay(20)
      const base = TELEMETRY_BASE[id] ?? TELEMETRY_BASE.DEFAULT
      return base.map((ch, i) => {
        const n = seededRandom(id.charCodeAt(1) * 97 + i * 13 + tick)
        let v
        if (id === 'M-04') {
          // Fault curve: slow degradation + sensor noise
          const drift = 1 + 0.02 * Math.sin(tick / 9 + i) + 0.008 * (n - 0.5)
          v = ch.key === 'speed' ? ch.value * (2 - drift) : ch.value * drift
        } else {
          v = ch.nominal * (1 + 0.02 * Math.sin(tick / 7 + i) + 0.01 * (n - 0.5))
        }
        return { ...ch, value: Number(v.toFixed(1)) }
      })
    },
  )
}

// ── risk prediction ───────────────────────────────────────────────────────
/** GET /machines/:id/risk → { risk, state, prediction } */
export async function fetchRisk(id) {
  return liveOrMock(
    () => api(`/machines/${id}/risk`),
    async () => {
      const machines = await fetchMachines()
      const m = machines.find((x) => x.id === id)
      return {
        risk: m?.risk ?? 0,
        state: m?.state ?? 'normal',
        prediction: m?.predicts?.length ? { mode: m.predicts[0], horizonHours: id === 'M-04' ? 2 : 8 } : null,
      }
    },
  )
}

// ── cascade ───────────────────────────────────────────────────────────────
/** GET /machines/:id/cascade → CascadeResult (topology + impact summary) */
export async function fetchCascade(triggerId) {
  return liveOrMock(
    () => api(`/cascade?trigger=${triggerId}`),
    async () => {
      await delay(120)
      if (triggerId !== 'M-04') {
        // Generic fallback topology for non-seeded triggers
        return {
          ...CASCADE_SUMMARY,
          triggerId,
          nodes: [
            { machineId: triggerId, depth: 0, probability: 100, delaySec: 0, impact: 0 },
            { machineId: 'M-16', depth: 1, probability: 55, delaySec: 150, impact: 30 },
          ],
          machinesAffected: 2,
          productionImpact: 34,
          cascadeProbability: 4,
          severity: 'Low',
          workerExposure: 20,
          summary: `Simulated propagation from ${triggerId} through the Line 2 drive chain.`,
        }
      }
      return { ...CASCADE_SUMMARY, nodes: CASCADE_NODES.map((n) => ({ ...n })) }
    },
  )
}

// ── scenarios ─────────────────────────────────────────────────────────────
/** GET /machines/:id/scenarios → Scenario[] */
export async function fetchScenarios(machineId) {
  return liveOrMock(
    () => api(`/machines/${machineId}/scenarios`),
    async () => {
      await delay(60)
      return SCENARIOS.map((s) => ({ ...s }))
    },
  )
}

// ── safety ────────────────────────────────────────────────────────────────
/** GET /safety → SafetyOverview */
export async function fetchSafetyOverview() {
  return liveOrMock(
    () => api('/safety'),
    async () => {
      await delay(40)
      return {
        safetyScore: 82,
        workerExposure: 'Low',
        currentIntervention: 'None active — continuous monitoring',
        humanApprovalRequired: true,
        humanApprovalGranted: false,
        riskState: 'caution',
      }
    },
  )
}

// ── history ───────────────────────────────────────────────────────────────
/** GET /history → HistoryEvent[] */
export async function fetchHistory() {
  return liveOrMock(
    () => api('/history'),
    async () => {
      await delay(50)
      return HISTORY_SEED.map((h) => ({ ...h }))
    },
  )
}

// ── system status ─────────────────────────────────────────────────────────
/** GET /status → ServiceStatus[] */
export async function fetchSystemStatus() {
  return liveOrMock(
    () => api('/status'),
    async () => {
      await delay(0)
      return SERVICES_SEED.map((s) => ({ ...s }))
    },
  )
}

// ── POST endpoints ────────────────────────────────────────────────────────
/** POST /cascade/simulate — run propagation simulation, returns step plan */
export async function runCascadeSimulation(triggerId) {
  return liveOrMock(
    () => api('/cascade/simulate', { method: 'POST', body: JSON.stringify({ triggerId }) }),
    async () => {
      await delay(150)
      const cascade = await fetchCascade(triggerId)
      return {
        steps: cascade.nodes.map((n) => ({ machineId: n.machineId, atSec: n.delaySec, probability: n.probability, impact: n.impact })),
        summary: cascade.summary,
        productionImpact: cascade.productionImpact,
        workerExposure: cascade.workerExposure,
      }
    },
  )
}

/** POST /scenarios/compare — evaluate and rank intervention scenarios */
export async function compareScenarios(machineId) {
  return liveOrMock(
    () => api('/scenarios/compare', { method: 'POST', body: JSON.stringify({ machineId }) }),
    async () => {
      await delay(120)
      return SCENARIOS.map((s) => ({ ...s }))
    },
  )
}

/** POST /approval — record human approval for a maintenance action */
export async function postHumanApproval({ machineId, action, operator }) {
  return liveOrMock(
    () => api('/approval', { method: 'POST', body: JSON.stringify({ machineId, action, operator }) }),
    async () => {
      await delay(90)
      return { ok: true, recordedAt: new Date().toISOString(), machineId, action, operator }
    },
  )
}

// ══ NEW: backend-powered operations (frontend-visible via store helpers) ══

/** GET /climate → active country profile + catalogue */
export async function fetchClimate() {
  return liveOrMock(
    () => api('/climate'),
    async () => ({ active: 'IN', available: { IN: { name: 'India', ambientC: 32, humidity: 62, tz: 'Asia/Kolkata', setupTempC: 38 } } }),
  )
}

/** POST /climate/:code — apply a country's ambient/setup temperature profile */
export async function setClimate(code) {
  return liveOrMock(
    () => api(`/climate/${code}`, { method: 'POST' }),
    async () => ({ ok: true, code }),
  )
}

/** GET /technicians */
export async function fetchTechnicians() {
  return liveOrMock(
    () => api('/technicians'),
    async () => [
      { id: 'T-01', name: 'R. Kowalski', team: 'Mechanical', onShift: true, radio: 'CH-2' },
      { id: 'T-02', name: 'S. Devi', team: 'Electrical', onShift: true, radio: 'CH-2' },
      { id: 'T-03', name: 'M. Haddad', team: 'Instrumentation', onShift: false, radio: 'CH-3' },
    ],
  )
}

/** GET /alerts */
export async function fetchAlerts() {
  return liveOrMock(
    () => api('/alerts'),
    async () => [],
  )
}

/** POST /alerts/dispatch — page the technician team to approach a machine */
export async function dispatchAlert({ machineId, level = 'warning', message = '' }) {
  return liveOrMock(
    () => api('/alerts/dispatch', { method: 'POST', body: JSON.stringify({ machineId, level, message }) }),
    async () => ({ ok: true, alert: { id: Date.now(), machineId, level, message, status: 'pending', at: new Date().toISOString().slice(11, 19) }, notified: [] }),
  )
}

/** POST /alerts/:id/ack — technician acknowledges and heads to the machine */
export async function ackAlert(alertId, technicianId) {
  return liveOrMock(
    () => api(`/alerts/${alertId}/ack`, { method: 'POST', body: JSON.stringify({ technicianId }) }),
    async () => ({ ok: true }),
  )
}

/** POST /alerts/:id/arrive — technician on site */
export async function arriveAlert(alertId, technicianId) {
  return liveOrMock(
    () => api(`/alerts/${alertId}/arrive`, { method: 'POST', body: JSON.stringify({ technicianId }) }),
    async () => ({ ok: true }),
  )
}

/** POST /alerts/:id/clear */
export async function clearAlert(alertId) {
  return liveOrMock(
    () => api(`/alerts/${alertId}/clear`, { method: 'POST' }),
    async () => ({ ok: true }),
  )
}

/** POST /machines/:id/speed — maintenance speed reduction (lowers risk) */
export async function setMachineSpeed(machineId, targetRpm, reason = 'Maintenance speed reduction', operator = 'supervisor') {
  return liveOrMock(
    () => api(`/machines/${machineId}/speed`, { method: 'POST', body: JSON.stringify({ targetRpm, reason, operator }) }),
    async () => ({ ok: true, machineId, targetRpm, reduced: true, newRisk: 68, newState: 'maintenance' }),
  )
}
