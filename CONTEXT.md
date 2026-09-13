# PVE Dashboard — Project Context & Memory

> Last updated: September 6, 2026
> This file documents everything built, every decision made, and the full state of the project for future AI or developer context.

---

## Project Overview

A custom **React + Vite** personal homelab dashboard for Charlei's Proxmox server. It is not a generic tool like Homepage or Dashy — it is a hand-crafted, fully bespoke dashboard with live API integrations. It runs as a Docker container on the Proxmox host and is accessible via the local network.

**Live URL (local):** `http://<proxmox-ip>` (or whichever port the dashboard container is mapped to)

---

## Server Infrastructure

| Host | IP / Subnet | Role |
|------|-------------|------|
| Proxmox Host (`pve`) | `192.168.1.100` (configurable) | Hypervisor, runs all LXCs |
| Media LXC | `192.168.1.102` (configurable) | Docker: Radarr, Sonarr, Jellyfin, qBittorrent, Prowlarr, Jellyseerr |
| Monitoring LXC | `192.168.1.101` (configurable) | Docker: Portainer, Uptime Kuma |

**Proxmox Credentials:**
- API Token ID: `dashboard@pve@pam!dashboard`
- Node name: `pve`
- (Secret stored in `.env.local` — never commit this file)

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | React 18 via Vite |
| Styling | **Vanilla CSS only** (no Tailwind). All design tokens are CSS variables in `index.css` |
| Icons | `lucide-react` + `@icons-pack/react-simple-icons` |
| HTTP Proxy | Vite dev proxy + Nginx template for production |
| Deployment | Docker container via `docker-compose.yml` |

---

## Design System

All colors and design tokens are CSS variables defined in `src/index.css`. The dashboard supports **dark and light themes** via `data-theme` attribute on `<html>`.

**Key CSS variables:**
```css
--bg-base           /* Page background */
--bg-elevated       /* Card / elevated surface */
--border            /* Border color */
--text-primary      /* Main text */
--text-muted        /* Secondary text */
--text-subtle       /* Tertiary/disabled text */
--accent-dot        /* Green — online/success */
--accent-offline    /* Red — error/offline */
--accent-warning    /* Yellow/orange — warning */
--accent-online     /* Bright green */
```

Design language: **Glassmorphism** with `backdrop-filter: blur()`, semi-transparent cards, subtle animated particle background, micro-animations on hover, and a consistent lowercase widget title style.

---

## Pages & Routing

| Route | Page | Description |
|-------|------|-------------|
| `/` | `Home.jsx` | Main dashboard with all summary widgets |
| `/services` | `Services.jsx` | Full service card grid with clickable links |
| `/containers` | `Containers.jsx` | Full Docker container list via Portainer |

---

## All Components

### Widgets (Home Page)
| Component | Data Source | Refresh |
|-----------|-------------|---------|
| `GreetingClock.jsx` | Local time | 1s |
| `WeatherWidget.jsx` | Open-Meteo API (free, no key) | 10min |
| `CalendarWidget.jsx` | Google Calendar ICS (`.env.local`) | 5min |
| `TodoistWidget.jsx` | Todoist REST API | 5min |
| `SystemStats.jsx` | Proxmox API — node CPU, RAM, Swap, uptime, LXC | 5s / 15s |
| `NetworkStorageWidget.jsx` | Proxmox API + Updates — network I/O, storage bars, update status | 3s / 60s |
| `DockerWidget.jsx` | Portainer API — all containers | 15s |
| `JellyfinWidget.jsx` | Jellyfin API — now playing, users | 15s |
| `QbittorrentWidget.jsx` | qBittorrent WebUI API | 10s |
| `RadarrWidget.jsx` | Radarr v3 API | 30s |
| `SonarrWidget.jsx` | Sonarr v3 API | 30s |
| `TailscaleWidget.jsx` | Tailscale API | 60s |
| `ActivityFeedWidget.jsx` | Proxmox syslog journal | 30s |

