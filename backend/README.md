# SAFE-TWIN Backend

FastAPI service powering the SAFE-TWIN frontend, built on the **AI4I 2020
Predictive Maintenance Dataset** (`ai4i2020.csv`, 10,000 rows).

## Run

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend dev server proxies `/api` → `http://localhost:8000`
(see `safe-twin/vite.config.js`). If the backend is down, the frontend
automatically falls back to built-in mock data.

## Feature areas

| Area | Endpoints |
|---|---|
| Machines & telemetry | `GET /api/machines`, `GET /api/machines/{id}/telemetry` |
| Risk (dataset-driven) | `GET /api/machines/{id}/risk` — blends AI4I failure-mode stats |
| Cascade analysis | `GET /api/cascade?trigger=M-04`, `POST /api/cascade/simulate` |
| Scenarios | `GET /api/machines/{id}/scenarios`, `POST /api/scenarios/compare` |
| Safety & approvals | `GET /api/safety`, `POST /api/approval` |
| History | `GET /api/history` (live event log) |
| **Country climate** | `GET /api/climate?country=IN`, `POST /api/climate/{code}` — ambient + machine setup temperature per country (IN, US, DE, JP, BR, AE, GB, SG, AU, ZA) |
| **Technician alerts** | `GET /api/alerts`, `POST /api/alerts/dispatch`, `POST /api/alerts/{id}/ack`, `/arrive`, `/clear` — dispatch the team to approach a machine; statuses pending → acknowledged → on_site → cleared |
| **Maintenance speed control** | `POST /api/machines/{id}/speed` `{targetRpm, reason, operator}` — reduces machine speed, lowers failure risk, telemetry follows the new RPM; restore with `targetRpm: 1500` |

Interactive API docs: http://localhost:8000/docs
