import { useEffect, useRef } from 'react'
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
        <CinematicHero />
        <Storytelling />
        <ServiceReels />
        <EditorialGallery />
        <TestimonialCarousel />
        <ScheduleSectionLuxe />
        <TeamSectionLuxe />
        <FAQSectionLuxe />
        <CTASectionLuxe />
      </main>
      <FooterGlass />
    </div>
  )
}
