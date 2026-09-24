"""
SAFE-TWIN BACKEND — FastAPI service for the digital-twin frontend.

Built on the AI4I 2020 Predictive Maintenance Dataset (ai4i2020.csv):
    UDI, Product ID, Type, Air temperature [K], Process temperature [K],
    Rotational speed [rpm], Torque [Nm], Tool wear [min], Machine failure,
    TWF, HDF, PWF, OSF, RNF

Endpoints (all consumed by safe-twin/src/services/api.js):
    GET  /api/health
    GET  /api/machines
    GET  /api/machines/{id}
    GET  /api/machines/{id}/telemetry
    GET  /api/machines/{id}/risk
    GET  /api/machines/{id}/scenarios
    GET  /api/cascade?trigger=M-04
    POST /api/cascade/simulate
    POST /api/scenarios/compare
    GET  /api/safety
    GET  /api/history
    GET  /api/status
    POST /api/approval
    # country climate
    GET  /api/climate            ?country=IN  (ambient/setup temperature by country)
    # technician alerting (approach-the-machine workflow)
    GET  /api/technicians
    GET  /api/alerts
    POST /api/alerts/dispatch    {machineId, level, message}
    POST /api/alerts/{id}/ack    {technicianId}
    POST /api/alerts/{id}/arrive {technicianId}
    # maintenance speed reduction
    POST /api/machines/{id}/speed {targetRpm, reason, operator}   (reduce/restore)

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import csv
import random
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "ai4i2020.csv"

app = FastAPI(title="SAFE-TWIN Backend", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── dataset ───────────────────────────────────────────────────────────────
ROWS: list[dict] = []
if DATA_PATH.exists():
    with DATA_PATH.open(encoding="utf-8-sig") as f:
        ROWS = list(csv.DictReader(f))

def _f(row: dict, key: str) -> float:
    return float(row[key])

def _dataset_summary() -> dict:
    """Aggregate the AI4I dataset into per-failure-mode stats used by risk logic."""
    if not ROWS:
        return {}
    n = len(ROWS)
    modes = {"TWF": 0, "HDF": 0, "PWF": 0, "OSF": 0, "RNF": 0}
    failures = 0
    t_sum = t_cnt = 0.0
    for r in ROWS:
        if int(r["Machine failure"]) == 1:
            failures += 1
        for m in modes:
            if int(r[m]) == 1:
                modes[m] += 1
        t_sum += _f(r, "Torque [Nm]"); t_cnt += 1
    return {
        "rows": n,
        "failureRate": round(failures / n * 100, 2),
        "modes": {k: round(v / n * 100, 2) for k, v in modes.items()},
        "torqueMean": round(t_sum / t_cnt, 1),
        "airTempMean": round(sum(_f(r, "Air temperature [K]") for r in ROWS) / n, 1),
        "processTempMean": round(sum(_f(r, "Process temperature [K]") for r in ROWS) / n, 1),
        "rpmMean": round(sum(_f(r, "Rotational speed [rpm]") for r in ROWS) / n, 1),
    }

DATASET = _dataset_summary()

# ── factory model (matches safe-twin/src/data/mockData.js) ────────────────
MACHINES = [
    {"id": "M-01", "name": "Conveyor",   "role": "Infeed conveyor — Section A",   "kind": "conveyor",   "state": "normal",  "risk": 4,  "pos": {"x": -22, "z": 0},  "size": {"w": 14, "d": 3.2, "h": 1.2}, "predicts": []},
    {"id": "M-02", "name": "Pump",       "role": "Coolant circulation pump",      "kind": "pump",       "state": "normal",  "risk": 6,  "pos": {"x": -8, "z": -10}, "size": {"w": 3.4, "d": 2.6, "h": 2.4}, "predicts": []},
    {"id": "M-03", "name": "Compressor", "role": "Plant air compressor",          "kind": "compressor", "state": "warning", "risk": 41, "pos": {"x": -6, "z": 8},   "size": {"w": 4.6, "d": 3.0, "h": 2.8}, "predicts": ["Valve seal degradation"]},
    {"id": "M-04", "name": "Motor",      "role": "Motor / Bearing Assembly",      "kind": "motor",      "state": "high",    "risk": 87, "pos": {"x": 0, "z": 0},    "size": {"w": 3.0, "d": 2.4, "h": 2.2}, "predicts": ["Bearing Failure"]},
    {"id": "M-05", "name": "Robot",      "role": "Assembly robot — Cell 2",       "kind": "robot",      "state": "normal",  "risk": 9,  "pos": {"x": 8, "z": -9},   "size": {"w": 2.2, "d": 2.2, "h": 3.4}, "predicts": []},
    {"id": "M-07", "name": "Robot",      "role": "Welding robot — Line 2",        "kind": "robot",      "state": "warning", "risk": 34, "pos": {"x": 12, "z": 0},   "size": {"w": 2.2, "d": 2.2, "h": 3.4}, "predicts": ["Servo drift"]},
    {"id": "M-09", "name": "Pump",       "role": "Hydraulic power unit",          "kind": "pump",       "state": "normal",  "risk": 5,  "pos": {"x": 12, "z": 10},  "size": {"w": 3.2, "d": 2.6, "h": 2.4}, "predicts": []},
    {"id": "M-16", "name": "Cell",       "role": "Production Line 2 — Exit cell", "kind": "cell",       "state": "normal",  "risk": 3,  "pos": {"x": 24, "z": 0},   "size": {"w": 6, "d": 5, "h": 3.2},     "predicts": []},
]
MACHINE_BY_ID = {m["id"]: m for m in MACHINES}

LINKS = [
    {"from": "M-01", "to": "M-04", "kind": "flow"},
    {"from": "M-04", "to": "M-07", "kind": "flow"},
    {"from": "M-07", "to": "M-16", "kind": "flow"},
    {"from": "M-02", "to": "M-04", "kind": "power"},
    {"from": "M-09", "to": "M-07", "kind": "power"},
    {"from": "M-03", "to": "M-04", "kind": "power"},
    {"from": "M-03", "to": "M-07", "kind": "data"},
]

CASCADE_NODES = [
    {"machineId": "M-04", "depth": 0, "probability": 100, "delaySec": 0,   "impact": 0},
    {"machineId": "M-07", "depth": 1, "probability": 92,  "delaySec": 45,  "impact": 18},
    {"machineId": "M-09", "depth": 2, "probability": 61,  "delaySec": 120, "impact": 12},
    {"machineId": "M-16", "depth": 3, "probability": 78,  "delaySec": 180, "impact": 38},
]

SCENARIOS = [
    {"id": "immediate", "name": "Immediate Maintenance", "tagline": "Controlled stop within the next hour",
     "failureRisk": 12, "cascadeRisk": 2, "productionImpact": 22, "workerExposure": 18, "safetyScore": 91,
     "safetyImplication": "Low", "safetyNote": "Full lockout-tagout during bearing swap; line paused while M-04 is isolated.",
     "recommendation": "Schedule controlled stop, isolate M-04, perform bearing replacement under LOTO with safety engineer sign-off.",
     "recommended": True, "durationHours": "≈ 3 h"},
    {"id": "scheduled", "name": "Scheduled Maintenance", "tagline": "Next planned window, tonight 02:00",
     "failureRisk": 64, "cascadeRisk": 9, "productionImpact": 8, "workerExposure": 24, "safetyScore": 74,
     "safetyImplication": "Medium", "safetyNote": "Machine keeps running until window; rising vibration increases crew risk near cell.",
     "recommendation": "Hold current load, restrict operator access within 2 m of M-04, re-evaluate risk at every shift handover.",
     "recommended": False, "durationHours": "≈ 2 h"},
    {"id": "delayed", "name": "Delayed Maintenance", "tagline": "Defer beyond 8 hours",
     "failureRisk": 94, "cascadeRisk": 71, "productionImpact": 68, "workerExposure": 57, "safetyScore": 41,
     "safetyImplication": "High", "safetyNote": "Uncontrolled failure probable; debris and torque spike expose nearby operators.",
     "recommendation": "Not advised. If deferred, hard-restrict the cell, evacuate non-essential staff and pre-stage spill/containment.",
     "recommended": False, "durationHours": "—"},
]

TECHNICIANS = [
    {"id": "T-01", "name": "R. Kowalski", "team": "Mechanical",     "onShift": True,  "radio": "CH-2"},
    {"id": "T-02", "name": "S. Devi",     "team": "Electrical",     "onShift": True,  "radio": "CH-2"},
    {"id": "T-03", "name": "M. Haddad",   "team": "Instrumentation","onShift": False, "radio": "CH-3"},
]

# ── country climate profiles (ambient / setup temperature) ────────────────
# ISO code → {name, ambientC baseline, humidity%, notes}. Machine setup temperature
# targets adjust with the plant's country so thermal thresholds are realistic.
COUNTRY_CLIMATE = {
    "IN": {"name": "India",        "ambientC": 32, "humidity": 62, "tz": "Asia/Kolkata",  "setupTempC": 38},
    "US": {"name": "United States","ambientC": 22, "humidity": 45, "tz": "America/Chicago","setupTempC": 28},
    "DE": {"name": "Germany",      "ambientC": 14, "humidity": 70, "tz": "Europe/Berlin", "setupTempC": 22},
    "JP": {"name": "Japan",        "ambientC": 20, "humidity": 68, "tz": "Asia/Tokyo",    "setupTempC": 27},
    "BR": {"name": "Brazil",       "ambientC": 27, "humidity": 72, "tz": "America/Sao_Paulo","setupTempC": 33},
    "AE": {"name": "UAE",          "ambientC": 38, "humidity": 40, "tz": "Asia/Dubai",    "setupTempC": 42},
    "GB": {"name": "United Kingdom","ambientC": 12, "humidity": 78,"tz": "Europe/London", "setupTempC": 20},
    "SG": {"name": "Singapore",    "ambientC": 30, "humidity": 84, "tz": "Asia/Singapore","setupTempC": 36},
    "AU": {"name": "Australia",    "ambientC": 24, "humidity": 52, "tz": "Australia/Sydney","setupTempC": 31},
    "ZA": {"name": "South Africa", "ambientC": 23, "humidity": 55, "tz": "Africa/Johannesburg","setupTempC": 30},
}

# ── runtime state ─────────────────────────────────────────────────────────
STATE = {
    "startedAt": time.time(),
    "tick": 0,
    "country": "IN",                       # plant location, drives setup temps
    "speedOverride": {},                   # machineId → {targetRpm, reason, operator, at}
    "approvals": [],                       # human approvals log
    "alerts": [],                          # technician alerts
    "alertSeq": 0,
    "safetyScore": 82,
}

HISTORY_SEED = [
    {"id": "h1", "time": "21:32:04", "kind": "warning",  "title": "M-04 anomaly detected",          "detail": "Vibration signature drifts from baseline on motor bearing assembly.", "machineId": "M-04"},
    {"id": "h2", "time": "21:33:10", "kind": "critical", "title": "Bearing failure predicted",      "detail": "ML engine raises failure risk to 87% — estimated horizon ~2 hours.",  "machineId": "M-04"},
    {"id": "h3", "time": "21:34:26", "kind": "info",     "title": "Cascade analysis completed",     "detail": "4 machines affected, production impact 68%, severity Medium.",        "machineId": None},
    {"id": "h4", "time": "21:35:02", "kind": "info",     "title": "Maintenance scenario evaluated", "detail": "Immediate intervention recommended by planning engine.",              "machineId": "M-04"},
    {"id": "h5", "time": "21:36:44", "kind": "approval", "title": "Human approval recorded",        "detail": "Shift supervisor approved LOTO intervention plan for M-04.",          "machineId": "M-04"},
]
history: list[dict] = list(HISTORY_SEED)

TELEMETRY_BASE = {
    "M-04": [
        {"key": "temperature", "label": "Temperature", "unit": "°C",   "value": 82,   "nominal": 65,   "warnAbove": 78,  "critAbove": 88},
        {"key": "vibration",   "label": "Vibration",   "unit": "mm/s", "value": 7.4,  "nominal": 2.1,  "warnAbove": 4.5, "critAbove": 7.1},
        {"key": "torque",      "label": "Torque",      "unit": "Nm",   "value": 61,   "nominal": 48,   "warnAbove": 58,  "critAbove": 70},
        {"key": "speed",       "label": "Speed",       "unit": "RPM",  "value": 1430, "nominal": 1500, "warnAbove": 1480, "critAbove": 1450},
    ],
    "DEFAULT": [
        {"key": "temperature", "label": "Temperature", "unit": "°C",   "value": 62,   "nominal": 60,   "warnAbove": 78,  "critAbove": 88},
        {"key": "vibration",   "label": "Vibration",   "unit": "mm/s", "value": 2.0,  "nominal": 2,    "warnAbove": 4.5, "critAbove": 7.1},
        {"key": "torque",      "label": "Torque",      "unit": "Nm",   "value": 47,   "nominal": 48,   "warnAbove": 58,  "critAbove": 70},
        {"key": "speed",       "label": "Speed",       "unit": "RPM",  "value": 1490, "nominal": 1500, "warnAbove": 1480, "critAbove": 1450},
    ],
}

# ── helpers ───────────────────────────────────────────────────────────────
def now_hms() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M:%S")

def push_history(kind: str, title: str, detail: str, machine_id: str | None = None) -> dict:
    ev = {"id": f"e{len(history)+1}", "time": now_hms(), "kind": kind, "title": title, "detail": detail, "machineId": machine_id}
    history.append(ev)
    return ev

def apply_country_to_machines() -> None:
    """Adjust machine thermal baselines to the plant country's climate."""
    cc = COUNTRY_CLIMATE.get(STATE["country"], COUNTRY_CLIMATE["IN"])
    delta = cc["ambientC"] - 24  # vs the dataset's ~296K (~23°C) shop floor
    for m in MACHINES:
        m["ambientC"] = cc["ambientC"]
        m["setupTempC"] = cc["setupTempC"]

