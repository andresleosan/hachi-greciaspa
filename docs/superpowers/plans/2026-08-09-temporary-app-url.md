# Temporary App URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar los enlaces de dashboard de los emails transaccionales a la URL temporal de Vercel mediante una configuración server-side reemplazable.

**Architecture:** Un helper en `functions/src/templates/appUrl.ts` resolverá `PUBLIC_APP_URL`, eliminará barras finales y usará `https://hachi-greciaspa.vercel.app` como fallback. Los templates de confirmación y recordatorio consumirán el helper compartido y escaparán la URL antes de insertarla en HTML.

**Tech Stack:** TypeScript 6, Firebase Functions v2, Vitest 4, templates HTML server-side.

## Global Constraints

- La URL de Vercel es solo el destino temporal de navegación.
- `vercel.app` no se tratará como dominio propio para SPF, DKIM, DMARC o Resend.
- `PUBLIC_APP_URL` es configuración no secreta; no mezclarla con `RESEND_API_KEY`.
- El fallback debe ser `https://hachi-greciaspa.vercel.app` cuando `PUBLIC_APP_URL` esté ausente o vacía.
- No comprar dominio, configurar Secret Manager, llamar a Resend ni desplegar.
- No cambiar la lógica de envío, reintentos, idempotencia ni el remitente.
- Los tests deben cubrir variable configurada, variable ausente, barra final y escape HTML.

---

### Task 1: Resolver La URL Pública De La Aplicación

**Files:**
- Create: `functions/src/templates/appUrl.ts`
- Create: `functions/src/templates/appUrl.test.ts`

**Interfaces:**
- Consumes: `process.env.PUBLIC_APP_URL` como configuración opcional.
- Produces: `getAppBaseUrl(): string` y `getDashboardUrl(): string` para los templates.

- [ ] **Step 1: Escribir los tests que deben fallar**

En `functions/src/templates/appUrl.test.ts`, cubrir exactamente estos comportamientos:

```ts
import { afterEach, describe, expect, it } from 'vitest'

import { getAppBaseUrl, getDashboardUrl } from './appUrl.js'

const originalValue = process.env.PUBLIC_APP_URL

afterEach(() => {
  if (originalValue === undefined) delete process.env.PUBLIC_APP_URL
  else process.env.PUBLIC_APP_URL = originalValue
})

describe('application URL', () => {
  it('uses the temporary Vercel URL when configuration is absent', () => {
    delete process.env.PUBLIC_APP_URL

    expect(getAppBaseUrl()).toBe('https://hachi-greciaspa.vercel.app')
    expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard')
  })

  it('uses configured URL and removes trailing slashes', () => {
    process.env.PUBLIC_APP_URL = 'https://spa.example///'

    expect(getAppBaseUrl()).toBe('https://spa.example')
    expect(getDashboardUrl()).toBe('https://spa.example/dashboard')
  })

  it('uses the fallback when configuration is only whitespace', () => {
    process.env.PUBLIC_APP_URL = '   '

    expect(getDashboardUrl()).toBe('https://hachi-greciaspa.vercel.app/dashboard')
  })
})
```

- [ ] **Step 2: Ejecutar el test y confirmar el fallo correcto**

Run: `npm --prefix functions exec vitest run src/templates/appUrl.test.ts`

Expected: FAIL porque `functions/src/templates/appUrl.ts` todavía no existe.

- [ ] **Step 3: Implementar el helper mínimo**

Crear `functions/src/templates/appUrl.ts` con esta interfaz y comportamiento:

```ts
const DEFAULT_APP_BASE_URL = 'https://hachi-greciaspa.vercel.app'

export function getAppBaseUrl(): string {
  const configured = process.env.PUBLIC_APP_URL?.trim()
  return (configured || DEFAULT_APP_BASE_URL).replace(/\/+$/, '')
}

export function getDashboardUrl(): string {
  return `${getAppBaseUrl()}/dashboard`
}
```

- [ ] **Step 4: Ejecutar los tests del helper**

Run: `npm --prefix functions exec vitest run src/templates/appUrl.test.ts`

Expected: 3 tests PASS.

- [ ] **Step 5: Commit del helper**

```powershell
git add functions/src/templates/appUrl.ts functions/src/templates/appUrl.test.ts
git commit -m "feat: centralize temporary app url"
```

---

### Task 2: Usar La URL En Los Emails

