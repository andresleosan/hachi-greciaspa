# ADR-004: Proveedor de email transaccional para recordatorios

Fecha: 2026-08-03
Estado: aceptada, integración implementada; configuración y despliegue pendientes

## Contexto

La Fase 3 necesita enviar recordatorios transaccionales de citas desde Firebase Functions. El baseline operativo es de **900 recordatorios por mes**, aproximadamente 30 por día, sin una necesidad actual de email marketing, inbound email o IP dedicada.

La integración de email está implementada en `functions/src/email/resend.ts`, `functions/src/templates/reminder.ts` y `functions/src/scheduledSendReminders.ts`. Todavía no se han configurado la cuenta, el dominio, el secreto ni el despliegue productivo.

Los precios y límites de este ADR fueron consultados en fuentes públicas de los proveedores el **2026-08-03**. Son precios en USD, antes de impuestos y sujetos a cambios.

## Decisión

**Usar Resend como proveedor primario y Postmark como fallback operativo.**

La primera implementación debe usar la API HTTPS de Resend desde Firebase Functions. El fallback no debe enviar el mismo recordatorio dos veces automáticamente: se activa mediante un cambio de configuración y una nueva ejecución controlada después de diagnosticar la falla del proveedor primario.

Es obligatorio usar un dominio propiedad del spa, previamente verificado en el proveedor. No se permite usar un dominio compartido, una dirección personal o el dominio de prueba del proveedor en producción. Se recomienda un subdominio dedicado, por ejemplo `mail.<dominio-del-spa>`, con SPF, DKIM y DMARC configurados según las instrucciones del proveedor.

## Comparación

| Criterio | Resend | Postmark | SendGrid |
|---|---|---|---|
| Free tier | $0/mes, 3,000 emails/mes, con límite de 100 emails/día | $0/mes, 100 emails/mes, sin overage; sirve para pruebas | Trial sin costo de 100 emails/día durante 60 días; no se trata como free tier permanente |
| Baseline de 900/mes | $0/mes en Free si el envío no supera 100/día | $15/mes en Basic, incluye 10,000/mes | $19.95/mes como entrada de Essentials; el precio exacto depende del volumen y features |
| Overage | Free no tiene overage; Pro parte de $20/mes por 50,000 y cobra $0.90/1,000 adicionales | Basic cobra $1.80/1,000 adicionales | En Essentials 50K, la tarifa pública de overage es $0.0013/email; el plan trial no permite exceder sus límites |
| Verificación de dominio | DNS con DKIM/SPF/DMARC; requiere al menos un dominio propio verificado | Dominio y DKIM; Return-Path personalizado opcional; sender signature confirmada | Domain Authentication con DNS es la opción de producción; Single Sender es solo para pruebas |
| Deliverability | API transaccional, supresiones, logs, webhooks y guías de autenticación; el resultado depende también de reputación y configuración DNS | Producto enfocado en email transaccional, message streams, supresiones, estadísticas y datos de bounce | Plataforma de gran escala con analytics, supresiones, domain authentication y opciones de IP dedicada |
| Integración con Firebase | API HTTPS y SDK oficial desde Functions; la clave se mantiene server-side | API HTTPS y SDK oficial de Node.js desde Functions | API HTTPS y SDK oficial desde Functions |
| Templates | Templates alojados con variables; hasta 20 variables por template | Templates alojados con alias y modelo; hasta 100 templates por server | Dynamic Templates y editor; más opciones de plataforma que las requeridas por este workload |
| Rate limits | 10 requests/segundo por team por defecto; responde 429 e incluye `retry-after` | La documentación expone 429 cuando se excede el uso aceptable, sin publicar un número general fijo | Límite por endpoint; headers `X-RateLimit-*`; responde 429 |
| Falla de API | 4xx de validación/autorización es permanente; 429 y 5xx son candidatos a retry acotado | 4xx es permanente; 429, 500 y 503 requieren tratamiento según la clase de error | 4xx es permanente; 429 y errores transitorios requieren respetar headers y retry acotado |

### Coste comparable

Para 900 emails/mes, el costo del proveedor separado del costo de Firebase es:

| Proveedor | Costo mensual de email en el baseline | Costo Functions/Blaze separado | Total de planificación |
|---|---:|---:|---:|
| Resend | $0 | $0 de uso medido estimado; requiere Blaze | $0-$3 |
| Postmark | $15 | $0 de uso medido estimado; requiere Blaze | $15-$18 |
| SendGrid | $19.95 | $0 de uso medido estimado; requiere Blaze | $19.95-$22.95 |

La estimación de Firebase Functions/Blaze asume una ejecución por recordatorio, sin volumen significativo de logs, almacenamiento o red. Las cuotas públicas de Blaze incluyen 2 millones de invocaciones/mes, 400,000 GB-segundo, 200,000 CPU-segundo y 5 GB de salida sin costo; 900 recordatorios quedan ampliamente por debajo. Blaze sigue siendo obligatorio para desplegar Functions y habilitar la facturación. El rango de $0-$3 es una reserva conservadora para costos incidentales de scheduler, logs o red, no un precio fijo garantizado.

