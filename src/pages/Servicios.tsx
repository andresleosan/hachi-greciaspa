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
            <p className="section-copy">Nuestro catálogo de servicios pensado para el bienestar de tu mascota. Los precios de baño y grooming varían según peso, tipo de pelo y condición.</p>
          </div>

          <div className="card-grid card-grid--services">
            <article className="service-card card">
              <h3>Baño</h3>
              <p>Precio variable — calculado por peso, tipo de pelo y condición. Ejemplos en la lista de precios.</p>
            </article>

            <article className="service-card card">
              <h3>Grooming</h3>
              <p>Precio variable según corte y tiempo. Se cotiza en recepción o al agendar.</p>
            </article>

            <article className="service-card card">
              <h3>Guardería (plan mensual)</h3>
              <p>Plan mensual — Lunes a Viernes (hábiles) 08:00 — 18:00 — <strong>$3,500 MXN</strong></p>
            </article>

            <article className="service-card card">
              <h3>Pensión (por noche)</h3>
              <p>Temporada baja: <strong>$300 MXN / noche</strong> — Temporada alta: <strong>$380 MXN / noche</strong></p>
              <p>Check-in 11:00 am — Check-out 09:00 am</p>
            </article>

            <article className="service-card card">
              <h3>Extras</h3>
              <p>Servicios adicionales y complementos (snacks especiales, medicamentos, baños extra) aparecen en la lista de precios.</p>
            </article>

            <article className="service-card card">
              <h3>Horarios y citas</h3>
              <p>Spa: Lun–Vie 09:00–18:30, Sáb 09:00–17:00, Dom 10:00–16:00. Apertura: 08:00–19:00. Tiempo por cita: 1–2 horas.</p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
