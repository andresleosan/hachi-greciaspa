import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BRAND_ASSETS, publicAsset } from './assets'
import { getLogoReveal } from './logoHeroMotion'
import { loadMotion } from './motionRuntime'

const LazyLogoHero = lazy(() => import('./LogoHero'))

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
  cta,
  headingTag,
  aria,
}: {
  kicker: string
  lines: ReactNode[]
  copy?: string
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
        {cta && <div className="sl-scene-cta">{cta}</div>}
      </div>
    </section>
  )
}

/**
 * Hero cinematográfico: cuatro escenas en una línea de tiempo pinneada.
 * Cada transición abre la siguiente capa como una "puerta de luz"
 * (clip-path inset) mientras la anterior se disuelve.
 * Sin JS (o con reduced-motion) las escenas se ven apiladas en scroll normal.
 */
export default function CinematicHero({ onLogoVisibleChange }: { onLogoVisibleChange?: (visible: boolean) => void }) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled || !root.current) return

         root.current.classList.remove('sl-hero--preparing')
         root.current.classList.add('sl-hero--animated')
         root.current.style.setProperty('--logo-reveal-opacity', '0')
         root.current.style.setProperty('--logo-reveal-blur', '18px')
         ctx = gsap.context(() => {
           const scenes = gsap.utils.toArray<HTMLElement>('.sl-scene')
           const first = scenes[0]
           const firstInner = first.querySelector('.sl-scene-inner')

           gsap.set(scenes, { opacity: 0, clipPath: 'inset(0 0 100% 0)' })

            const tl = gsap.timeline({
            defaults: { ease: 'expo.out', duration: 1 },
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: '+=260%',
              scrub: 0.7,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
             },
           })

           tl.eventCallback('onUpdate', () => {
             const progress = tl.progress()
             const reveal = getLogoReveal(progress, false)
             root.current?.style.setProperty('--logo-progress', String(progress))
             root.current?.style.setProperty('--logo-reveal-opacity', String(reveal.opacity))
             root.current?.style.setProperty('--logo-reveal-scale', String(reveal.scale))
             root.current?.style.setProperty('--logo-reveal-blur', `${reveal.blur}px`)
             const logoVisible = reveal.opacity > 0
             root.current?.classList.toggle('sl-hero--logo-visible', logoVisible)
             onLogoVisibleChange?.(logoVisible)
           })

           // El primer tramo queda deliberadamente vacío para que el logo sea la primera revelación.
           tl.to({}, { duration: 1.35 })
           tl.fromTo(first, { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0%)', duration: 0.62 })
           tl.fromTo(firstInner, { opacity: 0, yPercent: 5 }, { opacity: 1, yPercent: 0, duration: 0.56 }, '<0.2')
           tl.from(first.querySelectorAll('.sl-hero-line'), { yPercent: 118, duration: 1.15, stagger: 0.14 }, '<0.12')
           tl.from(first.querySelector('.sl-hero-kicker'), { y: 18, opacity: 0, duration: 0.7 }, '<0.08')
           tl.from(first.querySelector('.sl-hero-copy'), { y: 24, opacity: 0, duration: 0.8 }, '<0.2')
           tl.from(first.querySelector('.sl-cta-row'), { y: 18, opacity: 0, duration: 0.6 }, '<0.2')

          for (let i = 1; i < scenes.length; i++) {
            const prev = scenes[i - 1]
            const next = scenes[i]
            const nextInner = next.querySelector('.sl-scene-inner')
            const nextLines = next.querySelectorAll('.sl-hero-line')

            tl.to(prev.querySelector('.sl-scene-inner'), { opacity: 0, yPercent: -5, duration: 0.5, ease: 'power2.in' }, '<0.12')
            tl.to(prev, { clipPath: 'inset(0 0 100% 0)', duration: 0.55, ease: 'power2.inOut' }, '<0.02')
            tl.fromTo(next, { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0% 0 0 0)', duration: 0.72, ease: 'expo.inOut' }, '<0.06')
            tl.fromTo(nextInner, { scale: 1.07, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.62, ease: 'expo.out' }, '<0.12')
            tl.from(nextLines, { yPercent: 118, duration: 0.95, stagger: 0.12 }, '<0.28')
            tl.from(next.querySelector('.sl-hero-kicker'), { y: 16, opacity: 0, duration: 0.5 }, '<0.08')
            tl.from(next.querySelector('.sl-hero-copy'), { y: 22, opacity: 0, duration: 0.6 }, '<0.3')
            tl.from(next.querySelector('.sl-cta-row'), { y: 18, opacity: 0, duration: 0.55 }, '<0.2')
          }

        }, root)
      })
      .catch(() => {
        /* reduced motion o error: contenido estático accesible */
        onLogoVisibleChange?.(true)
      })

    return () => {
      cancelled = true
      root.current?.classList.remove('sl-hero--preparing')
      root.current?.classList.remove('sl-hero--animated')
      ctx?.revert()
      onLogoVisibleChange?.(false)
    }
  }, [onLogoVisibleChange])

  return (
    <div className="sl-hero sl-hero--preparing" ref={root}>
      <div className="sl-hero-logo">
        <Suspense
          fallback={
            <img
              className="sl-logo-hero__fallback"
              src={publicAsset(BRAND_ASSETS.logo)}
              alt="Logo oficial Hachi y Grecia Spa"
            />
          }
        >
          <LazyLogoHero className="sl-logo-hero" logoSrc={publicAsset(BRAND_ASSETS.logo)} />
        </Suspense>
      </div>
      <SceneShell
        aria={{ label: 'Hachi y Grecia Spa — bienvenida' }}
        kicker="Hachi & Grecia Spa"
        headingTag="h1"
        lines={[<span key="r">Respira.</span>]}
        copy="Un espacio de calma diseñado para tu mejor amigo: baños, grooming, guardería y rituales de spa con productos premium."
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
              Agendar cita · Iniciar sesión
            </Link>
            <Link className="sl-btn" to="/servicios">
              Conocer servicios
            </Link>
          </span>
        }
      />
    </div>
  )
}