## Motivos de selección

### Resend como primario

- El baseline completo cabe en el free tier mensual y su límite de 100/día es compatible con una distribución normal de aproximadamente 30 recordatorios/día.
- La API, los templates, los webhooks y la información de rate limit son directos para una Function pequeña que solo necesita enviar recordatorios.
- El modelo de dominio verificado y los controles SPF/DKIM/DMARC son suficientes para una identidad propia del spa sin introducir una IP dedicada.
- El proveedor ofrece una ruta clara para crecer: el plan Pro elimina el límite diario y mantiene un overage simple por cada 1,000 emails.

### Postmark como fallback

Postmark queda como fallback porque está enfocado en email transaccional, ofrece templates, message streams, estadísticas y datos de bounce, y tiene una API/SDK compatible con una Function Node.js. Su costo base de $15/mes es aceptable para continuidad operativa, aunque no es la opción primaria porque el free tier de 100 emails/mes no cubre el baseline.

### Por qué no SendGrid

SendGrid es técnicamente viable y tiene una plataforma madura, pero no es preferible para este workload pequeño: el acceso sin costo es un trial limitado a 60 días, el plan de entrada publicado cuesta $19.95/mes antes de overages y la superficie de producto, planes, analytics y configuración es mayor que la necesaria para 900 recordatorios transaccionales mensuales. No se descarta por deliverability; se descarta por costo de entrada y complejidad operativa relativa.

## Contrato de integración

La futura implementación debe cumplir exactamente este contrato:

```text
Secret: RESEND_API_KEY in Firebase Secret Manager
Caller: Firebase Functions only
Retries: maximum 3, bounded backoff
Permanent failure: record sanitized error and stop retrying
```

Detalles operativos:

- El frontend nunca recibe ni usa la API key. No se agrega una variable `VITE_*` para el proveedor.
- Los errores transitorios incluyen 429, timeout y 5xx; se reintentan como máximo tres veces con backoff acotado y sin reintentos infinitos.
- Los errores de autenticación, dominio no verificado, payload inválido, destinatario inválido o supresión se consideran permanentes y no se reintentan.
- El registro de falla debe excluir API keys, bodies completos, contenido del email y datos innecesarios del cliente; debe conservar solo código HTTP/clase, identificador interno de reserva y timestamp.
- La Function debe registrar el resultado de envío de forma correlacionable sin duplicar un recordatorio cuando una respuesta se pierde después de que el proveedor aceptó el mensaje.
- Si Resend está caído después del máximo de retries, se registra la falla y se detiene. El cambio a Postmark es una acción operativa controlada, no un envío paralelo automático.

## Consecuencias

- **Se gana:** costo de email $0 en el baseline, integración simple, templates fuera del código de la Function y una alternativa transaccional documentada.
- **Se sacrifica:** el free tier de Resend exige vigilar el límite diario; un pico de más de 100 recordatorios en un día requiere espaciar envíos o migrar al plan Pro.
- **Se agrega:** el proyecto debe pasar de Spark a Blaze para desplegar Functions y el operador debe configurar alertas de presupuesto antes de producción.
- **Se mantiene pendiente:** verificación real del dominio del spa, creación de `RESEND_API_KEY` en Secret Manager, template productivo, pruebas de entrega y configuración de alertas. El código de integración y sus pruebas locales ya están implementados.

## Refs y fuentes consultadas

Todas las fuentes siguientes fueron consultadas el 2026-08-03:

- Resend pricing: https://resend.com/pricing
- Resend API, response codes and rate limit: https://resend.com/docs/api-reference/introduction
- Resend rate limits and quotas: https://resend.com/docs/api-reference/rate-limit
- Resend domain management and DNS authentication: https://resend.com/docs/dashboard/domains/introduction
- Resend templates: https://resend.com/docs/dashboard/templates/introduction
- Postmark pricing: https://postmarkapp.com/pricing
- Postmark API overview and error codes: https://postmarkapp.com/developer/api/overview
- Postmark templates API: https://postmarkapp.com/developer/api/templates-api
- Postmark domains and DKIM/Return-Path verification: https://postmarkapp.com/developer/api/domains-api
- Postmark official Node.js integration: https://postmarkapp.com/developer/integration/official-libraries
- Twilio SendGrid Email API pricing: https://www.twilio.com/en-us/products/email-api/pricing
- Twilio SendGrid sender identity and domain authentication: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity
- Twilio SendGrid API rate limits: https://www.twilio.com/docs/sendgrid/api-reference/how-to-use-the-sendgrid-v3-api/rate-limits
- Firebase pricing and Blaze Cloud Functions quotas: https://firebase.google.com/pricing
- Firebase scheduled Functions: https://firebase.google.com/docs/functions/schedule-functions
- Firebase Secret Manager configuration: https://firebase.google.com/docs/functions/config-env#secret-manager
