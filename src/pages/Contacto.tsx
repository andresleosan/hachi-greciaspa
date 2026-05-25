import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Contacto() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Contacto</h2>
            <p className="section-copy">Escríbenos para agendar o solicitar más información.</p>
          </div>

          <div className="contact-layout">
            <form className="contact-card contact-form card" action="#" method="POST">
              <div className="field-grid">
                <div className="field"><label>Nombre</label><input name="nombre" /></div>
                <div className="field"><label>Teléfono</label><input name="telefono" /></div>
              </div>

              <div className="field"><label>Correo</label><input name="correo" type="email" /></div>
              <div className="field"><label>Mensaje</label><textarea name="mensaje"></textarea></div>
              <div className="field"><button className="btn btn-primary">Enviar mensaje</button></div>
            </form>

            <aside className="map-card card">
              <div className="map-canvas">
                <div className="map-pin"></div>
              </div>
              <p className="map-caption">Estamos en Roma Norte, CDMX</p>

              <div className="contact-info">
                <h4>Horarios</h4>
                <ul>
                  <li>Apertura: 08:00 — 19:00</li>
                  <li>Guardería: Lun–Vie 08:00 — 18:00</li>
                  <li>Spa: Lun–Vie 09:00 — 18:30; Sáb 09:00 — 17:00; Dom 10:00 — 16:00</li>
                  <li>Pensión: Check-in 11:00 am — Check-out 09:00 am</li>
                  <li>Tiempo por cita: entre 1 y 2 horas</li>
                </ul>

                <h4>Tarifas principales</h4>
                <ul>
                  <li>Guardería mensual (Lun–Vie 08:00–18:00): <strong>$3,500 MXN</strong></li>
                  <li>Pensión: <strong>$300 MXN</strong> (temporada baja) / <strong>$380 MXN</strong> (temporada alta)</li>
                  <li>Baños y Grooming: precio variable por peso y tipo de pelo (ver lista de precios)</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
