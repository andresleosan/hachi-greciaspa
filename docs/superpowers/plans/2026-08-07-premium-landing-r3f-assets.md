# Premium Landing R3F Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Transformar la landing pública en una experiencia editorial nocturna con el logo oficial dentro de un hero R3F interactivo, reemplazar todos los assets públicos por los PNG oficiales y conservar intactos autenticación, Firebase, Firestore y reservas.

**Architecture:** Mantener `LandingNueva` y el timeline actual de `CinematicHero`; aislar la escena 3D en un `LogoHero` cargado de forma diferida. Centralizar todos los nombres de archivos en un manifiesto JSON consumido por los componentes y por un verificador Node, de modo que Storytelling, `ServiceReels`, galería, favicon y SEO no dupliquen rutas.

**Tech Stack:** React 19, TypeScript strict, Vite, Three.js, `@react-three/fiber`, `@react-three/drei`, GSAP/ScrollTrigger/Lenis existentes, Vitest, Playwright y Lighthouse.

## Global Constraints

- No modificar autenticación, Firebase, Firestore, Functions, reglas, disponibilidad ni procesos de reservas.
- Dirección visual: editorial nocturna, con tinta profunda, crema, bronce y sage.
- Usar exactamente los PNG de `F:\Proyectos\hachi-greciaspa\Img` y verificar nombres, extensiones, mayúsculas/minúsculas y rutas.
- El CTA único debe decir `Agendar cita · Iniciar sesión` y enlazar a `/reservar`.
- El indicador de scroll debe quedar en la esquina inferior derecha, con `DESLIZA` arriba y la flecha debajo.
- La entrada del logo dura 2 segundos: escala `0.2 → 1`, opacidad `0 → 1`, blur `20px → 0`.
- Mouse y parallax se limitan a `±6°`; breathing aproximado `±2%`.
- `prefers-reduced-motion` y ausencia de WebGL deben mostrar un fallback estático navegable.
- Three.js/R3F debe cargarse en un chunk diferido; no se agrega postprocesado ni partículas pesadas.
- Imágenes fuera del hero usan `loading="lazy"` y `decoding="async"`.
- No introducir estilos inline en componentes React.

---

### Task 1: Registrar y verificar assets oficiales

**Files:**
- Create: `public/img/Logo.png`
- Create: `public/img/FavIcon.png`
- Create: `public/img/01 · El punto de partida.png`
- Create: `public/img/02 · El cambio.png`
- Create: `public/img/03 · La experiencia.png`
- Create: `public/img/04 · El resultado.png`
- Create: `public/img/Atención personal.png`
- Create: `public/img/Calma absoluta.png`
- Create: `public/img/Detalles que importan.png`
- Create: `public/img/El ritual del baño.png`
- Create: `public/img/El servicio 01.png`
- Create: `public/img/El servicio 02.png`
- Create: `public/img/El servicio 03.png`
- Create: `public/img/El servicio 04.png`
- Create: `public/img/El servicio 05.png`
- Create: `public/img/Un día en el spa.png`
- Create: `src/landing/asset-manifest.json`
- Create: `src/landing/assets.ts`
- Create: `tools/verify-public-assets.mjs`
- Create: `src/landing/assets.test.ts`
- Modify: `package.json`

**Interfaces:**
- `asset-manifest.json` produce grupos `brand`, `story`, `services` y `gallery`, con `file` y etiqueta accesible.
- `assets.ts` exporta `BRAND_ASSETS`, `STORY_ASSETS`, `SERVICE_ASSETS`, `GALLERY_ASSETS` y `publicAsset(file: string): string`.
- `verify-public-assets.mjs` lee el mismo JSON, exige coincidencia exacta en `public/img`, detecta archivos faltantes y rechaza nombres duplicados.

