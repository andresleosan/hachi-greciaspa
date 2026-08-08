import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, isAbsolute, relative, resolve } from 'node:path'

const COMMANDS = [
  ['client tests', 'npm', ['run', 'test:client'], 'required'],
  ['full rules/functions tests', 'npm', ['test'], 'required'],
  ['client typecheck', 'npx', ['tsc', '--noEmit'], 'required'],
  ['client build', 'npm', ['run', 'build'], 'required'],
  ['functions typecheck', 'npm', ['--prefix', 'functions', 'run', 'typecheck'], 'required'],
  ['functions build', 'npm', ['--prefix', 'functions', 'run', 'build'], 'required'],
  ['diff check', 'git', ['diff', '--check'], 'required'],
  ['client audit', 'npm', ['audit', '--omit=dev'], 'audit'],
  ['functions audit', 'npm', ['audit', '--prefix', 'functions', '--audit-level=high'], 'audit'],
]

const PRODUCTION_GATES = [
  { label: 'Dominio', status: 'BLOCKED', reason: 'Dominio no adquirido.' },
  { label: 'Resend/DNS', status: 'BLOCKED', reason: 'Resend/DNS no configurado.' },
  {
    label: 'Secret Manager',
    status: 'BLOCKED',
    reason: 'RESEND_API_KEY/Secret Manager no configurado.',
  },
  {
    label: 'Billing/Blaze y budget',
    status: 'BLOCKED',
    reason: 'Billing/Blaze y budget no configurados.',
  },
  { label: 'QA de navegador', status: 'BLOCKED', reason: 'QA de navegador incompleto.' },
  { label: 'Rollback', status: 'BLOCKED', reason: 'Autorización de rollback pendiente.' },
  {
    label: 'Despliegue de producción',
    status: 'BLOCKED',
    reason: 'Despliegue de producción no autorizado.',
  },
]

const MAX_RENDERED_LINE_LENGTH = 4000
const WINDOWS_COMMAND_TOKEN = /^[A-Za-z0-9._:/=+@-]+$/
const SECRET_ENV_NAME = /(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|CREDENTIAL|AUTH)/i
const SECRET_ASSIGNMENT = /(\b[\w-]*(?:API[-_]?KEY|SECRET(?:[-_]?KEY)?|TOKEN|PASSWORD|PASSWD|PRIVATE[-_]?KEY|AUTHORIZATION|CREDENTIALS?|ACCESS[-_]?TOKEN)\b\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;]+)/gi
const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi
const PEM_BLOCK = /-----BEGIN [^-\r\n]+-----[\s\S]*?-----END [^-\r\n]+-----/gi
const KNOWN_KEY_PREFIX = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{10,}\b|\bAIza[0-9A-Za-z_-]{20,}\b|\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]+\b|\bre_[A-Za-z0-9_-]{16,}\b|\bxox[baprs]-[A-Za-z0-9-]+\b/gi

function resolveExecutable(executable, platform) {
  if (platform !== 'win32') return executable
  if (executable === 'npm' || executable === 'npx') return `${executable}.cmd`
  if (executable === 'git') return 'git.exe'
  return executable
}

function createChecks(platform) {
  return COMMANDS.map(([label, executable, args, kind]) => ({
    label,
    executable: resolveExecutable(executable, platform),
    args: [...args],
    kind,
  }))
}

function validateWindowsCommandToken(token) {
  if (!WINDOWS_COMMAND_TOKEN.test(token)) {
    throw new Error('Comando Windows fuera de la matriz fija.')
  }
  return token
}

export function createCommandInvocation(check, platform) {
  if (platform !== 'win32' || !['npm.cmd', 'npx.cmd'].includes(check.executable)) {
    return { executable: check.executable, args: check.args }
  }

  const commandLine = [check.executable, ...check.args]
    .map(validateWindowsCommandToken)
    .join(' ')
  return {
    executable: 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
  }
}

const REQUIRED_CHECKS = Object.freeze(
  createChecks(process.platform)
    .filter((check) => check.kind === 'required')
    .map((check) => Object.freeze(check)),
)

const AUDIT_CHECKS = Object.freeze(
  createChecks(process.platform)
    .filter((check) => check.kind === 'audit')
    .map((check) => Object.freeze(check)),
)

