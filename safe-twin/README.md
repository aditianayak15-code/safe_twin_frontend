# SAFE-TWIN

**AI Failure Cascade & Safe Maintenance Planning**

A cinematic, interactive Industry 5.0 digital-twin experience. SAFE-TWIN monitors an
industrial production cell as a live 3D digital twin, detects machine-health anomalies,
predicts failures, analyzes how one failure cascades through connected assets, estimates
production impact and worker exposure, and guides operators to safer maintenance
decisions — with the human always in the loop.

> Built as a hackathon-grade product demo. The factory is alive: machines move, sensors
> pulse, telemetry streams, and data flows between assets in real time.

---

## ✨ Features

### 3D Digital Twin (the centerpiece)
- Interactive factory floor rendered with **React Three Fiber + drei**: conveyor, pumps,
  compressor, motor, two robots, and an exit cell connected by animated data-flow links
- Continuous ambient motion — rotating shafts, moving conveyor stripes, robotic arms,
  sweeping overhead gantry lights, spinning extraction fan, pipe-rack flow indicators,
  radar sweep, atmospheric dust, floor activation pulse
- Every machine is **hoverable and clickable**: hover for a status tooltip, click to
  focus the camera, highlight the asset, and open its detail panel
- Machine-state visual language: green (normal) → amber pulse (warning) → red holo-cage
  + jittering risk column (high risk) → maintenance ring
- **Animated risk columns** above each machine show live risk level at a glance
- Cinematic background: industrial hall gradient, drifting floor grid, back-wall
  storage tanks, exhaust stack, and camera drift + pointer parallax
- SVG 2D digital-twin fallback when WebGL is unavailable; honors
  `prefers-reduced-motion`

### Live risk cards (HUD)
1. **Machines Monitored** — expandable roster of all assets; click a machine to focus
   it in the twin
2. **High-Risk Assets** — M-04 bearing failure at 87%; links the card to the machine
3. **Cascade Risk** — production impact, assets hit, severity, trigger machine
4. **Worker Exposure** — exposure level, current intervention, safety score

### Machine detail panel
Click any machine (or the high-risk card) for live telemetry (temperature, vibration,
torque, RPM), failure-risk gauge, predicted failure mode with time horizon, and
shortcuts to cascade analysis and scenarios.

### Telemetry view
Streaming **ECharts** time-series for temperature and vibration plus live numeric
gauges. Simulated stream generated in the service layer — structured for a drop-in
real backend.

### Failure Cascade Analysis
The signature interaction. **Analyze Failure Cascade** runs a cinematic reveal of the
propagation graph `M-04 → M-07 → M-09 → M-16 → Production Loss`, then shows an animated
impact summary (machines affected, production impact, cascade probability, severity,
worker exposure). **Run Simulation** replays the cascade as a 7-step digital-twin
experiment over the real factory topology with a step-by-step log.

### Scenarios
Compare **Immediate / Scheduled / Delayed** maintenance interventions across failure
risk, cascade risk, production impact, worker exposure, and safety implications. The
3D factory changes state to match the selected scenario.

### Safety view
Worker exposure monitoring, safety score, **SAFE / WARNING / RESTRICTED** zones drawn
around the high-risk machine in 3D, and the human-approval workflow:
AI analysis → recommendation → human review → approval → LOTO maintenance action.

### AI Safety Copilot
A panel that answers: *What happened? Why? What could happen next? Which assets are
affected? What should the operator consider?* Clearly labeled as simulated reasoning
on demo data until a real model is connected.

### History
Interactive timeline of incidents, predictions, cascade analyses, scenario
evaluations, and human approvals.

---

## 🏗️ Architecture

