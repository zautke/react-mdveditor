# Agent Test Execution Protocol

## Scope

This protocol is for verification against the deployed remote stack, not an arbitrary local Vite instance.

Canonical targets:

- production: `http://adagio.local:5200`
- remote dev: `http://adagio.local:5250`
- sidecar ops: `http://adagio.local:5280/health`

## Hard Rules

1. Export `DOCKER_HOST=ssh://adagio` before Docker commands.
2. Kill any local process listening on `5200` before verifying production.
3. Treat `/api/extract` as a same-origin frontend path.
4. Capture evidence for every claim: screenshot or snapshot, console, network, and container state.

## Shell Sequence

```bash
export DOCKER_HOST=ssh://adagio
lsof -ti:5200 | xargs -r kill
pnpm typecheck
pnpm lint
pnpm build
docker compose config
docker compose -f compose.yml -f compose.dev.yml config
docker compose up -d --build
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
docker ps
curl -f http://adagio.local:5200
curl -f http://adagio.local:5250
curl -f http://adagio.local:5280/health
```

## Browser Sequence

Production `5200`:

1. Capture baseline screenshot and snapshot.
2. Check console state before interacting.
3. Perform the persona action.
4. Capture post-action screenshot and snapshot.
5. Record console messages after the action.
6. Record network activity, especially `/api/extract`.

Repeat for:

- `Author`
- `Researcher`
- `Operator`

Remote dev `5250`:

1. Baseline screenshot and snapshot.
2. Smoke markdown preview.
3. Smoke URL extraction through `/api/extract`.
4. Capture console and network.

## Acceptance Gate

Pass only if all of the following are directly observed:

- `http://adagio.local:5200` responds and behaves correctly
- `http://adagio.local:5250` responds and smokes cleanly
- `http://adagio.local:5280/health` responds with a healthy sidecar
- production extraction succeeds through same-origin `/api/extract`
- no unresolved blocking console or network failures remain
