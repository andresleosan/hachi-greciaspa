import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicLuxeShell from '../components/PublicLuxeShell'
import { loadMotion } from '../landing/motionRuntime'

const GALERIA_ITEMS = [
  { src: '/tl.png', alt: 'Baño y grooming — antes y después', label: 'Baño & Grooming', span: 'lg' },
  { src: '/tr.png', alt: 'Spa canino — tratamiento', label: 'Spa Day', span: 'sm', offset: true },
  { src: '/bl.png', alt: 'Corte de pelo profesional', label: 'Corte Profesional', span: 'sm' },
  { src: '/br.png', alt: 'Estilismo canino', label: 'Estilismo', span: 'lg', offset: true },
  { src: '/hachi-greciaspa.png', alt: 'Hachi & Grecia Spa — instalaciones', label: 'Nuestras instalaciones', span: 'wide' },
  { src: '/contact-sheet.png', alt: 'Trabajos realizados', label: 'Trabajos realizados', span: 'wide' },
]

export default function Galeria() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled || !rootRef.current) return
        ctx = gsap.context(() => {
          gsap.utils.toArray<HTMLElement>('.sl-gallery-item').forEach((item, i) => {
            const img = item.querySelector('img')
            const dir = i % 2 === 0 ? -7 : 7
            gsap.fromTo(
              item,
              { clipPath: 'inset(14% 8% 14% 8%)', y: 60, opacity: 0 },
              {
                clipPath: 'inset(0% 0% 0% 0%)',
                y: 0,
                opacity: 1,
                ease: 'expo.out',
                duration: 1.2,
                scrollTrigger: { trigger: item, start: 'top 88%', end: 'top 40%', scrub: 0.7 },
              }
            )
            if (img) {
              gsap.fromTo(
                img,
                { yPercent: dir },
                {
                  yPercent: -dir,
                  ease: 'none',
                  scrollTrigger: { trigger: item, start: 'top bottom', end: 'bottom top', scrub: 1 },
                }
              )
            }
          })
        }, rootRef)
      })
      .catch(() => {
        /* reduced motion: estático */
      })

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <PublicLuxeShell>
      <section ref={rootRef} className="sl-gallery sl-gallery-page" aria-labelledby="galeria-title">
          <div className="sl-gallery-head">
            <div>
              <p className="sl-eyebrow">Galería</p>
              <h2 id="galeria-title">Antes y después — el oficio.</h2>
            </div>
            <p className="sl-gallery-intro">
              Ejemplos reales de nuestros trabajos: baños, cortes y rituales completos.
            </p>
          </div>
          <div className="sl-gallery-grid">
            {GALERIA_ITEMS.map((item, i) => (
              <figure
                key={item.src + i}
                className={`sl-gallery-item sl-gallery-item--${item.span}${item.offset ? ' sl-gallery-item--offset' : ''}`}
              >
                <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
                <figcaption>{item.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="sl-gallery-cta">
            <Link className="sl-btn sl-btn--primary" to="/reservar">
              Reservar una cita
            </Link>
          </div>
      </section>
    </PublicLuxeShell>
  )
}
