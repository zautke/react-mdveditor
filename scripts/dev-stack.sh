#!/usr/bin/env bash
#
# dev-stack.sh — build and launch the dev app container plus both sidecars.
#
# Three services back the dev stack:
#   db-sidecar   node:sqlite persistence      (compose.yml)
#   url-sidecar  python URL-extract proxy     (compose.yml)
#   frontend-dev vite dev server              (compose.dev.yml)
#
# frontend-dev `depends_on` both sidecars with `condition: service_healthy`, so
# bringing up frontend-dev brings the sidecars up first and waits for them.
#
# Docker on this machine is REMOTE. The daemon lives on adagio and is reached
# over ssh:// via a docker context. Two consequences that bite:
#
#   1. The build context is uploaded over SSH on every build. Keep
#      .dockerignore tight.
#   2. Bind-mount sources resolve on the DAEMON host, not here. MDE_DB_DIR and
#      MDE_DEV_TLS_DIR must exist on adagio. This script will not create them.
#
# `make dev-up` covers the happy path. This script exists for the unhappy one:
# it preflights Docker access, validates that .env actually defines every
# variable compose interpolates, and gates on health instead of returning the
# moment containers are created.

set -euo pipefail

readonly SCRIPT_NAME="${0##*/}"
readonly REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# Hard constraint on this machine: the daemon is remote over ssh. Never a local
# engine, never tcp://…:2375, never DOCKER_HOST.
readonly DEFAULT_CONTEXT="adagio-ssh"

# Every variable compose.yml / compose.dev.yml interpolates. Compose substitutes
# an unset variable with the empty string, so a missing MDE_DB_DIR becomes a
# bind mount of "" and the failure surfaces as something unrelated. Check first.
readonly REQUIRED_VARS=(
  MDE_APP_PORT
  MDE_DB_BACKUP_INTERVAL_MS
  MDE_DB_BACKUP_MAX
  MDE_DB_BACKUP_SUBDIR
  MDE_DB_DIR
  MDE_DB_FILENAME
  MDE_DB_SIDECAR_INTERNAL_PORT
  MDE_DB_SIDECAR_PORT
  MDE_DEV_HTTPS
  MDE_DEV_PORT
  MDE_DEV_TLS_CERT_FILE
  MDE_DEV_TLS_DIR
  MDE_DEV_TLS_KEY_FILE
  MDE_HOST
  MDE_SIDECAR_INTERNAL_PORT
  MDE_URL_SIDECAR_PORT
  VITE_MDE_APP_ORIGIN
  VITE_MDE_EXTRACT_PATH
)

readonly SIDECAR_SVCS=(db-sidecar url-sidecar)
readonly DEV_SVC="frontend-dev"

# ── Argument bag ────────────────────────────────────────────────────
ARG_ACTION="up"
ARG_ENV_FILE=""
ARG_CONTEXT="$DEFAULT_CONTEXT"
ARG_BUILD="yes"
ARG_FOLLOW="no"
ARG_DRY_RUN="no"
ARG_TIMEOUT="180"
ARG_SIDECARS_ONLY="no"

Usage() {
  cat <<EOF
$SCRIPT_NAME — build and launch the dev app container and its sidecars

USAGE
  $SCRIPT_NAME [-a ACTION] [options]

ACTIONS (-a, --action)
  up          build (unless -n) then start, wait for health   [default]
  down        stop and remove frontend-dev only; sidecars stay up
  stack-down  stop and remove EVERYTHING including the sidecars
  build       build images, start nothing
  restart     restart running containers in place
  status      show container status and health
  logs        show logs (add -f to follow)
  health      probe the health endpoints and exit non-zero on failure
  preflight   run only the Docker + env checks

OPTIONS
  -a, --action ACTION     action from the list above (default: up)
  -e, --env-file PATH     env file to load (default: \$REPO_ROOT/.env)
  -c, --context NAME      docker context (default: $DEFAULT_CONTEXT)
  -n, --no-build          skip the image build on 'up'
  -f, --follow            follow logs (with -a logs)
  -s, --sidecars-only     act on the sidecars only, leave frontend-dev alone
  -t, --timeout SECONDS   how long to wait for health (default: 180)
  -d, --dry-run           print the commands instead of running them
  -h, --help              show this help and exit

EXAMPLES
  $SCRIPT_NAME                          # build + launch the whole dev stack
  $SCRIPT_NAME -a up -n                 # launch without rebuilding
  $SCRIPT_NAME -a up -s                 # bring up only the two sidecars
  $SCRIPT_NAME -a preflight             # check Docker + .env, change nothing
  $SCRIPT_NAME -a logs -f               # follow dev logs
  $SCRIPT_NAME -a stack-down            # everything off, including sidecars

NOTES
  Bind-mount sources (MDE_DB_DIR, MDE_DEV_TLS_DIR) resolve on the Docker host,
  which is adagio — not this machine. This script does not create them.
EOF
}

