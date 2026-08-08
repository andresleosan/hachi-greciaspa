import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

import {
  AUDIT_CHECKS,
  REQUIRED_CHECKS,
  classifyAuditExit,
  createCommandInvocation,
  renderPreflightReport,
  runReleasePreflight,
  runReleasePreflightCli,
} from './release-preflight.mjs'

const timestamp = '2026-08-04T12:00:00.000Z'

const productionGates = [
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

const passingChecks = [...REQUIRED_CHECKS, ...AUDIT_CHECKS].map((check) => ({
  ...check,
  exitCode: 0,
  status: 'PASS',
  stdout: check.kind === 'audit' ? `${check.label} output` : '',
  stderr: '',
}))

const resultWithLocalPassesAndPendingGates = {
  commit: 'abc1234',
  generatedAt: timestamp,
  checks: passingChecks,
  overall: 'PASS_WITH_WARNINGS',
  productionGates,
}

describe('release preflight classification', () => {
  it('classifies a successful audit as PASS and a failed audit as WARN', () => {
    expect(classifyAuditExit(0)).toBe('PASS')
    expect(classifyAuditExit(1)).toBe('WARN')
    expect(classifyAuditExit(null)).toBe('WARN')
  })

  it('renders a warning report with all checks and pending production gates', () => {
    const report = renderPreflightReport(resultWithLocalPassesAndPendingGates)

    expect(report).toContain('# Release Preflight')
    expect(report).toContain(`Fecha: ${timestamp}`)
    expect(report).toContain('Commit: abc1234')
    expect(report).toContain('Resultado local: PASS_WITH_WARNINGS')
    for (const check of [...REQUIRED_CHECKS, ...AUDIT_CHECKS]) {
      expect(report).toContain(check.label)
    }
    for (const gate of productionGates) {
      expect(report).toContain(gate.label)
      expect(report).toContain(gate.reason)
      expect(report).toContain(gate.status)
    }
    expect(report).toContain('## Auditoría')
    expect(report).toContain('client audit output')
    expect(report).toContain('functions audit output')
    expect(report).toContain('No se activó Billing/Blaze')
  })

  it('renders a blocked report when a required check fails', () => {
    const report = renderPreflightReport({
      ...resultWithLocalPassesAndPendingGates,
      overall: 'BLOCKED',
      checks: passingChecks.map((check, index) =>
        index === 1
          ? { ...check, exitCode: 1, status: 'BLOCKED', stderr: 'rules failed' }
          : check,
      ),
    })

    expect(report).toContain('Resultado local: BLOCKED')
  })
})

describe('release preflight runner', () => {
  it('executes the generated Windows npm shim command with exit code 0', async () => {
    if (process.platform !== 'win32') return

    const invocation = createCommandInvocation(
      { executable: 'npm.cmd', args: ['--version'] },
      'win32',
    )
    const result = await new Promise((resolve, reject) => {
      const child = spawn(invocation.executable, invocation.args, { shell: false })
      let stderr = ''
      child.stderr.on('data', (chunk) => {
        stderr += chunk
      })
      child.once('error', reject)
      child.once('close', (exitCode) => resolve({ exitCode, stderr }))
    })

    expect(invocation).toEqual({
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd --version'],
    })
    expect(result).toMatchObject({ exitCode: 0 })
    expect(result.stderr).toBe('')
  })

  it('uses the exact command matrix and Windows-safe executables', async () => {
    const calls = []
    const result = await runReleasePreflight({
      platform: 'win32',
      cwd: 'C:/repo',
      commit: 'windows-commit',
      runCommand: async (executable, args, options) => {
        calls.push({ executable, args, options })
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
    })

    expect(result.commit).toBe('windows-commit')
    expect(calls.map(({ executable, args }) => [executable, ...args])).toEqual([
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd run test:client'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd test'],
      ['cmd.exe', '/d', '/s', '/c', 'npx.cmd tsc --noEmit'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd run build'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd --prefix functions run typecheck'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd --prefix functions run build'],
      ['git.exe', 'diff', '--check'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd audit --omit=dev'],
      ['cmd.exe', '/d', '/s', '/c', 'npm.cmd audit --prefix functions --audit-level=high'],
    ])
    expect(calls.every(({ options }) => options.cwd === 'C:/repo' && options.shell === false)).toBe(true)
    expect(calls.every(({ args }) => !args.some((arg) => arg.includes('C:/repo')))).toBe(true)
    expect(calls[0].args[3]).toBe('npm.cmd run test:client')
    expect(result.checks.every((check) => check.exitCode === 0)).toBe(true)
    expect(result.overall).toBe('PASS_WITH_WARNINGS')
  })

  it('reads a missing commit through git rev-parse HEAD', async () => {
    const calls = []
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      runCommand: async (executable, args, options) => {
        calls.push({ executable, args, options })
        if (args.join(' ') === 'rev-parse HEAD') {
          return { exitCode: 0, stdout: 'abcdeff\n', stderr: '' }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
    })

    expect(calls[0]).toMatchObject({ executable: 'git', args: ['rev-parse', 'HEAD'] })
    expect(result.commit).toBe('abcdeff')
  })

  it('blocks on a required failure and still runs every audit check', async () => {
    const calls = []
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      commit: 'failed-commit',
      runCommand: async (executable, args) => {
        calls.push({ executable, args })
        if (args.join(' ') === 'run test:client') {
          return { exitCode: 1, stdout: 'failure', stderr: 'required failed' }
        }
        return { exitCode: 0, stdout: 'ok', stderr: '' }
      },
      generatedAt: timestamp,
    })

    expect(result.overall).toBe('BLOCKED')
    expect(result.checks.find((check) => check.label === 'client tests')).toMatchObject({
      status: 'BLOCKED',
      exitCode: 1,
    })
    expect(result.checks.find((check) => check.label === 'full rules/functions tests')).toMatchObject({
      status: 'SKIPPED',
      exitCode: null,
    })
    expect(result.checks.filter((check) => check.kind === 'audit')).toHaveLength(AUDIT_CHECKS.length)
    expect(calls.map(({ args }) => args.join(' '))).toEqual([
      'run test:client',
      'audit --omit=dev',
      'audit --prefix functions --audit-level=high',
    ])
  })

  it('continues after audit failures and captures sanitized audit output', async () => {
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      commit: 'audit-commit',
      runCommand: async (executable, args) => {
        if (args[0] === 'audit' && args.includes('--omit=dev')) {
          return { exitCode: 1, stdout: 'audit result do-not-print', stderr: 'audit warning' }
        }
        if (args[0] === 'audit') {
          return { exitCode: 2, stdout: 'function audit result', stderr: 'function audit error do-not-print' }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
      env: { TEST_SECRET: 'do-not-print' },
    })

    expect(result.overall).toBe('PASS_WITH_WARNINGS')
    expect(result.checks.filter((check) => check.status === 'WARN')).toHaveLength(AUDIT_CHECKS.length)
    const report = renderPreflightReport(result)
    expect(report).toContain('audit result')
    expect(report).toContain('audit warning')
    expect(report).not.toContain('do-not-print')
  })

  it('redacts secret-shaped audit output even when values are not environment variables', async () => {
    const secrets = [
      'API_KEY="secret-value-not-in-env"',
      'Authorization: Bearer bearer-value-not-in-env',
      '-----BEGIN PRIVATE KEY-----\nprivate-value-not-in-env\n-----END PRIVATE KEY-----',
      'sk_live_key-value-not-in-env',
    ].join('\n')
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      commit: 'secret-commit',
      runCommand: async (executable, args) => {
        if (args[0] === 'audit') {
          return { exitCode: 1, stdout: secrets, stderr: secrets }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
    })

    const report = renderPreflightReport({
      ...result,
      checks: result.checks.map((check) =>
        check.kind === 'audit' ? { ...check, stdout: secrets, stderr: secrets } : check,
      ),
    })
    for (const secret of [
      'secret-value-not-in-env',
      'bearer-value-not-in-env',
      'private-value-not-in-env',
      'sk_live_key-value-not-in-env',
    ]) {
      expect(report).not.toContain(secret)
    }
    expect(report).toContain('[REDACTED]')
  })

  it('does not redact common short environment values', async () => {
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      commit: 'short-env-commit',
      env: { NODE_ENV: 'test' },
      runCommand: async (executable, args) => {
        if (args[0] === 'audit') {
          return { exitCode: 1, stdout: 'mode=test', stderr: '' }
        }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
    })

    expect(renderPreflightReport(result)).toContain('mode=test')
  })

  it('returns a blocked result when commit lookup fails', async () => {
    const calls = []
    const result = await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo',
      runCommand: async (executable, args, options) => {
        calls.push({ executable, args, options })
        return { exitCode: 128, stdout: '', stderr: 'fatal: not a git repository' }
      },
      generatedAt: timestamp,
    })

    expect(result.commit).toBe('unknown')
    expect(result.overall).toBe('BLOCKED')
    expect(result.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'git rev-parse HEAD',
        status: 'BLOCKED',
        exitCode: 128,
        stderr: 'fatal: not a git repository',
      }),
    ]))
    expect(result.productionGates.every((gate) => gate.status === 'BLOCKED')).toBe(true)
    expect(renderPreflightReport(result)).toContain('fatal: not a git repository')
    expect(calls).toHaveLength(1)
  })

  it('does not interpolate command strings or enable a shell', async () => {
    const calls = []
    await runReleasePreflight({
      platform: 'linux',
      cwd: '/repo with spaces',
      commit: 'safe-commit',
      runCommand: async (executable, args, options) => {
        calls.push({ executable, args, options })
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      generatedAt: timestamp,
    })

    expect(calls.every(({ executable, args, options }) =>
      typeof executable === 'string' && Array.isArray(args) && options.shell === false)).toBe(true)
    expect(calls.every(({ options }) => !('command' in options))).toBe(true)
  })

  it('writes one safe report after the matrix and preserves audit warnings', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'release-preflight-'))
    const calls = []
    const printed = []
    const writes = []

    try {
      await writeFile(join(cwd, '.env'), 'RELEASE_PREFLIGHT_SECRET=do-not-read')

      const result = await runReleasePreflightCli({
        cwd,
        print: (summary) => printed.push(summary),
        writeReport: async (reportPath, report) => writes.push({ reportPath, report }),
        runPreflight: (options) => runReleasePreflight({
          ...options,
          platform: 'linux',
          commit: 'cli-commit',
          generatedAt: timestamp,
          runCommand: async (executable, args, options) => {
            calls.push({ executable, args, options })
            if (args[0] === 'audit') {
              return { exitCode: 1, stdout: 'audit warning', stderr: '' }
            }
            return { exitCode: 0, stdout: '', stderr: '' }
          },
        }),
      })

      expect(result.overall).toBe('PASS_WITH_WARNINGS')
      expect(printed).toEqual(['Release preflight: PASS_WITH_WARNINGS'])
      expect(writes).toHaveLength(1)
      expect(resolve(writes[0].reportPath)).toBe(resolve(cwd, 'docs', 'release-preflight.md'))
      expect(writes[0].report).toContain('client audit: WARN (exit code 1)')
      expect(writes[0].report).not.toContain('do-not-read')
      expect(calls.map(({ executable, args }) => [executable, ...args].join(' '))).not.toContain(
        'firebase deploy',
      )
      expect(calls.every(({ options }) => options.cwd === cwd && options.shell === false)).toBe(true)
    } finally {
      await rm(cwd, { recursive: true, force: true })
    }
  })
})
