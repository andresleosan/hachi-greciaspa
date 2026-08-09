import { useEffect, useRef } from 'react'
import { publicAsset, STORY_ASSETS } from './assets'
import { loadMotion } from './motionRuntime'

const storyImage = (index: number) => publicAsset(STORY_ASSETS[index].file)

const STORY = [
  {
    id: 'problema',
    tone: 'mute',
    eyebrow: '01 · El punto de partida',
    title: 'El día a día no da tregua.',
    copy: 'El trabajo, las horas, la ciudad. El tiempo de calidad con tu mejor amigo se vuelve un lujo que ya casi no existe.',
    points: ['Estrés acumulado', 'Ansiedad y apuro', 'Agotamiento compartido'],
    img: storyImage(0),
    imgAlt: 'Perro esperando con calma en Hachi y Grecia Spa',
    flip: false,
  },
  {
    id: 'transformacion',
    tone: 'warm',
    eyebrow: '02 · El cambio',
    title: 'Un respiro cambia todo.',
    copy: 'Agua tibia, productos sin sulfatos, manos que saben. La primera señal de bienestar aparece en sus ojos.',
    points: ['Bienestar visible', 'Equilibrio', 'Relajación profunda'],
    img: storyImage(1),
    imgAlt: 'Mascota relajada durante el baño en Hachi y Grecia Spa',
    flip: true,
  },
  {
    id: 'experiencia',
    tone: 'lux',
    eyebrow: '03 · La experiencia',
    title: 'Masaje, aroma, cuidado.',
    copy: 'Baño profesional, aromaterapia, corte de uñas, mascarillas y masaje. Una secuencia completa diseñada como un ritual.',
    points: ['Masajes y aromaterapia', 'Cuidado de piel y pelo', 'Rituales completos'],
    img: storyImage(2),
    imgAlt: 'Ritual de grooming en Hachi y Grecia Spa',
    flip: false,
  },
  {
    id: 'resultado',
    tone: 'lux',
    eyebrow: '04 · El resultado',
    title: 'Vuelve renovado.',
    copy: 'Pelo brillante, uñas cortas, fragancia de temporada y una energía distinta. La renovación se nota desde la puerta.',
    points: ['Renovación total', 'Pelo saludable', 'Días felices por delante'],
    img: storyImage(3),
    imgAlt: 'Resultado final del cuidado en Hachi y Grecia Spa',
    flip: true,
  },
]

function StoryBlock({ story }: { story: (typeof STORY)[number] }) {
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
  }, [])

  return (
    <section
      ref={blockRef}
      className={`sl-story sl-story--tone-${story.tone}${story.flip ? ' sl-story--flip' : ''}`}
      id={story.id}
    >
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
      {STORY.map((story) => (
        <StoryBlock key={story.id} story={story} />
      ))}
    </>
  )
}
