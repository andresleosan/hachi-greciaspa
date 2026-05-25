import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function Galeria() {
  return (
    <div>
      <Header />
      <main>
        <section className="section container">
          <div className="section-heading">
            <h2>Galería</h2>
            <p className="section-copy">Antes y después — ejemplos reales de nuestros trabajos.</p>
          </div>

          <div className="gallery-grid">
            <article className="gallery-tile gallery-tile--wide">
              <div className="gallery-tile__label">Baños & Grooming</div>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
