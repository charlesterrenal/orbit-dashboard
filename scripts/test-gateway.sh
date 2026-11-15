#!/usr/bin/env bash
# Gateway policy test: renders nginx.conf.template exactly like production (nginx image envsubst entrypoint),
# points every *_BACKEND_URL at a stub that echoes "STUB <method> <uri> auth=<Authorization>", then asserts the allowlist,
# server-side PVE token injection and startup env validation.
# Needs only Docker and curl. Uses dummy values; never contacts real services.
set -euo pipefail
export MSYS_NO_PATHCONV=1

cd "$(dirname "$0")/.."
IMAGE="${NGINX_IMAGE:-nginx:alpine}"
ID="gwtest-$$"
NET="$ID-net"; STUB="$ID-stub"; GW="$ID-gw"
TMP="$(mktemp -d)"
# Native path for docker.exe on Windows git-bash; identical to $TMP elsewhere.
TMPW="$(cd "$TMP" && { pwd -W 2>/dev/null || pwd; })"
FAIL=0; PASS=0

cleanup() {
  docker rm -f "$GW" "$STUB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$STUB" --network "$NET" "$IMAGE" sh -c \
  'printf "%s\n" "server { listen 80 default_server; default_type text/plain; location / { return 200 \"STUB \$request_method \$request_uri auth=\$http_authorization\"; } }" > /etc/nginx/conf.d/default.conf && exec nginx -g "daemon off;"' >/dev/null

TOKEN_ID='dashboard@pve!test'
TOKEN_SECRET='00000000-0000-0000-0000-000000000000'
PVE_AUTH="PVEAPIToken=$TOKEN_ID=$TOKEN_SECRET"
ENV_ARGS=()
for v in PROXMOX UPTIME_KUMA UPDATES; do
  ENV_ARGS+=(-e "${v}_BACKEND_URL=http://$STUB")
done
ENV_ARGS+=(-e "PVE_TOKEN_ID=$TOKEN_ID" -e "PVE_TOKEN_SECRET=$TOKEN_SECRET")

# The validator must be executable and run before the envsubst step, exactly as in the production image.
WRAP='chmod 755 /docker-entrypoint.d/15-validate-env.sh && exec /docker-entrypoint.sh nginx -g "daemon off;"'
# create_gw NAME [docker create args...]: validator and template installed, not started.
create_gw() {
  local name="$1"; shift
  docker create --name "$name" --network "$NET" "$@" --entrypoint sh "$IMAGE" -c "$WRAP" >/dev/null
  docker cp docker/15-validate-env.sh "$name:/docker-entrypoint.d/15-validate-env.sh" >/dev/null
  docker cp "$TMPW/templates" "$name:/etc/nginx/" >/dev/null
}

mkdir -p "$TMP/templates"
cp nginx.conf.template "$TMP/templates/default.conf.template"
create_gw "$GW" -p 127.0.0.1::80 "${ENV_ARGS[@]}"
docker start "$GW" >/dev/null

PORT="$(docker port "$GW" 80/tcp | head -1 | sed 's/.*://')"
BASE="http://127.0.0.1:$PORT"
for _ in $(seq 1 30); do
  curl -s -o "$TMPW/null" "$BASE/" && break
  if [ "$(docker inspect -f '{{.State.Running}}' "$GW")" != "true" ]; then
    echo "gateway exited during startup:"; docker logs "$GW" 2>&1 | tail -20; exit 1
  fi
  sleep 0.5
done

if docker exec "$GW" nginx -t >/dev/null 2>&1; then PASS=$((PASS+1)); else echo "FAIL nginx -t"; docker exec "$GW" nginx -t; FAIL=$((FAIL+1)); fi

# check METHOD PATH EXPECTED_STATUS [EXPECTED_BODY_EXACT]
check() {
  local method="$1" path="$2" want="$3" body="${4:-}" got out
  out="$TMPW/body"
  if [ "$method" = HEAD ]; then
    got="$(curl -s -H 'Authorization: evil' --path-as-is -I -o "$out" -w '%{http_code}' "$BASE$path")"
  else
    got="$(curl -s -H 'Authorization: evil' --path-as-is -X "$method" -o "$out" -w '%{http_code}' "$BASE$path")"
  fi
  if [ "$got" != "$want" ]; then
    echo "FAIL $method $path: status $got, want $want"; FAIL=$((FAIL+1)); return
  fi
  if [ -n "$body" ] && [ "$(cat "$out")" != "$body" ]; then
    echo "FAIL $method $path: body '$(head -c 200 "$out")', want '$body'"; FAIL=$((FAIL+1)); return
  fi
  PASS=$((PASS+1))
}

# Allowed reads: "dashboard path|expected upstream URI|expected Authorization at upstream".
# Every request carries a hostile client "Authorization: evil"; only PVE gets the server-side token, the rest get none.
ALLOWED_GET=(
  "/api/proxmox/nodes/pve/status|/api2/json/nodes/pve/status|$PVE_AUTH"
  "/api/proxmox/nodes/pve/storage|/api2/json/nodes/pve/storage|$PVE_AUTH"
  "/api/proxmox/nodes/pve/lxc|/api2/json/nodes/pve/lxc|$PVE_AUTH"
  "/api/uptime/api/status-page/default|/api/status-page/default|"
  "/api/uptime/api/status-page/heartbeat/default|/api/status-page/heartbeat/default|"
  "/api/updates/status.json|/status.json|"
  "/api/updates/containers.json|/containers.json|"
)
for entry in "${ALLOWED_GET[@]}"; do
  IFS='|' read -r p up auth <<<"$entry"
  check GET "$p" 200 "STUB GET $up auth=$auth"
  check HEAD "$p" 200
  for m in POST PUT PATCH DELETE; do check "$m" "$p" 403; done
done

# Runtime config: 404 (never the SPA index.html) when absent, 200 JSON when present.
check GET "/config/services.json" 404
docker exec "$GW" sh -c 'mkdir -p /usr/share/nginx/html/config && echo "{\"groups\":[]}" > /usr/share/nginx/html/config/services.json'
check GET "/config/services.json" 200 '{"groups":[]}'
CT="$(curl -s -o "$TMPW/null" -w '%{content_type}' "$BASE/config/services.json")"
case "$CT" in application/json*) PASS=$((PASS+1));; *) echo "FAIL services.json content-type '$CT'"; FAIL=$((FAIL+1));; esac

