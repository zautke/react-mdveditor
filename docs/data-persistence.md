# mdeditor Data Persistence

Last verified: 2026-07-05

## Current Backend

The current mdeditor persistence backend is a Node `node:sqlite` sidecar, not
Postgres. The app stores editor state through a same-origin HTTP API at
`/api/db`, which is proxied to the `db-sidecar` service in both Vite dev and
Nginx production.

The sidecar stores a key-value table in SQLite:

```sql
CREATE TABLE IF NOT EXISTS state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

Runtime pragmas:

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

The checked-in local database file is `db-sidecar/data/mdeditor.db`. Docker
production uses the named volume `db-sidecar-data` mounted at `/data`, with the
database at `/data/mdeditor.db`.

## Environment Variables

These variables are present in `.env.example` and `.env`.

| Variable | Default / current value | Used by | Purpose |
| --- | --- | --- | --- |
| `MDE_DB_SIDECAR_PORT` | `15280` | Docker host port mapping | Host-visible port for the DB sidecar. |
| `MDE_DB_SIDECAR_INTERNAL_PORT` | `15280` | sidecar, Vite, Nginx, Docker | Container/listener port for the DB sidecar HTTP API. |
| `MDE_DB_PROXY_ORIGIN` | `http://localhost:15280` | Vite dev proxy | Target origin for `/api/db` during local development. In Docker dev this is overridden to `http://db-sidecar:${MDE_DB_SIDECAR_INTERNAL_PORT}`. |
| `MDE_DB_PATH` | `./db-sidecar/data/mdeditor.db` | local sidecar / `mde` launcher | Local SQLite file path. Docker production sets this to `/data/mdeditor.db`. |
| `MDE_APP_PORT` | `5200` | frontend production | Host port for the production app. |
| `MDE_DEV_PORT` | `5250` | frontend development | Host port for the Vite dev app. |
| `MDE_HOST` | `adagio.local` | Vite / Docker docs | Allowed host and canonical local hostname. |

There are no current `POSTGRES_*`, `PG*`, or `DATABASE_URL` variables in this
repo's mdeditor persistence contract.

## Persistence DSL

The persistence DSL is the small HTTP contract between `src/lib/storage.ts` and
`db-sidecar/server.ts`.

| Operation | HTTP route after proxy stripping | Client helper | Behavior |
| --- | --- | --- | --- |
| Health | `GET /health` | Docker healthchecks | Returns `{ "ok": true }`. |
| Hydrate all state | `GET /state` | `hydrateAll()` / `loadState()` | Returns every persisted key as parsed JSON. |
| Upsert key | `PUT /state/:key` with body `{ "value": ... }` | `saveState(key, value)` | JSON-stringifies and inserts or updates the key. |
| Delete key | `DELETE /state/:key` | `removeState(key)` | Deletes the key if present. |

Persisted logical keys:

| Key | Producer | Meaning |
| --- | --- | --- |
| `documents` | `EditorWithProview.tsx` | Array of open editor documents. |
| `activeDocId` | `EditorWithProview.tsx` | Active document id. |
| `isExpanded` | `EditorWithProview.tsx` | Editor layout expansion state. |
| `userSettings` | `user-settings.tsx` | User settings merged over defaults at hydration. |

Legacy browser `localStorage` keys with the prefix `mdeditor:` are migrated once
if the DB does not already contain the corresponding key. The legacy data is
left in localStorage as a cold backup.

## Initial Setup

Local sidecar only:

```bash
cd db-sidecar
bash run.sh
curl -fsS http://localhost:15280/health
curl -fsS http://localhost:15280/state
```

Full Docker stack:

```bash
docker compose up -d --build
curl -fsS http://localhost:15280/health
curl -fsS http://adagio.local:5200/ping
```

Dev Docker layer:

```bash
docker compose -f compose.yml -f compose.dev.yml up -d --build frontend-dev
curl --cacert docker/dev-https/ca.crt -fsS https://adagio.local:5250/ping
```

## Postgres Status

The current codebase does not use Postgres for mdeditor persistence. A Postgres
migration would need a new storage driver and deployment contract; adding
pgAdmin alone will not expose mdeditor's SQLite state as Postgres tables.

If this key-value model is migrated to Postgres, the closest equivalent DDL
would be:

```sql
CREATE TABLE IF NOT EXISTS state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

An equivalent upsert would be:

```sql
INSERT INTO state (key, value, updated_at)
VALUES ($1, $2::jsonb, now())
ON CONFLICT (key)
DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = EXCLUDED.updated_at;
```

That DDL is documentation for a possible future Postgres migration only. It is
not executed by the current app.

## Reference Check

Current reference docs checked on 2026-07-05:

- Docker Postgres official image documents `POSTGRES_PASSWORD`, `POSTGRES_USER`,
  `POSTGRES_DB`, `POSTGRES_INITDB_ARGS`, and Docker secret variants such as
  `POSTGRES_PASSWORD_FILE`: https://hub.docker.com/_/postgres
- Docker's PostgreSQL guide documents initialization scripts and containerized
  setup: https://docs.docker.com/guides/postgresql/advanced-configuration-and-initialization/
- pgAdmin 4 container deployment documents `dpage/pgadmin4`,
  `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`, and `servers.json`:
  https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
