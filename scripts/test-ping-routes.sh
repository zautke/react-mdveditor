#!/usr/bin/env bash
set -euo pipefail

expect_pong() {
  local url="$1"
  local cacert="${2:-}"
  local body
  if [[ -n "$cacert" ]]; then
    body="$(curl -fsS --cacert "$cacert" "$url")"
  else
    body="$(curl -fsS "$url")"
  fi
  if [[ "$body" != "pong" ]]; then
    printf 'Expected pong from %s, got: %s\n' "$url" "$body" >&2
    exit 1
  fi
}

expect_pong "https://adagio.local:5250/ping" "docker/dev-https/ca.crt"
expect_pong "http://adagio.local:5200/ping"
