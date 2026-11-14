# Orbit Dashboard: Pre-Revamp Audit

- Audit date: 2026-11-14 (revision 2, after an external review by Codex; see §10)
- Commit audited: `db7ec9a` (branch `main`, working tree clean)
- Scope: read-only review of the repo, its git history, the local `dist/` build (dated 2026-10-11), `npm audit`/`npm ls`/lint output, and a throwaway build in a scratch copy with no `.env.local`. No homelab service was contacted, no Docker container was run, and no host command was executed.
- Secret handling: no secret value appears here. Values are shown only as `[REDACTED]`. "Present" means the value from `.env.local` was matched without printing it.
- Legend: **verified** = seen in code, command output or history. **unverified** = inferred from code or upstream docs, not checked against the live host.

---

## 1. Verdict

**Do not keep running it as-is on any network where someone other than you can reach it.** Your notes say nginx attaches the API tokens. It does not. All tokens use the `VITE_` prefix, so Vite compiles them into the public JavaScript bundle. I verified that 10 values from `.env.local` are in the served bundle: 9 secrets (Proxmox token secret, Portainer, Jellyfin, Tailscale, Radarr, Sonarr, Jellyseerr, Todoist, private calendar URL) plus the Proxmox token ID.

Anyone who opens the page can read those secrets. The nginx proxy has no auth and forwards every method and path, so they can then use them against PVE, Portainer, Radarr and Sonarr for writes, and for sensitive reads such as container environment variables, files and logs. qBittorrent appears to need no token at all (unverified). Traffic is plain HTTP, so the credentials also cross the network unencrypted. Only the live permissions of each credential decide how bad this is (unverified).

**Fix in this order:**
1. **Contain.** Find every ingress path, remove the public ones, and restrict access to trusted identities over an encrypted path. Rollback must never re-open exposure.
2. **Lock the gateway.** Exact endpoint and method policies, tested against stub upstreams.
3. **Move credentials server-side and rotate promptly.** Revoke the old credentials immediately if any public exposure is found.
4. **Least privilege** where each integration supports it.

Reliability work comes after these: honest failure states, startup validation, and fetch timeouts. Refactor in place. Do not rewrite. A small backend is acceptable where nginx cannot do the job (see `REVAMP_PLAN.md`).

---

## 2. Repo facts (verified)

| Item | Finding |
|---|---|
| Remote | `git@github.com:charlesterrenal/orbit-dashboard.git`, **PUBLIC**. Remote has only `refs/heads/main` (`git ls-remote`). 0 forks (GitHub API). Last push 2026-10-11 |
| History | 79 commits. Local-only branches: `dynamic-dashboard`, `dynamic-nodes`. No unreachable objects (`git fsck --unreachable --no-reflogs`). A GHCR publish workflow was removed in `509fef8` (2026-08-03). Whether GHCR images still exist is unverified (`gh` token lacks `read:packages`) |
| Stack | React 19.2.8, react-router-dom 7.18.2, Vite 8.2.0, oxlint 1.76, lucide-react, simple-icons, @tsparticles 3.9, ical.js 2.2. `socket.io-client` is unused in `src/`. puppeteer is a dev dependency used for screenshots |
| Build/serve | `Dockerfile`: `node:20-alpine` builder, then `nginx:alpine`. `nginx.conf.template` is rendered by the nginx image's envsubst entrypoint. `docker-compose.yml:13` publishes `"80:80"` on all host interfaces. Env file is `.env.local` |
| Config | `src/config/services.json` is gitignored and present locally. It is imported at build time in 5 files |

---

## 3. Code map and data flow

### 3.1 Live component tree
```
main.jsx → App.jsx
  ├─ ParticleBackground (tsparticles, all pages)
  ├─ Sidebar, CommandPalette (services.json, navigation, theme, reload)
  └─ Routes
     ├─ /            Home.jsx
     │   ├─ GreetingClock     → uptime.js (Kuma status page)
     │   ├─ SystemStats       → proxmox.js getClusterStatus (5s), getNodeGuests (15s)
     │   ├─ NetworkStorageWidget → getClusterStatus (3s), getStorageStatus + updates.js (60s)
     │   ├─ OverviewCard      → uptime.js, Portainer, Tailscale, Jellyfin (once on mount)
     │   ├─ CalendarWidget    → calendar.js via api.codetabs.com (once)
     │   ├─ TodoistWidget     → Todoist (once + manual), POST close
     │   ├─ WeatherWidget     → api.open-meteo.com direct (once)
     │   └─ ActivityFeedWidget→ proxmox.js getSyslog = /journal (30s)
     ├─ /services    Services.jsx
     │   ├─ ServiceGrid → ServiceCard (uptime 30s, shared) + Radarr/Sonarr/Jellyseerr/Jellyfin widgets
     │   ├─ TailscaleWidget (60s)
     │   └─ QbittorrentWidget (3s)
     └─ /containers  Containers.jsx → DockerWidget (Portainer, 15s)
```
**Unused (dead) components, 1,421 lines:** `DockerSummaryWidget`, `JellyfinSummaryWidget`, `NetworkWidget`, `PopoverMenu`, `ProxmoxPanel` (442 lines), `ServiceIcon`, `ServicesSummaryWidget`, `StorageWidget`, `TailscaleSummaryWidget`, `ThemeToggle`, `UpdateStatusWidget`. The "update-status widget" in your notes is the update row inside `NetworkStorageWidget`.

`setInterval` call sites: 22 in `src/`, 15 of them in live components.

### 3.2 Integration flow (route → nginx location → upstream → widget)