- [ ] **Step 1: Copiar los 16 PNG únicos desde `F:\Proyectos\hachi-greciaspa\Img` a `public/img` sin renombrarlos.**

  Verificar antes de copiar que existan `Logo.png`, `FavIcon.png`, los cuatro archivos de storytelling, los cinco de servicios, los cinco captions de galería y `Un día en el spa.png`. El resultado esperado es que cada archivo aparezca con el mismo basename y extensión en `public/img`.

- [ ] **Step 2: Escribir el manifiesto JSON como única fuente de nombres.**

  El contenido debe declarar, como mínimo:

  ```json
  {
    "brand": { "logo": "Logo.png", "favicon": "FavIcon.png" },
    "story": [
      { "label": "01 · El punto de partida", "file": "01 · El punto de partida.png" },
      { "label": "02 · El cambio", "file": "02 · El cambio.png" },
      { "label": "03 · La experiencia", "file": "03 · La experiencia.png" },
      { "label": "04 · El resultado", "file": "04 · El resultado.png" }
    ]
  }
  ```

  Completar los grupos `services` y `gallery` con los nombres exactos de la especificación; los cinco archivos de servicio se referencian en ambos grupos sin duplicar archivos físicos.

- [ ] **Step 3: Implementar `publicAsset`.**

  `publicAsset` debe devolver `/img/${encodeURI(file)}` y no aceptar rutas externas, `..` ni barras iniciales en `file`.

- [ ] **Step 4: Escribir las pruebas de manifiesto antes del verificador.**

  `src/landing/assets.test.ts` debe comprobar cuatro escenas de storytelling, cinco servicios, diez entradas de galería, que logo y favicon existen en `BRAND_ASSETS`, y que no aparece ninguno de `tl.png`, `tr.png`, `bl.png`, `br.png` o `hachi-greciaspa.png`.

- [ ] **Step 5: Implementar el verificador Node y añadir el script.**

  Añadir a `package.json`:

  ```json
  "assets:check": "node tools/verify-public-assets.mjs"
  ```

  El comando debe terminar con código distinto de cero si falta un archivo, si el nombre no coincide exactamente o si una ruta antigua aparece en los módulos públicos.

- [ ] **Step 6: Ejecutar la prueba aislada.**

  Run: `npm run assets:check`

  Expected: salida indicando 16 archivos únicos verificados y proceso exitoso.

  Run: `npx vitest run src/landing/assets.test.ts`

  Expected: PASS.

---

### Task 2: Crear el runtime `LogoHero` con R3F

