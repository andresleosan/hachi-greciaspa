import { describe, expect, it, vi } from 'vitest'
import type { Firestore } from 'firebase-admin/firestore'

import { EmailProviderError } from './email/resend.js'
import { onReservaConfirmationCreatedHandler } from './onReservaConfirmationCreated.js'

class TransactionFirestoreFake {
  readonly documents = new Map<string, Record<string, unknown>>()
  private queue = Promise.resolve()

  collection(name: string) {
    return {
      doc: (id: string) => ({ path: `${name}/${id}` }),
    }
  }

  runTransaction<T>(callback: (transaction: unknown) => Promise<T>): Promise<T> {
    const operation = this.queue.then(async () => {
      const transaction = {
        get: async (reference: { path: string }) => {
          const data = this.documents.get(reference.path)
          return { exists: Boolean(data), data: () => data }
        },
        create: (reference: { path: string }, data: Record<string, unknown>) => {
          this.documents.set(reference.path, { ...data })
        },
        set: (reference: { path: string }, data: Record<string, unknown>) => {
          this.documents.set(reference.path, {
            ...(this.documents.get(reference.path) ?? {}),
            ...data,
          })
        },
        update: (reference: { path: string }, data: Record<string, unknown>) => {
          this.documents.set(reference.path, {
            ...(this.documents.get(reference.path) ?? {}),
            ...data,
          })
        },
      }
      return callback(transaction)
    })
    this.queue = operation.then(() => undefined, () => undefined)
    return operation
  }
}

const event = {
  params: { reservaId: 'reservation-1' },
  data: {
    data: () => ({
      id: 'reservation-1',
      status: 'pending',
      userEmail: 'cliente@example.com',
      userName: 'Ana',
      serviceName: 'Baño y corte',
      date: '2026-08-20',
      timeSlot: '10:30',
      empleadoId: null,
    }),
  },
}

describe('onReservaConfirmationCreated handler', () => {
  it('passes the created reservation snapshot to the confirmation provider', async () => {
    const db = new TransactionFirestoreFake()
    const sendConfirmationEmail = vi.fn().mockResolvedValue({ providerMessageId: 'msg-1' })

    await onReservaConfirmationCreatedHandler(
      event,
      db as unknown as Firestore,
      'resend-test-secret',
      () => ({ sendConfirmationEmail }),
    )

    expect(sendConfirmationEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'cliente@example.com',
      serviceName: 'Baño y corte',
      idempotencyKey: 'confirmation-reservation-1',
    }))
    expect(db.documents.get('confirmaciones/confirmation-reservation-1')).toMatchObject({
      status: 'sent',
      providerMessageId: 'msg-1',
    })
  })

  it('returns without sending when the event has no data', async () => {
    const db = new TransactionFirestoreFake()
    const sendConfirmationEmail = vi.fn()

    await onReservaConfirmationCreatedHandler(
      { ...event, data: undefined },
      db as unknown as Firestore,
      'resend-test-secret',
      () => ({ sendConfirmationEmail }),
    )

    expect(sendConfirmationEmail).not.toHaveBeenCalled()
    expect(db.documents.size).toBe(0)
  })

  it('leaves assignment fields untouched while sending the confirmation', async () => {
    const db = new TransactionFirestoreFake()
    const sendConfirmationEmail = vi.fn().mockResolvedValue({})

    await onReservaConfirmationCreatedHandler(
      event,
      db as unknown as Firestore,
      'resend-test-secret',
      () => ({ sendConfirmationEmail }),
    )

    expect(event.data.data().empleadoId).toBeNull()
  })

  it('rethrows only a sanitized retry signal after a retryable delivery failure', async () => {
    const db = new TransactionFirestoreFake()

    await expect(
      onReservaConfirmationCreatedHandler(
        event,
        db as unknown as Firestore,
        'resend-test-secret',
        () => ({
          sendConfirmationEmail: async () => {
            throw new EmailProviderError('provider secret and private body', true)
          },
        }),
      ),
    ).rejects.toThrow('Reservation confirmation delivery retry requested')
  })
})
