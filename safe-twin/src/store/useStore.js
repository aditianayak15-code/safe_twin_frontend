/**
 * GLOBAL STORE — one live factory state, consumed via useSyncExternalStore.
 * The store OWNS the demo story state machine; views subscribe to slices.
 */

import { useSyncExternalStore } from 'react'
import { LINKS } from '../data/mockData.js'
import * as api from '../services/api.js'

// ── state ─────────────────────────────────────────────────────────────────
const state = {
  // config
  machines: [],
  links: LINKS,
  booted: false,

  // live data
  status: [],
  clock: new Date(),
  tick: 0,

  // UI
  view: 'twin',                  // twin | telemetry | cascade | scenarios | safety | history | scheduling | production
  selectedId: null,              // machine details panel
  hoverId: null,
  focusId: null,                 // 3D camera focus target
  telemetryTarget: 'M-04',       // machine shown on telemetry screen

  // story
  cascadeActive: false,
  cascadeRevealed: [],           // machineIds revealed so far
  cascadeResult: null,           // CascadeResult once computed
  cascadeImpactShown: false,
  simRunning: false,
  simStep: -1,                   // index into sim steps (-1 = idle)
  simSteps: [],

  scenarioMode: 'baseline',      // baseline | scenario id
  activeScenario: null,          // selected Scenario object

  safety: null,                  // SafetyOverview
  approval: 'pending',           // pending | approved | in_progress | complete
  copilotOpen: false,
  copilotStep: 0,                // 0..5 narrative progression

  history: [],
}

const listeners = new Set()

function set(patch) {
  Object.assign(state, patch)
  listeners.forEach((l) => l())
}

// ── subscription ──────────────────────────────────────────────────────────
export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export const getState = () => state

export function useStore(selector) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

// ── boot + clocks ─────────────────────────────────────────────────────────
export async function boot() {
  const [machines, status, safety, history] = await Promise.all([
    api.fetchMachines(),
    api.fetchSystemStatus(),
    api.fetchSafetyOverview(),
    api.fetchHistory(),
  ])
  set({ machines, status, safety, history, booted: true })
}

export function startClock() {
  setInterval(() => set({ clock: new Date() }), 1000)
}

export function tickTelemetry() {
  set({ tick: state.tick + 1 })
}

// ── selection / focus ─────────────────────────────────────────────────────
export function selectMachine(id) {
  set({ selectedId: id, focusId: id, copilotStep: Math.max(state.copilotStep, 1) })
}

export function closeMachine() {
  set({ selectedId: null, focusId: null })
}

export function setHover(id) {
  set({ hoverId: id })
}

export function setTelemetryTarget(id) {
  set({ telemetryTarget: id })
}

// ── view navigation ───────────────────────────────────────────────────────
export function navigate(view) {
  set({ view })
  if (view === 'telemetry') {
    set({ telemetryTarget: state.selectedId ?? 'M-04' })
  }
  if (view === 'cascade' || view === 'scenarios') {
    set({ copilotStep: Math.max(state.copilotStep, 2) })
  }
}

// ── cascade flow ──────────────────────────────────────────────────────────
export async function analyzeCascade(triggerId = 'M-04') {
  const result = await api.fetchCascade(triggerId)
  set({
    cascadeResult: result,
    cascadeActive: true,
    cascadeRevealed: [triggerId],
    cascadeImpactShown: false,
    view: 'cascade',
  })
  return result
}

export function revealCascadeStep(machineId) {
  if (!state.cascadeRevealed.includes(machineId)) {
    set({ cascadeRevealed: [...state.cascadeRevealed, machineId] })
  }
}

export function showCascadeImpact() {
  set({ cascadeImpactShown: true, copilotStep: Math.max(state.copilotStep, 3) })
}

export function finishCascade() {
  set({ cascadeActive: false, cascadeRevealed: [] })
}

// ── simulation ────────────────────────────────────────────────────────────
export async function runSimulation() {
  const plan = await api.runCascadeSimulation('M-04')
  // Seed the graph with the cascade topology so the simulation visualizes
  // propagation over the real network, then reveal nodes as steps advance.
  const cascade = state.cascadeResult ?? (await api.fetchCascade('M-04'))
  set({
    simSteps: plan.steps,
    simRunning: true,
    simStep: -1,
    view: 'cascade',
    cascadeResult: cascade,
    cascadeActive: true,
    cascadeRevealed: [cascade.triggerId],
    cascadeImpactShown: false,
    copilotStep: Math.max(state.copilotStep, 3),
  })
  return plan
}