def risk_from_dataset(machine: dict) -> dict:
    """Blend static demo risk with AI4I dataset statistics for the given machine kind."""
    if not DATASET:
        return {"risk": machine["risk"], "mode": machine["predicts"][0] if machine["predicts"] else None, "horizonHours": None}
    mode_map = {
        "motor": ("TWF", "Tool wear / bearing failure"),
        "pump": ("HDF", "Heat dissipation failure"),
        "compressor": ("OSF", "Overstrain failure"),
        "robot": ("PWF", "Power failure"),
        "conveyor": ("RNF", "Random failure"),
        "cell": (None, None),
    }
    key, label = mode_map.get(machine["kind"], (None, None))
    base = DATASET["modes"].get(key, 0.5) if key else 0.5
    # scale dataset failure rate into the demo risk range
    blended = round(min(97, max(2, machine["risk"] * 0.85 + base * 8)))
    return {"risk": blended, "mode": machine["predicts"][0] if machine["predicts"] else label,
            "horizonHours": 2 if blended > 75 else (8 if blended > 45 else None)}

apply_country_to_machines()

# ── schemas ───────────────────────────────────────────────────────────────
class ApprovalIn(BaseModel):
    machineId: str
    action: str
    operator: str

class SimulateIn(BaseModel):
    triggerId: str

