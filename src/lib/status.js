export const WARN_PCT = 85
export const CRIT_PCT = 95

const STATES = ['down', 'up', 'pending', 'maintenance']
const key = (s) => String(s).trim().toLowerCase()

// Kuma times are UTC with no zone suffix.
export const kumaTime = (s) => Date.parse(`${s.replace(' ', 'T')}Z`)

export function parseKuma(page, heartbeat) {
  const map = new Map()
  const lists = heartbeat?.heartbeatList ?? {}
  const uptimes = heartbeat?.uptimeList ?? {}
  for (const group of page?.publicGroupList ?? []) {
    for (const { id, name } of group.monitorList ?? []) {
      const all = lists[id] ?? []
      const last = all.at(-1)
      const state = STATES[last?.status] ?? 'pending'
      let since = null
      if (state === 'down') {
        const lastUp = all.findLastIndex((b) => b.status === 1)
        const first = lastUp === -1 ? all[0] : all.slice(lastUp + 1).find((b) => b.status === 0)
        since = kumaTime(first.time)
      }
      const u = uptimes[`${id}_24`]
      map.set(key(name), {
        name, state, since,
        ping: last?.ping ?? null,
        uptime24: typeof u === 'number' ? u * 100 : null,
        beats: all.slice(-50).map((b) => b.status),
        lastBeat: last ? kumaTime(last.time) : null,
      })
    }
  }
  return map
}

export function serviceStatus(service, monitors) {
  const m = service.monitor ? monitors.get(key(service.monitor)) : undefined
  return m ? { state: m.state, ping: m.ping, since: m.since } : { state: 'none', ping: null, since: null }
}

// Services split by whether Kuma knows their monitor. Before Kuma loads (monitors null) neither list claims anything.
export function splitMonitored(services, monitors) {
  const found = []
  const missing = []
  if (!monitors) return { found, missing }
  for (const service of services) {
    const monitor = service.monitor && monitors.get(key(service.monitor))
    if (monitor) found.push({ service, monitor })
    else missing.push(service)
  }
  return { found, missing }
}

export const storageLevel = (pct) => (pct >= CRIT_PCT ? 'crit' : pct >= WARN_PCT ? 'warn' : 'ok')

export function parsePve({ status, storage, lxc }) {
  const pools = storage
    .filter((s) => s.active && s.total > 0)
    .map((s) => {
      const usedPct = Math.round((s.used / s.total) * 100)
      return { name: s.storage, used: s.used, total: s.total, usedPct, level: storageLevel(usedPct) }
    })
    .sort((a, b) => b.usedPct - a.usedPct)
  return {
    cpuPct: Math.round(status.cpu * 100),
    memUsed: status.memory.used,
    memTotal: status.memory.total,
    uptimeSec: status.uptime,
    lxcRunning: lxc.filter((c) => c.status === 'running').length,
    lxcTotal: lxc.length,
    pools,
  }
}

export function verdict({ monitors, pve, updates, errors }) {
  const issues = []
  for (const m of monitors?.values() ?? []) if (m.state === 'down') issues.push(`${m.name} down`)
  for (const p of pve?.pools ?? []) if (p.usedPct >= WARN_PCT) issues.push(`${p.name} ${p.usedPct}%`)
  if (updates && updates.status !== 'success' && updates.status !== 'running') issues.push(`updates ${updates.status}`)
  const unknown = Object.keys(errors ?? {}).filter((k) => errors[k])
  const state = issues.length ? 'issues' : unknown.length ? 'unknown' : 'ok'
  return { state, issues, unknown }
}

export function verdictLabel(v) {
  if (v.state === 'unknown') return 'status unknown'
  if (v.state === 'ok') return 'all good'
  return v.issues.length === 1 ? '1 issue' : `${v.issues.length} issues`
}

export function fmtAgo(ms) {
  if (ms < 60e3) return 'just now'
  const m = Math.floor(ms / 60e3)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`
}

export const fmtUptime = (sec) => `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`

export function fmtBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(1)} ${units[i]}`
}

export const isStale = (updatedAt, intervalMs, now) => updatedAt == null || now - updatedAt > 3 * intervalMs

export function uptimeSummary(services, monitors) {
  const { found } = splitMonitored(services, monitors)
  return { up: found.filter((f) => f.monitor.state === 'up').length, total: found.length }
}

export function statusText({ state, ping, since }, now) {
  switch (state) {
    case 'up': return ping == null ? '' : `${ping}ms`
    case 'down': return `down ${fmtAgo(now - since)}`
    case 'pending':
    case 'maintenance': return state
    case 'none': return ''
    default: return 'n/a'
  }
}

export const pollDown = (poll, intervalMs, now) =>
  poll.error != null || (poll.updatedAt != null && isStale(poll.updatedAt, intervalMs, now))

export const fmtPct = (n) => (n == null ? 'n/a' : `${+n.toFixed(1)}%`)

export function uptimeParts(sec) {
  const [value, unit] = sec >= 86400 ? [Math.floor(sec / 86400), 'day']
    : sec >= 3600 ? [Math.floor(sec / 3600), 'hour']
    : [Math.floor(sec / 60), 'min']
  return { value, unit: unit === 'min' || value === 1 ? unit : `${unit}s` }
}

// Fixed English copy, local time; no Intl so output never depends on the browser locale.
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const pad = (n) => String(n).padStart(2, '0')
export const hhmm = (ms) => { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const fmtToday = (ms) => { const d = new Date(ms); return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}` }
export const fmtDay = (ms) => `${DAYS[new Date(ms).getDay()]} ${hhmm(ms)}`
export const fmtDate = (ms) => `${fmtToday(ms)} ${hhmm(ms)}`

const isDown = (service, monitors) => serviceStatus(service, monitors).state === 'down'

// Strip numbers. Counts cover only services listed in services.json; null means "not known".
export function summarize({ services, monitors, pools, failed }) {
  const known = monitors && !failed.kuma
  const downs = known ? services.filter((s) => isDown(s, monitors)) : []
  return {
    up: known ? services.filter((s) => serviceStatus(s, monitors).state === 'up').length : null,
    down: known ? downs.length : null,
    downNames: downs.map((s) => s.name),
    fullestPool: (!failed.pve && pools?.[0]) || null,
    unavailable: ['kuma', 'pve', 'updates'].filter((k) => failed[k]),
  }
}

export const downFirst = (services, monitors) =>
  monitors ? [...services].sort((a, b) => isDown(b, monitors) - isDown(a, monitors)) : [...services]

export const unavailableLabel = (name, updatedAt) =>
  updatedAt == null ? `${name} unavailable` : `${name} unavailable, last seen ${hhmm(updatedAt)}`