# Everything else under /api/ is 404 JSON, for any method, including traversal attempts.
NOT_FOUND='{"error":"not found"}'
DENIED=(
  "GET /api/proxmox/access/ticket"
  "POST /api/proxmox/access/ticket"
  "GET /api/proxmox/version"
  "GET /api/proxmox/nodes/pve/qemu"
  "GET /api/proxmox/nodes/pve/journal"
  "GET /api/proxmox/nodes/pve/apt/update"
  "GET /api/proxmox/nodes/pve/qemu/100/config"
  "POST /api/proxmox/nodes/pve/qemu/100/status/stop"
  "GET /api/proxmox/nodes/pve/statusX"
  "GET /api/proxmox/nodes/pve/status/x"
  "GET /api/proxmox/nodes/pve/../../access/ticket"
  "GET /api/proxmox/nodes/pve/%2e%2e/%2e%2e/access/ticket"
  "GET /api/proxmox/nodes/pve%2Fqemu/status"
  "GET /api/portainer/api/endpoints"
  "GET /api/jellyfin/Sessions"
  "GET /api/qbit/api/v2/transfer/info"
  "GET /api/radarr/api/v3/movie"
  "GET /api/sonarr/api/v3/calendar"
  "GET /api/jellyseerr/api/v1/request"
  "GET /api/todoist/api/v1/tasks"
  "GET /api/tailscale/api/v2/tailnet/-/devices"
  "GET /api/uptime/"
  "GET /api/uptime/socket.io/?EIO=4&transport=polling"
  "GET /api/uptime/api/status-page/other"
  "GET /api/updates/"
  "GET /api/updates/../etc/passwd"
  "GET /api/updates/containers.json.tmp"
  "GET /api/unknown"
  "GET /api/"
)
for entry in "${DENIED[@]}"; do check "${entry%% *}" "${entry#* }" 404 "$NOT_FOUND"; done

