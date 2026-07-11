#!/bin/sh
set -eu

SIDECAR_PORT="${MDE_SIDECAR_INTERNAL_PORT:-5280}"
DB_SIDECAR_PORT="${MDE_DB_SIDECAR_INTERNAL_PORT:-15280}"
sed -e "s/__MDE_SIDECAR_INTERNAL_PORT__/${SIDECAR_PORT}/g" \
    -e "s/__MDE_DB_SIDECAR_INTERNAL_PORT__/${DB_SIDECAR_PORT}/g" \
  /etc/nginx/nginx.conf.template > /tmp/nginx.conf

exec nginx -c /tmp/nginx.conf -g 'daemon off;'
