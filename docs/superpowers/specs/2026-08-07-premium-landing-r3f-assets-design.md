# Hachi & Grecia SPA — Diseño de landing premium con R3F y assets oficiales

**Fecha:** 2026-08-07  
**Estado:** Diseño aprobado visualmente; pendiente de revisión del documento  
**Alcance:** Experiencia visual pública, branding, motion, assets, performance y conversión  

## Contexto y límites

La aplicación ya cuenta con una landing luxe basada en React, GSAP, Lenis y escenas de storytelling. El trabajo ampliará esa experiencia sin modificar autenticación, Firebase, Firestore, lógica de negocio, procesos de reservas ni contratos de rutas existentes.

La instalación no contiene `.cronos/AGENCY.md` ni `.cronos/MASTER_PROMPT.md`; se aplican las reglas resumidas de `AGENTS.md` y la documentación existente de `docs/STACK.md` y `docs/tasks.md`.

## Decisiones aprobadas

- Dirección visual: **A — editorial nocturna**.
- Logo principal: `F:\Proyectos\hachi-greciaspa\Img\Logo.png`.
- Favicon: `F:\Proyectos\hachi-greciaspa\Img\FavIcon.png`.
- Hero 3D: canvas Three.js/React Three Fiber con profundidad real perceptible.
- Técnica 3D: enfoque R3F híbrido, no vectorización obligatoria del logo.
- CTA: un único botón con el texto `Agendar cita · Iniciar sesión`, enlazado a `/reservar`. Se conserva la redirección existente al login para usuarios no autenticados.
- Indicador de scroll: esquina inferior derecha; `DESLIZA` arriba y flecha debajo, fuera del eje central del contenido.
- Se conserva la estructura narrativa actual de cuatro escenas.

## Design DNA

### Referencias consultadas

- **THE WELL:** navegación serena, foco en wellness y estructura editorial orientada a servicios.
- **Aman:** lujo silencioso, espacio negativo, jerarquía de reserva y composición sobria.
- **Aesop:** identidad sensorial, consistencia de marca y contenido estructurado sin depender de ornamento.

Estas referencias se usan para extraer patrones de composición e interacción, no para copiar contenido, assets ni layouts protegidos.

### Sistema visual

- **Paleta:** tinta profunda `#0C0E0B`, crema `#F2EDE1`, bronce `#C9A96A` y sage `#93A58C`.
- **Tipografía:** Fraunces para titulares editoriales y Manrope para interfaz, cuerpo y datos.
- **Tono:** sereno, premium y cercano.
- **Firma visual:** puerta de luz, composición nocturna, vidrio sutil y luz ambiental difusa.
- **Defaults evitados:** neón, partículas invasivas, bento grids decorativos, exceso de blur y tarjetas como lenguaje principal.

## Arquitectura propuesta

### Componentes

- `CinematicHero` sigue orquestando las cuatro escenas y el timeline de ScrollTrigger.
- `LogoHero` encapsula el canvas R3F, la cámara, las luces, las capas del logo, el fallback y la interacción.
- Un manifiesto de assets centraliza las rutas de storytelling, servicios, galería, logo y favicon.
- El canvas se carga mediante `React.lazy` y `Suspense` para que Three.js/R3F quede fuera del chunk inicial de la aplicación.

### Integración con la landing

- `LandingNueva` conserva la composición y el orden actual de secciones.
- `CinematicHero` incorpora `LogoHero` sin alterar las rutas ni los textos de negocio.
- El CTA único conserva el destino `/reservar`; no se añade un flujo paralelo de autenticación.
- Storytelling, `ServiceReels` y `EditorialGallery` consumen exclusivamente el manifiesto oficial.

### Fronteras explícitas

- No se modifica `src/services/firebase.ts`, servicios de reservas, reglas, Functions, `ProtectedRoute`, hooks de autenticación ni páginas privadas.
- No se cambia el contrato de ninguna ruta.
- No se agrega persistencia, telemetría de negocio ni dependencias de pago.

## LogoHero 3D

### Escena

- El PNG oficial se usa como textura frontal transparente.
- Se añaden capas traseras y geometría de soporte con separación Z pequeña para generar profundidad perceptible.
- La escena usa iluminación ambiente y una luz puntual suave; no se incorpora postprocesado pesado.
- La cámara mantiene la pieza centrada y limita la inclinación interactiva a `±6°`.

### Entrada

- Duración: `2s`.
- Escala: `0.2 → 1`.
- Opacidad: `0 → 1`.
- Blur del contenedor: `20px → 0`.
- Ease elegante, sin rebotes exagerados.

### Movimiento continuo

- Flotación vertical de amplitud mínima.
- Breathing aproximado de `±2%`.
- Rotación ambiental de pocos grados.
- Variación suave de luz y profundidad.
- Mouse con amortiguación y límite de `±6°`.
- Scroll modifica refs de Three.js para variar escala, rotación e iluminación a lo largo de las cuatro escenas.
- La animación por frame no actualiza estado React; usa refs para evitar renders innecesarios.

## Assets y narrativa

Los archivos se copiarán desde `F:\Proyectos\hachi-greciaspa\Img` a `public/img/`, conservando basename, mayúsculas, espacios, separadores y extensión PNG oficiales.

### Storytelling

| Escena | Archivo oficial |
|---|---|
| `01 · El punto de partida` | `01 · El punto de partida.png` |
| `02 · El cambio` | `02 · El cambio.png` |
| `03 · La experiencia` | `03 · La experiencia.png` |
| `04 · El resultado` | `04 · El resultado.png` |

### Servicios

