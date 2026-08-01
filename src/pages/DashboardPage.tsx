import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import AdminPrices from '../components/AdminPrices'
import { firebaseDb } from '../services/firebase'
import { collection, query, where, getDocs, orderBy, limit, count } from 'firebase/firestore'
import { startOfDay, endOfDay } from 'date-fns'
import type { Reserva, ReservaStatus } from '../types'
import { RESERVA_STATUS_LABELS } from '../types'
import { cancelMyReserva } from '../services/reservas'

interface Metrics {
  citasHoy: number
  serviciosHoy: number
  clientesTotales: number
}

export default function DashboardPage() {
  const [showSidebar, setShowSidebar] = useState(false)
  const { user, profile, error: profileError } = useAuth()
  const [bookings, setBookings] = useState<Reserva[]>([])
  const [metrics, setMetrics] = useState<Metrics>({ citasHoy: 0, serviciosHoy: 0, clientesTotales: 0 })
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)

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

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      const isAdmin = profile?.role === 'admin'
      const now = new Date()
      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)

      // Fetch today's bookings
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
        const todayServices = new Set<string>()
        let todayCount = 0

        snap.forEach((d) => {
          const data = d.data() as Omit<Reserva, 'id'>
          items.push({ id: d.id, ...data })

          // Count today's bookings
          const createdAt = data.createdAt?.toDate?.()
          if (createdAt && createdAt >= todayStart && createdAt <= todayEnd) {
            todayCount++
            if (data.serviceName) todayServices.add(data.serviceName)
          }
        })

        setBookings(items)

        // Fetch total users count (admin only)
        let clientesTotales = 0
        if (isAdmin) {
          const usersSnap = await getDocs(query(collection(firebaseDb, 'users'), count()))
          clientesTotales = usersSnap.data().count
        }

        setMetrics({
          citasHoy: todayCount,
          serviciosHoy: todayServices.size,
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
      <div className="dashboard-layout">
        <aside className={"dashboard-sidebar" + (showSidebar ? ' is-open' : '')}>
          <div className="sidebar-brand">
            <div className="sidebar-brand__mark">HG</div>
            <div className="sidebar-brand__copy"><strong>Hachi & Grecia</strong><small>Admin</small></div>
          </div>
          <nav className="sidebar-nav">
            <Link className="sidebar-link is-active" to="/dashboard"><span className="sidebar-link__icon">D</span> Dashboard</Link>
            <span className="sidebar-link is-disabled" aria-disabled="true"><span className="sidebar-link__icon">C</span> Citas <small className="sidebar-link__badge">próxim.</small></span>
            <span className="sidebar-link is-disabled" aria-disabled="true"><span className="sidebar-link__icon">U</span> Clientes <small className="sidebar-link__badge">próxim.</small></span>
            <Link className="sidebar-link" to="/servicios"><span className="sidebar-link__icon">S</span> Servicios</Link>
            <span className="sidebar-link is-disabled" aria-disabled="true"><span className="sidebar-link__icon">R</span> Reportes <small className="sidebar-link__badge">próxim.</small></span>
          </nav>

          <div className="sidebar-footer">
            <div>{profile?.displayName || user?.email}<br/><small>{profile?.role === 'admin' ? 'Administrador' : 'Cliente'}</small></div>
          </div>
        </aside>
        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <button className="btn btn-ghost sidebar-toggle" onClick={() => setShowSidebar((s) => !s)} aria-label="Toggle sidebar">☰</button>
            <div className="dashboard-topbar__banner">
              <img src="/dashboard_header_zoom.png" alt="Dashboard" />
            </div>
            <div className="dashboard-title"><strong>Dashboard</strong><span>Resumen y actividad</span></div>
          </header>

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
                <div className="metric-card__label">Reservas Totales</div>
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
                      <button
                        className="btn btn-ghost"
                        type="button"
                        onClick={() => handleCancel(b.id!, b.serviceName || 'tu reserva')}
                        disabled={cancellingId === b.id}
                      >
                        {cancellingId === b.id ? 'Cancelando…' : 'Cancelar reserva'}
                      </button>
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
        </main>
      </div>
    </ProtectedRoute>
  )
}
