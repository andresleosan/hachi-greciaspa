import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { TESTIMONIALS } from './data'

/** Testimonios — carrusel emocional sin cards. Cita protagonista. */

const ROTATE_MS = 7000

export default function TestimonialCarousel() {
  const [index, setIndex] = useState(0)
  const timer = useRef<number | null>(null)
  const reduceMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  const go = useCallback((next: number) => {
    setIndex((next + TESTIMONIALS.length) % TESTIMONIALS.length)
  }, [])

  const restart = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length)
    }, ROTATE_MS)
  }, [])

  useEffect(() => {
    restart()
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [restart])

  const t = TESTIMONIALS[index]

  return (
    <section className="sl-testimonials" aria-labelledby="testimonios-luxe-title">
      <div className="sl-testimonial-heading">
        <p className="sl-eyebrow">Voces del spa</p>
        <h2
          id="testimonios-luxe-title"
          className="sl-testimonial-title"
        >
          Lo que dicen quienes ya vinieron.
        </h2>
      </div>

      <div className="sl-testimonial-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={index}
            className="sl-testimonial"
            initial={reduceMotion.current ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(6px)' }}
            animate={reduceMotion.current ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion.current ? { opacity: 0 } : { opacity: 0, y: -22, filter: 'blur(6px)' }}
            transition={{ duration: reduceMotion.current ? 0 : 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <blockquote>“{t.quote}”</blockquote>
            <figcaption>
              <span className="sl-testimonial-avatar" aria-hidden="true">
                {t.name.charAt(0)}
              </span>
              <strong>{t.name}</strong>
              <span>{t.detail}</span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      <div className="sl-testimonial-nav">
        <button
          type="button"
          className="sl-testimonial-arrow"
          aria-label="Testimonio anterior"
          onClick={() => {
            restart()
            go(index - 1)
          }}
        >
          ←
        </button>
        {TESTIMONIALS.map((item, i) => (
          <button
            key={item.name}
            type="button"
            className="sl-testimonial-dot"
            aria-current={i === index}
            aria-label={`Testimonio ${i + 1}`}
            onClick={() => {
              restart()
              go(i)
            }}
          />
        ))}
        <button
          type="button"
          className="sl-testimonial-arrow"
          aria-label="Testimonio siguiente"
          onClick={() => {
            restart()
            go(index + 1)
          }}
        >
          →
        </button>
      </div>
    </section>
  )
}