class CompareIn(BaseModel):
    machineId: str

class DispatchIn(BaseModel):
    machineId: str
    level: str = "warning"          # info | warning | critical
    message: str = ""

class AckIn(BaseModel):
    technicianId: str

class SpeedIn(BaseModel):
    targetRpm: int
    reason: str = "Maintenance speed reduction"
    operator: str = "supervisor"

# ── core endpoints ────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    return {"ok": True, "dataset": bool(DATASET), "datasetRows": DATASET.get("rows", 0), "uptimeSec": round(time.time() - STATE["startedAt"])}

@app.get("/api/machines")
def machines():
    out = []
    for m in MACHINES:
        r = risk_from_dataset(m)
        item = {**m, "risk": r["risk"]}
        ov = STATE["speedOverride"].get(m["id"])
        if ov:
            item["speedOverride"] = ov
            item["state"] = "maintenance" if m["state"] == "normal" else m["state"]
        out.append(item)
    return out

@app.get("/api/machines/{mid}")
def machine(mid: str):
    if mid not in MACHINE_BY_ID:
        raise HTTPException(404, "machine not found")
    return [m for m in machines() if m["id"] == mid][0]

@app.get("/api/machines/{mid}/telemetry")
def telemetry(mid: str):
    if mid not in MACHINE_BY_ID:
        raise HTTPException(404, "machine not found")
    STATE["tick"] += 1
    tick = STATE["tick"]
    base = TELEMETRY_BASE.get(mid, TELEMETRY_BASE["DEFAULT"])
    cc = COUNTRY_CLIMATE.get(STATE["country"], COUNTRY_CLIMATE["IN"])
    rng = random.Random(f"{mid}-{tick}")
    ov = STATE["speedOverride"].get(mid)
    out = []
    for ch in base:
        v = ch["value"]
        if mid == "M-04":
            drift = 1 + 0.02 * rng.uniform(-1, 1)
            v = v * (2 - drift) if ch["key"] == "speed" else v * drift
        else:
            v = ch["nominal"] * (1 + 0.02 * rng.uniform(-1, 1))
        if ch["key"] == "temperature":
            # ambient from country climate influences running temperature
            v = v + (cc["ambientC"] - 24) * 0.35
        if ch["key"] == "speed" and ov:
            v = ov["targetRpm"]
        out.append({**ch, "value": round(v, 1)})
    return out

