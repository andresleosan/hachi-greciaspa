import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: React.ReactElement
  requireRole?: 'admin'
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="app-loader" role="status" aria-live="polite">Cargando sesión...</div>
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (requireRole === 'admin' && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