**Files:**
- Create: `src/landing/LogoHero.tsx`
- Create: `src/landing/logoHeroMotion.ts`
- Create: `src/landing/logoHeroMotion.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- `LogoHero` acepta `{ className?: string; logoSrc: string; reducedMotion?: boolean }` y renderiza canvas o fallback estático.
- `clampRotation(value: number, maxDegrees = 6): number` devuelve un ángulo limitado en grados.
- `getLogoMotion(progress: number, reducedMotion: boolean)` devuelve `{ scale, rotationY, rotationX, lightIntensity }` sin exceder límites.

- [ ] **Step 1: Añadir las dependencias estrictamente necesarias.**

  Añadir `three`, `@react-three/fiber` y `@react-three/drei` a `dependencies`, sin añadir postprocesado ni otra librería de animación.

- [ ] **Step 2: Escribir pruebas de límites de motion.**

  `logoHeroMotion.test.ts` debe comprobar que `clampRotation(20)` devuelve `6`, `clampRotation(-20)` devuelve `-6`, que `getLogoMotion(0.5, false)` mantiene escala positiva y rotaciones dentro de `±6`, y que `getLogoMotion(0.5, true)` devuelve un estado estable sin desplazamiento animado.

- [ ] **Step 3: Ejecutar las pruebas para confirmar el fallo inicial.**

  Run: `npx vitest run src/landing/logoHeroMotion.test.ts`

  Expected: FAIL porque aún no existen los helpers.

- [ ] **Step 4: Implementar helpers puros y el componente.**

  En `LogoHero.tsx`, cargar la textura con `useTexture(logoSrc)`, construir una capa frontal y capas traseras con separación Z pequeña, configurar `ambientLight` y una luz puntual tenue, y usar `useFrame` para modificar refs. La cámara debe permanecer centrada. Ninguna actualización de frame puede llamar a `setState`.

- [ ] **Step 5: Implementar fallback y reduced motion.**

  Renderizar `<img src={logoSrc} ...>` cuando `reducedMotion` sea verdadero, cuando el contexto WebGL no esté disponible o cuando el canvas falle al cargar. El fallback debe conservar `alt="Logo oficial Hachi y Grecia Spa"`.

- [ ] **Step 6: Ejecutar las pruebas.**

  Run: `npx vitest run src/landing/logoHeroMotion.test.ts`

  Expected: PASS.

---

### Task 3: Integrar `LogoHero` y el CTA en el hero existente

**Files:**
- Modify: `src/landing/CinematicHero.tsx`
- Modify: `src/styles/luxe.css`
- Modify: `tools/CinematicHero.test.ts`

**Interfaces:**
- `CinematicHero` continúa siendo responsable del timeline y expone el progreso al `LogoHero` mediante una ref estable o variable CSS, nunca mediante renders por frame.
- La escena final mantiene los enlaces existentes, pero el CTA principal visible usa el texto exacto `Agendar cita · Iniciar sesión` y destino `/reservar`.

- [ ] **Step 1: Añadir el contrato de fuente y fallback del logo.**

  Importar `BRAND_ASSETS.logo` y montar `LogoHero` dentro de un contenedor visual estable del hero. La carga debe usar `React.lazy`/`Suspense`; el fallback de Suspense debe ser el PNG estático, no una pantalla vacía.

- [ ] **Step 2: Añadir el indicador de scroll aprobado.**

  Crear en `CinematicHero.tsx` un elemento con texto `Desliza` encima de una flecha decorativa. La estructura debe ser:

  ```tsx
  <div className="sl-scroll-cue" aria-label="Desliza para continuar">
    <span className="sl-scroll-label">Desliza</span>
    <span className="sl-scroll-arrow" aria-hidden="true" />
  </div>
  ```

  La CSS debe posicionarlo `right` y `bottom`, en la esquina inferior derecha, con la etiqueta arriba y la flecha debajo.

- [ ] **Step 3: Integrar scroll sin estado React por frame.**

  Leer el progreso normalizado del hero en un ref y pasarlo a `getLogoMotion`. El timeline existente debe seguir usando `end: '+=260%'`, escenas superpuestas únicamente cuando `.sl-hero--animated` está activo y la escena final visible hasta el final del pin.

- [ ] **Step 4: Cambiar el CTA sin tocar autenticación.**

  Reemplazar únicamente el texto y el destino del CTA principal del hero por:

  ```tsx
  <Link className="sl-btn sl-btn--primary" to="/reservar">
    Agendar cita · Iniciar sesión
  </Link>
  ```

  No modificar `ProtectedRoute`, `Login`, `Reservar` ni hooks de auth.

- [ ] **Step 5: Escribir contratos estáticos del hero.**

  Ampliar `tools/CinematicHero.test.ts` para verificar el import del asset oficial, el lazy loading de `LogoHero`, el CTA exacto, la etiqueta `Desliza`, la clase del indicador y la posición CSS inferior derecha con etiqueta antes de flecha.

- [ ] **Step 6: Ejecutar pruebas de hero.**

  Run: `npx vitest run tools/CinematicHero.test.ts`

  Expected: PASS.

---

### Task 4: Reemplazar imágenes de Storytelling, servicios y galería

**Files:**
- Modify: `src/landing/Storytelling.tsx`
- Modify: `src/landing/ServiceReels.tsx`
- Modify: `src/landing/EditorialGallery.tsx`
- Modify: `src/landing/data.ts`
- Modify: `src/landing/data.test.ts`
- Modify: `src/styles/luxe.css`

**Interfaces:**
- Storytelling consume `STORY_ASSETS` por índice narrativo.
- `ServiceReels` consume `SERVICE_ASSETS` y conserva los IDs de reserva existentes.
- `EditorialGallery` consume diez entradas de `GALLERY_ASSETS`, con caption y alt descriptivo.

- [ ] **Step 1: Sustituir las cuatro rutas antiguas de Storytelling.**

  El objeto de cada escena debe conservar copy, `id`, `tone`, `points` y orden, cambiando solo `img` al registro oficial correspondiente y mejorando `alt` si el archivo lo requiere.

- [ ] **Step 2: Sustituir `REEL_IMAGES`.**

  Eliminar el array con `/tr.png`, `/br.png`, `/bl.png`, `/tl.png` y `/hachi-greciaspa.png`; usar `SERVICE_ASSETS.map(...)` manteniendo `REEL_SERVICE_IDS` sin cambios.

- [ ] **Step 3: Expandir la galería a diez entradas.**

  Actualizar `GALLERY` para renderizar las cinco escenas de atención/ritual, los cinco servicios y `Un día en el spa` en el orden del manifiesto. Mantener lazy loading, `decoding="async"`, captions y el layout editorial responsive; ajustar spans solo para que no haya overflow en mobile.

- [ ] **Step 4: Ajustar estilos de hover y reduced motion.**

  Mantener hover premium con `transform`/`filter` moderados y desactivar transiciones bajo `prefers-reduced-motion`. No añadir animaciones que dependan de layout o provoquen reflow continuo.

- [ ] **Step 5: Actualizar pruebas de datos.**

  Añadir aserciones para cuatro escenas, cinco servicios, diez entradas de galería y ausencia de las rutas antiguas.

- [ ] **Step 6: Ejecutar pruebas públicas de datos.**

  Run: `npx vitest run src/landing/data.test.ts src/landing/assets.test.ts tools/PublicPages.test.ts`

  Expected: PASS.

---

### Task 5: Favicon, manifest y metadatos oficiales

**Files:**
- Create: `public/site.webmanifest`
- Modify: `index.html`
- Modify: `src/seo/seo.ts`
- Modify: `src/seo/seo.test.ts`

**Interfaces:**
- `SEO_IMAGE_URL` apunta a la ruta pública del logo oficial.
- `site.webmanifest` declara nombre, colores de marca e icono oficial sin dependencias externas.

- [ ] **Step 1: Crear el manifest.**

  Declarar `name: "Hachi & Grecia Spa"`, `short_name: "Hachi & Grecia"`, `start_url: "/"`, `display: "standalone"`, `background_color: "#0C0E0B"`, `theme_color: "#C9A96A"` e icono `/img/FavIcon.png`.

- [ ] **Step 2: Actualizar `<head>`.**

  Añadir `link rel="icon"`, `link rel="apple-touch-icon"` y `link rel="manifest"` con rutas `/img/FavIcon.png` y `/site.webmanifest`. Cambiar OG image y Twitter image al logo oficial cuando se refieran al recurso de marca.

- [ ] **Step 3: Actualizar `SEO_IMAGE_URL`.**

  Usar `${SITE_URL}/img/Logo.png` y conservar el comportamiento de `SeoManager`, canonical, robots y rutas privadas.

- [ ] **Step 4: Añadir pruebas SEO.**

  Verificar que `SEO_IMAGE_URL` termina en `/img/Logo.png` y que las rutas privadas siguen siendo `noindex` mediante `getSeoConfig`.

- [ ] **Step 5: Ejecutar pruebas SEO.**

  Run: `npx vitest run src/seo/seo.test.ts`

  Expected: PASS.

---

### Task 6: Responsive, lint y accesibilidad verificable

**Files:**
- Create: `eslint.config.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/styles/luxe.css`
- Modify: `src/landing/LogoHero.tsx`
- Modify: `src/landing/CinematicHero.tsx`

**Interfaces:**
- `npm run lint` ejecuta ESLint sobre `src` y `tools` sin modificar runtime.
- Los breakpoints existentes conservan layout público y añaden reglas explícitas para `sl-scroll-cue`, canvas y fallback.

- [ ] **Step 1: Configurar lint mínimo.**

  Añadir las devDependencies `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks` y `globals`. Configurar ESLint flat config con parser TypeScript, reglas de hooks React y exclusión de `dist`, `node_modules`, `.superpowers` y archivos generados. La configuración debe cubrir `**/*.{ts,tsx,mts,cts}` y declarar browser/Node globals según la carpeta. Añadir:

  ```json
  "lint": "eslint ."
  ```

- [ ] **Step 2: Añadir estados responsive del hero.**

  Limitar DPR y amplitud de interacción con media queries y props; mantener el indicador inferior derecho dentro del viewport seguro, especialmente con notch y barras móviles.

- [ ] **Step 3: Añadir reduced motion y fallback de WebGL.**

  El canvas no debe montarse con animación continua cuando `matchMedia('(prefers-reduced-motion: reduce)')` sea verdadero. El DOM debe conservar el logo y CTA visibles aunque R3F no cargue.

- [ ] **Step 4: Ejecutar lint y TypeScript.**

  Run: `npm run lint`

  Expected: PASS sin warnings nuevos.

  Run: `npx tsc --noEmit`

  Expected: PASS sin errores.

---

### Task 7: Integración y verificación final

**Files:**
- Modify: `docs/STACK.md`
- Modify: `docs/PERFORMANCE.md`
- Modify: `docs/release-preflight.md` si las métricas o comandos de release requieren actualización

**Interfaces:**
- La documentación registra únicamente métricas observadas, comandos ejecutados y riesgos reales; no se declaran 60 FPS ni scores Lighthouse sin evidencia.

- [ ] **Step 1: Ejecutar la suite de cliente.**

  Run: `npm run test:client`

  Expected: PASS sin regresiones.

- [ ] **Step 2: Ejecutar build de producción.**

  Run: `npm run build`

  Expected: PASS; el reporte de Vite debe mostrar un chunk separado para Three/R3F y no debe haber errores de assets.

- [ ] **Step 3: Ejecutar verificación de assets y lint final.**

  Run: `npm run assets:check`

  Expected: 16 archivos únicos verificados.

  Run: `npm run lint`

  Expected: PASS.

- [ ] **Step 4: Ejecutar browser QA público.**

  Run: `npm run qa:local`

  Expected: los casos públicos existentes pasan; revisar además `/`, `/servicios`, `/galeria` y `/contacto` sin errores de consola ni imágenes 404.

- [ ] **Step 5: Verificar visualmente tres viewport.**

  Usar Playwright o el navegador habilitado en 1440px, 768px y 390px. Comprobar logo visible, CTA único, `DESLIZA` arriba de la flecha en esquina inferior derecha, scroll de cuatro escenas, fallback reduced-motion y ausencia de solapamiento con textos.

- [ ] **Step 6: Ejecutar Lighthouse con servidor de preview.**

  Run: `npm run preview -- --host 127.0.0.1`

  En otra terminal, ejecutar Lighthouse para `/` en desktop y mobile con salida HTML/JSON. Registrar FCP, LCP, CLS, TBT, performance, accessibility y best practices observados en `docs/PERFORMANCE.md`; no inventar métricas ni convertir un objetivo en resultado.

- [ ] **Step 7: Revisar diff de alcance.**

  Confirmar que `git diff --name-only` solo incluye landing, estilos, assets, SEO, manifest, configuración de lint/dependencias y documentación. Si aparecen cambios en auth, Firebase, Firestore, Functions, reglas o reservas, detener la integración y corregir el alcance antes de aceptar.

## Handoff

Implementar una tarea por vez con pruebas aisladas, revisar el diff después de cada tarea y repetir toda la verificación final después de cualquier ajuste. No crear commits automáticamente; los checkpoints quedan listos para que el operador decida la integración Git.
