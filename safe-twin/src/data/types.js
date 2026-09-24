/**
 * SAFE-TWIN data model.
 * This module documents the shape of every domain object used across the app.
 * The UI never invents values: everything renders from the service layer.
 */

/**
 * Machine operational state, drives all visual language (color, pulse, outline).
 * @typedef {'normal'|'warning'|'high'|'failure'|'maintenance'} MachineState
 */

/**
 * A monitored industrial asset in the production cell.
 * @typedef {Object} Machine
 * @property {string} id            e.g. "M-04"
 * @property {string} name          e.g. "Motor"
 * @property {string} role          production role, e.g. "Motor / Bearing Assembly"
 * @property {MachineState} state   current derived state
 * @property {number} risk          0..100 failure risk
 * @property {{ x:number, z:number }} pos position on the factory floor (metres)
 * @property {{ w:number, d:number, h:number }} size footprint for the 3D twin
 * @property {string} kind          geometry family: conveyor|pump|compressor|motor|robot|cell
 * @property {number|null} cascadeDepth  depth in active cascade (null = unaffected)
 * @property {boolean} highlighted  focused / highlighted by UI
 * @property {boolean} approving    machine is under approved safe maintenance
 * @property {string[]} predicts    predicted failure modes (from ML engine)
 */

/**
 * Directed production-flow edge between machines.
 * @typedef {Object} Link
 * @property {string} from
 * @property {string} to
 * @property {'flow'|'power'|'data'} kind
 */

/**
 * A single live sensor channel for a machine.
 * @typedef {Object} TelemetryChannel
 * @property {string} key
 * @property {string} label
 * @property {string} unit
 * @property {number} value
 * @property {number} nominal   healthy baseline
 * @property {number} warnAbove threshold for warning state
 * @property {number} critAbove threshold for critical state
 */

/**
 * Per-machine snapshot: channels + risk + prediction.
 * @typedef {Object} MachineSnapshot
 * @property {string} machineId
 * @property {number} risk
 * @property {MachineState} state
 * @property {TelemetryChannel[]} channels
 * @property {{ mode:string, horizonHours:number }|null} prediction
 */

/**
 * Cascade analysis result (from ML engine).
 * @typedef {Object} CascadeResult
 * @property {string} triggerId
 * @property {{ machineId:string, depth:number, probability:number, delaySec:number, impact:number }[]} nodes
 * @property {number} machinesAffected
 * @property {number} productionImpact   percent of line throughput lost
 * @property {number} cascadeProbability percent likelihood the cascade propagates
 * @property {'Low'|'Medium'|'High'|'Critical'} severity
 * @property {number} workerExposure  0..100 exposure index during cascade
 * @property {string} summary
 */

/**
 * Maintenance intervention scenario.
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {string} name
 * @property {string} tagline
 * @property {number} failureRisk       residual risk of the predicted failure
 * @action {string} description
 * @property {number} cascadeRisk       percent
 * @property {number} productionImpact  percent
 * @property {number} workerExposure    0..100
 * @property {number} safetyScore       0..100
 * @property {'Low'|'Medium'|'High'} safetyImplication
 * @property {string} safetyNote
 * @property {string} recommendation
 * @property {boolean} recommended      flagged by the ML engine
 * @property {string} durationHours
 */

/**
 * History event for the ops timeline.
 * @typedef {Object} HistoryEvent
 * @property {string} id
 * @property {string} time  HH:MM:SS display time
 * @property {'info'|'warning'|'critical'|'success'|'approval'} kind
 * @property {string} title
 * @property {string} detail
 * @property {string|null} machineId
 */

/**
 * Service health status row.
 * @typedef {Object} ServiceStatus
 * @property {string} key
 * @property {string} label
 * @property {'online'|'degraded'|'offline'} status
 * @property {number} latencyMs
 */

/**
 * Worker safety overview.
 * @typedef {Object} SafetyOverview
 * @property {number} safetyScore        0..100
 * @property {'Low'|'Medium'|'High'} workerExposure
 * @property {string} currentIntervention
 * "No active intervention — continuous monitoring"
 * @property {boolean} humanApprovalRequired
 * @property {boolean} humanApprovalGranted
 * @property {'clear'|'caution'|'restricted'} riskState
 */
