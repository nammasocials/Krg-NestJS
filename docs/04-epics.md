# 04 — Epics

How this backlog works: **step by step**. Only the epic currently being built is detailed down to tasks. Later epics stay as one-line roadmap entries and are detailed when we reach them.

Flow for every item: implement → run → verify → mark **Done**. A task is Done when its ACs are verified; a user story is Done when all its tasks are Done; an epic is Done when all its user stories are Done.

Related: [05-user-stories.md](05-user-stories.md) · [06-tasks.md](06-tasks.md)

Status legend: ⬜ To Do · 🟦 In Progress · ✅ Done

## Code locations (assumption — change if you prefer another layout)

| App | Folder | Stack |
|---|---|---|
| Web UI | `Krg-NestJS/web` | Next.js (App Router) + Tailwind + shadcn/ui (doc 02 §3.2) |
| API | `Krg-NestJS/api` | NestJS + Mongoose + MongoDB replica set (doc 02 §3.1) |

## Roadmap

| Epic | Title | Status | Detail level |
|---|---|---|---|
| E01 | Layout | ✅ | Done: US01–US03, T001–T006, T018–T021 (2026-11-05) |
| E02 | Login and Authentication | ✅ | Done: US04–US07, T007–T017 (2026-11-04) |
| E03 | Customers | 🟦 | In progress: US08–US11, T022–T030; T022–T028 done |
| E04 | Products and Units | ⬜ | Roadmap only |
| E05 | Stock | ⬜ | Roadmap only |
| E06 | Invoicing and GST | ⬜ | Roadmap only |
| E07 | Dashboard and Activity | ⬜ | Roadmap only |
| E08 | Hardening, Data Migration and Deployment | ⬜ | Roadmap only |

---

## E01 — Layout

**Status:** ✅ Done (US01 ✅ · US02 ✅ · US03 ✅) — completed 2026-11-05

**Description**
Build the visual shell of the application with no business data and no API calls: the public **login layout** and the **authenticated layout** (header, navigation menu, content area, footer). Establish the web project, styling tokens and routing skeleton that every later epic builds on. Almost no database or API work is involved; the login form is UI only and is wired to the API in E02.

The existing system has a top navigation bar and a login card, but no footer and no header user area; those are added here.

### Acceptance Criteria (epic level)

| ID | Acceptance criterion |
|---|---|
| E01-AC1 | The web app builds and serves locally; Tailwind and shadcn/ui are configured with shared design tokens (colors, fonts, spacing). |
| E01-AC2 | `/login` shows a public layout: centered card with logo and app name, no navigation, no footer links to private pages. |
| E01-AC3 | The login form UI has username and password fields, a show/hide password toggle, client-side validation messages, and a submit button with a disabled/loading state. It does not call any API yet. |
| E01-AC4 | All authenticated routes render inside one shell with header, navigation menu, content area and footer. |
| E01-AC5 | The navigation menu is driven by one configuration list, highlights the active route, and collapses to a hamburger menu below 768 px. |
| E01-AC6 | Both layouts are usable from 360 px to 1920 px wide with no horizontal page scroll. |
| E01-AC7 | The header shows an app logo/name and a user area with a logout control (logout behaviour arrives in E02). |
| E01-AC8 | Unknown URLs show a "page not found" page. |
| E01-AC9 | Shared feedback components exist for later epics: loading spinner, toast notifications, confirm popup. |

### User stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US01 | Login layout | E01-AC1, AC2, AC3, AC6 | ✅ |
| US02 | Layout after login (header, menu, footer) | E01-AC4, AC5, AC6, AC7 | ✅ |
| US03 | Shared UI feedback and error pages *(planned; tasks T018–T021)* | E01-AC8, AC9 | ✅ |

### Descriptions

