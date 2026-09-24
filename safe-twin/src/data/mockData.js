/**
 * MOCK DATA LAYER — clearly separated from UI.
 * Shapes match src/data/types.js. The service layer (src/services/*) is the
 * only code the UI touches; swapping mock data for a real backend happens there.
 */

export const MACHINES = [
  { id: 'M-01', name: 'Conveyor',   role: 'Infeed conveyor — Section A',     kind: 'conveyor',   state: 'normal',  risk: 4,   pos: { x: -22, z: 0 },  size: { w: 14, d: 3.2, h: 1.2 }, predicts: [] },
  { id: 'M-02', name: 'Pump',       role: 'Coolant circulation pump',        kind: 'pump',       state: 'normal',  risk: 6,   pos: { x: -8,  z: -10 }, size: { w: 3.4, d: 2.6, h: 2.4 }, predicts: [] },
  { id: 'M-03', name: 'Compressor', role: 'Plant air compressor',            kind: 'compressor', state: 'warning', risk: 41,  pos: { x: -6,  z: 8 },   size: { w: 4.6, d: 3.0, h: 2.8 }, predicts: ['Valve seal degradation'] },
  { id: 'M-04', name: 'Motor',      role: 'Motor / Bearing Assembly',        kind: 'motor',      state: 'high',    risk: 87,  pos: { x: 0,   z: 0 },   size: { w: 3.0, d: 2.4, h: 2.2 }, predicts: ['Bearing Failure'] },
  { id: 'M-05', name: 'Robot',      role: 'Assembly robot — Cell 2',         kind: 'robot',      state: 'normal',  risk: 9,   pos: { x: 8,   z: -9 },  size: { w: 2.2, d: 2.2, h: 3.4 }, predicts: [] },
  { id: 'M-07', name: 'Robot',      role: 'Welding robot — Line 2',          kind: 'robot',      state: 'warning', risk: 34,  pos: { x: 12,  z: 0 },   size: { w: 2.2, d: 2.2, h: 3.4 }, predicts: ['Servo drift'] },
  { id: 'M-09', name: 'Pump',       role: 'Hydraulic power unit',            kind: 'pump',       state: 'normal',  risk: 5,   pos: { x: 12,  z: 10 },  size: { w: 3.2, d: 2.6, h: 2.4 }, predicts: [] },
  { id: 'M-16', name: 'Cell',       role: 'Production Line 2 — Exit cell',   kind: 'cell',       state: 'normal',  risk: 3,   pos: { x: 24,  z: 0 },   size: { w: 6,   d: 5,   h: 3.2 }, predicts: [] },
]

export const LINKS = [
  { from: 'M-01', to: 'M-04', kind: 'flow' },
  { from: 'M-04', to: 'M-07', kind: 'flow' },
  { from: 'M-07', to: 'M-16', kind: 'flow' },
  { from: 'M-02', to: 'M-04', kind: 'power' },
  { from: 'M-09', to: 'M-07', kind: 'power' },
  { from: 'M-03', to: 'M-04', kind: 'power' },
  { from: 'M-03', to: 'M-07', kind: 'data' },
]

/**
 * Cascade topology: how a failure at the trigger propagates.
 * Matches CascadeResult from src/data/types.js.
 */
export const CASCADE_NODES = [
  { machineId: 'M-04', depth: 0, probability: 100, delaySec: 0,   impact: 0 },
  { machineId: 'M-07', depth: 1, probability: 92,  delaySec: 45,  impact: 18 },
  { machineId: 'M-09', depth: 2, probability: 61,  delaySec: 120, impact: 12 },
  { machineId: 'M-16', depth: 3, probability: 78,  delaySec: 180, impact: 38 },
]

export const CASCADE_SUMMARY = {
  triggerId: 'M-04',
  triggerName: 'M-04 Motor',
  machinesAffected: 4,
  productionImpact: 68,
  cascadeProbability: 7,
  severity: 'Medium',
  workerExposure: 35,
  summary:
    'Bearing failure at M-04 introduces abnormal torque ripple into the Line 2 drive chain. ' +
    'M-07 compensates with servo overdrive, degrading its own gearbox. M-09 flow oscillation ' +
    'stresses the exit cell actuation, halting Production Line 2 within ~3 minutes.',
}

export const SCENARIOS = [
  {
    id: 'immediate',
    name: 'Immediate Maintenance',
    tagline: 'Controlled stop within the next hour',
    failureRisk: 12,
    cascadeRisk: 2,
    productionImpact: 22,
    workerExposure: 18,
    safetyScore: 91,
    safetyImplication: 'Low',
    safetyNote: 'Full lockout-tagout during bearing swap; line paused while M-04 is isolated.',
    recommendation:
      'Schedule controlled stop, isolate M-04, perform bearing replacement under LOTO with safety engineer sign-off.',
    recommended: true,
    durationHours: '≈ 3 h',
  },
  {
    id: 'scheduled',
    name: 'Scheduled Maintenance',
    tagline: 'Next planned window, tonight 02:00',
    failureRisk: 64,
    cascadeRisk: 9,
    productionImpact: 8,
    workerExposure: 24,
    safetyScore: 74,
    safetyImplication: 'Medium',
    safetyNote: 'Machine keeps running until window; rising vibration increases crew risk near cell.',
    recommendation:
      'Hold current load, restrict operator access within 2 m of M-04, re-evaluate risk at every shift handover.',
    recommended: false,
    durationHours: '≈ 2 h',
  },
  {
    id: 'delayed',
    name: 'Delayed Maintenance',
    tagline: 'Defer beyond 8 hours',
    failureRisk: 94,
    cascadeRisk: 71,
    productionImpact: 68,
    workerExposure: 57,
    safetyScore: 41,
    safetyImplication: 'High',
    safetyNote: 'Uncontrolled failure probable; debris and torque spike expose nearby operators.',
    recommendation:
      'Not advised. If deferred, hard-restrict the cell, evacuate non-essential staff and pre-stage spill/containment.',
    recommended: false,
    durationHours: '—',
  },
]

export const HISTORY_SEED = [
  { id: 'h1', time: '21:32:04', kind: 'warning',  title: 'M-04 anomaly detected',        detail: 'Vibration signature drifts from baseline on motor bearing assembly.', machineId: 'M-04' },
  { id: 'h2', time: '21:33:10', kind: 'critical', title: 'Bearing failure predicted',    detail: 'ML engine raises failure risk to 87% — estimated horizon ~2 hours.', machineId: 'M-04' },
  { id: 'h3', time: '21:34:26', kind: 'info',     title: 'Cascade analysis completed',   detail: '4 machines affected, production impact 68%, severity Medium.',       machineId: null },
  { id: 'h4', time: '21:35:02', kind: 'info',     title: 'Maintenance scenario evaluated', detail: 'Immediate intervention recommended by planning engine.',            machineId: 'M-04' },
  { id: 'h5', time: '21:36:44', kind: 'approval', title: 'Human approval recorded',      detail: 'Shift supervisor approved LOTO intervention plan for M-04.',         machineId: 'M-04' },
]

export const SERVICES_SEED = [
  { key: 'frontend',     label: 'Frontend',     status: 'online', latencyMs: 12 },
  { key: 'backend',      label: 'Backend API',  status: 'online', latencyMs: 34 },
  { key: 'ml',           label: 'ML Engine',    status: 'online', latencyMs: 58 },
  { key: 'twin',         label: 'Digital Twin', status: 'online', latencyMs: 21 },
  { key: 'database',     label: 'Database',     status: 'online', latencyMs: 18 },
]
