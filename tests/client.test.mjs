import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const temp = await mkdtemp(join(tmpdir(), 'northlink-client-'))
const outfile = join(temp, 'client.cjs')
await build({ entryPoints: ['src/api/client.ts'], outfile, bundle: true, platform: 'node', format: 'cjs' })
const values = new Map()
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }
const { api, flushQueue, pendingPosts } = createRequire(import.meta.url)(outfile)
const key = 'northlink:queue'
beforeEach(() => { values.clear() })
after(async () => { await rm(temp, { recursive: true, force: true }) })

test('HTTP error leaves the item and later items queued with stable IDs', async () => {
  values.set(key, JSON.stringify([{ path: '/deliveries/C-12/complete', body: { truck_id: 'T2' }, queuedAt: 'sample' }]))
  for (const status of [400, 409, 422, 500, 503]) {
    globalThis.fetch = async () => new Response('{}', { status })
    assert.equal(await flushQueue(), 0)
    assert.equal(pendingPosts().length, 1)
  }
  const id = pendingPosts()[0].body.event_id
  assert.ok(id)
  globalThis.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).event_id, id)
    return new Response('{}', { status: 200 })
  }
  assert.equal(await flushQueue(), 1)
  assert.equal(pendingPosts().length, 0)
})

test('offline completion keeps timestamp and event ID on replay', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline') }
  assert.deepEqual(await api.completeDelivery('C-12', 'T2'), { queued: true })
  const body = pendingPosts()[0].body
  assert.ok(body.event_id && body.timestamp)
  globalThis.fetch = async (_url, options) => {
    assert.deepEqual(JSON.parse(options.body), body)
    return new Response('{}')
  }
  assert.equal(await flushQueue(), 1)
})

test('items appended during replay are retained and sent', async () => {
  const first = { path: '/reports', body: { event_id: 'first' }, queuedAt: 'first' }
  const second = { path: '/reports', body: { event_id: 'second' }, queuedAt: 'second' }
  values.set(key, JSON.stringify([first]))
  const ids = []
  globalThis.fetch = async (_url, options) => {
    const id = JSON.parse(options.body).event_id
    ids.push(id)
    if (id === 'first') values.set(key, JSON.stringify([first, second]))
    return new Response('{}')
  }
  assert.equal(await flushQueue(), 2)
  assert.deepEqual(ids, ['first', 'second'])
  assert.equal(pendingPosts().length, 0)
})

test('another tab removing the same item cannot discard the next item', async () => {
  const first = { path: '/reports', body: { event_id: 'first' }, queuedAt: 'first' }
  const second = { path: '/reports', body: { event_id: 'second' }, queuedAt: 'second' }
  values.set(key, JSON.stringify([first, second]))
  const ids = []
  globalThis.fetch = async (_url, options) => {
    const id = JSON.parse(options.body).event_id
    ids.push(id)
    if (id === 'first') values.set(key, JSON.stringify([second]))
    return new Response('{}')
  }
  await flushQueue()
  assert.deepEqual(ids, ['first', 'second'])
})
