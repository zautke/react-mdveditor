```yaml
# AGENT METAPROMPT — DO NOT REMOVE
# This header instructs agents on how to maintain this document as a living artifact.
# Based on ACE (Agentic Context Engineering, ICLR 2026) principles:
# - Treat this document as an evolving playbook
# - Prevent brevity bias: never drop domain insights for concise summaries
# - Prevent context collapse: structured incremental updates, never full rewrites
# - Generation → Reflection → Curation cycle on each update
#
# MAINTENANCE PROTOCOL:
# 1. After each browser testing session, APPEND findings to relevant sections
# 2. When a technique is proven wrong, move it to Anti-Patterns (never delete — context matters)
# 3. When adding new techniques, include: date discovered, test run reference, evidence path
# 4. Before modifying existing content, read CURATING_THE_BROWSER_AUTOMATION_DOC.md
# 5. Always preserve the session reference in browser-runs/ for each finding
#
# CURATION SCHEDULE:
# - After every browser test session: append new findings
# - Monthly: review for stale information, mark deprecated (don't delete)
# - Quarterly: restructure sections if they exceed 50 items
```

# Browser Automation and Testing — mdeditor

## Purpose

This document is the active browser-testing reference for the deployed mdeditor stack.

Target surfaces:

- production app: `http://adagio.local:5200/ping`
- remote dev app: `https://adagio.local:5250/ping`
- sidecar ops endpoint: `http://adagio.local:5280/health`

The app must continue to use same-origin `/api/extract`. Browser verification should prove that path succeeds through the frontend and should not treat direct app-to-sidecar calls as acceptable behavior.

## Preflight

Before any browser interaction:

```bash
unset DOCKER_HOST
docker context use adagio-ssh
lsof -ti:5200 | xargs -r kill
docker ps
curl -f http://adagio.local:5200/ping
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
curl -f http://adagio.local:5280/health
```

If any of those fail, stop and fix deployment before opening the browser.

## Tool Order

1. Chrome DevTools MCP is the primary browser surface.
2. MCP browser automation is the fallback only if Chrome DevTools MCP is blocked.
3. Local Playwright CLI is out of scope for this verification plan.

## Evidence Standard

Each scenario must capture:

- a pre-action screenshot or DOM snapshot
- a post-action screenshot or DOM snapshot
- console messages after the action
- network evidence for relevant requests, especially `/api/extract`
- remote runtime proof such as `docker ps`, service health, or logs

Do not infer success from a rendered screen alone.

## Production Scenarios

Run these on `http://adagio.local:5200`.

### Author

- Load the app.
- Edit markdown.
- Confirm preview updates correctly.
- Confirm no blocking console errors.

### Researcher

- Submit a real URL through the product flow.
- Confirm a same-origin `/api/extract` request succeeds.
- Confirm extracted content and metadata render in the UI.

### Operator

- Confirm `http://adagio.local:5280/health` is healthy.
- Confirm the production frontend still uses same-origin `/api/extract`.
- Induce a controlled sidecar interruption or restart.
- Verify the UI fails clearly while the sidecar is unavailable.
- Verify the UI recovers after the sidecar returns.

## Remote Dev Smoke

Run this on `https://adagio.local:5250`.

- app loads
- markdown preview updates
- `/api/extract` works
- no blocking console errors appear

## Shell Verification Commands

Run these during or immediately around browser testing:

```bash
docker ps
curl -f http://adagio.local:5200/ping
curl --cacert docker/dev-https/ca.crt -f https://adagio.local:5250/ping
curl -f http://adagio.local:5280/health
```

When a scenario fails, collect targeted logs:

```bash
docker compose logs frontend-prod --tail=200
docker compose logs frontend-dev --tail=200
docker compose logs url-sidecar --tail=200
```

## Acceptance Gate

Browser verification passes only if all of the following are directly observed in the current session:

- production app behavior on `5200`
- remote dev smoke on `5250`
- healthy sidecar ops endpoint on `5280`
- successful end-to-end extraction through same-origin `/api/extract`
- no unresolved blocking console or network failures
