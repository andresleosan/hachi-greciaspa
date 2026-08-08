import { randomUUID } from 'node:crypto'
import { access, cp, mkdir, mkdtemp, rm, unlink, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createQaUsers, seedQaBookings } from './seed.mjs'
import {
  runCommand as defaultRunCommand,
  getAvailablePort as defaultGetAvailablePort,
  spawnProcess as defaultStartProcess,
  stopProcessTree as defaultStopProcessTree,
  waitForPort as defaultWaitForPort,
} from './processes.mjs'

const PROJECT_ID = 'hachi-greciaspa'
const EMULATOR_PORTS = [9099, 8080, 5001]
const WINDOWS = process.platform === 'win32'
const NPM = WINDOWS ? 'npm.cmd' : 'npm'
const EMULATOR_START_TIMEOUT_MS = 120_000

function localFirebaseConfig(projectId) {
  return {
    projectId,
    storageBucket: `${projectId}.appspot.com`,
    databaseURL: `https://${projectId}.firebaseio.com`,
  }
}

function localBinary(cwd, name) {
  return path.join(cwd, 'node_modules', '.bin', WINDOWS ? `${name}.cmd` : name)
}

function hostCachePaths() {
  return {
    playwright: process.env.PLAYWRIGHT_BROWSERS_PATH
      || (process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright')),
    firebase: process.env.FIREBASE_EMULATORS_PATH
      || path.join(process.env.HOME || process.env.USERPROFILE || os.homedir(), '.cache', 'firebase', 'emulators'),
  }
}

async function copyCacheTree(source, destination) {
  if (!source) return
  try {
    await access(source)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  await cp(source, destination, { recursive: true, force: true })
}

function safeEnvironment(projectId, configDir) {
  const isolatedHome = configDir
  const firebaseConfig = localFirebaseConfig(projectId)
  const allowed = new Set([
    'ComSpec',
    'JAVA_HOME',
    'PATH',
    'Path',
    'PATHEXT',
    'SYSTEMROOT',
    'TEMP',
    'TMP',
  ])
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([name]) => allowed.has(name)),
  )

  return {
    ...env,
    PLAYWRIGHT_BROWSERS_PATH: path.join(configDir, 'playwright-browsers'),
    FIREBASE_EMULATORS_PATH: path.join(configDir, 'firebase-emulators'),
    FIREBASE_CONFIG: JSON.stringify(firebaseConfig),
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    APPDATA: path.join(configDir, 'appdata'),
    LOCALAPPDATA: path.join(configDir, 'local-appdata'),
    XDG_CONFIG_HOME: path.join(configDir, 'xdg-config'),
    XDG_CACHE_HOME: path.join(configDir, 'xdg-cache'),
    XDG_DATA_HOME: path.join(configDir, 'xdg-data'),
    XDG_STATE_HOME: path.join(configDir, 'xdg-state'),
    CLOUDSDK_CONFIG: path.join(configDir, 'gcloud'),
    NPM_CONFIG_USERCONFIG: path.join(configDir, 'npmrc'),
    NPM_CONFIG_CACHE: path.join(configDir, 'npm-cache'),
    // CI disables Firebase update notifications; the isolated configstore has no usage opt-in.
    CI: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
    FIREBASE_PROJECT_ID: projectId,
    FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    GCLOUD_PROJECT: projectId,
    VITE_FIREBASE_API_KEY: 'qa-dummy-api-key',
    VITE_FIREBASE_APP_CHECK_SITE_KEY: '',
    VITE_FIREBASE_APP_ID: '1:000000000000:web:qa00000000000000',
    VITE_FIREBASE_AUTH_DOMAIN: 'localhost',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
    VITE_USE_FIREBASE_EMULATOR: 'true',
  }
}

async function prepareFirebaseCliConfig(env, projectId) {
  const content = JSON.stringify({
    usage: false,
    motd: { fetched: Date.now() },
    adminsdkconfig: { [projectId]: JSON.parse(env.FIREBASE_CONFIG) },
  })
  const configPaths = new Set([
    path.join(env.XDG_CONFIG_HOME, 'configstore', 'firebase-tools.json'),
    path.join(env.APPDATA, 'configstore', 'firebase-tools.json'),
  ])
  for (const configPath of configPaths) {
    await mkdir(path.dirname(configPath), { recursive: true })
    await writeFile(configPath, content, { flag: 'wx' })
  }
}

async function requireSuccess(result, label) {
  if (result?.exitCode === 0) return result
  const details = result?.stderr || result?.stdout || 'sin salida'
  throw new Error(`${label} failed with exit code ${result?.exitCode ?? 'unknown'}: ${details}`)
}

