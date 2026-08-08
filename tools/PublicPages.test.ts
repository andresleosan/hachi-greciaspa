import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const precios = readFileSync(new URL('../src/pages/Precios.tsx', import.meta.url), 'utf8')
const servicios = readFileSync(new URL('../src/pages/Servicios.tsx', import.meta.url), 'utf8')
const equipo = readFileSync(new URL('../src/pages/Equipo.tsx', import.meta.url), 'utf8')
const galeria = readFileSync(new URL('../src/pages/Galeria.tsx', import.meta.url), 'utf8')
const contacto = readFileSync(new URL('../src/pages/Contacto.tsx', import.meta.url), 'utf8')
const header = readFileSync(new URL('../src/landing/HeaderGlass.tsx', import.meta.url), 'utf8')
const footerGlass = readFileSync(new URL('../src/landing/FooterGlass.tsx', import.meta.url), 'utf8')
const footer = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8')
const landingSections = readFileSync(new URL('../src/landing/SectionsLuxe.tsx', import.meta.url), 'utf8')
const legacyInicio = readFileSync(new URL('../src/app/pages/Inicio.html', import.meta.url), 'utf8')

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

  it('renders service cards with exact commercial labels', () => {
    expect(servicios).toContain("price={SERVICE_PRICE_LABELS[s.id ?? '']}")
    expect(servicios).not.toContain('unit={s.category}')
    expect(servicios).toContain('serviceId={s.id}')
  })

  it('uses the shared WhatsApp contract across public contact surfaces', () => {
    for (const source of [header, footerGlass, footer, contacto, landingSections]) {
      expect(source).toContain("from '../config/contact'")
      expect(source).toContain('WHATSAPP_URL')
    }

    expect(header).toContain('target="_blank"')
    expect(footerGlass).toContain('target="_blank"')
    expect(footer).toContain('target="_blank"')
    expect(contacto).toContain('target="_blank"')
    expect(landingSections).toContain('target="_blank"')
  })

  it('removes the fictitious phone from the legacy public landing', () => {
    expect(legacyInicio).toContain('Contacto: contacto@hachigreciasp.com — +52 55 7887 5525')
  })
})
