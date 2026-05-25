import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Inicio() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container hero">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">Spa & Guardería</div>
              <h1>Amor, cuidado y estilo para tu mejor amigo</h1>
              <p className="hero-lede">Peluquería, grooming y guardería de lujo en Roma Norte — tratamientos profesionales, ambiente seguro y cariño certificado.</p>

              <div className="hero-actions">
                <a className="btn btn-primary" href="#">Agendar cita</a>
                <a className="btn btn-secondary" href="/servicios">Ver servicios</a>
              </div>

              <ul className="check-list">
                <li>Baño completo y cepillado</li>
                <li>Grooming premium</li>
                <li>Guardería diurna segura</li>
                <li>Pensión nocturna supervisada</li>
              </ul>
            </div>

            <aside className="hero-visual">
              <div className="visual-orb visual-orb--teal"></div>
              <div className="visual-orb visual-orb--rose"></div>

              <div className="visual-card">
                <div className="visual-card__ribbon">Nuestro favorito</div>
                <div className="pet-window">
                  <div className="pet-window__illustration">
                    <div className="pet-face"></div>
                  </div>
                </div>

                <div className="visual-card__footer">
                  <div>
                    <strong>Hachi & Grecia Spa</strong>
                    <span>Roma Norte, CDMX</span>
                  </div>
                  <div>
                    <a className="btn btn-primary" href="#">Reservar</a>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
