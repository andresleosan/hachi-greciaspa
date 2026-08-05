import { useEffect, useRef } from 'react'
import { loadMotion } from './motionRuntime'

const STORY = [
  {
    id: 'problema',
    tone: 'mute',
    word: 'El ruido',
    eyebrow: '01 · El punto de partida',
    title: 'El día a día no da tregua.',
    copy: 'El trabajo, las horas, la ciudad. El tiempo de calidad con tu mejor amigo se vuelve un lujo que ya casi no existe.',
    points: ['Estrés acumulado', 'Ansiedad y apuro', 'Agotamiento compartido'],
    img: '/tl.png',
    imgAlt: 'Perro esperando con calma en el spa',
    flip: false,
  },
  {
    id: 'transformacion',
    tone: 'warm',
    word: 'El cambio',
    eyebrow: '02 · El cambio',
    title: 'Un respiro cambia todo.',
    copy: 'Agua tibia, productos sin sulfatos, manos que saben. La primera señal de bienestar aparece en sus ojos.',
    points: ['Bienestar visible', 'Equilibrio', 'Relajación profunda'],
    img: '/bl.png',
    imgAlt: 'Mascota relajada durante el baño',
    flip: true,
  },
  {
    id: 'experiencia',
    tone: 'lux',
    word: 'El ritual',
    eyebrow: '03 · La experiencia',
    title: 'Masaje, aroma, cuidado.',
    copy: 'Baño profesional, aromaterapia, corte de uñas, mascarillas y masaje. Una secuencia completa diseñada como un ritual.',
    points: ['Masajes y aromaterapia', 'Cuidado de piel y pelo', 'Rituales completos'],
    img: '/tr.png',
    imgAlt: 'Ritual de grooming en el spa',
    flip: false,
  },
  {
    id: 'resultado',
    tone: 'lux',
    word: 'La calma',
    eyebrow: '04 · El resultado',
    title: 'Vuelve renovado.',
    copy: 'Pelo brillante, uñas cortas, fragancia de temporada y una energía distinta. La renovación se nota desde la puerta.',
    points: ['Renovación total', 'Pelo saludable', 'Días felices por delante'],
    img: '/hachi-greciaspa.png',
    imgAlt: 'Resultado final del cuidado en Hachi y Grecia Spa',
    flip: true,
  },
]

function StoryBlock({ story, index }: { story: (typeof STORY)[number]; index: number }) {
  const blockRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    loadMotion()
      .then(({ gsap }) => {
        if (cancelled || !blockRef.current) return
        ctx = gsap.context(() => {
          const el = blockRef.current!
          const media = el.querySelector('.sl-story-media')
          const img = el.querySelector('.sl-story-media img')
          const copy = el.querySelector('.sl-story-copy')
          const word = el.querySelector('.sl-story-word')

          gsap.fromTo(
            media,
            { clipPath: 'inset(12% 6% 12% 6%)', scale: 1.08 },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              scale: 1,
              ease: 'expo.out',
              duration: 1.3,
              scrollTrigger: { trigger: el, start: 'top 78%', end: 'top 30%', scrub: 0.7 },
            }
          )
          gsap.fromTo(
            img,
            { yPercent: -9 },
            {
              yPercent: 7,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
            }
          )
          gsap.fromTo(
            copy,
            { y: 46, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              ease: 'expo.out',
              duration: 1,
              scrollTrigger: { trigger: el, start: 'top 66%', end: 'top 34%', scrub: 0.7 },
            }
          )
          gsap.fromTo(
            word,
            { xPercent: index % 2 === 0 ? -14 : 10, opacity: 0.14 },
            {
              xPercent: index % 2 === 0 ? 10 : -14,
              opacity: 0.5,
              ease: 'none',
              scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
            }
          )
          gsap.fromTo(
            el.querySelectorAll('.sl-story-list li'),
            { y: 22, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              stagger: 0.12,
              ease: 'expo.out',
              duration: 0.8,
              scrollTrigger: { trigger: el, start: 'top 62%', end: 'top 38%', scrub: 0.6 },
            }
          )
        }, blockRef)
      })
      .catch(() => {
        /* reduced motion: contenido estático */
      })

    return () => {
      cancelled = true
      ctx?.revert()
    }
  }, [index])

  return (
    <section
      ref={blockRef}
      className={`sl-story sl-story--tone-${story.tone}${story.flip ? ' sl-story--flip' : ''}`}
      id={story.id}
    >
      <span className="sl-story-word" aria-hidden="true">
        {story.word}
      </span>
      <div className="sl-story-grid">
        <div className="sl-story-media sl-parallax">
          <img src={story.img} alt={story.imgAlt} loading="lazy" decoding="async" />
          <div className="sl-story-media-frame" aria-hidden="true" />
        </div>
        <div className="sl-story-copy">
          <p className="sl-eyebrow">{story.eyebrow}</p>
          <h2>{story.title}</h2>
          <p>{story.copy}</p>
          <ul className="sl-story-list">
            {story.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default function Storytelling() {
  return (
    <>
      {STORY.map((story, i) => (
        <StoryBlock key={story.id} story={story} index={i} />
      ))}
    </>
  )
}
