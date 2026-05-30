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
MDE_DEV_ORIGIN=https://adagio.local:5250
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

Local Vite development now uses `MDE_DEV_PORT`, so the default dev URL is `https://adagio.local:5250` when your `.env` matches the canonical contract.

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

For secure-context features like `showSaveFilePicker()`, use `https://adagio.local:5250`. On macOS, install the trust profile from `public/dev-ca/adagio-local-dev-ca.mobileconfig` once on the machine you are using.

See [docs/dockerized-web-app-container-lockdown-runbook.md](docs/dockerized-web-app-container-lockdown-runbook.md) for the project-agnostic HTTPS, trust, Docker access, and verification pattern.

`mdeo <file.md>` opens files in the running dev instance at `https://adagio.local:5250` first, then the same adagio host over `http://adagio.local:5250` if the TLS listener is unavailable, retries the chosen server up to 3 times on error, and only uses local `https://127.0.0.1:5250` when no adagio dev server is already available.

The dev HTTPS CA is pinned in `~/.local/state/mdeditor/dev-https` and mirrored into `docker/dev-https/`. For shell verification, prefer:

```bash
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
```

If the pinned CA ever drifts, `mdeo` will refuse to rotate it silently. Restore the canonical state files instead of deleting them.

To run the sidecar locally:

```bash
cd sidecar
bash run.sh
```

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port **5250** with HMR |
| `pnpm build` | Production build with code splitting |
| `pnpm preview` | Serve the production build locally |
| `pnpm typecheck` | TypeScript strict-mode type checking |
| `pnpm lint` | ESLint with zero-warning tolerance |

## Architecture

### Markdown Processing Pipeline

```
User Input → react-markdown → remark-gfm (GFM)
                             → remark-math (equations)
           → rehype-raw (HTML) → rehype-slug (heading IDs)
                               → rehype-mathjax (render math)
           → react-syntax-highlighter (code blocks)
           → MermaidDiagram (mermaid fenced blocks) → DOM
```

## Docker Deployment

The production stack is defined in [compose.yml](/Volumes/FLOUNDER/dev/mdeditor/compose.yml). It publishes:

- app: `http://adagio.local:5200`
- sidecar ops endpoint: `http://adagio.local:5280/health`

The remote dev stack is layered on [compose.dev.yml](/Volumes/FLOUNDER/dev/mdeditor/compose.dev.yml). It publishes:

- dev frontend: `https://adagio.local:5250`

Deploy from `largo` against the remote Docker engine on `adagio`:

```bash
unset DOCKER_HOST
docker context use adagio-ssh
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
curl -f http://adagio.local:5200/ping
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
curl -f http://adagio.local:5280/health
docker ps
```

Browser verification must prove:

- production app behavior on `http://adagio.local:5200`
- successful same-origin `/api/extract` through the production frontend
- prod health on `http://adagio.local:5200/ping`
- dev health on `https://adagio.local:5250/ping`
- sidecar health on `http://adagio.local:5280/health`
