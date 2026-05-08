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
MDE_DEV_ORIGIN=http://adagio.local:5250
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
http://adagio.local:5250
```

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

- `frontend-dev` on `http://adagio.local:5250`
- shared `url-sidecar` on `http://adagio.local:5280`

Deploy with the SSH-backed Docker engine:

```bash
export DOCKER_HOST=ssh://adagio
docker compose up -d --build
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
```

## Shell Configuration

The persistent Docker target must be:

```bash
export DOCKER_HOST=ssh://adagio
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
curl -f http://adagio.local:5200
curl -f http://adagio.local:5250
curl -f http://adagio.local:5280/health
docker ps
```
