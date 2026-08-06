import React from 'react'
import PublicLuxeShell from '../components/PublicLuxeShell'
import PricesList from '../components/PricesList'

export default function Precios() {
  return (
    <PublicLuxeShell>
      <section className="sl-catalog sl-page-section" aria-labelledby="precios-title">
        <header className="sl-catalog-head">
          <div>
            <p className="sl-eyebrow">Tarifario</p>
            <h1 id="precios-title">El ritual, a tu medida.</h1>
            <p>Precios actualizados para baños, grooming, guardería, pensión y spa.</p>
          </div>
          <button className="sl-btn sl-btn--primary" type="button" onClick={() => window.print()}>
            Imprimir / Exportar PDF
          </button>
        </header>
        <PricesList />
      </section>
    </PublicLuxeShell>
  )
}
