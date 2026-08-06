# Acortar Transición Del Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir el recorrido de scroll del hero cinematográfico sin cambiar su escena inicial ni eliminar escenas.

**Architecture:** El cambio queda aislado en el `ScrollTrigger` de `CinematicHero`. La timeline conserva sus animaciones internas, las cuatro escenas y el CTA final; solo pasa de `+=340%` a `+=260%`. Un test de fuente protege explícitamente ese contrato para evitar que el recorrido vuelva a crecer.

**Tech Stack:** React 19, TypeScript 6, GSAP, ScrollTrigger, Vitest, Vite.

## Global Constraints

- Mantener la escena inicial y su posición al abrir la página.
- Mantener las cuatro escenas y la visibilidad de la escena final con su CTA.
- No modificar `Storytelling`, `ServiceReels` ni otros timelines.
- No agregar dependencias ni tocar configuración de producción.
- No introducir estilos inline.
- No crear commits sin confirmación explícita del operador.

---

### Task 1: Reducir el recorrido del hero

**Files:**
- Modify: `src/landing/CinematicHero.tsx:75-83`
- Modify: `tools/CinematicHero.test.ts:6-11`
- Reference: `docs/superpowers/specs/2026-08-05-landing-hero-transition-design.md`

**Interfaces:**
- Consumes: la timeline existente de `CinematicHero` y su `ScrollTrigger`.
- Produces: un hero con `end: '+=260%'`, cuatro escenas intactas y CTA final visible.

- [ ] **Step 1: Write the failing test**

Agregar al bloque `describe('cinematic hero timeline', ...)` de `tools/CinematicHero.test.ts`:

```ts
it('uses the shortened pin distance for scene transitions', () => {
  expect(source).toMatch(/end:\s*'\+=260%'/)
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: FAIL en `uses the shortened pin distance for scene transitions` porque la implementación actual contiene `end: '+=340%'`.

- [ ] **Step 3: Write the minimal implementation**

En `src/landing/CinematicHero.tsx`, cambiar únicamente:

```ts
end: '+=340%',
```

por:

```ts
end: '+=260%',
```

No cambiar `start`, `scrub`, `pin`, las duraciones internas, las escenas ni el CTA.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `npx vitest run tools/CinematicHero.test.ts`

Expected: 2 tests passed, incluyendo la visibilidad de la escena final y el recorrido `+=260%`.

- [ ] **Step 5: Run the full local verification**

Run: `npm run test:client`

Expected: todos los tests de cliente pasan.

Run: `npx tsc --noEmit`

Expected: exit code `0` sin errores TypeScript.

Run: `npm run build`

Expected: build Vite exitoso.

- [ ] **Step 6: Perform visual verification when a browser tool is available**

Verify at desktop and mobile widths that:

- la primera escena aparece en la misma posición que antes;
- las transiciones entre las cuatro escenas terminan antes;
- la escena final y sus botones permanecen visibles;
- no aparece un tramo negro adicional al terminar el pin;
- `prefers-reduced-motion` mantiene el fallback estático.

Si la sesión no expone una herramienta de navegador interactiva, registrar browser QA como pendiente y no afirmar verificación visual.

- [ ] **Step 7: Review the diff without committing**

Run: `git diff --check`

Expected: sin errores de whitespace. Revisar que el diff solo contenga el test y el cambio de `end` descritos; no crear commit sin autorización explícita.
