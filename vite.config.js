import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxmoxUrl = env.VITE_PROXMOX_URL || 'https://pve.local:8006/api2/json';
  const dockerHost = env.VITE_DOCKER_HOST || 'http://192.168.254.200:2375';
  const uptimeKumaUrl = env.VITE_UPTIME_KUMA_URL || 'http://192.168.254.201:3001';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/proxmox': {
          target: proxmoxUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/proxmox/, ''),
        },
        '/api/portainer': {
          target: env.VITE_PORTAINER_URL || 'http://localhost:9000',
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
          target: 'http://192.168.254.203:8096',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/jellyfin/, ''),
        },
        '/api/tailscale': {
          target: 'https://api.tailscale.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/tailscale/, ''),
        },
        '/api/todoist': {
          target: 'https://api.todoist.com',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/todoist/, ''),
        },
        '/api/qbit': {
          target: 'http://192.168.254.203:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/qbit/, ''),
          headers: {
            'Origin': 'http://192.168.254.203:8080',
            'Referer': 'http://192.168.254.203:8080/'
          }
        },
        '/api/radarr': {
          target: 'http://192.168.254.203:7878',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/radarr/, ''),
        },
        '/api/sonarr': {
          target: 'http://192.168.254.203:8989',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/sonarr/, ''),
        },
        '/api/jellyseerr': {
          target: 'http://192.168.254.203:5055',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/jellyseerr/, ''),
        },
        '/api/updates': {
          target: 'http://192.168.254.200:8199',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api\/updates/, ''),
        },
      },
    },
  }
})
