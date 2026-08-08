# Catalogo Real y WhatsApp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alinear las paginas publicas y el seed de Firestore con el tarifario real del PDF y publicar el WhatsApp real `+52 55 7887 5525`.

**Architecture:** Se conserva la arquitectura actual: la landing usa datos estaticos y `/servicios`/`/precios` leen el catalogo de Firestore. La opcion aprobada es una sincronizacion conservadora entre `src/landing/data.ts` y `tools/seed-services.mjs`, con una constante de contacto compartida para todos los enlaces de WhatsApp. No se modifica el flujo autenticado de reservas.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Firebase Firestore, Vitest, Playwright local contra emuladores.

## Global Constraints

- La fuente comercial es `F:\Proyectos\hachi-greciaspa\Docs\Precios hachi-greciaspa.pdf`.
- Cada CTA de WhatsApp debe apuntar exactamente a `https://wa.me/525578875525?src=qr`.
- El numero visible es `+52 55 7887 5525`.
- El tarifario debe distinguir Spa Day de pelo corto y pelo largo sin nudos.
- Los precios variables se muestran como `Variable`, nunca como cero ni como un importe inventado.
- No se ejecuta ningun seed contra produccion ni se despliega.
- No se modifica la logica de disponibilidad, creacion o reagendado de reservas.
- Se conserva la identidad visual luxe existente y se evitan estilos inline nuevos.
- No se agregan dependencias nuevas.
- No se hacen commits sin confirmacion explicita del operador.

---

## File Map

- Create: `src/config/contact.ts` - constante de contacto comercial.
- Create: `src/config/contact.test.ts` - contrato del numero y URL real.
- Modify: `src/landing/data.ts` - precios, servicios y notas comerciales estaticas.
- Create: `src/landing/data.test.ts` - regresiones de importes y etiquetas publicas.
- Modify: `src/components/PricesList.tsx` - agrupacion, orden y formato del tarifario Firestore.
- Create: `src/components/PricesList.test.tsx` - pruebas de formato y agrupacion del tarifario.
- Modify: `src/pages/Precios.tsx` - avisos comerciales y CTA WhatsApp.
- Modify: `src/pages/Servicios.tsx` - precio comercial de cada tarjeta.
- Modify: `src/app/pages/Inicio.html` - eliminar contacto y precios legacy ficticios.
- Modify: `src/app/pages/Servicios.html` - eliminar precios legacy ficticios.
- Modify: `src/pages/Contacto.tsx` - WhatsApp real.
- Modify: `src/landing/HeaderGlass.tsx` - CTA visible a WhatsApp.
- Modify: `src/landing/SectionsLuxe.tsx` - CTA WhatsApp de la landing.
- Modify: `src/landing/FooterGlass.tsx` - contacto luxe real.
- Modify: `src/components/Footer.tsx` - contacto legacy real.
- Modify: `src/app/pages/Inicio.html` - telefono legacy real.
- Modify: `src/seo/seo.ts` - metadata publica consistente.
- Modify: `index.html` - telefono real en JSON-LD.
- Modify: `tools/seed-services.mjs` - catalogo Firestore alineado al PDF.
- Modify: `src/components/Footer.test.tsx` - enlace y numero de WhatsApp.
- Modify: `src/seo/seo.test.ts` - descripciones publicas actualizadas.
- Modify: `tools/PublicPages.test.ts` - contrato de CTA en paginas publicas.
- Modify: `package.json` - incluir las nuevas pruebas unitarias en `test:client`.
- Create: `qa/tests/local-public.spec.mjs` - smoke E2E de precios, servicios y contacto.
- Modify: `qa/playwright.local.config.mjs` - incluir la suite publica local.

## Task 1: Contacto Real y Metadata

**Files:**
- Create: `src/config/contact.ts`
- Create: `src/config/contact.test.ts`
- Modify: `src/landing/HeaderGlass.tsx`
- Modify: `src/landing/FooterGlass.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/app/pages/Inicio.html`
- Modify: `src/pages/Contacto.tsx`
- Modify: `src/landing/SectionsLuxe.tsx`
- Modify: `src/seo/seo.ts`
- Modify: `index.html`
- Test: `src/components/Footer.test.tsx`, `src/seo/seo.test.ts`, `tools/PublicPages.test.ts`