```
safe-twin/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                  # entry
    ├── App.jsx                   # shell: persistent 3D layer + view router
    ├── index.css                 # design system (Tailwind v4 theme + HUD components)
    ├── data/
    │   ├── types.js              # canonical data shapes
    │   └── mockData.js           # demo dataset (machines, links, cascade, scenarios…)
    ├── services/
    │   ├── api.js                # THE data boundary — swap for a real backend here
    │   └── telemetryHistory.js   # streaming telemetry generator
    ├── store/
    │   └── useStore.js           # Zustand global state + simulation engine
    ├── scene/
    │   ├── FactoryScene.jsx      # R3F canvas, environment, links, camera rig
    │   └── machines.jsx          # procedural machine geometries + interaction
    ├── components/
    │   ├── TopBar.jsx            # system status bar
    │   ├── BottomNav.jsx         # view navigation
    │   ├── RiskCards.jsx         # four live monitoring cards
    │   ├── MachinePanel.jsx      # machine detail side panel
    │   ├── Copilot.jsx           # AI Safety Copilot
    │   └── ui.jsx                # shared primitives + state color language
    ├── views/
    │   ├── TelemetryView.jsx
    │   ├── CascadeView.jsx
    │   ├── ScenariosView.jsx
    │   ├── SafetyView.jsx
    │   └── HistoryView.jsx
    └── utils/
        └── math.js               # lerp + helpers
```

### Data flow

```
mockData.js ──► api.js (async service layer) ──► useStore.js ──► components / scene / views
                     ▲
        real backend plugs in here (same interface)
```

- **UI never touches mock data directly.** Every read/write goes through `services/api.js`
  and the Zustand store, so the demo dataset can be replaced by a real API/ML engine
  without touching components.
- The store also runs the **live simulation loop**: telemetry ticking, clock, cascade
  step sequencing, and scenario state.

### Tech stack

React 19 · Vite · Tailwind CSS v4 · Zustand · React Three Fiber + drei (Three.js) ·
ECharts · Motion (framer) · Lucide icons

---

## 🚀 Getting started

```bash
cd safe-twin
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run build      # production build (dist/)
npm run preview    # serve the production build locally
npm run lint       # oxlint
```

### The 60-second demo flow

1. Open the app — the factory boots up with system status (frontend, backend, ML
   engine, digital twin, database all online)
2. Watch **M-04 Motor** escalate to high risk (87%, red holo-cage)
3. Click **M-04** → telemetry, predicted bearing failure ~2 hours
4. **View Cascade** → **Analyze Failure Cascade** → cinematic propagation
   M-04 → M-07 → M-09 → M-16 → Production Loss
5. Impact summary animates in: 4 machines, 68% production impact, Medium severity
6. **Run Simulation** → step-by-step digital-twin experiment
7. **Scenarios** → compare immediate vs scheduled vs delayed maintenance
8. **Safety** → review exposure zones → approve the LOTO intervention plan
9. **History** → the whole incident recorded on the timeline

---

## 🔌 Backend integration

The service layer (`src/services/api.js`) is the single integration point. It exposes
async methods shaped for these eventual endpoints:

| Service call          | Future endpoint                  |
| --------------------- | -------------------------------- |
| `fetchMachines`       | `GET /api/machines`              |
| `fetchTelemetry`      | `GET /api/machines/:id/telemetry`|
| `fetchPrediction`     | `GET /api/machines/:id/prediction`|
| `analyzeCascade`      | `POST /api/cascade/analyze`      |
| `runCascadeSimulation`| `POST /api/cascade/simulate`     |
| `fetchScenarios`      | `GET /api/scenarios`             |
| `fetchSafetyStatus`   | `GET /api/safety`                |
| `fetchHistory`        | `GET /api/history`               |
| `submitApproval`      | `POST /api/approvals`            |

Replace the mock implementations with real `fetch` calls; no component changes needed.

---

## 📐 Design notes

- **Industrially restrained**: risk is visually meaningful — not everything glows.
  Normal state is calm; warnings amber-pulse; high risk earns the red holo-cage.
- **Human-centric (Industry 5.0)**: the AI never acts alone — approval is an explicit,
  visible human step.
- **Performance**: instanced particles, procedural geometry (no external assets),
  lazy heavy views, reduced-motion support, and a 2D fallback if WebGL is missing.
