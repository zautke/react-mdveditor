#!/usr/bin/env bash
# Offline tests for open_in_mde (no MDE server needed — uses --dry-run / -E).
set -uo pipefail

resolve_script_dir() {
  local source="${BASH_SOURCE[0]}"
  while [ -h "$source" ]; do
    local dir; dir="$(cd -P "$(dirname "$source")" && pwd)"
    source="$(readlink "$source")"
    case "$source" in /*) ;; *) source="$dir/$source" ;; esac
  done
  cd -P "$(dirname "$source")" && pwd
}
SCRIPT_DIR="$(resolve_script_dir)"
OIM="$SCRIPT_DIR/../scripts/open-in-mde.sh"

pass=0; fail=0
ok()   { printf '  ok   %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  FAIL %s\n' "$1"; fail=$((fail+1)); }
expect_exit() { # desc expected cmd...
  local desc="$1" want="$2"; shift 2
  "$@" >/dev/null 2>&1; local got=$?
  [ "$got" -eq "$want" ] && ok "$desc (exit $got)" || bad "$desc (want $want got $got)"
}

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
printf 'x' > "$TMP/a.md"
printf 'x' > "$TMP/b.markdown"
printf 'x' > "$TMP/c.png"
mkdir -p "$TMP/sub"

echo "open_in_mde tests:"

expect_exit "-h exits 0"                 0 "$OIM" -h
expect_exit "-E exits 0"                 0 "$OIM" -E
expect_exit "no input -> usage(2)"       2 bash -c "'$OIM' </dev/null"
expect_exit "bad flag -> usage(2)"       2 "$OIM" --nope
expect_exit "only unsupported -> 3"      3 "$OIM" --dry-run "$TMP/c.png"
expect_exit "supported dry-run -> 0"     0 "$OIM" --dry-run "$TMP/a.md"
expect_exit "mixed dry-run -> 0"         0 "$OIM" --dry-run "$TMP/a.md" "$TMP/c.png"
expect_exit "dir kept dry-run -> 0"      0 "$OIM" --dry-run "$TMP/sub"

# -E matches mde.mjs SUPPORTED_EXTENSIONS
if "$OIM" -E | grep -qx '.md' && "$OIM" -E | grep -qx '.markdown' && ! "$OIM" -E | grep -qx '.txt'; then
  ok "-E lists .md/.markdown but not .txt"
else
  bad "-E allowlist content"
fi

# dry-run partitions correctly
out="$("$OIM" --dry-run "$TMP/a.md" "$TMP/b.markdown" "$TMP/c.png" 2>/dev/null)"
if grep -q 'a.md' <<<"$out" && grep -q 'b.markdown' <<<"$out" && grep -q 'skipped' <<<"$out" && grep -q 'c.png' <<<"$out"; then
  ok "dry-run keeps 2 md, skips png"
else
  bad "dry-run partition"
fi

# JSON shape: opened has 2, skipped has 1, count 2
j="$("$OIM" --dry-run --json "$TMP/a.md" "$TMP/b.markdown" "$TMP/c.png" 2>/dev/null)"
if grep -q '"count":2' <<<"$j" && grep -q 'a.md' <<<"$j" && grep -q 'c.png' <<<"$j" && grep -q '"origin"' <<<"$j"; then
  ok "--json shape"
else
  bad "--json shape ($j)"
fi

# stdin (newline) when no operands
s="$(printf '%s\n%s\n' "$TMP/a.md" "$TMP/c.png" | "$OIM" --dry-run 2>/dev/null)"
grep -q 'a.md' <<<"$s" && ! grep -qE 'would open.*c\.png' <<<"$s" && ok "stdin newline" || bad "stdin newline"

# stdin NUL
s0="$(printf '%s\0%s\0' "$TMP/a.md" "$TMP/b.markdown" | "$OIM" -0 --dry-run 2>/dev/null)"
grep -q 'a.md' <<<"$s0" && grep -q 'b.markdown' <<<"$s0" && ok "stdin --null" || bad "stdin --null"

# `--` separator: treat a flag-looking path literally (nonexistent .md kept by ext)
d="$("$OIM" --dry-run -- "$TMP/a.md" 2>/dev/null)"
grep -q 'a.md' <<<"$d" && ok "-- separator" || bad "-- separator"

echo "-----"
echo "passed=$pass failed=$fail"
[ "$fail" -eq 0 ]
