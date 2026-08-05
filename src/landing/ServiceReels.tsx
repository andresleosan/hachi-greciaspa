import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { SERVICES, PRICING_SPA } from './data'
import { loadMotion } from './motionRuntime'

const REEL_IMAGES = ['/tr.png', '/br.png', '/bl.png', '/tl.png', '/hachi-greciaspa.png']

const REEL_SERVICE_IDS = ['spa-day', 'grooming', 'guarderia', 'pension']

function ReelPricing() {
  const shortFrom = PRICING_SPA.short[0].price
  const longFrom = PRICING_SPA.long[0].price
  return (
    <div className="sl-reel-table" aria-label="Precios de Spa Day">
      {[
        { label: 'Pelo corto — Mini a Grande', from: `desde ${shortFrom}` },
        { label: 'Pelo largo — Mini a Grande', from: `desde ${longFrom}` },
      ].map((row) => (
        <div className="sl-reel-table-row" key={row.label}>
          <span>{row.label}</span>
          <strong>{row.from}</strong>
        </div>
      ))}
    </div>
  )
}

function Reel({
  service,
  image,
  flip,
  index,
}: {
  service: (typeof SERVICES)[number]
  image: string
  flip: boolean
  index: number
}) {
  const reelRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled || !reelRef.current) return
        ctx = gsap.context(() => {
          const el = reelRef.current!
          const media = el.querySelector('.sl-reel-media')
          const img = el.querySelector('.sl-reel-media img')

          gsap.fromTo(
            media,
            { clipPath: 'inset(10% 8% 10% 8%)', scale: 1.1 },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              scale: 1,
              ease: 'expo.out',
              duration: 1.35,
              scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 34%', scrub: 0.7 },
            }
          )
          gsap.fromTo(
            img,
            { yPercent: -8, scale: 1.12 },
            {
              yPercent: 6,
              scale: 1.04,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.9 },
            }
          )
          gsap.fromTo(
            el.querySelectorAll('.sl-reel-copy > *'),
            { y: 42, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.09,
              ease: 'expo.out',
              duration: 0.9,
              scrollTrigger: { trigger: el, start: 'top 68%', end: 'top 36%', scrub: 0.6 },
            }
          )
        }, reelRef)
      })
      .catch(() => {
        /* reduced motion: estático */
      })

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  const num = String(index + 1).padStart(2, '0')

  return (
    <section ref={reelRef} className={`sl-reel${flip ? ' sl-reel--flip' : ''}`} id={`servicio-${index}`}>
      <div className="sl-reel-inner">
        <div className="sl-reel-media">
          <span className="sl-reel-index" aria-hidden="true">
            {num}
          </span>
          <img src={image} alt={service.title} loading="lazy" decoding="async" />
        </div>
        <div className="sl-reel-copy">
          <p className="sl-eyebrow">El servicio {num}</p>
          <h3>{service.title}</h3>
          <p>{service.desc}</p>
          {service.price ? (
            <div className="sl-reel-price">
              <strong>{service.price}</strong>
              {service.note && <span>{service.note}</span>}
            </div>
          ) : null}
          {service.pricing ? <ReelPricing /> : null}
          {service.extras ? (
            <div className="sl-reel-table" aria-label="Servicios extras">
              {service.extras.slice(0, 6).map((e) => (
                <div className="sl-reel-table-row" key={e.name}>
                  <span>{e.name}</span>
                  <strong>{e.price}</strong>
                </div>
              ))}
            </div>
          ) : null}
          {!service.price && !service.pricing && !service.extras && service.note ? (
            <div className="sl-reel-price">
              <strong>Variable</strong>
              <span>{service.note}</span>
            </div>
          ) : null}
          <div className="sl-reel-cta">
            <Link
              className="sl-btn sl-btn--primary"
              to={REEL_SERVICE_IDS[index] ? `/reservar?service=${REEL_SERVICE_IDS[index]}` : '/reservar'}
            >
              Reservar {service.title.toLowerCase()}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function ServiceReels() {
  const rootRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={rootRef}>
      {SERVICES.map((service, i) => (
        <Reel
          key={service.title}
          service={service}
          image={REEL_IMAGES[i % REEL_IMAGES.length]}
          flip={i % 2 === 1}
          index={i}
        />
      ))}
    </div>
  )
}
