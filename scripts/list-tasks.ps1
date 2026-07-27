#!/usr/bin/env pwsh
# list-tasks.ps1 — Windows-native `make list` backend.
# GNU Make's awk/grep self-doc pattern fails on native Windows (no awk/grep/printf),
# so the task table is delegated here. Keep this array in sync with the Makefile:
# adding/removing a target means updating BOTH (they are not auto-synced).

$tasks = @(
    @{ Name = 'both-up';            Desc = 'Start prod AND dev together on the shared db-sidecar' }
    @{ Name = 'clean';              Desc = 'DESTRUCTIVE: stop stack, remove volumes and orphans (DB is a bind, survives)' }
    @{ Name = 'db-backup';          Desc = 'Take an on-demand SQLite snapshot into the host backups dir' }
    @{ Name = 'dev-bounce';         Desc = 'Recreate frontend-dev from a clean build (keeps prod running)' }
    @{ Name = 'dev-build';          Desc = 'Build dev image (frontend-dev)' }
    @{ Name = 'dev-down';           Desc = 'Remove ONLY frontend-dev (leaves shared sidecars up)' }
    @{ Name = 'dev-logs';           Desc = 'Follow dev logs' }
    @{ Name = 'dev-restart';        Desc = 'Restart dev containers in place' }
    @{ Name = 'dev-status';         Desc = 'Show dev container status' }
    @{ Name = 'dev-up';             Desc = 'Start dev stack detached (no hot reload)' }
    @{ Name = 'dev-watch';          Desc = 'Start dev stack in foreground with hot reload' }
    @{ Name = 'list';               Desc = 'List all available tasks with descriptions' }
    @{ Name = 'ping';               Desc = 'Smoke-test /ping on prod and dev origins' }
    @{ Name = 'prod-bounce';        Desc = 'Recreate frontend-prod from a clean build (keeps dev running)' }
    @{ Name = 'prod-build';         Desc = 'Build production images' }
    @{ Name = 'prod-down';          Desc = 'Remove ONLY frontend-prod (leaves shared sidecars up)' }
    @{ Name = 'prod-logs';          Desc = 'Follow production logs' }
    @{ Name = 'prod-restart';       Desc = 'Restart production containers in place' }
    @{ Name = 'prod-status';        Desc = 'Show production container status' }
    @{ Name = 'prod-up';            Desc = 'Start production stack detached' }
    @{ Name = 'stack-down';         Desc = 'Stop EVERYTHING including the shared db-sidecar' }
    @{ Name = 'test';               Desc = 'Run the persistence + sidecar test suites' }
    @{ Name = 'verify-persistence'; Desc = 'End-to-end proof prod and dev share one database' }
)

Write-Host 'Available tasks:'
Write-Host '================='
Write-Host ('{0,-14} {1}' -f 'TASK', 'DESCRIPTION')
Write-Host ('-' * 60)
foreach ($t in $tasks) {
    Write-Host ('{0,-14} {1}' -f $t.Name, $t.Desc)
}
