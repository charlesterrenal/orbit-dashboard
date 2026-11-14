import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { createPoller } from '../src/lib/poller.js'

const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }

function setup({ hidden = false } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] })
  const s = { calls: 0, results: [], hidden, resolvers: [] }
  s.poller = createPoller({
    fn: () => { s.calls++; return new Promise((r) => s.resolvers.push(r)) },
    intervalMs: 1000,
    isHidden: () => s.hidden,
    onData: (d) => s.results.push(d),
    onError: () => {},
  })
  return s
}

test('never overlaps: next call waits for the previous to settle', async () => {
  const s = setup()
  s.poller.run()
  mock.timers.tick(5000)
  await flush()
  assert.equal(s.calls, 1)
  s.resolvers[0]('a'); await flush()
  mock.timers.tick(1000); await flush()
  assert.equal(s.calls, 2)
  s.poller.stop(); mock.timers.reset()
})

test('does not call while hidden, calls once visible again', async () => {
  const s = setup({ hidden: true })
  s.poller.run(); await flush()
  assert.equal(s.calls, 0)
  s.hidden = false
  s.poller.run(); await flush()
  assert.equal(s.calls, 1)
  s.poller.stop(); mock.timers.reset()
})

test('stop cancels the timer and drops late results', async () => {
  const s = setup()
  s.poller.run(); await flush()
  s.poller.stop()
  s.resolvers[0]('late'); await flush()
  mock.timers.tick(5000); await flush()
  assert.equal(s.calls, 1)
  assert.deepEqual(s.results, [])
  mock.timers.reset()
})
