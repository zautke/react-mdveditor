#!/usr/bin/env bash
# verify-persistence.sh — end-to-end proof that the prod and dev stacks read and
# write ONE database, and that documents survive a container bounce and a hard kill.
#
# Non-destructive by default: the live document set is captured before any write
# and restored at the end, and a snapshot is taken first regardless.
#
# Env (all sourced from .env, the config SSoT):
#   MDE_APP_ORIGIN / MDE_DEV_ORIGIN   stack origins to probe
#   MDE_DB_DIR / MDE_DB_FILENAME      host database location
#   MDE_DB_BACKUP_SUBDIR              snapshot directory under MDE_DB_DIR

set -euo pipefail

Usage() {
  cat <<'EOF'
Usage: bash scripts/verify-persistence.sh [-e <env-file>] [-k] [-h]

  -e, --env-file <path>   env file to source            (default: .env)
  -k, --skip-kill         skip the SIGKILL durability step
  -h, --help              show this help

Exits non-zero on the first failed assertion.
EOF
}

declare -A ARG=(
  [env-file]=".env"
  [skip-kill]="false"
)

while [[ $# -gt 0 ]]; do
  case "$1" in
    -e|--env-file)  ARG[env-file]="$2"; shift 2 ;;
    -k|--skip-kill) ARG[skip-kill]="true"; shift ;;
    -h|--help)      Usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; Usage; exit 2 ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# shellcheck disable=SC1090
set -a; source "${ARG[env-file]}"; set +a

