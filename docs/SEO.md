# SEO técnico

## Implementado

- Metadata base en `index.html`: title, description, Open Graph, Twitter Card, canonical, robots y JSON-LD `PetStore`.
- `SeoManager` actualiza title, description, canonical, robots y social metadata durante la navegación SPA.
- Rutas públicas indexables: `/`, `/servicios`, `/precios`, `/equipo`, `/galeria` y `/contacto`.
- Rutas privadas o transaccionales con `noindex, nofollow`: `/login`, `/register`, `/reservar` y `/dashboard`.
- `/inicio` redirige a `/` y usa canonical raíz sin indexarse.
- `public/robots.txt` bloquea rutas privadas y referencia el sitemap.
- `public/sitemap.xml` enumera únicamente rutas públicas.

## Limitaciones

- El dominio canónico actual es `https://hachi-greciaspa.vercel.app`; debe actualizarse si se configura un dominio propio.
- Las métricas de rastreo y Search Console requieren configuración del operador y no se inventan en el repositorio.
- No se agregaron páginas legales porque su contenido todavía no está aprobado.

## Verificación local

```text
npx vitest run src/seo/seo.test.ts
npx tsc --noEmit
npm run build
```

El build genera `dist/robots.txt` y `dist/sitemap.xml`.
