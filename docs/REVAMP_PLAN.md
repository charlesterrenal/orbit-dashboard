# Orbit Dashboard: Revamp Plan

> **Note:** S2 and S3 of this plan are superseded by the Orbit unslop rewrite (fresh frontend, one read-only PVE token). S0 and S1 stand.

Companion to `docs/AUDIT.md` (finding IDs F01-F29). Date: 2026-11-14, revision 2 after external review.

## 1. Recommendation: refactor in place, do not rewrite

- **The serious problems live in the gateway, credential and config layer**: F01-F05, F08, F23-F25. Fixing them touches `nginx.conf.template`, `Dockerfile`, env handling and about 15 fetch call sites. A rewrite does not make that easier.
- **The codebase is small**: about 3.5k live lines of React on a current stack. 1.4k dead lines can simply be deleted.
- **Default to nginx, add a small backend only where nginx cannot do the job.** nginx covers exact-path and method policy, header injection, caching and runtime config. It cannot do three things here, and a tiny service (or a cron-driven token refresher) is justified if you want any of them:
  - Tailscale OAuth access-token refresh (D4).
  - qBittorrent session login (D5).
  - Filtering sensitive fields out of responses, e.g. Portainer.

  Resource cost is not a valid argument against such a service on an 8 GB host. Pick the simplest thing that meets the access requirements.

## 2. Target architecture

```
Your devices (tailnet ACL limits who)            optional: public hostname behind Cloudflare Access (D1)
   │ HTTPS (Tailscale Serve, identity-aware)
   ▼
tailscale serve :443 ──► 127.0.0.1:80  (dashboard container published on loopback only)
                           nginx
                           ├─ security headers, server_tokens off
                           ├─ exact endpoint locations, per-location method policy
                           ├─ location /api/ { return 404; }   ← unmatched API paths never fall to the SPA
                           ├─ credentials injected server-side; validated at startup
                           ├─ proxy_ssl_verify on for PVE/Portainer (their CA)
                           ├─ resolver + variable proxy_pass for internet upstreams
                           └─ /config/*.json (optional runtime config track)
```

**Where auth lives:**
1. **Access and identity**: tailnet ACL (or Cloudflare Access if public). The container is never published on a LAN or public interface. If you need direct LAN access without Tailscale, that requires TLS plus real auth (NPM with TLS + access list/forward-auth). Choose in D1.
2. **Endpoint policy**: only the exact reads the widgets use, with constrained IDs and parameters.
3. **Credential scope**: least privilege where the integration supports it. Several do not: Radarr, Sonarr and Jellyseerr keys are admin-level, Jellyfin API keys are admin-level, and Portainer CE has no read-only role (all unverified per your versions). For those, layer 2 is the real control.

**Feasibility note (unverified):** running `tailscaled` inside the Docker LXC needs `/dev/net/tun` passed to the container. The alternative is running Serve on the PVE host or another LXC, proxying to the dashboard's LAN IP, with a firewall rule allowing only that source.

## 3. Rules for every PR
- **Rollback never re-opens exposure.** If a change has to be backed out, roll back to "dashboard stopped" or "containment still in place", never to the old `0.0.0.0:80` state.
- **Never test against production with destructive requests.** Policy tests run against stub upstreams with dummy credentials (S1). OPTIONS alone does not prove anything: test every method.
- **Each PR keeps a working contract** between frontend and gateway. A path is removed from nginx only in the same PR that stops the frontend calling it.
- **envsubst does no escaping.** Any value substituted into nginx config or JSON is validated first (S2).

## 4. Security track (mandatory, in order)

### S0: Containment (host + compose; do now)
- **Goal:** only trusted identities reach the dashboard, over an encrypted path. Addresses F02, F03, F25.
- **Steps:**
  1. Run AUDIT §8.4 and §8.7 to find every ingress path: LAN, Tailscale, NPM, cloudflared, Funnel.
  2. Delete any tunnel, NPM or Funnel route to the dashboard.
  3. Change `docker-compose.yml` to `ports: - "127.0.0.1:80:80"` and front it with `tailscale serve`, or the D1 alternative.
  4. In qBittorrent, set `AutoRun` off.
  5. If §8.7 shows **any public exposure**, revoke all credentials in the bundle now, accepting broken widgets until S2.
