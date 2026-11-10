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
| E03 | Customers | ✅ | Done: US08–US11, T022–T030 (2026-11-06) |
| E04 | Products and Units | ✅ | Done 2026-11-09: US12–US15, T031–T038 |
| E05 | Stock | ✅ | Done 2026-11-09: US16 (T039–T041), US17 (T042–T044), US18 (T045–T046) |
| E06 | Invoicing and GST | 🟦 | Approved: US19 approved (T047–T049); US20–US23 to be detailed |
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

**Status:** ✅ Done — approved 2026-11-05, closed 2026-11-06 (US08 ✅ · US09 ✅ · US10 ✅ · US11 ✅)

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
| US11 | Customer screens | E03-AC7, AC8, AC9, AC10 | ✅ |

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

## E04 — Products and Units

**Status:** ✅ Done 2026-11-09 — decisions approved 2026-11-06 (US12 ✅ · US13 ✅ · US14 ✅ · US15 ✅)

**Description**
Let staff manage the products they sell: a searchable, paginated list, a detail page, add, edit and delete (soft), a product image, unit type (piece or pack), HSN code and one GST rate. Built like E03 (API first, then screens) and reusing its audit service, file storage and list/form patterns. Replaces the old `ProductController`, `ProductService`, the SQL `InvProducts` table and the `InvConstant` unit types, and the Angular `ProductModule` (its stock screens belong to E05).

### Acceptance Criteria (epic level)

| ID | Acceptance criterion |
|---|---|
| E04-AC1 | The `products` collection and its indexes exist via a migration (unique name among non-deleted products, name search and "recently added" indexes). |
| E04-AC2 | `GET /products` returns a page with total count, search, sort and page size (and an optional active-only filter); `GET /products/:id` returns one. Deleted products never appear. |
| E04-AC3 | `POST /products` and `PATCH /products/:id` validate name, unit, unit price (paise, ≥ 0), HSN code and GST rate (from the allowed set); a duplicate name gives `409`. `stock.qtyOnHand` can never be set through these endpoints. |
| E04-AC4 | `DELETE /products/:id` soft-deletes: the product disappears from lists and its name can be used again. A product can also be switched inactive (kept, but not offered for new invoices). |
| E04-AC5 | A product image (JPEG, PNG or WebP, up to 5 MB, checked by content) can be uploaded, replaced, downloaded and removed through authorised endpoints, using the same file storage as customer logos. |
| E04-AC6 | Every create, edit, delete and active/inactive change is written to the audit log. |
| E04-AC7 | `/product` shows the list: table on wide screens, cards on phones, search, pagination, loading/empty/error states, stock shown read-only, and View/Edit/Delete actions. |
| E04-AC8 | Add and edit use one form with the same rules as the API, field-level API errors, image preview, a live price-with-GST preview, and success/error toasts. |
| E04-AC9 | `/product/:id` shows details and the image; Delete asks for confirmation and returns to the list. |
| E04-AC10 | Lint, typecheck, unit and e2e tests pass; the flow is verified end to end in the browser against the mock database. |

### Stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US12 | Product data and rules | E04-AC1, AC3 | ✅ |
| US13 | Product list, details, edit and delete API | E04-AC2, AC4, AC6 | ✅ |
| US14 | Product image | E04-AC5 | ✅ |
| US15 | Product screens | E04-AC7, AC8, AC9, AC10 | ✅ |

### Descriptions

- **US12 — Product data and rules.** As a developer, I get the `products` collection and the unit and GST rules, so prices and tax data are clean from the first record.
- **US13 — Product list, details, edit and delete API.** As a staff member, I can find a product, open it, correct it, deactivate it and remove it, through guarded and audited endpoints.
- **US14 — Product image.** As a staff member, I can give a product a picture, stored safely on disk like customer logos.
- **US15 — Product screens.** As a staff member, I want to do all of this from the Products page on my desktop or phone.

### Tasks (simple list)

