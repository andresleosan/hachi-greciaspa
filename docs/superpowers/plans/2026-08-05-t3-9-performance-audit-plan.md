# T3.9 Auditoría De Performance Y Bundle Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar T3.9 con evidencia reproducible de que Firebase está fuera del entry público, documentar tamaños del bundle y dejar FCP/LCP pendientes cuando no haya medición de navegador.

**Architecture:** No se modificará código de aplicación ni la configuración de Firebase. La entrega será documental: `docs/PERFORMANCE.md` conservará el baseline de Vite y la auditoría de imports; `docs/Fase3.md` reflejará el estado real de cada AC.

**Tech Stack:** Vite 8, React 19, TypeScript 6, Firebase modular SDK, Markdown.

## Global Constraints

- No se dividirá adicionalmente `firebase.ts` sin una medición de red por ruta que justifique el cambio.
- No se instalarán Lighthouse, Playwright ni WebPageTest en esta tarea.
- FCP < 1.5 s y LCP < 2.5 s se documentarán como objetivos pendientes de medición real.
- No se modificarán rutas, lógica de negocio, SDKs ni configuración de producción.
- No se afirmará una mejora de performance únicamente por intuición; el baseline debe conservar tamaños before/after.

---

### Task 1: Crear el reporte reproducible de performance

**Files:**
- Create: `docs/PERFORMANCE.md`

**Interfaces:**
- Consumes: salida de `npm run build`, salida de `npx vite build --manifest`, `dist/.vite/manifest.json`, `src/App.tsx`, `src/main.tsx` y `src/services/firebase.ts`.
- Produces: reporte estable con baseline, evidencia de imports dinámicos, auditoría de tree-shaking y límites de medición.

- [ ] **Step 1: Ejecutar la medición de referencia**

Run:

```bash
npm run build
npx vite build --manifest
```

Registrar los valores de la corrida actual:

```text
index: 233.49 kB / 75.05 kB gzip
firebase: 359.01 kB / 109.95 kB gzip
CSS global: 80.67 kB / 15.66 kB gzip
LandingNueva: 23.99 kB / 7.39 kB gzip
```

- [ ] **Step 2: Documentar evidencia de route splitting**

Crear `docs/PERFORMANCE.md` con estas secciones y hechos verificables:

```markdown
# Performance

## Baseline

Fecha de medición: 2026-08-05
Herramientas: `npm run build`, `npx vite build --manifest`

| Asset | Tamaño | Gzip |
|---|---:|---:|
| Entry `index` | 233.49 kB | 75.05 kB |
| `firebase` | 359.01 kB | 109.95 kB |
| CSS global | 80.67 kB | 15.66 kB |
| `LandingNueva` | 23.99 kB | 7.39 kB |

## Code Splitting

`src/App.tsx` carga las páginas con `lazy()`. La manifest de Vite lista `_firebase-*.js` como dependencia dinámica de `Contacto`, `Servicios`, `Reservar` y dashboard, pero no como import estático de `index.html`. `main.tsx` no importa `src/services/firebase.ts`.

## Tree-Shaking Audit

Los consumidores importan funciones concretas desde `firebase/auth`, `firebase/firestore` y `firebase/functions`; no se usa el namespace legacy `firebase/*`. `firebase.ts` concentra la inicialización y App Check en el chunk de Firebase, que queda fuera del entry público.

## Objetivos Y Límites

- FCP objetivo: < 1.5 s en 3G.
- LCP objetivo: < 2.5 s.
- Estado: FCP/LCP pendientes de Lighthouse o WebPageTest sobre una URL accesible.
- No se afirma mejora before/after de red porque no hay browser QA habilitado en este entorno.

## Decisión

No se divide adicionalmente `firebase.ts`: el objetivo de primer render público ya está cubierto y no hay medición de red que justifique mayor complejidad.

## Reproducción

```bash
npm run build
npx vite build --manifest
npm run test:client
npx tsc --noEmit
```

- [ ] **Step 3: Revisar consistencia del reporte**

Confirmar que el documento no marque FCP/LCP como cumplidos, no prometa una reducción de bytes que no fue medida y no incluya URLs o datos productivos.

- [ ] **Step 4: Commit**

```bash
git add docs/PERFORMANCE.md
git commit -m "docs: record performance baseline"
```

---

### Task 2: Actualizar el estado de Fase 3

**Files:**
- Modify: `docs/Fase3.md:173-183`

**Interfaces:**
- Consumes: `docs/PERFORMANCE.md` y la manifest generada por Vite.
- Produces: AC de T3.9 alineados con la evidencia real, sin cerrar gates de navegador no ejecutados.

- [ ] **Step 1: Marcar solo los AC demostrados**

Actualizar T3.9 así:

```markdown
- [x] Lazy load `firebase.ts` solo cuando se necesita: route splitting existente; Firebase no es import estático del entry público.
- [x] Auditoría de bundle y tree-shaking documentada en `docs/PERFORMANCE.md`.
- [ ] Medir con Lighthouse / WebPageTest antes y después: pendiente por falta de browser QA habilitado.
- [x] Verificar que los imports de `firebase/auth`, `firebase/firestore` y `firebase/functions` son modulares.
- [ ] Migrar `moduleResolution: node10` a `bundler`: fuera de alcance y sin mejora medida.
```

Agregar una nota indicando que el baseline no justifica dividir más Firebase y que no hubo cambios de código.

- [ ] **Step 2: Commit**

```bash
git add docs/Fase3.md
git commit -m "docs: close measured performance audit"
```

---

### Task 3: Verificar y sincronizar evidencia

**Files:**
- Modify: `docs/release-preflight.md` (generado por el comando)

**Interfaces:**
- Consumes: reporte y estado T3.9 de Tasks 1-2.
- Produces: working tree limpio, preflight actualizado y commits sincronizados con `origin/main`.

- [ ] **Step 1: Ejecutar verificaciones de regresión**

Run: `npm run test:client`

Expected: 70 tests PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 y tamaños compatibles con el reporte.

- [ ] **Step 2: Ejecutar preflight**

Run: `npm run release:preflight`

Expected: `PASS_WITH_WARNINGS`; los warnings deben limitarse a advisories conocidos y gates externos no autorizados.

- [ ] **Step 3: Revisar diff y sincronizar**

Run:

```bash
git diff --check
git status --short --branch
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: sin errores de diff, working tree limpio y hash local igual al hash remoto.
