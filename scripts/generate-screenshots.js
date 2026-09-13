import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const tempDir = path.join(rootDir, '.screenshot-temp');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

(async () => {
  console.log('Preparing isolated temp directory...');
  if (fs.existsSync(tempDir)) {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore if locked
    }
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy necessary files
  const filesToCopy = ['src', 'public', 'index.html', 'vite.config.js', 'package.json', 'package-lock.json'];
  for (const item of filesToCopy) {
    const srcPath = path.join(rootDir, item);
    const destPath = path.join(tempDir, item);
    if (fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, destPath, { recursive: true });
    }
  }

  // Windows junction for node_modules to avoid slow installs
  const nmSrc = path.join(rootDir, 'node_modules');
  const nmDest = path.join(tempDir, 'node_modules');
  if (fs.existsSync(nmSrc) && !fs.existsSync(nmDest)) {
    fs.symlinkSync(nmSrc, nmDest, 'junction');
  }

  // Inject the clean official template services.example.json directly
  const exampleServices = fs.readFileSync(path.join(rootDir, 'src', 'config', 'services.example.json'), 'utf-8');
  fs.writeFileSync(path.join(tempDir, 'src', 'config', 'services.json'), exampleServices);

  // Inject clean generic environment variables
  const genericEnv = `
PROXMOX_BACKEND_URL=https://192.168.1.100:8006
PORTAINER_BACKEND_URL=https://192.168.1.101:9443
UPTIME_KUMA_BACKEND_URL=http://192.168.1.101:3001
JELLYFIN_BACKEND_URL=http://192.168.1.102:8096
QBITTORRENT_BACKEND_URL=http://192.168.1.102:8080
RADARR_BACKEND_URL=http://192.168.1.102:7878
SONARR_BACKEND_URL=http://192.168.1.102:8989
JELLYSEERR_BACKEND_URL=http://192.168.1.102:5055
UPDATES_BACKEND_URL=http://192.168.1.100:8199
VITE_DASHBOARD_USER=admin
VITE_WEATHER_CITY=san francisco
VITE_WEATHER_LAT=37.7749
VITE_WEATHER_LON=-122.4194
VITE_PORTAINER_API_KEY=mock-portainer-key
VITE_PROXMOX_SECRET=mock-proxmox-secret
VITE_PROXMOX_TOKEN_ID=dashboard@pve!token
VITE_PROXMOX_NODE=pve
VITE_JELLYFIN_API_KEY=mock-jellyfin-key
VITE_TAILSCALE_API_KEY=mock-tailscale-key
VITE_RADARR_API_KEY=mock-radarr-key
VITE_SONARR_API_KEY=mock-sonarr-key
VITE_JELLYSEERR_API_KEY=mock-jellyseerr-key
VITE_TODOIST_TOKEN=mock-todoist-token
VITE_CALENDAR_URL=https://mock-calendar.local/basic.ics
  `;
  fs.writeFileSync(path.join(tempDir, '.env.local'), genericEnv.trim());

  console.log('Building isolated template dashboard...');
  execSync('npm run build', { cwd: tempDir, stdio: 'ignore' });

  console.log('Starting preview server on port 9999...');
  const { preview } = await import('vite');
  const previewServer = await preview({
    root: tempDir,
    preview: {
      port: 9999,
      strictPort: true
    }
  });
  
  await delay(1000);

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
  await page.setRequestInterception(true);
  
  page.on('request', (request) => {
    const url = request.url();
    
    // Proxmox Mocks
    if (url.includes('/api/proxmox/nodes/pve/status')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { cpu: 0.18, memory: 6442450944, maxmem: 34359738368, swap: 1073741824, maxswap: 8589934592, uptime: 1245600, rootfs: { used: 14000000000, total: 100000000000 } } })
      });
    }
    if (url.includes('/api/proxmox/nodes/pve/qemu')) {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [
        { name: 'dev-vm-01', status: 'running', vmid: 100, maxmem: 8589934592, mem: 4294967296, maxdisk: 20000000000, disk: 10000000000, uptime: 1000000 },
      ] }) });
    }
    if (url.includes('/api/proxmox/nodes/pve/lxc')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [
          { name: 'docker-host', status: 'running', vmid: 101, maxmem: 4294967296, mem: 2147483648, maxdisk: 50000000000, disk: 15000000000, uptime: 1200000 },
          { name: 'wireguard-gw', status: 'running', vmid: 102, maxmem: 1073741824, mem: 268435456, maxdisk: 10000000000, disk: 2000000000, uptime: 1500000 }
        ] })
      });
    }
    if (url.includes('/api/proxmox/nodes/pve/storage')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [
          { storage: 'local-lvm', used: 25000000000, total: 100000000000, avail: 75000000000, type: 'lvmthin' },
          { storage: 'ssd-pool', used: 450000000000, total: 1000000000000, avail: 550000000000, type: 'dir' }
        ] })
      });
    }
    if (url.includes('/api/proxmox/nodes/pve/journal') || url.includes('/api/proxmox/nodes/pve/syslog')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: [
          "Sep 13 12:45:10 pve systemd[1]: Started Proxmox VE replication runner.",
          "Sep 13 12:40:02 pve pvedaemon[1024]: <root@pam> successful auth for user 'admin'",
          "Sep 13 12:35:15 pve kernel: [12004.12] lxc-101: interface veth101i0 entered promiscuous mode",
          "Sep 13 12:00:00 pve systemd[1]: Starting Daily apt download activities..."
        ] })
      });
    }
    
    // Updates Mock
    if (url.includes('/api/updates/status.json')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'success', last_run: new Date().toISOString(), details: { pve: { upgraded: 0, newly_installed: 0, to_remove: 0, not_upgraded: 0 } } })
      });
    }
    if (url.includes('/api/proxmox/nodes/pve/apt/update')) {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
    }

    // Portainer Mock (Catch ALL variations of endpoint and container queries)
    if (url.includes('/api/portainer/api/endpoints') && !url.includes('/docker/containers')) {
       return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ Id: 1, Name: 'docker-host' }])
      });
    }
    if (url.includes('/api/portainer/api/endpoints/') && url.includes('/docker/containers')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { Id: 'c1', Names: ['/traefik-proxy'], State: 'running', Status: 'Up 14 days', Image: 'traefik:v3.1' },
          { Id: 'c2', Names: ['/postgres-db'], State: 'running', Status: 'Up 14 days', Image: 'postgres:16-alpine' },
          { Id: 'c3', Names: ['/redis-cache'], State: 'running', Status: 'Up 14 days', Image: 'redis:7-alpine' },
          { Id: 'c4', Names: ['/nextcloud-app'], State: 'running', Status: 'Up 8 days', Image: 'nextcloud:apache' },
          { Id: 'c5', Names: ['/grafana-dash'], State: 'running', Status: 'Up 12 days', Image: 'grafana/grafana:latest' },
          { Id: 'c6', Names: ['/uptime-kuma'], State: 'running', Status: 'Up 20 days', Image: 'louislam/uptime-kuma:1' },
          { Id: 'c7', Names: ['/vaultwarden'], State: 'running', Status: 'Up 10 days', Image: 'vaultwarden/server:latest' },
          { Id: 'c8', Names: ['/portainer-ce'], State: 'running', Status: 'Up 25 days', Image: 'portainer/portainer-ce:latest' },
          { Id: 'c9', Names: ['/cron-backup'], State: 'exited', Status: 'Exited (0) 4 hours ago', Image: 'alpine:latest' }
        ])
      });
    }

    // Jellyfin Mock
    if (url.includes('/api/jellyfin/Sessions')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { Id: '1', Client: 'Jellyfin Web', DeviceName: 'Living Room TV', UserName: 'Demo User', IsActive: true, NowPlayingItem: { Name: 'Big Buck Bunny (4K)', ProductionYear: 2024, Type: 'Movie' }, PlayState: { IsPaused: false, PositionTicks: 15400000000, MediaSourceId: '1' } }
        ])
      });
    }
    if (url.includes('/api/jellyfin/Users')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([{ Name: 'Demo User' }, { Name: 'Guest' }])
      });
    }

    // Tailscale Mock
    if (url.includes('/api/tailscale/api/v2/tailnet/')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          devices: [
            { id: '1', hostname: 'work-laptop', os: 'windows', user: 'admin', lastSeen: new Date().toISOString(), blocksIncomingConnections: false },
            { id: '2', hostname: 'homelab-server', os: 'linux', user: 'admin', lastSeen: new Date().toISOString(), blocksIncomingConnections: false },
            { id: '3', hostname: 'mobile-phone', os: 'iOS', user: 'admin', lastSeen: new Date().toISOString(), blocksIncomingConnections: false }
          ]
        })
      });
    }

    // Todoist Mock
    if (url.includes('/api/todoist/api/v1/tasks')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', content: 'Run monthly ZFS scrub', project_id: '1', due: { date: new Date().toISOString() } },
          { id: '2', content: 'Renew SSL wildcard certificates', project_id: '1', due: { date: new Date().toISOString() } },
          { id: '3', content: 'Audit Docker container memory limits', project_id: '2' }
        ])
      });
    }
    if (url.includes('/api/todoist/api/v1/projects')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'Infrastructure' },
          { id: '2', name: 'Maintenance' }
        ])
      });
    }

    // Calendar Mock
    if (url.includes('corsproxy.io') || url.includes('mock-calendar')) {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const formatICSDate = (date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      const icsData = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Weekly Sync\nDTSTART:${formatICSDate(now)}\nDTEND:${formatICSDate(nextHour)}\nDESCRIPTION:Sync with the team\nLOCATION:https://zoom.us/j/123456789\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:Server Maintenance\nDTSTART:${formatICSDate(tomorrow)}\nDTEND:${formatICSDate(new Date(tomorrow.getTime() + 3600000))}\nEND:VEVENT\nEND:VCALENDAR`;

      return request.respond({
        status: 200, contentType: 'text/calendar',
        body: icsData
      });
    }

    // Uptime Kuma Mock
    if (url.includes('/api/uptime/api/status-page/default')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          publicGroupList: [
            {
              monitorList: [
                { id: 1, name: "jellyfin" },
                { id: 2, name: "n8n" },
                { id: 3, name: "vaultwarden" },
                { id: 4, name: "personal-site" },
                { id: 5, name: "tech-blog" },
                { id: 6, name: "radarr" },
                { id: 7, name: "sonarr" },
                { id: 8, name: "jellyseerr" },
                { id: 9, name: "qbittorrent" }
              ]
            }
          ]
        })
      });
    }

    if (url.includes('/api/uptime/api/status-page/heartbeat/default')) {
      const beats = Array(24).fill({ status: 1, ping: 15 });
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          heartbeatList: {
            "1": beats,
            "2": beats,
            "3": beats,
            "4": beats,
            "5": beats,
            "6": beats,
            "7": beats,
            "8": beats,
            "9": beats
          },
          uptimeList: {
            "1_24": 0.999,
            "2_24": 1,
            "3_24": 0.98,
            "4_24": 1,
            "5_24": 0.995,
            "6_24": 1,
            "7_24": 1,
            "8_24": 1,
            "9_24": 0.998
          }
        })
      });
    }

    // Arrs (Radarr/Sonarr)
    if (url.includes('/api/radarr/api/v3/queue') || url.includes('/api/sonarr/api/v3/queue')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ records: [ { title: 'Cosmos: Possible Worlds S01E01', size: 1400000000, sizeleft: 450000000, status: 'downloading', timeleft: '00:04:30' } ] })
      });
    }
    
    // qBittorrent
    if (url.includes('/api/qbit/api/v2/sync/maindata')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ server_state: { dl_info_speed: 12500000, up_info_speed: 2100000 } })
      });
    }
    
    // Jellyseerr
    if (url.includes('/api/jellyseerr/api/v1/request')) {
      return request.respond({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ results: [ { media: { status: 3 }, type: 'movie' } ] })
      });
    }

    // Allow static assets
    request.continue();
  });

  const publicDir = path.join(rootDir, 'public');

  // 1. Home - Dark Mode
  console.log('Capturing Home - Dark Mode...');
  await page.goto('http://localhost:9999/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await delay(2500);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-dark.png'), fullPage: true });

  // 2. Home - Light Mode
  console.log('Capturing Home - Light Mode...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
  });
  await delay(1000);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-light.png'), fullPage: true });

  // 3. Services Page
  console.log('Capturing Services Page...');
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  // Navigate by clicking the sidebar NavLink to avoid SPA full reload issues
  await page.click('a[href="/services"]');
  await delay(2000);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-services.png'), fullPage: true });

  // 4. Containers Page
  console.log('Capturing Containers Page...');
  await page.click('a[href="/containers"]');
  await delay(2000);
  await page.screenshot({ path: path.join(publicDir, 'screenshot-containers.png'), fullPage: true });

  await browser.close();
  
  await previewServer.httpServer.close();
  if (fs.existsSync(tempDir)) {
    try {
      await delay(1000);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`Cleaned up preview, temp directory retained: ${err.message}`);
    }
  }

  console.log('All template screenshots successfully generated!');
})();
