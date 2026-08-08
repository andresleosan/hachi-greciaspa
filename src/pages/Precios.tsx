import React from 'react'
import PublicLuxeShell from '../components/PublicLuxeShell'
import PricesList from '../components/PricesList'
import { WHATSAPP_URL } from '../config/contact'
import { COMMERCIAL_NOTES } from '../landing/data'

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
        <aside className="sl-contact-info" aria-labelledby="precios-notes-title">
          <h2 id="precios-notes-title">Antes de agendar</h2>
          <ul>
            {COMMERCIAL_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <p>
            <a className="sl-btn sl-btn--primary" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Consultar por WhatsApp
            </a>
          </p>
        </aside>
      </section>
    </PublicLuxeShell>
  )
}
