import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth()

  // user === undefined -> still checking
  if (user === undefined) return <div />
  if (!user) return <Navigate to="/login" replace />
  return children
}