@app.get("/api/machines/{mid}/risk")
def risk(mid: str):
    m = MACHINE_BY_ID.get(mid)
    if not m:
        raise HTTPException(404, "machine not found")
    r = risk_from_dataset(m)
    return {"risk": r["risk"], "state": m["state"],
            "prediction": {"mode": r["mode"], "horizonHours": r["horizonHours"]} if r["mode"] else None,
            "datasetBasis": {"failureRatePct": DATASET.get("failureRate"), "modes": DATASET.get("modes")}}

@app.get("/api/cascade")
def cascade(trigger: str = "M-04"):
    if trigger == "M-04":
        return {**{
            "triggerId": "M-04", "triggerName": "M-04 Motor", "machinesAffected": 4,
            "productionImpact": 68, "cascadeProbability": 7, "severity": "Medium",
            "workerExposure": 35,
            "summary": ("Bearing failure at M-04 introduces abnormal torque ripple into the Line 2 drive chain. "
                        "M-07 compensates with servo overdrive, degrading its own gearbox. M-09 flow oscillation "
                        "stresses the exit cell actuation, halting Production Line 2 within ~3 minutes."),
        }, "nodes": CASCADE_NODES}
    return {
        "triggerId": trigger, "triggerName": f"{trigger} {MACHINE_BY_ID.get(trigger, {}).get('name', '')}",
        "nodes": [
            {"machineId": trigger, "depth": 0, "probability": 100, "delaySec": 0, "impact": 0},
            {"machineId": "M-16", "depth": 1, "probability": 55, "delaySec": 150, "impact": 30},
        ],
        "machinesAffected": 2, "productionImpact": 34, "cascadeProbability": 4,
        "severity": "Low", "workerExposure": 20,
        "summary": f"Simulated propagation from {trigger} through the Line 2 drive chain.",
    }

