import React, { useEffect, useState } from 'react'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../hooks/useAuth'
import AdminPrices from '../components/AdminPrices'
import { firebaseDb } from '../services/firebase'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      setLoading(true)

      // If admin, fetch recent bookings; otherwise fetch user's bookings
      // Role checks are enforced server-side by Firestore rules.
      const reservasRef = collection(firebaseDb, 'reservas')
      let q
      // Try to detect admin via custom claim if present on the token
      const isAdmin = (user as any)?.admin || (user as any)?.role === 'admin'

      if (isAdmin) {
        q = query(reservasRef, orderBy('createdAt', 'desc'), limit(20))
      } else {
        q = query(reservasRef, where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(20))
      }

      try {
        const snap = await getDocs(q)
        const items: any[] = []
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }))
        setBookings(items)
      } catch (e) {
        // ignore; rules may deny access if not authorized
        setBookings([])
      }

      setLoading(false)
    }

    load()
  }, [user])

  return (
    <ProtectedRoute>
      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand__mark">HG</div>
            <div className="sidebar-brand__copy"><strong>Hachi & Grecia</strong><small>Admin</small></div>
          </div>
          <nav className="sidebar-nav">
            <a className="sidebar-link is-active" href="#">Dashboard</a>
            <a className="sidebar-link" href="#">Citas</a>
            <a className="sidebar-link" href="#">Clientes</a>
            <a className="sidebar-link" href="#">Servicios</a>
            <a className="sidebar-link" href="#">Reportes</a>
          </nav>

          <div className="sidebar-footer">
            <div>Ana López<br/><small>Administrador</small></div>
          </div>
        </aside>
        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__banner">
              <img src="/dashboard_header_zoom.png" alt="Dashboard" style={{ width: '100%', borderRadius: 12 }} />
            </div>
            <div className="dashboard-title"><strong>Dashboard</strong><span>Resumen y actividad</span></div>
          </header>

          <section className="container">
            <div className="metric-grid" style={{ marginBottom: '1rem' }}>
              <div className="metric-card metric-card--teal">
                <div className="metric-card__label">Citas Hoy</div>
                <div className="metric-card__value">12</div>
                <div className="metric-card__delta">Ver detalles</div>
              </div>
              <div className="metric-card metric-card--rose">
                <div className="metric-card__label">Ingresos Hoy</div>
                <div className="metric-card__value">$8,450</div>
                <div className="metric-card__delta">+12% vs ayer</div>
              </div>
              <div className="metric-card metric-card--lilac">
                <div className="metric-card__label">Servicios Hoy</div>
                <div className="metric-card__value">18</div>
                <div className="metric-card__delta">Ver servicios</div>
              </div>
              <div className="metric-card metric-card--navy">
                <div className="metric-card__label">Clientes Totales</div>
                <div className="metric-card__value">156</div>
                <div className="metric-card__delta">Ver clientes</div>
              </div>
            </div>

            <h3>Reservas recientes</h3>
            {loading && <p>Cargando...</p>}
            {!loading && bookings.length === 0 && <p>No hay reservas visibles.</p>}
            <ul className="list">
              {bookings.map((b) => (
                <li key={b.id} className="card">
                  <div><strong>{b.serviceName || 'Servicio'}</strong></div>
                  <div>{b.userName || b.userId}</div>
                  <div>{b.date || ''}</div>
                </li>
              ))}
            </ul>

            {/* Admin-only: precios */}
            {profile?.role === 'admin' && (
              <div style={{ marginTop: '1rem' }}>
                <AdminPrices />
              </div>
            )}
          </section>
        </main>
      </div>
    </ProtectedRoute>
  )
}
