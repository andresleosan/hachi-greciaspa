import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Equipo() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Nuestro equipo</h2>
            <p className="section-copy">Profesionales certificados que cuidan a tu mascota con amor.</p>
          </div>

          <div className="card-grid card-grid--team">
            <article className="team-card card">
              <div className="team-card__visual"></div>
              <div>
                <div className="team-card__name">Harold Salcedo</div>
                <div className="team-card__role">Fundador · Groomer · Cuidador</div>
              </div>
            </article>

            <article className="team-card card">
              <div className="team-card__visual"></div>
              <div>
                <div className="team-card__name">Daniela Padilla</div>
                <div className="team-card__role">Groomer y Cuidadora</div>
              </div>
            </article>

            <article className="team-card card">
              <div className="team-card__visual"></div>
              <div>
                <div className="team-card__name">Alberto González</div>
                <div className="team-card__role">Bañador y Cuidador</div>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
