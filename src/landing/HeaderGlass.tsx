import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_ASSETS, publicAsset } from './assets'
import { scrollToTop } from './motionRuntime'

/** Header de vidrio esmerilado — se vuelve opaco con el scroll. */

export default function HeaderGlass() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`sl-header${scrolled ? ' sl-header--scrolled' : ''}`}>
      <div className="sl-header-inner">
        <Link className="sl-brand" to="/" aria-label="Hachi & Grecia Spa — inicio" onClick={scrollToTop}>
          <span className="sl-brand-mark" aria-hidden="true">
            <img src={publicAsset(BRAND_ASSETS.logo)} alt="" />
          </span>
          <span className="sl-brand-wordmark" aria-hidden="true">
            <strong>Hachi &amp; Grecia</strong>
            <small>SPA CANINO</small>
          </span>
        </Link>

        <nav className="sl-nav" aria-label="Navegación principal">
          <Link className="sl-nav-link" to="/" onClick={scrollToTop}>Inicio</Link>
          <Link className="sl-nav-link" to="/servicios">Servicios</Link>
          <Link className="sl-nav-link" to="/precios">Precios</Link>
          <Link className="sl-nav-link" to="/equipo">Equipo</Link>
          <Link className="sl-nav-link" to="/galeria">Galería</Link>
          <Link className="sl-nav-link" to="/contacto">Contacto</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link className="sl-btn sl-btn--ghost sl-header-login" to="/login">Iniciar sesión</Link>
          <Link className="sl-btn sl-btn--primary sl-header-cta" to="/reservar">Agendar cita</Link>
        </div>
      </div>
    </header>
  )
}
