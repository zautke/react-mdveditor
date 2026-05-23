<div align="center">

# mdeditor

Production-shaped deployment for the markdown editor and URL extraction sidecar.

</div>

## Runtime Contract

The repo root `.env` is the source of truth for active ports and origins:

```dotenv
MDE_HOST=adagio.local
MDE_APP_PORT=5200
MDE_DEV_PORT=5250
MDE_URL_SIDECAR_PORT=5280
MDE_SIDECAR_INTERNAL_PORT=5280
MDE_APP_ORIGIN=http://adagio.local:5200
MDE_DEV_ORIGIN=http://adagio.local:5250
VITE_MDE_APP_ORIGIN=http://adagio.local:5200
VITE_MDE_EXTRACT_PATH=/api/extract
```

The frontend extraction contract stays same-origin. The app calls `/api/extract`, and the deployed frontend proxies that path to the `url-sidecar` service.

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm typecheck
pnpm lint
```

Local Vite development now uses `MDE_DEV_PORT`, so the default dev URL is `http://adagio.local:5250` when your `.env` matches the canonical contract.

To run the frontend locally:

```bash
pnpm dev
```

To install the `mdeo` convenience launcher into `~/.local/bin`:

```bash
bash scripts/install-mdeo.sh
```

From PowerShell:

```powershell
pwsh -File scripts/install-mdeo.ps1
```

`mdeo <file.md>` opens files in the running dev instance at `http://adagio.local:5250` and starts it if needed.

To run the sidecar locally:

```bash
cd sidecar
bash run.sh
```

## Docker Deployment

The production stack is defined in [compose.yml](/Volumes/FLOUNDER/dev/mdeditor/compose.yml). It publishes:

- app: `http://adagio.local:5200`
- sidecar ops endpoint: `http://adagio.local:5280/health`

The remote dev stack is layered on [compose.dev.yml](/Volumes/FLOUNDER/dev/mdeditor/compose.dev.yml). It publishes:

- dev frontend: `http://adagio.local:5250`

Deploy from `largo` against the remote Docker engine on `adagio`:

```bash
export DOCKER_HOST=ssh://adagio
docker compose up -d --build
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
```

Do not use `vite preview` for deployed paths. Production serves the built app from Nginx inside the `frontend-prod` container.

## Verification

Static checks:

```bash
pnpm typecheck
pnpm lint
pnpm build
docker compose config
docker compose -f compose.yml -f compose.dev.yml config
```

Runtime checks after deployment:

```bash
curl -f http://adagio.local:5200
curl -f http://adagio.local:5250
curl -f http://adagio.local:5280/health
docker ps
```

Browser verification must prove:

- production app behavior on `http://adagio.local:5200`
- successful same-origin `/api/extract` through the production frontend
- sidecar health on `http://adagio.local:5280/health`
- dev smoke on `http://adagio.local:5250`