### Summary Widgets (Home Overview Card)
| Component | Purpose |
|-----------|---------|
| `OverviewCard.jsx` | Unified single card (2x2 quad cells): Uptime Kuma, Portainer, Tailscale, Jellyfin |
| `ServicesSummaryWidget.jsx` | (Legacy standalone) Uptime Kuma counts |
| `DockerSummaryWidget.jsx` | (Legacy standalone) Portainer container counts |
| `TailscaleSummaryWidget.jsx` | (Legacy standalone) Tailscale device counts |
| `JellyfinSummaryWidget.jsx` | (Legacy standalone) Jellyfin active sessions |

### UI / Utility
| Component | Purpose |
|-----------|---------|
| `Sidebar.jsx` + `Sidebar.css` | Navigation sidebar with theme toggle |
| `ThemeToggle.jsx` | Dark/light theme switch |
| `ParticleBackground.jsx` | Animated particle canvas background |
| `ProgressBar.jsx` | Reusable % bar (used in SystemStats) |
| `Tooltip.jsx` | Hover tooltip wrapper |
| `PopoverMenu.jsx` | Click-triggered popover |
| `CopyToClipboard.jsx` | Copy-to-clipboard utility |
| `CommandPalette.jsx` | Global keyboard-driven command & service quick-search (Ctrl+K / Cmd+K) |
| `ServiceCard.jsx` | Individual service card (Services page) |
| `ServiceGrid.jsx` | Service card grid layout |
| `ServiceIcon.jsx` | Icon resolver for services |

---

## API Modules (`src/api/`)

| File | Purpose |
|------|---------|
| `proxmox.js` | `getClusterStatus()`, `getNodeGuests()`, `getStorageStatus()`, `getSyslog()` |
| `updates.js` | `getUpdateStatus()` (port 8199), `getPendingUpdates()` (Proxmox apt API) |
| `uptime.js` | Uptime Kuma WebSocket integration |
| `calendar.js` | ICS calendar parser |

---

## Environment Variables (`.env.local` and `.env.example`)

> WARNING: `.env.local` is gitignored. Never commit it. Use `.env.example` as the clean template.

The project adheres to the **12-Factor App / API Gateway Pattern**:
- **Backend Routing Targets** (NO `VITE_` prefix, invisible to browser client code): Used dynamically by Vite dev proxy and Nginx production template (`envsubst`).
- **Frontend Secrets & Config** (`VITE_` prefix): Passed to client bundle where needed for API tokens.

```env
# Backend Routing Targets (Proxy Gateway)
PROXMOX_BACKEND_URL=https://192.168.1.100:8006
PORTAINER_BACKEND_URL=https://192.168.1.101:9443
UPTIME_KUMA_BACKEND_URL=http://192.168.1.101:3001
JELLYFIN_BACKEND_URL=http://192.168.1.102:8096
QBITTORRENT_BACKEND_URL=http://192.168.1.102:8080
RADARR_BACKEND_URL=http://192.168.1.102:7878
SONARR_BACKEND_URL=http://192.168.1.102:8989
JELLYSEERR_BACKEND_URL=http://192.168.1.102:5055
UPDATES_BACKEND_URL=http://192.168.1.100:8199
TAILSCALE_BACKEND_URL=https://api.tailscale.com
TODOIST_BACKEND_URL=https://api.todoist.com

# Frontend Application Secrets & Settings (VITE_ prefixed)
VITE_PROXMOX_TOKEN_ID=dashboard@pve@pam!dashboard
VITE_PROXMOX_SECRET=<secret>
VITE_PROXMOX_NODE=pve
VITE_PORTAINER_API_KEY=<key>
VITE_JELLYFIN_API_KEY=<key>
VITE_TAILSCALE_API_KEY=<key>
VITE_TAILNET=<tailnet_name>
VITE_RADARR_API_KEY=<key>
VITE_SONARR_API_KEY=<key>
VITE_JELLYSEERR_API_KEY=<key>
VITE_WEATHER_LAT=14.3864
VITE_WEATHER_LON=120.8810
VITE_CALENDAR_URL=<google_ics_url>
VITE_TODOIST_TOKEN=<token>
VITE_GITHUB_USERNAME=charlesterrenal
```

---

## Proxy Configuration (API Gateway Pattern)

The frontend is completely blind to network topology and only makes requests to relative paths (e.g., `/api/proxmox/nodes/...`, `/api/jellyfin/Sessions`, etc.). Two dynamic proxy configurations exist:

