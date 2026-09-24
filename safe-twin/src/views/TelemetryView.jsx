/** TelemetryView — streaming ECharts telemetry for the selected machine. */

import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { motion } from 'motion/react'
import { Activity } from 'lucide-react'
import { useStore, setTelemetryTarget } from '../store/useStore.js'
import { getHistoryWindow } from '../services/telemetryHistory.js'
import { ValueRow, Chip, STATE_COLORS } from '../components/ui.jsx'

const MAX_POINTS = 60

function chartOption(color, title, unit, series, thresholds, nominal) {
  return {
    animation: true,
    animationDuration: 300,
    grid: { top: 34, left: 44, right: 12, bottom: 24 },
    title: {
      text: title,
      left: 0, top: 0,
      textStyle: { color: '#7d92a5', fontSize: 10, letterSpacing: 4, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#0d141d',
      borderColor: '#243444',
      textStyle: { color: '#e8f1f8', fontSize: 11, fontFamily: 'monospace' },
    },
    xAxis: {
      type: 'category',
      show: false,
      data: series.map((_, i) => i),
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: { color: '#46586a', fontSize: 9, fontFamily: 'monospace' },
      splitLine: { lineStyle: { color: 'rgba(27,39,51,0.6)' } },
    },
    series: [
      {
        type: 'line',
        data: series,
        showSymbol: false,
        smooth: 0.35,
        lineStyle: { color, width: 1.6, shadowColor: `${color}66`, shadowBlur: 8 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${color}33` },
              { offset: 1, color: `${color}00` },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { show: true, color: '#46586a', fontSize: 8, formatter: (p) => p.name },
          data: [
            { yAxis: nominal, name: `NOM ${nominal}`, lineStyle: { color: 'rgba(52,211,153,0.4)', type: 'dashed', width: 1 } },
            ...(thresholds?.warnAbove ? [{ yAxis: thresholds.warnAbove, name: 'WARN', lineStyle: { color: 'rgba(251,191,36,0.5)', type: 'dashed', width: 1 } }] : []),
            ...(thresholds?.critAbove ? [{ yAxis: thresholds.critAbove, name: 'CRIT', lineStyle: { color: 'rgba(248,113,113,0.55)', type: 'dashed', width: 1 } }] : []),
          ],
        },
      },
    ],
  }
}

export default function TelemetryView() {
  const tick = useStore((s) => s.tick)
  const target = useStore((s) => s.telemetryTarget)
  const machines = useStore((s) => s.machines)

  const machine = machines.find((m) => m.id === target)

  const [window, setWindow] = useState(null)

  useEffect(() => {
    let alive = true
    getHistoryWindow(target, tick).then((w) => { if (alive) setWindow(w) })
    return () => { alive = false }
  }, [target, tick])

  const candidates = useMemo(
    () => machines.filter((m) => ['M-04', 'M-03', 'M-07', 'M-01'].includes(m.id)),
    [machines],
  )

  const temp = window?.channels.find((c) => c.key === 'temperature')
  const vib = window?.channels.find((c) => c.key === 'vibration')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="grid h-full grid-rows-[auto_1fr_auto] gap-3"
    >
      {/* header */}
      <div className="panel panel-corner flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Activity size={14} className="text-sky-400" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.16em] text-[#e8f1f8]">
              {target} LIVE TELEMETRY
            </div>
            <div className="text-[10px] text-[#7d92a5]">{machine?.role ?? ''}</div>
          </div>
          <span className="blink-soft ml-2 pulse-dot" style={{ background: '#38bdf8', color: '#38bdf8' }} />
        </div>
        <div className="flex items-center gap-1.5">
          {candidates.map((m) => (
            <button
              key={m.id}
              className={`hud-btn !px-2.5 !py-1 !text-[10px] ${target === m.id ? '!border-sky-400/60 !text-sky-300' : ''}`}
              onClick={() => setTelemetryTarget(m.id)}
            >
              {m.id}
            </button>
          ))}
        </div>
      </div>

      {/* charts */}
      <div className="grid min-h-0 grid-cols-1 gap-3 lg:grid-cols-2">
        {[temp, vib].map((ch, i) =>
          ch ? (
            <div key={ch.key} className="panel panel-corner flex min-h-[180px] flex-col p-2">
              <ReactECharts
                option={chartOption(
                  i === 0 ? '#fb923c' : '#38bdf8',
                  ch.label.toUpperCase(),
                  ch.unit,
                  window.series[ch.key],
                  ch,
                  ch.nominal,
                )}
                notMerge
                lazyUpdate
                style={{ height: '100%', minHeight: 170 }}
                opts={{ renderer: 'canvas' }}
              />
            </div>
          ) : (
            <div key={i} className="panel panel-corner min-h-[180px] animate-pulse bg-[#0d141d]/60" />
          ),
        )}
      </div>

      {/* value strip */}
      <div className="panel panel-corner grid grid-cols-2 gap-x-6 gap-y-0 px-4 py-2 sm:grid-cols-4">
        {window?.channels.map((ch) => (
          <ValueRow key={ch.key} {...ch} />
        ))}
      </div>
    </motion.div>
  )
}