export function advanceSim() {
  if (!state.simRunning) return null
  const next = state.simStep + 1
  const step = state.simSteps[next]
  if (!step) {
    set({ simRunning: false })
    return null
  }
  set({
    simStep: next,
    cascadeActive: true,
    cascadeRevealed: state.cascadeRevealed.includes(step.machineId)
      ? state.cascadeRevealed
      : [...state.cascadeRevealed, step.machineId],
  })
  return step
}

export function resetSim() {
  set({
    simRunning: false,
    simStep: -1,
    simSteps: [],
    cascadeActive: false,
    cascadeRevealed: [],
    cascadeImpactShown: false,
  })
}

// ── scenarios ─────────────────────────────────────────────────────────────
export async function applyScenario(id) {
  const scenario = (await api.fetchScenarios('M-04')).find((s) => s.id === id)
  set({ scenarioMode: id, activeScenario: scenario, copilotStep: Math.max(state.copilotStep, 4) })
  return scenario
}

export function clearScenario() {
  set({ scenarioMode: 'baseline', activeScenario: null })
}

// ── safety / approval ─────────────────────────────────────────────────────
export async function requestSafetyRefresh() {
  const s = await api.fetchSafetyOverview()
  set({ safety: s })
  return s
}

export function setApproval(phase) {
  set({ approval: phase })
}

export function recordApproval(operator = 'Shift Supervisor') {
  set({
    approval: 'approved',
    safety: state.safety ? { ...state.safety, humanApprovalGranted: true } : state.safety,
    history: [
      ...state.history,
      {
        id: `ha-${Date.now()}`,
        time: fmtTime(new Date()),
        kind: 'approval',
        title: 'Human approval recorded',
        detail: `${operator} approved LOTO intervention plan for M-04.`,
        machineId: 'M-04',
      },
    ],
  })
}

export function startMaintenance() {
  set({
    approval: 'in_progress',
    machines: state.machines.map((m) => (m.id === 'M-04' ? { ...m, state: 'maintenance' } : m)),
  })
}

export function completeMaintenance() {
  set({
    approval: 'complete',
    safety: state.safety
      ? { ...state.safety, safetyScore: 97, riskState: 'clear', currentIntervention: 'Bearing replacement complete — M-04 restored' }
      : state.safety,
    history: [
      ...state.history,
      {
        id: `hm-${Date.now()}`,
        time: fmtTime(new Date()),
        kind: 'success',
        title: 'Maintenance completed — M-04 restored',
        detail: 'Bearing replaced under LOTO. Risk back to 5%, machine returned to production.',
        machineId: 'M-04',
      },
    ],
    machines: state.machines.map((m) => (m.id === 'M-04' ? { ...m, state: 'normal', risk: 5, predicts: [] } : m)),
  })
}

// ── copilot ───────────────────────────────────────────────────────────────
export function openCopilot() {
  set({ copilotOpen: true })
}

export function closeCopilot() {
  set({ copilotOpen: false })
}

export function toggleCopilot() {
  set({ copilotOpen: !state.copilotOpen })
}

export function advanceCopilotStep() {
  set({ copilotStep: Math.min(5, state.copilotStep + 1) })
}

// ── demo reset ────────────────────────────────────────────────────────────
export function resetDemo() {
  set({
    selectedId: null,
    focusId: null,
    hoverId: null,
    cascadeActive: false,
    cascadeRevealed: [],
    cascadeResult: null,
    cascadeImpactShown: false,
    simRunning: false,
    simStep: -1,
    simSteps: [],
    scenarioMode: 'baseline',
    activeScenario: null,
    approval: 'pending',
    copilotOpen: false,
    copilotStep: 0,
    machines: state.machines.map((m) => (m.id === 'M-04' ? { ...m, state: 'high', risk: 87, predicts: ['Bearing Failure'] } : m)),
  })
}

export function fmtTime(d) {
  return d.toTimeString().slice(0, 8)
}