1. **`vite.config.js`** — Dev server proxy using `loadEnv(mode, process.cwd(), '')` to load `*_BACKEND_URL` variables.
2. **`nginx.conf.template`** — Production proxy using Nginx environment variables (e.g., `proxy_pass ${PROXMOX_BACKEND_URL}/api2/json/;`) substituted via `envsubst` at container boot.

### Proxy Routes

| Path | Environment Variable | Default / Example Target | Notes |
|------|----------------------|--------------------------|-------|
| `/api/proxmox/` | `PROXMOX_BACKEND_URL` | `https://192.168.1.100:8006` | Proxies to `/api2/json/` |
| `/api/portainer/` | `PORTAINER_BACKEND_URL` | `https://192.168.1.101:9443` | SSL verify off |
| `/api/uptime/` | `UPTIME_KUMA_BACKEND_URL` | `http://192.168.1.101:3001` | WebSocket upgrade support |
| `/api/jellyfin/` | `JELLYFIN_BACKEND_URL` | `http://192.168.1.102:8096` | SSL SNI enabled |
| `/api/qbit/` | `QBITTORRENT_BACKEND_URL` | `http://192.168.1.102:8080` | Origin/Referer header rewrite |
| `/api/radarr/` | `RADARR_BACKEND_URL` | `http://192.168.1.102:7878` | Host header set |
| `/api/sonarr/` | `SONARR_BACKEND_URL` | `http://192.168.1.102:8989` | Host header set |
| `/api/jellyseerr/` | `JELLYSEERR_BACKEND_URL` | `http://192.168.1.102:5055` | Host header set |
| `/api/tailscale/` | `TAILSCALE_BACKEND_URL` | `https://api.tailscale.com` | SSL SNI enabled |
| `/api/todoist/` | `TODOIST_BACKEND_URL` | `https://api.todoist.com` | SSL SNI enabled |
| `/api/updates/` | `UPDATES_BACKEND_URL` | `http://192.168.1.100:8199` | Serves status.json |

---

## Update Monitoring Setup (Server-Side)

The `UpdateStatusWidget` requires two things running on the Proxmox host:

### 1. `/root/update-all.sh`
Enhanced update script that:
- Runs `apt upgrade` on the Proxmox host and all running LXC containers
- Writes a `status.json` file to `/var/www/update-status/`
- Marks status as `running` at start, then `success`/`partial`/`failed` at end
- Scheduled weekly via cron: `0 4 * * 0` (Sundays at 4 AM)

### 2. `update-status.service` (systemd)
A Python HTTP server that serves `/var/www/update-status/` on port **8199**.
```bash
systemctl enable update-status.service
systemctl start update-status.service
```

**Verify:** `curl http://<proxmox-ip>:8199/status.json`

---

## Deployment

```bash
# Development
npm run dev

# Build for production
npm run build

# Run in Docker
docker compose up -d --build
```

The `docker-compose.yml` builds the Nginx Docker image from the `Dockerfile`, injects environment variables into `nginx.conf.template` at runtime, and serves the built React app.

---

## Known Patterns & Conventions

- **All widgets use the same structure:** `useEffect` with `setInterval` for polling, skeleton loaders during initial load, graceful error states with mock data fallback in dev.
- **Mock data always works without env vars.** If `VITE_PROXMOX_URL` is not set, every API module returns realistic fake data so the dashboard looks good in development.
- **Widget titles are always lowercase** (e.g., `proxmox . pve`, `docker containers`, `system updates`) — this is intentional design.
- **`var(--accent-dot)`** = green = good. **`var(--accent-offline)`** = red = bad. **`var(--accent-warning)`** = orange = needs attention.

---

## Future Roadmap / Ideas

- [ ] Watchtower widget — Show which Docker containers were auto-updated and when
- [ ] Backup status widget — Integrate with Proxmox Backup Server (PBS) API
- [ ] Bazarr widget — Subtitle download status
- [ ] Jellyfin recently added — A "Recently Added" media row on the home page
- [ ] Mobile layout — Better responsive breakpoints for phone access
- [ ] Discord notification integration — Push update completion to a webhook
- [ ] Split DNS — Single URL that works both on local network and externally