export { AUDIT_CHECKS, REQUIRED_CHECKS }

export function classifyAuditExit(exitCode) {
  return exitCode === 0 ? 'PASS' : 'WARN'
}

function collectOutput(output) {
  if (output === undefined || output === null) return ''
  return String(output)
}

function sanitizeCapturedOutput(value, environments = [process.env]) {
  let redacted = collectOutput(value)
    .replace(PEM_BLOCK, '[REDACTED PEM BLOCK]')
    .replace(BEARER_TOKEN, 'Bearer [REDACTED]')
    .replace(KNOWN_KEY_PREFIX, '[REDACTED KEY]')
    .replace(SECRET_ASSIGNMENT, '$1[REDACTED]')
  const values = new Set()

  for (const environment of environments) {
    for (const [environmentName, environmentValue] of Object.entries(environment ?? {})) {
      if (
        SECRET_ENV_NAME.test(environmentName) &&
        typeof environmentValue === 'string' &&
        environmentValue.length >= 8
      ) {
        values.add(environmentValue)
      }
    }
  }

  for (const environmentValue of [...values].sort((left, right) => right.length - left.length)) {
    redacted = redacted.split(environmentValue).join('[REDACTED]')
  }

  return redacted
}

function normalizeCommandResult(commandResult, environments) {
  const result = commandResult ?? {}
  return {
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : null,
    stdout: sanitizeCapturedOutput(result.stdout, environments),
    stderr: sanitizeCapturedOutput(result.stderr, environments),
  }
}

function executeCommand(executable, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
    child.once('error', reject)
    child.once('close', (exitCode) => resolve({ exitCode, stdout, stderr }))
  })
}

function commandOptions(cwd) {
  return { cwd, shell: false }
}

async function readCommit({ runCommand, cwd, platform, env }) {
  const check = {
    label: 'git rev-parse HEAD',
    executable: resolveExecutable('git', platform),
    args: ['rev-parse', 'HEAD'],
    kind: 'required',
  }
  let result
  try {
    result = await runCommand(check.executable, check.args, commandOptions(cwd))
  } catch (error) {
    result = {
      exitCode: null,
      stdout: '',
      stderr: error instanceof Error ? error.message : String(error),
    }
  }

  const normalized = normalizeCommandResult(result, [process.env, env])
  if (normalized.exitCode !== 0 || !normalized.stdout.trim()) {
    return {
      commit: 'unknown',
      check: { ...check, ...normalized, status: 'BLOCKED' },
    }
  }
  return { commit: normalized.stdout.trim(), check: null }
}

function skippedCheck(check) {
  return {
    ...check,
    exitCode: null,
    status: 'SKIPPED',
    stdout: '',
    stderr: 'Omitido después de un fallo requerido.',
  }
}

export async function runReleasePreflight({
  runCommand = executeCommand,
  cwd = process.cwd(),
  platform = process.platform,
  commit,
  generatedAt = new Date().toISOString(),
  env = process.env,
} = {}) {
  const checksToRun = createChecks(platform)
  const commitResult = commit === undefined
    ? await readCommit({ runCommand, cwd, platform, env })
    : { commit, check: null }
  if (commitResult.check) {
    return {
      commit: 'unknown',
      generatedAt,
      checks: [commitResult.check],
      overall: 'BLOCKED',
      productionGates: PRODUCTION_GATES.map((gate) => ({ ...gate })),
    }
  }

  const currentCommit = commitResult.commit
  const checks = []
  let requiredFailure = false

  for (const check of checksToRun) {
    if (requiredFailure && check.kind === 'required') {
      checks.push(skippedCheck(check))
      continue
    }

    let commandResult
    const invocation = createCommandInvocation(check, platform)
    try {
      commandResult = await runCommand(
        invocation.executable,
        invocation.args,
        commandOptions(cwd),
      )
    } catch (error) {
      commandResult = {
        exitCode: null,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
      }
    }

    const normalized = normalizeCommandResult(commandResult, [process.env, env])
    const status = check.kind === 'audit'
      ? classifyAuditExit(normalized.exitCode)
      : normalized.exitCode === 0
        ? 'PASS'
        : 'BLOCKED'

    if (check.kind === 'required' && status === 'BLOCKED') {
      requiredFailure = true
    }

    checks.push({ ...check, ...normalized, status })
  }

  return {
    commit: currentCommit,
    generatedAt,
    checks,
    overall: requiredFailure ? 'BLOCKED' : 'PASS_WITH_WARNINGS',
    productionGates: PRODUCTION_GATES.map((gate) => ({ ...gate })),
  }
}

