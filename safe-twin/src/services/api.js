/**
 * API SERVICE LAYER — the ONLY module the UI touches for data.
 *
 * BACKEND INTEGRATION:
 * Every function below maps 1:1 to a future REST endpoint. To connect the real
 * backend, replace the mock implementations with fetch() calls, e.g.:
 *
 *   const res = await fetch(`${API_BASE}/machines/${id}/telemetry`)
 *   return res.json()
 *
 * MOCK vs REAL: `USE_MOCK` is the single switch. Mock mode simulates a live
 * factory so the demo runs without a backend.
 */

import {
  MACHINES, LINKS, CASCADE_NODES, CASCADE_SUMMARY, SCENARIOS,
  HISTORY_SEED, SERVICES_SEED,
} from '../data/mockData.js'
import { seededRandom } from '../utils/math.js'

// ── config ────────────────────────────────────────────────────────────────
export const USE_MOCK = true // flip to false when the real backend is live
const API_BASE = '/api'

const delay = (ms) => new Promise((r) => setTimeout(r, USE_MOCK ? ms : 0))

// ── machine status ────────────────────────────────────────────────────────
/** GET /machines → Machine[] */
export async function fetchMachines() {
  await delay(80)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/machines`)).json()
  return MACHINES.map((m) => ({ ...m }))
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
  await delay(20)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/machines/${id}/telemetry`)).json()

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
}

// ── risk prediction ───────────────────────────────────────────────────────
/** GET /machines/:id/risk → { risk, state, prediction } */
export async function fetchRisk(id) {
  const machines = await fetchMachines()
  const m = machines.find((x) => x.id === id)
  return {
    risk: m?.risk ?? 0,
    state: m?.state ?? 'normal',
    prediction: m?.predicts?.length ? { mode: m.predicts[0], horizonHours: id === 'M-04' ? 2 : 8 } : null,
  }
}

// ── cascade ───────────────────────────────────────────────────────────────
/** GET /machines/:id/cascade → CascadeResult (topology + impact summary) */
export async function fetchCascade(triggerId) {
  await delay(120)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/cascade?trigger=${triggerId}`)).json()
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
}

// ── scenarios ─────────────────────────────────────────────────────────────
/** GET /machines/:id/scenarios → Scenario[] */
export async function fetchScenarios(machineId) {
  await delay(60)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/machines/${machineId}/scenarios`)).json()
  return SCENARIOS.map((s) => ({ ...s }))
}

// ── safety ────────────────────────────────────────────────────────────────
/** GET /safety → SafetyOverview */
export async function fetchSafetyOverview() {
  await delay(40)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/safety`)).json()
  return {
    safetyScore: 82,
    workerExposure: 'Low',
    currentIntervention: 'None active — continuous monitoring',
    humanApprovalRequired: true,
    humanApprovalGranted: false,
    riskState: 'caution',
  }
}

// ── history ───────────────────────────────────────────────────────────────
/** GET /history → HistoryEvent[] */
export async function fetchHistory() {
  await delay(50)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/history`)).json()
  return HISTORY_SEED.map((h) => ({ ...h }))
}

// ── system status ─────────────────────────────────────────────────────────
/** GET /status → ServiceStatus[] */
export async function fetchSystemStatus() {
  await delay(0)
  if (!USE_MOCK) return (await fetch(`${API_BASE}/status`)).json()
  return SERVICES_SEED.map((s) => ({ ...s }))
}

// ── POST endpoints ────────────────────────────────────────────────────────
/** POST /cascade/simulate — run propagation simulation, returns step plan */
export async function runCascadeSimulation(triggerId) {
  await delay(150)
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE}/cascade/simulate`, { method: 'POST', body: JSON.stringify({ triggerId }) })
    return res.json()
  }
  const cascade = await fetchCascade(triggerId)
  return {
    steps: cascade.nodes.map((n) => ({ machineId: n.machineId, atSec: n.delaySec, probability: n.probability, impact: n.impact })),
    summary: cascade.summary,
    productionImpact: cascade.productionImpact,
    workerExposure: cascade.workerExposure,
  }
}

/** POST /scenarios/compare — evaluate and rank intervention scenarios */
export async function compareScenarios(machineId) {
  await delay(120)
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE}/scenarios/compare`, { method: 'POST', body: JSON.stringify({ machineId }) })
    return res.json()
  }
  return SCENARIOS.map((s) => ({ ...s }))
}

/** POST /approval — record human approval for a maintenance action */
export async function postHumanApproval({ machineId, action, operator }) {
  await delay(90)
  if (!USE_MOCK) {
    const res = await fetch(`${API_BASE}/approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineId, action, operator }),
    })
    return res.json()
  }
  return { ok: true, recordedAt: new Date().toISOString(), machineId, action, operator }
}
