/** FactoryScene shell — canvas, environment, links, camera rig, overlays. */

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, Line, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store/useStore.js'
import { MachineNode, stateColor } from './machines.jsx'
import { STATE_COLORS, STATE_LABELS } from '../components/ui.jsx'

// ── floor ─────────────────────────────────────────────────────────────────
function Floor() {
  const pulseRef = useRef()
  useFrame(({ clock }) => {
    if (!pulseRef.current) return
    const u = (clock.getElapsedTime() * 0.25) % 1
    pulseRef.current.scale.setScalar(0.4 + u * 3.4)
    pulseRef.current.material.opacity = (1 - u) * 0.35
  })
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[90, 60]} />
        <meshStandardMaterial color="#0c1420" roughness={0.85} metalness={0.35} />
      </mesh>
      <gridHelper args={[90, 45, '#1b2c3c', '#1b2c3c']} position={[0, 0.01, 0]} />
      <gridHelper args={[90, 9, '#26405a', '#26405a']} position={[0, 0.02, 0]} />
      {/* expanding activation pulse from the plant core */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[4.4, 4.6, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* accent lane markings along the production spine */}
      {[-3.2, 3.2].map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, z]}>
          <planeGeometry args={[62, 0.08]} />
          <meshBasicMaterial color="#1e4258" transparent opacity={0.65} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

// ── animated flow link between machines ───────────────────────────────────
function FlowLink({ fromId, toId, kind, active, alert }) {
  const fromM = useStore((s) => s.machines.find((m) => m.id === fromId))
  const toM = useStore((s) => s.machines.find((m) => m.id === toId))
  const packetsRef = useRef()
  const PKTS = 4

  const curve = useMemo(() => {
    if (!fromM || !toM) return null
    const a = new THREE.Vector3(fromM.pos.x, 0.6, fromM.pos.z)
    const b = new THREE.Vector3(toM.pos.x, 0.6, toM.pos.z)
    const mid = a.clone().lerp(b, 0.5)
    mid.y += 1.6
    return new THREE.QuadraticBezierCurve3(a, mid, b)
  }, [fromM, toM])

  useFrame(({ clock }) => {
    if (!packetsRef.current || !curve) return
    const t = clock.getElapsedTime() * (alert ? 0.5 : 0.14)
    const children = packetsRef.current.children
    for (let i = 0; i < children.length; i++) {
      const u = (t + i / PKTS) % 1
      curve.getPoint(u, children[i].position)
      children[i].material.opacity = alert ? 0.95 : active ? 0.75 : 0.35
    }
  })

  if (!curve) return null
  const pts = curve.getPoints(40)
  return (
    <group>
      <Line
        points={pts}
        color={alert ? STATE_COLORS.failure : active ? '#38bdf8' : '#2c4a60'}
        lineWidth={alert ? 2 : 1}
        transparent
        opacity={alert ? 0.85 : 0.45}
      />
      <group ref={packetsRef}>
        {Array.from({ length: PKTS }).map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[alert ? 0.16 : 0.11, 8, 8]} />
            <meshBasicMaterial color={alert ? '#f87171' : '#38bdf8'} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

// ── camera rig with cinematic focus ───────────────────────────────────────
function CameraRig() {
  const focusId = useStore((s) => s.focusId)
  const machines = useStore((s) => s.machines)
  const machine = machines.find((m) => m.id === focusId)
  const home = useMemo(() => new THREE.Vector3(2, 18, 26), [])
  const goal = useMemo(() => {
    if (machine) return new THREE.Vector3(machine.pos.x * 0.8, 6.2, machine.pos.z * 0.8 + 10.5)
    return home
  }, [machine, home])
  const current = useRef(home.clone())
  // subtle idle drift + pointer parallax, bounded around the framing goal
  const drift = useRef({ x: 0, y: 0 })
  useFrame(({ camera, pointer, clock }, delta) => {
    current.current.lerp(goal, 1 - Math.exp(-2.4 * delta))
    const t = clock.getElapsedTime()
    const tx = Math.sin(t * 0.11) * 0.35 + pointer.x * 0.9
    const ty = Math.sin(t * 0.07 + 1) * 0.2 - pointer.y * 0.55
    drift.current.x = THREE.MathUtils.lerp(drift.current.x, tx, delta * 1.5)
    drift.current.y = THREE.MathUtils.lerp(drift.current.y, ty, delta * 1.5)
    camera.position.set(
      current.current.x + drift.current.x,
      current.current.y + drift.current.y,
      current.current.z,
    )
    camera.lookAt(machine ? machine.pos.x * 0.5 : 0, 1.2, machine ? machine.pos.z * 0.5 : 2)
  })
  return null
}

// ── atmospheric dust: instanced additive motes ────────────────────────────
function Dust({ count = 80 }) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 70,
      y: Math.random() * 9 + 0.5,
      z: (Math.random() - 0.5) * 45,
      s: 0.03 + Math.random() * 0.05,
      ph: Math.random() * Math.PI * 2,
    })),
    [count],
  )
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    seeds.forEach((d, i) => {
      const y = ((d.y + t * 0.12 + Math.sin(t * 0.4 + d.ph) * 0.3) % 9.5) + 0.4
      dummy.position.set(d.x, y, d.z)
      dummy.rotation.set(t * 0.3 + d.ph, t * 0.2, 0)
      dummy.scale.setScalar(d.s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#7fb3d8" transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} />
    </instancedMesh>
  )
}


// ── hover tooltip in 3D ───────────────────────────────────────────────────
function HoverCard() {
  const hoverId = useStore((s) => s.hoverId)
  const machines = useStore((s) => s.machines)
  const m = machines.find((x) => x.id === hoverId)
  if (!m) return null
  return (
    <Html position={[m.pos.x, 4.9, m.pos.z]} center distanceFactor={22} zIndexRange={[20, 0]}>
      <div className="panel-corner panel px-3 py-2 pointer-events-none whitespace-nowrap" style={{ fontSize: 11 }}>
        <div className="hud-label">{m.role}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-semibold text-[#e8f1f8]">{m.id} {m.name}</span>
          <span style={{ color: stateColor(m.state) }}>{STATE_LABELS[m.state]}</span>
          <span className="text-[#7d92a5]">·</span>
          <span style={{ color: stateColor(m.state) }}>risk {m.risk}%</span>
        </div>
      </div>
    </Html>
  )
}

// ── cascade marker at revealed machines ───────────────────────────────────
function CascadeMarker({ machineId }) {
  const machines = useStore((s) => s.machines)
  const m = machines.find((x) => x.id === machineId)
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * 2.2
    ref.current.scale.setScalar(1 + (t % 1) * 2.4)
    ref.current.material.opacity = (1 - (t % 1)) * 0.65
  })
  if (!m) return null
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[m.pos.x, 0.05, m.pos.z]}>
      <ringGeometry args={[2.6, 2.85, 48]} />
      <meshBasicMaterial color="#f87171" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  )
}

