# Release Preflight

Fecha: 2026-08-10T04:08:41.334Z
Commit: 42d2c5152ef1ac78e236c2d8e765081276774424
Resultado local: PASS_WITH_WARNINGS

## Checks locales
| Check | Tipo | Exit code | Resultado |
|---|---|---:|---|
| client tests | required | 0 | PASS |
| full rules/functions tests | required | 0 | PASS |
| client typecheck | required | 0 | PASS |
| client build | required | 0 | PASS |
| functions typecheck | required | 0 | PASS |
| functions build | required | 0 | PASS |
| diff check | required | 0 | PASS |
| client audit | audit | 0 | PASS |
| functions audit | audit | 1 | WARN |

## Gates de produccion
| Gate | Estado | Motivo |
|---|---|---|
| Dominio propio | BLOCKED | Dominio no adquirido ni verificado. |
| Resend y DNS | BLOCKED | Resend y SPF/DKIM/DMARC no configurados. |
| Secret Manager | BLOCKED | RESEND_API_KEY no configurada en Secret Manager. |
| Billing y budget | BLOCKED | La evidencia externa de Billing/Blaze y budget no es evaluada por este comando; revisar la documentación y la autorización operativa. |
| browser QA | BLOCKED | QA de navegador completo pendiente. |
| rollback | BLOCKED | Procedimiento de rollback pendiente de revision operativa. |
| autorizacion | BLOCKED | Autorizacion explicita de produccion pendiente. |
| deploy | BLOCKED | Deploy de produccion no autorizado. |

## Auditoria
### client audit

```text
found 0 vulnerabilities

```

### functions audit

```text
# npm audit report

uuid  <11.1.1
Severity: moderate
uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided - https://github.com/advisories/GHSA-w5hq-g745-h8pq
fix available via `npm audit fix --force`
Will install firebase-admin@10.3.0, which is a breaking change
node_modules/uuid
  gaxios  6.4.0 - 6.7.1
  Depends on vulnerable versions of uuid
  node_modules/gaxios
  teeny-request  3.9.1 - 9.0.0
  Depends on vulnerable versions of uuid
  node_modules/teeny-request
    @google-cloud/storage  2.2.0 - 2.5.0 || >=5.19.0
    Depends on vulnerable versions of retry-request
    Depends on vulnerable versions of teeny-request
    node_modules/@google-cloud/storage
      firebase-admin  7.0.0 - 8.2.0 || >=11.0.0
      Depends on vulnerable versions of @google-cloud/storage
      node_modules/firebase-admin
        firebase-functions  2.2.0 - 2.3.1 || >=5.0.0
        Depends on vulnerable versions of firebase-admin
        node_modules/firebase-functions
    retry-request  7.0.0 - 7.0.2
    Depends on vulnerable versions of teeny-request
    node_modules/retry-request

7 moderate severity vulnerabilities

To address issues that do not require attention, run:
  npm audit fix

To address all issues (including breaking changes), run:
  npm audit fix --force

```

## Restricciones
La evidencia externa no es evaluada por este comando. No se ejecutaron acciones externas durante este preflight, no se configuro Resend, no se leyeron secretos y no se ejecuto deploy. Este resultado local no es autorizacion de produccion; no production deployment was performed.
