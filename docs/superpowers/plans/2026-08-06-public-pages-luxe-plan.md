# Migración De Páginas Públicas A Luxe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar `/precios`, `/equipo`, `/galeria` y `/contacto` al lenguaje visual Luxe del Home sin cambiar su lógica funcional.

**Architecture:** Crear `PublicLuxeShell` para centralizar fondo, header, footer y `<main>`. Cada página conservará sus datos y handlers, pero usará layouts y clases de `luxe.css`. `maqueta.css` seguirá disponible para dashboard, autenticación y reserva todavía no migrados.

**Tech Stack:** React 19, TypeScript 6, React Router 7, Firebase Firestore, GSAP/ScrollTrigger, CSS custom properties, Vitest, Vite.

## Global Constraints

- Actualizar la presentación de `/precios`, `/equipo`, `/galeria` y `/contacto`.
- Mantener contratos de Firestore, navegación, formularios y permisos.
- Mantener responsive desktop/móvil y `prefers-reduced-motion`.
- No rediseñar dashboard/admin, login, registro ni reserva.
- No modificar reglas, colecciones ni consultas de Firestore.
- No agregar dependencias ni estilos inline.
- No eliminar `maqueta.css`; todavía lo consumen otras rutas.
- No crear commits sin confirmación explícita del operador.

---

### Task 1: Crear shell público Luxe

**Files:**
- Create: `src/components/PublicLuxeShell.tsx`
- Create: `src/components/PublicLuxeShell.test.tsx`

**Interfaces:**
- Consumes: `ReactNode` y `mainClassName?: string`.
- Produces: `PublicLuxeShell({ children, mainClassName })` que monta `AuroraBackground`, `HeaderGlass`, `<main>` y `FooterGlass`.

- [ ] **Step 1: Write the failing test**

Crear `src/components/PublicLuxeShell.test.tsx`:

```tsx
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PublicLuxeShell from './PublicLuxeShell'

describe('PublicLuxeShell', () => {
  it('renders the shared Luxe shell and custom main class', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <PublicLuxeShell mainClassName="sl-page-main">
          <p>Contenido público</p>
        </PublicLuxeShell>
      </MemoryRouter>,
    )

    expect(markup).toContain('class="luxe sl-page-shell"')
    expect(markup).toContain('class="sl-header"')
    expect(markup).toContain('class="sl-footer"')
    expect(markup).toContain('class="sl-page-main"')
    expect(markup).toContain('Contenido público')
  })
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run src/components/PublicLuxeShell.test.tsx`

Expected: FAIL porque `PublicLuxeShell` todavía no existe.

- [ ] **Step 3: Implement the shell**

Crear `src/components/PublicLuxeShell.tsx`:

```tsx
import type { ReactNode } from 'react'
import AuroraBackground from '../landing/AuroraBackground'
import HeaderGlass from '../landing/HeaderGlass'
import FooterGlass from '../landing/FooterGlass'

export default function PublicLuxeShell({
  children,
  mainClassName = 'sl-page-main',
}: {
  children: ReactNode
  mainClassName?: string
}) {
  return (
    <div className="luxe sl-page-shell">
      <AuroraBackground />
      <HeaderGlass />
      <main className={mainClassName}>{children}</main>
      <FooterGlass />
    </div>
  )
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run src/components/PublicLuxeShell.test.tsx`

Expected: 1 test passed.

---

### Task 2: Migrar catálogo y equipo

**Files:**
- Modify: `src/pages/Precios.tsx`
- Modify: `src/pages/Equipo.tsx`
- Modify: `src/components/PricesList.tsx`
- Modify: `src/landing/data.ts`
- Create: `tools/PublicPages.test.ts`
- Modify: `package.json` (`test:client` script)

**Interfaces:**
- Consumes: `PriceItem` desde Firestore y `TEAM` desde `src/landing/data.ts`.
- Produces: páginas públicas con `PublicLuxeShell`, sin cambios en queries ni en el contenido del catálogo.

- [ ] **Step 1: Add static source-contract tests before migration**

Crear `tools/PublicPages.test.ts` y agregarlo al script `test:client` de `package.json`:

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const precios = readFileSync(new URL('../src/pages/Precios.tsx', import.meta.url), 'utf8')
const equipo = readFileSync(new URL('../src/pages/Equipo.tsx', import.meta.url), 'utf8')

