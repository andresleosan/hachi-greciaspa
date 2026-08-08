import { Link } from 'react-router-dom'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'

/** Footer editorial — consistente con la experiencia luxe. */

export default function FooterGlass() {
  return (
    <footer className="sl-footer">
      <div className="sl-footer-inner">
        <div>
          <h4>Hachi &amp; Grecia Spa</h4>
          <p>Baños · Grooming · Guardería · Pensión · Spa</p>
          <p>
            contacto@hachigreciasp.com —{' '}
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${WHATSAPP_DISPLAY}`}>
              WhatsApp: {WHATSAPP_DISPLAY}
            </a>
          </p>
        </div>
        <div>
          <h4>Explora</h4>
          <p>
            <Link to="/servicios">Servicios</Link>
          </p>
          <p>
            <Link to="/precios">Precios</Link>
          </p>
          <p>
            <Link to="/galeria">Galería</Link>
          </p>
          <p>
            <Link to="/reservar">Reservar cita</Link>
          </p>
        </div>
        <div>
          <h4>Información</h4>
          <p>
            <Link to="/equipo">Equipo</Link>
          </p>
          <p>
            <Link to="/contacto">Contacto</Link>
          </p>
          <p>
            <Link to="/login">Acceso</Link>
          </p>
        </div>
      </div>
      <div className="sl-footer-bottom">
        <span>© {new Date().getFullYear()} Hachi &amp; Grecia Spa</span>
        <span>Lun – Dom · 08:00 am – 07:00 pm</span>
      </div>
    </footer>
  )
}
