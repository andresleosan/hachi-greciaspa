import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

const Inicio = lazy(() => import('./pages/Inicio'))
const LandingNueva = lazy(() => import('./pages/LandingNueva'))
const Servicios = lazy(() => import('./pages/Servicios'))
const Precios = lazy(() => import('./pages/Precios'))
const Equipo = lazy(() => import('./pages/Equipo'))
const Galeria = lazy(() => import('./pages/Galeria'))
const Contacto = lazy(() => import('./pages/Contacto'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))

function Loader() {
  return <div className="container section" style={{ textAlign: 'center', paddingTop: '4rem' }}>Cargando…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/inicio" element={<LandingNueva />} />
          <Route path="/servicios" element={<Servicios />} />
          <Route path="/precios" element={<Precios />} />
          <Route path="/equipo" element={<Equipo />} />
          <Route path="/galeria" element={<Galeria />} />
          <Route path="/contacto" element={<Contacto />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