describe('public Luxe pages', () => {
  it('uses the shared shell for prices and team', () => {
    expect(precios).toContain("from '../components/PublicLuxeShell'")
    expect(equipo).toContain("from '../components/PublicLuxeShell'")
  })
})
```

- [ ] **Step 2: Run the focused contract test and verify it fails**

Run: `npx vitest run tools/PublicPages.test.ts`

Expected: el test de contrato falla porque las páginas todavía importan `Header` y `Footer`.

- [ ] **Step 3: Migrate `Precios.tsx` without changing behavior**

Reemplazar el wrapper legacy por `PublicLuxeShell` y conservar `window.print()` y `<PricesList />`:

```tsx
<PublicLuxeShell>
  <section className="sl-catalog sl-page-section" aria-labelledby="precios-title">
    <header className="sl-catalog-head">
      <div>
        <p className="sl-eyebrow">Tarifario</p>
        <h1 id="precios-title">El ritual, a tu medida.</h1>
        <p>Precios actualizados para baños, grooming, guardería, pensión y spa.</p>
      </div>
      <button className="sl-btn sl-btn--primary" type="button" onClick={() => window.print()}>
        Imprimir / Exportar PDF
      </button>
    </header>
    <PricesList />
  </section>
</PublicLuxeShell>
```

- [ ] **Step 4: Migrate `PricesList.tsx` classes only**

Conservar query, estados, filtros y valores. Cambiar únicamente las clases visuales a `sl-catalog-toolbar`, `sl-catalog-select`, `sl-catalog-search`, `sl-catalog-list`, `sl-catalog-item`, `sl-catalog-item__name`, `sl-catalog-item__price` y `sl-catalog-item__note`; agregar labels accesibles para select y búsqueda.

- [ ] **Step 5: Migrate `Equipo.tsx` to `TEAM` and the Luxe list**

Usar `TEAM.map` y conservar nombres/roles del origen de datos:

```tsx
<PublicLuxeShell>
  <section className="sl-team sl-page-section" aria-labelledby="equipo-title">
    <div className="sl-team-inner">
      <p className="sl-eyebrow">El equipo</p>
      <h1 id="equipo-title">Manos que saben.</h1>
      <div className="sl-team-list">
        {TEAM.map((member) => (
          <article className="sl-team-row" key={member.name}>
            <span className="sl-team-name">{member.name}</span>
            <span className="sl-team-role">{member.role}</span>
          </article>
        ))}
      </div>
    </div>
  </section>
