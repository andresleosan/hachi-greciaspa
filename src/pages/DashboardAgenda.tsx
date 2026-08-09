import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import AdminShell from '../components/AdminShell'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import { firebaseDb } from '../services/firebase'
import { assignPendingReservasForDate, EmpleadoError, listEmpleados } from '../services/empleados'
import { updateAdminReservaStatus } from '../services/reservas'
import {
  filterAgendaBookings,
  filterAgendaBookingsByEmployee,
  getAgendaActions,
  getEmployeeDisplayName,
  getAgendaPlacement,
  getAgendaStatusLabel,
  canDisplayAgendaData,
  isAgendaDateReady,
  type AgendaAction,
} from '../services/agenda'
import type { Empleado, Reserva, ReservaStatus } from '../types'
import { RESERVA_STATUS_LABELS } from '../types'

const AGENDA_SLOT_COUNT = 24
const AGENDA_SLOTS = Array.from({ length: AGENDA_SLOT_COUNT }, (_, index) => {
  const minutes = 8 * 60 + index * 30
  const hours = Math.floor(minutes / 60)
  const slotMinutes = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(slotMinutes).padStart(2, '0')}`
})

const STATUS_CLASS: Record<ReservaStatus, string> = {
  pending: 'agenda-event--pending',
  confirmed: 'agenda-event--confirmed',
  cancelled: 'agenda-event--cancelled',
  completed: 'agenda-event--completed',
}

const ACTION_STATUS: Record<AgendaAction, 'confirmed' | 'cancelled' | 'completed'> = {
  confirm: 'confirmed',
  cancel: 'cancelled',
  complete: 'completed',
}

function getBookingLabel(booking: Reserva) {
  return booking.serviceName || 'Servicio sin nombre'
}

function getCustomerLabel(booking: Reserva) {
  return booking.userName || booking.userEmail || booking.userId || 'Cliente no informado'
}

function getStatusLabel(status: ReservaStatus) {
  return RESERVA_STATUS_LABELS[status] || status
}

function getTimelinePlacement(booking: Reserva) {
  const placement = getAgendaPlacement(booking.timeSlot, booking.durationMin)
  if (
    !placement ||
    !placement.inOperatingHours ||
    !Number.isInteger(placement.startSlot) ||
    !Number.isInteger(placement.span) ||
    placement.startSlot < 0 ||
    placement.startSlot >= AGENDA_SLOT_COUNT ||
    placement.span < 1 ||
    placement.span > AGENDA_SLOT_COUNT ||
    placement.startSlot + placement.span > AGENDA_SLOT_COUNT
  ) {
    return null
  }

  return placement
}

export default function DashboardAgenda() {
  const { user, profile, error: profileError } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [serviceFilter, setServiceFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [bookings, setBookings] = useState<Reserva[]>([])
  const [employees, setEmployees] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [busyById, setBusyById] = useState<Record<string, boolean>>({})
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement | null>(null)
  const drawerTriggerRef = useRef<HTMLElement | null>(null)

  function openDrawer(bookingId: string, trigger: HTMLElement) {
    drawerTriggerRef.current = trigger
    setSelectedBookingId(bookingId)
    setDrawerError(null)
  }

  function closeDrawer() {
    setSelectedBookingId(null)
    setDrawerError(null)

    const trigger = drawerTriggerRef.current
    drawerTriggerRef.current = null
    if (trigger && document.contains(trigger)) trigger.focus()
  }

  useEffect(() => {
    let active = true

    async function loadAgenda() {
      if (!user || profile?.role !== 'admin') {
        setLoading(false)
        return
      }

      if (!isAgendaDateReady(selectedDate)) {
        setLoading(false)
        setError(null)
        setAssignmentError(null)
        setBookings([])
        setEmployees([])
        closeDrawer()
        return
      }

      setLoading(true)
      setError(null)
      setAssignmentError(null)
      setBookings([])
      setEmployees([])
      closeDrawer()

      try {
        try {
          await assignPendingReservasForDate(selectedDate)
        } catch (assignmentLoadError) {
          if (active) {
            setAssignmentError(
              assignmentLoadError instanceof EmpleadoError
                ? assignmentLoadError.message
                : 'No se pudo completar la asignación automática. Intenta nuevamente.',
            )
          }
        }

        const agendaQuery = query(collection(firebaseDb, 'reservas'), where('date', '==', selectedDate))
        const [snapshot, employeeData] = await Promise.all([
          getDocs(agendaQuery),
          listEmpleados(),
        ])
        const items = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }) as Reserva)
          .sort((left, right) => left.timeSlot.localeCompare(right.timeSlot))

        if (active) {
          setBookings(items)
          setEmployees(employeeData)
        }
      } catch {
        if (active) {
          setError('No se pudo cargar la agenda.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadAgenda()
    return () => {
      active = false
    }
  }, [profile?.role, selectedDate, user])

  const previousSelectedDateRef = useRef(selectedDate)
  useEffect(() => {
    if (previousSelectedDateRef.current === selectedDate) return
    previousSelectedDateRef.current = selectedDate
    setServiceFilter('all')
    setEmployeeFilter('all')
  }, [selectedDate])

  useEffect(() => {
    if (!selectedBookingId) return

    closeButtonRef.current?.focus()
    const drawer = drawerRef.current
    if (!drawer) return

    const getFocusableElements = () => Array.from(
      drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) {
        event.preventDefault()
        drawer.focus()
        return
      }

      const firstFocusable = focusableElements[0]
      const lastFocusable = focusableElements[focusableElements.length - 1]
      const activeElement = document.activeElement
      if (event.shiftKey && (activeElement === firstFocusable || !drawer.contains(activeElement))) {
        event.preventDefault()
        lastFocusable.focus()
      } else if (!event.shiftKey && (activeElement === lastFocusable || !drawer.contains(activeElement))) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedBookingId])

  const showAgendaData = canDisplayAgendaData(loading, error) && isAgendaDateReady(selectedDate)
  const visibleBookings = showAgendaData ? bookings : []
  const visibleEmployees = showAgendaData ? employees : []
  const serviceOptions = Array.from(
    visibleBookings.reduce((options, booking) => {
      const serviceId = booking.serviceId || booking.serviceName
      if (serviceId && !options.has(serviceId)) options.set(serviceId, booking.serviceName || serviceId)
      return options
    }, new Map<string, string>()),
  ).sort((left, right) => left[1].localeCompare(right[1]))

  const serviceFilteredBookings = filterAgendaBookings(visibleBookings, serviceFilter)
  const filteredBookings = filterAgendaBookingsByEmployee(serviceFilteredBookings, employeeFilter)
  const timelineBookings = filteredBookings.filter((booking) => getTimelinePlacement(booking))
  const incidentBookings = filteredBookings.filter((booking) => !getTimelinePlacement(booking))
  const unassignedBookings = visibleBookings.filter((booking) => booking.empleadoId == null)
  const employeeOptions = [...visibleEmployees].sort((left, right) => left.name.localeCompare(right.name))
  const selectedBooking = visibleBookings.find((booking) => booking.id === selectedBookingId) || null
  const selectedBusy = selectedBooking?.id ? Boolean(busyById[selectedBooking.id]) : false

  async function handleAction(action: AgendaAction) {
    if (!selectedBooking?.id || selectedBusy) return
    if (action === 'cancel' && !confirm(`¿Cancelar ${getBookingLabel(selectedBooking)}? Esta acción no se puede deshacer.`)) {
      return
    }

    const reservaId = selectedBooking.id
    setBusyById((previous) => ({ ...previous, [reservaId]: true }))
    setDrawerError(null)

    try {
      await updateAdminReservaStatus(reservaId, ACTION_STATUS[action])
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === reservaId ? { ...booking, status: ACTION_STATUS[action] } : booking,
        ),
      )
      closeDrawer()
    } catch {
      setDrawerError('No se pudo actualizar la reserva.')
    } finally {
      setBusyById((previous) => {
        const next = { ...previous }
        delete next[reservaId]
        return next
      })
    }
  }

  return (
    <ProtectedRoute requireRole="admin">
      <AdminShell title="Agenda diaria" subtitle="Operación diaria de reservas y asignaciones.">
        <div className="agenda-page">
        <div className="container agenda-page__inner">
          <header className="agenda-header">
            <div>
              <Link className="agenda-back-link" to="/dashboard">Volver al dashboard</Link>
              <p className="eyebrow eyebrow--coral">Operación diaria</p>
               <h2>Agenda diaria</h2>
              <p className="section-copy">Organizá las reservas del spa en una sola vista.</p>
            </div>
            <div className="agenda-date-card">
              <label htmlFor="agenda-date">Fecha seleccionada</label>
              <input
                id="agenda-date"
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setLoading(true)
                  setSelectedDate(event.target.value)
                }}
              />
            </div>
          </header>

          <section className="agenda-filters" aria-label="Filtros de agenda">
            <div className="field">
              <label htmlFor="agenda-service">Servicio</label>
              <select
                id="agenda-service"
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
              >
                <option value="all">Todos los servicios</option>
                {serviceOptions.map(([serviceId, serviceName]) => (
                  <option key={serviceId} value={serviceId}>{serviceName}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="agenda-therapist">Terapeuta</label>
              <select
                id="agenda-therapist"
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
              >
                <option value="all">Todas</option>
                {employeeOptions.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.active ? 'activa' : 'inactiva'})
                  </option>
                ))}
                <option value="unassigned">Sin terapeuta</option>
              </select>
            </div>
            <p className="agenda-filters__summary">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'reserva' : 'reservas'} para {selectedDate}
            </p>
          </section>

          {profileError && <p className="agenda-error" role="alert">{profileError}</p>}
          {assignmentError && (
            <p className="agenda-assignment-error" role="alert">
              No se pudo actualizar la asignación automática: {assignmentError}
            </p>
          )}
          {loading && <p className="agenda-state" role="status">Cargando agenda...</p>}
          {!loading && error && <p className="agenda-error" role="alert">{error}</p>}
          {!loading && !isAgendaDateReady(selectedDate) && (
            <div className="agenda-empty">
              <strong>Seleccioná una fecha para cargar la agenda.</strong>
              <span>Elegí una fecha válida para ver las reservas del día.</span>
            </div>
          )}
          {showAgendaData && filteredBookings.length === 0 && (
            <div className="agenda-empty">
              <strong>No hay reservas para esta selección.</strong>
              <span>Probá otra fecha o servicio para ver la agenda.</span>
            </div>
          )}

          {showAgendaData && unassignedBookings.length > 0 && (
            <section className="agenda-unassigned" aria-labelledby="agenda-unassigned-title">
              <div className="agenda-unassigned__head">
                <div>
                  <p className="eyebrow eyebrow--coral">Cola de asignación</p>
                  <h2 id="agenda-unassigned-title">Sin terapeuta asignado</h2>
                </div>
                <span>{unassignedBookings.length} {unassignedBookings.length === 1 ? 'reserva' : 'reservas'}</span>
              </div>
              <ul>
                {unassignedBookings.map((booking) => (
                  <li key={booking.id}>
                    <button
                      className="agenda-unassigned__item"
                      type="button"
                      onClick={(event) => {
                        if (booking.id) openDrawer(booking.id, event.currentTarget)
                      }}
                    >
                      <strong>{getBookingLabel(booking)}</strong>
                      <span>{getCustomerLabel(booking)} · {booking.timeSlot || 'Horario inválido'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showAgendaData && filteredBookings.length > 0 && (
            <section className="agenda-panel" aria-labelledby="agenda-timeline-title">
              <div className="agenda-panel__head">
                <div>
                  <p className="eyebrow">08:00 - 20:00</p>
                  <h2 id="agenda-timeline-title">Reservas del día</h2>
                </div>
                <span className="agenda-panel__hint">Seleccioná una reserva para ver el detalle</span>
              </div>

              {timelineBookings.length > 0 && (
                <div className="agenda-timeline-scroll" role="region" aria-label="Línea de tiempo de reservas">
                  <div className="agenda-timeline">
                    <div className="agenda-timeline-axis" aria-hidden="true">
                      {AGENDA_SLOTS.map((slot) => <span key={slot}>{slot}</span>)}
                    </div>
                    <div className="agenda-event-lane">
                      {timelineBookings.map((booking) => {
                        const placement = getTimelinePlacement(booking)
                        const bookingId = booking.id
                        if (!placement || !bookingId) return null

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            className={`agenda-event ${STATUS_CLASS[booking.status]} agenda-event--start-${placement.startSlot} agenda-event--span-${placement.span}`}
                            onClick={(event) => openDrawer(bookingId, event.currentTarget)}
                            aria-label={`Ver ${getBookingLabel(booking)} a las ${booking.timeSlot}. ${getEmployeeDisplayName(booking.empleadoId, visibleEmployees)}`}
                          >
                            <strong>{getBookingLabel(booking)}</strong>
                            <span>{getCustomerLabel(booking)}</span>
                            <span className={booking.empleadoId == null ? 'agenda-event__employee agenda-event__employee--unassigned' : 'agenda-event__employee'}>
                              {getEmployeeDisplayName(booking.empleadoId, visibleEmployees)}
                            </span>
                            <small>{booking.timeSlot} · {getStatusLabel(booking.status)}</small>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {timelineBookings.length === 0 && (
                <p className="agenda-state">No hay reservas dentro del horario operativo.</p>
              )}

              {incidentBookings.length > 0 && (
                <div className="agenda-incidents" aria-labelledby="agenda-incidents-title">
                  <div className="agenda-incidents__head">
                    <h3 id="agenda-incidents-title">Incidencias</h3>
                    <span>Revisar horario o duración</span>
                  </div>
                  <ul>
                    {incidentBookings.map((booking) => (
                      <li key={booking.id}>
                        <button
                          className="agenda-incident"
                          type="button"
                          onClick={(event) => {
                            if (booking.id) openDrawer(booking.id, event.currentTarget)
                          }}
                        >
                          <strong>{getBookingLabel(booking)}</strong>
                          <span>{getCustomerLabel(booking)} · {booking.timeSlot || 'Horario inválido'}</span>
                          <small className={booking.empleadoId == null ? 'agenda-event__employee agenda-event__employee--unassigned' : 'agenda-event__employee'}>
                            {getEmployeeDisplayName(booking.empleadoId, visibleEmployees)}
                          </small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {selectedBooking && (
          <div className="agenda-drawer-layer">
            <button
              className="agenda-drawer-overlay"
              type="button"
              tabIndex={-1}
              aria-label="Cerrar detalle de reserva"
              onClick={closeDrawer}
            />
            <aside
              ref={drawerRef}
              className="agenda-drawer"
              role="dialog"
              aria-modal="true"
              aria-labelledby="agenda-drawer-title"
              tabIndex={-1}
            >
              <div className="agenda-drawer__head">
                <div>
                  <p className="eyebrow eyebrow--coral">Detalle de reserva</p>
                  <h2 id="agenda-drawer-title">{getBookingLabel(selectedBooking)}</h2>
                </div>
                <button
                  ref={closeButtonRef}
                  className="agenda-drawer__close"
                  type="button"
                  aria-label="Cerrar detalle"
                  onClick={closeDrawer}
                >
                  Cerrar
                </button>
              </div>

              <dl className="agenda-drawer__details">
                <div><dt>Cliente</dt><dd>{getCustomerLabel(selectedBooking)}</dd></div>
                <div><dt>Fecha</dt><dd>{selectedBooking.date}</dd></div>
                <div><dt>Horario</dt><dd>{selectedBooking.timeSlot || 'No informado'}</dd></div>
                <div><dt>Duración</dt><dd>{selectedBooking.durationMin || 0} minutos</dd></div>
                <div><dt>Terapeuta</dt><dd className={selectedBooking.empleadoId == null ? 'agenda-drawer__employee--unassigned' : undefined}>{getEmployeeDisplayName(selectedBooking.empleadoId, visibleEmployees)}</dd></div>
                <div><dt>Estado</dt><dd><span className={`agenda-status agenda-status--${selectedBooking.status}`}>{getStatusLabel(selectedBooking.status)}</span></dd></div>
              </dl>

              <div className="agenda-drawer__notes">
                <h3>Notas</h3>
                <p>{selectedBooking.notes || 'Sin notas para esta reserva.'}</p>
              </div>

              {drawerError && <p className="agenda-error" role="alert">{drawerError}</p>}

              <div className="agenda-drawer__actions" aria-busy={selectedBusy}>
                {getAgendaActions(selectedBooking, new Date()).map((action) => (
                  <button
                    key={action}
                    className={`btn ${action === 'cancel' ? 'btn-danger' : action === 'confirm' ? 'btn-primary' : 'btn-secondary'}`}
                    type="button"
                    disabled={selectedBusy}
                    onClick={() => void handleAction(action)}
                  >
                    {selectedBusy ? 'Guardando...' : getAgendaStatusLabel(action)}
                  </button>
                ))}
                {getAgendaActions(selectedBooking, new Date()).length === 0 && (
                  <p className="agenda-drawer__muted">No hay acciones disponibles para esta reserva.</p>
                )}
              </div>
            </aside>
          </div>
        )}
        </div>
      </AdminShell>
    </ProtectedRoute>
  )
}
