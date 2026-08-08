import { describe, expect, it } from 'vitest';
import type { Empleado, Reserva, ReservaStatus } from '../types';
import {
  AGENDA_END_MINUTES,
  AGENDA_SLOT_MINUTES,
  AGENDA_START_MINUTES,
  canDisplayAgendaData,
  filterAgendaBookings,
  filterAgendaBookingsByEmployee,
  getAgendaActions,
  getEmployeeDisplayName,
  getAgendaPlacement,
  getAgendaStatusLabel,
  isAgendaDateReady,
  parseTimeSlot,
} from './agenda';

const makeReserva = (overrides: Partial<Reserva> = {}): Reserva =>
  ({
    id: 'reserva-1',
    serviceId: 'masaje',
    date: '2026-08-04',
    timeSlot: '10:00',
    status: 'pending' as ReservaStatus,
    ...overrides,
  }) as Reserva;

const makeEmpleado = (overrides: Partial<Empleado> = {}): Empleado =>
  ({
    id: 'empleado-1',
    name: 'Ana García',
    role: 'groomer',
    photoUrl: null,
    active: true,
    services: ['masaje'],
    weeklyShifts: {
      monday: 'full',
      tuesday: 'full',
      wednesday: 'full',
      thursday: 'full',
      friday: 'full',
      saturday: null,
      sunday: null,
    },
    ...overrides,
  }) as Empleado;