PROD="${MDE_APP_ORIGIN}/api/db"
DEV="${MDE_DEV_ORIGIN}/api/db"
DB_PATH="${MDE_DB_DIR}/${MDE_DB_FILENAME}"
BACKUP_DIR="${MDE_DB_DIR}/${MDE_DB_BACKUP_SUBDIR}"
COMPOSE_PROD=(docker compose -f compose.yml)
COMPOSE_DEV=(docker compose -f compose.yml -f compose.dev.yml)
CURL=(curl -sS --max-time 15)
CURLK=(curl -sSk --max-time 15)

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf '  PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL  %s\n' "$1" >&2; }
step() { printf '\n== %s\n' "$1"; }
check(){ if [[ "$2" == "$3" ]]; then ok "$1"; else bad "$1 (expected '$3', got '$2')"; fi; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Everything reaches node over stdin. This box runs MSYS bash against a Windows
# node, so a shell path like /tmp/xxx is meaningless to the interpreter — piping
# sidesteps the translation entirely. Same reason curl uploads use @- not @file.
node_in() { node --input-type=module -e "
let raw='';process.stdin.setEncoding('utf8')
process.stdin.on('data',c=>raw+=c).on('end',()=>{ $1 })"; }

# 'yes' if the marker document is present in a /state payload on stdin.
has_marker() { node_in "const s=JSON.parse(raw);console.log((s.documents??[]).some(d=>d.id===process.argv[1])?'yes':'no')" "$1"; }

# ---------------------------------------------------------------- 1. snapshot
step "Snapshot before touching anything"
"${COMPOSE_PROD[@]}" exec -T db-sidecar node -e \
  "import('./backup.ts').then(m => console.log(m.takeSnapshot(process.env.MDE_DB_PATH)))" >/dev/null
BEFORE_COUNT="$(ls -1 "$BACKUP_DIR"/*.db 2>/dev/null | wc -l | tr -d ' ')"
[[ "$BEFORE_COUNT" -gt 0 ]] && ok "host-visible snapshots present ($BEFORE_COUNT)" \
                            || bad "no snapshots in $BACKUP_DIR"

# --------------------------------------------------- 2. both stacks reachable
step "Both stacks up"
check "prod /ping" "$("${CURL[@]}" "${MDE_APP_ORIGIN}/ping" || true)" "pong"
check "dev /ping"  "$("${CURLK[@]}" "${MDE_DEV_ORIGIN}/ping" || true)" "pong"

# ------------------------------------------- 3. one source, structurally + live
step "One shared persistence source"
SIDECARS="$("${COMPOSE_DEV[@]}" ps -q db-sidecar | grep -c . || true)"
check "exactly one db-sidecar container" "$SIDECARS" "1"

ident() { node_in "const h=JSON.parse(raw);console.log([h.instanceId,h.dbPath,h.dbFileId].join('|'))"; }
PROD_ID="$("${CURL[@]}"  "$PROD/health" | ident)"
DEV_ID="$( "${CURLK[@]}" "$DEV/health"  | ident)"
check "prod and dev report the same sidecar + database inode" "$DEV_ID" "$PROD_ID"

# -------------------------------------------------- 4. cross-stack write/read
step "Cross-stack write and read"
"${CURL[@]}" "$PROD/state" > "$WORK/original.json"
MARKER="verify-$(date +%s)"

WROTE="$(node_in "
  const s=JSON.parse(raw)
  console.log(JSON.stringify({
    value:[...(s.documents ?? []), {id:process.argv[1],title:'VERIFY',content:process.argv[1],kind:'markdown',persistedToFileSystem:false}],
    revision:s.__revision,
  }))" "$MARKER" < "$WORK/original.json" \
  | "${CURLK[@]}" -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' \
      --data-binary @- "$DEV/state/documents")"
check "write via DEV accepted" "$WROTE" "200"

check "read back via PROD" "$("${CURL[@]}" "$PROD/state" | has_marker "$MARKER")" "yes"

# --------------------------------------------------------- 5. guards hold
step "Destructive-write guards"
check "empty payload refused" \
  "$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' \
     -d '{"value":[]}' "$PROD/state/documents")" "409"
check "stale revision refused" \
  "$("${CURL[@]}" -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' \
     -d '{"value":[{"id":"x","title":"x","content":"x","kind":"markdown"}],"revision":0}' \
     "$PROD/state/documents")" "409"

# ------------------------------------------------------- 6. survives a bounce
step "Survives a container bounce"
"${COMPOSE_PROD[@]}" restart db-sidecar >/dev/null
"${COMPOSE_PROD[@]}" up -d --wait db-sidecar >/dev/null
check "marker survives restart" "$("${CURL[@]}" "$PROD/state" | has_marker "$MARKER")" "yes"

# --------------------------------------------------------- 7. survives SIGKILL
if [[ "${ARG[skip-kill]}" != "true" ]]; then
  step "Survives SIGKILL (no graceful shutdown)"
  docker kill -s KILL "$("${COMPOSE_PROD[@]}" ps -q db-sidecar)" >/dev/null
  "${COMPOSE_PROD[@]}" up -d --wait db-sidecar >/dev/null
  check "marker survives SIGKILL" "$("${CURL[@]}" "$PROD/state" | has_marker "$MARKER")" "yes"
  # Integrity is read from inside the container so the path is the container path,
  # avoiding host/MSYS path translation entirely.
  INTEGRITY="$("${COMPOSE_PROD[@]}" exec -T db-sidecar node -e "
const {DatabaseSync}=require('node:sqlite')
const db=new DatabaseSync(process.env.MDE_DB_PATH,{readOnly:true})
console.log(db.prepare('PRAGMA integrity_check').get().integrity_check)" 2>/dev/null | tr -d '\r')"
  check "database integrity after SIGKILL" "$INTEGRITY" "ok"
  [[ -e "${DB_PATH}-journal" ]] && bad "a hot journal survived the restart" \
                               || ok "no orphaned rollback journal"
fi

# --------------------------------------------------- 8. backups grew, on host
step "Backups are host-visible and growing"
AFTER_COUNT="$(ls -1 "$BACKUP_DIR"/*.db 2>/dev/null | wc -l | tr -d ' ')"
[[ "$AFTER_COUNT" -ge "$BEFORE_COUNT" ]] && ok "snapshots on the host ($AFTER_COUNT)" \
                                        || bad "snapshot count went backwards"

# ----------------------------------------------------------------- 9. restore
step "Restore the original document set"
CUR_REV="$("${CURL[@]}" "$PROD/state" | node_in "console.log(JSON.parse(raw).__revision)")"
check "restore accepted" \
  "$(node_in "
     const s=JSON.parse(raw)
     console.log(JSON.stringify({value:s.documents ?? [],revision:Number(process.argv[1])}))" "$CUR_REV" \
     < "$WORK/original.json" \
   | "${CURL[@]}" -o /dev/null -w '%{http_code}' -X PUT -H 'Content-Type: application/json' \
       --data-binary @- "$PROD/state/documents")" "200"
check "marker is gone again" "$("${CURL[@]}" "$PROD/state" | has_marker "$MARKER")" "no"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
[[ "$FAIL" -eq 0 ]]
