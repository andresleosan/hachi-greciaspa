import React from 'react'
import { Link } from 'react-router-dom'
import PublicLuxeShell from '../components/PublicLuxeShell'
import { WHATSAPP_URL } from '../config/contact'
import {
  COMMERCIAL_NOTES,
  EXTRAS_LIST,
  PRICING_SPA,
  SERVICE_PRICE_LABELS,
  SERVICES,
} from '../landing/data'
import { publicAsset, SERVICE_ASSETS } from '../landing/assets'

function PriceTable({ title, items }: { title: string; items: typeof PRICING_SPA.short }) {
  return (
    <div className="sl-service-price-block">
      <h3>{title}</h3>
      <table className="sl-service-price-table">
        <thead>
          <tr>
            <th scope="col">Tamaño</th>
            <th scope="col">Peso</th>
            <th scope="col">Precio</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${title}-${item.size}`}>
              <th scope="row">{item.size}</th>
              <td>{item.weight}</td>
              <td>{item.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const SERVICE_ROWS = [
  {
    id: 'grooming',
    title: SERVICES[1].title,
    description: SERVICES[1].desc,
    note: SERVICES[1].note,
    price: SERVICE_PRICE_LABELS.grooming,
    image: SERVICE_ASSETS[1],
  },
  {
    id: 'guarderia',
    title: SERVICES[2].title,
    description: SERVICES[2].desc,
    note: SERVICES[2].note,
    price: SERVICE_PRICE_LABELS.guarderia,
    image: SERVICE_ASSETS[2],
  },
  {
    id: 'pension',
    title: SERVICES[3].title,
    description: SERVICES[3].desc,
    note: SERVICES[3].note,
    price: SERVICE_PRICE_LABELS.pension,
    image: SERVICE_ASSETS[3],
  },
] as const

export default function Servicios() {
  return (
    <PublicLuxeShell>
      <section className="sl-services sl-page-section" aria-labelledby="servicios-title">
        <header className="sl-services-head">
          <div>
            <p className="sl-eyebrow">Servicios y tarifas</p>
            <h1 id="servicios-title">El bienestar también se agenda.</h1>
            <p className="sl-page-lede">
              Baño, grooming, estancia y cuidados extra para que cada visita se sienta como un ritual.
              Consulta el tarifario vigente antes de reservar.
            </p>
          </div>
          <div className="sl-services-head__actions">
            <Link className="sl-btn sl-btn--primary" to="/reservar">Agendar cita</Link>
            <a className="sl-btn sl-btn--quiet" href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              Resolver una duda
            </a>
          </div>
        </header>

        <div className="sl-services-intro">
          <figure className="sl-services-intro__media">
            <img src={publicAsset(SERVICE_ASSETS[0].file)} alt="Spa Day en Hachi y Grecia Spa" />
          </figure>
          <div className="sl-services-intro__copy">
            <p className="sl-eyebrow">01 / Spa Day</p>
            <h2>Una pausa completa para tu peludo.</h2>
            <p>{SERVICES[0].desc}</p>
            <p className="sl-services-intro__note">{SERVICES[0].note}</p>
            <p className="sl-services-intro__price">{SERVICE_PRICE_LABELS['spa-day']}</p>
          </div>
        </div>

        <section className="sl-service-pricing" aria-labelledby="spa-day-prices">
          <div className="sl-services-section-head">
            <div>
              <p className="sl-eyebrow">Tarifario</p>
              <h2 id="spa-day-prices">Spa Day según tamaño y tipo de pelo.</h2>
            </div>
            <p>El precio se determina por el peso de tu mascota y si su pelo es corto o largo sin nudos.</p>
          </div>
          <div className="sl-service-price-grid">
            <PriceTable title="Pelo corto" items={PRICING_SPA.short} />
            <PriceTable title="Pelo largo sin nudos" items={PRICING_SPA.long} />
          </div>
        </section>

        <section className="sl-services-rows" aria-labelledby="other-services-title">
          <div className="sl-services-section-head">
            <div>
              <p className="sl-eyebrow">02 / Más cuidados</p>
              <h2 id="other-services-title">Servicios que acompañan su rutina.</h2>
            </div>
            <p>Elige el cuidado que mejor se adapta al momento de tu mascota.</p>
          </div>
          <div className="sl-service-row-list">
            {SERVICE_ROWS.map((service, index) => (
              <article className={`sl-service-row${index % 2 ? ' sl-service-row--reverse' : ''}`} key={service.id}>
                <div className="sl-service-row__media">
                  <img src={publicAsset(service.image.file)} alt={`${service.title} en Hachi y Grecia Spa`} />
                </div>
                <div className="sl-service-row__copy">
                  <p className="sl-eyebrow">0{index + 2} / Servicio</p>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <p className="sl-service-row__note">{service.note}</p>
                  <div className="sl-service-row__footer">
                    <strong>{service.price}</strong>
                    <Link className="sl-text-link" to={`/reservar?service=${service.id}`}>Reservar este cuidado</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sl-extras" aria-labelledby="extras-title">
          <div className="sl-services-section-head">
            <div>
              <p className="sl-eyebrow">05 / Rituales extra</p>
              <h2 id="extras-title">Pequeños detalles, gran diferencia.</h2>
            </div>
            <p>Agrega tratamientos y cuidados adicionales a la visita de tu mascota.</p>
          </div>
          <ul className="sl-extra-list">
            {EXTRAS_LIST.map((extra) => (
              <li key={extra.name}>
                <span>{extra.name}</span>
                <strong>{extra.price}</strong>
              </li>
            ))}
          </ul>
        </section>

        <aside className="sl-services-notes" aria-labelledby="service-notes-title">
          <div>
            <p className="sl-eyebrow">Antes de agendar</p>
            <h2 id="service-notes-title">Un cuidado más consciente.</h2>
          </div>
          <ul>
            {COMMERCIAL_NOTES.map((note) => <li key={note}>{note}</li>)}
          </ul>
          <Link className="sl-btn sl-btn--primary" to="/reservar">Elegir fecha y horario</Link>
        </aside>
      </section>
    </PublicLuxeShell>
  )
}
