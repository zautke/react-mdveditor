#!/usr/bin/env bash
#
# open_in_mde — open supported files in the running MDE editor.
#
# Global, dependency-light launcher extracted from the mdeo wrapper. It is the
# single primitive used by the shell, the macOS Finder Quick Action, and the
# Merlyn native host. Extension gating is delegated to bin/mde.mjs
# (`--print-extensions`) so the allowlist has exactly one source of truth.
#
# See Usage() for the full input/output/exit-code contract.

set -euo pipefail

# --- robust environment (Quick Action / native host give a minimal PATH) ------
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Version managers (nvm/fnm/volta) install node OUTSIDE the default PATH, so a
# Finder Quick Action or native host launches with `node` unresolvable. If it is
# not already on PATH, locate the newest managed node and prepend its bin dir so
# the bare `node` calls below work everywhere.
if ! command -v node >/dev/null 2>&1; then
  for _nvm_root in "${NVM_DIR:-}" /usr/local/nvm "$HOME/.nvm"; do
    [ -n "$_nvm_root" ] && [ -d "$_nvm_root/versions/node" ] || continue
    _newest="$(ls -1 "$_nvm_root/versions/node" 2>/dev/null | sort -V | tail -n1)"
    if [ -n "$_newest" ] && [ -x "$_nvm_root/versions/node/$_newest/bin/node" ]; then
      PATH="$_nvm_root/versions/node/$_newest/bin:$PATH"
      break
    fi
  done
