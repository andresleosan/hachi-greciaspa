# Performance

## Baseline

Fecha de medición: 2026-08-05
Herramientas: `npm run build`, `npx vite build --manifest`
Versión: Vite 8.2.0

| Asset | Tamaño | Gzip |
|---|---:|---:|
| Entry `index` | 233.49 kB | 75.05 kB |
| `firebase` | 359.01 kB | 109.95 kB |
| CSS global | 80.67 kB | 15.66 kB |
| `LandingNueva` | 23.99 kB | 7.39 kB |

## Code Splitting

`src/App.tsx` carga las páginas con `lazy()`. La manifest de Vite lista `_firebase-*.js` como dependencia dinámica de `Contacto`, `Servicios`, `Reservar` y las páginas del dashboard, pero no como import estático de `index.html`.

`src/main.tsx` no importa `src/services/firebase.ts`. Por lo tanto, el primer render de la landing no descarga el chunk de Firebase; ese chunk se solicita cuando una ruta que necesita Auth, Firestore, Functions o App Check se carga.

## Tree-Shaking Audit

Los consumidores importan funciones concretas desde `firebase/auth`, `firebase/firestore` y `firebase/functions`; no se usa el namespace legacy `firebase/*`. `firebase.ts` concentra la inicialización y App Check en el chunk de Firebase, que queda fuera del entry público.

No se dividió adicionalmente `firebase.ts`: el objetivo de primer render público ya está cubierto y no hay medición de red por ruta que justifique introducir más módulos o complejidad.

## Objetivos Y Límites

- FCP objetivo: < 1.5 s en 3G.
- LCP objetivo: < 2.5 s.
- Estado: FCP/LCP pendientes de Lighthouse o WebPageTest sobre una URL accesible.
- No se afirma una mejora before/after de red porque no hay browser QA habilitado en este entorno.
- No se modifica `moduleResolution` de `node` a `bundler` en esta tarea: no hay una mejora medida y el cambio puede alterar la resolución TypeScript.

## Reproducción

```bash
npm run build
npx vite build --manifest
npm run test:client
npx tsc --noEmit
```

La manifest reproducible queda en `dist/.vite/manifest.json` después de ejecutar `npx vite build --manifest`.
