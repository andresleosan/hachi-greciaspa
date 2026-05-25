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
              <h1>Amor, cuidado y estilo para tu <span className="highlight">mejor amigo</span></h1>
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
                    <img src="/hachi-greciaspa.png" alt="Hachi & Grecia" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
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

        <section className="feature-strip container">
          <article>
            <strong>+500</strong>
            <span>Mascotas felices</span>
          </article>
          <article>
            <strong>5★</strong>
            <span>Reseñas positivas</span>
          </article>
          <article>
            <strong>+3 Años</strong>
            <span>De experiencia</span>
          </article>
        </section>
      </main>
      <Footer />
    </div>
  )
}
