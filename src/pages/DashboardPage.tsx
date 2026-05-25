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
        </aside>
        <main className="dashboard-main">
          <header className="dashboard-topbar">
            <div className="dashboard-topbar__banner">
              <img src="/dashboard_header_zoom.png" alt="Dashboard" style={{ width: '100%', borderRadius: 12 }} />
            </div>
            <div className="dashboard-title"><strong>Dashboard</strong><span>Resumen y actividad</span></div>
          </header>

          <section className="container">
            <div className="dashboard-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1rem' }}>
              <div className="card">Citas Hoy<br/><strong>12</strong></div>
              <div className="card">Ingresos Hoy<br/><strong>$8,450</strong></div>
              <div className="card">Servicios Hoy<br/><strong>18</strong></div>
              <div className="card">Clientes Totales<br/><strong>156</strong></div>
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
