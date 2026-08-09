import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const precios = readFileSync(new URL('../src/pages/Precios.tsx', import.meta.url), 'utf8')
const servicios = readFileSync(new URL('../src/pages/Servicios.tsx', import.meta.url), 'utf8')
const equipo = readFileSync(new URL('../src/pages/Equipo.tsx', import.meta.url), 'utf8')
const galeria = readFileSync(new URL('../src/pages/Galeria.tsx', import.meta.url), 'utf8')
const contacto = readFileSync(new URL('../src/pages/Contacto.tsx', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/landing/HeaderGlass.tsx', import.meta.url), 'utf8')
const landing = readFileSync(new URL('../src/pages/LandingNueva.tsx', import.meta.url), 'utf8')
const storytelling = readFileSync(new URL('../src/landing/Storytelling.tsx', import.meta.url), 'utf8')
const serviceReels = readFileSync(new URL('../src/landing/ServiceReels.tsx', import.meta.url), 'utf8')
const editorialGallery = readFileSync(new URL('../src/landing/EditorialGallery.tsx', import.meta.url), 'utf8')
const footerGlass = readFileSync(new URL('../src/landing/FooterGlass.tsx', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8')
const landingSections = readFileSync(new URL('../src/landing/SectionsLuxe.tsx', import.meta.url), 'utf8')
const legacyInicio = readFileSync(new URL('../src/app/pages/Inicio.html', import.meta.url), 'utf8')
const luxeStyles = readFileSync(new URL('../src/styles/luxe.css', import.meta.url), 'utf8')

describe('public Luxe pages', () => {
  it('uses the shared shell for prices and team', () => {
    expect(precios).toContain("from '../components/PublicLuxeShell'")
    expect(equipo).toContain("from '../components/PublicLuxeShell'")
  })

  it('keeps the shared shell and contact persistence contracts', () => {
    expect(galeria).toContain("from '../components/PublicLuxeShell'")
    expect(contacto).toContain("from '../components/PublicLuxeShell'")
    expect(contacto).toContain("collection(firebaseDb, 'mensajes')")
    expect(contacto).toContain('id="ubicacion"')
  })

  it('renders the real local services catalog in the shared Luxe shell', () => {
    expect(servicios).toContain("from '../components/PublicLuxeShell'")
    expect(servicios).toContain('PRICING_SPA')
    expect(servicios).toContain('EXTRAS_LIST')
    expect(servicios).not.toContain("collection(firebaseDb, 'servicios')")
    expect(servicios).not.toContain("collection(firebaseDb, 'precios')")
  })

  it('uses only official image assets on public service and gallery pages', () => {
    const legacyAssets = ['/tl.png', '/tr.png', '/bl.png', '/br.png', '/hachi-greciaspa.png', '/contact-sheet.png']
    for (const legacyAsset of legacyAssets) {
      expect(servicios).not.toContain(legacyAsset)
      expect(galeria).not.toContain(legacyAsset)
    }
    expect(servicios).toContain("from '../landing/assets'")
    expect(galeria).toContain('GALLERY_ASSETS')
  })

  it('keeps image compositions free of decorative titles and captions', () => {
    expect(storytelling).not.toContain('sl-story-word')
    expect(serviceReels).not.toContain('sl-reel-index')
    expect(editorialGallery).not.toContain('<figcaption>')
  })

  it('aligns schedule rows into stable service, days, and hours columns', () => {
    expect(luxeStyles).toMatch(/\.sl-schedule-row\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:/)
    expect(luxeStyles).toMatch(/\.sl-schedule-row strong\s*\{[\s\S]*?grid-column:\s*1/)
    expect(luxeStyles).toMatch(/\.sl-schedule-row em\s*\{[\s\S]*?text-align:\s*right/)
  })

  it('uses the shared WhatsApp contract across public contact surfaces', () => {
    for (const source of [footerGlass, footer, contacto, landingSections, landing]) {
      expect(source).toContain("from '../config/contact'")
      expect(source).toContain('WHATSAPP_URL')
    }

    expect(footerGlass).toContain('target="_blank"')
    expect(footer).toContain('target="_blank"')
    expect(contacto).toContain('target="_blank"')
    expect(landingSections).toContain('target="_blank"')
    expect(landing).toContain('target="_blank"')
  })

  it('removes the fictitious phone from the legacy public landing', () => {
    expect(legacyInicio).toContain('Contacto: contacto@hachigreciasp.com — +52 55 7887 5525')
  })
})