**Interfaces:**
- `contact.ts` produce `WHATSAPP_DISPLAY: string` and `WHATSAPP_URL: string`.
- Todos los componentes publicos consumen esas constantes y no copian el numero literal.

- [ ] **Step 1: Write the failing contact contract tests.**

  En `src/config/contact.test.ts`, importar las dos constantes y comprobar:

  ```ts
  expect(WHATSAPP_DISPLAY).toBe('+52 55 7887 5525')
  expect(WHATSAPP_URL).toBe('https://wa.me/525578875525?src=qr')
  ```

  En `Footer.test.tsx`, comprobar que el markup contiene el href exacto y el numero visible. En `seo.test.ts`, actualizar las expectativas de las descripciones de `/precios` y `/contacto`.

- [ ] **Step 2: Run the focused tests and verify the new contract fails.**

  Run: `npx vitest run src/config/contact.test.ts src/components/Footer.test.tsx src/seo/seo.test.ts tools/PublicPages.test.ts`

  Expected: FAIL because `src/config/contact.ts` and the real contact markup do not exist yet.

- [ ] **Step 3: Implement the shared contact constants.**

  Crear `src/config/contact.ts` con exactamente:

  ```ts
  export const WHATSAPP_DISPLAY = '+52 55 7887 5525'
  export const WHATSAPP_URL = 'https://wa.me/525578875525?src=qr'
  ```

- [ ] **Step 4: Replace public placeholder contact values.**

  Importar `WHATSAPP_DISPLAY` y `WHATSAPP_URL` en los componentes publicos. Renderizar los enlaces externos como `<a href={WHATSAPP_URL} target="_blank" rel="noreferrer">...WhatsApp...</a>`. Mantener los enlaces internos como `Link`. Reemplazar tambien el telefono ficticio de `src/app/pages/Inicio.html`, aunque ese HTML legacy no sea una ruta React activa.

  Actualizar `index.html` para que JSON-LD use `"telephone": "+52 55 7887 5525"`. Actualizar `/precios` y `/contacto` en `src/seo/seo.ts` sin afirmar precios que no existan en el PDF.

- [ ] **Step 5: Run the focused tests and verify they pass.**

  Run: `npx vitest run src/config/contact.test.ts src/components/Footer.test.tsx src/seo/seo.test.ts tools/PublicPages.test.ts`

  Expected: PASS, sin el numero ficticio en los componentes cubiertos.

## Task 2: Catalogo Estatico y Seed Real

**Files:**
- Modify: `src/landing/data.ts`
- Create: `src/landing/data.test.ts`
- Modify: `tools/seed-services.mjs`
- Modify: `package.json`

**Interfaces:**
- `data.ts` produce `PRICING_SPA`, `EXTRAS_LIST`, `SERVICES`, `COMMERCIAL_NOTES` y `SERVICE_PRICE_LABELS` para las paginas publicas.
- `SERVICE_PRICE_LABELS` usa las claves Firestore `spa-day`, `grooming`, `guarderia` y `pension`.

- [ ] **Step 1: Write failing catalog assertions.**

  Crear `src/landing/data.test.ts` y comprobar al menos:

  ```ts
  expect(PRICING_SPA.short.find((item) => item.size === 'Grande')?.price).toBe('$550')
  expect(PRICING_SPA.long.find((item) => item.size === 'Grande')?.price).toBe('$690')
  expect(EXTRAS_LIST).toContainEqual({ name: 'Corte de uñas', price: '$70' })
  expect(SERVICE_PRICE_LABELS['guarderia']).toBe('$250/día · $3,500/mes')
  expect(COMMERCIAL_NOTES).toContain('Afiliados Hexalud obtienen 10% de descuento en cualquier servicio.')
  ```

- [ ] **Step 2: Run the catalog test and verify it fails for missing exports or stale values.**

  Run: `npx vitest run src/landing/data.test.ts`

  Expected: FAIL until the explicit commercial constants are present.