@app.post("/api/cascade/simulate")
def simulate(body: SimulateIn):
    c = cascade(body.triggerId)
    ev = push_history("info", "Cascade simulation run", f"Propagation simulated from {body.triggerId}.")
    return {"steps": [{"machineId": n["machineId"], "atSec": n["delaySec"], "probability": n["probability"], "impact": n["impact"]} for n in c["nodes"]],
            "summary": c["summary"], "productionImpact": c["productionImpact"], "workerExposure": c["workerExposure"], "eventId": ev["id"]}

@app.get("/api/machines/{mid}/scenarios")
def scenarios_for(mid: str):
    return SCENARIOS

@app.post("/api/scenarios/compare")
def scenarios_compare(body: CompareIn):
    return SCENARIOS

@app.get("/api/safety")
def safety():
    granted = bool(STATE["approvals"] and STATE["approvals"][-1]["granted"])
    score = STATE["safetyScore"] + (6 if granted else 0)
    return {
        "safetyScore": min(100, score),
        "workerExposure": "Low" if score > 70 else "Elevated",
        "currentIntervention": "LOTO maintenance approved" if granted else "None active — continuous monitoring",
        "humanApprovalRequired": True,
        "humanApprovalGranted": granted,
        "riskState": "controlled" if granted else "caution",
    }

