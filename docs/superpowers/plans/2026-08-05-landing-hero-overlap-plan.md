# Superponer Escenas Del Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el espacio negro entre escenas haciendo que la composición superpuesta se active solo cuando GSAP esté listo.

**Architecture:** `CinematicHero` añadirá `sl-hero--animated` al cargar correctamente el runtime de movimiento y la quitará durante cleanup. CSS mantendrá el hero y las escenas en flujo normal por defecto; únicamente con esa clase el hero tendrá una sola pantalla y las escenas se superpondrán. Esto conserva el fallback estático ante reduced motion, error de carga o ausencia de JavaScript.

**Tech Stack:** React 19, TypeScript 6, GSAP, ScrollTrigger, CSS custom properties, Vitest, Vite.

## Global Constraints

- Mantener el copy, tipografía, colores y contenido de las escenas sin cambios.
- Mantener `end: '+=260%'`, el `clip-path`, las cuatro escenas y el CTA final.
- No modificar `Storytelling`, `ServiceReels` ni otros timelines.
- Sin dependencias nuevas ni cambios de configuración de producción.
- Sin estilos inline.
- No ocultar contenido en reduced motion, errores de carga o ausencia de JavaScript.
- No crear commits sin confirmación explícita del operador.

---

### Task 1: Activar composición superpuesta solo con GSAP

**Files:**
- Modify: `tools/CinematicHero.test.ts`
- Modify: `src/landing/CinematicHero.tsx:62-120`
- Modify: `src/styles/luxe.css:354-366`
- Reference: `docs/superpowers/specs/2026-08-05-landing-hero-overlap-design.md`

**Interfaces:**
- Consumes: `root` ref de `CinematicHero` y la promesa `loadMotion()`.
- Produces: clase DOM `sl-hero--animated` durante el runtime activo; fallback de escenas en flujo normal cuando la clase no existe.

- [ ] **Step 1: Write the failing tests**

En `tools/CinematicHero.test.ts`, ampliar las fuentes leídas:

```ts
const styles = readFileSync(new URL('../src/styles/luxe.css', import.meta.url), 'utf8')
```

Agregar estas pruebas:

```ts
it('activates and removes the animated hero layout with the motion runtime', () => {
  expect(source).toMatch(/root\.current\.classList\.add\('sl-hero--animated'\)/)
  expect(source).toMatch(/root\.current\?\.classList\.remove\('sl-hero--animated'\)/)
})

it('overlaps scenes only in the animated layout and keeps the default flow', () => {
  expect(styles).toMatch(/\.sl-hero--animated\s*\{[\s\S]*?height:\s*100svh/)
  expect(styles).toMatch(/\.sl-hero--animated \.sl-scene\s*\{[\s\S]*?position:\s*absolute/)
  expect(styles).toMatch(/\.sl-scene\s*\{[\s\S]*?position:\s*relative/)
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: fallan las dos pruebas nuevas porque todavía no existe la clase `sl-hero--animated` ni las reglas CSS de superposición.

- [ ] **Step 3: Add the animated class lifecycle**

En `src/landing/CinematicHero.tsx`, dentro del callback exitoso de `loadMotion()` y después de comprobar `cancelled` y `root.current`, guardar la referencia y activar la clase:

```ts
const hero = root.current
hero.classList.add('sl-hero--animated')
```

En el cleanup del `useEffect`, quitar la clase antes o después de revertir el contexto:

```ts
root.current?.classList.remove('sl-hero--animated')
ctx?.revert()
```

No cambiar `start`, `end`, `scrub`, `pin`, la timeline ni el contenido de las escenas.

- [ ] **Step 4: Add the CSS layout modes**

Mantener `.sl-scene` en flujo normal y agregar después de `.sl-hero`:

```css
.sl-hero--animated {
  height: 100svh;
  min-height: 620px;
  overflow: hidden;
}

.sl-hero--animated .sl-scene {
  position: absolute;
  inset: 0;
  height: 100%;
  min-height: 0;
}
```

No cambiar la regla base `.sl-scene { position: relative; height: 100svh; min-height: 620px; }`; esa regla es el fallback estático.

- [ ] **Step 5: Run focused tests and verify they pass**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: 4 tests passed, incluyendo CTA final visible, `end: '+=260%'`, lifecycle de clase y reglas de layout.

- [ ] **Step 6: Run complete verification**

Run: `npm run test:client`

Expected: todos los tests de cliente pasan.

Run: `npx tsc --noEmit`

Expected: exit code `0` sin errores TypeScript.

Run: `npm run build`

Expected: build Vite exitoso.

- [ ] **Step 7: Verify the diff and visual behavior**

Run: `git diff --check`

Review desktop and mobile behavior when an interactive browser is available:

- la primera escena conserva su posición inicial;
- la segunda, tercera y cuarta escena aparecen en el mismo viewport, sin tramo negro;
- el CTA final permanece visible;
- sin JS, con error de `loadMotion()` o con reduced motion, las cuatro escenas siguen en flujo normal.

Si no hay navegador interactivo, reportar browser QA visual como pendiente y no afirmar que fue verificado.
