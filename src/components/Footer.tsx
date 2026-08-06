import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-card">
          <strong>Hachi & Grecia Spa</strong>
          <p className="footer-note">Contacto: contacto@hachigreciasp.com — +52 55 1234 5678</p>
        </div>
        <div className="footer-links">
          <span className="footer-link footer-link--pending" aria-disabled="true">Términos <small>próximamente</small></span>
          <span className="footer-link footer-link--pending" aria-disabled="true">Privacidad <small>próximamente</small></span>
        </div>
        <div className="footer-links">
          <Link className="footer-link" to="/servicios">Servicios</Link>
          <Link className="footer-link" to="/equipo">Equipo</Link>
        </div>
        <div className="footer-links">
          <Link className="footer-link" to="/contacto#ubicacion">Ubicación</Link>
          <Link className="footer-link" to="/contacto#horarios">Horario</Link>
        </div>
      </div>
    </footer>
  )
}
