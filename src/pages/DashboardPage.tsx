import React from 'react'
import ProtectedRoute from '../components/ProtectedRoute'

export default function DashboardPage() {
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
            <div className="dashboard-title"><strong>Dashboard</strong><span>Resumen y actividad</span></div>
          </header>
        </main>
      </div>
    </ProtectedRoute>
  )
}
