import { useEffect, useRef, useState } from 'react'
import AuroraBackground from '../landing/AuroraBackground'
import HeaderGlass from '../landing/HeaderGlass'
import FooterGlass from '../landing/FooterGlass'
import CinematicHero from '../landing/CinematicHero'
import Storytelling from '../landing/Storytelling'
import ServiceReels from '../landing/ServiceReels'
import EditorialGallery from '../landing/EditorialGallery'
import TestimonialCarousel from '../landing/TestimonialCarousel'
import { ScheduleSectionLuxe, TeamSectionLuxe, FAQSectionLuxe, CTASectionLuxe } from '../landing/SectionsLuxe'
import { disposeMotion } from '../landing/motionRuntime'
import { WHATSAPP_DISPLAY, WHATSAPP_URL } from '../config/contact'

/** Halo de luz que sigue al cursor (solo punteros finos, sin reduced-motion). */
function CursorHalo() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!window.matchMedia('(pointer: fine)').matches) return

    let raf = 0
    let x = -600
    let y = -600
    let cx = -600
    let cy = -600

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
    }
    const loop = () => {
      cx += (x - cx) * 0.085
      cy += (y - cy) * 0.085
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`
      raf = requestAnimationFrame(loop)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div ref={ref} className="sl-cursor" aria-hidden="true" />
}

export default function LandingNueva() {
  const [whatsappVisible, setWhatsappVisible] = useState(false)

  useEffect(() => {
    document.body.classList.add('sl-anim-ready')
    return () => {
      document.body.classList.remove('sl-anim-ready')
      disposeMotion()
    }
  }, [])

  return (
    <div className="luxe">
      <CursorHalo />
      <AuroraBackground />
      <HeaderGlass />
      <main>
        <CinematicHero onLogoVisibleChange={setWhatsappVisible} />
        <Storytelling />
        <ServiceReels />
        <EditorialGallery />
        <TestimonialCarousel />
        <ScheduleSectionLuxe />
        <TeamSectionLuxe />
        <FAQSectionLuxe />
        <CTASectionLuxe />
      </main>
      <div
        className={`sl-scroll-cue${whatsappVisible ? ' sl-scroll-cue--visible' : ''}`}
        aria-label="Desliza para continuar"
      >
        <span className="sl-scroll-label">Desliza</span>
        <span className="sl-scroll-arrow" aria-hidden="true" />
      </div>
      <a
        className={`sl-btn sl-btn--primary sl-hero-whatsapp${whatsappVisible ? ' sl-hero-whatsapp--visible' : ''}`}
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        aria-label={`Escribir por WhatsApp al ${WHATSAPP_DISPLAY}`}
        title="Escribir por WhatsApp"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M17.5 6.5A7.7 7.7 0 0 0 5.7 15l-1 3.3 3.4-.9a7.7 7.7 0 0 0 9.4-10.9Zm-5.4 12.1a6.8 6.8 0 0 1-3.5-1l-2 .5.6-1.9a6.8 6.8 0 1 1 4.9 2.4Zm3.7-5.2c-.2-.1-1.2-.6-1.4-.7-.2-.1-.3-.1-.5.1-.1.2-.5.7-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-.9-.5-.4-.9-.9-1-1.1-.1-.2 0-.3.1-.4l.3-.3.2-.4c.1-.1 0-.3 0-.4l-.6-1.4c-.2-.4-.3-.4-.5-.4h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.7s.7 2 1 2.3c.1.2 1.4 2.1 3.4 2.9.5.2.9.3 1.2.4.5.2 1 .2 1.3.1.4-.1 1.2-.5 1.3-1 .2-.5.2-.9.1-1-.1-.2-.2-.2-.4-.3Z" />
        </svg>
      </a>
      <FooterGlass />
    </div>
  )
}
