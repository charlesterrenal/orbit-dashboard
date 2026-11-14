import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  kumaTime, parseKuma, serviceStatus, storageLevel, parsePve, verdict,
  verdictLabel, fmtAgo, fmtUptime, fmtBytes, isStale,
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

test('parseKuma: up with ping, uptime24, beats capped at 30', () => {
  const beats = Array.from({ length: 40 }, (_, i) => ({ status: 1, time: '2026-11-14 09:00:00.000', ping: i === 39 ? 18 : 1 }))
  const heartbeat = { heartbeatList: { 5: beats }, uptimeList: { '5_24': 0.995 } }
  const m = parseKuma(page({ id: 5, name: 'Sonarr' }), heartbeat).get('sonarr')
  assert.equal(m.state, 'up')
  assert.equal(m.ping, 18)
  assert.equal(m.uptime24, 99.5)
  assert.equal(m.beats.length, 30)
})

test('parseKuma: monitor without beats is pending-free and null-safe', () => {
  const m = parseKuma(page({ id: 9, name: 'x' }), { heartbeatList: {}, uptimeList: {} }).get('x')
  assert.equal(m.state, 'pending')
  assert.equal(m.uptime24, null)
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

test('verdict: issues ordered, display name used', () => {
  const monitors = parseKuma(page({ id: 5, name: 'Sonarr' }), hb(5, [{ status: 0, time: '2026-11-14 09:00:00.000' }]))
  const pve = { pools: [{ name: 'local-lvm', usedPct: 96 }] }
  const v = verdict({ monitors, pve, updates: { status: 'success' }, errors: {} })
  assert.deepEqual(v.issues, ['Sonarr down', 'local-lvm 96%'])
  assert.equal(v.state, 'issues')
})

test('verdict: unknown when only errors', () => {
  const v = verdict({ monitors: new Map(), pve: null, updates: null, errors: { kuma: new Error('x') } })
  assert.equal(v.state, 'unknown')
  assert.deepEqual(v.unknown, ['kuma'])
})

test('verdict: failed update is an issue; running is not', () => {
  assert.deepEqual(verdict({ monitors: new Map(), pve: null, updates: { status: 'failed' }, errors: {} }).issues, ['updates failed'])
  assert.equal(verdict({ monitors: new Map(), pve: null, updates: { status: 'running' }, errors: {} }).state, 'ok')
})

test('verdictLabel copy', () => {
  assert.equal(verdictLabel({ state: 'ok', issues: [] }), 'all good')
  assert.equal(verdictLabel({ state: 'issues', issues: ['a'] }), '1 issue')
  assert.equal(verdictLabel({ state: 'issues', issues: ['a', 'b'] }), '2 issues')
  assert.equal(verdictLabel({ state: 'unknown', issues: [] }), 'status unknown')
})

test('formatters', () => {
  assert.equal(fmtAgo(30e3), 'just now')
  assert.equal(fmtAgo(12 * 60e3), '12m')
  assert.equal(fmtAgo(3 * 3600e3), '3h')
  assert.equal(fmtAgo(2 * 86400e3), '2d')
  assert.equal(fmtUptime(14 * 86400 + 5 * 3600), '14d 5h')
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

test('uptimeSummary counts only services with a known monitor', async () => {
  const { uptimeSummary } = await import('../src/lib/status.js')
  const services = [{ id: 'a', monitor: 'a' }, { id: 'b', monitor: 'b' }, { id: 'c' }, { id: 'd', monitor: 'ghost' }]
  assert.deepEqual(uptimeSummary(services, null), { up: 0, total: 0 })
  const map = parseKuma(
    page({ id: 1, name: 'a' }, { id: 2, name: 'b' }),
    { heartbeatList: { 1: [{ status: 1, time: '2026-11-14 09:00:00.000' }], 2: [{ status: 0, time: '2026-11-14 09:00:00.000' }] }, uptimeList: {} },
  )
  assert.deepEqual(uptimeSummary(services, map), { up: 1, total: 2 })
})
