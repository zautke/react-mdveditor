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

# Prod = frontend-prod (nginx) + url-sidecar. Dev = frontend-dev (vite) + url-sidecar.
# The dev merge also defines frontend-prod, so dev targets name $(DEV_SVCS)
# explicitly; depends_on then pulls in url-sidecar but NOT frontend-prod.
# Prod and dev both bind the sidecar host port -> they are mutually exclusive.
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

# Stop and remove production stack (networks torn down)
prod-down:
	$(COMPOSE_PROD) down

# Recreate production stack from a clean build (down then up --build)
prod-bounce:
	$(COMPOSE_PROD) down
	$(COMPOSE_PROD) up -d --build

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

# Stop and remove dev stack
dev-down:
	$(COMPOSE_DEV) down

# Recreate dev stack from a clean build (down then up --build)
dev-bounce:
	$(COMPOSE_DEV) down
	$(COMPOSE_DEV) up -d --build $(DEV_SVCS)

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

# List all available tasks with descriptions
list:
	@powershell -NoProfile -ExecutionPolicy Bypass -File scripts/list-tasks.ps1

# Smoke-test /ping on prod and dev origins (existing script)
ping:
	@bash scripts/test-ping-routes.sh

# DESTRUCTIVE: stop stack and remove named + anonymous volumes and orphans
clean:
	$(COMPOSE_PROD) down -v --remove-orphans

.PHONY: prod-build prod-up prod-down prod-bounce prod-restart prod-logs prod-status dev-build dev-up dev-watch dev-down dev-bounce dev-restart dev-logs dev-status list ping clean
