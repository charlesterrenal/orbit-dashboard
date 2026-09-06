# PVE Dashboard — Project Context & Memory

> Last updated: September 6, 2026
> This file documents everything built, every decision made, and the full state of the project for future AI or developer context.

---

## Project Overview

A custom **React + Vite** personal homelab dashboard for Charlei's Proxmox server. It is not a generic tool like Homepage or Dashy — it is a hand-crafted, fully bespoke dashboard with live API integrations. It runs as a Docker container on the Proxmox host and is accessible via the local network.

**Live URL (local):** `http://192.168.254.200` (or whichever port the dashboard container is mapped to)

---

## Server Infrastructure

| Host | IP | Role |
|------|-----|------|
| Proxmox Host (`pve`) | `192.168.254.200` | Hypervisor, runs all LXCs |
| Media LXC | `192.168.254.203` | Docker: Radarr, Sonarr, Jellyfin, qBittorrent, Prowlarr, Jellyseerr |
| Monitoring LXC | `192.168.254.204` | Docker: Portainer, Uptime Kuma |

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

## Environment Variables (`.env.local`)

> WARNING: This file is gitignored. Never commit it.

```env
VITE_PROXMOX_URL=https://192.168.254.200:8006/api2/json
VITE_PROXMOX_TOKEN_ID=dashboard@pve@pam!dashboard
VITE_PROXMOX_SECRET=<secret>
VITE_PROXMOX_NODE=pve

VITE_PORTAINER_URL=https://192.168.254.204:9443
VITE_PORTAINER_API_KEY=<key>

VITE_UPTIME_KUMA_URL=http://192.168.254.204:3001

VITE_JELLYFIN_API_KEY=<key>
# Jellyfin is proxied to http://192.168.254.203:8096 in vite.config.js

VITE_TAILSCALE_API_KEY=<key>
VITE_TAILNET=<tailnet_name>

VITE_RADARR_API_KEY=<key>
VITE_SONARR_API_KEY=<key>
VITE_JELLYSEERR_API_KEY=<key>

VITE_WEATHER_LAT=14.3864
VITE_WEATHER_LON=120.8810

VITE_TODOIST_TOKEN=<token>
VITE_CALENDAR_URL=<google_ics_url>
VITE_GITHUB_USERNAME=charlesterrenal
```

---

## Proxy Configuration

All external API calls are proxied to avoid CORS errors. Two proxy configs exist:

1. **`vite.config.js`** — Dev server proxy (used when running `npm run dev`)
2. **`nginx.conf.template`** — Production proxy (used inside the Docker container)

### Proxy Routes

| Path | Target |
|------|--------|
| `/api/proxmox/` | `https://192.168.254.200:8006/api2/json` |
| `/api/portainer/` | `https://192.168.254.204:9443` |
| `/api/uptime/` | `http://192.168.254.204:3001` (WebSocket) |
| `/api/jellyfin/` | `http://192.168.254.203:8096` |
| `/api/qbit/` | `http://192.168.254.203:8080` |
| `/api/radarr/` | `http://192.168.254.203:7878` |
| `/api/sonarr/` | `http://192.168.254.203:8989` |
| `/api/jellyseerr/` | `http://192.168.254.203:5055` |
| `/api/tailscale/` | `https://api.tailscale.com` |
| `/api/todoist/` | `https://api.todoist.com` |
| `/api/updates/` | `http://192.168.254.200:8199` |

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

**Verify:** `curl http://192.168.254.200:8199/status.json`

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
