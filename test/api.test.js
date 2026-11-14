import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchJson } from '../src/lib/api.js'

test('non-ok response rejects with HTTP code', async () => {
  const fetchImpl = async () => ({ ok: false, status: 503 })
  await assert.rejects(fetchJson('/x', { fetchImpl }), /HTTP 503/)
})

test('hung fetch rejects with timeout', async () => {
  const fetchImpl = (_u, { signal }) =>
    new Promise((_, rej) => signal.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError'))))
  await assert.rejects(fetchJson('/x', { timeoutMs: 20, fetchImpl }), /timeout/)
})

test('200 resolves to body', async () => {
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => ({ a: 1 }) })
  assert.deepEqual(await fetchJson('/x', { fetchImpl }), { a: 1 })
})