- US12: T031 `products` schema, migration, unit and GST-rate helpers · T032 Create product endpoint with validation
- US13: T033 List, search, sort and paginate · T034 Get, edit, activate/deactivate and soft-delete endpoints (audited)
- US14: T035 Product image upload/download endpoints (shared file storage)
- US15: T036 Products API client and list page · T037 Add/edit form with image and GST preview · T038 Product details page, delete flow and whole-epic check

### Decisions proposed for E04 (confirm or change)

1. **One GST rate per product** (`gstRate`, from 0, 0.25, 3, 5, 12, 18, 28). The old system stored CGST and SGST separately; intra-state invoices split the rate in two halves and inter-state invoices charge it whole as IGST (E06). If any existing product has CGST ≠ SGST, say so now (open question 1 in doc 03); the E08 migration reports such rows rather than guessing.
2. **Money in paise** (integer): the form takes rupees with up to 2 decimals and the API stores and returns `unitPrice` in paise. The list and details show ₹ with 2 decimals. The old "net cost" is shown as a read-only "price including GST" preview only; it is never stored.
3. **Units:** `PIECE` and `PACK` (a pack is 10 pieces, as in the old constants), as a fixed list in code instead of a constants table. Adding a unit later is a code change.
4. **Stock is not edited here.** A new product starts at 0 on hand; the old "current stock" box on the add form is replaced by the opening-stock and stock-in screens in E05 (so stock only ever changes through the stock service, with a history row). The list and details show the quantity read-only.
5. **Rules cleaned up from the old UI:** name 2–100 characters, letters, digits and common punctuation (the old `^[A-Za-z. ]{5,50}$` rejects "Bag 25kg"), unique among active products, case-insensitive; HSN 4, 6 or 8 digits; price ≥ 0 (a zero price is allowed, for free items).
6. **Inactive vs deleted:** inactive products stay in lists (marked) and keep their history but E06 will not offer them for new invoices; deleted products disappear. Both are audited.
7. **Image** uses the same file storage, limits and endpoints pattern as customer logos (`/products/:id/image`), stored as uploaded.
8. **Roles, page sizes and search** as in E03 (ADMIN and SUPER_ADMIN may do everything; 10/25/50; case-insensitive "contains" over name and HSN code).

---

## E05 — Stock

**Status:** ✅ Done 2026-11-09 (US16 ✅ · US17 ✅ · US18 ✅)

**Description**
Make stock trustworthy: every change to a product's quantity goes through one service, never below zero, with an append-only history row that records the balance after the change and, later, the invoice that caused it. Replaces the SQL triggers (`trg_InvProducts_Stock_Quantity`, `trg_InvProducts_InitialStock`, `InvProducts_StockUpdate`) and the `InvProducts_Stock` table; design in doc 03 §3.5 and §5.1.

### Acceptance Criteria (epic level, US16 part)

| ID | Acceptance criterion |
|---|---|
| E05-AC1 | The `stockMovements` collection and its indexes exist via a migration; rows are append-only. |
| E05-AC2 | `StockService.apply()` changes `stock.qtyOnHand` with one atomic conditional update, rejects any change that would go below zero (`409 INSUFFICIENT_STOCK`), and writes a movement with `balanceAfter` in the same transaction. |
| E05-AC3 | A product created with `openingStock` gets an `OPENING` movement in the same transaction; stock can never be set through create or edit directly. |
| E05-AC4 | `GET /products/:id/stock-movements` returns the product's history, newest first, paged. |
| E05-AC5 | `POST /products/:id/stock-in` and `POST /products/:id/stock-adjustments` change stock through `StockService` only, in one transaction with the movement and an audit row; the balance never goes below 0 or above 100,000,000. (US17) |
| E05-AC6 | `/product/[id]/stock` lets staff add stock or correct it (pieces or packs, reason for adjustments), with a before/after preview and field-level errors, reachable from the product page and list. (US17) |
| E05-AC7 | The product page shows a "Stock history" section: newest first, paged, with date, kind, signed change, balance after, note and who. (US18) |
| E05-AC8 | After a stock entry the history is current; the story is verified end to end in the browser and documented. (US18) |

### Stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US16 | Stock engine and opening stock | E05-AC1, AC2, AC3, AC4 | ✅ |
| US17 | Stock-in and adjustment | E05-AC5, AC6 | ✅ Done 2026-11-09 |
| US18 | Stock history on the product page | E05-AC7, AC8 | ✅ Done 2026-11-09 |

### Tasks (simple list)

- US16: T039 `stockMovements` schema and migration · T040 `StockService.apply()` atomic and non-negative · T041 Opening stock on create and the stock-history endpoint
- US17: T042 Stock-in and adjustment endpoints · T043 Stock entry screen · T044 Entry points and US17 check
- US18: T045 Stock history section · T046 Story check and refresh after entries

### Decisions for US17 (approved 2026-11-09)

1. **Two endpoints, not one.** `stock-in` (goods arrive, always positive) and `stock-adjustments` (a correction, either direction). The type is fixed by the endpoint, so a client cannot send `SALE` or `OPENING` by hand; those belong to invoices and product creation.
2. **The API counts in pieces.** A pack is 10 pieces (E04). The screen lets staff type packs and converts them (×10) before sending, so history and balances are always in one unit.
3. **Adjustments need a reason** (3 to 200 characters) because they change the count without goods moving; stock-in may have a note (delivery reference). Both show in the history.
4. **No editing or deleting a movement.** A mistake is corrected with another entry (history is append-only, T039).
5. **Limits:** one entry up to 1,000,000 pieces (as opening stock); the balance may not exceed 100,000,000 (`409 STOCK_LIMIT_EXCEEDED`), and may never go below 0 (`409 INSUFFICIENT_STOCK`).
6. **Inactive products can receive stock** (a deactivated product may still be sold down or corrected); deleted ones cannot.
7. **No separate "double submit" key on the API.** The screen disables the form while saving; two real clicks would be two real entries, which the history shows. If you want protection against repeated sends from retries, say so and an `Idempotency-Key` header is added in T042.
8. **Roles** as before: ADMIN and SUPER_ADMIN.

### Decisions for US18 (approved 2026-11-09)

1. **On the product page, not a separate screen.** The history sits under the details, so "why is it 47?" is answered where the number is shown.
2. **Read-only, no filters yet.** Newest first, paged (10/25/50). Filtering by kind or date range is not included; say so if you want it.
3. **Page and size in the address** (`?hpage=`, `?hsize=`) so a refresh or shared link shows the same rows.
4. **Shown in pieces** with sign and colour (`+40`, `−3`) and the balance after each change; dates with time in the same format as the rest of the app.
5. **No API change.** The endpoint from T041 already returns everything needed (including who made the change).
6. **Sales appear automatically** once invoices exist (E06); until then the "Invoice" cell is plain text, linked to the invoice in E06.
7. **Roles** as before: ADMIN and SUPER_ADMIN.

---

## E06 — Invoicing and GST

**Status:** 🟦 Approved 2026-11-09 (US19 approved; US20–US23 are detailed and approved one at a time)

**Description**
Issue GST invoices in one transaction: number, tax, lines and stock together or not at all. Replaces the old three-commit save (`InvoiceService.AddInvoiceAsync`), the GST procs and triggers, and the client-supplied invoice numbers; design in doc 03 §3.6–3.8, §5.2–5.4. Invoices are never edited or deleted: a mistake is cancelled (stock comes back) and issued again.

### Acceptance Criteria (epic level)

| ID | Acceptance criterion |
|---|---|
| E06-AC1 | The business profile (name, GSTIN, state, address, logo, invoice footer, invoice prefix) is stored once and editable by staff; its state decides intra- or inter-state supply. (US19) |
| E06-AC2 | One tax calculator (integer paise, half-up) gives CGST + SGST for same-state and IGST for other-state supply, per line and in total with a whole-rupee round-off; the API and the screen are tested against the same sample file. (US20) |
| E06-AC3 | `POST /invoices` saves the invoice, takes the next number from `invoiceCounters`, writes `SALE` movements for every line and an audit row in one transaction; a line with too little stock fails the whole invoice with `409 INSUFFICIENT_STOCK` naming the product and nothing is saved. (US20) |
| E06-AC4 | Invoices can be listed (search, filters, paging), opened with every line, and an optional e-way bill image can be attached and downloaded. (US20) |
| E06-AC5 | `POST /invoices/:id/cancel` marks the invoice cancelled with a reason, returns every line's stock with `SALE_CANCEL` movements and audits it, once only. (US21) |
| E06-AC6 | The create-invoice screen picks a customer and products, shows live line and invoice totals with the same tax rules, and shows API refusals on the right line. (US22) |
| E06-AC7 | The invoice list, the invoice details page and the cancel action are available on screen; the stock history links each sale to its invoice. (US23) |

