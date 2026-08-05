# Baseline De Cuotas Firebase Y Cloudflare R2

## Estado

Alcance aprobado por el operador el 2026-08-05: documentar las cuotas proporcionadas, sin habilitar Billing, crear recursos cloud ni integrar R2.

## Decisión

Actualizar `docs/STACK.md` y `docs/RUNBOOK.md` con dos escenarios explícitos:

1. **Actual:** Firebase Spark cubre el uso MVP de Auth, Firestore y Hosting; Cloud Functions requiere Blaze para producción aunque su cuota gratuita mensual cubra el volumen estimado.
2. **Futuro opcional:** Cloudflare R2 solo se consideraría si la galería deja de usar paths estáticos y necesita almacenamiento; no se agrega como dependencia ahora.

## Datos documentados

- Firebase Auth: 50,000 MAU y aproximadamente 10,000 verificaciones telefónicas/mes.
- Firestore: 1 GiB, 50,000 lecturas/día, 20,000 escrituras/día y 20,000 borrados/día.
- Realtime Database: 1 GiB, 100 conexiones simultáneas y 10 GB de descarga/mes.
- Cloud Functions: disponibles en Blaze, con aproximadamente 2 millones de invocaciones gratuitas mensuales.
- Hosting: 10 GB de almacenamiento y 360 MB/día de transferencia, aproximadamente 10 GB/mes.
- Cloudflare R2: 10 GB de almacenamiento/mes, 1,000,000 operaciones Clase A, 10,000,000 operaciones Clase B y egress gratuito.
- R2 fuera de cuota: `$0.015/GB-mes`, `$4.50/millón` de operaciones Clase A y `$0.36/millón` de operaciones Clase B.

## Límites

- No se marcan Billing, Blaze, budget alerts, R2 ni producción como configurados.
- No se ejecutan comandos `gcloud`, no se crean buckets ni se cambian reglas de storage.
- La galería continúa usando paths estáticos.
- Las cifras son baseline operativo proporcionado por el operador y deben verificarse contra la consola y precios vigentes antes de producción.
