# Makefile — Developer Reference

Docker Compose automation for `mdeditor`. Wraps the two stacks behind
env-prefixed targets so you never hand-type `-f` stacking again.

## Quick start

```bash
make list           # show every target + description
make prod-bounce    # clean rebuild + start production (http://adagio.local:5200)
make dev-bounce     # clean rebuild + start dev      (https://adagio.local:5250)
```

> **Windows:** `make` must be on PATH (e.g. via Git for Windows / choco `make`).
> `make list` shells out to `scripts/list-tasks.ps1` because the usual
> awk/grep self-documenting pattern has no awk/grep on native Windows.

## Targets

| Target | Action |
|---|---|
| `prod-build` | `docker compose -f compose.yml build` |
| `prod-up` | start prod stack detached (`frontend-prod` + `url-sidecar`) |
| `prod-down` | stop + remove prod stack |
| `prod-bounce` | `down` then `up -d --build` (clean recreate) |
| `prod-restart` | restart prod containers in place |
| `prod-logs` | follow prod logs |
| `prod-status` | `ps` for prod stack |
| `dev-build` | build dev image (`frontend-dev` + `url-sidecar`) |
| `dev-up` | start dev stack detached, no hot reload |
| `dev-watch` | foreground `docker compose watch` — file-sync hot reload |
| `dev-down` | stop + remove dev stack |
| `dev-bounce` | `down` then `up -d --build` (clean recreate) |
| `dev-restart` | restart dev containers in place |
| `dev-logs` | follow dev logs |
| `dev-status` | `ps` for dev stack |
| `list` | print this task table (via `scripts/list-tasks.ps1`) |
| `ping` | smoke-test `/ping` on both origins (`scripts/test-ping-routes.sh`) |
| `clean` | **DESTRUCTIVE** — `down -v --remove-orphans` (drops volumes) |

## Two stacks, one sidecar — they are mutually exclusive

- **prod** = `frontend-prod` (nginx, port `MDE_APP_PORT`=5200, HTTP) + `url-sidecar`.
- **dev** = `frontend-dev` (vite, port `MDE_DEV_PORT`=5250, HTTPS) + `url-sidecar`.

Both bind the sidecar host port `MDE_URL_SIDECAR_PORT` (5280), so **prod and
dev cannot run at the same time**. Switch envs by tearing one down first:

```bash
make prod-down && make dev-bounce
```

The dev compose merge (`compose.yml` + `compose.dev.yml`) also *defines*
`frontend-prod`. The dev targets name `frontend-dev` explicitly, so `up`/`build`
touch only `frontend-dev` and its `depends_on` (`url-sidecar`) — never
`frontend-prod`.

## Configuration

All ports/URLs come from `.env` (auto-included and exported to recipes).
Override the env file per invocation:

```bash
make prod-up ENV_FILE=.env.staging
```

## Dev HTTPS

Dev serves over HTTPS with a local dev CA. Trust it once per machine before
hitting `https://adagio.local:5250`:

```powershell
scripts/trust-dev-ca.ps1
```

## Maintenance

`make list` reads a hardcoded array in `scripts/list-tasks.ps1`. When you add or
remove a Makefile target, update **both** the Makefile (recipe + `.PHONY`) **and**
the array in `list-tasks.ps1` — they are not auto-synced.