| Escena | Archivo oficial |
|---|---|
| `El servicio 01` | `El servicio 01.png` |
| `El servicio 02` | `El servicio 02.png` |
| `El servicio 03` | `El servicio 03.png` |
| `El servicio 04` | `El servicio 04.png` |
| `El servicio 05` | `El servicio 05.png` |

### Galería — diez imágenes oficiales

| Caption | Archivo oficial |
|---|---|
| `Atención personal` | `Atención personal.png` |
| `Calma absoluta` | `Calma absoluta.png` |
| `Detalles que importan` | `Detalles que importan.png` |
| `El ritual del baño` | `El ritual del baño.png` |
| `El servicio 01` | `El servicio 01.png` |
| `El servicio 02` | `El servicio 02.png` |
| `El servicio 03` | `El servicio 03.png` |
| `El servicio 04` | `El servicio 04.png` |
| `El servicio 05` | `El servicio 05.png` |
| `Un día en el spa` | `Un día en el spa.png` |

### Marca

- `Logo.png` se usa en `LogoHero`, navegación y metadatos sociales cuando corresponda.
- `FavIcon.png` se usa en `link[rel="icon"]`, `apple-touch-icon` y `site.webmanifest`.

### Verificación

El plan de implementación incluirá una verificación automática que compruebe que cada asset del manifiesto existe con coincidencia exacta de nombre, extensión y ruta. Los cinco assets de servicio podrán ser consumidos por `ServiceReels` y por la galería sin duplicar archivos. Las referencias antiguas `tl.png`, `tr.png`, `bl.png`, `br.png` y `hachi-greciaspa.png` no deben quedar en los componentes públicos rediseñados.

## Favicon y SEO

- Añadir favicon PNG oficial.
- Añadir apple touch icon oficial.
- Añadir manifest estático con icono oficial.
- Actualizar Open Graph, Twitter card y schema para apuntar al recurso oficial elegido.
- Mantener `SeoManager` y la lógica de rutas existentes; solo se actualizan URLs de recursos visuales.

## Responsive y accesibilidad

- Desktop: canvas completo con interacción de mouse y profundidad.
- Tablet: canvas con amplitud reducida y DPR limitado.
- Mobile: canvas liviano, sin parallax agresivo y con reducción de luces; fallback PNG si WebGL no está disponible.
- `prefers-reduced-motion`: elimina la animación continua, la entrada compleja y el movimiento de scroll; muestra contenido y logo en estado estable.
- La flecha de scroll será decorativa con `aria-hidden="true"`; el texto principal seguirá siendo accesible en el DOM.
- El CTA tendrá foco visible, nombre accesible y destino funcional existente.
- Las imágenes narrativas tendrán `alt` descriptivo, `loading="lazy"` y `decoding="async"`.

## Performance

- Dependencias nuevas estrictamente necesarias: `three`, `@react-three/fiber` y `@react-three/drei`.
- Carga diferida del canvas y del runtime 3D.
- Una sola escena R3F en el hero, sin partículas ni postprocesado pesado.
- DPR limitado, especialmente en mobile.
- Uso de texturas oficiales sin duplicación en múltiples módulos.
- Limpieza explícita de geometrías, materiales, texturas y listeners al desmontar.
- Uso de `will-change` únicamente en elementos con animación real.
- Lazy loading obligatorio para imágenes fuera del hero.

## Manejo de fallos

- Si falla la importación de R3F, se muestra el logo estático y el hero sigue siendo navegable.
- Si WebGL no está disponible, se evita el canvas y se muestra el fallback PNG.
- Si una imagen no existe, la verificación de assets falla antes de aceptar la tarea; no se ocultan errores con placeholders.
- Si `prefers-reduced-motion` está activo, el runtime de movimiento no se monta.

## Verificación y criterios de aceptación

- `npm run build` pasa sin errores.
- `npx tsc --noEmit` pasa sin errores nuevos.
- `npm run lint` pasa; si el repositorio no tiene lint configurado, se incorporará una configuración mínima y explícita como parte de la implementación.
- Suite de cliente existente pasa sin regresiones.
- Verificación de assets pasa para las 14 imágenes de contenido únicas, logo y favicon; la galería renderiza diez entradas y reutiliza los cinco assets de servicio sin duplicarlos.
- No existen referencias públicas a las imágenes antiguas.
- No hay imágenes rotas ni rutas relativas inválidas en las páginas públicas.
- Browser QA cubre hero, CTA, scroll, reduced-motion y resoluciones desktop, tablet y mobile.
- No aparecen errores de consola durante navegación pública.
- Lighthouse se ejecuta en desktop y mobile; se registran métricas reales de performance, accesibilidad y best practices.
- Se inspecciona el frame pacing del hero para confirmar que el canvas no introduce degradación visible bajo interacción normal.

## Riesgos y mitigaciones

- **Peso de Three.js:** mitigado con lazy loading y chunk separado.
- **Fidelidad del PNG en profundidad:** se evita vectorización destructiva y se usan capas híbridas.
- **Dispositivos sin WebGL:** fallback estático visible y funcional.
- **Conflictos entre ScrollTrigger y canvas:** el scroll se comunica mediante refs y no mediante renders React por frame.
- **Nombres con espacios y caracteres especiales:** manifiesto único, `encodeURI` cuando corresponda y prueba de existencia exacta.
- **Cambios accidentales en reservas o auth:** revisión de diff limitada a landing, assets, SEO, manifest, estilos y dependencias visuales.

## Fuera de alcance

- Cambios en autenticación.
- Cambios en Firebase, Firestore, Functions o reglas.
- Cambios en procesos de reserva o disponibilidad.
- Rediseño del dashboard privado.
- Migración a Storage o CDN externo.
- Vectorización completa del logo salvo que una prueba técnica posterior demuestre que es necesaria y preserve fidelidad.
