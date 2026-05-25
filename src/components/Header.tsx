import React from 'react'
import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <div className="brand-mark">HG</div>
          <div className="brand-copy"><strong>Hachi & Grecia</strong><small>Spa Canino</small></div>
        </div>

        <nav className="main-nav" aria-label="Main navigation">
          <Link className="nav-link" to="/">Inicio</Link>
          <Link className="nav-link" to="/servicios">Servicios</Link>
          <Link className="nav-link" to="/precios">Precios</Link>
          <Link className="nav-link" to="/equipo">Equipo</Link>
          <Link className="nav-link" to="/galeria">Galería</Link>
          <Link className="nav-link" to="/contacto">Contacto</Link>
        </nav>

        <div className="header-actions">
          <Link className="btn btn-ghost" to="/login">Iniciar sesión</Link>
          <Link className="btn btn-primary" to="/agendar">Agendar cita</Link>
        </div>
      </div>
    </header>
  )
}
