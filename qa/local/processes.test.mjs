import assert from 'node:assert/strict'
import net from 'node:net'
import test from 'node:test'

import { runCommand, waitForPort } from './processes.mjs'

test('waitForPort resolves when a local TCP server is ready', async () => {
  const server = net.createServer()

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()

  try {
    await waitForPort({ host: '127.0.0.1', port, timeoutMs: 500, intervalMs: 10 })
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  }
})

test('waitForPort rejects with host and port when the timeout expires', async () => {
  await assert.rejects(
    waitForPort({ host: '127.0.0.1', port: 1, timeoutMs: 40, intervalMs: 10 }),
    (error) => error instanceof Error
      && error.message.includes('127.0.0.1:1')
      && error.message.includes('40ms'),
  )
})

test('runCommand executes Windows command shims without EINVAL', async () => {
  if (process.platform !== 'win32') return

  const result = await runCommand('npm.cmd', ['--version'])
  assert.equal(result.exitCode, 0)
  assert.match(result.stdout, /\d+\.\d+\.\d+/)
})
