import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseServicesConfig } from '../src/lib/config.js'

const svc = { id: 'a', name: 'A', url: 'http://a.lan:80' }

test('valid config round-trips', () => {
  const c = parseServicesConfig({ node: 'n1', groups: [{ name: 'G', services: [svc] }] })
  assert.equal(c.node, 'n1')
  assert.deepEqual(c.groups, [{ name: 'G', services: [svc] }])
  assert.deepEqual(c.warnings, [])
})

test('non-array groups throws', () => {
  assert.throws(() => parseServicesConfig({ groups: 'x' }), /invalid services.json/)
})

test('non-object and bad group throw', () => {
  assert.throws(() => parseServicesConfig(null), /invalid services.json/)
  assert.throws(() => parseServicesConfig({ groups: [{ services: [] }] }), /invalid services.json/)
  assert.throws(() => parseServicesConfig({ groups: [{ name: 'G' }] }), /invalid services.json/)
})

test('javascript: url is dropped with one warning', () => {
  const bad = { id: 'x', name: 'X', url: 'javascript:alert(1)' }
  const c = parseServicesConfig({ groups: [{ name: 'G', services: [bad, svc] }] })
  assert.deepEqual(c.groups[0].services, [svc])
  assert.equal(c.warnings.length, 1)
  assert.match(c.warnings[0], /^x: /)
})

test('service missing id or name is dropped', () => {
  const c = parseServicesConfig({ groups: [{ name: 'G', services: [{ name: 'N', url: 'http://a' }] }] })
  assert.equal(c.groups[0].services.length, 0)
  assert.match(c.warnings[0], /^\?: /)
})

test('missing node defaults to pve', () => {
  assert.equal(parseServicesConfig({ groups: [] }).node, 'pve')
})
