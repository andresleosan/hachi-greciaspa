import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { loadMotion } from './motionRuntime'

function HeroLine({ children, tag = 'span' }: { children: ReactNode; tag?: 'span' | 'h1' | 'h2' }) {
  const Heading = tag === 'span' ? 'span' : tag === 'h1' ? 'h1' : 'h2'
  return (
    <span className="sl-hero-linewrap">
      <Heading className="sl-hero-line">{children}</Heading>
    </span>
  )
}

function SceneShell({
  kicker,
  lines,
  copy,
  meta,
  cta,
  headingTag,
  aria,
}: {
  kicker: string
  lines: ReactNode[]
  copy?: string
  meta?: string[]
  cta?: ReactNode
  headingTag?: 'h1' | 'h2'
  aria?: { label: string }
}) {
  return (
    <section className="sl-scene" aria-label={aria?.label}>
      <div className="sl-scene-vignette" aria-hidden="true" />
      <div className="sl-scene-inner">
        <p className="sl-hero-kicker">{kicker}</p>
        {lines.map((line, i) => (
          <HeroLine key={i} tag={headingTag === 'h1' && i === 0 ? 'h1' : 'h2'}>{line}</HeroLine>
        ))}
        {copy && <p className="sl-hero-copy">{copy}</p>}
        {cta && <div className="mt-9 flex gap-4 justify-center flex-wrap">{cta}</div>}
      </div>
      {meta && (
        <div className="sl-hero-meta" aria-hidden="true">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * Hero cinematográfico: cuatro escenas en una línea de tiempo pinneada.
 * Cada transición abre la siguiente capa como una "puerta de luz"
 * (clip-path inset) mientras la anterior se disuelve.
 * Sin JS (o con reduced-motion) las escenas se ven apiladas en scroll normal.
 */
export default function CinematicHero() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled || !root.current) return

        ctx = gsap.context(() => {
          const scenes = gsap.utils.toArray<HTMLElement>('.sl-scene')

          const tl = gsap.timeline({
            defaults: { ease: 'expo.out', duration: 1 },
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=340%',
              scrub: 0.7,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          const first = scenes[0]
          tl.from(first.querySelectorAll('.sl-hero-line'), { yPercent: 118, duration: 1.15, stagger: 0.14 }, 0)
          tl.from(first.querySelector('.sl-hero-kicker'), { y: 18, opacity: 0, duration: 0.7 }, 0.12)
          tl.from(first.querySelector('.sl-hero-copy'), { y: 24, opacity: 0, duration: 0.8 }, 0.5)
          tl.from(first.querySelector('.sl-hero-meta'), { opacity: 0, duration: 0.7 }, 0.95)
          tl.from(first.querySelector('.sl-cta-row'), { y: 18, opacity: 0, duration: 0.6 }, 0.65)

          for (let i = 1; i < scenes.length; i++) {
            const prev = scenes[i - 1]
            const next = scenes[i]
            const nextInner = next.querySelector('.sl-scene-inner')
            const nextLines = next.querySelectorAll('.sl-hero-line')

            tl.to(prev.querySelector('.sl-scene-inner'), { opacity: 0, yPercent: -5, duration: 0.5, ease: 'power2.in' }, '<0.12')
            tl.to(prev, { clipPath: 'inset(0 0 100% 0)', duration: 0.55, ease: 'power2.inOut' }, '<0.02')
            tl.fromTo(next, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 0.72, ease: 'expo.inOut' }, '<0.06')
            tl.fromTo(nextInner, { scale: 1.07, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.62, ease: 'expo.out' }, '<0.12')
            tl.from(nextLines, { yPercent: 118, duration: 0.95, stagger: 0.12 }, '<0.28')
            tl.from(next.querySelector('.sl-hero-kicker'), { y: 16, opacity: 0, duration: 0.5 }, '<0.08')
            tl.from(next.querySelector('.sl-hero-copy'), { y: 22, opacity: 0, duration: 0.6 }, '<0.3')
            tl.from(next.querySelector('.sl-cta-row'), { y: 18, opacity: 0, duration: 0.55 }, '<0.2')
            tl.from(next.querySelector('.sl-hero-meta'), { opacity: 0, duration: 0.6 }, '<0.3')
          }

          const last = scenes[scenes.length - 1]
          tl.to(last.querySelector('.sl-scene-inner'), { opacity: 0, yPercent: -4, duration: 0.55, ease: 'power2.in' }, '>-0.35')
          tl.to(last, { clipPath: 'inset(0 0 100% 0)', duration: 0.65, ease: 'power2.inOut' }, '<0.02')
        }, root)
      })
      .catch(() => {
        /* reduced motion o error: contenido estático accesible */
      })

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [])

  return (
    <div className="sl-hero" ref={root}>
      <SceneShell
        aria={{ label: 'Hachi y Grecia Spa — bienvenida' }}
        kicker="Hachi & Grecia Spa"
        headingTag="h1"
        lines={[<span key="r">Respira.</span>]}
        copy="Un espacio de calma diseñado para tu mejor amigo: baños, grooming, guardería y rituales de spa con productos premium."
        meta={['8+ años de experiencia', '1500+ peluditos felices', '5.0★']}
      />
      <SceneShell
        aria={{ label: 'Suelta el estrés' }}
        kicker="El mundo afuera"
        lines={[<span key="r">Suelta</span>, <span key="s">el estrés.</span>]}
        copy="Detrás queda el ruido. Aquí solo importa el agua tibia, el aroma y la calma de un espacio pensado para ellos."
      />
      <SceneShell
        aria={{ label: 'Reconecta con él' }}
        kicker="Tu tiempo juntos"
        lines={[<span key="r">Reconecta</span>, <span key="s">con él.</span>]}
        copy="Mientras su pelo se desenreda y su respiración se aquieta, vuelve ese vínculo que el día a día se lleva."
      />
      <SceneShell
        aria={{ label: 'La experiencia Hachi y Grecia' }}
        kicker="La experiencia"
        lines={[<span key="r">Hachi &amp; Grecia,</span>, <span key="s">el ritual.</span>]}
        copy="Cada visita es una secuencia cuidadosa: diagnóstico, baño, secado, corte, masaje y fragancia de temporada. Nada se deja al azar."
        cta={
          <span className="sl-cta-row flex gap-4 justify-center flex-wrap">
            <Link className="sl-btn sl-btn--primary" to="/reservar">
              Agendar cita
            </Link>
            <Link className="sl-btn" to="/servicios">
              Conocer servicios
            </Link>
          </span>
        }
        meta={['Baños · Grooming · Guardería', 'Pensión · Spa', 'Productos cruelty free']}
      />
      <div className="sl-scroll-cue" aria-hidden="true">
        Desliza
      </div>
    </div>
  )
}
