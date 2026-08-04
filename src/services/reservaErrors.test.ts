import { describe, expect, it } from 'vitest'
import { mapReservaError } from './reservaErrors'
import {
  canShowReschedule,
  canStartReschedule,
  isReservationActionDisabled,
  isRescheduleActionDisabled,
  startRescheduleDraft,
} from './reservaGuards'

describe('mapReservaError', () => {
  it('maps failed-precondition to a slot/date business message', () => {
    expect(mapReservaError({ code: 'failed-precondition' })).toMatch(/fecha|horario|disponible/i)
  })

  it('maps permission-denied to an ownership/status business message', () => {
    expect(mapReservaError({ code: 'permission-denied' })).toMatch(/reserva|estado|permiso|propia/i)
  })

  it('maps invalid-argument to an input business message', () => {
    expect(mapReservaError({ code: 'invalid-argument' })).toMatch(/fecha|horario|válid|revis/i)
  })

  it('maps unknown errors to a generic operational message', () => {
    expect(mapReservaError(new Error('internal details'))).toMatch(/reagendar|intenta|intentá|nuevamente/i)
    expect(mapReservaError({ code: 'deadline-exceeded' })).not.toContain('internal details')
  })
})

describe('reschedule dashboard guards', () => {
  it('only shows rescheduling for a client pending booking in the future', () => {
    expect(canShowReschedule('client', 'pending', '2026-08-06', '2026-08-05')).toBe(true)
    expect(canShowReschedule('admin', 'pending', '2026-08-06', '2026-08-05')).toBe(false)
    expect(canShowReschedule(undefined, 'pending', '2026-08-06', '2026-08-05')).toBe(false)
  })

  it('disables every reservation action while any reschedule is in flight', () => {
    expect(isReservationActionDisabled('booking-a', null, 'booking-a')).toBe(true)
    expect(isReservationActionDisabled('booking-b', null, 'booking-a')).toBe(true)
    expect(isReservationActionDisabled('booking-b', null, null)).toBe(false)
  })

  it('rejects a cross-booking start without replacing the active draft', () => {
    const activeDraft = { reservaId: 'booking-a', date: '2026-08-06', timeSlot: '10:00' }
    const nextDraft = { reservaId: 'booking-b', date: '2026-08-07', timeSlot: '11:00' }

    expect(canStartReschedule(nextDraft.reservaId, activeDraft.reservaId, null)).toBe(false)
    expect(startRescheduleDraft(activeDraft, nextDraft, activeDraft.reservaId, null)).toEqual(activeDraft)
    expect(isRescheduleActionDisabled('booking-b', null, activeDraft.reservaId, null)).toBe(true)
  })

  it('rejects a cross-booking start while another booking is actively rescheduling', () => {
    const activeDraft = { reservaId: 'booking-a', date: '2026-08-06', timeSlot: '10:00' }
    const nextDraft = { reservaId: 'booking-b', date: '2026-08-07', timeSlot: '11:00' }

    expect(startRescheduleDraft(activeDraft, nextDraft, null, activeDraft.reservaId)).toEqual(activeDraft)
    expect(isRescheduleActionDisabled('booking-b', null, null, activeDraft.reservaId)).toBe(true)
  })
})
