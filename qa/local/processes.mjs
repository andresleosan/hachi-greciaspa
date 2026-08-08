import net from 'node:net'
import { spawn } from 'node:child_process'

function resolveSpawnInvocation(command, args) {
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)) {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', command, ...args],
    }
  }
  return { command, args }
}

export function waitForPort({
  host = '127.0.0.1',
  port,
  timeoutMs = 30_000,
  intervalMs = 100,
} = {}) {
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    return Promise.reject(new Error(`Invalid TCP port: ${port}`))
  }

  const startedAt = Date.now()

  return new Promise((resolve, reject) => {
    let timer
    let settled = false

    function finish(callback, value) {
      if (settled) return
      settled = true
      if (timer) clearTimeout(timer)
      callback(value)
    }

    function attempt() {
      if (Date.now() - startedAt >= timeoutMs) {
        finish(reject, new Error(`Timed out waiting for ${host}:${port} after ${timeoutMs}ms`))
        return
      }

      const socket = net.createConnection({ host, port })
      socket.once('connect', () => {
        socket.destroy()
        finish(resolve)
      })
      socket.once('error', () => {
        socket.destroy()
        if (!settled) timer = setTimeout(attempt, intervalMs)
      })
    }

    attempt()
  })
}

export function getAvailablePort({ host = '127.0.0.1' } = {}) {
  const server = net.createServer()

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen({ host, port: 0 }, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : undefined

      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        if (!port) {
          reject(new Error(`Could not determine available TCP port for ${host}`))
          return
        }
        resolve(port)
      })
    })
  })
}

export function spawnProcess(command, args = [], {
  cwd = process.cwd(),
  env = process.env,
  label = command,
  stdio = 'inherit',
} = {}) {
  const invocation = resolveSpawnInvocation(command, args)
  const child = spawn(invocation.command, invocation.args, {
    cwd,
    env,
    shell: false,
    stdio,
    windowsHide: true,
  })
  child.qaLabel = label
  return child
}

export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawnProcess(command, args, {
      ...options,
      stdio: options.stdio || ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString() })
    child.once('error', (error) => resolve({
      exitCode: 1,
      stdout,
      stderr: `${stderr}${error.message}`,
    }))
    child.once('close', (exitCode) => resolve({ exitCode: exitCode ?? 1, stdout, stderr }))
  })
}

export async function stopProcessTree(child, { label = child?.qaLabel || 'process' } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return

  await new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }

    child.once('close', finish)
    child.once('error', finish)

    if (process.platform === 'win32' && child.pid) {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        shell: false,
        windowsHide: true,
      })
      killer.once('error', () => child.kill())
      killer.once('close', () => {
        if (!settled && child.exitCode === null) child.kill()
      })
    } else {
      child.kill('SIGTERM')
    }

    setTimeout(() => {
      if (!settled) {
        child.kill('SIGKILL')
        finish()
      }
    }, 5_000).unref()
  }).catch(() => {
    throw new Error(`Could not stop ${label}`)
  })
}
