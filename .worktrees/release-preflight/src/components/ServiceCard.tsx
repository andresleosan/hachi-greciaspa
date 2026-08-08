import React from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  description?: string
  price?: string
  unit?: string
  img?: string
  serviceId?: string
}

export default function ServiceCard({ title, description, price, unit, img, serviceId }: Props) {
  const reservLink = serviceId ? `/reservar?service=${serviceId}` : '/reservar'
  return (
    <article className="service-card card">
      <div className="service-card__thumb">
        {img ? <img src={img} alt={title} /> : null}
      </div>

      <div>
        <div className="service-card__meta">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>

          {price && (
            <div className="service-card__price">
              {price}{unit ? <span className="service-card__price-unit">{unit}</span> : null}
            </div>
          )}
        </div>

        <div className="service-card__footer">
          <div className="service-card__meta-left"></div>
          <div>
            <Link className="btn btn-ghost" to="/precios">Ver precios</Link>
            <Link className="btn btn-primary" to={reservLink}>Reservar</Link>
          </div>
        </div>
      </div>
    </article>
  )
}
