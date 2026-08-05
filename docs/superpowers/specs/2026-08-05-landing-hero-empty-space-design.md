# Corrección Del Espacio Vacío En El Hero

## Estado

Corrección aprobada por el operador el 2026-08-05.

## Causa raíz

`CinematicHero.tsx` mantiene el hero pinneado durante `end: '+=340%'`. Al final de la timeline, las líneas 110–112 recortan la última escena con `clipPath: inset(0 0 100% 0)`. El pin todavía ocupa el tramo final, pero ya no hay contenido visible, por lo que aparece un espacio negro y el scroll se percibe excesivo.

## Decisión

Eliminar únicamente la animación final que recorta `last`. La última escena, que contiene el CTA, permanecerá visible durante el cierre del pin. No se cambia `+=340%`, no se reestructura el hero y no se tocan otros timelines.

## Verificación

- Typecheck y build deben continuar pasando.
- La prueba visual debe confirmar que el CTA permanece visible al final del hero y que no aparece un tramo negro vacío.
- `prefers-reduced-motion` y el fallback estático permanecen sin cambios.

## Fuera de alcance

- No se rediseña la composición de escenas.
- No se modifica la duración global del pin.
- No se agregan dependencias ni se configura browser QA nuevo.
