import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

const LandingNueva = lazy(() => import('./pages/LandingNueva'))
const Servicios = lazy(() => import('./pages/Servicios'))
const Precios = lazy(() => import('./pages/Precios'))
const Equipo = lazy(() => import('./pages/Equipo'))
const Galeria = lazy(() => import('./pages/Galeria'))
const Contacto = lazy(() => import('./pages/Contacto'))
const Reservar = lazy(() => import('./pages/Reservar'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DashboardAgenda = lazy(() => import('./pages/DashboardAgenda'))
const DashboardEmpleados = lazy(() => import('./pages/DashboardEmpleados'))
const DashboardMascotas = lazy(() => import('./pages/DashboardMascotas'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const NotFound = lazy(() => import('./pages/NotFound'))

function Loader() {
  return <div className="container section" style={{ textAlign: 'center', paddingTop: '4rem' }}>Cargando…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<LandingNueva />} />
          <Route path="/inicio" element={<Navigate to="/" replace />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/precios" element={<Precios />} />
          <Route path="/equipo" element={<Equipo />} />
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reservar" element={<Reservar />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/agenda" element={<DashboardAgenda />} />
          <Route path="/dashboard/empleados" element={<DashboardEmpleados />} />
          <Route path="/dashboard/mascotas" element={<DashboardMascotas />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
