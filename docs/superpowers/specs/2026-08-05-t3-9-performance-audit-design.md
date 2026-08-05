# T3.9: Auditoría De Performance Y Bundle Splitting

## Estado

Enfoque aprobado por el operador el 2026-08-05: documentar el baseline y conservar el code splitting existente sin cambios especulativos de código.

## Objetivo

Verificar con evidencia de build que las páginas públicas no cargan Firebase en el entry inicial, registrar los tamaños actuales del bundle y dejar explícitos los límites de medición que requieren Lighthouse, WebPageTest o browser QA.

## Hallazgos del baseline

Medición ejecutada con `npm run build` y `npx vite build --manifest`:

| Asset | Tamaño | Gzip |
|---|---:|---:|
| Entry `index` | 233.49 kB | 75.05 kB |
| `firebase` | 359.01 kB | 109.95 kB |
| CSS global | 80.67 kB | 15.66 kB |
| `LandingNueva` | 23.99 kB | 7.39 kB |

La manifest demuestra que `_firebase-*.js` no es import del entry `index.html`. Solo aparece como dependencia dinámica de `Contacto`, `Servicios`, `Reservar` y páginas del dashboard. La landing (`/`) usa `lazy()` en `src/App.tsx` y no importa `src/services/firebase.ts` desde `main.tsx`.

## Decisión

No se dividirá adicionalmente `firebase.ts` en esta tarea. El objetivo de primer render público ya está cubierto por el route splitting existente. Separar Auth, Firestore, Functions y App Check tendría mayor superficie de cambio y no está justificado sin medición de red por ruta.

La entrega será documental:

- `docs/PERFORMANCE.md` registrará baseline, manifest, tree-shaking audit y comandos reproducibles.
- `docs/Fase3.md` marcará como cumplido el lazy loading y la auditoría de bundle.
- FCP/LCP quedan pendientes de medición real en Lighthouse/WebPageTest sobre una URL accesible; no se afirmarán como cumplidos con datos de build.
- La migración de `moduleResolution: node` a `bundler` queda fuera de esta entrega porque no produce por sí sola una mejora medida y puede cambiar resolución TypeScript.

## Criterios de verificación

- `npm run build` termina con código 0.
- La manifest de Vite conserva `index.html` como entry y `_firebase-*.js` fuera de sus imports estáticos.
- `npm run test:client`, typecheck y build permanecen verdes.
- El documento reporta el objetivo FCP < 1.5 s y LCP < 2.5 s como pendiente hasta ejecutar Lighthouse/WebPageTest.
- No se modifican rutas, lógica de negocio, SDKs ni configuración de producción.

## Fuera de alcance

- No se instala Lighthouse, Playwright ni WebPageTest en esta tarea.
- No se despliega a producción.
- No se modifica `moduleResolution`, Firebase App Check ni el proveedor Firebase.
