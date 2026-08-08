export function bookingSlotGuardId(serviceId: string, date: string): string {
  return `${encodeURIComponent(serviceId)}__${date}`
}