| Integration | Browser call | nginx location (`nginx.conf.template`) | Upstream | Auth: where it comes from | Widget, interval |
|---|---|---|---|---|---|
| Proxmox status | `/api/proxmox/nodes/{node}/status` | `:11-16` → `${PROXMOX_BACKEND_URL}/api2/json/` | PVE :8006 | `Authorization: PVEAPIToken=…` built **in the browser** (`src/api/proxmox.js:30`) | SystemStats 5s (`SystemStats.jsx:60`) **and** NetworkStorageWidget 3s (`NetworkStorageWidget.jsx:73`) |
| Proxmox guests | `/nodes/{node}/qemu`, `/lxc` | same | PVE | browser (`proxmox.js:72`) | SystemStats 15s |
| Proxmox storage | `/nodes/{node}/storage` | same | PVE | browser (`proxmox.js:111`) | NetworkStorageWidget 60s |
| Proxmox journal | `/nodes/{node}/journal?lastentries=50` | same | PVE | browser (`proxmox.js:150`) | ActivityFeedWidget 30s. This is the **syslog journal, not the task log** |
| Pending updates | `/nodes/{node}/apt/update` (GET) | same | PVE | browser (`updates.js:45`) | NetworkStorageWidget 60s. Failure becomes "0 pending" (`updates.js:51-53`) |
| Update status | `/api/updates/status.json` | `:69-72` | python http.server :8199 on PVE host (per `CONTEXT.md:209-216`) | none | NetworkStorageWidget 60s |
| Portainer | `/api/portainer/api/endpoints`, `/endpoints/{id}/docker/containers/json?all=true` | `:18-22` (whole Portainer + Docker API) | Portainer :9443 | `X-API-Key` from browser (`DockerWidget.jsx:12`, `OverviewCard.jsx:50`) | DockerWidget 15s. OverviewCard once |
| Uptime Kuma | `/api/uptime/api/status-page/default`, `/heartbeat/default` | `:24-30` (whole app, websocket upgrade) | Kuma :3001 | none (public status page) | `uptime.js`, 30s module cache |
| Tailscale | `/api/tailscale/api/v2/tailnet/-/devices` | `:37-40` | api.tailscale.com | `Bearer` from browser (`TailscaleWidget.jsx:11`, `OverviewCard.jsx:98`) | 60s. OverviewCard once |
| Jellyfin | `/api/jellyfin/Sessions`; `<img src="/api/jellyfin/Items/{id}/Images/Primary…">` (`JellyfinWidget.jsx:92`) | `:32-35` | Jellyfin :8096 | `X-Emby-Token` from browser (`JellyfinWidget.jsx:11`). The image request sends no header | 15s. OverviewCard once |
| qBittorrent | `/api/qbit/api/v2/transfer/info`, `/torrents/info?filter=active` | `:47-52` (Origin/Referer forced to backend, Host=`$host`) | qBit :8080 | none in code. Bypass or existing cookie (see F03) | 3s |
| Radarr | `/api/radarr/api/v3/movie?apikey=…`, `/queue?apikey=…` | `:54-57` | Radarr :7878 | key in query string (`RadarrWidget.jsx:20,28`) | 10s, even when collapsed. Renders queue records (`RadarrWidget.jsx:79-87`) |
| Sonarr | `/api/sonarr/api/v3/calendar?apikey=…` | `:59-62` | Sonarr :8989 | key in query string (`SonarrWidget.jsx:27`) | 5 min |
| Jellyseerr | `/api/jellyseerr/api/v1/request?filter=pending` | `:64-67` | Jellyseerr :5055 | `X-Api-Key` from browser (`JellyseerrWidget.jsx:10`) | 60s |
| Todoist | GET `/api/todoist/api/v1/tasks`, `/projects`; **POST** `/tasks/{id}/close` | `:42-45` | api.todoist.com | `Bearer` from browser (`TodoistWidget.jsx:5,25,68-71`) | once + manual |
| Calendar | `https://api.codetabs.com/v1/proxy?quest=<private ICS URL>` | **none** (third-party proxy) | Google ICS via codetabs | the secret is the URL itself (`calendar.js:7`, `CalendarWidget.jsx:6`) | once |
| Weather | `https://api.open-meteo.com/...` | none (direct) | Open-Meteo | none | once (`WeatherWidget.jsx:37`) |

### 3.3 Loading, error and empty states
Fabricated data on failure, in production and not only in dev. The list includes only branches that ordinary failures can reach; helpers that swallow errors are noted.
- `SystemStats.jsx:41-52`: fake CPU/RAM when `getClusterStatus` throws. It is labelled "mock data".
- `NetworkStorageWidget.jsx:65-69`: fake 12.4 MB/s down and 3.1 MB/s up when `getClusterStatus` throws.
- `NetworkStorageWidget.jsx:96-101`: fake storage bars when the storage call is rejected. The catch at `:105-113` is effectively unreachable because `Promise.allSettled` never rejects.
- `NetworkStorageWidget.jsx:125`: an unreachable `status.json` shows as "up to date".
- `updates.js:51-53`: an `apt/update` failure shows as "0 pending".
- `OverviewCard.jsx:12,16`: fake 22/22 containers and 3/4 Tailscale devices before load.
- `OverviewCard.jsx:86,123`: the same fakes on fetch failure.
- `OverviewCard.jsx:83,120`: `running || 22` and `active || 3` turn a real **0** into 22 or 3.
- `uptime.js:51-54` returns `{}` on failure. As a result, `OverviewCard.jsx:33` falls back to the static `"status": "online"` in `services.json`, and `GreetingClock.jsx:20-24` says "all systems operational". The catch blocks at `OverviewCard.jsx:38` and `GreetingClock.jsx:26` are unreachable for the same reason.
- `proxmox.js:89-92` (`getNodeGuests`) returns `null` on failure, so the `SystemStats.jsx:67` fallback is unreachable. A 401 gives 0/0 guests (F22).
- `calendar.js:28-31` returns `[]` on failure, so a failure shows the empty state (`CalendarWidget.jsx:146`).

