# ADR-003: Imágenes de galería — Storage vs paths públicos

Fecha: 2026-07-31
Estado: aceptada e implementada

## Contexto

T2.7 (galería mínima funcional) requiere servir 6-8 fotos del spa. Hay dos opciones para dónde viven:

- **Cloud Storage para Firebase**, con `getDownloadURL(ref(storage, 'galeria/X.jpg'))` si más adelante se necesita una galería administrable.
- **Paths públicos estáticos** (`/galeria/X.jpg` en `public/`), servidos por el hosting (Vercel / Firebase Hosting).

Hoy el spa ya usa imágenes en `public/` (`tl.png`, `tr.png`, `bl.png`, etc. — referenciadas como `src="/tl.png"` en componentes). Ningún componente importa `firebaseStorage`.

## Decisión

**Usar paths públicos estáticos en `public/`, no Cloud Storage.**

- `Galeria.tsx` referencia directamente seis imágenes estáticas (`/tl.png`, `/tr.png`, `/bl.png`, `/br.png`, `/hachi-greciaspa.png` y `/contact-sheet.png`).
- No se usa `firebaseStorage`; el init de Storage y el emulador de Storage fueron removidos de la configuración operativa.

La implementación está verificada en `src/pages/Galeria.tsx` y `src/services/firebase.ts`. La galería es pública, no depende de una colección Firestore y no agrega una superficie de reglas de Storage.

## Alternativas consideradas

### A. Cloud Storage
- **Pro:** permite subir nuevas fotos sin redeploy (admin podría agregar fotos via UI en Fase 3).
- **Con:** agrega complejidad de Firestore rules para Storage (no cubiertas por `rules:test` actual), agrega getDownloadURL/async loading, +~25 KB al bundle. **Y para un MVP con 8 fotos fijas, no hay valor en subida dinámica.**

### B. (Elegida) Paths públicos estáticos
- **Pro:** 0 costo, 0 complejidad, sirve via CDN del hosting (Vercel ya configurado), cacheable aggressively, sin código async.
- **Con:** cambio de fotos requiere redeploy. Aceptable para el MVP de spa estático; la administración dinámica queda como gap de Fase 3.

### C. Dejar Storage inicializado por si se usa en Fase 3
- **Pro:** no hay que tocar `firebase.ts` ahora.
- **Con:** deja una superficie declarada sin uso, distancia entre "inicializado" y "usado". En la auditoría ya se anotó M1 como falso-corregido hasta Fase 1. Mejor limpiar ahora y reintroducir cuando realmente se necesite.

## Consecuencias

- **Se gana:** simplicidad: una superficie menos en el bundle, una configuración menos en `firebase.json`, surface reducida.
- **Se sacrifica:** subir fotos dinámicamente sin redeploy. Acción para Fase 3 si el spa quiere que el admin suba fotos: revertir este ADR, meter Storage, escribir Storage rules.
- **Trigger para revisar:** si en Fase 3 el admin necesita administrar galería sin pasar por el dev, re-evaluar.

## Refs

- tasks.md T2.7 AC.
- `src/pages/Galeria.tsx` (paths estáticos implementados).
- `src/services/firebase.ts` (sin inicialización de Storage).
- `firebase.json` (sin emulador de Storage).
- STACK.md "Limpieza de servicios sin uso".
- AUDITORIA.md M1 (la superficie de Storage se mantuvo fuera del MVP al elegir paths públicos).