# SPA still served; security headers present; no version in Server header.
check GET "/" 200
check GET "/services" 200
HDRS="$(curl -s -D - -o "$TMPW/null" "$BASE/")"
for h in "Content-Security-Policy: default-src 'self'" "X-Content-Type-Options: nosniff" "X-Frame-Options: DENY" "Referrer-Policy: no-referrer"; do
  if grep -qiF "$h" <<<"$HDRS"; then PASS=$((PASS+1)); else echo "FAIL missing header: $h"; FAIL=$((FAIL+1)); fi
done
if grep -qiE '^Server: nginx/[0-9]' <<<"$HDRS"; then echo "FAIL Server header exposes version"; FAIL=$((FAIL+1)); else PASS=$((PASS+1)); fi
if grep -qiE 'googleapis|gstatic' <<<"$HDRS"; then echo "FAIL CSP mentions google"; FAIL=$((FAIL+1)); else PASS=$((PASS+1)); fi
CT="$(curl -s -o "$TMPW/null" -w '%{content_type}' "$BASE/api/unknown")"
if [ "$CT" = "application/json" ]; then PASS=$((PASS+1)); else echo "FAIL 404 content-type '$CT'"; FAIL=$((FAIL+1)); fi

# Startup validation: bad env must stop the container with a clear message that never echoes values.
# expect_refuse NAME EXPECTED_LOG_LINE LEAK_MARKER [docker env args...]
expect_refuse() {
  local name="$ID-$1" want="$2" leak="$3" code logs; shift 3
  create_gw "$name" "$@"
  docker start "$name" >/dev/null
  code="$(docker wait "$name")"; logs="$(docker logs "$name" 2>&1)"
  docker rm -f "$name" >/dev/null 2>&1
  if [ "$code" = 0 ]; then echo "FAIL $name: container started"; FAIL=$((FAIL+1)); return; fi
  if ! grep -qF "$want" <<<"$logs"; then echo "FAIL $name: log lacks '$want'"; FAIL=$((FAIL+1)); return; fi
  if [ -n "$leak" ] && grep -qF "$leak" <<<"$logs"; then echo "FAIL $name: log leaks a value"; FAIL=$((FAIL+1)); return; fi
  PASS=$((PASS+1))
}
BASE_ENV=(-e "PROXMOX_BACKEND_URL=http://$STUB" -e "UPTIME_KUMA_BACKEND_URL=http://$STUB" -e "UPDATES_BACKEND_URL=http://$STUB" -e "PVE_TOKEN_ID=$TOKEN_ID")
expect_refuse nosecret "missing PVE_TOKEN_SECRET" "" "${BASE_ENV[@]}"
expect_refuse slash "invalid PROXMOX_BACKEND_URL" "" -e "PROXMOX_BACKEND_URL=http://x/" -e "UPTIME_KUMA_BACKEND_URL=http://$STUB" -e "UPDATES_BACKEND_URL=http://$STUB" -e "PVE_TOKEN_ID=$TOKEN_ID" -e "PVE_TOKEN_SECRET=$TOKEN_SECRET"
expect_refuse badsecret "invalid PVE_TOKEN_SECRET" "s3cr;et" "${BASE_ENV[@]}" -e "PVE_TOKEN_SECRET=s3cr;et"

echo "gateway policy: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