- **Verify:** repeat §8.7 from LAN, guest Wi-Fi, tailnet and cellular. Only the intended zone gets JSON from `/api/updates/status.json`.
- **Rollback:** `docker compose stop`. Do not restore `"80:80"`.

### S1: Gateway policy + tests
- **Goal:** the gateway allows exactly what the current frontend uses and nothing else, proven by tests. Addresses F02, F08, F15 (headers), F23, F14.
- **Files:** `nginx.conf.template`, new `scripts/test-gateway.sh`, new `.github/workflows/ci.yml`.
- **Allowlist (the current frontend contract):**

| Integration | Methods | Paths (after `/api/<name>`) |
|---|---|---|
| proxmox | GET | `/nodes/<node>/{status,qemu,lxc,storage,journal,apt/update}` (`apt/update` removed in S3) |
| portainer | GET | `/api/endpoints`, `/api/endpoints/<int>/docker/containers/json` |
| uptime | GET | `/api/status-page/default`, `/api/status-page/heartbeat/default` |
| jellyfin | GET | `/Sessions`, `/Items/<id>/Images/Primary` |
| tailscale | GET | `/api/v2/tailnet/-/devices` |
| todoist | GET; POST (D3) | `/api/v1/tasks`, `/api/v1/projects`; POST `/api/v1/tasks/<id>/close` |
| qbit | GET | `/api/v2/transfer/info`, `/api/v2/torrents/info` |
| radarr | GET | `/api/v3/movie`, `/api/v3/queue` |
| sonarr | GET | `/api/v3/calendar` |
| jellyseerr | GET | `/api/v1/request` |
| updates | GET | `/status.json` |

- **nginx details:**
  - Fixed paths use `location = /api/x/... { proxy_pass <upstream>/<path>; }`.
  - Parameterized paths use a regex location with **`rewrite … break;` and `proxy_pass` without a URI**. nginx rejects a URI part in `proxy_pass` inside regex locations. Example: `location ~ ^/api/proxmox/nodes/[a-z0-9-]+/(status|qemu|lxc|storage|journal)$ { rewrite ^/api/proxmox/(.*)$ /api2/json/$1 break; proxy_pass ${PROXMOX_BACKEND_URL}; }`.
  - Fallback: `location /api/ { return 404; }`.
  - Methods: `limit_except GET { deny all; }`. That also allows HEAD, which is acceptable because HEAD is a bodiless GET. For the Todoist POST location, use an explicit `if ($request_method != POST) { return 405; }`.
  - Timeouts: `proxy_connect_timeout 3s; proxy_read_timeout 10s;`.
  - Hide `Set-Cookie` from integrations that don't need cookies.
  - Query strings pass through unchanged. That is acceptable for the listed endpoints; note it as residual risk.
  - Headers: `server_tokens off`, `X-Content-Type-Options nosniff`, `Referrer-Policy no-referrer`, and a CSP that matches the current app: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://api.open-meteo.com https://api.codetabs.com; frame-ancestors 'none'; base-uri 'none'`. `'unsafe-inline'` is needed for React inline styles. Drop codetabs in S2.
- **Tests (same PR):** `scripts/test-gateway.sh` renders the template with dummy env, pointing every upstream at a local stub (an `nginx:alpine` container that echoes `$request_method $uri`). It then asserts:
  - `nginx -t` passes.
  - Every allowlisted GET reaches the stub with the expected upstream URI.
  - POST, PUT, PATCH and DELETE on each GET location return 403.
  - Non-allowlisted paths such as `/api/proxmox/access/ticket`, `/api/portainer/api/endpoints/1/docker/containers/x/archive` and `/api/uptime/` return 404 with a non-HTML body.

  CI runs it plus `npm ci && npx oxlint src && npm run build`.
- **Verify:** CI green. Every widget loads in the browser against real upstreams with GET only.
- **Rollback:** `git revert`. S0 containment stays in place, so this does not re-open exposure.

