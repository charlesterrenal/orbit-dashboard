import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const proxmoxUrl = env.PROXMOX_BACKEND_URL || 'https://pve.local:8006';
  const portainerUrl = env.PORTAINER_BACKEND_URL || 'https://localhost:9443';
  const uptimeKumaUrl = env.UPTIME_KUMA_BACKEND_URL || 'http://localhost:3001';
  const jellyfinUrl = env.JELLYFIN_BACKEND_URL || 'http://localhost:8096';
  const tailscaleUrl = env.TAILSCALE_BACKEND_URL || 'https://api.tailscale.com';
  const todoistUrl = env.TODOIST_BACKEND_URL || 'https://api.todoist.com';
  const qbitUrl = env.QBITTORRENT_BACKEND_URL || 'http://localhost:8080';
  const radarrUrl = env.RADARR_BACKEND_URL || 'http://localhost:7878';
  const sonarrUrl = env.SONARR_BACKEND_URL || 'http://localhost:8989';
  const jellyseerrUrl = env.JELLYSEERR_BACKEND_URL || 'http://localhost:5055';
  const updatesUrl = env.UPDATES_BACKEND_URL || 'http://localhost:8199';

  const qbitHost = qbitUrl.replace(/^https?:\/\//, '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/proxmox': {
          target: proxmoxUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/proxmox/, '/api2/json'),
        },
        '/api/portainer': {
          target: portainerUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/portainer/, ''),
        },
        '/api/uptime': {
          target: uptimeKumaUrl,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/api\/uptime/, ''),
        },
        '/api/jellyfin': {
          target: jellyfinUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/jellyfin/, ''),
        },
        '/api/tailscale': {
          target: tailscaleUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/tailscale/, ''),
        },
        '/api/todoist': {
          target: todoistUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/todoist/, ''),
        },
        '/api/qbit': {
          target: qbitUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/qbit/, ''),
          headers: {
            'Origin': qbitUrl,
            'Referer': `${qbitUrl}/`,
            'Host': qbitHost,
          }
        },
        '/api/radarr': {
          target: radarrUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/radarr/, ''),
        },
        '/api/sonarr': {
          target: sonarrUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/sonarr/, ''),
        },
        '/api/jellyseerr': {
          target: jellyseerrUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/jellyseerr/, ''),
        },
        '/api/updates': {
          target: updatesUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/updates/, ''),
        },
      },
    },
  }
})
