import { useEffect, useRef } from 'react'
import { GALLERY } from './data'
import { loadMotion } from './motionRuntime'

/** Galería editorial — composición asimétrica con parallax y reveal. */

export default function EditorialGallery() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled || !rootRef.current) return
        ctx = gsap.context(() => {
          const root = rootRef.current!

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
    <section ref={rootRef} className="sl-gallery" aria-labelledby="galeria-luxe-title">
      <div className="sl-gallery-head">
        <div>
          <p className="sl-eyebrow">La galería</p>
          <h2 id="galeria-luxe-title">Un día dentro del spa.</h2>
        </div>
        <p className="sl-gallery-intro">
          Rituales, detalles y momentos de calma capturados entre baños, cortes y caricias.
        </p>
      </div>
      <div className="sl-gallery-grid">
        {GALLERY.map((item, i) => (
          <figure
            key={item.src + i}
            className={`sl-gallery-item sl-gallery-item--${item.span}${item.offset ? ' sl-gallery-item--offset' : ''}`}
          >
            <img src={item.src} alt={item.alt} loading="lazy" decoding="async" />
          </figure>
        ))}
      </div>
    </section>
  )
}