### Stories

| ID | Title | Covers | Status |
|---|---|---|---|
| US19 | Business profile | E06-AC1 | 🟦 Approved |
| US20 | Tax calculator and invoice engine (API) | E06-AC2, AC3, AC4 | ⬜ (to be detailed) |
| US21 | Cancel an invoice (API) | E06-AC5 | ⬜ (to be detailed) |
| US22 | Create-invoice screen | E06-AC6 | ⬜ (to be detailed) |
| US23 | Invoice list, details and cancel on screen | E06-AC7 | ⬜ (to be detailed) |

### Tasks (simple list)

- US19: T047 Business profile API and migration · T048 Business profile screen · T049 US19 check
- US20 to US23: numbered and written when each story is planned (about 12 more tasks; the first is the tax calculator).

### Decisions for E06 (approved 2026-11-09)

These answer doc 03 §8 questions 2 to 4; the defaults below are what the design assumed.

1. **Both supply types ship now.** Same state as the business profile gives CGST + SGST; another state gives IGST. A customer's state is taken from the first two digits of their GSTIN (already stored).
2. **Invoice numbers are generated**, `{prefix}/{financial year}/{0000n}` (for example `KRG/2026-27/00001`), gap-free per financial year (April to March, India time). Staff never type a number. Numbers from the old system are kept as they are by the migration (E08).
3. **No editing of an issued invoice**: only cancel and issue a new one. A cancelled invoice stays visible and keeps its number.
4. **A line is counted in the product's own unit** (pieces or packs). Stock is taken in pieces (a pack is 10), so selling 3 packs takes 30 pieces from stock and the `SALE` row says −30.
5. **Prices come from the product at the time of the sale** and are copied onto the invoice with name, HSN, unit and GST rate; later product edits never change an issued invoice. No per-line price override and no discounts in this phase.
6. **Only active products and existing (not deleted) customers** can be invoiced. The same product cannot appear on two lines (add to the quantity instead); at most 50 lines per invoice.
7. **Invoice date** is today (India time) by default and may be set to an earlier date in the same financial year; never a future date.
8. **Business profile must exist** before the first invoice: without it `POST /invoices` answers `409 BUSINESS_PROFILE_MISSING` and the screen points to the settings page.
9. **E-way bill** is an optional image (JPEG, PNG or WebP, up to 5 MB) stored with the shared file storage; it can be attached when creating the invoice, and viewed or downloaded later.
10. **No PDF yet**, as agreed: invoice documents and the "interactive" documents wait until you describe the structure. The details page is the on-screen invoice for now.
11. **Roles**: ADMIN and SUPER_ADMIN can create and view; cancelling is allowed to both (say if cancelling should be SUPER_ADMIN only).
12. **Order of work**: profile first (the tax rules need the state), then the engine without screens, then cancel, then the screens, so each step can be checked with curl before any UI.


---

## Roadmap-only epics (detailed when reached)

| Epic | Scope in one line | Main data |
|---|---|---|
| E07 Dashboard and Activity | Customer/product/invoice counts, top customers, recent activity feed | `activityLogs` + aggregations |
| E08 Hardening, Data Migration and Deployment | Audit log interceptor, SQL Server → MongoDB ETL with reconciliation, Docker, CI, secret rotation | `auditLogs`, all |

> The audit service was pulled forward into E03 (T026); E08 keeps the data migration, reporting and hardening.
