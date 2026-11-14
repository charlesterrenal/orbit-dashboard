import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  kumaTime, parseKuma, serviceStatus, storageLevel, parsePve, fmtAgo, fmtBytes, isStale,
  statusText, fmtPct, uptimeParts, hhmm, fmtDay, fmtDate, fmtToday,
  summarize, downFirst, unavailableLabel, pollDown,
} from '../src/lib/status.js'

const page = (...mons) => ({ publicGroupList: [{ monitorList: mons }] })
const hb = (id, beats) => ({ heartbeatList: { [id]: beats }, uptimeList: {} })

test('kumaTime parses as UTC', () => {
  assert.equal(kumaTime('2026-11-14 09:34:18.163'), Date.UTC(2026, 10, 14, 9, 34, 18, 163))
})

test('parseKuma: down monitor, key trimmed+lowercased, since = first down after last up', () => {
  const beats = [
    { status: 1, time: '2026-11-14 09:00:00.000', ping: 5 },
    { status: 0, time: '2026-11-14 09:10:00.000', ping: null },
    { status: 0, time: '2026-11-14 09:20:00.000', ping: null },
  ]
  const m = parseKuma(page({ id: 5, name: ' Sonarr ' }), hb(5, beats)).get('sonarr')
  assert.equal(m.state, 'down')
  assert.equal(m.since, kumaTime('2026-11-14 09:10:00.000'))
})

test('parseKuma: down with no up beat uses earliest beat', () => {
  const beats = [
    { status: 0, time: '2026-11-14 09:10:00.000' },
    { status: 0, time: '2026-11-14 09:20:00.000' },
  ]
  const m = parseKuma(page({ id: 1, name: 'a' }), hb(1, beats)).get('a')
  assert.equal(m.since, kumaTime('2026-11-14 09:10:00.000'))
})

test('parseKuma: up with ping, uptime24, beats capped at 50, lastBeat', () => {
  const beats = Array.from({ length: 60 }, (_, i) => ({ status: 1, time: '2026-11-14 09:00:00.000', ping: i === 59 ? 18 : 1 }))
  const heartbeat = { heartbeatList: { 5: beats }, uptimeList: { '5_24': 0.995 } }
  const m = parseKuma(page({ id: 5, name: 'Sonarr' }), heartbeat).get('sonarr')
  assert.equal(m.state, 'up')
  assert.equal(m.ping, 18)
  assert.equal(m.uptime24, 99.5)
  assert.equal(m.beats.length, 50)
  assert.equal(m.lastBeat, kumaTime('2026-11-14 09:00:00.000'))
})

test('parseKuma: monitor without beats is pending-free and null-safe', () => {
  const m = parseKuma(page({ id: 9, name: 'x' }), { heartbeatList: {}, uptimeList: {} }).get('x')
  assert.equal(m.state, 'pending')
  assert.equal(m.uptime24, null)
  assert.equal(m.lastBeat, null)
})

test('serviceStatus matches case-insensitively, none when missing', () => {
  const map = parseKuma(page({ id: 5, name: 'Sonarr' }), hb(5, [{ status: 1, time: '2026-11-14 09:00:00.000', ping: 7 }]))
  assert.equal(serviceStatus({ monitor: 'SONARR' }, map).state, 'up')
  assert.equal(serviceStatus({}, map).state, 'none')
  assert.equal(serviceStatus({ monitor: 'nope' }, map).state, 'none')
})

test('storageLevel thresholds', () => {
  assert.equal(storageLevel(84), 'ok')
  assert.equal(storageLevel(85), 'warn')
  assert.equal(storageLevel(95), 'crit')
})

test('parsePve excludes inactive/zero pools, sorts desc, computes levels', () => {
  const pve = parsePve({
    status: { cpu: 0.126, memory: { used: 5, total: 10 }, uptime: 100 },
    storage: [
      { storage: 'a', active: 1, used: 10, total: 100 },
      { storage: 'zero', active: 1, used: 0, total: 0 },
      { storage: 'off', active: 0, used: 5, total: 100 },
      { storage: 'local-lvm', active: 1, used: 96, total: 100 },
    ],
    lxc: [{ status: 'running' }, { status: 'stopped' }, { status: 'running' }],
  })
  assert.deepEqual(pve.pools.map((p) => p.name), ['local-lvm', 'a'])
  assert.equal(pve.pools[0].usedPct, 96)
  assert.equal(pve.pools[0].level, 'crit')
  assert.equal(pve.cpuPct, 13)
  assert.equal(pve.lxcRunning, 2)
  assert.equal(pve.lxcTotal, 3)
  assert.equal(pve.memUsed, 5)
  assert.equal(pve.uptimeSec, 100)
})

test('formatters', () => {
  assert.equal(fmtAgo(30e3), 'just now')
  assert.equal(fmtAgo(12 * 60e3), '12m')
  assert.equal(fmtAgo(3 * 3600e3), '3h')
  assert.equal(fmtAgo(2 * 86400e3), '2d')
  assert.equal(fmtBytes(5.1 * 1024 ** 3), '5.1 GB')
})

test('isStale', () => {
  const t = 1e9
  assert.equal(isStale(null, 60e3, t), true)
  assert.equal(isStale(t, 60e3, t + 181e3), true)
  assert.equal(isStale(t, 60e3, t + 179e3), false)
})