### S2: Credentials server-side, then rotate
- **Goal:** no credential reaches the browser, the build context or plain-HTTP hops. Addresses F01, F05, F15 (TLS), F16, F24, F29, and the F20 security docs.
- **Files:**
  - `nginx.conf.template`: `proxy_set_header Authorization "PVEAPIToken=${PVE_TOKEN_ID}=${PVE_TOKEN_SECRET}";`, `X-API-Key`, `X-Emby-Token`, `X-Api-Key` and `Bearer`. Add `location = /api/calendar.ics` with `proxy_pass` to `${CALENDAR_ICS_URL}` through a variable and `resolver`. Add `proxy_ssl_verify on; proxy_ssl_trusted_certificate …;` for PVE and Portainer.
  - New `docker/15-validate-env.sh` in `/docker-entrypoint.d/`. It rejects values containing newline, `"`, `'`, `$`, `;`, `{`, `}` or spaces, requires `*_BACKEND_URL` to match `^https?://[^/ ]+$`, and fails with a clear message.
  - `vite.config.js`: dev proxy injects the same headers from non-`VITE_` env.
  - Frontend: remove every `import.meta.env.VITE_*` credential (files listed in F01). Radarr/Sonarr drop `?apikey=`. `calendar.js` fetches `/api/calendar.ics`. Mock mode becomes `import.meta.env.DEV && import.meta.env.VITE_MOCK === '1'`.
  - `.env.example`: new names, blank values, generic token ID.
  - `.dockerignore`: add `.env*` only. **Do not** exclude `src/config/services.json` yet, because it is still imported at build time.
  - `.gitignore`: add `.env` and `.env.*` with `!.env.example`.
  - `README.md`: security model section.
- **Tailscale:** an OAuth client secret in a static header does not work, because access tokens must be issued and refreshed. Options are in D4.
- **Verify:**
  - `npm run build` with no `.env*`, then `grep -rlE 'PVEAPIToken=|apikey=|X-API-Key|tskey-' dist/` prints nothing.
  - The audit's value-match loop (names only) shows 0 hits in `dist/`.
  - The S1 tests still pass.
  - Widgets load.
- **Rotation order:**
  1. Prepare new credentials.
  2. Deploy S2 with them.
  3. Verify.
  4. **Revoke the old credentials the same day.**

  Rotate: PVE token, Portainer key, Jellyfin key, Tailscale credential, Radarr, Sonarr, Jellyseerr, Todoist, and reset the Google Calendar secret address.
- **Artifact cleanup:**
  1. Delete the local `dist/`.
  2. Run `docker image prune -a` (for old dashboard images) and `docker builder prune`.
  3. Check GHCR for old packages.
- **Rollback:** fix forward. Reverting would need the new credentials back in `VITE_` vars, which re-exposes them. Under containment, stopping the dashboard is the rollback.

### S3: Least privilege
- **Goal:** minimize what each credential can do. Addresses F04, F09, F03.
- **Steps:**
  - PVE: create a role with `Sys.Audit VM.Audit Datastore.Audit Sys.Syslog` and a token with `--privsep 1`. Set ACLs for **both** the user and the token, because the effective permission is their intersection.
  - Have the update cron write `pending_count` into `status.json`. In the same PR, switch `getPendingUpdates` to read that field and remove `apt/update` from the nginx allowlist and its test.
  - Bind the update-status server to the LAN IP and firewall it to the dashboard's source IP.
  - Portainer: use a non-admin user limited to the needed environment. In CE that is still not read-only (unverified per version), so the endpoint allowlist remains the control.
  - qBittorrent: apply D5.
- **Verify:** `pveum user token permissions …` shows only those privileges. The pending count still shows. The S1 tests are updated and pass.
- **Rollback:** re-grant the specific privilege and re-add the path, both under containment.

## 5. Reliability track (recommended, one PR each, any order after S2)
- **R1 Startup and config:**
  - Extend the entrypoint so a missing `*_BACKEND_URL` renders that integration's locations as `return 503 '{"error":"not configured"}'` instead of crashing.
  - Add `resolver 127.0.0.11` + variable `proxy_pass` for internet upstreams.
  - Add a compose `healthcheck`.
  - *Verify:* boot with one var unset → container healthy, that widget shows "not configured". Boot with WAN unplugged → nginx starts. *Rollback:* `git revert`.