- [ ] **Step 3: Update the static catalog.**

  Mantener los importes exactos del PDF: Spa Day corto `240, 280, 340, 420, 550`; largo sin nudos `280, 300, 390, 490, 690`; extras `140, 180, 180, 140, 70, 100` y tres variables; Guarderia `250` eventual y `3500` mensual; Pension `300` baja y `380` alta. Normalizar el typo del PDF a `Grooming` en la interfaz.

  Agregar notas de productos, espacio libre de jaulas, condiciones de cambio de precio y descuento Hexalud en una constante reutilizable por la landing y `/precios`.

- [ ] **Step 4: Align the Firestore seed without changing reservation data.**

  Actualizar `SERVICIOS` y `PRECIOS` en `tools/seed-services.mjs` para que nombres, descripciones, categorias, unidades, notas e importes coincidan con `data.ts`. Mantener IDs estables existentes, incluido el documento de extras variables, para que el seed siga siendo idempotente y no cree duplicados.

- [ ] **Step 5: Include the catalog test in the client test script and run it.**

  Agregar `src/config/contact.test.ts`, `src/landing/data.test.ts` y `src/components/PricesList.test.tsx` a `test:client` en `package.json`.

  Run: `npx vitest run src/landing/data.test.ts`

  Expected: PASS.

## Task 3: Tarifario y Tarjetas de Servicios

**Files:**
- Modify: `src/components/PricesList.tsx`
- Create: `src/components/PricesList.test.tsx`
- Modify: `src/pages/Precios.tsx`
- Modify: `src/pages/Servicios.tsx`
- Modify: `src/app/pages/Inicio.html`
- Modify: `src/app/pages/Servicios.html`
- Modify: `src/landing/data.ts` if a display label needs correction

**Interfaces:**
- `PricesList` sigue leyendo `PriceItem` desde `precios`, conservando busqueda y filtro.
- `Servicios` consume `SERVICE_PRICE_LABELS[s.id]` para el texto de precio comercial.
- `formatPrice(item: Pick<PriceItem, 'price' | 'priceHigh' | 'unit'>): string` produce el texto visible del importe.

- [ ] **Step 1: Define deterministic price formatting tests.**

  Extraer funciones puras de `PricesList.tsx` solo si el componente actual lo necesita: una para formatear importes y otra para ordenar/grupar. Cubrir `price`, `priceHigh`, unidad `/noche`, precio variable y categorias `Spa`, `Extra`, `Estancia`.

  Expected assertions:

  ```ts
  expect(formatPrice({ price: 240 })).toBe('$240')
  expect(formatPrice({ price: null, priceHigh: null })).toBe('Variable')
  expect(formatPrice({ price: 300, unit: '/noche' })).toBe('$300/noche')
  ```

- [ ] **Step 2: Run the focused price tests before implementation.**

  Run: `npx vitest run src/components/PricesList.test.tsx`

  Expected: FAIL if the helper/test file is newly introduced.

- [ ] **Step 3: Group and format the Firestore price list.**

  Mantener el filtro `Todos` y la busqueda existente. Mostrar secciones en orden `Spa Day`, `Extras`, `Otros servicios` y una seccion `General` solo para documentos administrados sin categoria. Dentro de Spa Day, separar notas de `Pelo corto` y `Pelo largo sin nudos`; no mezclar tallas. Mostrar `Variable` cuando ambos campos numericos sean nulos.

  Usar headings semanticos y conservar las clases `sl-catalog-*` existentes para no romper el sistema visual.

- [ ] **Step 4: Add the commercial notes and WhatsApp CTA to `/precios`.**

  En `Precios.tsx`, renderizar `COMMERCIAL_NOTES` debajo de la lista y un enlace con `WHATSAPP_URL` que diga `Consultar por WhatsApp`. Mantener el boton de imprimir/exportar.

- [ ] **Step 5: Replace duration-as-price in `/servicios`.**

  Importar `SERVICE_PRICE_LABELS` y pasar `price={SERVICE_PRICE_LABELS[s.id ?? '']}` a `ServiceCard`. No usar `durationMin` como precio. Mantener `serviceId` para que el CTA `Reservar` conserve el flujo actual. Sustituir tambien los cuatro servicios y precios ficticios de `src/app/pages/Inicio.html` y `src/app/pages/Servicios.html` por Spa Day, Grooming, Guarderia, Pension y los importes reales del PDF.

