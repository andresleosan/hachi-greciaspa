export function bookingSlotGuardId(serviceId, date) {
    return `${encodeURIComponent(serviceId)}__${date}`;
}
