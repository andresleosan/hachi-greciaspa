import React from 'react'

type Props = {
  title: string
  description?: string
  price?: string
  unit?: string
  img?: string
}

export default function ServiceCard({ title, description, price, unit, img }: Props) {
  return (
    <article className="service-card card">
      <div className="service-card__thumb">
        {img ? <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>

      <div>
        <div className="service-card__meta">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>

          {price && (
            <div className="service-card__price">
              {price}{unit ? <span style={{ fontSize: '0.7rem', marginLeft: 6 }}>{unit}</span> : null}
            </div>
          )}
        </div>

        <div className="service-card__footer">
          <div className="service-card__meta-left"></div>
          <div>
            <a className="btn btn-ghost" href="#">Ver detalles</a>
            <a className="btn btn-primary" href="#">Reservar</a>
          </div>
        </div>
      </div>
    </article>
  )
}