function escapeCell(value) {
  return collectOutput(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('|', '\\|')
    .replaceAll('\r', '')
    .replaceAll('\n', '<br>')
}

function truncateLine(line) {
  if (line.length <= MAX_RENDERED_LINE_LENGTH) return line
  return `${line.slice(0, MAX_RENDERED_LINE_LENGTH)}… [truncated]`
}

function renderOutput(output) {
  const lines = sanitizeCapturedOutput(output).split(/\r?\n/).map(truncateLine)
  return lines.length === 1 && lines[0] === '' ? '(sin salida)' : lines.join('\n')
}

export function renderPreflightReport(result) {
  const lines = [
    '# Release Preflight',
    `Fecha: ${escapeCell(result.generatedAt ?? '')}`,
    `Commit: ${escapeCell(result.commit)}`,
    `Resultado local: ${escapeCell(result.overall)}`,
    '',
    '## Checks locales',
    '| Check | Tipo | Exit code | Resultado |',
    '| --- | --- | ---: | --- |',
  ]

  for (const check of result.checks) {
    lines.push(
      `| ${escapeCell(check.label)} | ${check.kind === 'audit' ? 'auditoría' : 'requerido'} | ${escapeCell(check.exitCode ?? 'N/A')} | ${escapeCell(check.status)} |`,
    )
  }

  lines.push('', '## Gates de producción', '| Gate | Estado | Motivo |', '| --- | --- | --- |')
  for (const gate of result.productionGates) {
    lines.push(`| ${escapeCell(gate.label)} | ${escapeCell(gate.status)} | ${escapeCell(gate.reason)} |`)
  }

  lines.push('', '## Auditoría')
  for (const check of result.checks.filter((item) => item.kind === 'audit')) {
    lines.push(
      `### ${escapeCell(check.label)}: ${escapeCell(check.status)} (exit code ${escapeCell(check.exitCode ?? 'N/A')})`,
      'stdout:',
      renderOutput(check.stdout),
      'stderr:',
      renderOutput(check.stderr),
    )
  }

  const failedRequiredChecks = result.checks.filter(
    (check) => check.kind === 'required' && check.status === 'BLOCKED' && (check.stdout || check.stderr),
  )
  if (failedRequiredChecks.length > 0) {
    lines.push('', '## Fallos de preflight')
    for (const check of failedRequiredChecks) {
      lines.push(`### ${escapeCell(check.label)}`, renderOutput(check.stderr || check.stdout))
    }
  }

  lines.push(
    '',
    '## Restricciones',
    'No se activó Billing/Blaze, no se configuró Resend, no se leyeron secretos y no se ejecutó deploy (no production actions).',
  )
  return `${lines.join('\n')}\n`
}

async function writePreflightReport(reportPath, report) {
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, report, 'utf8')
}

export async function runReleasePreflightCli({
  cwd = process.cwd(),
  runPreflight = runReleasePreflight,
  writeReport = writePreflightReport,
  print = console.log,
} = {}) {
  const repositoryRoot = resolve(cwd)
  const reportPath = resolve(repositoryRoot, 'docs', 'release-preflight.md')
  const reportRelativePath = relative(repositoryRoot, reportPath)
  if (isAbsolute(reportRelativePath) || reportRelativePath.startsWith('..')) {
    throw new Error('La ruta del reporte debe permanecer dentro del repositorio.')
  }

  const result = await runPreflight({ cwd: repositoryRoot })
  const report = renderPreflightReport(result)

  print(`Release preflight: ${result.overall}`)
  await writeReport(reportPath, report)
  return result
}

if (resolve(process.argv[1] ?? '') === resolve(fileURLToPath(import.meta.url))) {
  try {
    const result = await runReleasePreflightCli()
    process.exitCode = result.overall === 'BLOCKED' ? 1 : 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
