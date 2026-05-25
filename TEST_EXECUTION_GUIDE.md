# Test Execution Guide

## Target Surfaces

- production app: `http://adagio.local:5200/ping`
- remote dev app: `https://adagio.local:5250/ping`
- sidecar ops endpoint: `http://adagio.local:5280/health`

The frontend extraction flow must remain same-origin. Browser verification should observe requests to `/api/extract` on the frontend origin, not direct calls from the app to the sidecar port.

## Required Static Checks

```bash
pnpm typecheck
pnpm lint
pnpm build
docker compose config
docker compose -f compose.yml -f compose.dev.yml config
```

## Deployment Preflight

```bash
unset DOCKER_HOST
docker context use adagio-ssh
lsof -ti:5200 | xargs -r kill
docker compose up -d --build
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
```

## Runtime Proof

Collect shell evidence for:

```bash
docker ps
curl -f http://adagio.local:5200/ping
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
curl -f http://adagio.local:5280/health
```

## Browser Verification Matrix

Production on `5200`:

1. `Author`
   Edit markdown and confirm preview updates without blocking console errors.
2. `Researcher`
   Submit a real URL, confirm `/api/extract` succeeds, and verify extracted content and metadata render.
3. `Operator`
   Confirm sidecar health on `5280`, prove the frontend uses same-origin `/api/extract`, then restart or interrupt the sidecar and verify the UI fails clearly and recovers cleanly.

Remote dev on `5250`:

1. Smoke only: app loads
2. Preview updates
3. `/api/extract` works
4. No blocking console errors

## Evidence Bundle Per Scenario

- pre-action screenshot or DOM snapshot
- post-action screenshot or DOM snapshot
- console capture after the action
- network capture for relevant requests
- remote container proof such as `docker ps`, health output, or logs
