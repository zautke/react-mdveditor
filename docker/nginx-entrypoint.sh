#!/bin/sh
set -eu

SIDECAR_PORT="${MDE_SIDECAR_INTERNAL_PORT:-5280}"
sed "s/__MDE_SIDECAR_INTERNAL_PORT__/${SIDECAR_PORT}/g" \
  /etc/nginx/nginx.conf.template > /tmp/nginx.conf

exec nginx -c /tmp/nginx.conf -g 'daemon off;'