# ── Output helpers ──────────────────────────────────────────────────
if [[ -t 2 ]]; then
  readonly C_RED=$'\033[31m' C_YEL=$'\033[33m' C_GRN=$'\033[32m' C_DIM=$'\033[2m' C_OFF=$'\033[0m'
else
  readonly C_RED="" C_YEL="" C_GRN="" C_DIM="" C_OFF=""
fi

info()  { printf '%s\n' "$*" >&2; }
step()  { printf '%s==>%s %s\n' "$C_DIM" "$C_OFF" "$*" >&2; }
ok()    { printf '%s  ok%s  %s\n' "$C_GRN" "$C_OFF" "$*" >&2; }
warn()  { printf '%swarn%s  %s\n' "$C_YEL" "$C_OFF" "$*" >&2; }
die()   { printf '%serror%s %s\n' "$C_RED" "$C_OFF" "$*" >&2; exit 1; }

# ── Argument parsing (named only, never positional) ─────────────────
parse_args() {
  while (( $# > 0 )); do
    case "$1" in
      -a|--action)        [[ $# -ge 2 ]] || die "$1 requires a value"; ARG_ACTION="$2"; shift 2 ;;
      -e|--env-file)      [[ $# -ge 2 ]] || die "$1 requires a value"; ARG_ENV_FILE="$2"; shift 2 ;;
      -c|--context)       [[ $# -ge 2 ]] || die "$1 requires a value"; ARG_CONTEXT="$2"; shift 2 ;;
      -t|--timeout)       [[ $# -ge 2 ]] || die "$1 requires a value"; ARG_TIMEOUT="$2"; shift 2 ;;
      -n|--no-build)      ARG_BUILD="no";          shift ;;
      -f|--follow)        ARG_FOLLOW="yes";        shift ;;
      -s|--sidecars-only) ARG_SIDECARS_ONLY="yes"; shift ;;
      -d|--dry-run)       ARG_DRY_RUN="yes";       shift ;;
      -h|--help)          Usage; exit 0 ;;
      --)                 shift; break ;;
      -*)                 die "unknown option: $1  (try --help)" ;;
      *)                  die "positional arguments are not accepted: $1  (try --help)" ;;
    esac
  done

  [[ "$ARG_TIMEOUT" =~ ^[0-9]+$ ]] || die "--timeout must be a whole number of seconds, got: $ARG_TIMEOUT"

  case "$ARG_ACTION" in
    up|down|stack-down|build|restart|status|logs|health|preflight) ;;
    *) die "unknown action: $ARG_ACTION  (try --help)" ;;
  esac

  [[ -n "$ARG_ENV_FILE" ]] || ARG_ENV_FILE="$REPO_ROOT/.env"
}

