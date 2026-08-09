import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('../src/landing/CinematicHero.tsx', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../src/pages/LandingNueva.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/styles/luxe.css', import.meta.url), 'utf8')

describe('cinematic hero timeline', () => {
  it('keeps the final CTA scene visible through the end of the pin', () => {
    expect(source).not.toMatch(/tl\.to\(last,\s*\{\s*clipPath:\s*'inset\(0 0 100% 0\)'/)
    expect(source).not.toMatch(/tl\.to\(last\.querySelector\('\.sl-scene-inner'\)/)
  })

  it('uses the shortened pin distance for scene transitions', () => {
    expect(source).toMatch(/end:\s*'\+=260%'/)
  })

  it('activates and removes the animated hero layout with the motion runtime', () => {
    expect(source).toMatch(/root\.current\.classList\.add\('sl-hero--animated'\)/)
    expect(source).toMatch(/root\.current\?\.classList\.remove\('sl-hero--animated'\)/)
  })

  it('starts empty and reveals the first scene inside the pinned scroll timeline', () => {
    expect(source).toMatch(/className="sl-hero sl-hero--preparing"/)
    expect(source).toMatch(/gsap\.set\(scenes,\s*\{\s*opacity:\s*0/)
    expect(source).toMatch(/tl\.to\(\{\},\s*\{\s*duration:\s*1\.35\s*\}\)/)
    expect(source).toMatch(/tl\.fromTo\(first,\s*\{\s*opacity:\s*0/)
    expect(source).toMatch(/tl\.from\(first\.querySelectorAll\('\.sl-hero-line'\)/)
    expect(styles).toMatch(/\.sl-hero--preparing \.sl-scene\s*\{[\s\S]*?visibility:\s*hidden/)
  })

  it('drives the logo reveal from the shared scroll timeline', () => {
    expect(source).toMatch(/import \{ getLogoReveal \} from '\.\/logoHeroMotion'/)
    expect(source).toMatch(/--logo-reveal-opacity/)
    expect(styles).toMatch(/\.sl-hero--animated \.sl-hero-logo\s*\{[\s\S]*?opacity:\s*var\(--logo-reveal-opacity,\s*0\)/)
  })

  it('protects hero copy from the persistent logo background', () => {
    expect(styles).toMatch(/\.sl-scene-inner::before\s*\{[\s\S]*?background:\s*radial-gradient/)
    expect(styles).toMatch(/\.sl-hero-copy\s*\{[\s\S]*?color:\s*var\(--sl-cream\)/)
    expect(styles).toMatch(/\.sl-hero-copy\s*\{[\s\S]*?font-weight:\s*500/)
  })

  it('matches public image containers to the official 3:2 assets', () => {
    expect(styles).toMatch(/\.sl-story-media\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*2/)
    expect(styles).toMatch(/\.sl-reel-media\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*2/)
    expect(styles).toMatch(/\.sl-gallery-item--lg\s*\{[\s\S]*?aspect-ratio:\s*3\s*\/\s*2/)
  })

  it('reveals every following scene instead of leaving it transparent', () => {
    expect(source).toMatch(/tl\.fromTo\(next,\s*\{\s*opacity:\s*0,\s*clipPath:/)
    expect(source).toMatch(/\{\s*opacity:\s*1,\s*clipPath:\s*'inset\(0% 0 0 0\)'/)
  })

  it('overlaps scenes only in the animated layout and keeps the default flow', () => {
    expect(styles).toMatch(/\.sl-hero--animated\s*\{[\s\S]*?height:\s*100svh/)
    expect(styles).toMatch(/\.sl-hero--animated \.sl-scene\s*\{[\s\S]*?position:\s*absolute/)
    expect(styles).toMatch(/\.sl-scene\s*\{[\s\S]*?position:\s*relative/)
  })

  it('uses the official logo with a lazy R3F fallback', () => {
    expect(source).toMatch(/import \{ BRAND_ASSETS, publicAsset \} from '\.\/assets'/)
    expect(source).toMatch(/const LazyLogoHero = lazy\(\(\) => import\('\.\/LogoHero'\)\)/)
    expect(source).toMatch(/className="sl-logo-hero__fallback"/)
  })

  it('keeps the approved CTA and scroll cue contract', () => {
    expect(source).toMatch(/<Link className="sl-btn sl-btn--primary" to="\/reservar">\s*Agendar cita · Iniciar sesión/)
    expect(landing).toMatch(/className=\{`sl-scroll-cue\$\{whatsappVisible/)
    expect(landing).toContain('sl-scroll-cue--visible')
    expect(landing).toMatch(/aria-label="Desliza para continuar"/)
    expect(landing).toMatch(/className="sl-scroll-label">Desliza<\/span>/)
    expect(landing).toMatch(/className="sl-scroll-arrow"/)
    expect(styles).toMatch(/\.sl-scroll-cue\s*\{[\s\S]*?position:\s*fixed[\s\S]*?bottom:[^;]+;[\s\S]*?right:[^;]+;/)
    expect(styles).toMatch(/\.sl-scroll-label\s*\{[\s\S]*?display:\s*block/)
    expect(styles).toMatch(/\.sl-scroll-arrow\s*\{[\s\S]*?display:\s*block/)
    expect(styles).toMatch(/\.sl-hero-logo\s*\{[\s\S]*?left:\s*50%;[\s\S]*?transform:\s*translateX\(-50%\)/)
  })

  it('reveals the home WhatsApp action with the logo', () => {
    expect(source).toMatch(/onLogoVisibleChange/)
    expect(landing).toMatch(/import \{ WHATSAPP_DISPLAY, WHATSAPP_URL \} from '\.\.\/config\/contact'/)
    expect(landing).toMatch(/sl-hero-whatsapp/)
    expect(landing).toMatch(/<svg[^>]+aria-hidden="true"/)
    expect(landing).toMatch(/aria-label=\{`Escribir por WhatsApp al \$\{WHATSAPP_DISPLAY\}`\}/)
    expect(source).toMatch(/sl-hero--logo-visible/)
    expect(styles).toMatch(/\.sl-hero-whatsapp\s*\{[\s\S]*?position:\s*fixed[\s\S]*?border-radius:\s*50%[\s\S]*?bottom:/)
    expect(styles).toMatch(/\.sl-hero-whatsapp svg\s*\{[\s\S]*?width:\s*2.25rem[\s\S]*?height:\s*2.25rem/)
    expect(styles).toMatch(/\.sl-scroll-cue--visible\s*\{[\s\S]*?opacity:\s*1/)
  })

  it('keeps the mobile fallback logo readable', () => {
    expect(styles).toMatch(/\.sl-hero--animated \.sl-logo-hero__fallback\s*\{[\s\S]*?filter:\s*none[\s\S]*?transform:\s*none/)
  })

  it('removes bottom hero metadata and lowers the copy below the background logo', () => {
    expect(source).not.toMatch(/meta=\{/)
    expect(styles).toMatch(/\.sl-scene-inner\s*\{[\s\S]*?top:\s*clamp\(/)
  })

  it('keeps readable spacing between hero copy and CTA buttons', () => {
    expect(source).toMatch(/className="sl-scene-cta"/)
    expect(styles).toMatch(/\.sl-scene-cta\s*\{[\s\S]*?margin-top:\s*3rem/)
    expect(styles).toMatch(/\.sl-cta-row\s*\{[\s\S]*?gap:\s*1rem/)
  })
})
