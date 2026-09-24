/** Procedural machine geometries + interactive MachineNode for the twin. */

import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, selectMachine, setHover } from '../store/useStore.js'
import { STATE_COLORS, STATE_LABELS } from '../components/ui.jsx'
import { lerp } from '../utils/math.js'

const C = {
  floor: '#0c1420',
  grid: '#1b2c3c',
  steel: '#3a4d61',
  steelDark: '#27384a',
  accent: '#38bdf8',
}

export const stateColor = (s) => STATE_COLORS[s] ?? '#34d399'

// ── geometry per machine kind ─────────────────────────────────────────────
function ConveyorGeometry({ belt }) {
  const stripes = useRef()
  useFrame((_, delta) => {
    if (!stripes.current) return
    stripes.current.position.x = ((stripes.current.position.x + delta * 1.4) % 1.45)
  })
  return (
    <group>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[13, 0.4, 2.2]} />
        <meshStandardMaterial color="#2c3d4e" roughness={0.75} metalness={0.35} />
      </mesh>
      <group ref={stripes}>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} position={[-6.5 + i * 1.45, 1.14, 0]}>
            <boxGeometry args={[0.55, 0.07, 2.24]} />
            <meshStandardMaterial color="#2c3d4c" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {[[-5.5, -0.9], [-5.5, 0.9], [5.5, -0.9], [5.5, 0.9]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.45, z]}>
          <boxGeometry args={[0.3, 0.9, 0.3]} />
          <meshStandardMaterial color={C.steelDark} />
        </mesh>
      ))}
      {[-6.6, 6.6].map((x, i) => (
        <mesh key={i} position={[x, 0.9, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 2.3, 20]} />
          <meshStandardMaterial color={C.steel} metalness={0.15} roughness={0.5} />
        </mesh>
      ))}
    </group>
  )
}

function PumpGeometry({ impeller }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2.6, 1.0, 2.0]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.7} metalness={0.15} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.85, 0.85, 1.1, 24]} />
        <meshStandardMaterial color="#31414f" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 1.4, 1.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 1.4, 20]} />
        <meshStandardMaterial color={C.steel} metalness={0.15} roughness={0.4} />
      </mesh>
      <mesh ref={impeller} position={[0, 2.05, 0]}>
        <boxGeometry args={[0.6, 0.14, 0.14]} />
        <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function CompressorGeometry({ piston }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[4.0, 1.0, 2.6]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.7} />
      </mesh>
      <mesh position={[-0.9, 1.6, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 1.4, 24]} />
        <meshStandardMaterial color="#31414f" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[1.1, 1.5, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 1.2, 20]} />
        <meshStandardMaterial color={C.steel} metalness={0.15} roughness={0.4} />
      </mesh>
      <mesh ref={piston} position={[1.1, 2.3, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.7, 16]} />
        <meshStandardMaterial color="#43586b" metalness={0.15} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.6, -0.8]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.09, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#43586b" metalness={0.15} roughness={0.5} />
      </mesh>
    </group>
  )
}

function MotorGeometry({ shaft, shaft2 }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[2.4, 0.8, 1.9]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.85, 0.85, 2.2, 28]} />
        <meshStandardMaterial color="#33455a" metalness={0.15} roughness={0.45} />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, 1.35, 0.95 - i * 0.28]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[2.3, 0.06, 0.12]} />
          <meshStandardMaterial color="#3f5470" metalness={0.15} roughness={0.4} />
        </mesh>
      ))}
      <mesh ref={shaft} position={[1.45, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.9, 14]} />
        <meshStandardMaterial color="#8fa8bd" metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh ref={shaft2} position={[-1.45, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.9, 14]} />
        <meshStandardMaterial color="#8fa8bd" metalness={0.15} roughness={0.45} />
      </mesh>
    </group>
  )
}

function RobotGeometry({ joints, variant = 0 }) {
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.9, 1.1, 0.6, 24]} />
        <meshStandardMaterial color={C.steelDark} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh ref={joints.turret} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.7, 24]} />
        <meshStandardMaterial color="#2e3d4c" metalness={0.15} roughness={0.5} />
      </mesh>
      <group ref={joints.shoulder} position={[0, 1.25, 0]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[0.45, 1.5, 0.45]} />
          <meshStandardMaterial color="#35485c" metalness={0.15} roughness={0.4} />
        </mesh>
        <group ref={joints.elbow} position={[0, 1.45, 0]}>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[0.35, 1.15, 0.35]} />
            <meshStandardMaterial color="#3d5470" metalness={0.15} roughness={0.4} />
          </mesh>
          <group ref={joints.wrist} position={[0, 1.15, 0]}>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.26, 0.45, 0.26]} />
              <meshStandardMaterial color="#8fa8bd" metalness={0.15} roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.55, 0]}>
              <coneGeometry args={[0.16, 0.4, 12]} />
              <meshStandardMaterial
                color={variant === 1 ? '#fbbf24' : C.accent}
                emissive={variant === 1 ? '#fbbf24' : C.accent}
                emissiveIntensity={0.35}
              />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  )
}

