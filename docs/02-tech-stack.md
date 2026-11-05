# 02 — Tech Stack (Final)

Status: **FINAL — decisions confirmed 2026-11-02.**
Versions are targets; pin exact versions at scaffold time (`npm view <pkg> version`) rather than trusting this document.

## 1. Confirmed decisions

| # | Decision | Choice | Replaces |
|---|---|---|---|
| D1 | Database | **MongoDB** (run as a **replica set**, even single-node, so multi-document transactions work) | SQL Server |
| D2 | Data access | **Mongoose** via `@nestjs/mongoose` | EF Core |
| D3 | Frontend | **Next.js (React, App Router)** | Angular 18 |
| D4 | File storage | **Local disk** behind a `StorageService` interface | `VARBINARY(MAX)` columns |
| D5 | Development / test database | **Switchable by a setting (`DB_MODE` = `mock` or `real`)**: `mock` = in-process `mongodb-memory-server` replica set started by the API itself (no MongoDB installation), `real` = the MongoDB at `MONGODB_URI`. See §3.4. | local MongoDB install / Docker |

Consequences worth knowing up front (details in §6 and doc 03):
- Invoice creation touches several documents (invoice, stock balances, stock ledger, sequence) → needs **transactions → a replica set is mandatory**. MongoDB is not installed on the dev machine (D5), so development and tests use `mongodb-memory-server`, which downloads a real `mongod` binary into a cache folder on first run (internet needed once) and runs it as a single-node replica set. Production still needs a real MongoDB replica set.
- The old UI cannot be reused; the whole UI is rebuilt in Next.js (new project `web/`). Layout, screens and behaviour are taken from the old Angular app as reference.
- Local disk ties the API to one server (or one shared volume). The `StorageService` interface keeps S3/MinIO a drop-in later.

## 2. Guiding principles

1. **One language end-to-end** (TypeScript) in `api/` and `web/`.
2. **Business rules live in application code**, not in the database (the old triggers/procs are gone).
3. **Everything that must be atomic is one transaction.**
4. **Boring, well-supported choices**; no infrastructure the app doesn't need yet.
5. **Contract first**: the API publishes OpenAPI; the web client's types are generated from it so DTO drift is impossible.

## 3. Target stack

### 3.1 Backend — `api/`
| Concern | Choice | Notes |
|---|---|---|
| Runtime | **Node.js 24 LTS** | Pin in `.nvmrc` / `engines`. |
| Framework | **NestJS 12** (Express adapter; ESM packages, hence the Jest flag below) | Doc originally said 11; 12 was current at scaffold time. |
| Language | **TypeScript 5.x**, `strict: true` | TS 7 was rejected: ts-jest and typescript-eslint do not support it yet. |
| Package manager | **pnpm** (workspace root covers `api/` and `web/`) | |
| Database | **MongoDB 8** (replica set `rs0`) | Atlas or self-hosted; Docker for dev. |
| ODM | **Mongoose 9** + `@nestjs/mongoose` | Schemas = source of truth; DB-level `$jsonSchema` validators optional. |
| Migrations | **migrate-mongo** (versioned scripts: indexes, seed, data fixes) | Mongoose `autoIndex` **off** in production; indexes are created by migrations. |
| Validation | **class-validator + class-transformer** via global `ValidationPipe` (whitelist, forbidNonWhitelisted) | |
| Config | `@nestjs/config` + schema validation (Joi/Zod) | Fail fast on missing env. No secrets in repo. |
| Auth | `@nestjs/jwt` + `passport-jwt`; **argon2id** | 15-min access token + rotating refresh token (HttpOnly, `Secure`, `SameSite`) stored hashed; legacy SHA-512 verified once then re-hashed. |
| Authorization | Guards + `@Roles()` (RBAC) | `SUPER_ADMIN`, `ADMIN` — actually enforced. |
| Uploads | `multer` + `file-type` magic-byte check + size limit; `sharp` to normalise/thumbnail | Replaces `System.Drawing`. |
| File storage | `StorageService` interface → **LocalDiskStorage** | Root directory from env, **outside** the repo and outside any web-served folder; files served only through an authenticated API endpoint. Files named by content hash. |
| API docs | `@nestjs/swagger` (OpenAPI) | |
| Logging | **nestjs-pino** (JSON to stdout) | The `Logs` DB table is dropped. |
| Hardening | `@nestjs/throttler`, `helmet`, strict CORS from env | |
| Money maths | **decimal.js**; amounts stored as **integer paise** | Never JS floating point on currency. |
| Caching / queues | None initially | LiteDB queue and in-memory customer cache are dropped. |
| Testing | **Jest**, **Supertest**, **mongodb-memory-server (replica-set mode)** or Testcontainers | Tax calculator and stock logic get exhaustive unit tests. |
| Quality | ESLint, Prettier, Husky + lint-staged, Conventional Commits | |

