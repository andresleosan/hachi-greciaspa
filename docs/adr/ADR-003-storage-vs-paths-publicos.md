# ADR-003: Imágenes de galería — Storage vs paths públicos

Fecha: 2026-07-31
Estado: propuesta (pendiente de implementación en tasks.md T2.7)

## Contexto

T2.7 (galería mínima funcional) requiere servir 6-8 fotos del spa. Hay dos opciones para dónde viven:

- **Cloud Storage para Firebase** (ya inicializado en `firebase.ts:43,51`, emulador en `firebase.json` configurado en Fase 1), con `getDownloadURL(ref(storage, 'galeria/X.jpg'))`.
- **Paths públicos estáticos** (`/galeria/X.jpg` en `public/`), servidos por el hosting (Vercel / Firebase Hosting).

Hoy el spa ya usa imágenes en `public/` (`tl.png`, `tr.png`, `bl.png`, etc. — referenciadas como `src="/tl.png"` en componentes). Ningún componente importa `firebaseStorage` (verificado en exploración previa).

## Decisión

**Usar paths públicos estáticos en `public/galeria/`, no Cloud Storage.**

- Colocar las 8 fotos en `public/galeria/` (p.ej. `01.jpg` ... `08.jpg`).
- `Galeria.tsx` referencia directamente `src="/galeria/01.jpg"`.
- **Quitar** el init de `firebaseStorage` de `firebase.ts` (líneas 4, 26, 43, 51, 70) y la sección `storage` de `firebase.json` (agregada en Fase 1).

## Alternativas consideradas

### A. Cloud Storage
- **Pro:** permite subir nuevas fotos sin redeploy (admin podría agregar fotos via UI en Fase 3).
- **Con:** agrega complejidad de Firestore rules para Storage (no cubiertas por `rules:test` actual), agrega getDownloadURL/async loading, +~25 KB al bundle. **Y para un MVP con 8 fotos fijas, no hay valor en subida dinámica.**

### B. (Elegida) Paths públicos estáticos
- **Pro:** 0 costo, 0 complejidad, sirve via CDN del hosting (Vercel ya configurado), cacheable aggressively, sin código async.
- **Con:** cambio de fotos requiere redeploy. Aceptable para MVP de spa estático en Fase 2.

### C. Dejar Storage inicializado por si se usa en Fase 3
- **Pro:** no hay que tocar `firebase.ts` ahora.
- **Con:** deja una superficie declarada sin uso, distancia entre "inicializado" y "usado". En la auditoría ya se anotó M1 como falso-corregido hasta Fase 1. Mejor limpiar ahora y reintroducir cuando realmente se necesite.

## Consecuencias

- **Se gana:** simplicidad: una muerte menos en el bundle, una configuración menos en `firebase.json`, surface reducida.
- **Se sacrifica:** subir fotos dinámicamente sin redeploy. Acción para Fase 3 si el spa quiere que el admin suba fotos: revertir este ADR, meter Storage, escribir Storage rules.
- **Trigger para revisar:** si en Fase 3 el admin necesita administrar galería sin pasar por el dev, re-evaluar.

## Refs

- tasks.md T2.7 AC.
- `firebase.ts:43,51,70` (líneas a eliminar).
- `firebase.json` (sección `storage` a eliminar).
- STACK.md "Limpieza de servicios sin uso".
- AUDITORIA.md M1 (storage emulator sin definir en firebase.json — corregido en Fase 1, pero la reversión aquí lo elimina).
