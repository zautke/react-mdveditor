# Setup Guide

## Prerequisites

- Node.js `>= 20`
- `pnpm >= 10.28.0`
- Docker with SSH access to `adagio`

## Bootstrap

```bash
cd /Volumes/FLOUNDER/dev/mdeditor
pnpm install
cp .env.example .env
```

The canonical `.env` values for the remote deployment are:

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

## Local Commands

Frontend dev server:

```bash
pnpm dev
```

Default dev URL:

```text
https://adagio.local:5250
```

### Secure HTTPS Development

The repo also supports the secure development origin `https://adagio.local:5250` for File System Access API features like `showSaveFilePicker()`.

On macOS, Chrome will only trust that origin after the local development CA is installed into the machine trust store. Use the profile in `public/dev-ca/adagio-local-dev-ca.mobileconfig` on the Mac you want to trust, or import the certificate in Keychain Access and set it to trust as a root CA.

If you need a browser that trusts the URL without any local trust setup, you need a publicly trusted certificate on a real delegated domain. `adagio.local` cannot be made universally trusted by the server alone.

Install the `mdeo` helper into `~/.local/bin`:

```bash
bash scripts/install-mdeo.sh
```

PowerShell equivalent:

```powershell
pwsh -File scripts/install-mdeo.ps1
```

The helper opens files in the default mdeditor instance on `https://adagio.local:5250` first, then the same adagio host over `http://adagio.local:5250` if the TLS listener is unavailable, retries the chosen server up to 3 times on error, and only uses local `https://127.0.0.1:5250` when no adagio dev server is already available.

The dev HTTPS CA is pinned in `~/.local/state/mdeditor/dev-https` and mirrored into `docker/dev-https/`. For shell verification, use the repo CA file:

```bash
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
```

If the pinned CA drifts, restore the state files rather than generating a new root; `mdeo` treats that trust anchor as stable.

Sidecar:

```bash
cd sidecar
bash run.sh
```

## Production-Shaped Docker Stack

Production services:

- `frontend-prod` on `http://adagio.local:5200`
- `url-sidecar` on `http://adagio.local:5280`

Remote dev services:

- `frontend-dev` on `https://adagio.local:5250`
- shared `url-sidecar` on `http://adagio.local:5280`

Deploy with the SSH-backed Docker engine:

```bash
unset DOCKER_HOST
docker context use adagio-ssh
docker compose up -d --build
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
```

## Shell Configuration

The persistent Docker target must be the SSH-backed context, with `DOCKER_HOST` unset:

```bash
unset DOCKER_HOST
docker context use adagio-ssh
```

Before editing `~/.bashrc.local`, back it up. If the SSH-backed engine path fails, restore the backup before retrying.

## Pre-Deploy Guard

Kill any local listener on `5200` before runtime verification so checks cannot accidentally hit `largo`:

```bash
lsof -ti:5200 | xargs -r kill
```

## Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm build
docker compose config
docker compose -f compose.yml -f compose.dev.yml config
curl -f http://adagio.local:5200/ping
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
curl -f http://adagio.local:5280/health
docker ps
```
