#!/usr/bin/env bash
# Gateway policy test: renders nginx.conf.template exactly like production (nginx image envsubst entrypoint),
# points every *_BACKEND_URL at a stub that echoes "STUB <method> <uri>", then asserts the allowlist.
# Needs only Docker and curl. Uses dummy values; never contacts real services.
set -euo pipefail

cd "$(dirname "$0")/.."
IMAGE="${NGINX_IMAGE:-nginx:alpine}"
ID="gwtest-$$"
NET="$ID-net"; STUB="$ID-stub"; GW="$ID-gw"
TMP="$(mktemp -d)"
FAIL=0; PASS=0

cleanup() {
  docker rm -f "$GW" "$STUB" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$TMP"
}
trap cleanup EXIT

docker network create "$NET" >/dev/null
docker run -d --name "$STUB" --network "$NET" "$IMAGE" sh -c \
  'printf "%s\n" "server { listen 80 default_server; default_type text/plain; location / { return 200 \"STUB \$request_method \$request_uri\"; } }" > /etc/nginx/conf.d/default.conf && exec nginx -g "daemon off;"' >/dev/null

ENV_ARGS=()
for v in PROXMOX PORTAINER UPTIME_KUMA JELLYFIN QBITTORRENT RADARR SONARR JELLYSEERR UPDATES TAILSCALE TODOIST; do
  ENV_ARGS+=(-e "${v}_BACKEND_URL=http://$STUB")
done
docker create --name "$GW" --network "$NET" -p 127.0.0.1::80 "${ENV_ARGS[@]}" "$IMAGE" >/dev/null
mkdir -p "$TMP/templates"
cp nginx.conf.template "$TMP/templates/default.conf.template"
docker cp "$TMP/templates" "$GW:/etc/nginx/" >/dev/null
docker start "$GW" >/dev/null

PORT="$(docker port "$GW" 80/tcp | head -1 | sed 's/.*://')"
BASE="http://127.0.0.1:$PORT"
for _ in $(seq 1 30); do
  curl -s -o /dev/null "$BASE/" && break
  if [ "$(docker inspect -f '{{.State.Running}}' "$GW")" != "true" ]; then
    echo "gateway exited during startup:"; docker logs "$GW" 2>&1 | tail -20; exit 1
  fi
  sleep 0.5
done

if docker exec "$GW" nginx -t >/dev/null 2>&1; then PASS=$((PASS+1)); else echo "FAIL nginx -t"; docker exec "$GW" nginx -t; FAIL=$((FAIL+1)); fi

# check METHOD PATH EXPECTED_STATUS [EXPECTED_BODY_EXACT]
check() {
  local method="$1" path="$2" want="$3" body="${4:-}" got out
  out="$TMP/body"
  if [ "$method" = HEAD ]; then
    got="$(curl -s --path-as-is -I -o "$out" -w '%{http_code}' "$BASE$path")"
  else
    got="$(curl -s --path-as-is -X "$method" -o "$out" -w '%{http_code}' "$BASE$path")"
  fi
  if [ "$got" != "$want" ]; then
    echo "FAIL $method $path: status $got, want $want"; FAIL=$((FAIL+1)); return
  fi
  if [ -n "$body" ] && [ "$(cat "$out")" != "$body" ]; then
    echo "FAIL $method $path: body '$(head -c 200 "$out")', want '$body'"; FAIL=$((FAIL+1)); return
  fi
  PASS=$((PASS+1))
}

# Allowed reads: "dashboard path|expected upstream URI"
ALLOWED_GET=(
  "/api/proxmox/nodes/pve/status|/api2/json/nodes/pve/status"
  "/api/proxmox/nodes/pve/qemu|/api2/json/nodes/pve/qemu"
  "/api/proxmox/nodes/pve/lxc|/api2/json/nodes/pve/lxc"
  "/api/proxmox/nodes/pve/storage|/api2/json/nodes/pve/storage"
  "/api/proxmox/nodes/pve/journal?lastentries=50|/api2/json/nodes/pve/journal?lastentries=50"
  "/api/proxmox/nodes/pve/apt/update|/api2/json/nodes/pve/apt/update"
  "/api/portainer/api/endpoints|/api/endpoints"
  "/api/portainer/api/endpoints/2/docker/containers/json?all=true|/api/endpoints/2/docker/containers/json?all=true"
  "/api/uptime/api/status-page/default|/api/status-page/default"
  "/api/uptime/api/status-page/heartbeat/default|/api/status-page/heartbeat/default"
  "/api/jellyfin/Sessions|/Sessions"
  "/api/jellyfin/Items/0a1b2c3d4e5f/Images/Primary?fillHeight=120&tag=x|/Items/0a1b2c3d4e5f/Images/Primary?fillHeight=120&tag=x"
  "/api/tailscale/api/v2/tailnet/-/devices|/api/v2/tailnet/-/devices"
  "/api/todoist/api/v1/tasks|/api/v1/tasks"
  "/api/todoist/api/v1/projects|/api/v1/projects"
  "/api/qbit/api/v2/transfer/info|/api/v2/transfer/info"
  "/api/qbit/api/v2/torrents/info?filter=active|/api/v2/torrents/info?filter=active"
  "/api/radarr/api/v3/movie?apikey=dummy|/api/v3/movie?apikey=dummy"
  "/api/radarr/api/v3/queue?apikey=dummy|/api/v3/queue?apikey=dummy"
  "/api/sonarr/api/v3/calendar?apikey=dummy&start=a&end=b|/api/v3/calendar?apikey=dummy&start=a&end=b"
  "/api/jellyseerr/api/v1/request?filter=pending|/api/v1/request?filter=pending"
  "/api/updates/status.json|/status.json"
)
for entry in "${ALLOWED_GET[@]}"; do
  p="${entry%%|*}"; up="${entry#*|}"
  check GET "$p" 200 "STUB GET $up"
  check HEAD "$p" 200
  for m in POST PUT PATCH DELETE; do check "$m" "$p" 403; done
