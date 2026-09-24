# SAFE-TWIN — Run Instructions

## Project

`safe-twin/` — Vite + React + Three.js (R3F) digital-twin dashboard.
No env files, no secrets, no backend: the data layer is mock data in
`safe-twin/src/data/mockData.js`, consumed through `safe-twin/src/services/api.js`.

## Reproduce artifacts

Nothing to reproduce from the main checkout — there are no `.env*` files.
Dependencies are already installed:

```bash
cd safe-twin
npm install   # only needed in a fresh checkout
```

## Run the dev server

Default port for this workspace is **5199** (chosen to avoid clashes with other
agents' dev servers on 5173/5174).

Detached start (Windows PowerShell — stdout and stderr go to different files):

```powershell
powershell -NoProfile -Command "(Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev','--','--port','5199','--strictPort' -WorkingDirectory 'safe-twin' -RedirectStandardOutput '.freebuff\preview-c4e72f93-5b27-445d-bb89-2e6e29df369d.log' -RedirectStandardError '.freebuff\preview-c4e72f93-5b27-445d-bb89-2e6e29df369d.log.err' -WindowStyle Hidden -PassThru).Id"
```

Verify:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5199/   # expect 200
```

Production build check: `cd safe-twin && npm run build` (passes as of Sep 24, 2026).

## Troubleshooting

- If port 5199 is taken, another agent's server is using it — pick 5201+ and
  update both the start command and this doc.
- If the page is black in the browser, hard-reload: the browser can hold a stale
  module graph after a server restart (`preview_navigate` reload).
