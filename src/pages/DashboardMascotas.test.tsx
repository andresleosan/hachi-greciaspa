// @ts-expect-error El tsconfig cliente no incluye intencionalmente tipos de Node.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const mascotas = readFileSync(new URL('./DashboardMascotas.tsx', import.meta.url), 'utf8')
const luxeStyles = readFileSync(new URL('../styles/luxe.css', import.meta.url), 'utf8')

describe('DashboardMascotas AdminShell migration', () => {
  it('uses the shared shell while preserving pet ownership and history', () => {
    expect(mascotas).toContain("from '../components/AdminShell'")
    expect(mascotas).toContain('<AdminShell title="Mis mascotas" subtitle="Perfil, cuidados e historial de tus mascotas.">')
    expect(mascotas).not.toContain('<h1>Mis mascotas</h1>')
    expect(mascotas).toContain('<h2>Mis mascotas</h2>')
    expect(mascotas).toContain('Agregar mascota')
    expect(mascotas).toContain('Nueva mascota')
    expect(mascotas).toContain('Editar')
    expect(mascotas).toContain('Eliminar')
    expect(mascotas).toContain('Historial')
    expect(mascotas).toContain('listMyMascotas(user.uid)')
    expect(mascotas).toContain('listMyMascotaHistory(user.uid, mascota.id)')
    expect(mascotas).not.toContain('dashboard-layout')
    expect(mascotas).not.toContain('dashboard-sidebar')
    expect(mascotas).not.toContain('dashboard-topbar')
  })

  it('keeps pet panels, selection and focus styling scoped to the shell', () => {
    expect(luxeStyles).toContain('.admin-shell .mascotas-page')
    expect(luxeStyles).toContain('.admin-shell .mascota-item.is-selected')
    expect(luxeStyles).toContain('.admin-shell .mascotas-history')
    expect(luxeStyles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
