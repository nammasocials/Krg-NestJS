# 05 — User Stories

Only stories of the epic in progress are detailed. See [04-epics.md](04-epics.md) for epic ACs and [06-tasks.md](06-tasks.md) for full task specs.

Status legend: ⬜ To Do · 🟦 In Progress · ✅ Done

---

# Epic E01 — Layout

## US01 — Login layout

**Status:** ✅ Done (T001 ✅ · T002 ✅ · T003 ✅)
**Story:** As a visitor, I want a clean, branded sign-in screen that works on phone and desktop, so I know where and how to enter my credentials.

**Covered epic ACs**
- E01-AC1 — Web app builds and serves; Tailwind + shadcn/ui configured with design tokens
- E01-AC2 — `/login` public layout (centered card, logo, app name, no navigation)
- E01-AC3 — Login form UI with validation, show/hide password, loading state (no API call)
- E01-AC6 — Usable from 360 px to 1920 px, no horizontal scroll

**Story done when:** `/login` renders correctly on mobile and desktop widths, validation messages appear as specified, and the app builds without errors.

**Tasks**

| Task | Definition |
|---|---|
| T001 | Scaffold the Next.js web project in `Krg-NestJS/web` with Tailwind, shadcn/ui, environment files, and global design tokens (colors, fonts, spacing). |
| T002 | Create the routing skeleton (App Router route groups) and a reusable public layout (`(public)/layout.tsx`) that centers its content on a branded gradient background; `/` redirects to `/login`. |
| T003 | Build the login form UI inside the public layout: username, password with show/hide toggle, validation messages, submit button with disabled/loading state. No API call. |

---

## US02 — Layout after login (header, menu, footer)

**Status:** ✅ Done (T004 ✅ · T005 ✅ · T006 ✅)
**Story:** As a signed-in user, I want a consistent frame around every page — a header with my name and logout, a menu to move between modules, and a footer — so I can navigate the same way everywhere.

**Covered epic ACs**
- E01-AC4 — One shell (header, menu, content area, footer) for all authenticated routes
- E01-AC5 — Config-driven menu, active-route highlight, hamburger below 768 px
- E01-AC6 — Usable from 360 px to 1920 px, no horizontal scroll
- E01-AC7 — Header with logo/app name and user area with logout control (behaviour arrives in E02)

**Story done when:** after navigating to `/dashboard` (route guard arrives in E02), the page shows header, menu, content outlet and footer; menu items switch placeholder pages, highlight correctly, and collapse on a narrow window.

**Tasks**

| Task | Definition |
|---|---|
| T004 | Create the authenticated layout (`(app)/layout.tsx`: header slot, page content, footer slot) and the authenticated route tree with placeholder pages for Dashboard, Invoices, Products, Customers, Reports. |
| T005 | Build the navigation menu from one config list (`nav.config.ts`): desktop tab bar with active highlight, mobile hamburger panel that closes on selection. |
| T006 | Build the header (logo, app name, user name/role area, logout button – no-op until E02) and the footer (app name, year, version). |

---

## US03 — Shared UI feedback and error pages

**Status:** ✅ Done (T018 ✅ · T019 ✅ · T020 ✅ · T021 ✅) — planned 2026-11-04
**Story:** As a user, I want clear loading, success/error and confirmation feedback and a friendly "page not found" page, so I am never left guessing what the app is doing.

**Covered epic ACs**
- E01-AC8 — Unknown URLs show a not-found page
- E01-AC9 — Loading spinner, toast notifications and confirm popup are available as shared components


**Story done when:** an unknown URL shows the not-found page; a spinner, a toast and a confirm popup can each be triggered from any page and behave well with mouse, keyboard and screen readers.

**Tasks**

| Task | Definition |
|---|---|
| T018 ✅ | Not-found page, error page and root error page (friendly wording, no technical details). |
| T019 ✅ | Shared `Spinner`/`PageSpinner`, used by the session check, buttons and `(app)/loading.tsx`. |
| T020 ✅ | Toast notifications (`useToast`: success, error, info) on `@base-ui/react`, accessible, auto-dismiss, max 3. |
| T021 ✅ | Confirm popup (`useConfirm`, promise-based, destructive variant) on `@base-ui/react` AlertDialog. |
---

# Epic E02 — Login and Authentication