- **US01 — Login layout.** As a visitor, I see a clean, branded sign-in screen that works on phone and desktop, so I know where to enter my credentials. Includes creating the web project because nothing exists yet.
- **US02 — Layout after login.** As a signed-in user, I get a consistent frame around every page — header with my name and logout, a menu to move between modules, and a footer — so navigation feels the same everywhere.
- **US03 — Shared UI feedback and error pages.** As a user, I get clear loading, success/error and confirmation feedback and a friendly 404 page, so I am never left guessing what the app is doing.

### Tasks (simple list)

- US01: T001 Scaffold web project and design tokens · T002 Routing skeleton and public auth layout · T003 Login form UI (no API)
- US02: T004 Main layout shell and placeholder pages · T005 Config-driven navigation menu · T006 Header user area and footer
- US03: T018 Not-found and error pages · T019 Loading spinner and loading states · T020 Toast notifications · T021 Confirm popup

#### Decisions proposed for US03 (confirm or change)

1. **No new packages:** toasts and the confirm popup use `@base-ui/react` (already installed, the base of our shadcn components) instead of adding a toast library.
2. **Promise-style helpers:** `toast.success(...)` and `await confirm(...)` can be called from any component, so later epics stay short.
3. **Not-found page is shared** by signed-in and signed-out users; only its button changes.
4. **Error pages never show technical details** to the user (they go to the console only).

---

## E02 — Login and Authentication

**Status:** ✅ Done (US04 ✅ · US05 ✅ · US06 ✅ · US07 ✅) — completed 2026-11-04

**Description**
Make sign-in real: create the NestJS API and the first database collections (`users`, `refreshTokens`), implement login, token refresh, logout and session validation, protect all non-public routes on both API and UI, and enforce the two roles (`SUPER_ADMIN`, `ADMIN`). Replaces the old 3-minute JWT with per-request re-issue by a short-lived access token plus rotating refresh token, and replaces unsalted SHA-512 with argon2id (legacy hashes upgraded at first login).

### Acceptance Criteria (epic level)

| ID | Acceptance criterion |
|---|---|
| E02-AC1 | The API project runs with config validation, Mongoose connected to a MongoDB replica set, Swagger, and a health endpoint. The database is chosen by `DB_MODE`: `mock` starts an in-process replica set (no MongoDB installation needed), `real` connects to `MONGODB_URI`; switching needs only a setting change and restart (doc 02 §3.4). |
| E02-AC2 | `users` and `refreshTokens` collections and their indexes exist via a migrate-mongo migration; a seed creates the first admin without committing any secret. |
| E02-AC3 | `POST /auth/login` returns an access token and sets a refresh token cookie for valid credentials; invalid credentials return a generic 401. |
| E02-AC4 | Passwords are stored as argon2id; legacy SHA-512 hashes are accepted once and re-hashed. |
| E02-AC5 | Access tokens expire in 15 min; `POST /auth/refresh` rotates the refresh token; reuse of a revoked token revokes the family. |
| E02-AC6 | `POST /auth/logout` revokes the refresh token and clears the cookie; `GET /auth/me` validates the session. |
| E02-AC7 | Every API route except login/refresh/health requires authentication; `@Roles()` guards are enforced. |
| E02-AC8 | The login form calls the API, shows errors, and redirects to the dashboard; unauthenticated users are redirected to `/login`; logout works from the header. |
| E02-AC9 | Login attempts are rate-limited. |

### User stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US04 | API foundation and database switch | E02-AC1 | ✅ |
| US05 | Users, tokens and password security | E02-AC2, AC4 | ✅ |
| US06 | Session API (login, refresh, logout, me, guards) | E02-AC3, AC5, AC6, AC7, AC9 | ✅ |
| US07 | Web sign-in integration and route protection | E02-AC8 | ✅ |

### Descriptions

