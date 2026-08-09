/**
 * Runtime de movimiento para la experiencia "lujo silencioso".
 * Carga GSAP + ScrollTrigger + Lenis de forma diferida (chunk aparte)
 * y los expone como singleton para toda la landing.
 * Si `prefers-reduced-motion` está activo, nunca se monta.
 */

export type MotionRuntime = {
  gsap: typeof import('gsap').default
  ScrollTrigger: typeof import('gsap/ScrollTrigger').default
  lenis: import('lenis').default
}

let runtimePromise: Promise<MotionRuntime> | null = null
let tickerCallback: ((time: number) => void) | null = null

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function scrollToTop(): void {
  if (typeof window === 'undefined') return

  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  if (runtimePromise) {
    void runtimePromise.then(({ lenis }) => lenis.scrollTo(0, { immediate: true }))
  }
}

export function loadMotion(): Promise<MotionRuntime> {
  if (prefersReducedMotion()) {
    return Promise.reject(new Error('reduced motion'))
  }
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const [{ default: gsap }, { default: ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('lenis'),
      ])

      gsap.registerPlugin(ScrollTrigger)

      const lenis = new Lenis({
        duration: 1.05,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        touchMultiplier: 1.4,
      })

      lenis.on('scroll', ScrollTrigger.update)

      tickerCallback = (time: number) => {
        lenis.raf(time * 1000)
      }
      gsap.ticker.add(tickerCallback)
      gsap.ticker.lagSmoothing(0)

      return { gsap, ScrollTrigger, lenis }
    })()
    runtimePromise.catch(() => {
      runtimePromise = null
    })
  }
  return runtimePromise
}

export function disposeMotion(): void {
  if (!runtimePromise) return
  void runtimePromise.then(({ gsap, lenis }) => {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback)
      tickerCallback = null
    }
    lenis.destroy()
  })
  runtimePromise = null
}
