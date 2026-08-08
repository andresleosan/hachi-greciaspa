import { afterAll, describe, expect, it } from 'vitest'
import { cert, deleteApp, initializeApp, type Credential } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { generateKeyPairSync } from 'node:crypto'
import { isIPv4, isIPv6 } from 'node:net'

import {
  createFirestoreReminderStore,
  runReminderOrchestration,
} from './scheduledSendReminders.js'
import { reminderDocId } from './reminders.js'
import type { EmailProvider, ReminderEmailInput, ReservationForReminder } from './types.js'

function isIPv6Loopback(host: string): boolean {
  if (!isIPv6(host)) return false

  const [left, right] = host.toLowerCase().split('::')
  const leftGroups = left ? left.split(':') : []
  const rightGroups = right ? right.split(':') : []
  const omittedGroups = 8 - leftGroups.length - rightGroups.length
  if (omittedGroups < 0 || (host.includes('::') && omittedGroups === 0)) return false

  const groups = [
    ...leftGroups,
    ...Array.from({ length: omittedGroups }, () => '0'),
    ...rightGroups,
  ]
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return false
  }

  const values = groups.map((group) => Number.parseInt(group, 16))
  return values.slice(0, 7).every((value) => value === 0) && values[7] === 1
}

function isLocalEmulatorHost(value: string | undefined): boolean {
  if (typeof value !== 'string') return false

  const match = /^\[([^\]]+)\]:(\d+)$/.exec(value) ?? /^([^:]+):(\d+)$/.exec(value)
  if (!match) return false

  const port = Number(match[2])
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false

  const host = match[1].toLowerCase()
  if (host === 'localhost') return true
  if (isIPv4(host)) return host.split('.')[0] === '127'
  return isIPv6Loopback(host)
}

describe('Firestore emulator host validation', () => {
  it('accepts only local hosts with an explicit valid port', () => {
    expect(isLocalEmulatorHost('localhost:8080')).toBe(true)
    expect(isLocalEmulatorHost('127.0.0.1:8080')).toBe(true)
    expect(isLocalEmulatorHost('[::1]:8080')).toBe(true)
    expect(isLocalEmulatorHost('firestore.example.com:8080')).toBe(false)
    expect(isLocalEmulatorHost('203.0.113.10:8080')).toBe(false)
    expect(isLocalEmulatorHost('localhost')).toBe(false)
    expect(isLocalEmulatorHost('[2001:db8::1]:8080')).toBe(false)
  })

  it('uses a network-free in-memory certificate credential', () => {
    expect(testServiceAccount.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/)
    expect(typeof testCredential.getAccessToken).toBe('function')
  })

  it('asserts the encoded reminder ID independently of the helper implementation', () => {
    expect(reminderDocId('task-8 success')).toBe('reminder-task-8%20success')
  })
})

const NOW = new Date('2026-08-03T16:00:00.000Z')
const PROJECT_ID = 'demo-hachi-greciaspa-task-8'
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const testServiceAccount = {
  projectId: PROJECT_ID,
  clientEmail: 'task-8-emulator@invalid.test',
  privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
}
const testCredential: Credential = cert(testServiceAccount)
const emulatorEnabled = isLocalEmulatorHost(process.env.FIRESTORE_EMULATOR_HOST)
const testApp = emulatorEnabled
  ? initializeApp(
      { credential: testCredential, projectId: PROJECT_ID },
      'task-8-emulator',
    )
  : null
const db = testApp ? getFirestore(testApp) : null

function getTestDb(): Firestore {
  if (!db) throw new Error('Firestore emulator is not enabled for this test run')
  return db
}

class RecordingProvider implements EmailProvider {
  readonly calls: ReminderEmailInput[] = []

  constructor(
    private failuresRemaining: number | 'always' = 0,
    private readonly retryable = true,
  ) {}

  async sendReminderEmail(input: ReminderEmailInput) {
    this.calls.push(input)
    if (this.failuresRemaining === 'always' || this.failuresRemaining > 0) {
      if (this.failuresRemaining !== 'always') this.failuresRemaining -= 1
      throw Object.assign(new Error('controlled provider failure'), {
        retryable: this.retryable,
      })
    }
    return { providerMessageId: `fake-${this.calls.length}` }
  }
}

function reservation(
  id: string,
  overrides: Partial<ReservationForReminder> = {},
): ReservationForReminder {
  return {
    id,
    status: 'confirmed',
    userEmail: 'cliente@example.com',
    userName: 'Cliente de prueba',
    serviceName: 'Masaje relajante',
    date: '2026-08-04',
    timeSlot: '10:00',
    ...overrides,
  }
}

