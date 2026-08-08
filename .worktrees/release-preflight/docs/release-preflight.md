# Release Preflight
Fecha: 2026-08-05T06:08:15.916Z
Commit: 1371c7c3f14616320eabe2976741a383258d03ef
Resultado local: PASS_WITH_WARNINGS

## Checks locales
| Check | Tipo | Exit code | Resultado |
| --- | --- | ---: | --- |
| client tests | requerido | 0 | PASS |
| full rules/functions tests | requerido | 0 | PASS |
| client typecheck | requerido | 0 | PASS |
| client build | requerido | 0 | PASS |
| functions typecheck | requerido | 0 | PASS |
| functions build | requerido | 0 | PASS |
| diff check | requerido | 0 | PASS |
| client audit | auditoría | 1 | WARN |
| functions audit | auditoría | 0 | PASS |

## Gates de producción
| Gate | Estado | Motivo |
| --- | --- | --- |
| Dominio | BLOCKED | Dominio no adquirido. |
| Resend/DNS | BLOCKED | Resend/DNS no configurado. |
| Secret Manager | BLOCKED | RESEND_API_KEY/Secret Manager no configurado. |
| Billing/Blaze y budget | BLOCKED | Billing/Blaze y budget no configurados. |
| QA de navegador | BLOCKED | QA de navegador incompleto. |
| Rollback | BLOCKED | Autorización de rollback pendiente. |
| Despliegue de producción | BLOCKED | Despliegue de producción no autorizado. |

## Auditoría
### client audit: WARN (exit code 1)
stdout:
# npm audit report

react-router  7.12.0 - 8.2.0
Severity: high
React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response - https://github.com/advisories/GHSA-qwww-vcr4-c8h2
fix available via `npm audit fix --force`
Will install react-router-dom@7.11.0, which is a breaking change
node_modules/react-router
  react-router-dom  >=7.12.0-pre.0
  Depends on vulnerable versions of react-router
  node_modules/react-router-dom

2 high severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

stderr:
(sin salida)
### functions audit: PASS (exit code 0)
stdout:
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

stderr:
(sin salida)

## Restricciones
No se activó Billing/Blaze, no se configuró Resend, no se leyeron secretos y no se ejecutó deploy (no production actions).
