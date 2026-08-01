import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'

const GALERIA_ITEMS = [
  { src: '/tl.png', alt: 'Baño y grooming - antes y después', label: 'Baño & Grooming' },
  { src: '/tr.png', alt: 'Spa canino - tratamiento', label: 'Spa Day' },
  { src: '/bl.png', alt: 'Corte de pelo profesional', label: 'Corte Profesional' },
  { src: '/br.png', alt: 'Estilismo canino', label: 'Estilismo' },
  { src: '/hachi-greciaspa.png', alt: 'Hachi & Grecia Spa - instalaciones', label: 'Nuestras Instalaciones' },
  { src: '/contact-sheet.png', alt: 'Trabajos realizados', label: 'Trabajos Realizados' },
]

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
            {GALERIA_ITEMS.map((item, i) => (
              <article key={i} className="gallery-tile">
                <img src={item.src} alt={item.alt} className="gallery-tile__img" />
                <div className="gallery-tile__label">{item.label}</div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
