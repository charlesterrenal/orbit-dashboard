#!/bin/sh
# Refuse to start with missing or malformed gateway env. Never prints values.
set -eu

fail() { echo "15-validate-env: $1" >&2; exit 1; }

for v in PROXMOX_BACKEND_URL UPTIME_KUMA_BACKEND_URL UPDATES_BACKEND_URL PVE_TOKEN_ID PVE_TOKEN_SECRET; do
  eval "val=\${$v:-}"
  [ -n "$val" ] || fail "missing $v"
  case $v in
    *_URL)
      printf '%s\n' "$val" | grep -Eq '^https?://[^/ ]+$' || fail "invalid $v"
      ;;
    *)
      # Values land inside an nginx quoted string: reject anything that could break out of it.
      [ "$(printf '%s' "$val" | wc -l)" -eq 0 ] || fail "invalid $v"
      case $val in
        *[\"\'\$\;\{\}\ ]*) fail "invalid $v" ;;
      esac
      ;;
  esac
done
