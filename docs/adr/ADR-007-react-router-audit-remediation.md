# ADR-007: React Router y alerta de seguridad

Fecha: 2026-08-07
Estado: aceptada

## Contexto

`npm audit --omit=dev` reporta dos advisories de severidad alta en
`react-router`/`react-router-dom@7.18.2`, relacionados con superficies RSC y
server actions. La aplicación usa una SPA con `BrowserRouter` y no importa
APIs RSC, pero el advisory permanece en el árbol de producción.

La remediación automática sugerida por npm baja a `react-router-dom@7.11.0`.
Una prueba local de compatibilidad funcional pasó con esa versión, pero el
audit de producción de `7.11.0` reporta otros advisories altos de React Router.
El registro npm disponible no ofrece una versión posterior parcheada que
elimine el advisory actual.

## Decisión

Mantener `react-router-dom` fijado en `7.18.2` y no ejecutar
`npm audit fix --force` ni degradar a `7.11.0` hasta que exista una versión
parcheada compatible que reduzca el riesgo neto.

## Alternativas consideradas

- `npm audit fix --force` - descartada porque fuerza un cambio de versión que
  puede introducir una regresión y no constituye una remediación estable.
- Degradar a `7.11.0` - descartada porque el audit actualizado muestra otros
  advisories altos en esa versión.
- Ignorar el audit - descartada; el advisory queda documentado y debe
  revisitarse cuando el proveedor publique un parche.

## Consecuencias

- La reevaluación del 2026-08-07 con `npm audit --omit=dev` reporta `0
  vulnerabilities` sin cambiar la versión fijada; el contexto de la alerta
  anterior queda conservado para trazabilidad.
- No se introduce un downgrade rompiente ni se altera el flujo de routing
  validado.
- Se debe volver a ejecutar `npm audit --omit=dev` al publicar una nueva
  versión de React Router y antes del despliegue a producción.