async function seedReservations(
  firestore: Firestore,
  reservations: ReservationForReminder[],
): Promise<void> {
  await Promise.all(
    reservations.map((item) => firestore.collection('reservas').doc(item.id).set(item)),
  )
}

async function readReminder(firestore: Firestore, reservaId: string) {
  return firestore.collection('recordatorios').doc(reminderDocId(reservaId)).get()
}

async function cleanup(firestore: Firestore, reservaIds: string[]): Promise<void> {
  await Promise.all(
    reservaIds.flatMap((id) => [
      firestore.collection('reservas').doc(id).delete(),
      firestore.collection('recordatorios').doc(reminderDocId(id)).delete(),
    ]),
  )
}

const emulatorTests = describe.skipIf(!emulatorEnabled)

emulatorTests('Firestore emulator reminder integration', () => {
  afterAll(async () => {
    if (db) await db.terminate()
    if (testApp) await deleteApp(testApp)
  })

  it('sends a due reservation once, skips cancellation, and persists a deterministic sent record', async () => {
    const firestore = getTestDb()
    const due = reservation('task-8 success')
    const cancelled = reservation('task-8-cancelled', { status: 'cancelled' })
    const provider = new RecordingProvider()

    try {
      await seedReservations(firestore, [due, cancelled])
      const store = createFirestoreReminderStore(firestore)

      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: NOW,
        providerFactory: () => provider,
      })
      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: NOW,
        providerFactory: () => provider,
      })

      expect(provider.calls).toEqual([
        {
          to: 'cliente@example.com',
          recipientName: 'Cliente de prueba',
          serviceName: 'Masaje relajante',
          date: '2026-08-04',
          timeSlot: '10:00',
          idempotencyKey: reminderDocId(due.id),
        },
      ])

      const reminders = await firestore.collection('recordatorios').get()
      expect(reminders.docs.map((document) => document.id)).toEqual([
        reminderDocId(due.id),
      ])
      expect(reminders.docs[0].data()).toMatchObject({
        reservaId: due.id,
        status: 'sent',
        attempts: 1,
        processingLockUntil: null,
        processingToken: null,
        lastError: null,
        nextAttemptAt: null,
        providerMessageId: 'fake-1',
      })
      expect((await readReminder(firestore, cancelled.id)).exists).toBe(false)
    } finally {
      await cleanup(firestore, [due.id, cancelled.id])
    }
  })

  it('transitions retryable failures to sent and permanently failing delivery to exhausted failed state', async () => {
    const firestore = getTestDb()
    const retryable = reservation('task-8-retryable')
    const permanent = reservation('task-8-permanent')
    const retryingProvider = new RecordingProvider(2, true)
    const permanentProvider = new RecordingProvider('always', false)

    try {
      await seedReservations(firestore, [retryable])
      const store = createFirestoreReminderStore(firestore)

      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: NOW,
        providerFactory: () => retryingProvider,
      })
      expect((await readReminder(firestore, retryable.id)).data()).toMatchObject({
        status: 'failed',
        attempts: 1,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: expect.anything(),
      })

      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: new Date(NOW.getTime() + 30 * 60 * 1000),
        providerFactory: () => retryingProvider,
      })
      expect((await readReminder(firestore, retryable.id)).data()).toMatchObject({
        status: 'failed',
        attempts: 2,
        processingLockUntil: null,
        processingToken: null,
        nextAttemptAt: expect.anything(),
      })

      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: new Date(NOW.getTime() + 60 * 60 * 1000),
        providerFactory: () => retryingProvider,
      })
      expect((await readReminder(firestore, retryable.id)).data()).toMatchObject({
        status: 'sent',
        attempts: 3,
        processingLockUntil: null,
        processingToken: null,
        lastError: null,
        nextAttemptAt: null,
        providerMessageId: 'fake-3',
      })
      expect(retryingProvider.calls).toHaveLength(3)

      await seedReservations(firestore, [permanent])
      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: NOW,
        providerFactory: () => permanentProvider,
      })
      await runReminderOrchestration({
        store,
        secret: 'task-8-fake-secret',
        now: new Date(NOW.getTime() + 60 * 60 * 1000),
        providerFactory: () => permanentProvider,
      })

      expect(permanentProvider.calls).toHaveLength(1)
      expect((await readReminder(firestore, permanent.id)).data()).toMatchObject({
        status: 'failed',
        attempts: 3,
        processingLockUntil: null,
        processingToken: null,
        lastError: 'Email provider permanent failure',
        nextAttemptAt: null,
      })
    } finally {
      await cleanup(firestore, [retryable.id, permanent.id])
    }
  })
})