@app.get("/api/history")
def get_history():
    return history[-50:]

@app.get("/api/status")
def status():
    return [
        {"key": "frontend", "label": "Frontend",     "status": "online", "latencyMs": 12},
        {"key": "backend",  "label": "Backend API",  "status": "online", "latencyMs": 34},
        {"key": "ml",       "label": "ML Engine",    "status": "online", "latencyMs": 58 if DATASET else 999},
        {"key": "twin",     "label": "Digital Twin", "status": "online", "latencyMs": 21},
        {"key": "database", "label": "Database",     "status": "online" if DATASET else "degraded", "latencyMs": 18},
    ]

@app.post("/api/approval")
def approval(body: ApprovalIn):
    rec = {"machineId": body.machineId, "action": body.action, "operator": body.operator,
           "granted": True, "at": now_hms(), "ts": datetime.now(timezone.utc).isoformat()}
    STATE["approvals"].append(rec)
    push_history("approval", "Human approval recorded", f"{body.operator} approved {body.action} for {body.machineId}.", body.machineId)
    return {"ok": True, **rec}

# ── country climate ───────────────────────────────────────────────────────
@app.get("/api/climate")
def climate(country: Optional[str] = None):
    if country:
        cc = COUNTRY_CLIMATE.get(country.upper())
        if not cc:
            raise HTTPException(404, f"unknown country code: {country}")
        return {"code": country.upper(), **cc, "active": country.upper() == STATE["country"]}
    return {"active": STATE["country"], "available": COUNTRY_CLIMATE}

@app.post("/api/climate/{code}")
def set_climate(code: str):
    code = code.upper()
    if code not in COUNTRY_CLIMATE:
        raise HTTPException(404, f"unknown country code: {code}")
    STATE["country"] = code
    apply_country_to_machines()
    cc = COUNTRY_CLIMATE[code]
    push_history("info", "Plant climate profile applied", f"Setup temperature targets set for {cc['name']} (ambient {cc['ambientC']}°C).")
    return {"ok": True, "code": code, **cc}

# ── technician alerts (approach-the-machine workflow) ─────────────────────
@app.get("/api/technicians")
def technicians():
    return TECHNICIANS

@app.get("/api/alerts")
def alerts():
    return sorted(STATE["alerts"], key=lambda a: a["id"], reverse=True)

