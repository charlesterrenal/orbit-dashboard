import { test } from 'node:test'
import assert from 'node:assert/strict'
import { TABS, tabFromHash } from '../src/lib/tabs.js'

test('tabFromHash: known tabs, anything else is directory', () => {
  assert.equal(tabFromHash('#/monitoring'), 'monitoring')
  assert.equal(tabFromHash('#/containers'), 'containers')
  assert.equal(tabFromHash('#/foo'), 'directory')
  assert.equal(tabFromHash(''), 'directory')
})

test('TABS order', () => {
  assert.deepEqual(TABS, ['directory', 'monitoring', 'containers'])
})
