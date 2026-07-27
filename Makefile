# mdeditor — Docker Compose automation harness
# Enhanced Makefile protocol: conditional .env bootstrap, ENV_FILE override,
# env-prefixed targets (prod-* / dev-*), single .PHONY at EOF.
# Task discovery: `make list` (delegates to scripts/list-tasks.ps1 for Windows).
# See MAKEFILE.md for the developer-facing reference.

ENV_FILE ?= .env
ifneq (,$(wildcard ./$(ENV_FILE)))
    include $(ENV_FILE)
    export
endif

# Three services back both stacks: frontend-prod (nginx, $(MDE_APP_PORT)),
# frontend-dev (vite, $(MDE_DEV_PORT)), and the shared url-sidecar + db-sidecar.
#
# Prod and dev are NOT mutually exclusive. Both merges include compose.yml, both
# resolve to the same Compose project, and the published ports do not collide --
# so `make both-up` runs them side by side against ONE db-sidecar, which is the
# whole point: a document written on 5200 is the same row read on 5250.
#
# Because they share a project, a bare `docker compose down` tears down the OTHER
# stack and the shared database sidecar with it. prod-down/dev-down therefore
# remove only their own frontend; `make stack-down` is the explicit everything-off.
COMPOSE_PROD := docker compose -f compose.yml
COMPOSE_DEV  := docker compose -f compose.yml -f compose.dev.yml
DEV_SVCS     := frontend-dev

# ---------------------------------------------------------------- Production

# Build production images (frontend-prod runtime + url-sidecar)
prod-build:
	$(COMPOSE_PROD) build

# Start production stack detached (frontend-prod + url-sidecar)
prod-up:
	$(COMPOSE_PROD) up -d

# Stop and remove ONLY frontend-prod. Leaves the shared sidecars and any running
# dev stack alone -- a project-wide `down` here would take the database with it.
prod-down:
	$(COMPOSE_PROD) rm -sf frontend-prod

# Recreate production stack from a clean build (in place; keeps dev running)
prod-bounce:
	$(COMPOSE_PROD) up -d --build --force-recreate frontend-prod

# Restart production containers in place
prod-restart:
	$(COMPOSE_PROD) restart

# Follow production logs
prod-logs:
	$(COMPOSE_PROD) logs -f

# Show production container status
prod-status:
	$(COMPOSE_PROD) ps

# --------------------------------------------------------------- Development

# Build dev image (frontend-dev + url-sidecar, vite dev target)
dev-build:
	$(COMPOSE_DEV) build $(DEV_SVCS)

# Start dev stack detached (frontend-dev + url-sidecar, no hot reload)
dev-up:
	$(COMPOSE_DEV) up -d $(DEV_SVCS)

# Start dev stack in foreground with file-sync hot reload (Ctrl-C to stop)
dev-watch:
	$(COMPOSE_DEV) watch

# Stop and remove ONLY frontend-dev (see prod-down).
dev-down:
	$(COMPOSE_DEV) rm -sf $(DEV_SVCS)

# Recreate dev stack from a clean build (in place; keeps prod running)
dev-bounce:
	$(COMPOSE_DEV) up -d --build --force-recreate $(DEV_SVCS)

# Restart dev containers in place
dev-restart:
	$(COMPOSE_DEV) restart $(DEV_SVCS)

# Follow dev logs
dev-logs:
	$(COMPOSE_DEV) logs -f $(DEV_SVCS)

# Show dev container status
dev-status:
	$(COMPOSE_DEV) ps

# -------------------------------------------------------------------- Shared

# Start prod AND dev together against the one shared db-sidecar
both-up:
	$(COMPOSE_DEV) up -d --build frontend-prod $(DEV_SVCS)

# Stop EVERYTHING including the shared sidecars (explicit, unlike prod-down/dev-down)
stack-down:
	$(COMPOSE_PROD) down

# List all available tasks with descriptions
list:
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/list-tasks.ps1

# Smoke-test /ping on prod and dev origins (existing script)
ping:
	@bash scripts/test-ping-routes.sh

# Run the persistence + sidecar test suites
test:
	@pnpm test

# End-to-end proof that prod and dev share one database and survive a bounce
verify-persistence:
	@bash scripts/verify-persistence.sh

# Take an on-demand SQLite snapshot into $(MDE_DB_DIR)/$(MDE_DB_BACKUP_SUBDIR)
db-backup:
	docker compose -f compose.yml exec db-sidecar node -e "import('./backup.ts').then(m => console.log(m.takeSnapshot(process.env.MDE_DB_PATH)))"

# DESTRUCTIVE: stop stack and remove named + anonymous volumes and orphans.
# The database is a bind mount, so it is NOT removed by -v.
clean:
	$(COMPOSE_PROD) down -v --remove-orphans

.PHONY: prod-build prod-up prod-down prod-bounce prod-restart prod-logs prod-status dev-build dev-up dev-watch dev-down dev-bounce dev-restart dev-logs dev-status both-up stack-down list ping test verify-persistence db-backup clean
