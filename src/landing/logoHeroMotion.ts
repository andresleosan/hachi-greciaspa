export type LogoMotion = {
  scale: number
  rotationY: number
  rotationX: number
  lightIntensity: number
}

export type LogoReveal = {
  opacity: number
  foregroundOpacity: number
  scale: number
  blur: number
}

export function clampRotation(value: number, maxDegrees = 6): number {
  if (!Number.isFinite(value)) return 0

  const limit = Math.abs(maxDegrees)
  return Math.min(limit, Math.max(-limit, value))
}

export function getLogoMotion(progress: number, reducedMotion: boolean): LogoMotion {
  if (reducedMotion) {
    return { scale: 1, rotationY: 0, rotationX: 0, lightIntensity: 1 }
  }

  const normalizedProgress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  const phase = normalizedProgress * Math.PI * 2

  return {
    scale: 1 + Math.sin(phase) * 0.02,
    rotationY: clampRotation(Math.sin(phase) * 4),
    rotationX: clampRotation(Math.cos(phase) * 4),
    lightIntensity: 0.9 + Math.sin(phase) * 0.1,
  }
}

export function getLogoReveal(progress: number, reducedMotion: boolean): LogoReveal {
  if (reducedMotion) return { opacity: 1, foregroundOpacity: 1, scale: 1, blur: 0 }

  const normalizedProgress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  const revealStart = 0.02
  const revealEnd = 0.12

  if (normalizedProgress <= revealStart) return { opacity: 0, foregroundOpacity: 0, scale: 0.82, blur: 18 }

  if (normalizedProgress <= revealEnd) {
    const revealProgress = (normalizedProgress - revealStart) / (revealEnd - revealStart)
    const easedReveal = 1 - (1 - revealProgress) ** 3

    return {
      opacity: easedReveal,
      foregroundOpacity: easedReveal,
      scale: 0.82 + easedReveal * 0.18,
      blur: 18,
    }
  }

  const backgroundProgress = Math.min(1, (normalizedProgress - revealEnd) / (1 - revealEnd))

  return {
    opacity: 0.48 + 0.34 * (1 - backgroundProgress) ** 1.2,
    foregroundOpacity: Math.max(0.05, 0.22 * (1 - backgroundProgress) ** 2.4),
    scale: 1,
    blur: 18 + backgroundProgress * 14,
  }
}
