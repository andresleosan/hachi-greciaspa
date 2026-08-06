# Superponer Escenas Del Hero Cinematográfico

## Estado

Diseño aprobado por el operador el 2026-08-05, opción 1.

## Causa raíz

`CinematicHero` contiene cuatro `.sl-scene` consecutivas en flujo normal, cada una con `height: 100svh`. La timeline de GSAP recorta la escena anterior con `clip-path`, pero la siguiente sigue ubicada debajo en el documento; no ocupa el mismo viewport durante el pin. El resultado es un tramo negro mientras la timeline avanza hacia una escena que todavía está fuera de la pantalla.

Reducir `ScrollTrigger.end` de `+=340%` a `+=260%` aceleró el recorrido, pero no resolvió esta causa estructural.

## Decisión

Convertir el hero animado en una composición de escenas superpuestas, activada solo cuando GSAP está listo:

- `.sl-hero` conservará el flujo normal por defecto. Después de cargar GSAP, recibirá `sl-hero--animated`, pasará a ser un contenedor de una sola pantalla (`height: 100svh`, con el mínimo actual de `620px`) y conservará su posición como trigger/pin.
- Solo `.sl-hero--animated .sl-scene` usará `position: absolute; inset: 0; height: 100%` para que las cuatro escenas compartan exactamente el mismo viewport.
- La escena inicial conservará el estado visible al abrir la página.
- Se mantendrá `end: '+=260%'`, la timeline actual, el `clip-path`, las cuatro escenas y el CTA final.
- En `prefers-reduced-motion`, ante un error de carga o sin JavaScript, la clase no se activa y las escenas permanecen en `position: relative`, `height: 100svh` y flujo normal; así el fallback sigue mostrando todo el contenido.

## Alternativas descartadas

- Quitar `clip-path`: elimina el hueco, pero también elimina la transición cinematográfica.
- Mover escenas con `translateY(-100%)`: conserva el flujo acumulado y depende de cálculos frágiles de altura.

## Verificación

- Añadir tests fuente para proteger la superposición, el pin `+=260%` y el fallback de movimiento reducido.
- Ejecutar `npm run test:client`.
- Ejecutar `npx tsc --noEmit`.
- Ejecutar `npm run build`.
- Revisar desktop y móvil: la siguiente escena debe aparecer sobre la anterior, sin pantallas negras intermedias; la primera escena debe conservar su inicio y el CTA final debe permanecer visible.
- Si no hay navegador interactivo disponible, reportar esa limitación explícitamente y no afirmar QA visual.

## Fuera de alcance

- No cambiar el copy, tipografía, colores ni contenido de las escenas.
- No modificar `Storytelling`, `ServiceReels` ni otros timelines.
- No agregar dependencias ni tocar configuración de producción.