done

# The single allowed write (Todoist complete task); other methods refused.
check POST "/api/todoist/api/v1/tasks/6X7rM8997g3RQmvh/close" 200 "STUB POST /api/v1/tasks/6X7rM8997g3RQmvh/close"
for m in GET PUT DELETE; do check "$m" "/api/todoist/api/v1/tasks/6X7rM8997g3RQmvh/close" 403; done

# Everything else under /api/ is 404 JSON, for any method, including traversal attempts.
NOT_FOUND='{"error":"not found"}'
DENIED=(
  "GET /api/proxmox/access/ticket"
  "POST /api/proxmox/access/ticket"
  "GET /api/proxmox/version"
  "GET /api/proxmox/nodes/pve/qemu/100/config"
  "POST /api/proxmox/nodes/pve/qemu/100/status/stop"
  "GET /api/proxmox/nodes/pve/statusX"
  "GET /api/proxmox/nodes/pve/status/x"
  "GET /api/proxmox/nodes/pve/../../access/ticket"
  "GET /api/proxmox/nodes/pve/%2e%2e/%2e%2e/access/ticket"
  "GET /api/proxmox/nodes/pve%2Fqemu/status"
  "GET /api/portainer/api/stacks"
  "GET /api/portainer/api/endpoints/2/docker/containers/abc/json"
  "GET /api/portainer/api/endpoints/2/docker/containers/abc/archive?path=/etc"
  "POST /api/portainer/api/endpoints/2/docker/containers/create"
  "GET /api/portainer/api/endpoints/x/docker/containers/json"
  "GET /api/uptime/"
  "GET /api/uptime/socket.io/?EIO=4&transport=polling"
  "GET /api/uptime/api/status-page/other"
  "GET /api/jellyfin/Users"
  "GET /api/jellyfin/Items/abc/Images/Backdrop"
  "GET /api/tailscale/api/v2/tailnet/-/keys"
  "DELETE /api/tailscale/api/v2/device/123"
  "GET /api/todoist/api/v1/tasks/123"
  "GET /api/qbit/api/v2/app/preferences"
  "POST /api/qbit/api/v2/app/setPreferences"
  "POST /api/qbit/api/v2/torrents/add"
  "GET /api/radarr/api/v3/system/status"
  "DELETE /api/radarr/api/v3/movie/1"
  "GET /api/sonarr/api/v3/series"
  "GET /api/jellyseerr/api/v1/settings/main"
  "GET /api/updates/"
  "GET /api/updates/../etc/passwd"
  "GET /api/unknown"
  "GET /api/"
)
for entry in "${DENIED[@]}"; do check "${entry%% *}" "${entry#* }" 404 "$NOT_FOUND"; done

# SPA still served; security headers present; no version in Server header.
check GET "/" 200
check GET "/services" 200
HDRS="$(curl -s -D - -o /dev/null "$BASE/")"
for h in "Content-Security-Policy: default-src 'self'" "X-Content-Type-Options: nosniff" "X-Frame-Options: DENY" "Referrer-Policy: no-referrer"; do
  if grep -qiF "$h" <<<"$HDRS"; then PASS=$((PASS+1)); else echo "FAIL missing header: $h"; FAIL=$((FAIL+1)); fi
done
if grep -qiE '^Server: nginx/[0-9]' <<<"$HDRS"; then echo "FAIL Server header exposes version"; FAIL=$((FAIL+1)); else PASS=$((PASS+1)); fi
CT="$(curl -s -o /dev/null -w '%{content_type}' "$BASE/api/unknown")"
if [ "$CT" = "application/json" ]; then PASS=$((PASS+1)); else echo "FAIL 404 content-type '$CT'"; FAIL=$((FAIL+1)); fi

echo "gateway policy: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