**Files:**
- Modify: `functions/src/templates/reminder.ts`
- Modify: `functions/src/templates/confirmation.ts`
- Modify: `functions/src/templates/html.ts`
- Modify: `functions/src/email/resend.test.ts`
- Modify: `functions/lib/templates/html.js` (artefacto compilado versionado)
- Modify: `functions/lib/templates/appUrl.js` (artefacto compilado versionado)
- Modify: `functions/lib/templates/appUrl.test.js` (artefacto compilado versionado)
- Modify: `functions/lib/templates/reminder.js` (artefacto compilado versionado)
- Modify: `functions/lib/templates/confirmation.js` (artefacto compilado versionado)
- Modify: `functions/lib/email/resend.test.js` (artefacto compilado versionado)

**Interfaces:**
- Consumes: `getDashboardUrl()` de `functions/src/templates/appUrl.ts`.
- Produces: ambos templates con enlace `/dashboard` basado en la URL configurada o fallback temporal.

- [ ] **Step 1: Actualizar primero las expectativas de templates**

En `functions/src/email/resend.test.ts`, reemplazar las expectativas de
`https://hachi-greciaspa.web.app/dashboard` por
`https://hachi-greciaspa.vercel.app/dashboard` y agregar un caso que configure
`PUBLIC_APP_URL = 'https://spa.example/'`, renderice ambos templates y verifique
`https://spa.example/dashboard`.

- [ ] **Step 2: Ejecutar el test para confirmar el fallo esperado**

Run: `npm --prefix functions exec vitest run src/email/resend.test.ts`

Expected: FAIL en las expectativas de URL porque los templates aún usan `web.app`.

- [ ] **Step 3: Cambiar ambos templates al helper**

En cada template:

```ts
import { getDashboardUrl } from './appUrl.js'
```

Construir el HTML dentro de `renderReminderHtml`/`renderConfirmationHtml` o usar
un placeholder de dashboard, insertando `escapeHtml(getDashboardUrl())` en el
atributo `href`. Mantener sin cambios el texto, la sanitización de los datos y
el resto del contrato del email.

- [ ] **Step 4: Ejecutar las pruebas de email**

Run: `npm --prefix functions exec vitest run src/email/resend.test.ts`

Expected: todos los tests del archivo PASS, incluyendo escape HTML y URL configurada.

- [ ] **Step 5: Ejecutar typecheck y build de Functions**

Run:

```powershell
npm --prefix functions run typecheck
npm --prefix functions run build
```

Expected: ambos comandos exit `0`.

- [ ] **Step 6: Commit de templates y tests**

```powershell
git add functions/src/templates/html.ts functions/src/templates/reminder.ts functions/src/templates/confirmation.ts functions/src/email/resend.test.ts functions/lib/templates/html.js functions/lib/templates/appUrl.js functions/lib/templates/appUrl.test.js functions/lib/templates/reminder.js functions/lib/templates/confirmation.js functions/lib/email/resend.test.js
git commit -m "feat: point transactional emails to app url"
```

---

### Task 3: Documentar La Configuración Temporal

**Files:**
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`
- Modify: `docs/release-preflight.md` (evidencia generada versionada)

**Interfaces:**
- Consumes: el helper y fallback implementados en Tasks 1 y 2.
- Produces: documentación que distingue URL temporal, dominio remitente y gates externos.

- [ ] **Step 1: Documentar `PUBLIC_APP_URL` sin secreto**

Agregar en la sección de integración de email de `docs/STACK.md` que los enlaces
usan `PUBLIC_APP_URL` como configuración no secreta, con fallback a
`https://hachi-greciaspa.vercel.app`, y que la URL no demuestra ni reemplaza la
verificación de dominio de Resend.

- [ ] **Step 2: Documentar el cambio temporal en el runbook**

Agregar en `docs/RUNBOOK.md` que el dashboard enlazado por los emails apunta
temporalmente a Vercel; cuando exista un dominio propio, se debe cambiar
`PUBLIC_APP_URL` y repetir pruebas antes de producción. No agregar valores de
Secret Manager.

- [ ] **Step 3: Validar documentación y regresión completa**

Run:

```powershell
git diff --check
npm --prefix functions test
npm run release:preflight
```

Expected: diff check exit `0`, suite Functions verde y preflight `PASS_WITH_WARNINGS`; no se ejecuta deploy ni acciones externas.

- [ ] **Step 4: Revisión final de alcance**

Confirmar con `git status --short --branch` que solo cambiaron los templates,
tests, helper, los artefactos compilados versionados bajo `functions/lib`,
los tres documentos planificados (incluido `docs/release-preflight.md`);
mantener sin stagear
`graphify-out/cache/last_query_stamp`.

- [ ] **Step 5: Commit de documentación y evidencia generada**

```powershell
git add docs/STACK.md docs/RUNBOOK.md docs/release-preflight.md
git commit -m "docs: record temporary app url"
```
