import type { Empleado, Reserva, ReservaStatus } from '../types';

export const AGENDA_START_MINUTES = 480;
export const AGENDA_END_MINUTES = 1200;
export const AGENDA_SLOT_MINUTES = 30;

export type AgendaAction = 'confirm' | 'cancel' | 'complete';

export type AgendaPlacement = {
  startSlot: number;
  span: number;
  inOperatingHours: boolean;
};

type AgendaReserva = Reserva & {
  date: string;
  serviceId: string;
  status: ReservaStatus;
  timeSlot: string;
};

export function parseTimeSlot(timeSlot: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(timeSlot)) {
    return null;
  }

  const [hours, minutes] = timeSlot.split(':').map(Number);
  if (hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

export function getAgendaPlacement(timeSlot: string, durationMin: number): AgendaPlacement | null {
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return null;
  }

  const startMinutes = parseTimeSlot(timeSlot);
  if (startMinutes === null) {
    return null;
  }

  const span = Math.max(1, Math.ceil(durationMin / AGENDA_SLOT_MINUTES));
  const endMinutes = startMinutes + durationMin;

  return {
    startSlot: Math.floor((startMinutes - AGENDA_START_MINUTES) / AGENDA_SLOT_MINUTES),
    span,
    inOperatingHours:
      startMinutes >= AGENDA_START_MINUTES &&
      startMinutes < AGENDA_END_MINUTES &&
      endMinutes <= AGENDA_END_MINUTES,
  };
}

export function filterAgendaBookings(bookings: Reserva[], serviceId: string): Reserva[] {
  if (serviceId === 'all') {
    return bookings;
  }

  return bookings.filter((booking) => (booking as AgendaReserva).serviceId === serviceId);
}

export function filterAgendaBookingsByEmployee(
  bookings: Reserva[],
  employeeFilter: 'all' | 'unassigned' | string,
): Reserva[] {
  if (employeeFilter === 'all') {
    return [...bookings];
  }

  if (employeeFilter === 'unassigned') {
    return bookings.filter((booking) => booking.empleadoId == null);
  }

  return bookings.filter((booking) => booking.empleadoId === employeeFilter);
}

export function getEmployeeDisplayName(
  employeeId: string | null | undefined,
  employees: Empleado[],
): string {
  if (employeeId == null) return 'Sin terapeuta asignado';
  return employees.find((employee) => employee.id === employeeId)?.name || 'Terapeuta no encontrado';
}

export function getAgendaActions(reserva: Reserva, now: Date): AgendaAction[] {
  const { status } = reserva as AgendaReserva;
  if (status === 'cancelled' || status === 'completed') {
    return [];
  }

  if (status === 'pending') {
    return ['confirm', 'cancel'];
  }

  const actions: AgendaAction[] = ['cancel'];
  const { date, timeSlot } = reserva as AgendaReserva;
  const appointment = new Date(`${date}T${timeSlot}:00`);
  if (!Number.isNaN(appointment.getTime()) && appointment <= now) {
    actions.push('complete');
  }

  return actions;
}

export function getAgendaStatusLabel(action: AgendaAction): string {
  const labels: Record<AgendaAction, string> = {
    cancel: 'Cancelar',
    complete: 'Marcar completada',
    confirm: 'Confirmar',
  };

  return labels[action];
}
