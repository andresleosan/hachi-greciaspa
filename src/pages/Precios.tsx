import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PricesList from '../components/PricesList'

export default function Precios() {
  return (
    <>
      <Header />

      <main className="container page-content">
        <header className="page-header">
          <h1>Lista de Precios</h1>
          <p>Precios actualizados. Si eres administrador, edítalos desde el dashboard.</p>
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => window.print()}>Imprimir / Exportar PDF</button>
          </div>
        </header>

        <section>
          <div className="card-grid">
            <PricesList />
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