# ── Preflight ───────────────────────────────────────────────────────
check_env_file() {
  step "checking $ARG_ENV_FILE"
  [[ -f "$ARG_ENV_FILE" ]] || die "env file not found: $ARG_ENV_FILE
  Copy the template and fill in host-specific paths:
      cp $REPO_ROOT/.env.example $ARG_ENV_FILE"

  local missing=()
  local var
  for var in "${REQUIRED_VARS[@]}"; do
    grep -qE "^[[:space:]]*${var}=" "$ARG_ENV_FILE" || missing+=("$var")
  done

  if (( ${#missing[@]} > 0 )); then
    printf '%serror%s %s is missing %d variable(s) that compose interpolates:\n' \
      "$C_RED" "$C_OFF" "$ARG_ENV_FILE" "${#missing[@]}" >&2
    printf '         %s\n' "${missing[@]}" >&2
    cat >&2 <<EOF

  Compose substitutes an unset variable with an empty string and still exits 0,
  so this does not fail cleanly. With MDE_DB_DIR unset, 'docker compose config'
  resolves the db-sidecar bind to:

      source: $REPO_ROOT        <-- the whole repo, mounted read-write at /data
      MDE_DB_PATH: /data/       <-- a directory, not a database file

  Verify for yourself without starting anything:
      docker compose -f compose.yml -f compose.dev.yml --env-file $ARG_ENV_FILE config

  .env.example defines all of them. To see what you are missing:
      diff <(grep -oE '^[A-Z_]+' $REPO_ROOT/.env.example | sort -u) \\
           <(grep -oE '^[A-Z_]+' $ARG_ENV_FILE | sort -u)
EOF
    exit 1
  fi
  ok "all ${#REQUIRED_VARS[@]} required variables present"
}

check_docker() {
  step "checking docker access"
  command -v docker >/dev/null 2>&1 || die "docker CLI not found on PATH"

  # DOCKER_HOST silently overrides `docker context`, which is how a command
  # aimed at adagio ends up talking to a local engine.
  if [[ -n "${DOCKER_HOST:-}" ]]; then
    die "DOCKER_HOST is set to '${DOCKER_HOST}'.
  It silently overrides --context and must be unset:
      unset DOCKER_HOST"
  fi
  ok "DOCKER_HOST unset"

  docker context inspect "$ARG_CONTEXT" >/dev/null 2>&1 \
    || die "docker context '$ARG_CONTEXT' does not exist.
  Existing contexts:
$(docker context ls --format '      {{.Name}}\t{{.DockerEndpoint}}' 2>/dev/null)
  Create it with:
      docker context create $ARG_CONTEXT --docker host=ssh://adagio"
  ok "context '$ARG_CONTEXT' exists"

  if [[ "$ARG_CONTEXT" != "$DEFAULT_CONTEXT" ]]; then
    warn "using context '$ARG_CONTEXT' instead of '$DEFAULT_CONTEXT'"
    warn "this machine is disk-constrained; a local engine is not an option here"
  fi

  local endpoint
  endpoint="$(docker context inspect "$ARG_CONTEXT" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
  case "$endpoint" in
    tcp://*) die "context '$ARG_CONTEXT' points at $endpoint — plaintext tcp is unauthenticated and must not be used" ;;
  esac

  # A dry run prints commands; it must not require a live daemon to do that.
  if [[ "$ARG_DRY_RUN" == "yes" ]]; then
    warn "dry-run: skipping the daemon reachability probe"
    return 0
  fi

  case "$endpoint" in
    ssh://*) step "probing daemon over $endpoint (this goes over SSH, give it a moment)" ;;
    *)       step "probing daemon over $endpoint" ;;
  esac

  local server
  if ! server="$(docker --context "$ARG_CONTEXT" version --format '{{.Server.Version}}' 2>&1)"; then
    die "cannot reach the Docker daemon on context '$ARG_CONTEXT'.
  ${server}
  The daemon is remote, so this is usually the host being unreachable rather
  than Docker being broken. Check the SSH path first:
      nc -zv adagio 22
      ssh adagio true
  Then re-run the machine-level doctor:
      ~/.agents/scripts/adagio_docker_doctor.sh --fix"
  fi
  ok "daemon reachable, server version $server"
}

# ── Compose plumbing ────────────────────────────────────────────────
compose() {
  local -a cmd=(
    docker --context "$ARG_CONTEXT" compose
    -f "$REPO_ROOT/compose.yml"
    -f "$REPO_ROOT/compose.dev.yml"
    --env-file "$ARG_ENV_FILE"
    "$@"
  )
  if [[ "$ARG_DRY_RUN" == "yes" ]]; then
    printf '%s[dry-run]%s %s\n' "$C_DIM" "$C_OFF" "${cmd[*]}" >&2
    return 0
  fi
  "${cmd[@]}"
}

target_services() {
  if [[ "$ARG_SIDECARS_ONLY" == "yes" ]]; then
    printf '%s\n' "${SIDECAR_SVCS[@]}"
  else
    printf '%s\n' "$DEV_SVC"
  fi
}

# ── Health ──────────────────────────────────────────────────────────
# `compose up -d` returns once containers are created, which is well before the
# sidecars can serve a request. Poll the health status compose already tracks.
wait_for_health() {
  [[ "$ARG_DRY_RUN" == "yes" ]] && return 0

  local -a services
  mapfile -t services < <(target_services)
  [[ "$ARG_SIDECARS_ONLY" == "yes" ]] || services=("${SIDECAR_SVCS[@]}" "$DEV_SVC")

  step "waiting up to ${ARG_TIMEOUT}s for health: ${services[*]}"

  local deadline=$(( SECONDS + ARG_TIMEOUT ))
  local -a pending=("${services[@]}")

  while (( SECONDS < deadline )); do
    local -a still=()
    local svc
    for svc in "${pending[@]}"; do
      local cid state health
      cid="$(compose ps -q "$svc" 2>/dev/null | head -1)"
      if [[ -z "$cid" ]]; then still+=("$svc"); continue; fi

      state="$(docker --context "$ARG_CONTEXT" inspect -f '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)"
      health="$(docker --context "$ARG_CONTEXT" inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" 2>/dev/null || echo unknown)"

      if [[ "$state" == "exited" || "$state" == "dead" ]]; then
        warn "$svc exited — last 40 log lines:"
        compose logs --tail 40 "$svc" >&2 || true
        die "$svc is not running"
      fi

      case "$health" in
        healthy)        ok "$svc healthy" ;;
        none)           ok "$svc running (no healthcheck defined)" ;;
        unhealthy)      warn "$svc reports unhealthy, still waiting"; still+=("$svc") ;;
        *)              still+=("$svc") ;;
      esac
    done

    pending=("${still[@]}")
    (( ${#pending[@]} == 0 )) && return 0
    sleep 3
  done

  warn "timed out after ${ARG_TIMEOUT}s waiting on: ${pending[*]}"
  local svc
  for svc in "${pending[@]}"; do
    warn "--- $svc last 40 lines ---"
    compose logs --tail 40 "$svc" >&2 || true
  done
  die "stack did not become healthy; raise --timeout or inspect the logs above"
}

print_endpoints() {
  [[ "$ARG_DRY_RUN" == "yes" ]] && return 0
  # shellcheck disable=SC1090
  set -a; source "$ARG_ENV_FILE"; set +a

  local scheme="http"
  [[ "${MDE_DEV_HTTPS:-false}" == "true" ]] && scheme="https"

  info ""
  info "  dev app     ${scheme}://${MDE_HOST}:${MDE_DEV_PORT}"
  info "  db sidecar  http://127.0.0.1:${MDE_DB_SIDECAR_PORT}/health   (published to the daemon host)"
  info "  url sidecar http://${MDE_HOST}:${MDE_URL_SIDECAR_PORT}/health"
  info ""
  info "  ${C_DIM}ports are published on the Docker host (adagio), not on this machine${C_OFF}"
}

probe_health() {
  # shellcheck disable=SC1090
  set -a; source "$ARG_ENV_FILE"; set +a

  local failures=0 url
  for url in \
    "http://${MDE_HOST}:${MDE_URL_SIDECAR_PORT}/health" \
    "http://${MDE_HOST}:${MDE_DB_SIDECAR_PORT}/health"
  do
    if curl -fsS --max-time 8 "$url" >/dev/null 2>&1; then
      ok "$url"
    else
      warn "$url unreachable"
      failures=$(( failures + 1 ))
    fi
  done
  (( failures == 0 )) || die "$failures endpoint(s) unreachable"
}

# ── Actions ─────────────────────────────────────────────────────────
main() {
  parse_args "$@"

  case "$ARG_ACTION" in
    preflight)
      check_env_file; check_docker
      ok "preflight passed"
      ;;
    build)
      check_env_file; check_docker
      step "building images"
      if [[ "$ARG_SIDECARS_ONLY" == "yes" ]]; then
        compose build "${SIDECAR_SVCS[@]}"
      else
        compose build "$DEV_SVC" "${SIDECAR_SVCS[@]}"
      fi
      ok "build complete"
      ;;
    up)
      check_env_file; check_docker
      if [[ "$ARG_BUILD" == "yes" ]]; then
        step "building images"
        if [[ "$ARG_SIDECARS_ONLY" == "yes" ]]; then
          compose build "${SIDECAR_SVCS[@]}"
        else
          compose build "$DEV_SVC" "${SIDECAR_SVCS[@]}"
        fi
      else
        step "skipping build (--no-build)"
      fi
      step "starting containers"
      # frontend-dev depends_on both sidecars as service_healthy, so starting it
      # starts and gates on them. --sidecars-only names them directly.
      mapfile -t _svcs < <(target_services)
      compose up -d "${_svcs[@]}"
      wait_for_health
      print_endpoints
      ;;
    down)
      check_docker
      step "removing $DEV_SVC (sidecars left running)"
      compose rm -sf "$DEV_SVC"
      ok "frontend-dev removed; use -a stack-down to stop the sidecars too"
      ;;
    stack-down)
      check_docker
      step "stopping the entire stack including sidecars"
      compose down
      ok "stack down"
      ;;
    restart)
      check_docker
      mapfile -t _svcs < <(target_services)
      compose restart "${_svcs[@]}"
      wait_for_health
      ;;
    status)
      check_docker
      compose ps
      ;;
    logs)
      check_docker
      mapfile -t _svcs < <(target_services)
      if [[ "$ARG_FOLLOW" == "yes" ]]; then
        compose logs -f "${_svcs[@]}"
      else
        compose logs --tail 200 "${_svcs[@]}"
      fi
      ;;
    health)
      check_env_file
      probe_health
      ;;
  esac
}

main "$@"
