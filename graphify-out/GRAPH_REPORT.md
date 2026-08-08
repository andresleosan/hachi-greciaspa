# Graph Report - .  (2026-08-03)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 262 nodes · 352 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fb6febf5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Reservar.tsx
- devDependencies
- package.json
- LandingNueva.tsx
- bash
- Footer.tsx
- compilerOptions
- Servicios.tsx
- App.tsx
- e2e-reserva.mjs
- dependencies
- cronos
- seed-services.mjs
- set-admin.js
- run-rules-tests.mjs
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `bash` - 12 edges
3. `Footer()` - 11 edges
4. `Header()` - 11 edges
5. `firebaseDb` - 9 edges
6. `scripts` - 8 edges
7. `useAuth()` - 8 edges
8. `cronos` - 5 edges
9. `main()` - 5 edges
10. `tools` - 4 edges

## Surprising Connections (you probably didn't know these)
- `DashboardPage()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/DashboardPage.tsx → src/hooks/useAuth.tsx
- `Reservar()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/Reservar.tsx → src/hooks/useAuth.tsx
- `ProtectedRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ProtectedRoute.tsx → src/hooks/useAuth.tsx
- `useAuth()` --calls--> `getUserProfile()`  [EXTRACTED]
  src/hooks/useAuth.tsx → src/services/auth.ts

## Import Cycles
- None detected.

## Communities (20 total, 3 thin omitted)

### Community 0 - "Reservar.tsx"
Cohesion: 0.11
Nodes (24): AdminPrices(), Props, ProtectedRoute(), useAuth(), DashboardPage(), Metrics, Reservar(), Servicio (+16 more)

### Community 1 - "devDependencies"
Cohesion: 0.08
Nodes (25): autoprefixer, firebase-admin, @firebase/rules-unit-testing, firebase-tools, devDependencies, autoprefixer, firebase-admin, @firebase/rules-unit-testing (+17 more)

### Community 2 - "package.json"
Cohesion: 0.08
Nodes (24): author, bugs, url, description, directories, doc, homepage, keywords (+16 more)

### Community 3 - "LandingNueva.tsx"
Cohesion: 0.08
Nodes (7): EXTRAS_LIST, FAQS, PRICING_SPA, SCHEDULE, Service, SERVICES, TEAM

### Community 4 - "bash"
Cohesion: 0.09
Nodes (22): cat *credential*, cat *.env*, cat *secret*, env, git push --force*, history, *migrate*, printenv* (+14 more)

### Community 5 - "Footer.tsx"
Cohesion: 0.19
Nodes (6): Footer(), Header(), GALERIA_ITEMS, attempts, canAttempt(), getRemainingMs()

### Community 6 - "compilerOptions"
Cohesion: 0.10
Nodes (20): DOM, ESNext, src, compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations (+12 more)

### Community 7 - "Servicios.tsx"
Cohesion: 0.17
Nodes (11): PricesList(), Props, ServiceCard(), ICON_BY_CATEGORY, IMG_BY_SLUG, PriceItem, Reserva, RESERVA_STATUS_LABELS (+3 more)

### Community 8 - "App.tsx"
Cohesion: 0.14
Nodes (12): App(), Contacto, DashboardPage, Equipo, Galeria, LandingNueva, Login, NotFound (+4 more)

### Community 9 - "e2e-reserva.mjs"
Cohesion: 0.21
Nodes (10): app, auth, Counter, db, [fsHost, fsPort], main(), makeReservaCaller(), ADR-0001 (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.18
Nodes (11): date-fns, firebase, dependencies, date-fns, firebase, react, react-dom, react-router-dom (+3 more)

### Community 11 - "cronos"
Cohesion: 0.22
Nodes (9): agent, cronos, description, mode, model, tools, bash, edit (+1 more)

### Community 12 - "seed-services.mjs"
Cohesion: 0.50
Nodes (4): loadAdmin(), main(), PRECIOS, SERVICIOS

## Knowledge Gaps
- **120 isolated node(s):** `$schema`, `model`, `rm -rf *`, `git push --force*`, `sudo *` (+115 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Footer()` connect `Footer.tsx` to `Reservar.tsx`, `LandingNueva.tsx`, `Servicios.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Header()` connect `Footer.tsx` to `Reservar.tsx`, `LandingNueva.tsx`, `Servicios.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `$schema`, `model`, `rm -rf *` to the rest of the system?**
  _120 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Reservar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1092436974789916 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._