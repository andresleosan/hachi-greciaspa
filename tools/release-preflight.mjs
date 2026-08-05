import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const WINDOWS = process.platform === 'win32'
const NPM = WINDOWS ? 'npm.cmd' : 'npm'
const GIT = WINDOWS ? 'git.exe' : 'git'

export const REQUIRED_CHECKS = Object.freeze([
  { label: 'client tests', executable: NPM, args: ['run', 'test:client'], kind: 'required' },
  { label: 'full rules/functions tests', executable: NPM, args: ['test'], kind: 'required' },
  { label: 'client typecheck', executable: NPM, args: ['exec', '--', 'tsc', '--noEmit'], kind: 'required' },
  { label: 'client build', executable: NPM, args: ['run', 'build'], kind: 'required' },
  { label: 'functions typecheck', executable: NPM, args: ['--prefix', 'functions', 'run', 'typecheck'], kind: 'required' },
  { label: 'functions build', executable: NPM, args: ['--prefix', 'functions', 'run', 'build'], kind: 'required' },
  { label: 'diff check', executable: GIT, args: ['diff', '--check'], kind: 'required' },
])

export const AUDIT_CHECKS = Object.freeze([
  { label: 'client audit', executable: NPM, args: ['audit', '--omit=dev'], kind: 'audit' },
  { label: 'functions audit', executable: NPM, args: ['audit', '--prefix', 'functions', '--audit-level=high'], kind: 'audit' },
])

export const PRODUCTION_GATES = Object.freeze([
  { label: 'Dominio propio', reason: 'Dominio no adquirido ni verificado.' },
  { label: 'Resend y DNS', reason: 'Resend y SPF/DKIM/DMARC no configurados.' },
  { label: 'Secret Manager', reason: 'RESEND_API_KEY no configurada en Secret Manager.' },
  { label: 'Billing y budget', reason: 'Billing/Blaze y budget de $10/mes no verificados.' },
  { label: 'browser QA', reason: 'QA de navegador completo pendiente.' },
  { label: 'rollback', reason: 'Procedimiento de rollback pendiente de revision operativa.' },
  { label: 'autorizacion', reason: 'Autorizacion explicita de produccion pendiente.' },
  { label: 'deploy', reason: 'Deploy de produccion no autorizado.' },
])

const MAX_CAPTURED_OUTPUT = 24000

function capture(value) {
  return String(value ?? '').slice(0, MAX_CAPTURED_OUTPUT)
}

function executeCommand(executable, args, { cwd }) {
  return new Promise((resolve) => {
    const command = getSpawnCommand(executable, args)
    const child = spawn(command.executable, command.args, getSpawnOptions(command.executable, { cwd }))
    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout = capture(stdout + chunk.toString())
    })
    child.stderr?.on('data', (chunk) => {
      stderr = capture(stderr + chunk.toString())
    })
    child.on('error', (error) => {
      resolve({ exitCode: 1, stdout, stderr: capture(`${stderr}${error.message}`) })
    })
    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr })
    })
  })
}

export function getSpawnCommand(executable, args) {
  if (WINDOWS && executable.toLowerCase().endsWith('.cmd')) {
    return {
      executable: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', executable, ...args],
    }
  }
  return { executable, args }
}

export function getSpawnOptions(executable, { cwd } = {}) {
  return {
    cwd,
    shell: false,
    windowsHide: true,
  }
}

export function classifyAuditExit(exitCode) {
  return exitCode === 0 ? 'PASS' : 'WARN'
}

function fixedGates() {
  return PRODUCTION_GATES.map((gate) => ({ ...gate, status: 'BLOCKED' }))
}

export async function runReleasePreflight({
  runCommand = executeCommand,
  cwd = process.cwd(),
  commit,
  commandMatrix,
  generatedAt = new Date().toISOString(),
} = {}) {
  let resolvedCommit = commit
  if (!resolvedCommit) {
    const commitResult = await runCommand(GIT, ['rev-parse', 'HEAD'], { cwd })
    resolvedCommit = commitResult.stdout.trim() || 'unknown'
  }

  const checks = []
  let requiredFailure = false
  const matrix = commandMatrix ?? [...REQUIRED_CHECKS, ...AUDIT_CHECKS]

  for (const check of matrix) {
    if (requiredFailure && check.kind === 'required') {
      checks.push({ ...check, exitCode: null, status: 'SKIPPED', stdout: '', stderr: 'Skipped after required failure.' })
      continue
    }

    const result = await runCommand(check.executable, check.args, { cwd })
    const exitCode = Number.isInteger(result.exitCode) ? result.exitCode : 1
    const status = check.kind === 'audit' ? classifyAuditExit(exitCode) : exitCode === 0 ? 'PASS' : 'BLOCKED'
    if (check.kind === 'required' && status === 'BLOCKED') requiredFailure = true
    checks.push({
      ...check,
      exitCode,
      status,
      stdout: capture(result.stdout),
      stderr: capture(result.stderr),
    })
  }

  return {
    commit: resolvedCommit,
    generatedAt,
    checks,
    overall: requiredFailure ? 'BLOCKED' : 'PASS_WITH_WARNINGS',
    productionGates: fixedGates(),
  }
}

function markdownCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r', '')
    .replaceAll('\n', '<br>')
}

function outputFor(check) {
  const output = [check.stdout, check.stderr].filter(Boolean).join('\n')
  return output || '-'
}

export function renderPreflightReport(result) {
  const gates = result.productionGates?.length ? result.productionGates : fixedGates()
  const audits = result.checks.filter((check) => check.kind === 'audit')
  const checks = result.checks
    .map((check) => `| ${markdownCell(check.label)} | ${check.kind} | ${check.exitCode ?? '-'} | ${check.status} |`)
    .join('\n')
  const gateRows = gates
    .map((gate) => `| ${markdownCell(gate.label)} | ${gate.status} | ${markdownCell(gate.reason)} |`)
    .join('\n')
  const auditOutput = audits.length
    ? audits.map((check) => `### ${check.label}\n\n\`\`\`text\n${outputFor(check)}\n\`\`\``).join('\n\n')
    : 'No se ejecutaron auditorias.'

  return `# Release Preflight

Fecha: ${result.generatedAt ?? new Date().toISOString()}
Commit: ${result.commit}
Resultado local: ${result.overall}

## Checks locales
| Check | Tipo | Exit code | Resultado |
|---|---|---:|---|
${checks}

## Gates de produccion
| Gate | Estado | Motivo |
|---|---|---|
${gateRows}

## Auditoria
${auditOutput}

## Restricciones
No se activo Billing/Blaze, no se configuro Resend, no se leyeron secretos y no se ejecuto deploy. Este resultado local no es autorizacion de produccion; no production deployment was performed.
`
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
}

async function main() {
  const cwd = process.cwd()
  const result = await runReleasePreflight({ cwd })
  const reportPath = path.resolve(cwd, 'docs', 'release-preflight.md')
  const rootPrefix = `${path.resolve(cwd)}${path.sep}`
  if (!reportPath.startsWith(rootPrefix)) throw new Error('Report path escaped repository root.')
  await mkdir(path.dirname(reportPath), { recursive: true })
  const report = renderPreflightReport(result)
  await writeFile(reportPath, report, 'utf8')
  console.log(report)
  process.exitCode = result.overall === 'BLOCKED' ? 1 : 0
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(`Release preflight failed: ${error.message}`)
    process.exitCode = 1
  })
}
