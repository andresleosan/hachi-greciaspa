export function canShowReschedule(
  role: string | undefined,
  status: string,
  date: string,
  currentLocalDate: string,
): boolean {
  return role === 'client' && status === 'pending' && date > currentLocalDate
}

export function canStartReschedule(
  reservaId: string,
  editingReservaId: string | null,
  reschedulingId: string | null,
): boolean {
  return (
    (editingReservaId === null || editingReservaId === reservaId) &&
    (reschedulingId === null || reschedulingId === reservaId)
  )
}

export interface RescheduleDraft {
  reservaId: string
  date: string
  timeSlot: string
}

export function startRescheduleDraft(
  currentDraft: RescheduleDraft | null,
  nextDraft: RescheduleDraft,
  editingReservaId: string | null,
  reschedulingId: string | null,
): RescheduleDraft | null {
  return canStartReschedule(nextDraft.reservaId, editingReservaId, reschedulingId)
    ? nextDraft
    : currentDraft
}

export function isRescheduleActionDisabled(
  reservaId: string,
  cancellingId: string | null,
  editingReservaId: string | null,
  reschedulingId: string | null,
): boolean {
  return cancellingId === reservaId || !canStartReschedule(reservaId, editingReservaId, reschedulingId)
}

export function isReservationActionDisabled(
  reservaId: string,
  cancellingId: string | null,
  reschedulingId: string | null,
): boolean {
  return cancellingId === reservaId || reschedulingId !== null
}
