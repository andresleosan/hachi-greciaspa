import assert from 'node:assert/strict'
import test from 'node:test'
import { access, cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { runQa } from './run.mjs'

const qaUsers = {
  admin: { email: 'qa-admin@example.test', password: 'placeholder' },
  client: { email: 'qa-client@example.test', password: 'placeholder' },
}

function successfulRunOptions(cwd, overrides = {}) {
  return {
    cwd,
    runCommand: async () => ({ exitCode: 0, stdout: '', stderr: '' }),
    startProcess: (command, args, options) => ({ command, args, qaLabel: options.label, exitCode: null, signalCode: null }),
    stopProcessTree: async () => {},
    waitForPort: async () => {},
    createUsers: async () => qaUsers,
    seedBookings: async () => ({
      agendaDate: '2026-08-09',
      unassignedDate: '2026-08-09',
      rescheduleDate: '2026-08-10',
    }),
    copyCache: async () => {},
    runPlaywright: async () => ({ exitCode: 0 }),
    ...overrides,
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

test('runQa stops every started process when a later phase fails', async () => {
  const started = []
  const stopped = []
  const commands = []

  await assert.rejects(
    runQa({
      cwd: 'F:/repo',
      runCommand: async (command, args) => {
        commands.push([command, ...args])
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      startProcess: (command) => {
        const process = { command }
        started.push(process)
        return process
      },
      getAvailablePort: async () => 4173,
      stopProcessTree: async (process) => {
        stopped.push(process)
      },
      waitForPort: async ({ port }) => {
        if (port === 4173) throw new Error('Vite did not start')
      },
      randomId: () => 'test-run',
      createUsers: async () => ({ client: { uid: 'qa-client' } }),
      seedBookings: async () => ({ agendaDate: '2026-08-09' }),
      prepareSecretOverride: async () => async () => {},
      copyCache: async () => {},
      runPlaywright: async () => ({ exitCode: 0 }),
    }),
    /Vite did not start/,
  )

  assert.equal(started.length, 2)
  assert.deepEqual(stopped, started.reverse())
  assert.ok(commands.some(([, ...args]) => args.includes('build')))
})

test('runQa uses the injected available port for Vite and Playwright', async () => {
  const viteStarts = []
  const waitedPorts = []
  let qaBaseUrl

  await runQa(successfulRunOptions('F:/repo', {
    getAvailablePort: async () => 4321,
    prepareSecretOverride: async () => async () => {},
    startProcess: (command, args, options) => {
      if (options.label === 'Vite QA server') viteStarts.push({ command, args })
      return { command, args, qaLabel: options.label, exitCode: null, signalCode: null }
    },
    waitForPort: async ({ port }) => {
      waitedPorts.push(port)
    },
    runPlaywright: async (_args, { env }) => {
      qaBaseUrl = env.QA_BASE_URL
      return { exitCode: 0 }
    },
  }))

  assert.deepEqual(viteStarts[0].args.slice(-5), ['--host', '127.0.0.1', '--port', '4321', '--strictPort'])
  assert.equal(waitedPorts.at(-1), 4321)
  assert.equal(qaBaseUrl, 'http://127.0.0.1:4321')
})

test('runQa retries temporary config cleanup and propagates persistent errors', async () => {
  const removeCalls = []
  const persistentError = Object.assign(new Error('temporary config directory is busy'), { code: 'EBUSY' })

  await assert.rejects(
    runQa(successfulRunOptions('F:/repo', {
      prepareSecretOverride: async () => async () => {},
      removeDirectory: async (...args) => {
        removeCalls.push(args)
        throw persistentError
      },
    })),
    (error) => error === persistentError,
  )

  assert.equal(removeCalls.length, 1)
  assert.deepEqual(removeCalls[0][1], {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 100,
  })
})

test('runQa isolates CLI configuration and uses non-interactive Firebase', async () => {
  const observedEnvs = []
  const firebaseArgs = []
  let copiedCaches
  const hostRoot = await mkdtemp(path.join(os.tmpdir(), 'qa-runner-cache-source-'))
  const browserSource = path.join(hostRoot, 'playwright-cache')
  const emulatorSource = path.join(hostRoot, 'firebase-cache')
  await mkdir(browserSource, { recursive: true })
  await mkdir(emulatorSource, { recursive: true })
  await writeFile(path.join(browserSource, 'browser-placeholder'), 'placeholder')
  await writeFile(path.join(emulatorSource, 'emulator-placeholder'), 'placeholder')
  const hostConfigNames = ['HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'XDG_CONFIG_HOME', 'CLOUDSDK_CONFIG']
  const previousValues = Object.fromEntries(hostConfigNames.map((name) => [name, process.env[name]]))
  const previousBrowserPath = process.env.PLAYWRIGHT_BROWSERS_PATH
  const previousEmulatorPath = process.env.FIREBASE_EMULATORS_PATH
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserSource
  process.env.FIREBASE_EMULATORS_PATH = emulatorSource
  for (const name of hostConfigNames) process.env[name] = hostRoot

  try {
    await runQa(successfulRunOptions('F:/repo', {
      runCommand: async (command, args, options) => {
        observedEnvs.push(options.env)
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      startProcess: (command, args, options) => {
        if (options.label === 'Firebase Emulator Suite') {
          firebaseArgs.push(args)
          copiedCaches = {
            playwright: existsSync(path.join(options.env.PLAYWRIGHT_BROWSERS_PATH, 'browser-placeholder')),
            emulator: existsSync(path.join(options.env.FIREBASE_EMULATORS_PATH, 'emulator-placeholder')),
          }
        }
        observedEnvs.push(options.env)
        return { command, args, qaLabel: options.label, exitCode: null, signalCode: null }
      },
      copyCache: async (source, destination) => cp(source, destination, { recursive: true }),
      runPlaywright: async (args, options) => {
        observedEnvs.push(options.env)
        return { exitCode: 0 }
      },
      prepareSecretOverride: async () => async () => {},
    }))
  } finally {
    for (const [name, value] of Object.entries(previousValues)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
    if (previousBrowserPath === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH
    else process.env.PLAYWRIGHT_BROWSERS_PATH = previousBrowserPath
    if (previousEmulatorPath === undefined) delete process.env.FIREBASE_EMULATORS_PATH
    else process.env.FIREBASE_EMULATORS_PATH = previousEmulatorPath
    await rm(hostRoot, { recursive: true, force: true })
  }

  const env = observedEnvs[0]
  assert.notEqual(env.HOME, hostRoot)
  assert.equal(env.HOME, env.USERPROFILE)
  assert.notEqual(env.APPDATA, hostRoot)
  assert.notEqual(env.LOCALAPPDATA, hostRoot)
  assert.ok(env.XDG_CONFIG_HOME.startsWith(env.HOME))
  assert.ok(env.CLOUDSDK_CONFIG.startsWith(env.HOME))
  assert.ok(env.PLAYWRIGHT_BROWSERS_PATH.startsWith(env.HOME))
  assert.ok(env.FIREBASE_EMULATORS_PATH.startsWith(env.HOME))
  assert.notEqual(env.PLAYWRIGHT_BROWSERS_PATH, browserSource)
  assert.notEqual(env.FIREBASE_EMULATORS_PATH, emulatorSource)
  assert.deepEqual(copiedCaches, { playwright: true, emulator: true })
  assert.equal(env.NPM_CONFIG_USERCONFIG.startsWith(env.HOME), true)
  assert.equal(env.CI, 'true')
  assert.equal(env.FIREBASE_TOKEN, undefined)
  assert.equal(env.GOOGLE_APPLICATION_CREDENTIALS, undefined)
  assert.deepEqual(JSON.parse(env.FIREBASE_CONFIG), {
    projectId: 'hachi-greciaspa',
    storageBucket: 'hachi-greciaspa.appspot.com',
    databaseURL: 'https://hachi-greciaspa.firebaseio.com',
  })
  assert.equal(firebaseArgs[0].includes('--non-interactive'), true)
  assert.equal(await pathExists(env.HOME), false)
})

test('runQa rejects a pre-existing local secret override', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'qa-runner-secret-'))
  const functionsDir = path.join(cwd, 'functions')
  const secretPath = path.join(functionsDir, '.secret.local')
  await mkdir(functionsDir)
  await writeFile(secretPath, 'RESEND_API_KEY=qa-local-placeholder\n', { flag: 'wx' })

  try {
    await assert.rejects(
      runQa(successfulRunOptions(cwd)),
      /Refusing to reuse existing local secret override/,
    )
    assert.equal(await pathExists(secretPath), true)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})

test('runQa removes the local secret override it creates', async () => {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'qa-runner-cleanup-'))
  await mkdir(path.join(cwd, 'functions'))
  const secretPath = path.join(cwd, 'functions', '.secret.local')

  try {
    await runQa(successfulRunOptions(cwd))
    assert.equal(await pathExists(secretPath), false)
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
})