// ── safety zones around M-04 (Safety view) ────────────────────────────────
function SafetyZones() {
  const machines = useStore((s) => s.machines)
  const m04 = machines.find((m) => m.id === 'M-04')
  if (!m04) return null
  const zones = [
    { r: 2.4, color: '#f87171', opacity: 0.2 },
    { r: 4.6, color: '#fbbf24', opacity: 0.12 },
    { r: 7.5, color: '#34d399', opacity: 0.07 },
  ]
  return (
    <group position={[m04.pos.x, 0, m04.pos.z]}>
      {zones.map((z, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03 + i * 0.001, 0]}>
          <ringGeometry args={[z.r - 0.5, z.r, 64]} />
          <meshBasicMaterial color={z.color} transparent opacity={z.opacity} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <Text
        position={[0, 0.1, 8.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.65}
        color="#46586a"
        anchorX="center"
        letterSpacing={0.24}
      >
        RESTRICTED · WARNING · SAFE
      </Text>
    </group>
  )
}

// ── lights + overhead gantry structures ───────────────────────────────────
function SceneLights() {
  const gantryRef = useRef()
  useFrame(({ clock }) => {
    if (!gantryRef.current) return
    const t = clock.getElapsedTime()
    // light rigs sweep slowly like patrol lamps over the line
    gantryRef.current.children.forEach((c, i) => {
      c.position.x = Math.sin(t * 0.16 + i * 2.2) * 16
    })
  })
  return (
    <>
      <ambientLight intensity={1.55} color="#a8c2d8" />
      <hemisphereLight args={['#31506e', '#0d1420', 1.0]} />
      <directionalLight position={[18, 26, 12]} intensity={1.9} color="#d8ecff" />
      <directionalLight position={[-6, 9, 26]} intensity={0.85} color="#8ecff0" />
      <directionalLight position={[-16, 12, -18]} intensity={0.7} color="#7dd3fc" />
      <pointLight position={[0, 7, 0]} intensity={1.3} color="#38bdf8" distance={26} />
      {/* overhead truss with moving work lights */}
      <group position={[0, 10.2, -2]}>
        {[-20, 0, 20].map((x, i) => (
          <mesh key={i} position={[x, 0, 0]}>
            <boxGeometry args={[0.5, 0.28, 26]} />
            <meshStandardMaterial color="#1c2b3d" roughness={0.75} metalness={0.4} />
          </mesh>
        ))}
        <group ref={gantryRef}>
          {[-1, 1].map((s, i) => (
            <group key={i} position={[s * 8, -0.4, 0]}>
              <mesh>
                <boxGeometry args={[1.7, 0.22, 2.6]} />
                <meshStandardMaterial color="#20303f" metalness={0.3} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.16, 0]}>
                <boxGeometry args={[1.3, 0.06, 2.2]} />
                <meshStandardMaterial color="#bfe4ff" emissive="#7dd3fc" emissiveIntensity={1.6} />
              </mesh>
              <pointLight color="#9fd8ff" intensity={1.4} distance={20} decay={2} />
            </group>
          ))}
        </group>
      </group>
      {/* distant perimeter columns for depth */}
      {[[-34, -18], [-34, 6], [34, -18], [34, 6]].map(([x, z], i) => (
        <mesh key={i} position={[x, 4.5, z]}>
          <boxGeometry args={[0.9, 9, 0.9]} />
          <meshStandardMaterial color="#131e2b" roughness={0.85} metalness={0.25} />
        </mesh>
      ))}
    </>
  )
}

