import { useEffect, useRef, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  delay?: number
  as?: 'div' | 'section' | 'figure' | 'li' | 'article'
  className?: string
}

/**
 * Reveal de entrada al viewport (IntersectionObserver + CSS transition).
 * Ligero y robusto: sin JS todo es visible; con `prefers-reduced-motion`
 * las transiciones CSS se anulan en luxe.css.
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-inview')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-inview')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const delayClass = delay > 0 ? `sl-reveal-delay-${delay}` : ''

  return (
    <Tag ref={ref as never} className={`sl-reveal ${delayClass} ${className}`}>
      {children}
    </Tag>
  )
}
