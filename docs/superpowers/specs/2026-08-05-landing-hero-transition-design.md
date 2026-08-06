# Acortar la Transición Entre Escenas del Hero

## Estado

Diseño aprobado por el operador el 2026-08-05, opción 1.

## Problema

El hero cinematográfico conserva la primera escena correcta, pero el pin de GSAP dura `+=340%`. Las cuatro escenas se distribuyen en un recorrido demasiado largo y la transición entre ellas deja una sensación de espacio negro excesivo.

## Decisión

Reducir únicamente el `end` del `ScrollTrigger` de `+=340%` a `+=260%` en `src/landing/CinematicHero.tsx`.

Esto reduce el recorrido total aproximadamente 24%, mantiene:

- la escena inicial y su posición al abrir la página;
- las cuatro escenas y sus contenidos;
- la visibilidad de la escena final y su CTA;
- el fallback estático sin JavaScript;
- el comportamiento de `prefers-reduced-motion`;
- los timelines de las demás secciones.

## Alternativas descartadas

- `+=280%`: más conservador, pero deja parte del espacio percibido.
- Cambiar solo las duraciones internas: acelera elementos, pero no reduce suficientemente el recorrido de scroll.
- Eliminar o fusionar escenas: cambia la narrativa visual y excede el alcance.

## Verificación

- Actualizar el test fuente de `CinematicHero` para proteger el recorrido `+=260%` y la escena final visible.
- Ejecutar `npm run test:client`.
- Ejecutar `npx tsc --noEmit`.
- Ejecutar `npm run build`.
- Revisar visualmente desktop y móvil si el navegador está disponible; si no, reportar explícitamente el gate pendiente.

## Fuera de alcance

- No cambiar el contenido, tipografía, layout ni posición inicial.
- No modificar `Storytelling`, `ServiceReels` u otros timelines.
- No agregar dependencias ni tocar configuración de producción.
