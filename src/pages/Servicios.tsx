import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PricesList from '../components/PricesList'
import ServiceCard from '../components/ServiceCard'

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
            <PricesList />

            <ServiceCard
              title="Baño Completo"
              description="Baño, secado, limpieza de oídos y corte de uñas."
              price="$300"
              unit="MXN"
              img="/tl.png"
            />

            <ServiceCard
              title="Grooming Premium"
              description="Corte estético completo, baño premium y secado especial."
              price="$600"
              unit="MXN"
              img="/tr.png"
            />

            <ServiceCard
              title="Guardería por Día"
              description="Cuidado diurno con actividades y socialización."
              price="$250"
              unit="/día"
              img="/bl.png"
            />

            <ServiceCard
              title="Pensión Nocturna"
              description="Alojamiento nocturno supervisado con alimentación."
              price="$400"
              unit="/noche"
              img="/br.png"
            />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
