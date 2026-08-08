import React from 'react'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-card">
          <strong>Hachi & Grecia Spa</strong>
          <p className="footer-note">Contacto: contacto@hachigreciasp.com — +52 55 1234 5678</p>
        </div>
        <div className="footer-links">
          <a href="#">Términos</a>
          <a href="#">Privacidad</a>
        </div>
        <div className="footer-links">
          <a href="#">Servicios</a>
          <a href="#">Equipo</a>
        </div>
        <div className="footer-links">
          <a href="#">Ubicación</a>
          <a href="#">Horario</a>
        </div>
      </div>
    </footer>
  )
}
