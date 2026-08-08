import React from 'react'
import { Link } from 'react-router-dom'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-card">
          <strong>Hachi & Grecia Spa</strong>
          <p className="footer-note">
            Contacto: contacto@hachigreciasp.com —{' '}
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${WHATSAPP_DISPLAY}`}>
              WhatsApp: {WHATSAPP_DISPLAY}
            </a>
          </p>
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