async function prepareSecretOverride(cwd) {
  const secretPath = path.join(cwd, 'functions', '.secret.local')
  let created = false
  try {
    await writeFile(secretPath, 'RESEND_API_KEY=qa-local-placeholder\n', { flag: 'wx' })
    created = true
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('Refusing to reuse existing local secret override')
    }
    throw error
  }

  return async () => {
    if (!created) return
    try {
      await unlink(secretPath)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
}

export async function runQa({
  cwd = process.cwd(),
  projectId = PROJECT_ID,
  runCommand = defaultRunCommand,
  getAvailablePort = defaultGetAvailablePort,
  startProcess = defaultStartProcess,
  stopProcessTree = defaultStopProcessTree,
  waitForPort = defaultWaitForPort,
  createUsers = createQaUsers,
  seedBookings = seedQaBookings,
  runPlaywright,
  prepareSecretOverride: prepareSecret = prepareSecretOverride,
  copyCache: copyCacheFn = copyCacheTree,
  randomId = () => randomUUID().slice(0, 8),
  playwrightArgs = process.argv.slice(2),
  removeDirectory = rm,
} = {}) {
  const configDir = await mkdtemp(path.join(os.tmpdir(), 'hachi-greciaspa-qa-'))
  const env = safeEnvironment(projectId, configDir)
  const cacheSources = hostCachePaths()
  const runId = randomId()
  const started = []
  let users
  let cleanupSecret = async () => {}

  const execute = (command, args, label) => runCommand(command, args, {
    cwd,
    env,
    label,
  })

  try {
    await copyCacheFn(cacheSources.playwright, env.PLAYWRIGHT_BROWSERS_PATH)
    await copyCacheFn(cacheSources.firebase, env.FIREBASE_EMULATORS_PATH)

    await requireSuccess(
      await execute(NPM, ['--prefix', 'functions', 'run', 'build'], 'functions build'),
      'Functions build',
    )

    cleanupSecret = await prepareSecret(cwd)
    await prepareFirebaseCliConfig(env, projectId)
    const emulator = startProcess(
      localBinary(cwd, 'firebase'),
      ['emulators:start', '--only', 'auth,firestore,functions', '--project', projectId, '--non-interactive'],
      { cwd, env, label: 'Firebase Emulator Suite' },
    )
    started.push(emulator)
    for (const port of EMULATOR_PORTS) {
      await waitForPort({ host: '127.0.0.1', port, timeoutMs: EMULATOR_START_TIMEOUT_MS, intervalMs: 250 })
    }

    await requireSuccess(
      await execute(NPM, ['run', 'seed:services', '--', '--emulator'], 'services seed'),
      'Services seed',
    )
    await requireSuccess(
      await execute(NPM, ['run', 'seed:employees', '--', '--emulator'], 'employees seed'),
      'Employees seed',
    )

    users = await createUsers({ projectId, runId, env })
    const fixture = await seedBookings({ db: users.db, users, projectId, runId })

    const vitePort = await getAvailablePort({ host: '127.0.0.1' })
    const vite = startProcess(
      NPM,
      ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(vitePort), '--strictPort'],
      { cwd, env, label: 'Vite QA server' },
    )
    started.push(vite)
    await waitForPort({ host: '127.0.0.1', port: vitePort, timeoutMs: 60_000, intervalMs: 250 })

    const qaEnv = {
      ...env,
      QA_ADMIN_EMAIL: users.admin.email,
      QA_ADMIN_PASSWORD: users.admin.password,
      QA_CLIENT_EMAIL: users.client.email,
      QA_CLIENT_PASSWORD: users.client.password,
      QA_BASE_URL: `http://127.0.0.1:${vitePort}`,
      QA_AGENDA_DATE: fixture.agendaDate,
      QA_UNASSIGNED_DATE: fixture.unassignedDate,
      QA_RESCHEDULE_DATE: fixture.rescheduleDate,
    }
    const runBrowserTests = runPlaywright || ((args) => runCommand(
      localBinary(cwd, 'playwright'),
      ['test', '--config=qa/playwright.local.config.mjs', ...args],
      { cwd, env: qaEnv, label: 'Playwright local QA', stdio: 'inherit' },
    ))
    const playwrightResult = await runBrowserTests(playwrightArgs, { cwd, env: qaEnv })
    await requireSuccess(playwrightResult, 'Playwright local QA')
    return playwrightResult
  } finally {
    if (users?.app && users.deleteApp) {
      try {
        await users.deleteApp(users.app)
      } catch {
        // Process cleanup below remains mandatory even if Admin SDK closes late.
      }
    }
    try {
      for (const child of started.reverse()) {
        await stopProcessTree(child, { label: child?.qaLabel })
      }
    } finally {
      try {
        await cleanupSecret()
      } finally {
        await removeDirectory(configDir, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 100,
        })
      }
    }
  }
}

function isMainModule() {
  return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

if (isMainModule()) {
  runQa()
    .then(() => { process.exitCode = 0 })
    .catch((error) => {
      console.error(`Local browser QA failed: ${error instanceof Error ? error.message : String(error)}`)
      process.exitCode = error?.exitCode || 1
    })
}
