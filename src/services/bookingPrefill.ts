export interface BookingPrefill {
  serviceId: string
  date: string
  timeSlot: string
}

const SERVICE_ID = /^[a-z0-9][a-z0-9-]{0,80}$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_SLOT = /^(?:[01]\d|2[0-3]):[0-5]\d$/

export function readBookingPrefill(params: URLSearchParams): BookingPrefill {
  const service = params.get('service') ?? ''
  const date = params.get('date') ?? ''
  const timeSlot = params.get('timeSlot') ?? ''
  return {
    serviceId: SERVICE_ID.test(service) ? service : '',
    date: ISO_DATE.test(date) ? date : '',
    timeSlot: TIME_SLOT.test(timeSlot) ? timeSlot : '',
  }
}
