# Orbit

An always-open homelab home base: a directory of every service with live status, plus a glanceable health rail (server, storage, last update run). One page, dark, monospace, no external requests at runtime.

<!-- screenshot: add docs/orbit.png and link it here once the look is signed off -->

## Security model

- **One credential:** a read-only Proxmox API token, injected by nginx on the server. It never reaches the browser, the bundle, image layers or git.
- **Gateway allowlist:** nginx exposes exactly these GET paths and returns `404` for everything else under `/api/`:
  - `/api/proxmox/nodes/<node>/{status,storage,lxc}`
  - `/api/uptime/api/status-page/default` and `/api/uptime/api/status-page/heartbeat/default`
  - `/api/updates/status.json`
  - `/config/services.json` (static)
- **Startup validation:** the container refuses to start if the five env vars are missing or malformed, and never prints their values.

## Setup

1. **Create the token** on the Proxmox host (the secret is shown once; put it straight into `.env`):
   ```
   pveum role add DashboardRO -privs "Sys.Audit VM.Audit Datastore.Audit"
   pveum user add dashboard@pve --comment "orbit read-only"
   pveum acl modify / -user dashboard@pve -role DashboardRO
   pveum user token add dashboard@pve orbit --privsep 1
   pveum acl modify / -token 'dashboard@pve!orbit' -role DashboardRO
   ```
2. **Env:** `cp .env.example .env` and fill in the three backend URLs plus `PVE_TOKEN_ID` / `PVE_TOKEN_SECRET`.
3. **Services:** `cp config/services.example.json config/services.json` and edit it.
4. **Run:** `docker compose up -d --build`.

Editing `config/services.json` needs no rebuild; refresh the browser.

### Add a service

Add an entry to a group in `config/services.json`:

```json
{ "id": "sonarr", "name": "Sonarr", "url": "http://sonarr.lan:8989", "icon": "sonarr.svg", "monitor": "sonarr" }
```

`icon` is a file in `public/icons/` (omit it for a monogram tile). `monitor` is the Uptime Kuma monitor name (case and surrounding spaces ignored); without it the row reads `NO MONITOR`. Services whose `url` is not `http(s)` are dropped with a console warning.

### Add a Kuma monitor

Create the monitor in Uptime Kuma, add it to the status page with slug `default`, and name it to match `monitor` in `services.json`.

## Development

```
cp .env.example .env        # real backend values
mkdir -p public/config && cp config/services.json public/config/services.json
npm run dev
npm test                    # unit tests (node --test)
npm run lint
npm run test:gateway        # needs Docker
```

## Icon attribution

Service icons are from [homarr-labs/dashboard-icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0). Logos are trademarks of their respective owners. Font: JetBrains Mono (SIL OFL 1.1, `public/fonts/OFL.txt`).
