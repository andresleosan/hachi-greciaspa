import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Servicios() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Servicios</h2>
            <p className="section-copy">Nuestro catálogo de servicios pensado para el bienestar de tu mascota.</p>
          </div>

          <div className="card-grid card-grid--services">
            <article className="service-card card">
              <div className="service-card__thumb"></div>
              <h3>Baño Completo</h3>
              <p>$300 MXN — 45 min</p>
              <div className="service-card__footer">
                <span>Incluye shampoo especializado</span>
                <a className="btn btn-pill btn-primary" href="#">Reservar</a>
              </div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
