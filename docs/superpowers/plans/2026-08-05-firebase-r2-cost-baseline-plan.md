# Baseline De Cuotas Firebase Y R2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar en la documentación operativa las cuotas de Firebase y el escenario opcional de Cloudflare R2 sin habilitar facturación ni crear recursos cloud.

**Architecture:** El cambio es documental y conserva Firebase Spark como baseline actual. Cloud Functions/Blaze y R2 se describen como dependencias futuras condicionadas a aprobación y verificación externa; la galería continúa usando paths estáticos.

**Tech Stack:** Markdown, Firebase, Cloudflare R2 como opción futura documentada.

## Global Constraints

- No se ejecutan comandos `gcloud`.
- No se habilitan Billing/Blaze, budgets, buckets, lifecycle policies ni producción.
- No se integra R2 ni se cambia la galería.
- Las cifras se documentan como baseline proporcionado por el operador y deben verificarse contra precios/consola vigentes antes de producción.

---

### Task 1: Actualizar el baseline de costos operativo

**Files:**
- Modify: `docs/STACK.md`
- Modify: `docs/RUNBOOK.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-05-firebase-r2-cost-baseline-design.md` y los límites proporcionados por el operador.
- Produces: secciones de cuotas actuales, costos fuera de cuota y escenario futuro R2, sin marcar servicios como configurados.

- [ ] **Step 1: Agregar cuotas Firebase en `docs/STACK.md`**

Añadir una subsección bajo servicios de pago con estos valores:

```markdown
### Cuotas de referencia

Firebase Spark:

| Servicio | Cuota de referencia |
|---|---|
| Auth | 50,000 MAU; ~10,000 verificaciones telefónicas/mes |
| Firestore | 1 GiB; 50,000 lecturas/día; 20,000 escrituras/día; 20,000 borrados/día |
| Realtime Database | 1 GiB; 100 conexiones simultáneas; 10 GB de descarga/mes |
| Hosting | 10 GB de almacenamiento; 360 MB/día de transferencia (~10 GB/mes) |

Cloud Functions requiere Blaze para producción; la cuota gratuita estimada es de ~2 millones de invocaciones/mes y no elimina el requisito de Billing.
```

Mantener el hallazgo `COST-1` como no verificado y aclarar que las cuotas no sustituyen un budget alert ni un límite duro de facturación.

- [ ] **Step 2: Agregar Cloudflare R2 como escenario futuro**

En la misma sección agregar:

```markdown
### Cloudflare R2 — opción futura

R2 no está integrado actualmente; la galería usa paths estáticos. Si se migra a almacenamiento de objetos:

| Concepto | Cuota de referencia |
|---|---:|
| Almacenamiento | 10 GB/mes |
| Operaciones Clase A | 1,000,000/mes |
| Operaciones Clase B | 10,000,000/mes |
| Egress | $0 |

Fuera de cuota: $0.015/GB-mes de storage, $4.50/millón de operaciones Clase A y $0.36/millón de operaciones Clase B. La migración requiere decisión, configuración de credenciales y revisión de costos antes de implementarse.
```

- [ ] **Step 3: Actualizar el runbook sin marcar configuración externa**

Agregar en `docs/RUNBOOK.md` un bloque de referencia que indique:

- Spark cubre Auth, Firestore y Hosting dentro de las cuotas documentadas para el MVP.
- Functions necesita Blaze para desplegarse y sigue pendiente de Billing/budget.
- R2 no existe en la arquitectura actual y no se debe crear el bucket `hachi-greciaspa-backups` ni un bucket de galería sin autorización.
- Antes de producción se deben verificar cuotas y precios vigentes en consola.

- [ ] **Step 4: Revisar consistencia**

Run:

```bash
git diff --check
git grep -n -E "Billing|Blaze|R2|budget|cuotas" -- docs/STACK.md docs/RUNBOOK.md
```

Expected: las referencias distinguen entre baseline documentado, configuración pendiente y servicios no integrados; no aparece una afirmación de que R2 o Billing estén activos.

- [ ] **Step 5: Commit**

```bash
git add docs/STACK.md docs/RUNBOOK.md
git diff --cached --check
git commit -m "docs: record firebase and r2 quotas"
```

---

### Task 2: Verificar y sincronizar documentación

**Files:**
- Modify: `docs/release-preflight.md` (solo si el preflight lo regenera)

**Interfaces:**
- Consumes: documentación actualizada de Task 1.
- Produces: evidencia local y `origin/main` sincronizado.

- [ ] **Step 1: Ejecutar verificaciones no destructivas**

Run: `npm run test:client`

Expected: 70 tests PASS.

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 2: Ejecutar preflight**

Run: `npm run release:preflight`

Expected: `PASS_WITH_WARNINGS`, con Billing, budget, Secret Manager, browser QA, rollback y deploy todavía bloqueados.

- [ ] **Step 3: Push y comprobación final**

```bash
git status --short --branch
git diff --check
git push origin main
git rev-parse HEAD
git ls-remote origin refs/heads/main
```

Expected: working tree limpio y hash local igual al remoto.
