import assert from 'node:assert/strict'
import test from 'node:test'

import { buildQaCredentials, buildQaDates } from './seed.mjs'

test('buildQaCredentials creates ephemeral example.test credentials', () => {
  const credentials = buildQaCredentials('run-abc')

  assert.match(credentials.adminEmail, /^qa-admin-[a-z0-9-]+@example\.test$/)
  assert.match(credentials.clientEmail, /^qa-client-[a-z0-9-]+@example\.test$/)
  assert.ok(credentials.adminPassword.length >= 6)
  assert.ok(credentials.clientPassword.length >= 6)
  assert.deepEqual(Object.keys(credentials).sort(), [
    'adminEmail',
    'adminPassword',
    'clientEmail',
    'clientPassword',
  ])
})

test('buildQaDates returns future ISO dates inside the booking window', () => {
  const base = new Date('2026-08-06T12:00:00')
  const dates = buildQaDates(base)

  for (const value of Object.values(dates)) {
    assert.match(value, /^2026-08-\d{2}$/)
    assert.ok(new Date(`${value}T23:59:59`).getTime() > base.getTime())
    assert.ok(new Date(`${value}T00:00:00`).getTime() <= base.getTime() + 14 * 24 * 60 * 60 * 1000)
  }

  assert.equal(dates.unassignedDate, dates.agendaDate)
})
