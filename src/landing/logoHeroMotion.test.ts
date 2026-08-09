import { describe, expect, it } from 'vitest'

import { clampRotation, getLogoMotion, getLogoReveal } from './logoHeroMotion'

describe('logo hero motion', () => {
  it('limits rotation to the configured degree range', () => {
    expect(clampRotation(20)).toBe(6)
    expect(clampRotation(-20)).toBe(-6)
  })

  it('keeps animated scale and rotations within safe limits', () => {
    const motion = getLogoMotion(0.5, false)

    expect(motion.scale).toBeGreaterThan(0)
    expect(Math.abs(motion.rotationY)).toBeLessThanOrEqual(6)
    expect(Math.abs(motion.rotationX)).toBeLessThanOrEqual(6)
    expect(motion.lightIntensity).toBeGreaterThan(0)
  })

  it('returns a stable state when reduced motion is enabled', () => {
    expect(getLogoMotion(0.5, true)).toEqual({
      scale: 1,
      rotationY: 0,
      rotationX: 0,
      lightIntensity: 1,
    })
  })

  it('reveals the logo from hidden to visible as the hero scrolls', () => {
    expect(getLogoReveal(0, false)).toEqual({ opacity: 0, foregroundOpacity: 0, scale: 0.82, blur: 18 })

    const midReveal = getLogoReveal(0.09, false)
    expect(midReveal.opacity).toBeGreaterThan(0)
    expect(midReveal.foregroundOpacity).toBeGreaterThan(0)
    expect(midReveal.opacity).toBeLessThan(1)
    expect(midReveal.scale).toBeGreaterThan(0.82)
    expect(midReveal.scale).toBeLessThan(1)
    expect(midReveal.blur).toBe(18)

    const backgroundLogo = getLogoReveal(0.4, false)
    expect(backgroundLogo.opacity).toBeGreaterThan(0)
    expect(getLogoReveal(0.64, false).opacity).toBeGreaterThan(0.35)
    expect(backgroundLogo.foregroundOpacity).toBeLessThan(midReveal.foregroundOpacity)
    expect(backgroundLogo.scale).toBe(1)
    expect(backgroundLogo.blur).toBeGreaterThan(18)

    const finalLogo = getLogoReveal(1, false)
    expect(finalLogo.opacity).toBeGreaterThan(0.3)
    expect(finalLogo.foregroundOpacity).toBeLessThan(backgroundLogo.foregroundOpacity)
    expect(finalLogo.scale).toBe(1)
    expect(finalLogo.blur).toBeGreaterThan(backgroundLogo.blur)
  })

  it('keeps the fallback logo visible when reduced motion is enabled', () => {
    expect(getLogoReveal(0, true)).toEqual({ opacity: 1, foregroundOpacity: 1, scale: 1, blur: 0 })
  })

  it('keeps the background logo distinguishable through the final scene', () => {
    const finalLogo = getLogoReveal(1, false)

    expect(finalLogo.opacity).toBeGreaterThanOrEqual(0.48)
    expect(finalLogo.foregroundOpacity).toBeGreaterThanOrEqual(0.05)
    expect(finalLogo.blur).toBeLessThanOrEqual(32)
  })
})
