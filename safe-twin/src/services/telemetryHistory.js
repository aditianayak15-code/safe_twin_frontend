/**
 * Telemetry history generator — produces a rolling window of readings for
 * streaming charts. Mock mode synthesizes plausible fault-curve history.
 * When the backend lands, replace `getHistoryWindow` with a fetch of the
 * real series; the consumer (Telemetry view) stays unchanged.
 */

import { fetchTelemetry } from './api.js'

const WINDOWS = new Map() // machineId -> { channels, buffers }

const WINDOW_SIZE = 60 // points visible on charts

export async function getHistoryWindow(machineId, tick) {
  const snapshot = await fetchTelemetry(machineId, tick)
  if (!WINDOWS.has(machineId)) {
    const buffers = new Map()
    for (const ch of snapshot) {
      // Synthesize the past window by walking backwards from the current value
      const past = []
      for (let t = WINDOW_SIZE; t > 0; t--) {
        const decay = 1 - 0.35 * (t / WINDOW_SIZE) // older readings were healthier
        const wobble = 1 + 0.03 * Math.sin(t / 5 + ch.key.length)
        const v = ch.key === 'speed'
          ? ch.nominal + (ch.value - ch.nominal) * (1 - decay)
          : ch.nominal + (ch.value - ch.nominal) * decay * wobble
        past.push(Number(v.toFixed(1)))
      }
      buffers.set(ch.key, past)
    }
    WINDOWS.set(machineId, { channels: snapshot, buffers })
  }
  const win = WINDOWS.get(machineId)
  // Push fresh samples
  for (const ch of snapshot) {
    win.buffers.get(ch.key).push(ch.value)
    if (win.buffers.get(ch.key).length > WINDOW_SIZE) win.buffers.get(ch.key).shift()
  }
  win.channels = snapshot
  return {
    channels: snapshot,
    series: Object.fromEntries([...win.buffers.entries()].map(([k, arr]) => [k, [...arr]])),
  }
}

export function resetTelemetryWindows() {
  WINDOWS.clear()
}