*Planned. Implementation starts after the plan is approved; decisions to confirm are listed in [04-epics.md](04-epics.md#decisions-proposed-for-e02-confirm-or-change).*

## US04 — API foundation and database switch

**Status:** ✅ Done (T007 ✅ · T008 ✅)
**Story:** As a developer, I want a running NestJS API that connects to a mock or real MongoDB with one setting, plus a health endpoint and API docs, so later features have a base and I need no MongoDB installation.

**Covered epic ACs**
- E02-AC1 — API runs with config validation, Mongoose on a replica set, Swagger, health; `DB_MODE` switches mock/real

**Story done when:** `pnpm --filter api dev` starts on port 5000 in mock mode, `/api/v1/health` reports `db.mode=mock, connected, transactions=true`, Swagger opens, and setting `DB_MODE=real` with a bad URI fails with a clear message.

**Tasks**

| Task | Definition |
|---|---|
| T007 ✅ | Scaffold the NestJS project in `Krg-NestJS/api` with strict TypeScript, validated config (`@nestjs/config` + schema), global validation pipe, `/api/v1` prefix, response envelope, error filter, pino logging, helmet. |
| T008 ✅ | Add `DatabaseModule` (mock via `mongodb-memory-server` replica set, or real via `MONGODB_URI`), transaction-support check, `/health`, Swagger at `/api/docs`, and migration runner wiring. |

---

## US05 — Users, tokens and password security

**Status:** ✅ Done (T009 ✅ · T010 ✅)
**Story:** As the business owner, I want accounts and session tokens stored safely, with a first admin created without any committed secret, so credentials are never exposed.

**Covered epic ACs**
- E02-AC2 — `users` / `refreshTokens` collections, indexes, migration, seed admin
- E02-AC4 — argon2id passwords; legacy SHA-512 accepted once then re-hashed

**Story done when:** after startup in mock mode, the indexes exist, an admin user exists with an argon2id hash, and unit tests prove hash, verify and legacy-upgrade behaviour.

**Tasks**

| Task | Definition |
|---|---|
| T009 ✅ | Mongoose schemas for `users` and `refreshTokens` and the first migrate-mongo migration that creates their indexes (case-insensitive unique username, unique tokenHash, TTL on expiresAt). |
| T010 ✅ | `PasswordService` (argon2id hash/verify, legacy `sha512$` detection and upgrade signal) and an idempotent admin seed driven by environment variables. |

---

## US06 — Session API

**Status:** ✅ Done (T011 ✅ · T012 ✅ · T013 ✅ · T014 ✅)
**Story:** As a signed-in user, I want login, silent refresh, logout and a session check that are secure and rate-limited, and as the business I want every route protected by role.

**Covered epic ACs**
- E02-AC3 — Login returns access token and sets refresh cookie; generic 401
- E02-AC5 — 15-min access token; refresh rotation; reuse revokes family
- E02-AC6 — Logout revokes and clears cookie; `GET /auth/me`
- E02-AC7 — All routes authenticated except login/refresh/health; `@Roles()`
- E02-AC9 — Login rate limiting

**Story done when:** an automated e2e suite covers login, refresh, reuse detection, logout, me, forbidden role and throttling, and all pass.

**Tasks**

| Task | Definition |
|---|---|
| T011 ✅ | `POST /auth/login`: validate, verify password (upgrade legacy hash), issue access JWT and refresh token cookie, update `lastLoginAt`; generic 401 for every failure. |
| T012 ✅ | `POST /auth/refresh` (rotate, same family) with reuse detection (revoke family) and `POST /auth/logout` (revoke, clear cookie). |
| T013 ✅ | `GET /auth/me`, global JWT guard with `@Public()`, `@Roles()` guard and `@CurrentUser()`. |
| T014 ✅ | Rate-limit login attempts (per IP and per username+IP) with a small in-memory limiter and a generic 429 message with `Retry-After`. |

---

## US07 — Web sign-in integration and route protection

**Status:** ✅ Done (T015 ✅ · T016 ✅ · T017 ✅)
**Story:** As a user, I want the login form to sign me in for real, keep me signed in across refreshes, protect private pages, and let me log out from the header.

**Covered epic ACs**
- E02-AC8 — Login form calls API, shows errors, redirects; unauthenticated redirect; logout works

**Story done when:** in the browser, wrong credentials show an error, correct ones open `/dashboard`, a reload keeps the session, visiting `/dashboard` signed out lands on `/login`, and Logout returns to `/login` and blocks the back button from private pages.

**Tasks**

| Task | Definition |
|---|---|
| T015 ✅ | In-memory access-token API client with 401→refresh→retry, `AuthProvider` (session bootstrap via refresh + `/auth/me`), and the login form wired to `POST /auth/login`. |
| T016 ✅ | Route protection: `proxy.ts` redirect for `(app)` routes, redirect signed-in users from `/` and `/login` to `/dashboard`, client guard in the `(app)` layout. |
| T017 ✅ | Logout action in header and mobile panel, real user name/role replacing the stub, and role-filtered navigation via `roles`. |

---

# Epic E03 — Customers

*Planned 2026-11-05. Decisions to confirm are in [04-epics.md](04-epics.md#decisions-proposed-for-e03-confirm-or-change).*

## US08 — Customer data and rules

**Status:** ✅ Done (T022 ✅ · T023 ✅)
**Story:** As a developer, I get the `customers` collection, GSTIN and state-code helpers, and create/validate rules, so the data is clean from the first record.

**Covered epic ACs**
- E03-AC1 — Collection and indexes by migration
- E03-AC3 — Validation of all fields and GSTIN; derived state code; duplicate GSTIN gives 409

**Tasks**

| Task | Definition |
|---|---|
| T022 ✅ | `customers` Mongoose schema, migration with indexes, GSTIN (pattern, state code, check character) and phone helpers with unit tests. |
| T023 ✅ | `POST /customers` with DTO validation, normalisation, derived `stateCode`, duplicate-GSTIN `409`, e2e tests. |

---

## US09 — Customer list, details, edit and delete API

**Status:** ✅ Done (T024 ✅ · T025 ✅)
**Story:** As a staff member, I can find a customer fast, open it, correct it and remove it, through guarded endpoints.

**Covered epic ACs**
- E03-AC2 — List with search, sort, pagination; get one
- E03-AC4 — Soft delete frees the GSTIN

**Tasks**

| Task | Definition |
|---|---|
| T024 ✅ | `GET /customers` with search, sort, page and page size, total count; deleted customers hidden. |
| T025 ✅ | `GET /customers/:id`, `PATCH /customers/:id` (partial edit, same rules), `DELETE /customers/:id` (soft). |

---

## US10 — Logo files and audit trail

**Status:** ✅ Done (T026 ✅ · T027 ✅)
**Story:** As the business owner, I want logos stored safely on disk and every customer change recorded (who, when, before and after).

**Covered epic ACs**
- E03-AC5 — Logo upload, replace, download through authorised endpoints
- E03-AC6 — Append-only audit log for create/edit/delete

**Tasks**

| Task | Definition |
|---|---|
| T026 ✅ | `auditLogs` collection, reusable `AuditService`, wired into customer create/edit/delete (transaction-safe, secrets never logged). |
| T027 ✅ | `fileAssets` collection, local-disk storage service (content sniffing, 5 MB limit), `PUT/GET/DELETE /customers/:id/logo`. |

---

## US11 — Customer screens

**Status:** ✅ Done (T028 ✅ · T029 ✅ · T030 ✅)
**Story:** As a staff member, I want to do all of this from the Customers page on my desktop or phone.

**Covered epic ACs**
- E03-AC7 — List page
- E03-AC8 — Add/edit form
- E03-AC9 — Details page and delete flow
- E03-AC10 — Tests and end-to-end verification

**Tasks**

| Task | Definition |
|---|---|
| T028 ✅ | Customers API client, list page (table/cards, search with debounce, pagination, states). |
| T029 ✅ | Add/edit form (shared), client rules mirroring the API, field errors from the API, logo picker with preview, toasts. |
| T030 ✅ | Details page with logo, edit link, delete with confirm popup, back to list; end-to-end check. |

---

# Epic E04 — Products and Units

*Planned 2026-11-06. Decisions to confirm are in [04-epics.md](04-epics.md#decisions-proposed-for-e04-confirm-or-change).*

## US12 — Product data and rules

**Status:** ✅ Done (T031 ✅ · T032 ✅)
**Story:** As a developer, I get the `products` collection and the unit and GST rules, so prices and tax data are clean from the first record.

**Covered epic ACs**
- E04-AC1 — Collection and indexes by migration
- E04-AC3 — Validation; duplicate name gives 409; stock cannot be set

**Tasks**

| Task | Definition |
|---|---|
| T031 ✅ | `products` Mongoose schema, migration with indexes, unit list and GST-rate list with unit tests. |
| T032 ✅ | `POST /products` with DTO validation, money and HSN normalisation, duplicate-name `409`, audit row, e2e tests. |

---

## US13 — Product list, details, edit and delete API

**Status:** 🟦 In Progress (T033 ✅ · T034 ⬜)
**Story:** As a staff member, I can find a product, open it, correct it, deactivate it and remove it, through guarded and audited endpoints.

**Covered epic ACs**
- E04-AC2 — List with search, sort, pagination; get one
- E04-AC4 — Soft delete and active/inactive
- E04-AC6 — Audit rows

**Tasks**

| Task | Definition |
|---|---|
| T033 ✅ | `GET /products` with search, sort, page, page size, active filter, total count; deleted products hidden. |
| T034 | `GET /products/:id`, `PATCH /products/:id` (partial edit incl. `isActive`), `DELETE /products/:id` (soft), all audited. |

---

## US14 — Product image

**Status:** ⬜ To Do (T035 ⬜)
**Story:** As a staff member, I can give a product a picture, stored safely on disk like customer logos.

**Covered epic ACs**
- E04-AC5 — Upload, replace, download, remove

**Tasks**

| Task | Definition |
|---|---|
| T035 | `PUT/GET/DELETE /products/:id/image` on the shared file storage (content sniffing, 5 MB limit), audited. |

---

## US15 — Product screens

**Status:** ⬜ To Do (T036 ⬜ · T037 ⬜ · T038 ⬜)
**Story:** As a staff member, I want to do all of this from the Products page on my desktop or phone.

**Covered epic ACs**
- E04-AC7 — List page
- E04-AC8 — Add/edit form
- E04-AC9 — Details page and delete flow
- E04-AC10 — Tests and end-to-end verification

**Tasks**

| Task | Definition |
|---|---|
| T036 | Products API client, list page (table/cards, search, pagination, states, read-only stock). |
| T037 | Add/edit form (shared), rupee input, GST preview, rules mirroring the API, field errors, image picker. |
| T038 | Details page with image, edit, delete with confirm; whole-epic check and end-to-end walk-through. |