function CellGeometry() {
  return (
    <group>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[5.6, 3.0, 4.4]} />
        <meshStandardMaterial color="#26374a" roughness={0.8} metalness={0.35} />
      </mesh>
      <mesh position={[0, 2.1, -2.21]}>
        <boxGeometry args={[4.6, 0.9, 0.05]} />
        <meshStandardMaterial color="#0e2a38" emissive="#0d5d7a" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 3.12, 0]}>
        <boxGeometry args={[4.8, 0.06, 0.4]} />
        <meshStandardMaterial color={C.accent} emissive={C.accent} emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ── animated risk column (liquid bar above machine) ──────────────────────
function RiskColumn({ risk, state, selected, w }) {
  const fillRef = useRef()
  const H = 2.6
  useFrame(({ clock }) => {
    if (!fillRef.current) return
    const t = clock.getElapsedTime()
    const jitter = state === 'high' ? Math.sin(t * 7) * 0.04 + Math.sin(t * 13.7) * 0.02 : Math.sin(t * 1.2) * 0.008
    const level = (risk / 100) * H + jitter
    fillRef.current.scale.y = Math.max(level, 0.06)
    fillRef.current.position.y = level / 2
    const mat = fillRef.current.material
    mat.emissiveIntensity = state === 'high' ? 1.1 + Math.sin(t * 5) * 0.5 : 0.55 + Math.sin(t * 1.4) * 0.15
  })
  const color = stateColor(state)
  return (
    <group position={[Math.max(w, 2.4) / 2 + 0.7, 0, 0]}>
      {/* glass tube */}
      <mesh position={[0, H / 2, 0]}>
        <cylinderGeometry args={[0.09, 0.09, H, 8]} />
        <meshStandardMaterial color="#1a2734" transparent opacity={0.35} roughness={0.2} metalness={0.1} />
      </mesh>
      <mesh ref={fillRef}>
        <cylinderGeometry args={[0.055, 0.055, 1, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.9} />
      </mesh>
    </group>
  )
}

// ── danger holo-cage for high-risk machines ──────────────────────────────
function HoloCage({ color = '#f87171' }) {
  const ref = useRef()
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(4.4, 3.6, 3.6)), [])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.rotation.y = t * 0.3
    ref.current.material.opacity = 0.18 + Math.sin(t * 2.4) * 0.08
  })
  return (
    <group position={[0, 1.9, 0]}>
      <lineSegments ref={ref} geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

// ── IoT sensor puck + expanding pulse ring ──────────────────────────────────────────
function SensorNode({ state, selected }) {
  const ringRef = useRef()
  const active = state === 'high' || state === 'failure' || selected
  useFrame(({ clock }) => {
    if (!ringRef.current) return
    const t = clock.getElapsedTime()
    const u = (t * 0.7) % 1
    ringRef.current.scale.setScalar(0.4 + u * (active ? 1.8 : 0.8))
    ringRef.current.material.opacity = (1 - u) * (active ? 0.5 : 0.18)
  })
  const color = stateColor(state)
  return (
    <group position={[0, 0.06, 0]}>
      <mesh>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.4 : 0.7} />
      </mesh>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// ── status beacon ─────────────────────────────────────────────────────────
function Beacon({ state, selected }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const speed = state === 'high' || state === 'failure' ? 9 : 3
    ref.current.material.emissiveIntensity = 1.2 + Math.sin(clock.getElapsedTime() * speed) * 0.8
  })
  const color = stateColor(state)
  return (
    <group position={[0, 3.6, 0]}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>
      <pointLight color={color} intensity={selected ? 3 : 1.1} distance={6} />
    </group>
  )
}