test('splitMonitored: null monitors claims nothing; otherwise partitions', async () => {
  const { splitMonitored } = await import('../src/lib/status.js')
  const services = [{ id: 'a', name: 'A', monitor: ' SONARR ' }, { id: 'b', name: 'B' }]
  assert.deepEqual(splitMonitored(services, null), { found: [], missing: [] })
  const map = parseKuma(page({ id: 5, name: 'Sonarr' }), hb(5, [{ status: 1, time: '2026-11-14 09:00:00.000', ping: 7 }]))
  const r = splitMonitored(services, map)
  assert.deepEqual(r.found.map((f) => f.service.id), ['a'])
  assert.deepEqual(r.missing.map((s) => s.id), ['b'])
})

test('statusText copy', () => {
  const now = 1e9
  assert.equal(statusText({ state: 'up', ping: 18 }, now), '18ms')
  assert.equal(statusText({ state: 'up', ping: null }, now), '')
  assert.equal(statusText({ state: 'down', since: now - 12 * 60e3 }, now), 'down 12m')
  assert.equal(statusText({ state: 'pending' }, now), 'pending')
  assert.equal(statusText({ state: 'maintenance' }, now), 'maintenance')
  assert.equal(statusText({ state: 'none' }, now), '')
  assert.equal(statusText({ state: 'nodata' }, now), 'n/a')
})

test('fmtPct', () => {
  assert.equal(fmtPct(100), '100%')
  assert.equal(fmtPct(99.83), '99.8%')
  assert.equal(fmtPct(99.96), '100%')
  assert.equal(fmtPct(null), 'n/a')
})

test('uptimeParts', () => {
  assert.deepEqual(uptimeParts(14 * 86400 + 5 * 3600), { value: 14, unit: 'days' })
  assert.deepEqual(uptimeParts(86400), { value: 1, unit: 'day' })
  assert.deepEqual(uptimeParts(5 * 3600), { value: 5, unit: 'hours' })
  assert.deepEqual(uptimeParts(3600), { value: 1, unit: 'hour' })
  assert.deepEqual(uptimeParts(600), { value: 10, unit: 'min' })
})

test('date and time copy', () => {
  const t = new Date(2026, 10, 8, 4, 0).getTime() // sunday
  assert.equal(hhmm(new Date(2026, 10, 14, 9, 5).getTime()), '09:05')
  assert.equal(fmtDay(t), 'sun 04:00')
  assert.equal(fmtDate(t), 'sun 8 nov 04:00')
  assert.equal(fmtToday(new Date(2026, 10, 14, 14, 2).getTime()), 'sat 14 nov')
})

const kumaOf = (...states) => parseKuma(
  page(...states.map((_, i) => ({ id: i + 1, name: `m${i + 1}` }))),
  { heartbeatList: Object.fromEntries(states.map((s, i) => [i + 1, [{ status: s, time: '2026-11-14 09:00:00.000' }]])), uptimeList: {} },
)
const ok = { kuma: false, pve: false, updates: false }

test('summarize ignores monitors not listed in services.json', () => {
  const services = [{ name: 'A', monitor: 'm1' }, { name: 'B', monitor: 'm2' }, { name: 'C' }]
  const r = summarize({ services, monitors: kumaOf(1, 0, 0), pools: [], failed: ok })
  assert.equal(r.up, 1)
  assert.equal(r.down, 1)
  assert.deepEqual(r.downNames, ['B'])
})

test('summarize: kuma failed or not loaded gives null counts', () => {
  const services = [{ name: 'A', monitor: 'm1' }]
  assert.equal(summarize({ services, monitors: kumaOf(1), pools: [], failed: { ...ok, kuma: true } }).up, null)
  assert.equal(summarize({ services, monitors: null, pools: [], failed: ok }).down, null)
})

test('summarize: no pools gives null fullestPool', () => {
  const pool = { name: 'local-lvm', usedPct: 96, level: 'crit' }
  assert.equal(summarize({ services: [], monitors: null, pools: [], failed: ok }).fullestPool, null)
  assert.equal(summarize({ services: [], monitors: null, pools: null, failed: ok }).fullestPool, null)
  assert.equal(summarize({ services: [], monitors: null, pools: [pool], failed: { ...ok, pve: true } }).fullestPool, null)
  assert.equal(summarize({ services: [], monitors: null, pools: [pool], failed: ok }).fullestPool, pool)
})

test('summarize: unavailable lists failed sources in fixed order', () => {
  const r = summarize({ services: [], monitors: null, pools: null, failed: { kuma: true, pve: false, updates: true } })
  assert.deepEqual(r.unavailable, ['kuma', 'updates'])
})

test('downFirst moves down services first and keeps order otherwise', () => {
  const s = [{ name: 'A', monitor: 'm1' }, { name: 'B', monitor: 'm2' }, { name: 'C' }, { name: 'D', monitor: 'm3' }]
  assert.deepEqual(downFirst(s, kumaOf(1, 0, 0)).map((x) => x.name), ['B', 'D', 'A', 'C'])
  assert.deepEqual(downFirst(s, null).map((x) => x.name), ['A', 'B', 'C', 'D'])
})

test('unavailableLabel', () => {
  assert.equal(unavailableLabel('server', new Date(2026, 10, 14, 13, 40).getTime()), 'server unavailable, last seen 13:40')
  assert.equal(unavailableLabel('server', null), 'server unavailable')
})

test('pollDown: time spent hidden does not count as stale', () => {
  const t = 1e9
  assert.equal(pollDown({ error: null, updatedAt: t, resumedAt: null }, 60e3, t + 600e3), true)
  assert.equal(pollDown({ error: null, updatedAt: t, resumedAt: t + 590e3 }, 60e3, t + 600e3), false)
  assert.equal(pollDown({ error: new Error('x'), updatedAt: t, resumedAt: t + 590e3 }, 60e3, t + 600e3), true)
})
