import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxies mirror the nginx gateway. Secrets stay in non-VITE_ env names so they never reach the bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = (name, target, extra = {}) => ({
    [`/api/${name}`]: {
      target,
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path.replace(new RegExp(`^/api/${name}`), extra.base ?? ''),
      ...(extra.headers && { headers: extra.headers }),
    },
  })

  return {
    plugins: [react()],
    server: {
      proxy: {
        ...proxy('proxmox', env.PROXMOX_BACKEND_URL || 'https://pve.local:8006', {
          base: '/api2/json',
          headers: { Authorization: `PVEAPIToken=${env.PVE_TOKEN_ID}=${env.PVE_TOKEN_SECRET}` },
        }),
        ...proxy('uptime', env.UPTIME_KUMA_BACKEND_URL || 'http://localhost:3001'),
        ...proxy('updates', env.UPDATES_BACKEND_URL || 'http://localhost:8199'),
      },
    },
  }
})
