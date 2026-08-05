# Release Preflight

Fecha: 2026-08-05T20:29:28.859Z
Commit: d31b4fdb64cb91d78408426494c1b1252d51348f
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
| client audit | audit | 1 | WARN |
| functions audit | audit | 0 | PASS |

## Gates de produccion
| Gate | Estado | Motivo |
|---|---|---|
| Dominio propio | BLOCKED | Dominio no adquirido ni verificado. |
| Resend y DNS | BLOCKED | Resend y SPF/DKIM/DMARC no configurados. |
| Secret Manager | BLOCKED | RESEND_API_KEY no configurada en Secret Manager. |
| Billing y budget | BLOCKED | Billing/Blaze y budget de $10/mes no verificados. |
| browser QA | BLOCKED | QA de navegador completo pendiente. |
| rollback | BLOCKED | Procedimiento de rollback pendiente de revision operativa. |
| autorizacion | BLOCKED | Autorizacion explicita de produccion pendiente. |
| deploy | BLOCKED | Deploy de produccion no autorizado. |

## Auditoria
### client audit

```text
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
No se activo Billing/Blaze, no se configuro Resend, no se leyeron secretos y no se ejecuto deploy. Este resultado local no es autorizacion de produccion; no production deployment was performed.
