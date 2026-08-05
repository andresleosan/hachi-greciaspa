import { describe, expect, it } from 'vitest'
import { readBookingPrefill } from './bookingPrefill'

describe('booking prefill', () => {
  it('reads safe service, date and time query params', () => {
    expect(readBookingPrefill(new URLSearchParams('service=spa-day&date=2026-08-20&timeSlot=10%3A30'))).toEqual({
      serviceId: 'spa-day',
      date: '2026-08-20',
      timeSlot: '10:30',
    })
  })

  it('ignores malformed values instead of injecting them into the form', () => {
    expect(readBookingPrefill(new URLSearchParams('service=%3Cscript%3E&date=tomorrow&timeSlot=999'))).toEqual({
      serviceId: '',
      date: '',
      timeSlot: '',
    })
  })
})
