import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface Props {
  children: JSX.Element
  requireRole?: 'admin'
}

export default function ProtectedRoute({ children, requireRole }: Props) {
  const { user, profile, loading } = useAuth()

  if (loading) return <div />
  if (!user) return <Navigate to="/login" replace />

  if (requireRole === 'admin' && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