// ── interactive machine node ──────────────────────────────────────────────
export function MachineNode({ machine }) {
  const { id, name, role, kind, state, risk, pos, size } = machine
  const selected = useStore((s) => s.selectedId === id)
  const hovered = useStore((s) => s.hoverId === id)
  const cascadeDepth = useStore((s) => {
    if (!s.cascadeRevealed.includes(id)) return null
    const n = s.cascadeResult?.nodes.find((x) => x.machineId === id)
    return n ? n.depth : null
  })

  const belt = useRef()
  const shaft = useRef()
  const shaft2 = useRef()
  const turret = useRef()
  const shoulder = useRef()
  const elbow = useRef()
  const wrist = useRef()
  const piston = useRef()
  const impeller = useRef()
  const outline = useRef()

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    const spin = state === 'high' ? 2.2 : state === 'failure' ? 0.15 : 1
    if (shaft.current) shaft.current.rotation.x += delta * 10 * spin
    if (shaft2.current) shaft2.current.rotation.x += delta * 10 * spin
    if (turret.current) turret.current.rotation.y = Math.sin(t * 0.7 + pos.x) * 0.7
    if (shoulder.current) shoulder.current.rotation.z = Math.sin(t * 0.9 + pos.z) * 0.25
    if (elbow.current) elbow.current.rotation.z = Math.sin(t * 1.3) * 0.35 - 0.2
    if (wrist.current) wrist.current.rotation.z = Math.sin(t * 2.1) * 0.5
    if (piston.current) piston.current.position.y = 2.3 + Math.sin(t * 6) * 0.15
    if (impeller.current) impeller.current.rotation.y += delta * 4
    if (outline.current) {
      const target = selected || hovered || cascadeDepth !== null
      const o = outline.current.material
      o.opacity = lerp(o.opacity, target ? (cascadeDepth !== null ? 0.5 : 0.32) : 0, delta * 6)
      const sc = lerp(outline.current.scale.x, target ? 1.06 : 1, delta * 6)
      outline.current.scale.setScalar(sc)
    }
  })

  const strokeColor = cascadeDepth !== null ? C.accent : stateColor(state)
  const maintenance = state === 'maintenance'

  return (
    <group position={[pos.x, 0, pos.z]}>
      {/* pointer hit zone */}
      <mesh
        position={[0, size.h / 2 + 0.5, 0]}
        onPointerOver={(e) => { e.stopPropagation(); setHover(id) }}
        onPointerOut={() => setHover(null)}
        onClick={(e) => { e.stopPropagation(); selectMachine(id) }}
      >
        <boxGeometry args={[Math.max(size.w, 2.8), size.h + 1.2, Math.max(size.d, 2.6)]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>

      {/* base ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[Math.max(size.w, size.d) * 0.62, Math.max(size.w, size.d) * 0.62 + 0.14, 48]} />
        <meshBasicMaterial
          color={selected || hovered ? C.accent : strokeColor}
          transparent
          opacity={selected || hovered ? 0.85 : 0.22}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* digital-twin outline */}
      <mesh ref={outline} position={[0, size.h / 2, 0]}>
        <boxGeometry args={[size.w + 0.7, size.h + 0.7, size.d + 0.7]} />
        <meshBasicMaterial color={strokeColor} transparent opacity={0} side={THREE.BackSide} />
      </mesh>

      {maintenance && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
          <ringGeometry args={[1.6, 1.85, 48]} />
          <meshBasicMaterial color={C.accent} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {kind === 'conveyor' && <ConveyorGeometry belt={belt} />}
      {kind === 'pump' && <PumpGeometry impeller={impeller} />}
      {kind === 'compressor' && <CompressorGeometry piston={piston} />}
      {kind === 'motor' && <MotorGeometry shaft={shaft} shaft2={shaft2} />}
      {kind === 'robot' && <RobotGeometry joints={{ turret, shoulder, elbow, wrist }} variant={id === 'M-07' ? 1 : 0} />}
      {kind === 'cell' && <CellGeometry />}

      <RiskColumn risk={risk} state={state} selected={selected} w={size.w} />
      {state === 'high' && <HoloCage />}

      <SensorNode state={state} selected={selected} />
      <Beacon state={state} selected={selected || cascadeDepth !== null} />

      {/* label */}
      <Html position={[0, 4.15, 0]} center distanceFactor={26} zIndexRange={[10, 0]}>
        <div
          className={`pointer-events-none select-none px-2 py-1 border whitespace-nowrap ${selected ? 'border-sky-400/70' : 'border-[#24344499]'}`}
          style={{ background: 'rgba(7,12,18,0.78)', fontSize: 10, letterSpacing: '0.1em' }}
        >
          <span style={{ color: strokeColor }}>●</span>{' '}
          <span className="text-[#e8f1f8]">{id}</span>
          <span className="text-[#7d92a5]"> · {name.toUpperCase()}</span>
          <span style={{ color: strokeColor }}> · {risk}%</span>
        </div>
      </Html>
    </group>
  )
}