Mock mode is keyed on `VITE_PROXMOX_SECRET` being empty (`proxmox.js:6,58,96,133`, `updates.js:7,35`). There is no React error boundary, so one render exception blanks the whole app (see F26).

---

## 4. Findings

Severity assumes the dashboard is reachable by people other than you (LAN guests, tailnet devices or the internet). Effort: S = under 2 h, M = half day to 2 days, L = more than 2 days.

| ID | Sev | Area | Evidence | Impact | Recommended fix | Effort |
|---|---|---|---|---|---|---|
| F01 | **critical** | Secrets | `VITE_` credentials used in browser code: `src/api/proxmox.js:30,72,111,150`, `src/api/updates.js:45`, `DockerWidget.jsx:12`, `OverviewCard.jsx:50,98,135`, `TailscaleWidget.jsx:11`, `JellyfinWidget.jsx:11`, `RadarrWidget.jsx:11`, `SonarrWidget.jsx:10`, `JellyseerrWidget.jsx:10`, `TodoistWidget.jsx:5`, `CalendarWidget.jsx:6`. Template `.env.example:20-36`. **Verified** (independently confirmed by the reviewer): 10 values (9 secrets + token ID) in `dist/assets/index-Bsd_Xo-L.js` | Anyone who loads the page gets every credential. Tailscale API keys are full-access. A Portainer key acts with its user's role. PVE: see F04 | Server-side credentials (nginx or a small backend), then **rotate**. See F24 for artifacts | M |
| F02 | **critical** | Gateway writes | `nginx.conf.template:11-72`: no auth, no `allow`/`deny`, no method limits, prefix locations. `docker-compose.yml:13` binds all interfaces | Visitors can send POST/PUT/DELETE through the dashboard to PVE (`:11`), Portainer/Docker (`:18`), Radarr (`:54`), Sonarr (`:59`) and others. Depending on credential permissions (unverified) that means guest shutdown or deletion, container create/exec, config changes and media deletion. It reaches upstreams even when they are firewalled to the dashboard host. nginx does not add the credentials itself; visitors take them from the bundle. **Do not test destructive calls against production** | Containment, then exact endpoint and method policies (Plan S0/S1) | S |
| F03 | **high, potentially critical** (unverified) | qBittorrent | No login call in `src/`. Bare requests at `QbittorrentWidget.jsx:16,22`. `nginx.conf.template:49-51` | Most likely relies on the WebUI auth bypass. The alternative is a SID cookie already set for the dashboard host (only if you logged in through `/api/qbit/` on that origin). With the bypass, anyone reaching `/api/qbit/` controls qBittorrent, and with AutoRun enabled that is code execution in its container. A /32 bypass for the dashboard IP still trusts **every visitor the dashboard forwards** | Containment first. Then GET-only on the 2 paths, AutoRun off, and either keep a /32 bypass with exact-path gating, use a backend with session login, or drop the widget (D5). Find the source IP qBit actually sees after NAT before choosing a /32 | S-M |
| F04 | **high if confirmed** (unverified) | Proxmox privilege | `updates.js:43` calls GET `/nodes/{node}/apt/update`, which per the PVE API schema needs `Sys.Modify` on `/nodes/{node}`. Failures are swallowed into "0 pending" (`updates.js:51-53`), so the call proves nothing on its own. `/journal` needs `Sys.Syslog` | **If the pending count works in production**, the token holds `Sys.Modify` on the node. That also permits `POST apt/update`, DNS/hosts/network config and service restarts. With `privsep=0` the token inherits the user's full rights | Check effective permissions (§8.1). Use a privilege-separated token with a read-only role on **both** the user and token ACLs. Move the pending count into the cron's `status.json` | S |
| F05 | **high** | Privacy, availability | `src/api/calendar.js:7` sends the private Google ICS URL to `api.codetabs.com`. Proxy swaps in history: `b8f2acb` corsproxy.io, `9aeee5e` allorigins, `fcb8d82` codetabs | Every proxy operator so far received a URL that grants read access to the calendar until you reset the secret address. The widget breaks whenever a free proxy fails | Fetch the ICS through nginx or a backend, then reset the Google secret address | S |
| F06 | **high** (reviewer: medium, see §10) | Reliability | Reachable fabricated states, §3.3 (`NetworkStorageWidget.jsx:67,98,125`, `updates.js:51-53`, `OverviewCard.jsx:83,86,120,123`, `uptime.js:51-54` → `GreetingClock.jsx:20-24`) | The dashboard's job is health status, and it reports "up to date", "0 pending", "all systems operational" or fake storage when it simply cannot reach anything | Explicit unavailable/stale states. Mock data only behind `import.meta.env.DEV` | M |
| F07 | **medium** | Deploy | 11 `${*_BACKEND_URL}` in `nginx.conf.template:13-70`. No validation script. Standard nginx-image behaviour: only **defined** vars are substituted, so undefined ones stay literal and cause `unknown variable`, and empty ones give an invalid `proxy_pass`. Hostname upstreams are resolved at startup. `restart: unless-stopped` loops. **Static analysis only; startup not executed** | One missing optional integration, or no DNS at boot, takes the whole dashboard down | Entrypoint validation that disables unset integrations, `resolver` + variable `proxy_pass`, healthcheck | S |
| F08 | **medium** | Exposure surface | Prefixes at `nginx.conf.template:11,24` reach PVE `/access/ticket` and the whole Kuma app (login, socket.io) | Password-guessing surface through the dashboard, bypassing firewalls on :8006/:3001. Brute-force protections and whether login works through this path are unverified | Exact-path allowlists | S |
| F09 | **medium if confirmed** (unverified) | Host | `CONTEXT.md:202-216` describes the services. The unit file and update script are not in the repo. `python3 -m http.server` binds all interfaces unless `--bind` is passed | Unauthenticated listing on every interface. Unattended host upgrades on a hypervisor with nobody watching | Bind the update-status server to the LAN IP and firewall it to the dashboard's source IP (not loopback, because the dashboard runs elsewhere). Host upgrades: follow the installed PVE release's procedure. Proxmox documents `apt dist-upgrade`/`full-upgrade`, not `apt upgrade`. Make host runs attended or notify-only with a backup first (D6) | S |
| F10 | **medium** | Privacy (public repo) | Home coordinates as defaults in `WeatherWidget.jsx:4-5` since `87deba0`. LAN IP in `QbittorrentWidget.jsx:7` (`db7ec9a`). Real PVE token ID in `.env.example:20` and `CONTEXT.md:25,154`. Portfolio `app.js` with an n8n webhook URL (`87deba0`). Personal domains and LAN URLs in `src/config/services.json` (`87deba0`, `e247c58`, `28eff06`) | Location and network map are public. The token ID names the user to target. **Secret scan:** (a) all current `.env.local` values: only the token ID found in history; (b) literal patterns (`PVEAPIToken=`, `X-Api-Key`, `Bearer`, key=literal, UUID): only the webhook UUID in `app.js`; (c) every added `VITE_*KEY/SECRET/TOKEN` assignment in all commits: only placeholders, screenshot-script mock values and regex code. **Unverified:** older secrets that match none of these patterns, GHCR images, and whether the n8n webhook checks its Turnstile token | Clean HEAD. Optionally rewrite history (D2). Treat the coordinates as already public | S / M |
| F11 | **medium** | Reliability | No `AbortController`. 15 live `setInterval` polls fire regardless of in-flight requests | Slow upstreams accumulate concurrent requests. nginx's 60s `proxy_read_timeout` is an inactivity timeout, so there is no fixed ceiling | Shared fetch helper with a total timeout; poll after completion; pause while hidden | M |
| F12 | **low-medium** | Performance | `SystemStats.jsx:60` + `NetworkStorageWidget.jsx:73` = 32 node-status req/min. `RadarrWidget.jsx:20,48` fetches the full library every 10s. `ServiceCard.jsx:218-228` keeps it mounted when collapsed, which also feeds the collapsed activity indicator via `onActiveStatusChange` | About 49 req/min per Home tab (about 43 to pveproxy). Payload size and host load depend on library size and viewer count (unverified) | Shared poller. Change Radarr requests only after defining the widget behaviour you want (Plan, optional track) | S |
| F13 | **low** | Config | Build-time imports: `Services.jsx:5`, `OverviewCard.jsx:4`, `GreetingClock.jsx:4`, `QbittorrentWidget.jsx:3`, `CommandPalette.jsx:20`. Reproduced in a scratch copy: `[UNRESOLVED_IMPORT] Could not resolve '../config/services.json'`. README:51-56 documents the copy step | Service edits need a rebuild. Convenience issue, not security | Runtime `fetch('/config/services.json')` (optional track) | S |
| F14 | **low** | Testing/CI | No test runner or test script. Manual diagnostics only: `test_syslog.cjs` (reads obsolete `VITE_PROXMOX_URL` at `:6`, so it is a no-op), `test-socket.mjs`. CI workflow removed in `509fef8` | Regressions, including re-leaked secrets, go unnoticed | Gateway policy tests + secret grep in CI with the first security PR (Plan S1) | S |
| F15 | **medium** | Headers/TLS | No CSP/`X-Frame-Options`/`Referrer-Policy`/`nosniff`. `server_tokens` defaults on. Upstream TLS not verified for any upstream (`:14,20` explicit; nginx default elsewhere) | Headers: low-medium (framing). TLS: once nginx holds credentials (Plan S2), a LAN machine-in-the-middle on the PVE or Portainer leg can capture them. High under that threat model | Headers in S1. `proxy_ssl_verify on` with the PVE/Portainer CA in S2 | S |
| F16 | **low** (reviewer: medium, see §10) | Secrets hygiene | Query-string keys: `RadarrWidget.jsx:20,28`, `SonarrWidget.jsx:27` | Keys in access/app logs. Actual log contents and retention unverified | Header injection server-side (S2) removes them. Rotation invalidates logged values | S |
| F17 | **low** | Offline | Google Fonts `index.html:11-13`. Open-Meteo `WeatherWidget.jsx:37`. Tailscale/Todoist are cloud by nature. No application telemetry found; dependency-level telemetry not audited | Without WAN: fonts fall back, weather/calendar fail, nginx may not start (F07) | Self-host or system fonts; proxy weather (optional) | S |
| F18 | **low** | Dependencies | `npm audit`: 7 high in dev/build dependencies. vite 8.2.0 direct (GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22, GHSA-vfpm-58rq-9qcg). launch-editor (GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm). zod <4.6.6 (GHSA-mrhx-c7xc-m3w5) via puppeteer → chromium-bidi. nanoid 3.3.16 and source-map-js 1.2.1 via vite → postcss (`npm ls`). Builder `node:20-alpine` (`Dockerfile:2`). Unpinned `nginx:alpine` (`Dockerfile:10`). Advisory currency and image CVEs not re-checked | Dev-server and build/install-time risk (including puppeteer's install script). Absence from the emitted bundle is inferred, not proven | Bump vite and puppeteer (or drop puppeteer). Supported Node LTS builder. Pin the nginx tag | S |
| F19 | **low** | Maintainability | 11 dead components (1,421 lines). Root `app.js` (467 KB portfolio bundle), `site.html`, stale `handoff.md`, UTF-16 `.agents/AGENTS.md`, unused `socket.io-client`. Fetch logic duplicated 3× (Portainer/Tailscale/Jellyfin), PVE header 6× | `npm run lint` exits 1: 38 errors, all in `app.js`. `src/`: 0 errors, 57 warnings (58 including `scripts/`) | Delete. Lint `src` only | S |
| F20 | **low** | Docs drift | §5 item 9 | Misleads future you and AI agents | Security docs in S2. Full rewrite later | S |
| F21 | **low** | Client perf | `ParticleBackground.jsx:40,83` (120 fps cap, 100 linked particles, all pages). Local `dist` JS 548,726 bytes. Scratch build 542 KB / 158 KB gzip, one chunk. No lazy imports (`App.jsx`) | Costs the viewing device, not the host | Optional track. Size targets are unmeasured goals | S |
| F22 | **low** | Correctness, privacy | `TodoistWidget.jsx:65-74` removes the task before checking `res.ok`. `proxmox.js:75-83` ignores the HTTP status of guest responses. `ActivityFeedWidget.jsx:15` logs the raw journal to the console every 30s | Silent wrong state. The host journal is visible to every viewer (it can hold usernames, IPs and service errors) | Fetch helper with an `ok` check. Remove the log. Consider dropping the journal feed for untrusted viewers | S |
| F23 | **high** | Sensitive reads | `nginx.conf.template:18-22` forwards the whole Portainer and Docker API. The old plan treated GET-only as safe | GET alone can return container configs including **environment secrets** (`/containers/{id}/json`), container **files** (`GET /containers/{id}/archive`), logs and stack files. Allowed endpoints also expose PVE guest configs, private tasks, calendar and journal. Effective permissions unverified | Allow only the exact reads the widgets use, constrain resource IDs and query parameters, and restrict viewers | S |
| F24 | **high** | Build artifacts | `Dockerfile:5-6` `COPY . .` with `.dockerignore:1-8` not excluding `.env*`. `Dockerfile:12` copies the compiled assets | Raw `.env.local` sits in builder-stage layers and the local build cache. Credentials sit in the final image's JS. Any pushed or saved image, cache export or copied `dist/` leaks them. Existing images unverified | Exclude secrets from the build context, rebuild clean, prune old images and build cache, delete local `dist/`, check GHCR, rotate | S |
| F25 | **high** (transport) | Encryption | `nginx.conf.template:2` `listen 80`. `docker-compose.yml:13`. Credentials in JS and request headers (`proxmox.js:30`) | Plain HTTP: anyone on the path between browser and nginx sees credentials and data. Binding to a LAN IP does not encrypt. Tailscale protects only traffic that actually goes through it | Serve over an encrypted, authenticated path (e.g. Tailscale Serve HTTPS, or NPM with TLS). Check every hop | S-M |
| F26 | **medium** | Robustness | `calendar.js:19` passes `event.summary` through, which can be `null`. `CalendarWidget.jsx:159` calls `ev.title.toLowerCase()`. No error boundary (`App.jsx:38-50`). Reviewer confirmed with an offline fixture; I confirmed the code path | One untitled calendar event blanks the **entire** dashboard | Normalize optional fields. Error boundary per widget | S |
| F27 | **low** | Calendar logic | `calendar.js:16-27` maps VEVENTs without expanding recurrences. `calendar.js:28-31` + `CalendarWidget.jsx:146` show failures as an empty list | Recurring events whose first occurrence is in the past disappear. Failures look like an empty calendar | Expand recurrences in a bounded window (`ICAL.Event.iterator`). Separate empty, failed and stale states | S |
| F28 | **low** (reviewer: medium, see §10) | Links | `CommandPalette.jsx:35` `window.open(svc.url, '_blank')` with no scheme check and no `noopener` | A malicious `services.json` could open a `javascript:`/odd-scheme URL or keep an opener handle. Needs operator-controlled config plus a click | Allow only http(s) URLs and pass `noopener,noreferrer`. Apply one URL policy to all service links | S |
| F29 | **low** | Repo hygiene | `.gitignore:13` ignores only `*.local` | A future `.env` or `.env.production` would be committed | Ignore `.env` and `.env.*`, keep `!.env.example` | S |

### Host resource cost (your 8 GB node)
- The real host cost is pveproxy polling: about 43 req/min per open Home tab, multiplied by every open device (F12).
- Particles and bundle size cost the client, not the host.
- When an upstream is down, requests hang (F11) and widgets show fabricated data (F06).

---

## 5. Status of your known or suspected issues

| # | Claim | Status | Evidence |
|---|---|---|---|
| 1 | Open API proxy; nginx attaches tokens; no auth; Proxmox writes possible | **Partly true, and worse than described.** nginx does not attach tokens; the browser bundle carries them (F01). No auth, any method, any path (F02). Sensitive GETs too (F23). The app itself only sends one non-GET (Todoist close). Proxmox `Sys.Modify` holds only if the pending count works (F04, unverified) | `nginx.conf.template:11-72`, `proxmox.js:30`, `updates.js:43-53` |
| 2 | `services.json` built in; missing file gives UNRESOLVED_IMPORT; docs claim otherwise | **Partly true.** Import and failure reproduced (F13). No doc explicitly claims "no rebuild"; README:25-30 implies runtime config | F13 |
| 3 | Missing `*_BACKEND_URL` crashes container | **Confirmed by static analysis, not executed.** Plus DNS-at-boot | F07 |
| 4 | qBit works only via subnet bypass with CSRF/Host validation off | **Partly true; settings unverified.** No login in code, so it needs the bypass or a pre-existing cookie on the dashboard origin. Host=`$host` with a forced Origin/Referer (`nginx.conf.template:49-51`) would normally trip Host validation and CSRF unless they are off or the hostnames match. Dev sets Host correctly (`vite.config.js:68-72`) | F03 |
| 5 | :8199 unauthenticated on 0.0.0.0; unattended dist-upgrade risky | **Unverified; not in repo.** The proxy adds no auth. Bind address and script contents need host checks (§8.1) | F09 |
| 6 | External dependencies | **Confirmed.** Google Fonts, Open-Meteo, codetabs (carries a secret), Tailscale/Todoist. No app telemetry found | F05, F17 |
| 7 | No automated tests | **Confirmed** (manual diagnostic scripts exist) | F14 |
| 8 | Resource cost | **Confirmed with nuance.** Polling loads pveproxy; particles and bundle load the client | F11, F12, F21 |
| 9 | Docs drift | **Confirmed**, items below | — |

Docs drift details (item 9):
- `README.md:28-30`: "frontend blindness" / "no IPs in bundle" is false. The browser calls codetabs and Open-Meteo directly, the LAN IP is in `QbittorrentWidget.jsx:7`, and `services.json` is bundled.
- `README.md:74-75`: implies tokens are safe because they are gitignored. They ship to every browser.
- `CONTEXT.md:35`: says React 18 (it is 19).
- `CONTEXT.md:10`: says it runs "on the Proxmox host" (unverified).
- `CONTEXT.md:80-92`: the refresh table is wrong.
- `CONTEXT.md:126`: says Kuma uses a WebSocket (it uses REST).
- `CONTEXT.md:200`: names `UpdateStatusWidget`, which is unused.
- `CONTEXT.md:239-240`: misdescribes mock and polling behaviour.
- Your notes call the feed a "task activity feed"; it shows the syslog journal.
- `index.html:10`: title is still "ahhs dashboard".

---

## 6. Request volume (per open tab, production, from code; unmeasured)

| Page | Calls/min | Notes |
|---|---|---|
| Home | about 49 | node status 12 + 20 (duplicate), guests 8, storage/status/apt 3, journal 2, Kuma ≤4. Plus one-shot calls on mount |
| Services | about 62 | qBit 40, Radarr 12 (full library), Jellyfin 4, Kuma ≤4, Jellyseerr 1, Tailscale 1, Sonarr 0.2 |
| Containers | about 8 | Portainer 1+N every 15s (N=1 assumed) |

---

## 7. How to run and test locally (current state)
```bash
npm ci
cp .env.example .env.local                      # leave VITE_PROXMOX_SECRET empty → mock data
cp src/config/services.example.json src/config/services.json   # required or build fails
npm run dev                                     # http://localhost:5173
npx oxlint src                                  # npm run lint fails on app.js
npm run build                                   # WARNING: bakes every VITE_ secret into dist/
```
Do not share or upload the local `dist/` folder or any image built from this checkout. They contain live credentials.

---

## 8. Host-side checklist (read-only; you run it, I did not)

**Rules for running it:**
- Run each block on the named machine and replace `<…>` placeholders.
- These commands are written to print names, flags, ports and counts, **not credential values**. Still read the output before you paste it anywhere.
- Never run unfiltered `docker inspect`, `docker compose config`, `systemctl cat cloudflared`, `nginx -T` (after Plan S2) or `cat` on `*.xml`/`*.conf`/`.env` files. Those print secrets.
- Status codes alone prove nothing: a 200 can be the SPA's HTML, and a 401 can come from an outer auth layer. Compare content type and body shape against a known-good baseline from the LAN, and do not publish response bodies.
- All `curl` calls carry `-m 5`.

### 8.1 Proxmox host
```bash
pveversion -v | head -3                                   # release decides upgrade procedure & firewall backend
systemctl is-active pve-firewall proxmox-firewall         # which firewall implementation is running
pve-firewall status
grep -H -E '^\s*(enable|policy_in|policy_out)\b' /etc/pve/firewall/*.fw /etc/pve/nodes/*/host.fw 2>/dev/null
grep -H -c -E '^\s*(IN|OUT|GROUP)\b' /etc/pve/firewall/*.fw /etc/pve/nodes/*/host.fw 2>/dev/null   # rule counts incl. per-guest <vmid>.fw
ip6tables -S 2>/dev/null | grep -c . ; nft list ruleset 2>/dev/null | grep -c 'chain'               # IPv6 / nft presence
ss -tulnpH | awk '{print $1, $5, $7}' | sort              # IPv4 AND IPv6 listeners
systemctl show update-status.service -p ExecStart -p User --no-pager
ls -la /var/www/update-status/
crontab -l 2>/dev/null; ls -la /etc/cron.d /etc/cron.weekly
systemctl list-timers --all --no-pager | grep -iE 'apt|update|upgrade'
grep -nE 'apt(-get)? +(-y +)?(dist-|full-)?upgrade' /root/*.sh /etc/cron.d/* 2>/dev/null
pveum user list
pveum user token list <user@realm>
pveum acl list
pveum user permissions <user@realm>
pveum user token permissions <user@realm> <tokenname>     # effective = user ACL ∩ token ACL when privsep=1
journalctl -u pveproxy --since "-30d" --no-pager | grep -o 'authentication failure; rhost=[^ ]*' | sort | uniq -c | sort -rn | head
pvesm status; lvs -o lv_name,data_percent,metadata_percent
for id in $(pct list | awk 'NR>1{print $1}'); do echo "== $id"; pct config "$id" | grep -E '^(unprivileged|features|mp[0-9]+|net[0-9]+|lxc\.)' | sed -E 's/hwaddr=[^,]+/hwaddr=[x]/'; done
tailscale serve status; tailscale funnel status
```
**Problem if:**
- Firewall inactive, or no rules restricting 8006/22/8199, including over IPv6.
- `*:8199`/`0.0.0.0:8199`/`[::]:8199`, or `ExecStart` has no `--bind`.
- `/var/www/update-status/` holds more than `status.json`.
- Unattended host upgrades that don't follow your PVE release's documented procedure.
- `privsep 0`, or effective permissions beyond `Sys.Audit, VM.Audit, Datastore.Audit, Sys.Syslog` (plus `Sys.Modify` only if you keep the pending count).
- Auth failures from IPs you don't recognise.
- The `data` thin pool above 90%.
- A guest **without** `unprivileged: 1`: the line being absent means privileged. Also `lxc.apparmor.profile: unconfined`, `nesting=1` combined with Docker in a privileged CT, or `firewall=1` missing on `net*` where you rely on guest rules.
- An active Funnel listener.

Note: a Docker escape inside an *unprivileged* LXC reaches that container's user namespace, not the PVE host. Inside a *privileged* LXC it is close to host root.

### 8.2 Every LXC that runs Docker
```bash
docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
for c in $(docker ps -q); do docker inspect "$c" --format '{{.Name}} net={{.HostConfig.NetworkMode}} priv={{.HostConfig.Privileged}} capadd={{.HostConfig.CapAdd}} restart={{.HostConfig.RestartPolicy.Name}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} sock={{range .Mounts}}{{if eq .Source "/var/run/docker.sock"}}YES {{end}}{{end}}'; done
iptables -t nat -S DOCKER 2>/dev/null | grep -c DNAT     # published ports not visible to ss when userland-proxy is off
ss -tulnpH | awk '{print $1, $5, $7}' | sort
```
**Problem if:** `net=host` or `priv=true` on internet-facing apps. `sock=YES` on anything besides Portainer. Admin UIs published on `0.0.0.0` (Portainer 9443/9000, qBit 8080, Kuma 3001, NPM 81, MongoDB 27017, LibreChat) when they should be LAN- or tunnel-only.

### 8.3 The LXC that runs the dashboard container
```bash
docker port homelab-dashboard
docker inspect homelab-dashboard --format '{{range .Config.Env}}{{println (index (split . "=") 0)}}{{end}}'      # names only
docker exec homelab-dashboard sh -c 'grep -l "PVEAPIToken=" /usr/share/nginx/html/assets/*.js'                 # file names only
docker exec homelab-dashboard nginx -T 2>/dev/null | grep -nE '^\s*(listen|location|limit_except|allow|deny|auth_)'   # never print proxy_set_header lines
docker image ls -a --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}}' | grep -iE 'dash|<none>'
docker builder du 2>/dev/null | tail -1
```
**Problem if:**
- Bound to `0.0.0.0:80`.
- Any `VITE_*KEY/SECRET/TOKEN` names in the env.
- A JS file prints (credentials in the live bundle).
- No `limit_except`/`allow`/`deny`/`auth_` lines.
- Old dashboard images or build cache remain after Plan S2 (F24).

### 8.4 Gateway LXC (cloudflared + NPM)
```bash
# cloudflared: decide local vs remote management WITHOUT printing the unit (ExecStart may hold a tunnel token)
systemctl show cloudflared -p ExecStart --no-pager | grep -q -- '--token' && echo "remotely managed: check Zero Trust > Networks > Tunnels > Public hostnames" || echo "locally managed"
systemctl show cloudflared -p EnvironmentFiles --no-pager                 # paths only
for f in /etc/cloudflared/config.yml /root/.cloudflared/config.yml; do [ -f "$f" ] && grep -nE '^\s*-?\s*(hostname|service|path):' "$f"; done
# NPM: selected fields only; [$] avoids shell-escaping problems
docker exec <npm-container> sh -c 'grep -hnE "server_name|set [$]server|set [$]port|location |include .*access|auth_basic|allow |deny " /data/nginx/proxy_host/*.conf'
docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':81->'
```
**Problem if:**
- Any hostname routes to the dashboard, PVE, Portainer, Kuma, qBit or the *arr apps, or there is no final `http_status:404` catch-all.
- In Cloudflare Access: an app with a `Bypass` or `Service Auth` rule that is broader than intended, or an admin hostname with no Access app. The existence of an Access app alone does not prove protection; test it.
- The origin is reachable directly, bypassing the tunnel.
- An NPM host for those services has no effective access list (the include line alone is not proof; test it).
- NPM admin port 81 is on `0.0.0.0`.

### 8.5 Service settings (media / ai-hub / core LXCs)
```bash
# qBittorrent: exact INI keys (awk \\ = one literal backslash)
awk '/^\[/{s=$0} /^WebUI\\(AuthSubnetWhitelistEnabled|AuthSubnetWhitelist|LocalHostAuth|CSRFProtection|HostHeaderValidation|ClickjackingProtection|ServerDomains)=/ || (s=="[AutoRun]" && /^(enabled|OnTorrentAdded\\Enabled)=/)' <qbit-config>/qBittorrent/qBittorrent.conf
ss -tnp | grep ':8080 '        # while the dashboard polls: the peer IP qBit actually sees after NAT
# Radarr/Sonarr: -o prints only the matched element, safe even if the XML is one line
grep -oE '<(AuthenticationMethod|AuthenticationRequired|BindAddress|UrlBase)>[^<]*</(AuthenticationMethod|AuthenticationRequired|BindAddress|UrlBase)>' <config>/config.xml
# MongoDB (ai-hub): unauthenticated probe from ANOTHER host on the LAN
mongosh "mongodb://<ai-hub-ip>:27017" --quiet --eval 'db.adminCommand({listDatabases:1}).ok'
# Vaultwarden (core)
docker exec <vw> printenv SIGNUPS_ALLOWED
docker exec <vw> sh -c '[ -n "$ADMIN_TOKEN" ] && echo ADMIN_TOKEN=set || echo ADMIN_TOKEN=unset'
docker exec <vw> sh -c 'grep -oE "\"signups_allowed\": *(true|false)" /data/config.json 2>/dev/null'
```
**Problem if:**
- qBit: `AuthSubnetWhitelistEnabled=true` with a subnet wider than the observed dashboard source IP, `[AutoRun] enabled=true`, or CSRF/Host validation false.
- *arr: `AuthenticationMethod` is `None` or `External` with `BindAddress` `*`.
- MongoDB: `1` printed, meaning no auth. An auth error means auth is on; a connection refusal means not reachable. Neither of those is a problem.
- Vaultwarden: `SIGNUPS_ALLOWED=true` or `"signups_allowed": true`. An unset value defaults to `true` in Vaultwarden, so check the config.json value too.

### 8.6 Tailscale (admin console + nodes)
- **Access controls:** effective ACLs/grants. Problem: `"src":["*"]` to `"*:*"`, or shared/guest users reaching homelab tags. Allowing the whole `100.64.0.0/10` range in nginx is not a user-identity policy.
- **Machines:** tags, approved subnet routes and sharing. Problem: a subnet route exposing the LAN to devices or users who shouldn't have it.
- **Settings > Keys:** credential type and expiry. API keys are full-access.
- **Each node:** `tailscale serve status` and `tailscale funnel status` show actual listeners. Funnel *eligibility* in `nodeAttrs` is different from an active Funnel.

### 8.7 Reachability (from each trust zone: LAN device, guest Wi-Fi, tailnet device, cellular with Tailscale off)
```bash
curl -sS -m 5 -o /dev/null -w '%{http_code} %{content_type}\n' http://<dash>/
curl -sS -m 5 -o /dev/null -w '%{http_code} %{content_type}\n' http://<dash>/api/updates/status.json
curl -sS -m 5 -o /dev/null -w '%{http_code} %{content_type}\n' http://<dash>/api/proxmox/version
curl -sS -m 5 -o /dev/null -w '%{http_code} %{redirect_url}\n' https://<each public hostname>/
```
**Problem if:** from a zone that should be denied, `/api/updates/status.json` returns `application/json`, or `/api/proxmox/version` returns a non-HTML response matching the LAN baseline. A `text/html` 200 is the SPA fallback and inconclusive. A redirect to `*.cloudflareaccess.com` means an Access layer is in front. Any public exposure is an incident: take the dashboard down, then revoke and rotate immediately.

---

## 9. Changes in revision 2
The external review (Codex) led to these changes:
- F01 now distinguishes 9 secrets from the token ID.
- F02 now spells out the concrete write scope.
- F03 downgraded to high/potentially critical, with the cookie alternative and the /32 caveat.
- F04 reworded as conditional.
- F05 "indefinitely" corrected to "until reset".
- F06 evidence restricted to reachable branches.
- F09: loopback and `apt-get upgrade` advice corrected.
- F10: extended secret scan and remaining unknowns added.
- F11: the timeout semantics corrected.
- F12 and F14 severities lowered.
- F13 lowered to low and its line reference fixed.
- F15 split into headers and TLS.
- F18: GHSA IDs and dependency chains added.
- F19: warning count corrected.
- Counts corrected: 22 `setInterval` calls, 57 warnings.
- New findings F23-F29.
- §8 rewritten: the previous version wrongly claimed no command printed secrets. `systemctl cat cloudflared` and line-based XML grep could, and the qBit/NPM commands had escaping bugs.

## 10. Where I disagree with the review (your call)
1. **F06 severity: I keep high (reviewer says medium).** Showing system health is this dashboard's primary function. Reporting "up to date", "0 pending" and "all systems operational" when it simply cannot reach anything defeats that function. It is not a security issue, and it matters less if you never act on the dashboard alone. If you treat the dashboard as decoration rather than monitoring, medium is fair.
2. **F13 "reproduced failure unverified": I did reproduce it.** I built a scratch copy without `services.json` and got the quoted `UNRESOLVED_IMPORT` error. The reviewer did not run a build. I agree with lowering the severity to low.
3. **F16 severity: I keep low (reviewer says medium).** The same keys already sit in the public bundle (F01), so logs add little today. Plan S2 removes query-string keys and rotation invalidates whatever was logged. It would be medium only if F01 were fixed without S2, and the plan does not allow that.
4. **F28 severity: I rate it low (reviewer says medium-conditional).** `services.json` is operator-controlled configuration, not user input. Exploiting it needs someone who can already edit your deployment. Worth fixing, but low.
5. **F18 "unverified vulnerability finding": partly disagree.** `npm audit` returned specific advisories (now listed with GHSA IDs) and `npm ls` confirms the chains. I agree that "dev-only" does not mean risk-free, and that bundle absence is inferred.
6. **F10 "clean-history conclusion overstated": partly disagree.** Beyond current values, I scanned literal secret patterns and every added `VITE_*KEY/SECRET/TOKEN` assignment in all 79 commits. I also checked unreachable objects (none), remote refs (only `main`) and forks (0). The conclusion stands within those stated limits, which are now spelled out.
7. **"Network location is not authorization": agree in principle, with a scope note.** For a single-user homelab I do not propose an in-app login. I propose identity at the access layer (Tailscale ACL limited to your user, or Cloudflare Access) plus least-privilege credentials. If other household members or devices must see the dashboard, that becomes a real auth requirement (Plan D1).
