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
              <p className="map-caption">Estamos en Roma Norte, CDMX — abre de Lunes a Sábado</p>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
