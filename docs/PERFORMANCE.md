# Performance

## Baseline

Fecha de medición: 2026-08-06
Herramientas: `npm run build`, `npx vite build --manifest`
Versión: Vite 8.2.0

| Asset | Tamaño | Gzip |
|---|---:|---:|
| Entry `index` | 235.99 kB | 75.91 kB |
| `firebase` | 359.01 kB | 109.95 kB |
| CSS global | 86.64 kB | 16.71 kB |
| `LandingNueva` | 23.79 kB | 7.35 kB |

## Code Splitting

`src/App.tsx` carga las páginas con `lazy()`. La manifest de Vite lista `_firebase-*.js` como dependencia dinámica de `Contacto`, `Servicios`, `Reservar` y las páginas del dashboard, pero no como import estático de `index.html`.

`src/main.tsx` no importa `src/services/firebase.ts`. Por lo tanto, el primer render de la landing no descarga el chunk de Firebase; ese chunk se solicita cuando una ruta que necesita Auth, Firestore, Functions o App Check se carga.

## Baseline del hero R3F — 2026-08-08

Herramienta: Lighthouse 13.4.1 ejecutado con `npx --yes lighthouse` contra `vite preview` local, viewport desktop simulado y sin cache. El reporte JSON se generó fuera del repositorio para evitar incluir artefactos de auditoría.

| Métrica | Resultado observado |
|---|---:|
| Performance | 63/100 |
| Accessibility | 94/100 |
| Best Practices | 100/100 |
| SEO | 100/100 |
| FCP | 4.1 s |
| LCP | 7.6 s |
| CLS | 0 |
| TBT | 200 ms |
| Speed Index | 4.2 s |
| R3F/Three lazy chunk | 885.19 kB / 235.28 kB gzip |

El benchmark de `requestAnimationFrame` en Playwright headless/Windows registró `18.2 FPS` con canvas a 1440px. En viewport táctil de 390px el canvas se desactiva y se usa el fallback PNG; el documento registró `30.9 FPS`. Una corrida headed sin foco registró `3.0 FPS`, por lo que este entorno no entrega una medición válida de GPU/frame pacing de usuario real. Se conserva el dato como riesgo de QA: antes de producción hay que medir con una ventana enfocada y hardware representativo.

La inspección de `dist/index.html` confirma que `LogoHero` no aparece como `modulepreload`; el chunk se solicita por el `React.lazy` de la landing. El costo residual principal es la ejecución de GSAP/R3F durante el primer render y el tamaño de la textura oficial. Esta medición no demuestra 60 FPS ni debe considerarse una aprobación de producción.

Se probó una división manual de vendor R3F. Vite/Rolldown la convirtió en `modulepreload` y Lighthouse midió `1.65 s` de scripting en ese vendor; se retiró esa configuración porque empeoraba la carga inicial. El build mantiene `chunkSizeWarningLimit: 950` únicamente para no emitir un warning por el chunk diferido; no reduce su peso ni oculta una carga inicial.

## Tree-Shaking Audit

Los consumidores importan funciones concretas desde `firebase/auth`, `firebase/firestore` y `firebase/functions`; no se usa el namespace legacy `firebase/*`. `firebase.ts` concentra la inicialización y App Check en el chunk de Firebase, que queda fuera del entry público.

No se dividió adicionalmente `firebase.ts`: el objetivo de primer render público ya está cubierto y no hay medición de red por ruta que justifique introducir más módulos o complejidad.

## Decisión de optimización — 2026-08-08

Firebase ya está fuera del entry público, GSAP y Lenis se cargan dinámicamente, y las imágenes de contenido usan `loading="lazy"` y `decoding="async"`. El canvas R3F también está en un chunk dinámico y tiene fallback PNG. La prueba de vendor manual no mejoró Lighthouse y se revirtió. No se aplicará una segunda optimización especulativa sin una medición que demuestre que conserva la entrada 3D aprobada.

El score de Lighthouse queda como riesgo residual para una siguiente iteración de performance; la experiencia visual no se declara optimizada a 60 FPS solo por compilar. La siguiente medición debe ejecutarse sobre una URL accesible y repetir FCP/LCP, TBT, waterfall y frame pacing.

## Medición de verificación visual — 2026-08-08

Herramienta: Lighthouse 13.4.1 contra `vite preview` local, sin cache, con reportes JSON fuera del repositorio. La corrida desktop usó `--preset=desktop`; la mobile usó `--form-factor=mobile`.

| Viewport | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT | Speed Index |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Desktop | 95/100 | 94/100 | 100/100 | 100/100 | 0.5 s | 1.4 s | 0.004 | 0 ms | 1.2 s |
| Mobile | 60/100 | 94/100 | 100/100 | 100/100 | 4.4 s | 7.6 s | 0 | 190 ms | 5.4 s |

La corrida no registró elementos en `errors-in-console`. La diferencia entre desktop y mobile conserva como riesgo principal el costo del chunk diferido de R3F/Three; esta medición local no valida frame pacing en hardware real ni aprobación de producción.

## Objetivos Y Límites

- FCP objetivo: < 1.5 s en 3G.
- LCP objetivo: < 2.5 s.
- Estado: medidos en preview local; no equivalen a producción.
- No se afirma una mejora lineal before/after de Lighthouse: corridas consecutivas del mismo preview variaron entre 46 y 63/100; la corrida final registrada fue 63/100 y debe repetirse sobre una URL accesible de producción.
- No se modifica `moduleResolution` de `node` a `bundler` en esta tarea: no hay una mejora medida y el cambio puede alterar la resolución TypeScript.

## Reproducción

```bash
npm run build
npx vite build --manifest
npm run test:client
npx tsc --noEmit
```

La manifest reproducible queda en `dist/.vite/manifest.json` después de ejecutar `npx vite build --manifest`.