@app.post("/api/alerts/dispatch")
def dispatch(body: DispatchIn):
    if body.machineId not in MACHINE_BY_ID:
        raise HTTPException(404, "machine not found")
    STATE["alertSeq"] += 1
    alert = {
        "id": STATE["alertSeq"], "machineId": body.machineId,
        "level": body.level if body.level in ("info", "warning", "critical") else "warning",
        "message": body.message or f"{body.machineId} requires inspection — approach with caution.",
        "status": "pending",          # pending → acknowledged → on_site → cleared
        "assignedTo": None, "ackAt": None, "arriveAt": None,
        "at": now_hms(), "ts": datetime.now(timezone.utc).isoformat(),
    }
    STATE["alerts"].append(alert)
    push_history("warning" if alert["level"] != "critical" else "critical",
                 f"Technician alert dispatched — {body.machineId}",
                 f"{alert['level'].upper()}: {alert['message']}", body.machineId)
    on_shift = [t for t in TECHNICIANS if t["onShift"]]
    return {"ok": True, "alert": alert, "notified": on_shift}

@app.post("/api/alerts/{alert_id}/ack")
def ack(alert_id: int, body: AckIn):
    for a in STATE["alerts"]:
        if a["id"] == alert_id:
            a["status"] = "acknowledged"
            a["assignedTo"] = body.technicianId
            a["ackAt"] = now_hms()
            push_history("info", f"Alert #{alert_id} acknowledged", f"{body.technicianId} acknowledged and is en route.", a["machineId"])
            return {"ok": True, "alert": a}
    raise HTTPException(404, "alert not found")

@app.post("/api/alerts/{alert_id}/arrive")
def arrive(alert_id: int, body: AckIn):
    for a in STATE["alerts"]:
        if a["id"] == alert_id:
            a["status"] = "on_site"
            a["assignedTo"] = body.technicianId
            a["arriveAt"] = now_hms()
            push_history("info", f"Technician on site — {a['machineId']}", f"{body.technicianId} arrived at machine.", a["machineId"])
            return {"ok": True, "alert": a}
    raise HTTPException(404, "alert not found")

@app.post("/api/alerts/{alert_id}/clear")
def clear_alert(alert_id: int):
    for a in STATE["alerts"]:
        if a["id"] == alert_id:
            a["status"] = "cleared"
            push_history("info", f"Alert #{alert_id} cleared", f"Inspection complete at {a['machineId']}.", a["machineId"])
            return {"ok": True, "alert": a}
    raise HTTPException(404, "alert not found")

# ── maintenance speed reduction ───────────────────────────────────────────
@app.post("/api/machines/{mid}/speed")
def set_speed(mid: str, body: SpeedIn):
    m = MACHINE_BY_ID.get(mid)
    if not m:
        raise HTTPException(404, "machine not found")
    if not (60 <= body.targetRpm <= 1500):
        raise HTTPException(422, "targetRpm must be 60–1500")
    full = TELEMETRY_BASE.get(mid, TELEMETRY_BASE["DEFAULT"])[3]["value"]
    if body.targetRpm >= full - 5:
        STATE["speedOverride"].pop(mid, None)
        push_history("info", f"Speed restored — {mid}", f"{body.operator} restored {mid} to nominal {full} RPM.", mid)
        return {"ok": True, "machineId": mid, "targetRpm": full, "reduced": False}
    # risk falls as the machine is slowed (simple linear relief model)
    relief = max(0, (full - body.targetRpm) / full)
    m["risk"] = round(max(3, m["risk"] * (1 - 0.6 * relief)))
    if m["risk"] < 45 and m["state"] in ("warning", "high"):
        m["state"] = "maintenance"
    STATE["speedOverride"][mid] = {"targetRpm": body.targetRpm, "reason": body.reason, "operator": body.operator, "at": now_hms()}
    push_history("warning", f"Maintenance speed reduction — {mid}",
                 f"{body.operator} reduced {mid} to {body.targetRpm} RPM ({body.reason}). Risk now {m['risk']}%.", mid)
    return {"ok": True, "machineId": mid, "targetRpm": body.targetRpm, "reduced": True, "newRisk": m["risk"], "newState": m["state"]}

@app.delete("/api/machines/{mid}/speed")
def clear_speed(mid: str):
    if mid not in MACHINE_BY_ID:
        raise HTTPException(404, "machine not found")
    STATE["speedOverride"].pop(mid, None)
    return {"ok": True, "machineId": mid}