### 3.2 Frontend — `web/`
| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js (App Router)**, React, TypeScript `strict` | Latest stable at scaffold time. |
| Rendering | Mostly client-rendered screens talking to the Nest API; server components for static shells/layouts | The API stays a separate NestJS service (no business logic in Next route handlers). |
| Styling | **Tailwind CSS** + **shadcn/ui** (Base UI primitives — current shadcn default) + `lucide-react` icons | Keeps the old Tailwind look; replaces Angular Material. |
| Forms / validation | **React Hook Form + Zod** | |
| Server state | **TanStack Query** | Caching, retries, pagination. |
| API client | `openapi-typescript` + `openapi-fetch`, generated from the Nest OpenAPI document | |
| Auth in UI | Access token kept in memory; refresh via HttpOnly cookie; Next **middleware/proxy** redirects unauthenticated users; `fetch` wrapper retries once after 401 via refresh | |
| Same-origin API | Next `rewrites`: `/api/*` → Nest API | Avoids cross-site cookie / CORS problems in dev and prod. |
| Toasts | `sonner` (same family as the old `ngx-sonner`) | |
| Tables | TanStack Table (via shadcn data-table) | Replaces the old `custom-table` component. |
| Testing | **Vitest + React Testing Library**, **Playwright** for end-to-end | |
| Quality | ESLint (next config), Prettier | |

### 3.3 Data & infra
| Concern | Choice |
|---|---|
| Local dev DB (D5) | Controlled by `DB_MODE` (§3.4); no separate DB process to start. `mock` data persists in `api/.data/mongo` (git-ignored); `pnpm --filter api db:reset` wipes it. |
| Alternatives if the binary download is blocked | MongoDB Atlas free (M0) cluster — cloud replica set, no install; or Docker later |
| Backups | `mongodump` (or Atlas snapshots) **plus** a copy of the upload directory — they must be backed up together |
| CI | GitHub Actions: lint → unit → e2e (replica-set Mongo service) → build images |
| Deploy | Docker image per app (`api`, `web`) with the upload directory on a mounted volume; reverse proxy (Nginx/Caddy) terminating TLS |
| Secrets | Env vars / secret manager; **rotate every credential found in the old repo** (doc 01, S1) |

### 3.4 Database mode setting (mock ⇄ real)

One setting decides which database the API uses. Nothing else in the code knows or cares.

