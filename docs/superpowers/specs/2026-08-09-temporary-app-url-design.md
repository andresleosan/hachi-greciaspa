# URL Temporal De Aplicación — Diseño

## Contexto

El sitio temporal está publicado en `https://hachi-greciaspa.vercel.app/`.
Los templates de confirmación y recordatorio todavía enlazan a
`https://hachi-greciaspa.web.app/dashboard`. No existe aún un dominio propio para
verificar como remitente en Resend.

## Objetivo

Usar `https://hachi-greciaspa.vercel.app/dashboard` como destino temporal de los
emails de confirmación y recordatorio, con un único punto de configuración para
reemplazarlo cuando exista el dominio propio.

## Diseño

- Crear un helper server-side para construir la URL del dashboard.
- Leer `PUBLIC_APP_URL` como configuración no secreta de Functions.
- Usar `https://hachi-greciaspa.vercel.app` como fallback explícito mientras no
  exista `PUBLIC_APP_URL`.
- Normalizar una barra final opcional para evitar URLs duplicadas.
- Mantener la URL fuera del frontend y no mezclarla con `RESEND_API_KEY`.
- Sustituir ambos enlaces de template por el helper compartido.

## Límites

- La URL de Vercel es solo el destino temporal de navegación.
- No se tratará `vercel.app` como dominio propio para SPF, DKIM, DMARC o Resend.
- No se comprará dominio, no se configurará Secret Manager y no se desplegará.
- El fallback evita romper los tests y el entorno local si falta la variable.

## Verificación

- Test unitario del helper con variable configurada y sin variable.
- Tests de templates verifican que ambos emails enlazan al dashboard de Vercel
  por defecto y escapan sus datos interpolados.
- Typecheck y build de Functions deben continuar verdes.

## Cambio futuro

Cuando el operador compre y verifique un dominio propio, se configurará
`PUBLIC_APP_URL` con la URL canónica del sitio y se repetirá la matriz de tests.
La configuración del remitente Resend seguirá siendo un gate separado.
