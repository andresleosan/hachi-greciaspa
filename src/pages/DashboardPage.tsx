import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminShell from '../components/AdminShell'
import { useAuth } from '../hooks/useAuth'
import AdminPrices from '../components/AdminPrices'
import { firebaseDb } from '../services/firebase'
import { collection, query, where, getDocs, getCountFromServer, orderBy, limit } from 'firebase/firestore'
import { format } from 'date-fns'
import type { Reserva, ReservaStatus } from '../types'
import { RESERVA_STATUS_LABELS } from '../types'
import { calculateDashboardMetrics, type DashboardMetricBooking } from '../services/dashboardMetrics'
import { cancelMyReserva, rescheduleMyReserva } from '../services/reservas'
import {
  canShowReschedule,
  isReservationActionDisabled,
  isRescheduleActionDisabled,
  startRescheduleDraft,
} from '../services/reservaGuards'

interface Metrics {
  citasHoy: number
  serviciosHoy: number
  clientesTotales: number
}

export default function DashboardPage() {
  const { user, profile, error: profileError } = useAuth()
  const [bookings, setBookings] = useState<Reserva[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ citasHoy: 0, serviciosHoy: 0, clientesTotales: 0 })
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [editingReservaId, setEditingReservaId] = useState<string | null>(null)
  const [reschedulingId, setReschedulingId] = useState<string | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTimeSlot, setRescheduleTimeSlot] = useState('')
  const [rescheduleErrors, setRescheduleErrors] = useState<Record<string, string>>({})

  const currentLocalDate = format(new Date(), 'yyyy-MM-dd')

  async function handleCancel(reservaId: string, label: string) {
    if (!confirm(`¿Cancelar ${label}? Esta acción no se puede deshacer.`)) return
    setCancellingId(reservaId)
    setCancelError(null)
    try {
      await cancelMyReserva(reservaId)
      setBookings((prev) =>
        prev.map((b) => (b.id === reservaId ? { ...b, status: 'cancelled' } : b))
      )
    } catch (e: any) {
      setCancelError(e?.message || 'No se pudo cancelar la reserva.')
    } finally {
      setCancellingId(null)
    }
  }

  function startReschedule(reserva: Reserva) {
    if (!reserva.id) return
    const currentDraft = editingReservaId
      ? { reservaId: editingReservaId, date: rescheduleDate, timeSlot: rescheduleTimeSlot }
      : null
    const nextDraft = startRescheduleDraft(
      currentDraft,
      { reservaId: reserva.id, date: reserva.date, timeSlot: reserva.timeSlot },
      editingReservaId,
      reschedulingId,
    )
    if (!nextDraft || nextDraft.reservaId !== reserva.id) return

    setEditingReservaId(nextDraft.reservaId)
    setRescheduleDate(nextDraft.date)
    setRescheduleTimeSlot(nextDraft.timeSlot)
    setRescheduleErrors((prev) => {
      const next = { ...prev }
      delete next[reserva.id!]
      return next
    })
  }

  function cancelReschedule(reservaId: string) {
    if (reschedulingId === reservaId) return
    setEditingReservaId(null)
    setRescheduleErrors((prev) => {
      const next = { ...prev }
      delete next[reservaId]
      return next
    })
  }

  async function handleReschedule(reservaId: string) {
    if (reschedulingId !== null) return
    setReschedulingId(reservaId)
    setRescheduleErrors((prev) => {
      const next = { ...prev }
      delete next[reservaId]
      return next
    })

    try {
      const result = await rescheduleMyReserva(reservaId, rescheduleDate, rescheduleTimeSlot)
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === reservaId
            ? { ...booking, date: result.date, timeSlot: result.timeSlot }
            : booking,
        ),
      )
      setEditingReservaId(null)
    } catch (error: any) {
      setRescheduleErrors((prev) => ({
        ...prev,
        [reservaId]: error?.message || 'No se pudo reagendar la reserva.',
      }))
    } finally {
      setReschedulingId(null)
    }
  }

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      const isAdmin = profile?.role === 'admin'

      // Fetch recent bookings for the activity list.
      const reservasRef = collection(firebaseDb, 'reservas')
      let bookingsQuery
      if (isAdmin) {
        bookingsQuery = query(reservasRef, orderBy('createdAt', 'desc'), limit(20))
      } else {
        bookingsQuery = query(reservasRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20))
      }

      try {
        const snap = await getDocs(bookingsQuery)
        const items: Reserva[] = []

        snap.forEach((d) => {
          const data = d.data() as Omit<Reserva, 'id'>
          items.push({ id: d.id, ...data })
        })

        setBookings(items)

        const todayBookingsQuery = isAdmin
          ? query(reservasRef, where('date', '==', currentLocalDate))
          : query(
              reservasRef,
              where('userId', '==', user.uid),
              where('date', '==', currentLocalDate),
            )
        const todayBookingsSnap = await getDocs(todayBookingsQuery)
        const dailyMetrics = calculateDashboardMetrics(
          todayBookingsSnap.docs.map((doc) => doc.data() as DashboardMetricBooking),
          currentLocalDate,
        )

        // Fetch total users count (admin only)
        let clientesTotales = 0
        if (isAdmin) {
          try {
            const usersSnap = await getCountFromServer(query(collection(firebaseDb, 'users')))
            clientesTotales = usersSnap.data().count
          } catch {
            // Keep the reservations visible if the secondary metric is unavailable.
          }
        }

        setMetrics({
          ...dailyMetrics,
          clientesTotales,
        })
      } catch (e) {
        setBookings([])
      }

      setLoading(false)
    }

    load()
  }, [user, profile])

  return (
    <ProtectedRoute>
      <AdminShell title="Dashboard" subtitle="Resumen y actividad">
          <section className="container">
            <div className="metric-grid">
              <div className="metric-card metric-card--teal">
                <div className="metric-card__label">Citas Hoy</div>
                <div className="metric-card__value">{metrics.citasHoy}</div>
                <div className="metric-card__delta">Reservas del día</div>
              </div>
              <div className="metric-card metric-card--rose">
                <div className="metric-card__label">Servicios Hoy</div>
                <div className="metric-card__value">{metrics.serviciosHoy}</div>
                <div className="metric-card__delta">Servicios distintos</div>
              </div>
              <div className="metric-card metric-card--lilac">
                  <div className="metric-card__label">Reservas Recientes</div>
                <div className="metric-card__value">{bookings.length}</div>
                <div className="metric-card__delta">Últimas 20</div>
              </div>
              {profile?.role === 'admin' && (
                <div className="metric-card metric-card--navy">
                  <div className="metric-card__label">Clientes Totales</div>
                  <div className="metric-card__value">{metrics.clientesTotales}</div>
                  <div className="metric-card__delta">Registrados</div>
                </div>
              )}
            </div>

            <h3>Reservas recientes</h3>
            {profileError && <p className="field-error">{profileError}</p>}
            {loading && <p>Cargando...</p>}
            {!loading && bookings.length === 0 && <p>No hay reservas visibles.</p>}
            <ul className="list">
              {bookings.map((b) => (
                <li key={b.id} className="card reserva-card">
                  <div className="reserva-card__head">
                    <div>
                      <strong>{b.serviceName || 'Servicio'}</strong>
                      <span className={`reserva-card__status reserva-card__status--${b.status}`}>
                        {RESERVA_STATUS_LABELS[b.status as ReservaStatus] || b.status}
                      </span>
                    </div>
                    <div className="reserva-card__when">
                      {b.date || ''} · {b.timeSlot || ''}
                    </div>
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="reserva-card__meta">
                      {b.userName || b.userId}
                      {b.userEmail ? ` · ${b.userEmail}` : ''}
                    </div>
                  )}
                   {b.notes && <div className="reserva-card__notes">{b.notes}</div>}
                   {profile?.role !== 'admin' && (b.status === 'pending' || b.status === 'confirmed') && b.id && (
                     <div className="reserva-card__actions">
                       {canShowReschedule(profile?.role, b.status, b.date, currentLocalDate) && (
                         editingReservaId === b.id ? (
                           <form
                             className="contact-form"
                             onSubmit={(event) => {
                               event.preventDefault()
                               void handleReschedule(b.id!)
                             }}
                           >
                             <div className="field-grid">
                               <div className="field">
                                 <label htmlFor={`reschedule-date-${b.id}`}>Nueva fecha</label>
                                 <input
                                   id={`reschedule-date-${b.id}`}
                                   type="date"
                                   min={currentLocalDate}
                                   value={rescheduleDate}
                                   onChange={(event) => setRescheduleDate(event.target.value)}
                                   disabled={reschedulingId === b.id || cancellingId === b.id}
                                   required
                                 />
                               </div>
                               <div className="field">
                                 <label htmlFor={`reschedule-time-${b.id}`}>Nuevo horario</label>
                                 <input
                                   id={`reschedule-time-${b.id}`}
                                   type="time"
                                   value={rescheduleTimeSlot}
                                   onChange={(event) => setRescheduleTimeSlot(event.target.value)}
                                   disabled={reschedulingId === b.id || cancellingId === b.id}
                                   required
                                 />
                               </div>
                             </div>
                             {rescheduleErrors[b.id] && (
                               <p className="field-error" role="alert">{rescheduleErrors[b.id]}</p>
                             )}
                             <div className="hero-actions">
                               <button
                                 className="btn btn-primary"
                                 type="submit"
                                 disabled={reschedulingId === b.id || cancellingId === b.id}
                               >
                                 {reschedulingId === b.id ? 'Guardando…' : 'Guardar cambio'}
                               </button>
                               <button
                                 className="btn btn-ghost"
                                 type="button"
                                 onClick={() => cancelReschedule(b.id!)}
                                 disabled={reschedulingId === b.id || cancellingId === b.id}
                               >
                                 Cancelar
                               </button>
                             </div>
                           </form>
                         ) : (
                           <button
                             className="btn btn-ghost"
                              type="button"
                              onClick={() => startReschedule(b)}
                               disabled={isRescheduleActionDisabled(
                                 b.id,
                                 cancellingId,
                                 editingReservaId,
                                 reschedulingId,
                               )}
                           >
                             Reagendar
                           </button>
                         )
                       )}
                       <button
                         className="btn btn-ghost"
                         type="button"
                         onClick={() => handleCancel(b.id!, b.serviceName || 'tu reserva')}
                         disabled={isReservationActionDisabled(b.id, cancellingId, reschedulingId)}
                       >
                        {cancellingId === b.id ? 'Cancelando…' : 'Cancelar reserva'}
                      </button>
                     </div>
                   )}
                   {profile?.role !== 'admin' && b.status === 'completed' && b.serviceId && (
                     <div className="reserva-card__actions">
                       <Link
                         className="btn btn-primary"
                         to={`/reservar?service=${encodeURIComponent(b.serviceId)}&timeSlot=${encodeURIComponent(b.timeSlot || '')}&date=${encodeURIComponent(b.date || '')}`}
                       >
                         Reservar de nuevo
                       </Link>
                     </div>
                   )}
                 </li>
              ))}
            </ul>
            {cancelError && <div className="field-error">{cancelError}</div>}

            {/* Admin-only: precios */}
            {profile?.role === 'admin' && (
              <div className="dashboard-admin-section">
                <AdminPrices />
              </div>
            )}
          </section>
      </AdminShell>
    </ProtectedRoute>
  )
}