- **US04 — API foundation and database switch.** As a developer, I get a running NestJS API that connects to a mock or real MongoDB by one setting, with a health endpoint and API docs, so every later feature has a base to build on without installing MongoDB.
- **US05 — Users, tokens and password security.** As the business owner, I want user accounts and session tokens stored safely (argon2id, hashed refresh tokens, a first admin created without a committed secret), so credentials are never exposed.
- **US06 — Session API.** As a signed-in user, I want login, silent refresh, logout and a session check that are secure and rate-limited, and as the business I want every route protected by role, so only the right people reach the data.
- **US07 — Web sign-in integration and route protection.** As a user, I want the login form to really sign me in, send me to the dashboard, keep me signed in across refreshes, and log me out from the header, so the app behaves like a real product.

### Tasks (simple list)

- US04: T007 Scaffold API project and validated config · T008 Database module with mock/real switch, health and Swagger
- US05: T009 `users` and `refreshTokens` schemas with migration · T010 Password service (argon2id + legacy upgrade) and admin seed
- US06: T011 Login endpoint · T012 Refresh rotation and logout · T013 `GET /auth/me`, global auth guard, roles · T014 Login rate limiting
- US07: T015 API client and auth provider with login wiring · T016 Route protection and redirects · T017 Logout, real user in header, role-filtered menu

### Decisions proposed for E02 (confirm or change)

1. **Access token lives in memory only** on the web (never localStorage); the refresh token is an HttpOnly, `SameSite=Lax`, `Secure`-in-production cookie scoped to `/api/v1/auth`. A page reload silently calls refresh.
2. **First admin password** comes from `SEED_ADMIN_PASSWORD`; if unset, a random one is generated and printed once to the console (never stored in files).
3. **Route protection on the web** uses Next 16 `proxy.ts` to check for the refresh cookie (fast redirect) while the API stays the real authority via `GET /auth/me`.
4. **Rate limit:** 5 failed logins per username+IP per 15 min, plus 20 login requests per IP per minute.
5. Old users are not migrated yet (ETL is E08); legacy-hash support is built and unit-tested now, exercised later.

---

## E03 — Customers

**Status:** 🟦 In Progress — approved 2026-11-05 (US08 ✅ · US09 ✅ · US10 ✅ · US11 🟦)

**Description**
Let staff manage the customers they invoice: a searchable, paginated list, a detail page, add, edit and delete (soft), a logo image, and strict GSTIN checking. Everything is built API first (collection, rules, endpoints, files, audit trail) and then the screens. Replaces the old `CustomerController`, `CustomerService` (with its LiteDB queue and cache), the SQL `InvCustomers` table and the Angular `CustomerModule`.

### Acceptance Criteria (epic level)

| ID | Acceptance criterion |
|---|---|
| E03-AC1 | The `customers` collection and its indexes exist via a migration (unique GSTIN among non-deleted customers, name search and "recently added" indexes). |
| E03-AC2 | `GET /customers` returns a page of customers with total count, with search, sort and page size; `GET /customers/:id` returns one. Deleted customers never appear. |
| E03-AC3 | `POST /customers` and `PATCH /customers/:id` validate name, email, phones, address, pincode and GSTIN (format, real state code, check character); `stateCode` is derived from the GSTIN; a duplicate GSTIN gives `409`. |
| E03-AC4 | `DELETE /customers/:id` soft-deletes: the customer disappears from lists and its GSTIN can be used again. |
| E03-AC5 | A logo (JPEG, PNG or WebP, up to 5 MB, checked by content, not by file name) can be uploaded, replaced and downloaded through authorised endpoints; files live on local disk outside any public folder. |
| E03-AC6 | Every create, edit and delete is written to an append-only audit log with before/after and the actor (the audit service is reusable by E04–E06). |
| E03-AC7 | `/customer` shows the list: table on wide screens, cards on phones, search box, pagination, loading, empty and error states, and Edit/View/Delete actions. |
| E03-AC8 | Add and edit use one form with the same rules as the API, field-level API errors (for example duplicate GSTIN) shown at the field, logo preview, and success/error toasts. |
| E03-AC9 | `/customer/:id` shows details and the logo; Delete asks for confirmation and returns to the list. |
| E03-AC10 | Lint, typecheck, unit and e2e tests pass; the flow is verified end to end in the browser against the mock database. |

### Stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US08 | Customer data and rules | E03-AC1, AC3 | ✅ |
| US09 | Customer list, details, edit and delete API | E03-AC2, AC4 | ✅ |
| US10 | Logo files and audit trail | E03-AC5, AC6 | ✅ |
| US11 | Customer screens | E03-AC7, AC8, AC9, AC10 | 🟦 |

### Descriptions

- **US08 — Customer data and rules.** As a developer, I get the `customers` collection, GSTIN and state-code helpers, and create/validate rules, so the data is clean from the first record.
- **US09 — Customer list, details, edit and delete API.** As a staff member, I can find a customer fast, open it, correct it and remove it, through guarded endpoints.
- **US10 — Logo files and audit trail.** As the business owner, I want logos stored safely on disk and every customer change recorded (who, when, before and after).
- **US11 — Customer screens.** As a staff member, I want to do all of this from the Customers page on my desktop or phone.

### Tasks (simple list)

- US08: T022 `customers` schema, migration and GSTIN/state helpers · T023 Create customer endpoint with validation
- US09: T024 List, search, sort and paginate · T025 Get, edit and soft-delete endpoints
- US10: T026 Audit log service (pulled forward from E08) · T027 File storage and logo upload/download endpoints
- US11: T028 Customers API client and list page · T029 Add/edit form with logo · T030 Customer details page and delete flow

### Decisions proposed for E03 (confirm or change)

1. **Rules are cleaned up from the old UI.** Name: 2–100 characters, letters, digits and common punctuation (the old `^[A-Za-z. ]{5,50}$` rejects names like "A1 Traders & Sons"). Phones: Indian mobile, 10 digits starting 6–9, with an optional `+91`/`0` prefix accepted and stored as 10 digits (doc 03 allows a wider `+?[0-9]{8,15}`; say if you serve customers abroad). Email required, lower-cased.
2. **GSTIN is required** (as today) and checked by pattern, valid state code and the GST check character (catches typing mistakes). Checksum is skipped by the later data migration (E08) so old rows with bad GSTINs are not lost; they are listed for cleanup.
3. **Address is structured:** address line (required), city (required), pincode (6 digits, required) instead of one free-text string. Old addresses are split best-effort by the E08 migration.
4. **Search** is case-insensitive "contains" over name, email, phone and GSTIN using an escaped pattern: simple and fine up to a few tens of thousands of customers; revisit with a text index if it grows.
5. **Audit service is pulled forward into E03** (T026) so every later module is audited from the start; E08 keeps only the data-migration and reporting parts.
6. **Logo files are stored as uploaded** (type and size checked by content, no resizing in this phase), under `UPLOAD_DIR` (default `api/.data/uploads`, git-ignored), never served statically.
7. **Roles:** ADMIN and SUPER_ADMIN can do everything with customers (the old system had no roles). Delete is always allowed; invoices keep their own customer snapshot, so deleting never changes issued invoices.
8. Page sizes 10 / 25 / 50, default 10, newest first unless sorted.

---

## Roadmap-only epics (detailed when reached)

| Epic | Scope in one line | Main data |
|---|---|---|
| E04 Products and Units | Product CRUD, unit types, HSN and single GST rate, image upload | `products` (embedded stock) |
| E05 Stock | Opening stock, stock-in, adjustments, atomic non-negative balance, stock history | `stockMovements`, `products.stock` |
| E06 Invoicing and GST | Create invoice in one transaction, numbering, GST calculator (intra/inter-state), e-way bill upload, cancel, detail view | `invoices` (embedded items), `invoiceCounters`, `settings` |
| E07 Dashboard and Activity | Customer/product/invoice counts, top customers, recent activity feed | `activityLogs` + aggregations |
| E08 Hardening, Data Migration and Deployment | Audit log interceptor, SQL Server → MongoDB ETL with reconciliation, Docker, CI, secret rotation | `auditLogs`, all |

> The audit service was pulled forward into E03 (T026); E08 keeps the data migration, reporting and hardening.