// ── elevated service pipes crossing the plant ─────────────────────────────
function PipeRack() {
  return (
    <group position={[0, 5.4, -16]}>
      {[-18, -6, 6, 18].map((x, i) => (
        <mesh key={i} position={[x, -1.6, 0]}>
          <boxGeometry args={[0.28, 3.6, 0.28]} />
          <meshStandardMaterial color="#152030" metalness={0.3} roughness={0.7} />
        </mesh>
      ))}
      {[
        { y: 0.55, r: 0.18, c: '#3f5470' },
        { y: 0.15, r: 0.24, c: '#33465c' },
        { y: -0.3, r: 0.14, c: '#4a5d75' },
      ].map((p, i) => (
        <mesh key={i} position={[0, p.y, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[p.r, p.r, 78, 14]} />
          <meshStandardMaterial color={p.c} metalness={0.35} roughness={0.5} />
        </mesh>
      ))}
      {/* flow indicator lights travelling the rack */}
      <PipeDots />
    </group>
  )
}

function PipeDots() {
  const ref = useRef()
  const N = 7
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((m, i) => {
      const u = ((t * 0.06 + i / N) % 1) * 78 - 39
      m.position.x = u
      m.material.opacity = 0.35 + Math.sin(t * 2 + i) * 0.25
    })
  })
  return (
    <group ref={ref}>
      {Array.from({ length: N }).map((_, i) => (
        <mesh key={i} position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  )
}

// ── far-wall industrial silhouettes: tanks, stack, rotating vent fan ─────
function BackWallProps() {
  const fan = useRef()
  useFrame(({ clock }, delta) => {
    if (fan.current) fan.current.rotation.z += delta * 1.6
  })
  return (
    <group position={[0, 0, -26]}>
      {/* cylindrical storage tanks with catwalk rail */}
      {[{ x: -26, r: 4.2, h: 7.5 }, { x: -14, r: 3.2, h: 6 }, { x: 16, r: 3.6, h: 6.8 }].map((t, i) => (
        <group key={i} position={[t.x, 0, 0]}>
          <mesh position={[0, t.h / 2, 0]}>
            <cylinderGeometry args={[t.r, t.r, t.h, 28]} />
            <meshStandardMaterial color="#101c29" roughness={0.85} metalness={0.25} />
          </mesh>
          <mesh position={[0, t.h + 0.12, 0]}>
            <cylinderGeometry args={[t.r * 0.55, t.r, 0.5, 28]} />
            <meshStandardMaterial color="#152433" roughness={0.85} metalness={0.25} />
          </mesh>
          <mesh position={[0, t.h * 0.78, 0]}>
            <torusGeometry args={[t.r + 0.06, 0.07, 8, 40]} />
            <meshStandardMaterial color="#1c2d3f" metalness={0.3} roughness={0.6} />
          </mesh>
        </group>
        ))}
      {/* exhaust stack with blinking aviation light */}
      <group position={[2, 0, -4]}>
        <mesh position={[0, 5.5, 0]}>
          <cylinderGeometry args={[0.7, 1.15, 11, 20]} />
          <meshStandardMaterial color="#0f1a26" roughness={0.9} metalness={0.2} />
        </mesh>
        <mesh position={[0, 11.2, 0]}>
          <sphereGeometry args={[0.22, 10, 10]} />
          <meshStandardMaterial color="#f87171" emissive="#f87171" emissiveIntensity={1.2} />
        </mesh>
        <pointLight color="#f87171" intensity={0.5} distance={6} position={[0, 11.2, 0]} />
      </group>
      {/* wall-mounted extraction fan — the spinning industrial vent */}
      <group position={[-4, 5.2, 0.4]}>
        <mesh>
          <cylinderGeometry args={[2.3, 2.3, 0.5, 28]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial color="#0d1721" metalness={0.35} roughness={0.6} />
        </mesh>
        <group ref={fan} position={[0, 0, 0.35]} rotation={[0, 0, 0]}>
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI * 2) / 5]}>
              <boxGeometry args={[1.9, 0.34, 0.08]} />
              <meshStandardMaterial color="#2c4256" metalness={0.4} roughness={0.5} />
            </mesh>
          ))}
        </group>
        <mesh position={[0, 0, 0.42]}>
          <torusGeometry args={[2.35, 0.1, 10, 36]} rotation={[0, 0, 0]} />
          <meshStandardMaterial color="#22384c" metalness={0.4} roughness={0.5} />
        </mesh>
      </group>
      {/* overhead duct run crossing the wall */}
      {[
        { y: 8.2, r: 0.5, x: 0, len: 66 },
        { y: 8.2, r: 0.34, x: 0, len: 66 },
      ].map((d, i) => (
        <mesh key={i} position={[d.x, d.y, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[d.r, d.r, d.len, 16]} />
          <meshStandardMaterial color="#14222f" metalness={0.35} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

// ── rotating radar sweep + scanning holo-ring (environment sensor) ────────
function RadarSweep() {
  const cone = useRef()
  const ring = useRef()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (cone.current) cone.current.rotation.z = -t * 0.55
    if (ring.current) {
      ring.current.rotation.y = t * 0.12
      const s = 1 + Math.sin(t * 0.9) * 0.04
      ring.current.scale.setScalar(s)
    }
  })
  return (
    <group position={[-24, 0, 14]}>
      {/* mast */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.09, 0.14, 6, 10]} />
        <meshStandardMaterial color="#1b2836" metalness={0.4} roughness={0.5} />
      </mesh>
      <group position={[0, 6.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.3, 6]} />
          <meshStandardMaterial color="#27384a" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh ref={cone} rotation={[0, 0, 0]} position={[0, 0, 0]}>
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.07} side={THREE.DoubleSide} depthWrite={false} />
          <circleGeometry args={[7, 32, 0, Math.PI / 5]} />
        </mesh>
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.9, 0]}>
          <ringGeometry args={[6.6, 6.85, 64]} />
          <meshBasicMaterial color="#164e63" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </group>
    </group>
  )
}

