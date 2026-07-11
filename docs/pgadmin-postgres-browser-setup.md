# pgAdmin Browser Setup

Last verified: 2026-07-05

## Scope

This repo's mdeditor persistence is SQLite, so pgAdmin will not show mdeditor
state. pgAdmin is still useful for inspecting an existing Postgres container on
this machine.

At verification time, Docker had two running Postgres containers. The best
target for pgAdmin is the `lab` container because it is already on a stable
application network and exposes credentials through its container environment.

| Container | Image | Host port | Network |
| --- | --- | --- | --- |
| `postgres` | `braisenly/pg` | none | `bkend_lab` |
| `postgres-sync-db-1` | `postgres:18-alpine` | `127.0.0.1:5433 -> 5432/tcp` | `postgres-sync_default` |

Postgres readiness check:

```bash
docker exec postgres pg_isready -U postgres
# /var/run/postgresql:5432 - accepting connections
```

## Run pgAdmin

Use the official pgAdmin image on the same Docker network as the `postgres`
container. This gives pgAdmin container DNS access to `postgres`.

```bash
docker volume create mdeditor-pgadmin-data

export PGADMIN_DEFAULT_EMAIL='pgadmin@example.com'
export PGADMIN_DEFAULT_PASSWORD='<choose-a-local-password>'

docker run -d \
  --name mdeditor-pgadmin \
  --network bkend_lab \
  -p 127.0.0.1:5050:80 \
  -e PGADMIN_DEFAULT_EMAIL \
  -e PGADMIN_DEFAULT_PASSWORD \
  -v mdeditor-pgadmin-data:/var/lib/pgadmin \
  dpage/pgadmin4:latest
```

Open:

```text
http://127.0.0.1:5050
```

Login:

```text
Email: pgadmin@example.com
Password: value of `PGADMIN_DEFAULT_PASSWORD`
```

Register the server manually in pgAdmin:

| Field | Value |
| --- | --- |
| Name | `postgres` |
| Host name/address | `postgres` |
| Port | `5432` |
| Maintenance database | `postgres` |
| Username | `postgres` |
| Password | `postgres` |

Do not commit database or pgAdmin passwords. If this setup is made permanent,
move credentials to environment variables or Docker secrets.

## Optional servers.json

pgAdmin can preload server definitions from `/pgadmin4/servers.json`, but
passwords should not be committed. A safe passwordless server definition is:

```json
{
  "Servers": {
    "1": {
      "Name": "postgres",
      "Group": "Local Docker",
      "Host": "postgres",
      "Port": 5432,
      "MaintenanceDB": "postgres",
      "Username": "postgres",
      "SSLMode": "prefer"
    }
  }
}
```

Run with the file mounted:

```bash
docker run -d \
  --name mdeditor-pgadmin \
  --network bkend_lab \
  -p 127.0.0.1:5050:80 \
  -e PGADMIN_DEFAULT_EMAIL \
  -e PGADMIN_DEFAULT_PASSWORD \
  -v "$PWD/pgadmin-servers.json:/pgadmin4/servers.json:ro" \
  -v mdeditor-pgadmin-data:/var/lib/pgadmin \
  dpage/pgadmin4:latest
```

## Cleanup

```bash
docker stop mdeditor-pgadmin
docker rm mdeditor-pgadmin
```

The persistent pgAdmin profile remains in `mdeditor-pgadmin-data`.

## Reference Check

Current reference docs checked on 2026-07-05:

- pgAdmin 4 container deployment:
  https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html
- pgAdmin Docker image source/docs:
  https://github.com/pgadmin-org/pgadmin4/blob/master/docs/en_US/container_deployment.rst
- Docker Postgres official image:
  https://hub.docker.com/_/postgres