</PublicLuxeShell>
```

- [ ] **Step 6: Run client tests after catalog/team migration**

Run: `npm run test:client`

Expected: todos los tests de cliente pasan.

---

### Task 3: Unificar galería y contacto

**Files:**
- Modify: `src/pages/Galeria.tsx`
- Modify: `src/pages/Contacto.tsx`

**Interfaces:**
- Consumes: `GALERIA_ITEMS`, `loadMotion`, Firestore `mensajes` y los estados existentes del formulario.
- Produces: galería y contacto dentro del shell Luxe compartido, con el mismo comportamiento actual.

- [ ] **Step 1: Migrate `Galeria.tsx` to `PublicLuxeShell`**

Eliminar imports y wrappers directos de `AuroraBackground`, `HeaderGlass` y `FooterGlass`; envolver la sección existente en `PublicLuxeShell`. Mantener `rootRef`, `loadMotion`, `GALERIA_ITEMS`, `clipPath`, captions, CTA y fallback estático.

- [ ] **Step 2: Migrate `Contacto.tsx` to the Luxe content structure**

Eliminar `Header`/`Footer` legacy y conservar exactamente `handleSubmit`, la colección `mensajes`, los estados de carga/éxito/error y los ids `ubicacion`/`horarios`. Usar esta estructura visual:

```tsx
<PublicLuxeShell>
  <section className="sl-contact sl-page-section" aria-labelledby="contacto-title">
    <header className="sl-contact-head">
      <p className="sl-eyebrow">Contacto</p>
      <h1 id="contacto-title">Hablemos del próximo ritual.</h1>
      <p>Escríbenos para agendar o solicitar más información.</p>
    </header>
    <div className="sl-contact-grid">
      <form className="sl-contact-card" onSubmit={handleSubmit}>
        <div className="sl-contact-fields">
          <label className="sl-contact-field">Nombre<input id="nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} disabled={submitting} /></label>
          <label className="sl-contact-field">Teléfono<input id="telefono" value={telefono} onChange={(event) => setTelefono(event.target.value)} disabled={submitting} /></label>
        </div>
        <label className="sl-contact-field">Correo<input id="correo" type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} disabled={submitting} /></label>
        <label className="sl-contact-field">Mensaje<textarea id="mensaje" value={mensaje} onChange={(event) => setMensaje(event.target.value)} disabled={submitting} /></label>
        {success && <p className="field-success" aria-live="polite">Mensaje enviado correctamente. Te contactaremos pronto.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <button className="sl-btn sl-btn--primary" type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar mensaje'}</button>
      </form>
      <aside className="sl-contact-card sl-contact-info" id="ubicacion">
        <div className="sl-contact-map" aria-hidden="true"><div className="map-pin" /></div>
        <p>Estamos en Roma Norte, CDMX</p>
        <div id="horarios">
          <h2>Horarios</h2>
          <ul>
            <li>Apertura: 08:00 — 19:00</li>
            <li>Guardería: Lun–Vie 08:00 — 18:00</li>
            <li>Spa: Lun–Vie 09:00 — 18:30; Sáb 09:00 — 17:00; Dom 10:00 — 16:00</li>
            <li>Pensión: Check-in 11:00 am — Check-out 09:00 am</li>
            <li>Tiempo por cita: entre 1 y 2 horas</li>
          </ul>
          <h2>Tarifas principales</h2>
          <ul>
            <li>Guardería mensual (Lun–Vie 08:00–18:00): <strong>$3,500 MXN</strong></li>
            <li>Pensión: <strong>$300 MXN</strong> (temporada baja) / <strong>$380 MXN</strong> (temporada alta)</li>
            <li>Baños y Grooming: precio variable por peso y tipo de pelo (ver lista de precios)</li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
</PublicLuxeShell>
```

- [ ] **Step 3: Add contact accessibility contracts**

Mantener labels asociados, añadir `aria-live="polite"` al éxito y `role="alert"` al error, y conservar `disabled={submitting}` en todos los campos y botón.

- [ ] **Step 3: Extend route source tests**

Agregar a `tools/PublicPages.test.ts`:

```ts
const galeria = readFileSync(new URL('../src/pages/Galeria.tsx', import.meta.url), 'utf8')
const contacto = readFileSync(new URL('../src/pages/Contacto.tsx', import.meta.url), 'utf8')

it('keeps the shared shell and contact persistence contracts', () => {
  expect(galeria).toContain("from '../components/PublicLuxeShell'")
  expect(contacto).toContain("from '../components/PublicLuxeShell'")
  expect(contacto).toContain("collection(firebaseDb, 'mensajes')")
  expect(contacto).toContain('id="ubicacion"')
})
```

- [ ] **Step 4: Run route source tests**

Run: `npm run test:client`

Expected: todos los tests de cliente pasan.

---

### Task 4: Añadir estilos públicos Luxe y verificación final

**Files:**
- Modify: `src/styles/luxe.css`
- Modify: `tools/PublicPages.test.ts`

- [ ] **Step 1: Add catalog styles**

Implementar en `luxe.css` las clases `sl-catalog`, `sl-catalog-head`, `sl-catalog-toolbar`, `sl-catalog-list`, `sl-catalog-item` y sus estados focus/hover usando tokens existentes `--sl-ink`, `--sl-cream`, `--sl-cream-dim`, `--sl-amber` y `--sl-hairline`.

- [ ] **Step 2: Add contact styles**

Implementar `sl-contact`, `sl-contact-head`, `sl-contact-grid`, `sl-contact-card`, `sl-contact-field`, `sl-contact-map` y responsive. En móvil usar una columna; en desktop usar dos columnas equilibradas.

- [ ] **Step 3: Add print behavior for prices**

En `@media print`, ocultar `.sl-header`, `.sl-footer`, `.sl-catalog-head .sl-btn`, `.sl-catalog-toolbar` y fondos decorativos; dejar visibles título, filtros aplicados y catálogo.

- [ ] **Step 4: Run complete verification**

Run: `npm run test:client`

Expected: todos los tests de cliente pasan.

Run: `npx tsc --noEmit`

Expected: exit code `0` sin errores TypeScript.

Run: `npm run build`

Expected: build Vite exitoso.

Run: `git diff --check`

Expected: sin errores de whitespace.

- [ ] **Step 5: Visual QA**

Verificar en desktop y móvil `/precios`, `/equipo`, `/galeria` y `/contacto`: shell consistente, navegación, filtros, formulario, galería, anclas y ausencia del fondo pastel legacy. Si no hay navegador interactivo, reportar el gate visual como pendiente.
