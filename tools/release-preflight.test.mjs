import { describe, expect, it } from 'vitest'
import {
  AUDIT_CHECKS,
  REQUIRED_CHECKS,
  classifyAuditExit,
  getSpawnCommand,
  getSpawnOptions,
  renderPreflightReport,
  runReleasePreflight,
} from './release-preflight.mjs'

const localPassResult = {
  commit: 'abc1234',
  generatedAt: '2026-08-05T18:00:00.000Z',
  overall: 'PASS_WITH_WARNINGS',
  checks: [
    ...REQUIRED_CHECKS.map((check) => ({ ...check, exitCode: 0, status: 'PASS', stdout: '', stderr: '' })),
    ...AUDIT_CHECKS.map((check) => ({ ...check, exitCode: 1, status: 'WARN', stdout: 'advisory', stderr: '' })),
  ],
  productionGates: [],
}

describe('release preflight', () => {
  it('classifies a clean audit as PASS and an advisory as WARN', () => {
    expect(classifyAuditExit(0)).toBe('PASS')
    expect(classifyAuditExit(1)).toBe('WARN')
  })

  it('renders local evidence and every blocked production gate', () => {
    const report = renderPreflightReport(localPassResult)

    expect(report).toContain('PASS_WITH_WARNINGS')
    expect(report).toContain('abc1234')
    expect(report).toContain('client tests')
    expect(report).toContain('full rules/functions tests')
    expect(report).toContain('client audit')
    expect(report).toContain('functions audit')
    expect(report).toContain('Dominio propio')
    expect(report).toContain('Resend')
    expect(report).toContain('Secret Manager')
    expect(report).toContain('Billing')
    expect(report).toContain('budget')
    expect(report).toContain('browser QA')
    expect(report).toContain('rollback')
    expect(report).toContain('deploy')
    expect(report).toContain('no production')
    expect(report).not.toContain('firebase deploy')
  })

  it('does not claim that external billing changes happened during preflight', () => {
    const report = renderPreflightReport(localPassResult)

    expect(report).toContain('La evidencia externa no es evaluada por este comando')
    expect(report).toContain('No se ejecutaron acciones externas durante este preflight')
    expect(report).not.toMatch(/Billing\/Blaze.{0,30}(activ|desactiv|configur)/i)
  })

  it('keeps the functions audit sensitive to moderate advisories', () => {
    expect(AUDIT_CHECKS.find((check) => check.label === 'functions audit')?.args).toEqual([
      'audit',
      '--prefix',
      'functions',
    ])
  })

  it('blocks after a required failure but still runs audits as warnings', async () => {
    const calls = []
    const result = await runReleasePreflight({
      cwd: 'F:/repo',
      commit: 'abc1234',
      runCommand: async (executable, args) => {
        calls.push([executable, args])
        const label = args.join(' ')
        if (label === 'run test:client') return { exitCode: 1, stdout: '', stderr: 'test failed' }
        if (label.startsWith('audit')) return { exitCode: 1, stdout: 'advisory', stderr: '' }
        return { exitCode: 0, stdout: '', stderr: '' }
      },
      commandMatrix: [
        { label: 'client tests', executable: 'npm', args: ['run', 'test:client'], kind: 'required' },
        { label: 'later required', executable: 'npm', args: ['run', 'later'], kind: 'required' },
        { label: 'client audit', executable: 'npm', args: ['audit'], kind: 'audit' },
      ],
    })

    expect(result.overall).toBe('BLOCKED')
    expect(result.checks.find((check) => check.label === 'client tests').status).toBe('BLOCKED')
    expect(result.checks.find((check) => check.label === 'later required').status).toBe('SKIPPED')
    expect(result.checks.find((check) => check.label === 'client audit').status).toBe('WARN')
    expect(calls.map(([, args]) => args.join(' '))).toEqual(['run test:client', 'audit'])
  })

  it('wraps npm.cmd with cmd.exe without enabling shell interpolation', () => {
    if (process.platform !== 'win32') return
    const command = getSpawnCommand('npm.cmd', ['--version'])
    expect(command.executable.toLowerCase()).toBe((process.env.ComSpec ?? 'cmd.exe').toLowerCase())
    expect(command.args).toEqual(['/d', '/s', '/c', 'npm.cmd', '--version'])
    expect(getSpawnOptions('npm.cmd').shell).toBe(false)
    expect(getSpawnOptions('git.exe').shell).toBe(false)
  })
})
