/** App — SAFE-TWIN shell. One continuous space: 3D twin persists behind all views. */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import FactoryScene from './scene/FactoryScene.jsx'
import TopBar from './components/TopBar.jsx'
import BottomNav from './components/BottomNav.jsx'
import RiskCards from './components/RiskCards.jsx'
import MachinePanel from './components/MachinePanel.jsx'
import Copilot from './components/Copilot.jsx'
import TelemetryView from './views/TelemetryView.jsx'
import CascadeView from './views/CascadeView.jsx'
import ScenariosView from './views/ScenariosView.jsx'
import SafetyView from './views/SafetyView.jsx'
import HistoryView from './views/HistoryView.jsx'
import { useStore, boot, startClock, tickTelemetry } from './store/useStore.js'

/** Cinematic title, fades out as the operator engages. */
function HeroOverlay() {
  const booted = useStore((s) => s.booted)
  const tick = useStore((s) => s.tick)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!booted) return
    const t = setTimeout(() => setDismissed(true), 3600)
    return () => clearTimeout(t)
  }, [booted])

  const show = booted && !dismissed
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -18, filter: 'blur(6px)' }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="text-center">
            <motion.h1
              className="text-[38px] leading-none font-bold tracking-[0.3em] text-[#e8f1f8]"
              style={{ textShadow: '0 0 40px rgba(56,189,248,0.35)' }}
              initial={{ letterSpacing: '0.5em', opacity: 0 }}
              animate={{ letterSpacing: '0.3em', opacity: 1 }}
              transition={{ duration: 1.4 }}
            >
              SAFE<span className="text-sky-400">-TWIN</span>
            </motion.h1>
            <div className="mt-2 text-[11px] tracking-[0.3em] text-sky-300/80 uppercase">
              AI Failure Cascade &amp; Safe Maintenance Planning
            </div>
            <div className="mt-1 text-[10px] tracking-[0.2em] text-[#7d92a5] uppercase">
              Real-time industrial intelligence for predictive maintenance and safer operations
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** Ambient background: industrial hall wall + drifting floor grid (no space motifs). */
function AmbientBackground() {
  return (
    <>
      <div className="twin-bg" />
    </>
  )
}

function WebGLFallback() {
  return (
    <div className="panel panel-corner absolute inset-0 z-10 grid place-items-center p-8">
      <div className="max-w-md text-center">
        <Factory2D />
      </div>
    </div>
  )
}

/** Lightweight SVG digital-twin fallback when WebGL is unavailable. */
function Factory2D() {
  const machines = [
    { id: 'M-01', x: 60, y: 110, c: '#34d399' },
    { id: 'M-04', x: 240, y: 110, c: '#f87171' },
    { id: 'M-07', x: 400, y: 110, c: '#fbbf24' },
    { id: 'M-16', x: 560, y: 110, c: '#34d399' },
  ]
  return (
    <div className="panel p-6">
      <div className="hud-label mb-3">2D DIGITAL TWIN — WEBGL UNAVAILABLE</div>
      <svg viewBox="0 0 640 220" className="w-full">
        <rect x="0" y="0" width="640" height="220" fill="#0a0f16" />
        {machines.map((m, i) => (
          <g key={m.id}>
            {i > 0 && <line x1={machines[i - 1].x + 30} y1={110} x2={m.x - 30} y2={110} stroke="#243444" strokeDasharray="4 3" />}
            <rect x={m.x - 28} y={82} width={56} height={56} fill="#0d141d" stroke={m.c} strokeWidth="1.5" />
            <text x={m.x} y={115} textAnchor="middle" fill={m.c} fontSize="11" fontFamily="monospace" fontWeight="700">{m.id}</text>
          </g>
        ))}
        <text x="320" y="30" textAnchor="middle" fill="#46586a" fontSize="9" letterSpacing="3" fontFamily="monospace">PRODUCTION LINE 2</text>
      </svg>
    </div>
  )
}

function useWebGLAvailable() {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setOk(!!(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch {
      setOk(false)
    }
  }, [])
  return ok
}

export default function App() {
  const view = useStore((s) => s.view)
  const webgl = useWebGLAvailable()

  useEffect(() => {
    boot()
    startClock()
    const tickTimer = setInterval(tickTelemetry, 1500)
    return () => clearInterval(tickTimer)
  }, [])

  const twinVisible = view === 'twin'

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#05080d]">
      <TopBar />
      <main className="relative min-h-0 flex-1">
        {/* ambient cinematic background + 3D layer — dims when an analytical view is active */}
        <div className="absolute inset-0">
          <AmbientBackground />
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: twinVisible ? 1 : 0.14 }}
        >
          {webgl ? <FactoryScene compact={!twinVisible} /> : <WebGLFallback />}
        </div>
        <div className="twin-vignette z-[5]" />

        {/* view content */}
        <AnimatePresence mode="wait">
          {view === 'twin' ? (
            <motion.div
              key="twin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 flex flex-col justify-between p-4 pt-14"
            >
              <HeroOverlay />
              <div className="absolute inset-x-4 top-14 z-10">
                <RiskCards />
              </div>
              <MachinePanel />
              <Copilot />
            </motion.div>
          ) : (
            <motion.div
              key={view}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0 z-20 p-4 pt-14 pb-1"
            >
              {view === 'telemetry' && <TelemetryView />}
              {view === 'cascade' && <CascadeView />}
              {view === 'scenarios' && <ScenariosView />}
              {view === 'safety' && <SafetyView />}
              {view === 'history' && <HistoryView />}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