- **R2 Fetch and polling:**
  - New `src/api/http.js` `fetchJson(url, {timeout})` with `AbortController` and an `ok` check.
  - New `usePoll(fn, ms)` that schedules the next poll after completion and pauses when `document.hidden`.
  - Fixes the Todoist optimistic removal and the guest status check (F22). Remove the journal `console.log`.
  - *Verify:* with an upstream stubbed to hang, DevTools shows at most 1 in-flight request per widget. *Rollback:* `git revert`.
- **R3 Honest UI states:**
  - Replace every fabricated fallback (AUDIT §3.3), including `|| 22` / `|| 3`.
  - `uptime.js` signals failure instead of returning `{}`.
  - Per-widget error boundaries.
  - Calendar: null-safe fields (F26) and separate empty/failed states.
  - *Verify:* stop Kuma → "status unknown". Block PVE → "unavailable". An ICS fixture with no SUMMARY renders without crashing. *Rollback:* `git revert`.

## 6. Optional follow-ups (no fixed order; skip any)
- **Runtime config (F13):**
  - Load `services.json` from `/config/services.json`.
  - Remove the 5 imports.
  - Mount the file as a volume.
  - **Now** add `src/config/services.json` to `.dockerignore`.
  - Put non-secret settings in `/config/app.json`, rendered with validated values.
- **Polling cost (F12):**
  - Shared node-status poller.
  - Radarr: first decide the intended behaviour. The widget renders queue records (`RadarrWidget.jsx:79-87`), so keep `/api/v3/queue`. Replace the full `/movie` fetch only after confirming `wanted/missing?pageSize=1&monitored=true` gives the same count.
  - Keep the collapsed activity indicator (it needs a light poll) unless you agree to drop it.
- **Client cost (F21):**
  - Particles honour `prefers-reduced-motion`, with fewer particles and a lower fps cap.
  - Lazy-load ical.js and tsparticles.
  - Self-host the font or use the system font stack.
  - Size or CPU targets are goals to measure, not promises.
- **Calendar recurrence (F27)** and **link policy (F28):** http(s) only, `noopener,noreferrer`.
- **Cleanup (F18, F19):**
  - Delete dead components, `app.js`, `site.html`, `handoff.md` and the manual test scripts.
  - Remove `socket.io-client`.
  - Bump vite and puppeteer, or drop puppeteer.
  - Supported Node LTS builder and a pinned nginx tag.
  - UTF-8 `AGENTS.md`.
- **Docs and repo privacy (F10, F20):**
  - Rewrite `CONTEXT.md`.
  - Remove the coordinates, LAN IP and token ID from HEAD.
  - Optional history rewrite (D2).
- **Unit tests** for the parsers and formatters (`node --test`, no new dependency).

## 7. Decisions you need to make
1. **D1 Access path.** Tailscale Serve only (recommended), LAN with TLS + auth via NPM, or a public hostname behind Cloudflare Access? Also: who besides you must see it? Other people means real per-user auth.
2. **D2 Git history.** Rewrite history to purge the coordinates, old `services.json` and `app.js`, and force-push? Or clean HEAD only and accept that they are already public?
3. **D3 Todoist writes.** Keep "complete task" (one allowlisted POST) or go read-only?
4. **D4 Tailscale credential.** Short-lived API key in nginx (still full-access), an OAuth client plus a small refresher (cron or backend) scoped `devices:core:read`, or drop the widget?
5. **D5 qBittorrent.** /32 bypass plus exact GET paths (trusts every dashboard visitor), a small backend with session login, or drop the widget?
6. **D6 Host upgrades.** Keep unattended PVE host upgrades (using the release's documented `dist-upgrade`/`full-upgrade`), or make the host attended or notify-only while LXCs stay automatic?

Defaults I will use unless you object:
- Particles reduced, not removed.
- System font stack.
- Drop puppeteer.
- `node --test` rather than Vitest.
