import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const precios = readFileSync(new URL('../src/pages/Precios.tsx', import.meta.url), 'utf8')
const equipo = readFileSync(new URL('../src/pages/Equipo.tsx', import.meta.url), 'utf8')
const galeria = readFileSync(new URL('../src/pages/Galeria.tsx', import.meta.url), 'utf8')
const contacto = readFileSync(new URL('../src/pages/Contacto.tsx', import.meta.url), 'utf8')

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
})
