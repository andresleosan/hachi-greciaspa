import { Component, Suspense, useRef, type ReactNode, type RefObject } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import type { Group, MeshBasicMaterial, PointLight, Texture } from 'three'

import { getLogoMotion, getLogoReveal } from './logoHeroMotion'

const LOGO_ALT = 'Logo oficial Hachi y Grecia Spa'

function StaticLogo({ className, logoSrc }: { className?: string; logoSrc: string }) {
  return <img className={className} src={logoSrc} alt={LOGO_ALT} />
}

function canUseWebGL(): boolean {
  if (typeof document === 'undefined') return false
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return false

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function readProgress(container: HTMLDivElement | null): number {
  if (!container) return 0

  const value = Number.parseFloat(getComputedStyle(container).getPropertyValue('--logo-progress'))
  return Number.isFinite(value) ? value : 0
}

function LogoScene({ logoSrc, container }: { logoSrc: string; container: RefObject<HTMLDivElement | null> }) {
  const texture = useLoader(TextureLoader, logoSrc) as Texture
  const group = useRef<Group>(null)
  const frontMaterial = useRef<MeshBasicMaterial>(null)
  const backMaterial = useRef<MeshBasicMaterial>(null)
  const haloMaterial = useRef<MeshBasicMaterial>(null)
  const pointLight = useRef<PointLight>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return

    elapsed.current = Math.min(2, elapsed.current + delta)
    const entryProgress = Math.min(1, elapsed.current / 2)
    const entryScale = 0.2 + 0.8 * (1 - (1 - entryProgress) ** 3)
    const progress = readProgress(container.current)
    const motion = getLogoMotion(progress, false)
    const reveal = getLogoReveal(progress, false)

    group.current.scale.setScalar(entryScale * motion.scale * reveal.scale)
    group.current.rotation.y = (motion.rotationY * Math.PI) / 180
    group.current.rotation.x = (motion.rotationX * Math.PI) / 180
    if (frontMaterial.current) frontMaterial.current.opacity = entryProgress * reveal.foregroundOpacity
    if (backMaterial.current) backMaterial.current.opacity = entryProgress * reveal.opacity * 0.2
    if (haloMaterial.current) haloMaterial.current.opacity = entryProgress * reveal.opacity * 0.08
    container.current?.style.setProperty('--logo-reveal-opacity', String(reveal.opacity))
    container.current?.style.setProperty('--logo-reveal-scale', String(reveal.scale))
    container.current?.style.setProperty('--logo-reveal-blur', `${reveal.blur}px`)
    if (pointLight.current) pointLight.current.intensity = motion.lightIntensity
  })

  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight ref={pointLight} position={[1.8, 1.8, 3]} intensity={0.9} distance={7} color="#C9A96A" />
      <group ref={group}>
        <mesh position={[0, 0, -0.1]}>
          <planeGeometry args={[2.7, 2.7]} />
          <meshBasicMaterial ref={backMaterial} map={texture} transparent opacity={0.2} color="#93A58C" />
        </mesh>
        <mesh position={[0, 0, 0.06]}>
          <planeGeometry args={[2.7, 2.7]} />
          <meshBasicMaterial ref={frontMaterial} map={texture} transparent opacity={0} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[2.84, 2.84]} />
          <meshBasicMaterial ref={haloMaterial} map={texture} transparent opacity={0} color="#C9A96A" />
        </mesh>
      </group>
    </>
  )
}

class LogoHeroErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

export interface LogoHeroProps {
  className?: string
  logoSrc: string
  reducedMotion?: boolean
}

export default function LogoHero({ className, logoSrc, reducedMotion = false }: LogoHeroProps) {
  const container = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = reducedMotion ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const fallbackClassName = [className, 'sl-logo-hero__fallback'].filter(Boolean).join(' ')
  const fallback = <StaticLogo className={fallbackClassName} logoSrc={logoSrc} />

  if (shouldReduceMotion || !canUseWebGL()) {
    return <StaticLogo className={fallbackClassName} logoSrc={logoSrc} />
  }

  return (
    <div ref={container} className={className}>
      <img className="sl-logo-hero__blur" src={logoSrc} alt="" aria-hidden="true" />
      <div className="sl-logo-hero__canvas">
        <LogoHeroErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <Canvas
              camera={{ position: [0, 0, 5], fov: 30 }}
              dpr={[1, 1]}
              gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
            >
              <LogoScene logoSrc={logoSrc} container={container} />
            </Canvas>
          </Suspense>
        </LogoHeroErrorBoundary>
      </div>
    </div>
  )
}