- [ ] **Step 6: Run focused tests and build.**

  Run: `npx vitest run src/landing/data.test.ts src/components/Footer.test.tsx tools/PublicPages.test.ts`

  Expected: PASS.

## Task 4: Smoke E2E Publico Local

**Files:**
- Create: `qa/tests/local-public.spec.mjs`
- Modify: `qa/playwright.local.config.mjs`

**Interfaces:**
- La suite consume `QA_BASE_URL` y el seed local generado por `qa/local/run.mjs`.
- No requiere login ni nuevas credenciales.

- [ ] **Step 1: Write public smoke tests.**

  Crear tres pruebas Playwright:

  ```js
  test('public prices show real catalog and WhatsApp', async ({ page }) => {
    await page.goto('/precios')
    await expect(page.getByText('Spa Day Mini', { exact: false })).toBeVisible()
    await expect(page.getByText('$240', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: /Consultar por WhatsApp/i })).toHaveAttribute('href', 'https://wa.me/525578875525?src=qr')
  })

  test('public services show commercial prices', async ({ page }) => {
    await page.goto('/servicios')
    await expect(page.getByText('Desde $240', { exact: true })).toBeVisible()
    await expect(page.getByText('$250/día · $3,500/mes', { exact: true })).toBeVisible()
  })

  test('contact page exposes the real WhatsApp', async ({ page }) => {
    await page.goto('/contacto')
    await expect(page.getByRole('link', { name: /WhatsApp/i })).toHaveAttribute('href', 'https://wa.me/525578875525?src=qr')
    await expect(page.locator('body')).not.toContainText('+52 55 1234 5678')
  })
  ```

- [ ] **Step 2: Configure the local runner to include both suites.**

  Cambiar `testMatch` para incluir `local-authenticated.spec.mjs` y `local-public.spec.mjs`, manteniendo `workers: 1`, trazas y reportes HTML.

- [ ] **Step 3: Run the public smoke tests and verify they fail before the UI changes.**

  Run: `npm run qa:local -- --grep "public prices|public services|contact page"`

  Expected: FAIL on missing real WhatsApp, grouping or commercial labels before implementation.

- [ ] **Step 4: Run the public smoke tests after implementation.**

  Run: `npm run qa:local -- --grep "public prices|public services|contact page"`

  Expected: PASS, with no real or placeholder secrets exposed in the page.

## Task 5: Full Verification and Handoff

**Files:**
- Modify: `docs/tasks.md` only if the operator wants this work tracked as a new task.
- Review: all files changed by Tasks 1-4.

- [ ] **Step 1: Run the client test suite.**

  Run: `npm run test:client`

  Expected: all listed client tests pass, including contact, catalog and public-page regressions.

- [ ] **Step 2: Run typecheck and build.**

  Run: `npx tsc --noEmit`

  Expected: exit code 0 with no new TypeScript errors.

  Run: `npm run build`

  Expected: Vite production build succeeds.

- [ ] **Step 3: Run the complete local browser QA.**

  Run: `npm run qa:local`

  Expected: authenticated and public suites pass against Auth, Firestore and Functions emulators. Known emulator warnings about unavailable optional services may remain and are not a test failure.

- [ ] **Step 4: Check placeholders and whitespace.**

  Run: `rg "\+52 55 1234 5678|href=\"#\"" src index.html tools qa`

  Expected: no fictitious phone; any remaining `href="#"` must be pre-existing and unrelated to contact CTAs.

  Run: `git diff --check`

  Expected: no whitespace errors.

- [ ] **Step 5: Perform the self-critique review.**

  Security: confirm the WhatsApp URL is a fixed constant, external links use `rel="noreferrer"`, no credentials or user data are added, and no production seed/deploy command ran.

  QA: confirm evidence from `npm run test:client`, `npx tsc --noEmit`, `npm run build`, `npm run qa:local` and `git diff --check`.

  Performance: confirm no new dependency, network request or animation was added to the public shell beyond existing Firestore reads.

- [ ] **Step 6: Review the final diff with the operator.**

  Run: `git status --short` and `git diff --stat`.

  Report changed files, test evidence, any known warnings and the fact that production was not seeded or deployed. Do not commit without an explicit operator request.
