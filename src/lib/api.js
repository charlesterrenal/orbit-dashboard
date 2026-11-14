import { parseKuma, parsePve } from './status.js'
import { parseServicesConfig } from './config.js'

export async function fetchJson(url, { timeoutMs = 8000, fetchImpl = fetch, ...init } = {}) {
  const ctl = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; ctl.abort() }, timeoutMs)
  try {
    const res = await fetchImpl(url, { ...init, signal: ctl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    throw timedOut ? new Error('timeout') : e
  } finally {
    clearTimeout(timer)
  }
}

export const getConfig = async () =>
  parseServicesConfig(await fetchJson('/config/services.json', { cache: 'no-store' }))

export async function getKuma() {
  const base = '/api/uptime/api/status-page'
  const [page, heartbeat] = await Promise.all([
    fetchJson(`${base}/default`),
    fetchJson(`${base}/heartbeat/default`),
  ])
  return parseKuma(page, heartbeat)
}

export async function getPve(node) {
  const base = `/api/proxmox/nodes/${encodeURIComponent(node)}`
  const [status, storage, lxc] = await Promise.all(
    ['status', 'storage', 'lxc'].map((p) => fetchJson(`${base}/${p}`).then((r) => r.data)),
  )
  return parsePve({ status, storage, lxc })
}

export const getUpdates = () => fetchJson('/api/updates/status.json')