describe('agenda domain helpers', () => {
  it('accepts only a non-empty selected date for agenda loading', () => {
    expect(isAgendaDateReady('2026-08-04')).toBe(true);
    expect(isAgendaDateReady('')).toBe(false);
    expect(isAgendaDateReady('   ')).toBe(false);
  });

  it('only displays agenda data after loading succeeds', () => {
    expect(canDisplayAgendaData(false, null)).toBe(true);
    expect(canDisplayAgendaData(true, null)).toBe(false);
    expect(canDisplayAgendaData(false, 'No se pudo cargar la agenda.')).toBe(false);
  });

  it('parses only strict HH:mm time slots', () => {
    expect(parseTimeSlot('08:00')).toBe(AGENDA_START_MINUTES);
    expect(parseTimeSlot('23:59')).toBe(1439);
    expect(parseTimeSlot('8:00')).toBeNull();
    expect(parseTimeSlot('08:0')).toBeNull();
    expect(parseTimeSlot('24:00')).toBeNull();
    expect(parseTimeSlot('12:60')).toBeNull();
    expect(parseTimeSlot(' 08:00')).toBeNull();
  });

  it('calculates an in-window placement using 30-minute slots', () => {
    expect(getAgendaPlacement('08:00', 60)).toEqual({
      startSlot: 0,
      span: 2,
      inOperatingHours: true,
    });
    expect(getAgendaPlacement('12:00', 45)).toEqual({
      startSlot: 8,
      span: 2,
      inOperatingHours: true,
    });
    expect(AGENDA_SLOT_MINUTES).toBe(30);
  });

  it('marks starts and endings outside operating hours', () => {
    expect(getAgendaPlacement('07:30', 30)).toEqual({
      startSlot: -1,
      span: 1,
      inOperatingHours: false,
    });
    expect(getAgendaPlacement('19:30', 60)?.inOperatingHours).toBe(false);
    expect(getAgendaPlacement('20:00', 30)?.inOperatingHours).toBe(false);
    expect(getAgendaPlacement('not-a-time', 30)).toBeNull();
    expect(AGENDA_END_MINUTES).toBe(1200);
  });

  it('rejects zero and negative durations', () => {
    expect(getAgendaPlacement('10:00', 0)).toBeNull();
    expect(getAgendaPlacement('10:00', -30)).toBeNull();
  });

  it('rejects non-finite durations', () => {
    expect(getAgendaPlacement('10:00', Number.NaN)).toBeNull();
    expect(getAgendaPlacement('10:00', Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('filters bookings by service and returns every booking for all', () => {
    const bookings = [
      makeReserva({ id: 'one', serviceId: 'masaje' }),
      makeReserva({ id: 'two', serviceId: 'facial' }),
      makeReserva({ id: 'three', serviceId: 'masaje' }),
    ];

    expect(filterAgendaBookings(bookings, 'masaje').map(({ id }) => id)).toEqual([
      'one',
      'three',
    ]);
    expect(filterAgendaBookings(bookings, 'all')).toEqual(bookings);
  });

  it('filters bookings by employee without mutating the source array', () => {
    const bookings = [
      makeReserva({ id: 'assigned-one', empleadoId: 'empleado-1' }),
      makeReserva({ id: 'assigned-two', empleadoId: 'empleado-2' }),
      makeReserva({ id: 'unassigned-null', empleadoId: null }),
      makeReserva({ id: 'unassigned-missing' }),
    ];

    expect(filterAgendaBookingsByEmployee(bookings, 'all')).toEqual(bookings);
    expect(filterAgendaBookingsByEmployee(bookings, 'all')).not.toBe(bookings);
    expect(filterAgendaBookingsByEmployee(bookings, 'empleado-1').map(({ id }) => id)).toEqual([
      'assigned-one',
    ]);
    expect(filterAgendaBookingsByEmployee(bookings, 'empleado-desconocido')).toEqual([]);
    expect(filterAgendaBookingsByEmployee(bookings, 'unassigned').map(({ id }) => id)).toEqual([
      'unassigned-null',
      'unassigned-missing',
    ]);
  });

  it('resolves employee names and visible fallback labels', () => {
    const employees = [makeEmpleado()];

    expect(getEmployeeDisplayName('empleado-1', employees)).toBe('Ana García');
    expect(getEmployeeDisplayName(null, employees)).toBe('Sin terapeuta asignado');
    expect(getEmployeeDisplayName(undefined, employees)).toBe('Sin terapeuta asignado');
    expect(getEmployeeDisplayName('empleado-desconocido', employees)).toBe('Terapeuta no encontrado');
  });

  it('returns the action matrix for every reservation status', () => {
    const now = new Date('2026-08-04T12:00:00');

    expect(getAgendaActions(makeReserva({ status: 'pending' as ReservaStatus }), now)).toEqual([
      'confirm',
      'cancel',
    ]);
    expect(
      getAgendaActions(
        makeReserva({ status: 'confirmed' as ReservaStatus, timeSlot: '13:00' }),
        now,
      ),
    ).toEqual(['cancel']);
    expect(
      getAgendaActions(
        makeReserva({ status: 'confirmed' as ReservaStatus, timeSlot: '11:00' }),
        now,
      ),
    ).toEqual(['cancel', 'complete']);
    expect(getAgendaActions(makeReserva({ status: 'cancelled' as ReservaStatus }), now)).toEqual(
      [],
    );
    expect(getAgendaActions(makeReserva({ status: 'completed' as ReservaStatus }), now)).toEqual(
      [],
    );
  });

  it('does not offer completion before the appointment datetime', () => {
    const now = new Date('2026-08-04T10:00:00');

    expect(
      getAgendaActions(
        makeReserva({ status: 'confirmed' as ReservaStatus, timeSlot: '10:01' }),
        now,
      ),
    ).toEqual(['cancel']);
    expect(
      getAgendaActions(
        makeReserva({ status: 'confirmed' as ReservaStatus, timeSlot: '10:00' }),
        now,
      ),
    ).toEqual(['cancel', 'complete']);
  });

  it('provides the Spanish label for each action', () => {
    expect(getAgendaStatusLabel('confirm')).toBe('Confirmar');
    expect(getAgendaStatusLabel('cancel')).toBe('Cancelar');
    expect(getAgendaStatusLabel('complete')).toBe('Marcar completada');
  });
});