// ── exported scene ────────────────────────────────────────────────────────
export default function FactoryScene({ compact = false }) {
  const machines = useStore((s) => s.machines)
  const links = useStore((s) => s.links)
  const view = useStore((s) => s.view)
  const cascadeRevealed = useStore((s) => s.cascadeRevealed)
  const cascadeResult = useStore((s) => s.cascadeResult)
  const scenarioMode = useStore((s) => s.scenarioMode)

  const cascadeNodes = cascadeResult?.nodes ?? []
  const isAlertLink = (l) =>
    cascadeRevealed.length > 1 &&
    cascadeNodes.some((n, i) => i > 0 && cascadeNodes[i - 1].machineId === l.from && n.machineId === l.to)

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{ position: [2, 17, 24], fov: 42, near: 0.1, far: 220 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
      onCreated={({ scene }) => { window.__three_scene = scene }}
    >
      <fog attach="fog" args={['#07101a', 38, 105]} />
      <SceneLights />
      <BackWallProps />
      <PipeRack />
      <RadarSweep />
      <Floor />
      <Dust count={compact ? 40 : 90} />

      {links.map((l, i) => (
        <FlowLink
          key={i}
          fromId={l.from}
          toId={l.to}
          kind={l.kind}
          active={scenarioMode === 'baseline'}
          alert={isAlertLink(l)}
        />
      ))}

      {machines.map((m) => <MachineNode key={m.id} machine={m} />)}

      {cascadeRevealed.slice(1).map((id) => (
        <CascadeMarker key={id} machineId={id} />
      ))}

      {view === 'safety' && <SafetyZones />}
      <HoverCard />
      <CameraRig />
    </Canvas>
  )
}