fi
if ! command -v node >/dev/null 2>&1; then
  for _dir in "$HOME/.volta/bin" "$HOME/.local/state/fnm_multishells"/*/bin \
              /opt/homebrew/opt/node/bin /usr/local/opt/node/bin; do
    [ -x "$_dir/node" ] && { PATH="$_dir:$PATH"; break; }
  done
fi

resolve_script_dir() {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ]; do
    local dir
    dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    case "$source" in
      /*) ;;
      *) source="$dir/$source" ;;
    esac
  done
  cd -P "$(dirname "$source")" && pwd
}

SCRIPT_DIR="$(resolve_script_dir)"
REPO_ROOT="${MDE_REPO_ROOT:-$(cd "$SCRIPT_DIR/.." && pwd)}"
MDE_ENTRY="$REPO_ROOT/bin/mde.mjs"
ORIGIN="${MDE_DEV_ORIGIN:-https://adagio.local:5250}"

# --- exit codes (contract) ----------------------------------------------------
EX_OK=0        # >=1 supported file opened (also dry-run / -E / -h success)
EX_USAGE=2     # bad flag / no input
EX_NONE=3      # inputs given but none supported
EX_LAUNCH=4    # MDE server unreachable / launch failed

Usage() {
  cat <<'EOF'
open_in_mde — open supported files in the running MDE editor

USAGE
  open_in_mde [OPTIONS] [--] FILE|DIR ...
  ... | open_in_mde [OPTIONS]              # paths on stdin when no operands

OPTIONS
  -n, --dry-run           Print resolved+filtered list; do not open
  -j, --json              Machine-readable result on stdout
  -0, --null              Stdin paths are NUL-separated (default: newline)
  -q, --quiet             Suppress non-error stderr
  -E, --print-extensions  Print the MDE extension allowlist and exit
  -h, --help              Show this help and exit

INPUTS
  Operands : file/dir paths (abs or rel). Directories are expanded recursively
             to supported files by mde.mjs. Unsupported files are skipped with
             a warning. `--` ends option parsing.
  Stdin    : consumed only when no operands are given AND stdin is not a TTY.
  Env      : MDE_REPO_ROOT overrides repo autodetect; PATH must resolve node.

OUTPUTS
  stdout : human summary; JSON with --json:
           {"opened":["/abs/a.md"],"skipped":["/abs/x.png"],
            "origin":"https://adagio.local:5250","count":1}
  stderr : warnings and errors.

EXIT CODES
  0  >=1 supported file opened (also --dry-run/-E/-h success)
  2  usage error (bad flag / no input)
  3  inputs given but none supported
  4  MDE server unreachable / launch failed
EOF
}

warn() { [ "$QUIET" -eq 1 ] || printf '%s\n' "open_in_mde: $*" >&2; }
die()  { printf '%s\n' "open_in_mde: $*" >&2; exit "${2:-$EX_USAGE}"; }

# --- arg bag ------------------------------------------------------------------
DRY_RUN=0
JSON=0
NULL_SEP=0
QUIET=0
declare -a OPERANDS=()

while [ "$#" -gt 0 ]; do
  case "$1" in
    -n|--dry-run) DRY_RUN=1 ;;
    -j|--json) JSON=1 ;;
    -0|--null) NULL_SEP=1 ;;
    -q|--quiet) QUIET=1 ;;
    -E|--print-extensions)
      node "$MDE_ENTRY" --print-extensions
      exit "$EX_OK"
      ;;
    -h|--help) Usage; exit "$EX_OK" ;;
    --) shift; while [ "$#" -gt 0 ]; do OPERANDS+=("$1"); shift; done; break ;;
    -*) die "unknown option: $1" "$EX_USAGE" ;;
    *) OPERANDS+=("$1") ;;
  esac
  shift
done

# --- gather inputs: operands, else stdin when non-interactive -----------------
declare -a INPUTS=()
if [ "${#OPERANDS[@]}" -gt 0 ]; then
  INPUTS=("${OPERANDS[@]}")
elif [ ! -t 0 ]; then
  if [ "$NULL_SEP" -eq 1 ]; then
    while IFS= read -r -d '' p; do [ -n "$p" ] && INPUTS+=("$p"); done
  else
    while IFS= read -r p; do [ -n "$p" ] && INPUTS+=("$p"); done
  fi
fi

[ "${#INPUTS[@]}" -gt 0 ] || { Usage >&2; exit "$EX_USAGE"; }

# --- load canonical allowlist (SSoT) ------------------------------------------
declare -a EXTS=()
while IFS= read -r e; do [ -n "$e" ] && EXTS+=("$e"); done < <(node "$MDE_ENTRY" --print-extensions)
[ "${#EXTS[@]}" -gt 0 ] || die "could not read MDE extension allowlist from $MDE_ENTRY" "$EX_LAUNCH"

is_supported() {
  local lower="${1,,}" ext
  for ext in "${EXTS[@]}"; do
    case "$lower" in *"$ext") return 0 ;; esac
  done
  return 1
}

# --- resolve + partition ------------------------------------------------------
abspath() {
  local p="$1"
  case "$p" in
    /*) printf '%s\n' "$p" ;;
    *)  printf '%s\n' "$(pwd)/$p" ;;
  esac
}

declare -a KEPT=() SKIPPED=()
for raw in "${INPUTS[@]}"; do
  abs="$(abspath "$raw")"
  if [ -d "$abs" ]; then
    KEPT+=("$abs")            # directories are expanded downstream by mde.mjs
  elif is_supported "$abs"; then
    KEPT+=("$abs")
  else
    SKIPPED+=("$abs")
    warn "skipping unsupported file: $abs"
  fi
done

# --- JSON helpers -------------------------------------------------------------
json_escape() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
json_array() {
  local first=1 item out=""
  for item in "$@"; do
    [ "$first" -eq 1 ] && first=0 || out+=","
    out+="\"$(json_escape "$item")\""
  done
  printf '[%s]' "$out"
}
emit_json() {
  printf '{"opened":%s,"skipped":%s,"origin":"%s","count":%d}\n' \
    "$(json_array "${KEPT[@]}")" "$(json_array "${SKIPPED[@]}")" \
    "$(json_escape "$ORIGIN")" "${#KEPT[@]}"
}

# --- nothing to open ----------------------------------------------------------
if [ "${#KEPT[@]}" -eq 0 ]; then
  [ "$JSON" -eq 1 ] && emit_json
  die "no supported files among inputs" "$EX_NONE"
fi

# --- dry run ------------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  if [ "$JSON" -eq 1 ]; then
    emit_json
  else
    printf 'would open (%d):\n' "${#KEPT[@]}"
    printf '  %s\n' "${KEPT[@]}"
    [ "${#SKIPPED[@]}" -gt 0 ] && { printf 'skipped (%d):\n' "${#SKIPPED[@]}"; printf '  %s\n' "${SKIPPED[@]}"; }
  fi
  exit "$EX_OK"
fi

# --- open (delegate to mde.mjs, the canonical launcher) -----------------------
if node "$MDE_ENTRY" "${KEPT[@]}"; then
  if [ "$JSON" -eq 1 ]; then
    emit_json
  else
    warn "opened ${#KEPT[@]} file(s) in MDE ($ORIGIN)"
  fi
  exit "$EX_OK"
else
  [ "$JSON" -eq 1 ] && emit_json
  die "MDE launch failed (server unreachable?)" "$EX_LAUNCH"
fi