| Env var | Values / default | Meaning |
|---|---|---|
| `DB_MODE` | `mock` or `real` — default `mock` when `NODE_ENV` is not `production` | `mock`: the API starts an in-process single-node MongoDB replica set (`mongodb-memory-server`) and connects to it. `real`: the API connects to `MONGODB_URI`; the mock library is never loaded. |
| `MONGODB_URI` | required when `DB_MODE=real` | Real server / Atlas connection string (replica set). Ignored in mock mode. |
| `MOCK_DB_PATH` | default `.data/mongo`; empty = pure in-memory | Where mock data persists between restarts. |
| `MOCK_DB_PORT` | default `27018` | Fixed port used when `MOCK_DB_PATH` is set: persisted data remembers the replica-set member address, so the port must not change between starts. |
| `MOCK_DB_VERSION` | e.g. `8.0.x` | mongod binary version for the mock; keep equal to production. The first mock run downloads the binary (about 780 MB for 8.2.6) to `~/.cache/mongodb-binaries`. |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | defaults 19456 / 2 / 1 | argon2id cost (OWASP minimum profile). Raising them later is safe: hashes made with older settings are upgraded at the next login. |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_FULL_NAME` | default `admin` / empty / `Administrator` | First admin, created only when no user exists. With an empty password a random one is printed once. |
| `LOGIN_IP_LIMIT` / `LOGIN_IP_WINDOW_SECONDS` | defaults 20 / 60 | Login requests allowed per client IP per window (any outcome counts). |
| `LOGIN_FAIL_LIMIT` / `LOGIN_FAIL_WINDOW_SECONDS` | defaults 5 / 900 | Login attempts allowed per username+IP per window; a successful login clears them. |
| `UPLOAD_DIR` / `MAX_UPLOAD_MB` | defaults `.data/uploads` / 5 | Folder for uploaded files (customer logos), outside any public folder and never served statically; back it up together with the database. Largest accepted upload in MB; bigger gives 413. |
| `TRUST_PROXY` | default `false` | Express "trust proxy" (`true`, a hop count such as `1`, or a subnet such as `loopback`). Set it behind a reverse proxy so limits apply to the real client address; leave `false` otherwise, or clients can forge `X-Forwarded-For`. |

Behaviour
- **Switching** = change `DB_MODE` (and set `MONGODB_URI`) in `api/.env` and restart. Turn the mock off → the real database is used. Mock data stays in its folder and is **not** copied to the real database.
- **Single seam:** `DatabaseModule` uses `MongooseModule.forRootAsync`; the factory returns the mock URI or `MONGODB_URI`. The mock library is a **devDependency**, loaded with a dynamic `import()` only in mock mode, so production images do not contain it.
- **Safety:** with `NODE_ENV=production` and `DB_MODE=mock` the app **refuses to start**. In `real` mode a missing/invalid `MONGODB_URI` fails fast with a clear message.
- **Visibility:** mock mode prints a startup warning ("MOCK DATABASE — data is not production data"); `GET /health` returns `{ db: { mode, connected, transactions } }`; the web app may show a "Mock DB" badge when `mode = mock` (added in a later epic).
- **Both modes run the same startup checks:** replica-set/transaction support is verified.
- **Migrations and seed:** in `mock` mode migrate-mongo migrations (indexes, seed admin, constants) run **automatically at startup**, because the mock starts empty. In `real` mode they never run automatically; run `pnpm --filter api db:migrate` deliberately (same scripts, same code path).
- **Tests** always force the mock (fresh, throw-away) regardless of `.env`.

## 4. Repo layout (`Krg-NestJS/`)

```
Krg-NestJS/
├─ docs/
├─ api/                         # NestJS
│  ├─ src/
│  │  ├─ main.ts, app.module.ts
│  │  ├─ common/                # filters, interceptors (audit), guards, decorators, pipes
│  │  ├─ config/
│  │  ├─ database/              # Mongoose connection, transaction helper
│  │  ├─ storage/               # StorageService + LocalDiskStorage
│  │  └─ modules/
│  │     ├─ auth/  users/  customers/  products/  stock/
│  │     ├─ invoices/  tax/  dashboard/  activity/  audit/
│  ├─ migrations/               # migrate-mongo scripts (indexes, seed)
│  ├─ test/
│  └─ package.json
├─ web/                         # Next.js
│  ├─ src/
│  │  ├─ app/                   # App Router: (public)/login, (app)/dashboard, ...
│  │  ├─ components/            # layout/, ui/ (shadcn), shared/
│  │  ├─ lib/                   # api client, auth, utils
│  │  └─ config/
│  ├─ public/
│  └─ package.json
├─ docker-compose.yml           # optional: real MongoDB replica set for prod-like runs
├─ pnpm-workspace.yaml
└─ package.json
```
Each API module = `controller` (HTTP only) → `service` (rules, transactions) → Mongoose models. Pure logic (GST) is a dependency-free class.

## 5. Old → new mapping

| Old (.NET / Angular / SQL Server) | New |
|---|---|
| `Controllers/*` | `api/src/modules/<name>/<name>.controller.ts` |
| `DBLayer/Service/*` | `api/src/modules/<name>/<name>.service.ts` |
| `ViewModels/*` + Mapperly | DTO classes + small mapper functions |
| EF Core models + 7 views | Mongoose schemas; no pass-through views |
| `SecurityAndExceptionMiddleware` | global `ExceptionFilter` + auth guard (no per-request token churn) |
| `UserClaimsService` | `@CurrentUser()` param decorator |
| Serilog | nestjs-pino |
| `UtilityLayer` (hash, image mime, diff finder) | `common/` utils (argon2, file-type, audit diff) |
| `AuthPathUtility` / `AnonymousPaths` | `@Public()` decorator |
| LiteDB queue + MemoryCache | dropped |
| `DBScripts` | `api/migrations` |
| Triggers / procs / functions | Services inside transactions (doc 03 §5) |
| Angular modules (Auth, Customer, Product, Invoice, Dashboard) | Next.js route groups + feature folders |
| Angular Material, ngx-sonner, custom-table, popup, spinner | shadcn/ui, sonner, TanStack Table, shadcn Dialog, loading component |
| Angular interceptors (auth, http-error) | `fetch` wrapper in `web/src/lib/api` |
| Angular `AuthGuard` | Next middleware/proxy + client auth provider |

## 6. API contract policy

- Base path `/api/v1/...`, REST verbs (`GET /customers`, `POST /customers`, `PATCH /customers/:id`, `DELETE /customers/:id` = soft delete).
- Response envelope `{ code, message, data }` kept from the old API; errors `{ code, message, errors }`.
- List endpoints take `page`, `pageSize`, `search`, `sort` from day one.
- A compat table (old action → new route) lives in the migration notes for reference; the UI is new, so no endpoint-by-endpoint switch is needed.

## 7. Non-goals (first migration)

Multi-tenancy, payments/receivables, e-invoicing (IRN/QR), microservices, GraphQL, CQRS/event sourcing, server-side rendering of data screens, S3/CDN.

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Transactions need a replica set** — a plain standalone `mongod` rejects them | Single-node replica set via `mongodb-memory-server` in dev, tests and CI; real replica set in prod; app refuses to start if the topology doesn't support transactions. |
| **Dev DB differs from prod** (in-process mongod, no auth, one node) | Same mongod version pinned; indexes created only by migrate-mongo scripts that also run in dev; a prod-like smoke run against a real replica set (Atlas or Docker) before release. |
| **Weaker integrity than SQL** (no foreign keys, no CHECK) | Reference checks in services inside transactions; Mongoose validators + optional `$jsonSchema`; unique and partial indexes; integration tests on invariants (stock never negative, invoice totals = sum of lines). |
| **Money in JavaScript** | Integer paise + decimal.js; no floats; golden-file tests. |
| **Local-disk files** (single server, backup coupling, no CDN) | `StorageService` interface; back up DB and upload dir together; move to S3-compatible later without touching callers. |
| **Two Node apps** (Nest + Next) | pnpm workspace, shared scripts, OpenAPI-generated client, same-origin rewrite. |
| **Data migration SQL Server → MongoDB** | ETL script with count/sum reconciliation; dry-run on the `.bak` restore; keep `legacyId`. |
| **Tax regressions** | Recompute every historical invoice with the new calculator and diff against stored totals. |
| **UI is a rewrite** | Old Angular screens as visual reference; E01 builds shells first, each epic then rebuilds one module. |
| **Scope creep** | §7 non-goals. |
