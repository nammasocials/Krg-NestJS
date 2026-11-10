# 06 — Tasks

Only tasks of the story/epic in progress are specified. Stories: [05-user-stories.md](05-user-stories.md). Epics: [04-epics.md](04-epics.md). Stack: [02-tech-stack.md](02-tech-stack.md).

Each task has: definition · ACs · DB table/collection definition · UI flow · API flow · files (new / changed / used) · verification. "Reference" points at the old Angular code to take ideas from; nothing is copied blindly.

Paths are relative to `Krg-NestJS/` unless they start with `old:` (= `E:\Projects\Learning\Krg\Krg-UI\InvBilling\src\app\`).

Status legend: ⬜ To Do · 🟦 In Progress · ✅ Done

---

# Epic E01 — Layout

## US01 — Login layout

### T001 — Scaffold web project and design tokens  ✅ Done (2026-11-02)

**Definition:** Create the Next.js project in `web/` (App Router, TypeScript strict) with Tailwind and shadcn/ui, environment handling, and global design tokens, so every later task has a working, building base. Also create the pnpm workspace root.

**Acceptance criteria**
- T001-AC1: `pnpm install` at the repo root, then `pnpm --filter web dev` serves a placeholder page at `http://localhost:4000` with no console errors.
- T001-AC2: `pnpm --filter web build` and `pnpm --filter web lint` pass.
- T001-AC3: Tailwind utilities work (a test class visibly styles the placeholder) and shadcn/ui is initialised (`Button` renders).
- T001-AC4: Design tokens live in one place (CSS variables in `globals.css`): primary, accent, danger, gradient start/end, input font size, validation font size. Defaults keep the old look (blue → purple gradient, red errors).
- T001-AC5: `.env.example` documents `NEXT_PUBLIC_APP_NAME`, `API_BASE_URL` (used by the `/api/*` rewrite); no secrets are committed; env access goes through one typed module.
- T001-AC6: Logo is a static asset referenced from a single constant.
- T001-AC7: `.nvmrc` / `engines` pin Node 24.

**Result / deviations from the plan (as built)**
- Versions installed: Next.js 16.4.3, React 19.3.0, Tailwind CSS 4 (CSS-first config — there is **no** `tailwind.config.js` / `postcss.config.mjs`; the Turbopack Tailwind loader is configured in `next.config.ts`), pnpm 12.16.1 (via corepack, not installed globally), shadcn CLI 4.x (style `base-nova`, primitives from **Base UI**, not Radix; class merging via the shadcn-ui `cn` package).
- The generator's `cacheComponents` / `partialPrefetching` options were **removed** from `next.config.ts` (they force Suspense around anything time- or request-dependent, e.g. the footer year in T006). The `/api/*` rewrite to `API_BASE_URL` was added.
- `web/package.json` got `engines.node >= 24` and a `typecheck` script (`next typegen && tsc --noEmit`; `LayoutProps` is a Next-generated type).
- Verified: `lint`, `typecheck`, `build` pass; dev server serves the placeholder at `http://localhost:4000` (gradient, logo, shadcn `Button`, red validation text) with no console or server errors.
- **Ports (changed after review):** web dev and start run on **4000** (`next dev --port 4000`). The API default is therefore **5000** (`API_BASE_URL=http://localhost:5000`; the NestJS API must listen on 5000).
- **Review (2026-11-02):** re-ran lint, typecheck and a production build; `next start` on 4000 served `/` (200), optimized logo `/_next/image` (200), `/logo.png` (200), unknown URL (404). Removed a stray npm `package-lock.json` generated inside `web/` (pnpm is the only package manager; pnpm does not recreate it) and replaced the generator's boilerplate `web/README.md`.
- Not verified yet: the `/api/*` rewrite end to end (no API exists until E02); with no API running it returns 500, as expected.
- Not set up: git (this folder is not a repository yet).

**DB collection definition:** None.

**UI flow**
- Developer runs the dev server → browser shows a placeholder page using the tokens (gradient background, primary button).
- No other routes yet.

**API flow:** None. (`next.config.ts` gets the `/api/*` → `API_BASE_URL` rewrite so later tasks need no change; it is harmless until the API exists.)

**Files**
- New: `package.json` (workspace root), `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, `.editorconfig`
- New: `web/package.json`, `web/tsconfig.json`, `web/next.config.ts`, `web/components.json` (shadcn), `web/eslint.config.mjs`, `web/.gitignore`, `web/next-env.d.ts` (generated)
- New (dev tooling, outside the project): `E:ProjectsLearningKrg.claudelaunch.json` (preview server `krg-web`)
- New: `web/src/app/layout.tsx` (root layout, fonts, metadata), `web/src/app/page.tsx` (placeholder)
- New: `web/src/app/globals.css` (Tailwind + shadcn variables + Krg tokens section: `--brand-primary/accent/danger`, `--brand-gradient-from/to`, `--font-size-input`, `--font-size-validation`, utilities `bg-brand-gradient`, `text-input-size`, `text-validation`)
- New: `web/src/config/constants.ts` (app name, logo path), `web/src/config/env.ts` (typed env)
- New: `web/src/components/ui/shared/button.tsx` (shadcn; `components.json` alias `ui` = `@/components/ui/shared`), `web/src/lib/utils.ts` (re-exports `cn`)
- Changed: `web/src/app/page.tsx` (placeholder), `web/src/app/layout.tsx` (metadata, fonts)
- New: `web/.env.example`, `web/public/logo.png`, `web/public/favicon.ico`
- Reference: `old: constants.ts`, `old: ../styles.css`, `old: ../../tailwind.config.js`

**Verification:** run dev server, open the page, resize the window, run build and lint.

---

### T002 — Routing skeleton and public layout  ✅ Done (2026-11-02)

**Definition:** Add App Router route groups and a reusable public layout that centers its content in a card on the branded gradient background with logo and app name. `/` redirects to `/login`.

**Acceptance criteria**
- T002-AC1: Visiting `/` redirects to `/login`.
- T002-AC2: `/login` renders inside `(public)/layout.tsx` with logo, app name "Invoice Manager" and a subtitle.
- T002-AC3: The public layout has no navigation or links to private pages.
- T002-AC4: Card is centered vertically and horizontally, max width 28 rem, and keeps 16 px side gutters at 360 px width.
- T002-AC5: Unknown URLs show Next's default 404 for now (custom page arrives in US03).
- T002-AC6: Page `<title>` is "Sign in · Invoice Manager".

**Result (as built)**
- Root layout title is a template (`%s · Invoice Manager`, default `Invoice Manager`); the login page sets `title: "Sign in"`.
- The app name is the page `<h1>` (rendered by `Brand` with `nameAs="h1"` in the public layout); the subtitle is page content, so each public page supplies its own.
- Verified in the browser: `/` → 307 → `/login`; card 448 px (28 rem) and centred on a 1024 px viewport; at 360 px the card has 16 px gutters left and right, is vertically centred, with no horizontal scroll; no links or nav on the page; `/random` → Next default 404; production build on port 4000 has no console errors. Lint, typecheck and build pass.
- Note: dev-mode console shows HMR WebSocket errors only when testing against a stale dev server; not an app issue.

**DB collection definition:** None.

**UI flow**
- User opens the site → redirected to `/login` → sees centered card with logo, title, subtitle and an empty content area (form arrives in T003).

**API flow:** None.

**Files**
- Changed: `web/src/app/page.tsx` (`redirect('/login')`), `web/src/app/layout.tsx` (title template)
- New: `web/src/app/(public)/layout.tsx` (gradient background + card + logo/title)
- New: `web/src/app/(public)/login/page.tsx` (placeholder content, metadata)
- New: `web/src/components/layout/brand.tsx` (logo + app name, reused by header in T006)
- Used: `web/src/config/constants.ts`, `web/src/app/globals.css`
- Reference: `old: AuthModule/Components/sign-in/sign-in.component.html`, `old: app.routes.ts`

**Verification:** open `/`, `/login`, `/random`; check at 360 px and 1440 px widths.

---

### T003 — Login form UI (no API)  ✅ Done (2026-11-02)

**Definition:** Build the login form inside the public layout with React Hook Form + Zod validation, show/hide password and a submit button with loading/disabled states. Submitting only runs a local stub (API wiring is E02).

**Acceptance criteria**
- T003-AC1: Fields: Username, Password; labels linked to inputs; Enter key submits; username is focused on load.
- T003-AC2: Username rule: starts with a letter, 5–20 characters, letters and digits only. Invalid after blur shows: "Username must start with a letter, be 5–20 characters long and contain only letters or numbers."
- T003-AC3: Password rule: required only (no complexity rule at login). Missing after blur shows "Password is required."
- T003-AC4: Invalid fields get a red border; valid fields use the primary focus ring.
- T003-AC5: Eye icon toggles password visibility and has an accessible label ("Show password" / "Hide password").
- T003-AC6: Submit button is disabled while loading and shows a spinner; invalid submit marks all fields touched and does not run the stub.
- T003-AC7: A reserved area above the form can show a server error message (empty for now).
- T003-AC8: Works with keyboard only; visible focus; passes basic contrast.
- T003-AC9: Validation schema is exported separately so it can be unit-tested.

**Result (as built)**
- Libraries: react-hook-form 7, zod 4, @hookform/resolvers 7, lucide-react; Vitest 5 for tests (`pnpm --filter web test`, 16 schema tests pass). shadcn `Input` and `Label` added to `ui/shared`; the shadcn `form` wrapper was **not** used — plain react-hook-form is simpler and sufficient.
- Validation runs `onTouched` (after first blur, then on every change). Submit button is disabled only while loading (not when invalid) so the user can click it to see all errors.
- **Bug found and fixed during verification:** pressing the Sign in button blurred the focused field, the blur error pushed the button down, and the click landed off the button and was lost (an empty submit showed only the username error). Fix: `onMouseDown={e => e.preventDefault()}` on the submit button keeps focus in the field until the click completes. Re-verified: empty submit shows both errors and returns focus to the username.
- Verified in the browser (production build on port 4000): username focused on load; labels linked; invalid username/blank password messages and red borders; eye toggles type and label (`Show password` ⇄ `Hide password`); valid submit shows spinner, `Signing in…`, `aria-busy`, disabled, then resets after ~800 ms; Enter key submits; invalid submit does not run the stub; console log contains the username only (never the password); 360 px: card 328 px wide, errors wrap, no horizontal scroll; lint, typecheck, tests and build pass.
- Not verified: screen-reader announcement (labels/`aria-describedby`/`aria-live` are in place but no assistive tech was run); contrast was checked by eye, not with a tool.

**DB collection definition:** None in this task. *(E02 uses `users` — doc 03 §3.1.)*

**UI flow**
- Page loads → username focused.
- User types → messages appear after blur.
- User clicks eye → password text shown/hidden.
- Valid submit → button enters loading state, form value logged to console (no password), loading resets after 800 ms (temporary stub, removed in E02).
- Invalid submit → messages shown, no stub call.

**API flow:** None yet. Planned in E02: `POST /api/v1/auth/login` `{ username, password }` → `200 { accessToken }` + refresh cookie, or generic `401`.

**Files**
- New: `web/src/features/auth/login-form.tsx` (client component)
- New: `web/src/features/auth/login-schema.ts` (Zod schema)
- New: `web/src/features/auth/login-schema.test.ts` (Vitest)
- New: `web/src/components/ui/shared/{input,label}.tsx` (shadcn)
- New: `web/vitest.config.mts`; changed: `web/package.json` (`test` script)
- Changed: `web/src/app/(public)/login/page.tsx` (renders `LoginForm`)
- Changed: `web/package.json` (react-hook-form, zod, @hookform/resolvers, lucide-react, vitest)
- Used: `web/src/app/(public)/layout.tsx`, `web/src/app/globals.css`
- Reference: `old: AuthModule/Components/sign-in/sign-in.layout.ts`, `old: AuthModule/Components/sign-in/sign-in.component.html`

**Verification:** run the schema unit tests; type invalid/valid values, toggle password, tab through, test at 360 px, submit stub and observe loading state.

---

## US02 — Layout after login (header, menu, footer)

### T004 — Authenticated layout and placeholder pages  ✅ Done (2026-11-02)

**Definition:** Create `(app)/layout.tsx` with header slot, page content and footer slot, plus placeholder pages for the main modules. The shell is temporarily reachable without login; route protection is added in E02.

**Acceptance criteria**
- T004-AC1: `/dashboard`, `/invoice`, `/product`, `/customer`, `/report` render inside the `(app)` layout.
- T004-AC2: Each placeholder page shows its title and "Coming soon", and sets its own `<title>`.
- T004-AC3: Layout is a full-height column: header on top, content grows, footer at the bottom even on short pages.
- T004-AC4: Content area is centered, max width 80 rem, with responsive padding.
- T004-AC5: A visible `TODO(E02): protect (app) routes` comment marks where the middleware/proxy and auth provider will attach.
- T004-AC6: Page background in the shell is neutral (light gray); the gradient is only for the public layout.

**Result (as built)**
- **AC1 deviation (decided):** `/` still redirects to `/login` (T002). The clause "`/` under the shell redirects to `/dashboard`" moves to E02: a signed-in user visiting `/login` or `/` will be sent to `/dashboard`. A group page at `/` would also clash with `app/page.tsx`.
- Header and footer in `(app)/layout.tsx` are deliberate **stubs** (logo + name; app name). T005 adds the menu, T006 the user area, logout and the real footer. Max content width is `max-w-7xl` (80 rem = 1280 px).
- Verified (production build, port 4000, browser): all five routes return 200 with titles `Dashboard/Invoices/Products/Customers/Reports · Invoice Manager` and "Coming soon"; footer is flush with the viewport bottom on short pages (1024×768) and sits below the content on a 2000 px tall page; at 1920 px the content is 1280 px wide, centred (320 px each side); at 360 px no horizontal scroll and the card keeps 16 px margins; back/forward moves between pages; no console errors; lint, typecheck, 16 tests and build pass.
- Not verified: dark mode (not in scope); the shell is publicly reachable by design until E02.

**DB collection definition:** None.

**UI flow**
- User opens `/dashboard` by typing the URL → sees header area, "Dashboard — Coming soon", footer area.
- Browser back/forward works between placeholder pages.

**API flow:** None.

**Files**
- New: `web/src/app/(app)/layout.tsx`
- New: `web/src/app/(app)/dashboard/page.tsx` (each page exports `metadata.title` and renders `PagePlaceholder`)
- New: `web/src/app/(app)/invoice/page.tsx`
- New: `web/src/app/(app)/product/page.tsx`
- New: `web/src/app/(app)/customer/page.tsx`
- New: `web/src/app/(app)/report/page.tsx`
- New: `web/src/components/layout/page-placeholder.tsx`
- Reference: `old: main-layout/main-layout.layout.ts`, `old: main-layout/main-layout.component.html`, `old: app.routes.ts`

**Verification:** open each route, check footer position on short and long content, resize.

---

### T005 — Config-driven navigation menu  ✅ Done (2026-11-02)

**Definition:** Add a navigation menu rendered from a single config array: desktop horizontal tabs with active highlighting and a mobile hamburger panel.

**Acceptance criteria**
- T005-AC1: Items come only from `nav.config.ts` (label, href, optional `roles` for E02): Dashboard, Invoices, Products, Customers, Reports.
- T005-AC2: At ≥ 768 px items show as a horizontal tab bar; the active item is highlighted (Dashboard matches exactly, others match by prefix, so `/customer/123` highlights Customers).
- T005-AC3: At < 768 px a hamburger button toggles a vertical panel; the button has `aria-expanded`, `aria-controls` and `aria-label`.
- T005-AC4: Selecting an item in the mobile panel navigates and closes the panel; the panel also closes on route change and on Escape.
- T005-AC5: Adding a menu item requires editing `nav.config.ts` only.
- T005-AC6: Active-route matching is a small pure function with unit tests.

**Result (as built)**
- `NAV_ITEMS` in `nav.config.ts` is the only place items are defined (`label`, `href`, optional `exact`, optional `roles` — roles are ignored until E02). `isActive(pathname, href, exact)` matches on segment boundaries and ignores a trailing slash; 6 unit tests (22 tests in total now pass).
- Mobile panel state stores *the path it was opened on*, so any route change closes it without a reset effect; an Escape listener (added only while open) closes it and returns focus to the hamburger button. Links carry `aria-current="page"`; the button has `aria-label` (Open/Close menu), `aria-expanded`, `aria-controls`. The panel is absolutely positioned under the `relative` header.
- Verified in the browser (production build, port 4000): desktop shows 5 tabs, Dashboard active; clicking Products then Customers navigates and moves the blue underline; at 768 px tabs show and hamburger is hidden, at 767 px the reverse; at 375 px the panel opens under the header with the current page highlighted, selecting an item navigates and closes it, Escape closes it with focus back on the button; no horizontal scroll; lint, typecheck, tests and build pass.
- Not verified: prefix highlighting on a real nested page such as `/customer/123` (that route does not exist until E03; covered by the unit tests only); mobile-panel clicks and Escape were simulated through page scripts because the browser pane was hidden, not with real pointer input; screen-reader behaviour.

**DB collection definition:** None.

**UI flow**
- Desktop: user clicks a tab → page changes, tab highlighted.
- Mobile: user taps hamburger → panel opens → taps "Products" → navigates, panel closes.

**API flow:** None. *(E02 will filter items by the signed-in user's role using `roles`.)*

**Files**
- New: `web/src/components/layout/nav/nav.config.ts`
- New: `web/src/components/layout/nav/is-active.ts`, `is-active.test.ts`
- New: `web/src/components/layout/nav/main-nav.tsx` (client component, `usePathname`)
- New: `web/src/components/layout/nav/mobile-nav.tsx`
- Changed: `web/src/app/(app)/layout.tsx` (mounts `MainNav` and `MobileNav` in the header stub; T006 moves the header into its own component)
- Reference: `old: main-layout/menu/menu.component.{ts,html}`

**Verification:** run unit tests; click through all items on desktop width, open `/customer/123` to check prefix highlight, repeat at 375 px with hamburger and Escape.

---

### T006 — Header user area and footer  ✅ Done (2026-11-03)

**Definition:** Complete the header (logo, app name, nav, user name/role chip, logout button) and add the footer (app name, current year, version). Logout is a placeholder until E02.

**Acceptance criteria**
- T006-AC1: Header shows logo (48 px desktop, 36 px mobile), app name, the nav (T005) and a user area on the right.
- T006-AC2: User area shows display name and a role chip from a `getCurrentUserStub()` (hard-coded "Demo User / ADMIN", marked `TODO(E02)`).
- T006-AC3: Logout button navigates to `/login` and does nothing else (no token handling yet), marked `TODO(E02)`.
- T006-AC4: On mobile the user name collapses to an initial avatar; Logout is reachable inside the hamburger panel.
- T006-AC5: Footer shows "© {current year} Namma Socials · Invoice Manager · v{version}"; version comes from `NEXT_PUBLIC_APP_VERSION` set in `next.config.ts` from `package.json`.
- T006-AC6: Header sticks to the top while scrolling; footer does not.
- T006-AC7: No horizontal scroll at 360 px.

**Result (as built)**
- **Header is responsive in three tiers (decided during verification):** the first version overflowed at 768–~1000 px (the app name was squashed and the user area ran off the right edge, causing horizontal scroll). Final behaviour: **below 768 px** hamburger + initial avatar (Logout in the panel, with name and role); **768–1023 px** logo only (name hidden), compact tabs, avatar + icon-only Logout; **1024–1279 px** logo + name, compact tabs, avatar + icon-only Logout; **1280 px and up** full name, role chip and `Logout` button. This refines AC1/AC4: the name and Logout label appear from 1280 px, not 768 px.
- Logo is 36 px below 768 px and 48 px from 768 px up (`Brand` got an `imageClassName` prop for responsive sizing). Header is `sticky top-0`; footer is not sticky.
- User is a stub (`getCurrentUserStub()`: Demo User / ADMIN); Logout (`useLogout`) only navigates to `/login`; both marked `TODO(E02)`.
- Footer text `© {year} Namma Socials · Invoice Manager · v{version}`. The version is read from `web/package.json` in `next.config.ts` (`NEXT_PUBLIC_APP_VERSION`). **The year is fixed when the site is built** (pages are static), so it changes with the first build of a new year.
- Verified (production build, port 4000, browser): widths 360, 767, 768, 1023, 1024, 1279, 1280, 1440 and 1920 have no horizontal scroll and show the expected tier; header stays at the top after scrolling 1200 px; footer appears only at the end of a 2500 px page; Logout (desktop and mobile panel) goes to `/login`; footer text and version correct; lint, typecheck, 22 tests and build pass.
- Not verified: real mouse clicks on the mobile panel (page scripts were used because the pane was hidden at times); screen-reader behaviour; widths between the ones listed.

**DB collection definition:** None. *(User fields later come from `users.fullName` / `users.role` — doc 03 §3.1.)*

**UI flow**
- User sees logo + app name left, tabs in the middle, name/role + Logout right.
- Click Logout → `/login`.
- Scroll a long page → header stays visible; footer appears at the end.

**API flow:** None. *(E02: `GET /api/v1/auth/me` fills the user area; `POST /api/v1/auth/logout` backs the button.)*

**Files**
- New: `web/src/components/layout/header.tsx`, `web/src/components/layout/user-area.tsx`
- New: `web/src/components/layout/footer.tsx`
- New: `web/src/lib/auth/current-user.stub.ts` (temporary), `web/src/lib/auth/use-logout.ts` (temporary: navigates to `/login`)
- Changed: `web/src/components/layout/brand.tsx` (responsive logo), `web/src/components/layout/nav/mobile-nav.tsx` (user block + Logout in panel), `web/src/components/layout/nav/main-nav.tsx` (compact spacing below 1280 px)
- Changed: `web/src/app/(app)/layout.tsx` (header + footer)
- Changed: `web/next.config.ts` (`NEXT_PUBLIC_APP_VERSION`)
- Used: `web/src/components/layout/brand.tsx`, `web/src/components/layout/nav/*`, `web/src/config/constants.ts`
- Reference: `old: main-layout/menu/menu.component.html` (logo block, logout button)

**Verification:** check header/footer at 360, 768 and 1440 px, scroll test on a long placeholder, click Logout.

---

## US03 — Shared UI feedback and error pages

*Planned 2026-11-04. Web only; no API or database work. Decisions to confirm are listed in [04-epics.md](04-epics.md) under US03. File lists are intended files and may be refined when each task starts.*

### T018 — Not-found and error pages  ✅ Done (2026-11-04)

**Definition:** Unknown URLs and unexpected errors show a friendly page instead of the framework default.

**Acceptance criteria**
- T018-AC1: `app/not-found.tsx` renders for any unknown URL with the app brand, "Page not found", and one button: "Go to dashboard" for a signed-in user, "Go to sign in" otherwise (decided on the client from `useAuth`).
- T018-AC2: A not-found inside the private area (for example `/invoice/does-not-exist` later) can use the same page via `notFound()`.
- T018-AC3: `app/error.tsx` shows "Something went wrong" with a "Try again" button (calls `reset`) and a link home; the error message and stack are never shown to the user, only logged to the console.
- T018-AC4: `app/global-error.tsx` covers errors in the root layout with the same wording and plain styling.
- T018-AC5: Pages are readable from 360 px to 1920 px, have one `h1`, and set the right `<title>`.
- T018-AC6: A small test covers the choice of destination by session status.

**DB collection definition:** None.

**UI flow:** User opens `/nothing-here` → sees "Page not found" → clicks the button → lands on the dashboard or sign-in page.

**API flow:** None.

**Files (intended)**
- New: `web/src/app/not-found.tsx`, `web/src/app/error.tsx`, `web/src/app/global-error.tsx`, `web/src/components/layout/status-page.tsx` (shared look), `web/src/components/layout/status-page.test.ts` (destination helper)

**Verification:** open an unknown URL signed out and signed in; throw a temporary error in a page to see the error page and "Try again".

**Result (as built)**
- **Files:** `app/not-found.tsx`, `app/error.tsx`, `app/global-error.tsx`; shared `components/layout/{status-page.tsx, status-page-target.ts (+test), home-link.tsx}`. No new packages.
- **Behaviour:** the 404 page (real HTTP 404, title "Page not found") shows brand, "404", short text and one button: "Go to dashboard" when signed in, "Go to sign in" otherwise (also while the session check is running). `notFound()` from any page uses the same page. The error page shows "Something went wrong" with "Try again" (`reset`) and the home button; the error goes to the console only. `global-error.tsx` is a plain page for root-layout failures (it imports `globals.css` because it replaces the root layout).
- **Verified:** 56 web tests pass (2 new), lint and typecheck pass. Live: signed out `/nothing-here` is 404 with "Go to sign in"; signed in `/invoice/zzz` is 404 with "Go to dashboard" and one `h1`; a temporary client page that threw showed the error page with no message text on screen and "Try again" + "Go to dashboard" (temporary page removed).
- **Not verified:** `global-error.tsx` (needs a failing root layout), 360 px width by eye, and the "Try again" button recovering a real transient failure.

---

### T019 — Loading spinner and loading states  ✅ Done (2026-11-04)

**Definition:** One shared spinner used everywhere something loads.

**Acceptance criteria**
- T019-AC1: `Spinner` (sizes `sm`, `md`, `lg`; inherits colour; `role="status"` with a visually hidden label, default "Loading…") and `PageSpinner` (centred in the content area) exist under `components/ui/shared`.
- T019-AC2: `AuthGate` and the login/logout button use these components instead of their own `Loader2` markup, with the same look and labels as today.
- T019-AC3: `(app)/loading.tsx` shows `PageSpinner` while a private page streams in.
- T019-AC4: The spinner respects reduced motion (slow pulse instead of fast spin) and never causes layout shift.

**DB collection definition:** None.

**UI flow:** Navigate between private pages → a centred spinner appears while the page loads.

**API flow:** None.

**Files (intended)**
- New: `web/src/components/ui/shared/spinner.tsx`, `web/src/app/(app)/loading.tsx`
- Changed: `web/src/components/layout/auth-gate.tsx`, `web/src/features/auth/login-form.tsx`

**Verification:** throttle the network in the browser and navigate; check the login button and session check still look the same.

**Result (as built)**
- **Files:** new `components/ui/shared/spinner.tsx` (`Spinner`, `PageSpinner`) and `app/(app)/loading.tsx`; changed `components/layout/auth-gate.tsx` and `features/auth/login-form.tsx`. No new packages.
- **`Spinner`:** sizes `sm`/`md`/`lg`, colour from the text colour, `role="status"` with hidden text (default "Loading…"). `label={null}` gives a decorative icon with no role, used inside the sign-in button so the button's own "Signing in…" text is the announcement. Fast spin normally, a slow pulse under `prefers-reduced-motion`.
- **`PageSpinner`:** centred in the content area (`min-h-[50vh]`, so the footer does not jump), or `fullScreen` for the session check ("Checking your session…"). `loading.tsx` shows it inside the header/footer shell while a private page streams in.
- **Verified:** 56 web tests pass, lint and typecheck pass (no new tests: the components are markup only and Vitest runs without a DOM here). Live: the sign-in button still shows the spinner and "Signing in…" with `aria-busy`, with no nested status role; with a temporary 6-second server delay on Reports, clicking its menu item showed the spinner inside the shell (header visible, label "Loading…") and then the page content (temporary delay removed).
- **Not verified:** the reduced-motion pulse by eye (class present, effect not observed), the full-screen session spinner frame (too short to catch), and no layout-shift measurement.


---

### T020 — Toast notifications  ✅ Done (2026-11-04)

**Definition:** A small, accessible way to tell the user "saved", "failed", or "heads up" from anywhere.

**Acceptance criteria**
- T020-AC1: `ToastProvider` in the root layout and a `useToast()` hook with `success(message)`, `error(message)`, `info(message)` (optional title and duration).
- T020-AC2: Built on `@base-ui/react` Toast (already installed; no new package). Toasts appear bottom-right on wide screens and full width at the bottom on phones, so they never cover the header's user area and Logout.
- T020-AC3: Success and info close after 5 s, errors after 8 s; hovering or focusing a toast pauses the timer; every toast has a close button; at most 3 are visible at once.
- T020-AC4: Announced to screen readers (`aria-live` polite for success/info, assertive for errors); colour is not the only signal (icon and title too).
- T020-AC5: Message text is plain text only (no HTML), so API error messages can be shown safely.
- T020-AC6: Unit tests cover the option defaults (durations, types) helper.

**DB collection definition:** None.

**UI flow:** Code calls `toast.success("Customer saved")` → toast slides in, closes by itself or by the × button.

**API flow:** None (later epics call it with API results).

**Files (intended)**
- New: `web/src/components/ui/shared/toast.tsx`, `web/src/lib/ui/toast-options.ts` (+ `toast-options.test.ts`)
- Changed: `web/src/app/layout.tsx` (provider)

**Verification:** a temporary button on the dashboard fires each type; check timing, pause on hover, stacking, keyboard close, 360 px width; remove the button afterwards.

**Result (as built)**
- **Files:** new `components/ui/shared/toast.tsx` (`ToastProvider`, `useToast`) and `lib/ui/toast-options.ts` (+test); changed `app/layout.tsx` (provider wraps the app). Uses `@base-ui/react` Toast; no new packages.
- **Use:** `const toast = useToast(); toast.success("Customer saved")`, also `toast.error(...)`, `toast.info(...)`, each with optional `{ title, duration }`. The message is rendered as text, so `<b>` in an API message appears literally and cannot inject markup.
- **Behaviour:** success and info close after 5 s, errors after 8 s (`duration: 0` keeps it open); a close button on each; at most 3 visible (extra ones wait); hover and focus pause the timer (library behaviour). Errors are high priority (assertive for screen readers), the others polite; each has an icon and a title, so colour is not the only signal.
- **Deviation:** the toasts sit at the **bottom** (full width on phones, bottom right from 640 px) instead of the top, so they can never cover the header's name and Logout button.
- **Verified:** 60 web tests pass (4 new for the option defaults), lint and typecheck pass. Live (temporary buttons on the login page, since removed): all three types render at the bottom right with icon, title and text; `<b>` showed literally; success and info were gone about 6 s after firing and the error about 9–10 s (timer plus the exit animation); a real mouse click on × closed one toast; with four fired, three showed; at 375 px the viewport was full width with no horizontal scroll.
- **Not verified / known:** keyboard-only close and the screen-reader announcements (not tested with a screen reader); the hover pause by hand; one early run where toasts stayed past 8 s while the browser pane was not focused (likely the library pausing timers when the window is not focused; a later run in the same state timed correctly); a clicked `.click()` from script did not close a toast, a real click did.


---

### T021 — Confirm popup  ✅ Done (2026-11-05)

**Definition:** An accessible "Are you sure?" dialog for destructive or irreversible actions.

**Acceptance criteria**
- T021-AC1: `useConfirm()` returns `confirm({ title, message, confirmLabel, cancelLabel, destructive })` which resolves `true` or `false` (promise style, so callers write `if (await confirm(...))`).
- T021-AC2: Built on `@base-ui/react` AlertDialog: focus moves into the dialog, is trapped there, returns to the opener on close; Esc and the Cancel button resolve `false`; clicking the backdrop does not confirm.
- T021-AC3: The destructive variant uses the red button; the default focus is on Cancel for destructive dialogs.
- T021-AC4: Only one confirm is open at a time; a second call while open resolves `false` immediately.
- T021-AC5: Works at 360 px width; long messages wrap and scroll inside the dialog.
- T021-AC6: Unit tests cover the promise logic (confirm, cancel, second call).

**DB collection definition:** None.

**UI flow:** Delete click → dialog "Delete this invoice?" → Delete (red) or Cancel.

**API flow:** None.

**Files (intended)**
- New: `web/src/components/ui/shared/confirm-dialog.tsx`, `web/src/lib/ui/confirm-queue.ts` (+ `confirm-queue.test.ts`)
- Changed: `web/src/app/layout.tsx` (provider)

**Verification:** a temporary button opens each variant; test keyboard (Tab, Esc, Enter), focus return, and 360 px width; remove the button afterwards.

**Result (as built)**
- **Files:** new `components/ui/shared/confirm-dialog.tsx` (`ConfirmProvider`, `useConfirm`) and `lib/ui/confirm-queue.ts` (+test); changed `app/layout.tsx` (provider). Uses `@base-ui/react` AlertDialog; no new packages.
- **Use:** `const confirm = useConfirm(); if (await confirm({ title, message, confirmLabel, cancelLabel, destructive })) { … }`. Defaults: "Confirm" and "Cancel". The promise logic is a plain controller (`createConfirmController`), separate from React.
- **Behaviour:** Esc and Cancel answer `false`; Confirm answers `true`; a click on the backdrop does nothing. Focus moves into the dialog, stays there while tabbing, and returns to the button that opened it. Destructive: red Delete-style button and Cancel is focused first; normal: Confirm is focused. A second `confirm()` while one is open answers `false` at once and leaves the first open. Long messages wrap and scroll inside the dialog; on phones the buttons stack with Confirm on top.
- **Verified:** 66 web tests pass (6 new for the controller), lint and typecheck pass. Live (temporary buttons on the login page, since removed): destructive dialog with a very long message showed correctly with Cancel focused; Esc gave `false` and focus went back to the opener; Confirm gave `true`; Cancel gave `false`; the normal variant focused Confirm; a second ask answered `false` while the first stayed open; a click on the backdrop left it open; Tab kept focus inside; at 375 px it showed full width with stacked buttons.
- **Not verified:** screen-reader announcements, the Enter key on the focused button by hand, and the closing animation (none is defined, so the dialog disappears at once).

**US03 and E01 are done.** E01-AC8 (not-found page) and E01-AC9 (spinner, toasts, confirm popup) are met by T018–T021.


---

# Epic E02 — Login and Authentication

*Planned, not started. File lists are the intended files and may be refined when each task starts. Collections follow [03-database-design.md](03-database-design.md) §3.1–3.2.*

## US04 — API foundation and database switch

### T007 — Scaffold API project and validated config  ✅ Done (2026-11-03)

**Definition:** Create `Krg-NestJS/api` (NestJS 12, Express, strict TS) with validated configuration, global conventions and security middleware. No database yet.

**Acceptance criteria**
- T007-AC1: `corepack pnpm --filter api dev` starts on port 5000 (`PORT` overrides); `api` is part of the pnpm workspace.
- T007-AC2: Config is validated at startup (`PORT`, `NODE_ENV`, `DB_MODE`, `MONGODB_URI`, `MOCK_DB_PATH`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TTL_DAYS`, `CORS_ORIGIN`); a missing or invalid value stops the app with a message naming the variable.
- T007-AC3: All routes live under `/api/v1`; request bodies are validated (whitelist, forbid unknown properties).
- T007-AC4: Success responses use the envelope `{ code, message, data }`; errors use the same shape with a machine-readable `code`; stack traces never reach clients.
- T007-AC5: helmet, CORS (only `CORS_ORIGIN`), cookie-parser and pino request logging are on; passwords and tokens are redacted from logs.
- T007-AC6: `.env.example` documents every variable; no secret is committed.
- T007-AC7: lint, typecheck, unit tests and build pass.

**Result (as built)**
- Config is validated with **zod** (not Joi): `validateEnv` throws one message naming every bad variable. `JWT_ACCESS_SECRET` needs ≥ 32 characters; `MONGODB_URI` is required only when `DB_MODE=real`. The "refuse mock in production" rule moves to T008 where the mode is used.
- **Version deviations:** NestJS **12** (current at scaffold time; doc said 11) and TypeScript **5.9** (TS 7 installed by default but ts-jest and typescript-eslint reject it). Nest 12 packages are ESM-only, so the test script runs Jest with `--experimental-vm-modules`. Build output is CommonJS and loads them through Node 24's `require(esm)`.
- A local `api/.env` with a generated secret exists for development (gitignored); only `.env.example` is committed material. `pnpm-workspace.yaml` now lists `@scarf/scarf` and `@parcel/watcher` as not allowed to run install scripts.
- Verified: 13 unit tests (config, error filter, envelope), lint, typecheck and build pass. Running the built app: starts on 5000; with the secret removed it stops naming `JWT_ACCESS_SECRET`; `GET /api/v1/nope` → `404 {"code":"NOT_FOUND","message":"Cannot GET /api/v1/nope","data":null}`; helmet headers present; CORS allows only `http://localhost:4000` with credentials; a request carrying a password body and a Bearer header was logged with `authorization` redacted and the password absent.
- Not verified yet: the 400 validation response through the real pipe (no endpoint with a DTO exists until T011; the filter's handling is unit-tested); the `nest start --watch` dev command was not run (only the built app).

**DB collection definition:** None.

**UI flow:** None.

**API flow:** No business endpoints yet; an unknown route returns the error envelope with 404.

**Files (intended)**
- New: `api/package.json`, `api/tsconfig*.json`, `api/nest-cli.json`, `api/.env.example`
- New: `api/src/main.ts`, `api/src/app.module.ts`
- New: `api/src/config/{env.schema.ts,config.module.ts}`
- New: `api/src/common/{response.interceptor.ts,http-exception.filter.ts}`
- Changed: `pnpm-workspace.yaml` (already lists `api`), root `README.md`
- Reference: `old: Krg-WebAPI Program.cs`

**Verification:** start with a missing secret (fails clearly), start normally, request an unknown route, check the log has no password.

---

### T008 — Database module (mock/real), health and Swagger  ✅ Done (2026-11-03)

**Definition:** Implement the single database seam from doc 02 §3.4, with a transaction-support check, health endpoint, Swagger and migration wiring.

**Acceptance criteria**
- T008-AC1: `DB_MODE=mock` (default outside production) starts an in-process MongoDB replica set; with `MOCK_DB_PATH` the data persists between restarts, empty means in-memory.
- T008-AC2: `DB_MODE=real` connects to `MONGODB_URI`; an unreachable URI stops startup with a clear error and no password in the message.
- T008-AC3: `NODE_ENV=production` with `DB_MODE=mock` refuses to start.
- T008-AC4: Startup verifies transaction support and fails clearly if the server is a standalone node.
- T008-AC5: `GET /api/v1/health` (public) returns `{ db: { mode, connected, transactions } }`.
- T008-AC6: Swagger UI at `/api/docs`, disabled when `NODE_ENV=production`.
- T008-AC7: Mock mode runs pending migrations/seed automatically; real mode only via `pnpm --filter api db:migrate`.
- T008-AC8: `mongodb-memory-server` is a devDependency loaded by dynamic `import()`; tests always use mock.

**Result (as built)**
- `DatabaseModule` is the only code that knows the mode. Mock mode starts `MongoMemoryReplSet` through `MockMongoService` (lazy `import()`, one instance shared via `MockMongoModule`, stopped on shutdown); real mode uses `MONGODB_URI`. The database name comes from the URI path (default `krg`); mock uses `krg`.
- **Production refusal** is part of config validation (`DB_MODE: mock is not allowed when NODE_ENV=production`), so the app stops before anything else starts.
- **Transaction check:** startup asks the server for `hello` and fails if it has no replica-set name. `/health` returns `{ status, db: { mode, connected, transactions } }` inside the envelope. `@Public()` does not exist yet; a `TODO(T013)` marks the controller.
- **Migrations:** `migrate-mongo` 14 is ESM-only, so migration files use the `.mjs` extension (`api/migrations/`, empty until T009). Mock mode applies pending ones at startup (`runMigrations`); real mode logs a hint and relies on `pnpm --filter api db:migrate` / `db:status` / `db:down` / `db:create` (`migrate-mongo-config.mjs`, reads `MONGODB_URI`).
- **Settings added:** `MOCK_DB_PORT` (default 27018) and `MOCK_DB_VERSION`. A fixed port is needed for persistent data because the stored replica-set config contains the member's address. The library avoids reusing a port within the same process, so "restart" only works across separate processes, which is how the app is used.
- Version note: Mongoose is **9** (doc said 8). `mongodb-memory-server` is a devDependency; its install script is disallowed in `pnpm-workspace.yaml` (the binary downloads on first mock run, about 780 MB, cached under `~/.cache/mongodb-binaries`).
- Swagger UI at `/api/docs` (not under `/api/v1`), not mounted when `NODE_ENV=production`.
- Verified: 19 unit/integration tests pass, including an in-memory mock-database test of `GET /health` that also runs the migration runner; lint, typecheck and build pass. Built app in mock mode: `/api/v1/health` → `{"mode":"mock","connected":true,"transactions":true}`, Swagger returns 200, a throw-away migration was applied at startup. Data written by one process was read back by a second process using the same `MOCK_DB_PATH`. `DB_MODE=real` against an unreachable URI stops after about 6 s with `ECONNREFUSED` and the password does not appear in the output; real without `MONGODB_URI`, and production with mock, stop naming the variable. `pnpm db:status` and `db:migrate` applied a throw-away migration against a mock server (used as a stand-in for a real one); the throw-away file and data were removed afterwards.
- Not verified: a genuine external MongoDB server (none available; the CLI was run against the mock server instead); restarting after a hard kill (power loss, `taskkill /F`) was not examined, only clean shutdowns; behaviour on a standalone server (the error path is written but not exercised).

**DB collection definition:** None (infrastructure only; `migrations` bookkeeping collection is created by migrate-mongo).

**UI flow:** None.

**API flow**
- `GET /api/v1/health` → `200 { code:"OK", data:{ db:{ mode:"mock", connected:true, transactions:true } } }`.

**Files (intended)**
- New: `api/src/database/{database.module.ts,mock-mongo.ts,transactions.check.ts}`
- New: `api/src/health/{health.controller.ts,health.module.ts}`
- New: `api/migrate-mongo-config.ts`, `api/migrations/`
- Changed: `api/src/main.ts` (Swagger), `api/package.json` (scripts `db:migrate`, `db:status`)

**Verification:** start in mock mode and read `/health`; restart with a persistent path and confirm data survives; start real mode with a wrong URI.

---

## US05 — Users, tokens and password security

### T009 — `users` and `refreshTokens` schemas and migration  ✅ Done (2026-11-03)

**Definition:** Define the two Mongoose schemas and the first migration that creates their indexes (autoIndex stays off).

**Acceptance criteria**
- T009-AC1: `users` has the fields below; role is restricted to `SUPER_ADMIN` or `ADMIN`.
- T009-AC2: A username differing only in case cannot be inserted twice (collation strength 2 unique index).
- T009-AC3: `refreshTokens.tokenHash` is unique; `expiresAt` has a TTL index (`expireAfterSeconds: 0`); `userId` and `familyId` are indexed.
- T009-AC4: The migration is idempotent and has an `up` and a `down`.
- T009-AC5: Schemas never serialise `passwordHash` (excluded from JSON output).

**Result (as built)**
- Schemas use `@nestjs/mongoose` decorators: `users/user.schema.ts`, `auth/refresh-token.schema.ts`. `versionKey` is off; `users` has `createdAt/updatedAt`, `refreshTokens` only `createdAt`. `Role` and the username pattern live in `users/roles.ts` (same rule as the web form).
- `passwordHash` is **hidden twice**: `select: false` (not loaded unless `findByUsername(name, true)` asks) and removed in `toJSON`. T011 will use the `withHash` flag.
- Migration `api/migrations/20261103100000-create-users-and-refresh-tokens.mjs` creates both collections and the named indexes `username_unique_ci`, `tokenHash_unique`, `expiresAt_ttl`, `userId`, `familyId`. `down` drops both collections (data included), so it is a development-only rollback. Mongoose `autoIndex` stays off.
- Small additions beyond the task text, needed by T010/T011: `UsersModule` / `UsersService` (`findByUsername` case-insensitive via collation, `create`, `count`) and an `AuthModule` that only registers the `RefreshToken` model for now (both imported in `AppModule`).
- Verified: 31 tests pass (12 new, against the in-memory mock database, which applies the real migration at startup): required fields, role and username rules, `passwordHash` absent from JSON, `Admin1` vs `admin1` rejected with duplicate-key error, case-insensitive lookup, duplicate `tokenHash` rejected, the index definitions (unique, collation, TTL `expireAfterSeconds: 0`), and the migration re-run after clearing its changelog. Lint, typecheck and build pass. The built app in persistent mock mode logged the migration as applied and a direct driver connection listed `users: _id_, username_unique_ci` and `refreshTokens: _id_, tokenHash_unique, expiresAt_ttl, userId, familyId` with one changelog entry.
- Not verified: that the TTL monitor actually deletes an expired token (MongoDB runs it about once a minute; the index definition is checked, not the deletion); the `down` migration was not executed.
- Test note: both database specs now allow 60 s for `afterAll`, because stopping `mongod` occasionally exceeded Jest's 5 s default when the suites ran in parallel (one failed run before the change).

**DB collection definition**

`users`

| Field | Type | Rules |
|---|---|---|
| username | str | Req, trimmed, unique case-insensitive; same pattern as the web form |
| passwordHash | str | Req, argon2id, or `sha512$<hex>` for legacy |
| fullName | str | Req |
| role | str enum | `SUPER_ADMIN` \| `ADMIN` |
| isActive | bool | default true |
| lastLoginAt | Date | |
| legacyId | str | optional |
| createdAt, updatedAt | Date | timestamps |

`refreshTokens`

| Field | Type | Rules |
|---|---|---|
| userId | ObjectId | Req, indexed |
| tokenHash | str | Req, unique; SHA-256 of the opaque token |
| familyId | str | Req, indexed |
| expiresAt | Date | Req, TTL index |
| revokedAt | Date | set on use, logout or family revoke |
| replacedBy | ObjectId | token that replaced this one |
| userAgent, ip | str | informational |
| createdAt | Date | timestamp |

Indexes: `users {username:1}` unique collation `{locale:'en',strength:2}`; `refreshTokens {tokenHash:1}` unique, `{expiresAt:1}` TTL, `{userId:1}`, `{familyId:1}`.

**UI flow:** None.

**API flow:** None (no endpoints).

**Files (intended)**
- New: `api/src/users/{user.schema.ts,users.module.ts,users.service.ts}`
- New: `api/src/auth/refresh-token.schema.ts`
- New: `api/migrations/<timestamp>-create-users-and-refresh-tokens.ts`
- Reference: `old: InvUser table`, `doc 03 §3.1–3.2, §4`

**Verification:** run migrations on the mock DB, list indexes, try inserting `Admin` and `admin`, insert an expired token and confirm TTL config.

---

### T010 — Password service and admin seed  ✅ Done (2026-11-04)

**Definition:** Hash and verify passwords with argon2id, recognise legacy SHA-512 hashes and signal that they need upgrading, and seed the first admin without committing a secret.

**Acceptance criteria**
- T010-AC1: `hash()` returns an argon2id string with unique salt; `verify()` accepts it.
- T010-AC2: `verify()` also accepts a legacy `sha512$<hex>` value (old unsalted SHA-512 of the password, compared in constant time) and returns `needsRehash: true`.
- T010-AC3: Argon2 parameters come from config with safe defaults; tests use cheap parameters.
- T010-AC4: The seed creates `SEED_ADMIN_USERNAME` (default `admin`) as `SUPER_ADMIN` only if no user exists; running it twice changes nothing.
- T010-AC5: The seed password comes from `SEED_ADMIN_PASSWORD`; if unset, a random password is generated and printed once to the console, never written to a file.
- T010-AC6: Unit tests cover hash, verify, wrong password, legacy accept, legacy wrong, and seed idempotency.

**Result (as built)**
- `PasswordService` (`auth/password.service.ts`, provided by `AuthModule`) uses the `argon2` package. `verify()` returns `{ valid, needsRehash }`: `needsRehash` is true for every legacy value and also for an argon2 hash made with lower cost settings than the current ones. A malformed stored value is a failed login, never an exception. The legacy format was confirmed in the old `HashHelper.cs`: lowercase hex of SHA-512 over the UTF-8 password, no salt; the test uses the known SHA-512 of `password`.
- New settings (all in `.env.example`): `ARGON2_MEMORY_KIB` (default 19456), `ARGON2_TIME_COST` (2), `ARGON2_PARALLELISM` (1), `SEED_ADMIN_USERNAME` (`admin`), `SEED_ADMIN_PASSWORD` (optional, min 8 characters), `SEED_ADMIN_FULL_NAME`.
- **Deviation from "seed as a migration":** the seed is application code (`seed/seed.service.ts`) because it must hash with argon2 and use a per-environment secret, which does not belong in a migration file. It runs automatically at startup in mock mode (after migrations) and through `pnpm --filter api db:seed` (`src/seed.ts`) for a real database; run `db:migrate` first so the unique index exists. It only creates the admin when the `users` collection is empty, and a duplicate-key error from a concurrent start is treated as "already seeded".
- With no `SEED_ADMIN_PASSWORD`, a random 16-character password is written **directly to stdout** (not through the logger, so it does not go into structured logs) once, and is not stored anywhere.
- Verified: 41 tests pass (10 new): argon2id format and unique salts, right/wrong password, cost-change rehash signal, legacy accept/reject and known vector, malformed values, seed with a chosen password (hash is argon2id, nothing printed), idempotent re-runs, generated password printed exactly once and verifies. Lint, typecheck and build pass. Built app in mock mode printed the one-time banner, stored `$argon2id$v=19$m=19456...`, and a direct argon2 check of the printed password succeeded. `db:seed` run against that server in real mode said "Users already exist: admin seed skipped".
- Not verified: the real-mode `db:seed` on an empty real database (only the skip path was run); behaviour with two API instances starting at the same instant (the duplicate-key branch is written, not exercised); the cost settings were chosen from the OWASP minimum, not measured on the production host.

**DB collection definition:** Uses `users` (T009).

**UI flow:** None.

**API flow:** None.

**Files (intended)**
- New: `api/src/auth/password.service.ts`, `password.service.spec.ts`
- New: `api/migrations/<timestamp>-seed-admin.ts` (or `api/src/database/seed.ts`, called by mock startup and `db:migrate`)
- Changed: `api/.env.example` (`SEED_ADMIN_*`, `ARGON2_*`)
- Reference: `old: AuthService / SHA-512 helper`, finding S2 in doc 01

**Verification:** unit tests; start mock mode and read the printed one-time password; restart and confirm no second admin.

---

## US06 — Session API

### T011 — Login endpoint  ✅ Done (2026-11-04)

**Definition:** `POST /auth/login` validates credentials and starts a session.

**Acceptance criteria**
- T011-AC1: Body `{ username, password }` is validated with the same rules as the web form; invalid shape → 400 with field messages.
- T011-AC2: Valid credentials → `200 { accessToken, expiresIn, user:{ id, username, fullName, role } }` and a `refresh_token` cookie (HttpOnly, `SameSite=Lax`, `Secure` in production, path `/api/v1/auth`, max-age = refresh TTL).
- T011-AC3: Unknown user, wrong password and inactive user all return the same `401` message "Invalid username or password" with the same shape (no user enumeration; comparable timing by hashing a dummy value for unknown users).
- T011-AC4: Access token is a JWT with `sub`, `role`, 15-min expiry; the refresh token is 256-bit random, stored only as SHA-256 with a new `familyId`.
- T011-AC5: A legacy hash is re-hashed to argon2id on success; `lastLoginAt` is updated.
- T011-AC6: Password and tokens never appear in logs or error output.

**Result (as built)**
- Files: `auth/{auth.controller,auth.service,token.service,password.service,refresh-cookie,ttl}.ts`, `auth/dto/login.dto.ts`; `AuthModule` now has the controller and `JwtModule` (`@nestjs/jwt`, HS256, secret from `JWT_ACCESS_SECRET`). `UsersService.recordLogin(id, newHash?)` sets `lastLoginAt` and, when a legacy/outdated hash was verified, stores the new argon2id hash in the same update.
- The shared request setup (helmet, cookie parser, CORS, `/api/v1` prefix, validation pipe) moved from `main.ts` into `app.setup.ts` so the e2e tests run exactly what production runs.
- Response `200`: `{ code, message, data: { accessToken, expiresIn: 900, user: { id, username, fullName, role } } }`. The refresh token is **only** in the cookie, never in the body. Cookie: `refresh_token`, `HttpOnly; SameSite=Lax; Path=/api/v1/auth; Max-Age=604800`, plus `Secure` when `NODE_ENV=production`.
- Failure paths: unknown user, wrong password and inactive user all return `401 {"code":"UNAUTHORIZED","message":"Invalid username or password","data":null}` with no cookie. For an unknown user the password is verified against a dummy argon2 hash (created once per process), so timing stays comparable; inactive users are checked after the password verify. Bad shape → `400 VALIDATION_FAILED` with the message list; unknown properties are rejected; the submitted password is never echoed.
- The refresh token is 32 random bytes (base64url); the database row keeps `sha256(token)`, a new `familyId` per login, expiry, user agent (cut to 255 characters) and IP.
- Verified: 66 tests pass (25 new: success shape and cookie flags, JWT claims and 15-minute lifetime, stored hash is the SHA-256 and the raw value is not stored, a new family per login, case-insensitive and trimmed username, seeded admin login, legacy hash upgraded to argon2id and still working, identical 401 bodies for all three failure kinds, dummy verify for unknown users, no token/`lastLoginAt` change on failure, 7 validation cases, TTL parser, production cookie flag). Lint, typecheck and build pass. Built app via curl: 200 with the expected cookie and body, 401, 400; none of the three submitted passwords nor the cookie value appeared in the log (the pino redaction from T007 covers `authorization`, `cookie`, `set-cookie` and `body.password`).
- Not verified: actual timing equality between the unknown-user and wrong-password paths (only that the dummy verify runs); the `Secure` flag in a real production run (unit-tested only); the browser accepting the cookie through the Next.js `/api/*` rewrite (T015). Login is **not rate limited yet** (T014) and `@Public()` does not exist yet (`TODO(T013)` in the controller).

**DB collection definition:** Reads/updates `users`; inserts into `refreshTokens` (T009).

**UI flow:** None in this task (web wiring is T015).

**API flow**
1. Validate body.
2. Find user by username (case-insensitive); if absent, verify against a dummy hash and fail.
3. `PasswordService.verify`; on failure or `isActive=false` → generic 401.
4. If `needsRehash`, store argon2id hash.
5. Create refresh token (new family), set cookie, sign access token, set `lastLoginAt`.
6. Return the envelope with the token and user.

**Files (intended)**
- New: `api/src/auth/{auth.module.ts,auth.controller.ts,auth.service.ts,token.service.ts,dto/login.dto.ts}`
- New: `api/test/auth-login.e2e-spec.ts`
- Reference: `old: AuthController.Login`, findings S1/S4

**Verification:** e2e tests plus a manual call from Swagger; decode the JWT; check the cookie flags.

---

### T012 — Refresh rotation and logout  ✅ Done (2026-11-04)

**Definition:** Silent refresh with rotation and reuse detection, and logout.

**Acceptance criteria**
- T012-AC1: `POST /auth/refresh` with a valid cookie returns a new access token and sets a new refresh cookie; the old token is marked revoked with `replacedBy`.
- T012-AC2: Missing, unknown, or expired token → 401 and the cookie is cleared.
- T012-AC3: Presenting an already-revoked token revokes every token in its family (reuse detection) and returns 401.
- T012-AC4: Two simultaneous refreshes with the same token: exactly one succeeds (atomic revoke with a conditional update).
- T012-AC5: Refresh fails if the user is inactive or deleted.
- T012-AC6: `POST /auth/logout` revokes the presented token's family, clears the cookie, and returns 204 even if the token was already invalid.

**Result (as built)**
- `TokenService` gained `consumeActive` (one `findOneAndUpdate` on `{tokenHash, revokedAt: null, expiresAt > now}` — the atomic step), `findByRaw`, `linkReplacement` and `revokeFamily`; `AuthService.refresh/logout`; `AuthController` routes `POST /auth/refresh` (200) and `POST /auth/logout` (204). `UsersService.findById` was added. Login and refresh now build their result through one `startSession` helper.
- Refresh returns the same body as login (`accessToken`, `expiresIn`, `user`), so the web app can restore a session from one call. The role comes from the database on every refresh, so a role change applies within one rotation.
- Failure message for every refresh problem: `401 "Session expired. Please sign in again."` and the cookie is cleared. A token that is unknown or expired is a plain 401; a token that was **already revoked** also revokes its whole family (reuse detection). The family is also revoked when the user is inactive. A deactivated user stays signed out after reactivation until they log in again.
- Logout looks up the token and revokes its family only, so other devices keep their sessions; it answers 204 for a missing, unknown or already-revoked token.
- **Known trade-off (strict reuse detection):** two refreshes with the same token at the same moment — for example two browser tabs waking up together — give one 200 and one 401, and the losing request also revokes the family, so the user must sign in again. The AC asks for exactly this behaviour. The web app must therefore never send concurrent refreshes; this is now part of T015-AC6.
- Also fixed in passing: the in-memory mock database asked for the `ephemeralForTest` storage engine, which MongoDB removed in 7.0; the library logged a warning and fell back to `wiredTiger`. The mock now asks for `wiredTiger` directly.
- Verified: 81 tests pass (15 new, run four times in a row without a flake): rotation with `replacedBy` link and same family, three-step chain, role change picked up, replay revokes family and the newest token, other sessions unaffected, simultaneous refresh gives `[200, 401]`, missing/unknown/expired token, expired token not treated as theft, deactivated and deleted user, access token in place of a refresh token, logout (family revoked, cookie cleared, other device unaffected, idempotent, junk input). Lint, typecheck and build pass. Built app with a curl cookie jar: login, refresh (cookie value changed), replay of the old cookie → 401 with the cookie cleared, newest cookie then also 401, logout → 204 with cleared cookie and refresh afterwards 401; none of the cookie values appeared in the log.
- Not verified: behaviour with two API instances (rotation is atomic in MongoDB, so it should hold, but only one instance was run); the browser sending the cookie through the Next.js rewrite (T015); no cleanup beyond the TTL index removes old revoked rows (they disappear at their `expiresAt`). Refresh and logout are not rate limited and not yet marked `@Public()` (`TODO(T013)`).

**DB collection definition:** Reads/updates/inserts `refreshTokens`; reads `users`.

**UI flow:** None in this task.

**API flow**
- Refresh: hash cookie value → conditional update `{tokenHash, revokedAt:null, expiresAt>now}` set `revokedAt` → if matched, insert successor in same family; if not matched but the hash exists → revoke family.
- Logout: hash cookie → revoke family → clear cookie.

**Files (intended)**
- Changed: `api/src/auth/{auth.controller.ts,auth.service.ts,token.service.ts}`
- New: `api/test/auth-refresh.e2e-spec.ts`

**Verification:** e2e tests including reuse and concurrency; manual replay of an old cookie.

---

### T013 — `GET /auth/me`, global guard and roles  ✅ Done (2026-11-04)

**Definition:** Protect every route by default and add role checks.

**Acceptance criteria**
- T013-AC1: A global guard requires a valid `Authorization: Bearer` access token on every route unless marked `@Public()`.
- T013-AC2: `@Public()` is applied only to login, refresh, logout and health.
- T013-AC3: `@Roles('SUPER_ADMIN')` returns 403 for an `ADMIN`; no `@Roles()` means any authenticated user.
- T013-AC4: `GET /auth/me` returns the current user; if the user is now inactive or deleted it returns 401 (checked against the database, not only the token).
- T013-AC5: Expired, malformed or missing tokens return 401 with the error envelope.
- T013-AC6: `@CurrentUser()` exposes `{ id, role }` to handlers.

**Result (as built)**
- New files in `api/src/auth/`: `jwt-auth.guard.ts`, `roles.guard.ts`, `decorators.ts` (`@Public()`, `@Roles(...)`, `@CurrentUser()`), `auth-user.ts`. Both guards are registered as global `APP_GUARD`s in `AuthModule`, authentication first, roles second. `AuthService.me()` and `GET /auth/me` were added; the `TODO(T013)` markers in the auth and health controllers are gone.
- **`@Public()`** is on exactly: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` and `GET /health`. Everything else, including every future route, is protected by default. Logout and refresh are public because they must work when the access token has expired; they are authenticated by the refresh cookie instead.
- The guard accepts only `Authorization: Bearer <token>` (exactly two parts), verifies it with the algorithm **pinned to HS256**, and requires a string `sub` and one of the two known roles. Any failure gives `401 {"code":"UNAUTHORIZED","message":"Authentication required","data":null}`; the reason is never revealed. A wrong role gives `403 {"code":"FORBIDDEN","message":"You do not have permission to do this"}`; a role route without a token is 401, not 403.
- **What the token does and does not prove:** the guard trusts the signed token without a database lookup, so a deactivated user or a changed role takes effect for ordinary routes only when the access token expires (at most 15 minutes) or at the next refresh. `GET /auth/me` does read the database and returns 401 for a deactivated or deleted user, which is how the web app will notice (T015/T016). If immediate revocation is needed for sensitive routes later, add a database check to the guard for those routes.
- Verified: 105 tests pass (24 new, using test-only routes added to the module): public routes open; missing, wrong-scheme, malformed, garbage, refresh-token-as-bearer, expired, wrong-secret, `alg: none`, unknown-role and no-subject tokens all 401; valid token exposes `{ id, role }`; `@Roles` allows the right role(s), 403 for the wrong one, any role without `@Roles`; `/auth/me` returns the user, reads the database, 401 when deactivated (and works again after reactivation) or deleted. Lint, typecheck and build pass. Built app via curl: health 200 without a token; `/auth/me` 401 without and with a bad token, 200 with a real one; unknown route 404 with or without a token; Swagger 200; the access token does not appear in the log.
- Not verified: `@Roles()` on a real business route (none exists until later epics; tested with test-only routes); the Swagger "Authorize" button flow; guard behaviour under load.
- Existing limitation unchanged: login, refresh and logout are still not rate limited (T014).

**DB collection definition:** Reads `users`.

**UI flow:** None in this task.

**API flow:** `GET /api/v1/auth/me` with Bearer → `200 { id, username, fullName, role }`.

**Files (intended)**
- New: `api/src/auth/{jwt-auth.guard.ts,roles.guard.ts,public.decorator.ts,roles.decorator.ts,current-user.decorator.ts}`
- Changed: `api/src/app.module.ts` (global guards), `api/src/auth/auth.controller.ts`
- New: `api/test/auth-guard.e2e-spec.ts` (uses a test-only protected route)

**Verification:** e2e matrix of public, authenticated, wrong-role and expired-token calls.

---

### T014 — Login rate limiting  ✅ Done (2026-11-04)

**Definition:** Slow down password guessing.

**Acceptance criteria**
- T014-AC1: More than 20 login requests per IP per minute → 429.
- T014-AC2: 5 failed logins for the same username+IP within 15 minutes → 429 until the window passes; a success resets the counter.
- T014-AC3: The 429 response has the error envelope, a generic message, and a `Retry-After` header.
- T014-AC4: Limits come from config and are relaxed to high values in tests unless a test needs them.
- T014-AC5: Behind a proxy the real client IP is used (`trust proxy` configurable).

**Result (as built)**
- **Deviation:** a small custom limiter instead of `@nestjs/throttler`. The required behaviour (count only failures, reset on success, key by username+IP, `Retry-After`) does not fit a plain request counter. Files: `auth/login-throttle.service.ts`, `auth/login-throttle.guard.ts` (used on `POST /auth/login` only), `config/trust-proxy.ts`; `app.setup.ts` applies `trust proxy`.
- **Two limits, both fixed windows starting at the first hit:** (1) per IP, default 20 login requests per 60 s, counted for every request including wrong passwords and malformed bodies; (2) per username+IP, default 5 attempts per 900 s. Username is compared case-insensitively and trimmed. The IP is part of the key on purpose, so a stranger cannot lock the real user out from another address.
- **Attempts are reserved before the password is checked** (and a success gives them back). This was changed during the task: counting failures after the slow hash finished let a burst of parallel guesses all pass the lock together. Consequence: requests rejected by validation (400) also use up an attempt, but only for that username+IP. Locked usernames get the same 429 whether or not the account exists.
- `429 {"code":"TOO_MANY_ATTEMPTS","message":"Too many attempts. Try again later.","data":null}` with `Retry-After: <seconds left>` (at least 1) and no cookie. Refused attempts do not extend the lock.
- New settings (in `.env.example` and doc 02): `LOGIN_IP_LIMIT`, `LOGIN_IP_WINDOW_SECONDS`, `LOGIN_FAIL_LIMIT`, `LOGIN_FAIL_WINDOW_SECONDS`, `TRUST_PROXY` (`false` by default; `true`, a hop count, or subnets). The older e2e suites that sign in many times set the limits to 100000; the two throttle suites set their own.
- Memory: entries live in two maps and a timer (`unref`'d, once a minute) deletes expired ones, so size follows recent activity. The counters are per process: with several API instances each would allow its own quota, and a restart clears them. A shared store (for example Redis) is an E08 deployment item.
- Verified: 136 tests pass (22 new): service unit tests with a controllable clock (window start/end, Retry-After rounding, independence of IPs and usernames, case/space handling, success reset, refused attempts not extending the lock, sweep); e2e for the failure limit (5 allowed then 429 even with the right password, reset after success, other users unaffected, case-insensitive, unknown and inactive accounts behave the same, a burst of 12 parallel guesses gives exactly 5 × 401 and 7 × 429, malformed bodies count) and for the IP limit (10 mixed requests then 429, still refused with valid credentials, forged `X-Forwarded-For` does not help, other endpoints unaffected); trust-proxy parser. Lint, typecheck and build pass. Built app via curl: five 401s then 429 (also with the right password and with a forged header), `Retry-After: 900`; with `TRUST_PROXY=true`, a second client address signs in while the first is locked.
- Not verified: behaviour behind a real reverse proxy (only simulated with the header); several instances; the default 20-per-minute IP limit being comfortable for a whole office behind one NAT address — if staff share an address and hit it, raise `LOGIN_IP_LIMIT`.

**DB collection definition:** None for now (in-memory store, single instance). Moving the counter to a shared store is an E08 deployment item.

**UI flow:** None in this task (the web shows the message in T015).

**API flow:** `POST /auth/login` → `429 { code:"TOO_MANY_ATTEMPTS", message:"Too many attempts. Try again later." }`.

**Files (intended)**
- New: `api/src/auth/login-throttle.guard.ts` (or throttler config in `app.module.ts`)
- Changed: `api/src/auth/auth.controller.ts`, `api/.env.example`
- New: `api/test/auth-throttle.e2e-spec.ts`

**Verification:** e2e; manual burst of wrong logins.

---

## US07 — Web sign-in integration and route protection

### T015 — API client, auth provider and login wiring  ✅ Done (2026-11-04)

**Definition:** Connect the login form to the API and manage the session in the browser.

**Acceptance criteria**
- T015-AC1: A small fetch client sends `Authorization` from an in-memory token, includes cookies, and on 401 tries one refresh then retries once.
- T015-AC2: `AuthProvider` bootstraps on load by calling refresh then `/auth/me`; it exposes `user`, `status` (`loading` | `authenticated` | `anonymous`), `login`, `logout`.
- T015-AC3: The login form calls `login`; on 401 it shows "Invalid username or password" in the reserved error area; on 429 the throttle message; on network failure a generic message. Fields keep their values except the password, which is cleared on failure.
- T015-AC4: The loading state and the double-submit guard stay as built in T003; the password is never logged.
- T015-AC5: After success the user lands on `/dashboard`.
- T015-AC6: Parallel 401s share one refresh call, and refreshes from several open tabs of the same browser are serialised (for example with a Web Lock), because the API treats a second use of the same refresh token as theft (see T012 result).
- T015-AC7: Unit tests cover the client's refresh-and-retry and the provider's states.

**Result (as built)**
- **Files:** `web/src/lib/api/client.ts` (+test), `lib/auth/{auth.types.ts, session-store.ts (+test), auth-provider.tsx, use-auth.ts}`; changed `app/layout.tsx` (provider around everything) and `features/auth/login-form.tsx` (stub and `TODO(E02)` removed).
- **Split for testing:** the session logic is a plain TypeScript store (`createSessionStore`); `AuthProvider` is a thin wrapper that reads it with `useSyncExternalStore` and starts `bootstrap()` once. No new packages: Vitest runs in Node here, so the provider's states are tested through the store.
- **Client:** base `/api/v1`, `credentials: "include"`, `Authorization: Bearer` from memory only (never stored in the browser). A 401 triggers one refresh, then one retry; a second 401 is returned. Login, refresh and logout use `skipRefresh`. Parallel requests share one refresh, and a request that gets a 401 after another one already renewed the token just retries. Refreshes run inside a Web Lock (`krg-refresh`), so tabs of the same browser refresh one after another and read the rotated cookie. Where Web Locks are missing, it simply runs.
- **Session states:** `loading` → `authenticated` / `anonymous`. Bootstrap = refresh, then `/auth/me`. A refused refresh, an offline API or a failed `/me` all end `anonymous` on that page load. If the session is lost later, the state flips to `anonymous`.
- **Login messages:** 401 → "Invalid username or password"; 429 → the API's message ("Too many attempts. Try again later."); other errors → "Something went wrong. Please try again."; no answer → "Could not reach the server. Check your connection and try again." On failure the password is cleared and focus returns to it; on success `router.replace("/dashboard")` and the button stays in "Signing in…" until the page changes. Double-submit guard kept; the password is never logged.
- **Verified:** 43 web tests pass (22 new: client and store), lint and typecheck pass. Live (built API in mock mode + `next dev`): wrong password shows the message with an empty, focused password field; correct password lands on `/dashboard`; a reload makes `refresh` 200 then `/auth/me` 200 (the cookie is HttpOnly, `document.cookie` is empty); six wrong attempts show five "Invalid…" then the throttle message.
- **Not verified / known:** the network-failure and 500 messages only in unit tests; the cross-tab Web Lock only by a unit test with a fake lock, not with two real tabs; the `(app)` pages are still reachable without signing in and `/login` shows while signed in (T016); the header still shows the demo user and has no logout (T017). `preview_start` could not start `next dev` (config compile failed in that launcher), so it was run from the shell.

**DB collection definition:** None (uses T009 collections through the API).

**UI flow**
1. User enters credentials → "Signing in…".
2. Success → `/dashboard`. Failure → red message above the fields, focus returns to the password field.

**API flow:** `POST /api/v1/auth/login` (via the `/api/*` rewrite, same origin so the cookie is first-party); `POST /auth/refresh`; `GET /auth/me`.

**Files (intended)**
- New: `web/src/lib/api/client.ts`, `client.test.ts`
- New: `web/src/lib/auth/{auth-provider.tsx,use-auth.ts,auth.types.ts}`
- Changed: `web/src/features/auth/login-form.tsx` (remove stub), `web/src/app/layout.tsx` (provider)
- Changed: `web/.env.example` (if new variables)

**Verification:** run API (mock) and web together; wrong password, right password, reload, throttling after 5 failures.

---

### T016 — Route protection and redirects  ✅ Done (2026-11-04)

**Definition:** Keep signed-out users out of `(app)` and signed-in users out of `/login`.

**Acceptance criteria**
- T016-AC1: `proxy.ts` redirects requests to `(app)` paths to `/login` when no refresh cookie is present; `/login?next=<path>` preserves a safe, same-origin destination.
- T016-AC2: A signed-in user visiting `/` or `/login` is redirected to `/dashboard`.
- T016-AC3: The `(app)` layout shows a spinner while `status` is `loading` and redirects to `/login` if the session turns out invalid (stale cookie).
- T016-AC4: Open-redirect safe: `next` must start with a single `/` and match a known route prefix.
- T016-AC5: After logout the back button does not reveal private pages (no cached private HTML).

**Result (as built)**
- **Deviation — session hint cookie:** the real refresh cookie is HttpOnly and its path is `/api/v1/auth`, so the browser never sends it with page requests and `proxy.ts` cannot see it. The web sets a plain cookie `krg_session=1` (path `/`, 7 days, `SameSite=Lax`, `Secure` on https) whenever the session is verified as signed in, and clears it when it is not (`lib/auth/session-hint.ts`, synced in `AuthProvider`). It holds no secret and grants nothing; the API checks every token. A forged or stale hint only decides which page is shown first.
- **`proxy.ts`:** no hint → private paths (`/dashboard`, `/invoice`, `/product`, `/customer`, `/report` and below) redirect to `/login?next=<path+query>`; `/` redirects to `/login`. With the hint → `/` and `/login` redirect to `/dashboard`, and private pages get `Cache-Control: no-store`. The matcher lists only these routes.
- **`AuthGate`** (`components/layout/auth-gate.tsx`, wraps the `(app)` layout): shows a spinner until the session is verified, redirects to `/login?next=…` when it is anonymous (stale hint), and reloads a page restored from the back/forward cache. `TODO(E02)` removed from the layout.
- **`safeNext`** (`lib/auth/safe-next.ts`): accepts only a path starting with a single `/`, no backslashes or control characters, parsed as same-origin, matching a menu area (`/invoice`, `/invoice/…`, not `/invoices`); otherwise `/dashboard`. The login page (a server component) reads `next`, checks it, and passes it to `LoginForm`, which uses it after signing in.
- **Found during the live run and fixed:** if the sign-in button was pressed before the page finished loading, the browser submitted the form natively as a GET and put the username and password in the address bar. The button is now disabled until the form is interactive.
- **Verified:** 49 web tests pass (6 new for `safeNext`), lint and typecheck pass. curl against `next dev`: no hint → `/` and `/dashboard` and `/invoice` redirect to login (with `next`); with the hint → `/login` and `/` go to `/dashboard`, `/invoice` is 200 with `no-store`. Browser: `/invoice?x=1` signed out → `/login?next=%2Finvoice%3Fx%3D1` → after sign-in back at `/invoice?x=1`; after restarting the API (refresh cookie now invalid) `/report` showed the spinner, went to `/login?next=%2Freport`, cleared the hint, no loop; `?next=https://evil.example` ended on `/dashboard`.
- **Not verified:** the back button after logout (there is no logout button until T017; only `no-store` and the cache-restore reload are in place); behaviour with JavaScript disabled; the hint expiring on its own after 7 days.

**DB collection definition:** None.

**UI flow:** Signed-out user opens `/invoice` → `/login?next=/invoice` → signs in → `/invoice`.

**API flow:** `GET /auth/me` through the provider only.

**Files (intended)**
- New: `web/src/proxy.ts`
- Changed: `web/src/app/(app)/layout.tsx` (remove `TODO(E02)`), `web/src/app/page.tsx`, `web/src/features/auth/login-form.tsx` (`next`)
- New: `web/src/lib/auth/safe-next.ts`, `safe-next.test.ts`

**Verification:** browser walk-through with and without cookie, forged `next=https://evil.example`, back button after logout.

---

### T017 — Logout, real user and role-filtered menu  ✅ Done (2026-11-04)

**Definition:** Replace the E01 stubs with the real session.

**Acceptance criteria**
- T017-AC1: Logout in the header and the mobile panel calls `POST /auth/logout`, clears in-memory state and goes to `/login`, even if the API call fails.
- T017-AC2: Header and mobile panel show the real full name, initial and role from the session; `current-user.stub.ts` is deleted.
- T017-AC3: Nav items with `roles` are shown only to those roles; items without `roles` show to everyone.
- T017-AC4: A role-gated page visited by the wrong role shows a 403 message (not a blank page).
- T017-AC5: Existing tests still pass; new tests cover role filtering.

**Result (as built)**
- **Files:** new `lib/auth/user-display.ts` (initial and role label, moved from the stub), `components/layout/nav/filter-nav.ts` (+test); changed `use-logout.ts`, `user-area.tsx`, `nav/{main-nav,mobile-nav,nav.config}.tsx`, `auth-gate.tsx`, `session-store.ts`, `auth.types.ts`; deleted `current-user.stub.ts`. No `TODO(E02)` is left in `web/src`.
- **Logout:** `useLogout()` returns `{ logout, pending }`. It calls `POST /auth/logout`, clears the in-memory token and user even if the call fails, and sets `reason: "logout"` on the state. `AuthGate` then sends the browser to a plain `/login` (a lost session still goes to `/login?next=…`). The buttons (wide header, icon button, mobile panel) show "Signing out…" and are disabled while pending. The `krg_session` hint is cleared by the provider.
- **Real user:** header and mobile panel show `fullName`, its initial and the role label from the session.
- **Roles:** `nav.config` `roles` now uses the shared `Role` type. `filterNav` hides gated items (no `roles` = everyone; a missing role sees only open items); `canAccess` is checked in `AuthGate`, so a gated page opened by the wrong role shows "403 — Not allowed" with a link to the dashboard instead of a blank page. No menu item is role-gated yet, so nothing changes for today's users; the first gated item will come with a later epic.
- **Verified:** 54 web tests pass (5 new for role filtering and access), lint and typecheck pass. Live (API mock + `next dev`, with Reports temporarily limited to `ADMIN` and then restored): as the SUPER_ADMIN seed user the menu hid Reports and `/report` showed the 403 page; after restoring, all five items showed and the header title read "Administrator (SUPER ADMIN)"; Logout went to `/login` with the hint cleared; Back then returned to a private URL, which redirected to `/login?next=…` without showing private content.
- **Not verified:** the exact "Signing out…" frame (too short to catch in the browser), the mobile panel logout in a narrow window, and the ADMIN role end to end (only `SUPER_ADMIN` exists in the seed).

**DB collection definition:** None.

**UI flow:** Click Logout → "Signing out…" → `/login`; reopening a private URL redirects to `/login`.

**API flow:** `POST /api/v1/auth/logout` → `204`.

**Files (intended)**
- Changed: `web/src/components/layout/{user-area.tsx,header.tsx}`, `nav/{main-nav.tsx,mobile-nav.tsx,nav.config.ts}`
- Changed: `web/src/lib/auth/use-logout.ts`
- Removed: `web/src/lib/auth/current-user.stub.ts`
- New: `web/src/components/layout/nav/filter-nav.ts`, `filter-nav.test.ts`

**Verification:** log in as admin, log out, check back button; add a temporary role-gated item to confirm filtering.

---

# Epic E03 — Customers

*Planned 2026-11-05, not started. File lists are intended files and may be refined when each task starts. Collection rules follow [03-database-design.md](03-database-design.md) §3.3 with the changes in [04-epics.md](04-epics.md) (E03 decisions). Money and invoices are not involved. All endpoints are under `/api/v1`, need a signed-in user (T013 guard) and use the standard `{code,message,data}` envelope.*

## US08 — Customer data and rules

### T022 — `customers` schema, migration and GSTIN/phone helpers  ✅ Done (2026-11-05)

**Definition:** The collection, its indexes, and the pure helpers that decide whether a GSTIN or phone is valid.

**Acceptance criteria**
- T022-AC1: Mongoose `Customer` schema with: `name`, `nameLower`, `email`, `phone`, `phoneAlt?`, `address { line, city, pincode }`, `gstin`, `stateCode`, `logo? { fileId, mime, size }`, `isDeleted` (default false), `deletedAt?`, `legacyId?`, timestamps, `createdBy`, `updatedBy`. `nameLower` is kept in step by the schema.
- T022-AC2: Migration `…-create-customers.mjs` creates: partial unique `{gstin:1}` where `isDeleted:false`; `{nameLower:1}`; `{createdAt:-1}`; `{isDeleted:1}`; with a working `down`.
- T022-AC3: `gstin.ts`: `isValidGstin(value)` checks the 15-character pattern, a real state code (table of codes in code) and the check character (mod-36 algorithm); `stateCodeOf(gstin)`; input is trimmed and upper-cased first.
- T022-AC4: `phone.ts`: `normalizePhone(value)` accepts 10-digit Indian mobiles starting 6–9, with optional `+91`, `91` or `0` prefix and spaces/dashes, and returns the 10 digits or `null`.
- T022-AC5: Unit tests: valid and invalid GSTINs (wrong length, bad state code, wrong check character, lower-case input), all state codes present, phone variants, schema `toJSON` shape (`id`, no `__v`, no `nameLower`).

**DB collection definition — `customers`**

| Field | Type | Rules |
|---|---|---|
| name | string | required, 2–100, trimmed |
| nameLower | string | derived, indexed |
| email | string | required, lower-cased |
| phone | string | required, 10 digits |
| phoneAlt | string | optional, 10 digits |
| address | `{line, city, pincode}` | line ≤ 200, city ≤ 60, pincode 6 digits |
| gstin | string | required, 15 chars, partial unique among non-deleted |
| stateCode | string | derived from `gstin` (first two digits) |
| logo | `{fileId, mime, size}` | optional (T027) |
| isDeleted / deletedAt | bool / Date | soft delete |
| legacyId | string | old `CustomerCode`, for E08 |
| createdBy / updatedBy | ObjectId | user ids |

**UI flow:** None.

**API flow:** None (data layer only).

**Files (intended)**
- New: `api/src/customers/{customer.schema.ts, gstin.ts, gstin.spec.ts, phone.ts, phone.spec.ts, state-codes.ts, customers.module.ts}`
- New: `api/migrations/<timestamp>-create-customers.mjs`
- Changed: `api/src/app.module.ts`

**Verification:** run migrations on the mock database and check the indexes; unit tests.

**Result (as built)**
- **Files:** `api/src/customers/{customer.schema.ts, customers.module.ts, gstin.ts, phone.ts, state-codes.ts}` with `gstin.spec.ts`, `phone.spec.ts` and `customers.e2e.spec.ts`; `api/migrations/20261105100000-create-customers.mjs`; `CustomersModule` added to `app.module.ts`. No new packages.
- **Schema:** as the table above, with `address` and `logo` as sub-documents without their own ids. `toJSON` returns `id` and hides `_id` and `nameLower` (no `__v`). A `validate` hook keeps `nameLower` (from `name`) and `stateCode` (from `gstin`) in step on create and on later saves; `gstin` is trimmed and upper-cased, `email` trimmed and lower-cased by the schema. The service (T023) still normalises phones before saving; the schema only checks the 10-digit shape.
- **Indexes (migration):** `gstin_unique_active` (unique, partial: `isDeleted:false` and `gstin` is a string), `nameLower_id` (`{nameLower:1,_id:1}`), `createdAt_id_desc` (`{createdAt:-1,_id:-1}`), `isDeleted`. The two sort indexes include `_id` because the list (T024) breaks ties on it. `down` drops the collection.
- **GSTIN:** pattern, real state code, and the GST check character (mod-36 weighted sum). Confirmed against a real-world number (`27AAPFU0939F1ZV`) and by building numbers for several states; a mistyped character and a swap of neighbours are both caught. 38 state and territory codes; the retired codes 25 and 28 are rejected (decision to revisit if an old customer still carries one: the E08 migration skips the check).
- **Phone:** 10-digit Indian mobile starting 6–9, optional `+91`/`91`/`0` prefix, spaces and dashes ignored; a number that merely starts with 91 is kept as it is.
- **Verified:** 158 API tests pass in 18 suites (22 new: 8 GSTIN, 5 phone, 7 collection checks, plus 2 state-code checks); lint, typecheck and build pass. The collection tests run against the in-memory database with the real migrations and show: the indexes exist with the partial filter; derived fields; normalisation; invalid values rejected; a second active customer with the same GSTIN gets a duplicate-key error (`11000`); after a soft delete the GSTIN can be reused, and two deleted customers may share one; the migration runs twice without error, rolls back and re-applies. Built app on a persistent mock database: the migration applied once on first start and "No pending migrations" on the second.
- **Not verified:** the migration against a real external MongoDB; the legacy rule for pincode and phone on imported data (E08).

---

### T023 — Create customer endpoint  ✅ Done (2026-11-05)

**Definition:** `POST /customers` with full validation and clear errors.

**Acceptance criteria**
- T023-AC1: Body DTO (class-validator): `name`, `email`, `phone`, `phoneAlt?`, `address.{line,city,pincode}`, `gstin`. Unknown fields are rejected (existing pipe). Text is trimmed; email lower-cased; phones normalised; GSTIN upper-cased.
- T023-AC2: Errors use the existing `VALIDATION_FAILED` envelope with one entry per field (`data.errors`), including a clear message for an invalid GSTIN ("Invalid GSTIN: check the number") and phone.
- T023-AC3: `stateCode` is set from the GSTIN; the client cannot send it.
- T023-AC4: A GSTIN already used by a non-deleted customer returns `409` with code `GSTIN_EXISTS`; the race of two simultaneous creates is settled by the unique index (the duplicate-key error is mapped to the same `409`).
- T023-AC5: Returns `201` with the customer (`id`, fields, `createdAt`). `createdBy` is the signed-in user. Not reachable without sign-in.
- T023-AC6: e2e tests: success, each invalid field, duplicate GSTIN, duplicate after a soft-deleted one (allowed), parallel duplicates (one `201`, one `409`), unauthenticated `401`.

**DB collection definition:** `customers` (T022).

**UI flow:** None yet (T029).

**API flow:** `POST /api/v1/customers` → `201 {code,message,data: customer}`.

**Files (intended)**
- New: `api/src/customers/{customers.controller.ts, customers.service.ts, dto/create-customer.dto.ts, customers.e2e.spec.ts}`
- Changed: `api/src/common/http-exception.filter.ts` (map `GSTIN_EXISTS` code if needed)

**Verification:** run the API (mock) and POST valid and invalid bodies with curl.

**Result (as built)**
- **Files:** `api/src/customers/{customers.controller.ts, customers.service.ts, validators.ts, dto/create-customer.dto.ts, customers-create.e2e.spec.ts}`; changed `customers.module.ts` and `common/http-exception.filter.ts`. No new packages.
- **Endpoint:** `POST /api/v1/customers` → `201 {code:"OK", message, data: <customer>}` (the customer itself in `data`, as the auth endpoints do, not wrapped in `{customer}`). Any signed-in user, ADMIN or SUPER_ADMIN, may call it; `createdBy` and `updatedBy` are the caller.
- **Rules (shared with the web form later):** name 2–100 characters, letters, digits and `. , & ' ( ) / + -`, starting with a letter or digit; email valid, trimmed, lower-cased; phone and optional alternate phone via `normalizePhone` (an empty alternate phone counts as not given); address line 1–200, city 2–60 letters, pincode 6 digits not starting with 0; GSTIN trimmed, upper-cased and fully checked. `stateCode`, `isDeleted`, `createdBy`, `id` and any other unknown field are rejected with 400.
- **Error format:** validation failures are `400 VALIDATION_FAILED` with `data.errors` as a list of messages, each starting with the field path (`gstin must be a valid GSTIN: check the number`, `address.pincode must be 6 digits and not start with 0`), all fields reported at once. The web form (T029) maps them by that prefix.
- **Duplicate GSTIN:** `409 GSTIN_EXISTS` with `data.errors: ["gstin is already used by another customer"]`. A quick check gives the early answer; the unique index (and mapping of its duplicate-key error to the same 409) settles parallel requests: of six simultaneous creates exactly one succeeded. A soft-deleted customer's GSTIN is free again. The filter now passes an `errors` list from named errors through, so the field message reaches the client.
- **Found by the tests and fixed:** a body without `address` caused a 500 (nested validation skips a missing object); `address` is now required with a clear message.
- **Verified:** 191 API tests pass in 19 suites (33 new in `customers-create.e2e.spec.ts`: success, ADMIN access, normalisation, names the old system rejected, empty alternate phone, 19 invalid-field cases each naming the field, all fields at once, forbidden fields, non-object bodies, duplicates incl. lower-case input, reuse after soft delete, parallel race, 401 without or with a bad token); lint, typecheck and build pass. Built app with curl: 201 with normalised data, 409 for the duplicate, 400 with all messages, 401 without a token.
- **Not verified:** very large bodies (the default body-size limit applies); behaviour with names in non-Latin scripts beyond the pattern (letters of any script are accepted by design).

---

## US09 — Customer list, details, edit and delete API

### T024 — List, search, sort and paginate  ✅ Done

**Definition:** `GET /customers` for the list page.

**Acceptance criteria**
- T024-AC1: Query: `page` (default 1), `pageSize` (10, 25 or 50; default 10), `q` (search), `sort` (`name`, `createdAt`; default `-createdAt`; `-` prefix = descending). Invalid values give `400`.
- T024-AC2: `q` is matched case-insensitively against name, email, phone and GSTIN as plain text (regex characters escaped), max 100 characters.
- T024-AC3: Response `{ items[], page, pageSize, total, totalPages }`; items carry the list fields only (`hasLogo` flag instead of logo data). Deleted customers are never returned.
- T024-AC4: Stable ordering (tie-break on `_id`) so pages do not repeat or skip rows.
- T024-AC5: e2e tests with seeded customers: paging, last page, search by each field, search with regex characters, sort both ways, deleted hidden, bad query `400`.

**DB collection definition:** `customers`.

**UI flow:** None yet (T028).

**API flow:** `GET /api/v1/customers?page=1&pageSize=10&q=…&sort=name`.

**Files (intended)**
- New: `api/src/customers/dto/list-customers.query.ts`
- Changed: `api/src/customers/{customers.controller.ts, customers.service.ts, customers.e2e.spec.ts}`

**Verification:** seed 30 customers on the mock database, page and search with curl.

**Result (as built)**
- **Files:** new `api/src/customers/dto/list-customers.query.ts`, `customers-list.e2e.spec.ts`; changed `customers.controller.ts` (`@Get()`) and `customers.service.ts` (`list()`). No new packages.
- **Endpoint:** `GET /api/v1/customers?page&pageSize&q&sort` → `200 {code:"OK", data:{ items, page, pageSize, total, totalPages }}`. Any signed-in user. `page` 1–100000 (default 1), `pageSize` 10/25/50 (default 10), `sort` one of `name`, `-name`, `createdAt`, `-createdAt` (default `-createdAt`), `q` max 100 characters. Anything else, including unknown or repeated parameters, is `400 VALIDATION_FAILED` with the messages in `data.errors`.
- **Search:** `q` is trimmed (blank = no search) and matched as literal text, case-insensitively, anywhere in name, email, phone, alternate phone and GSTIN. A phone typed as `+91 98765-43210` or `098765 43210` is also found through `normalizePhone`.
- **Order:** name sorts on `nameLower` (case-insensitive); `_id` breaks ties in the same direction, using the indexes from T022.
- **Items:** `id, name, email, phone, phoneAlt?, address, gstin, stateCode, hasLogo, createdAt, updatedAt`; no logo data. A page past the end returns `items: []` with the real `total`; `totalPages` is 0 when nothing matches.
- **Found by the tests and fixed:** a pasted phone with the +91 prefix found nobody (digits-only matching kept the country code); replaced with `normalizePhone`.
- **Verified:** 227 API tests pass in 20 suites (36 new: auth, empty, defaults, fields, last/beyond page, page sizes, full walk, sorts, tie stability, search by each field, regex characters, trimming, deleted hidden, 14 bad queries); lint, typecheck, build pass. Built app with curl: list, phone search with +91, regex text gives 0, bad query 400, no token 401.
- **Not verified:** speed on large collections (substring search cannot use an index; fine for the expected few thousand customers, revisit with text search if it grows); the 30-customer curl seeding was replaced by the automated tests with 23–30 rows.

---

### T025 — Get, edit and soft-delete  ✅ Done

**Definition:** Read one customer, change it, remove it.

**Acceptance criteria**
- T025-AC1: `GET /customers/:id` returns the customer or `404`; an invalid id format gives `404` (not `500`); a deleted customer gives `404`.
- T025-AC2: `PATCH /customers/:id` accepts any subset of the create fields with the same rules; changing `gstin` re-derives `stateCode` and re-checks uniqueness (`409` `GSTIN_EXISTS`, excluding itself); an empty body gives `400`; `updatedBy` is set.
- T025-AC3: `DELETE /customers/:id` sets `isDeleted`, `deletedAt`; returns `204`; deleting twice gives `404`; the GSTIN can be used by a new customer afterwards.
- T025-AC4: Edits and deletes of a deleted customer give `404`.
- T025-AC5: e2e tests for all of the above, including `PATCH` with the customer's own unchanged GSTIN (allowed).

**DB collection definition:** `customers`.

**UI flow:** None yet (T029, T030).

**API flow:** `GET|PATCH|DELETE /api/v1/customers/:id`.

**Files (intended)**
- New: `api/src/customers/dto/update-customer.dto.ts`, `api/src/common/parse-object-id.pipe.ts`
- Changed: `api/src/customers/{customers.controller.ts, customers.service.ts, customers.e2e.spec.ts}`

**Verification:** curl flow: create, get, patch, delete, get again.

**Result (as built)**
- **Files:** new `api/src/common/parse-object-id.pipe.ts`, `api/src/customers/dto/update-customer.dto.ts`, `api/src/customers/customers-item.e2e.spec.ts`; changed `customers.controller.ts` (`GET|PATCH|DELETE :id`) and `customers.service.ts` (`get`, `update`, `remove`). No new packages.
- **GET `/customers/:id`:** `200` with the customer (same shape as create; `nameLower` hidden). A malformed id, an unknown id and a deleted customer all give `404 NOT_FOUND` (the id pipe runs before the body is validated).
- **PATCH `/customers/:id`:** any subset of the create fields with the same rules and normalising (`UpdateCustomerDto` is the create DTO made optional). `address`, if sent, replaces the whole address (all three parts required). `phoneAlt` may be `null` or `""` to remove it. A changed `gstin` re-derives `stateCode` and is checked against other non-deleted customers (excluding itself) → `409 GSTIN_EXISTS`; sending the customer's own GSTIN is allowed. Empty body → `400`; forbidden fields (`stateCode`, `isDeleted`, `createdBy`, `id`, `logo`, …) → `400`. `updatedBy` is the caller.
- **DELETE `/customers/:id`:** soft delete (`isDeleted`, `deletedAt`, `updatedBy`) → `204` with no body. The update is conditional on `isDeleted:false`, so of five parallel deletes exactly one gets `204` and four get `404`. The GSTIN can be used again immediately.
- **Verified:** 258 API tests pass in 21 suites (31 new in `customers-item.e2e.spec.ts`); lint, typecheck, build pass. Built app with curl: create, get, patch (name and GSTIN), empty patch 400, delete 204, get after delete 404, bad id 404.
- **Not verified / deferred:** audit rows for edit and delete are added in T026; two simultaneous edits of one customer are last-write-wins (no version check).

---

## US10 — Logo files and audit trail

### T026 — Audit log service  ✅ Done

**Definition:** An append-only record of who changed what, reusable by every module.

**Acceptance criteria**
- T026-AC1: `auditLogs` schema and migration (indexes `{entity:1, entityId:1, createdAt:-1}`, `{actorId:1, createdAt:-1}`, `{createdAt:-1}`); no update or delete method exists in the service.
- T026-AC2: `AuditService.record({ entity, entityId, action, before, after, actorId, requestId })` computes `changedFields`, and strips secrets and file bytes (a deny-list: `passwordHash`, `tokenHash`, binary fields).
- T026-AC3: Customer create, edit and delete each write one audit row: `CREATE` (no `before`), `UPDATE` (both, only when something changed), `DELETE` (before only). The write is in the same transaction as the change, so a failed change leaves no audit row and a saved change always has one.
- T026-AC4: A request id (from a header or generated) is attached to every audit row and logged.
- T026-AC5: Tests: changed-fields computation, redaction, no row for a no-op edit, rollback consistency, e2e for the three actions.

**DB collection definition — `auditLogs`:** `entity`, `entityId`, `action` (`CREATE|UPDATE|DELETE|CANCEL`), `before`, `after`, `changedFields[]`, `actorId`, `requestId`, `createdAt` (append-only; see doc 03 §3.10).

**UI flow:** None (a viewer screen is not in scope).

**API flow:** None public.

**Files (intended)**
- New: `api/src/audit/{audit-log.schema.ts, audit.service.ts, audit.module.ts, diff.ts, diff.spec.ts}`, `api/migrations/<timestamp>-create-audit-logs.mjs`, `api/src/common/request-id.middleware.ts`
- Changed: `api/src/customers/customers.service.ts`, `api/src/app.module.ts`

**Verification:** create, edit and delete a customer and read the rows from the mock database.

**Result (as built)**
- **Files:** new `api/src/audit/{audit-log.schema.ts, audit.service.ts, audit.module.ts, diff.ts, diff.spec.ts, audit.e2e.spec.ts}`, `api/src/common/request-id.middleware.ts`, `api/migrations/20261105110000-create-audit-logs.mjs`; changed `customers.service.ts`, `customers.controller.ts`, `customers.module.ts`, `app.module.ts`, `app.setup.ts`. No new packages.
- **Collection `auditLogs`:** `entity`, `entityId` (string), `action` (`CREATE|UPDATE|DELETE|CANCEL`), `before`, `after`, `changedFields[]`, `actorId`, `requestId`, `createdAt` (no `updatedAt`). Indexes `entity_entityId_createdAt`, `actorId_createdAt`, `createdAt_desc`. `AuditService` has one method, `record()`; there is no update or delete (a test checks this).
- **What is stored:** snapshots are plain copies: ids and dates as strings; `passwordHash`, `tokenHash`, `__v` and any binary value are removed at any depth. `changedFields` are dotted paths (`address.city`), sorted; `updatedAt`, `updatedBy`, `createdAt`, `createdBy` and the derived `nameLower` never count as changes. A CREATE lists every field; a DELETE stores `before` only and an empty `changedFields`.
- **Same transaction:** customer create, edit and delete each run in a Mongoose transaction together with their audit row (`record(entry, session)`). Tests make the audit write fail and confirm the customer is not created, changed or deleted; five parallel creates with one GSTIN leave one customer and one row; five parallel deletes leave one DELETE row.
- **No-op edit:** a PATCH that sends only values the customer already has returns `200` with the customer unchanged, writes no audit row and does not touch `updatedAt`.
- **Request id:** every response carries `X-Request-Id`; a caller's value is used only if it is 8–64 characters of letters, digits, `.`, `_`, `-`, otherwise a UUID is made. The id is the pino request id (so it appears in the request log, checked live), is read in controllers with `@RequestId()`, and is stored on each audit row.
- **Verified:** 286 API tests pass in 23 suites (28 new: 11 diff/redaction, 17 e2e); lint, typecheck, build pass. Built app with curl: `X-Request-Id: live-check-0001` echoed in the response and found once in the log.
- **Not verified / deferred:** there is no endpoint or screen to read the trail (out of scope; rows were checked through the database in tests); the user module's own changes (password reset, deactivate) are not audited yet; an external real MongoDB is still untested.

---

### T027 — File storage and logo endpoints  ✅ Done

**Definition:** Safe upload, replace, download and removal of a customer logo.

**Acceptance criteria**
- T027-AC1: New settings `UPLOAD_DIR` (default `.data/uploads`, git-ignored) and `MAX_UPLOAD_MB` (default 5), documented in `.env.example` and doc 02.
- T027-AC2: `StorageService` saves a file to `<UPLOAD_DIR>/<entity>/<2-char prefix>/<sha256>.<ext>` (a path built by the server, never from the uploaded file name), reads it back as a stream, and deletes it; path traversal is impossible.
- T027-AC3: The type is decided by the file's first bytes (JPEG, PNG, WebP), not by the extension or the `Content-Type` header; anything else gives `415`; bigger than the limit gives `413`; an empty file gives `400`.
- T027-AC4: `fileAssets` collection (`storageKey`, `mime`, `size`, `sha256`, `status` `PENDING|ATTACHED|ORPHANED`, `createdBy`) with migration; an upload that is saved but not attached is `PENDING`.
- T027-AC5: `PUT /customers/:id/logo` (multipart, field `file`) stores the file, attaches it, marks any previous logo `ORPHANED`, and audits the change; `GET /customers/:id/logo` streams the file with the stored mime type, `Cache-Control: private` and `X-Content-Type-Options: nosniff`, `404` when none; `DELETE /customers/:id/logo` detaches (`204`).
- T027-AC6: Files are not served by any static route; the API refuses requests without sign-in.
- T027-AC7: Tests: valid JPEG/PNG/WebP, a `.png` that is really text (415), oversize (413), replace flow, download headers, traversal attempts in names, unauthenticated `401`.

**DB collection definition — `fileAssets`:** doc 03 §3.9.

**UI flow:** None yet (T029).

**API flow:** `PUT|GET|DELETE /api/v1/customers/:id/logo`.

**Files (intended)**
- New: `api/src/files/{file-asset.schema.ts, storage.service.ts, image-sniff.ts, image-sniff.spec.ts, files.module.ts}`, `api/src/customers/customer-logo.controller.ts`, `api/migrations/<timestamp>-create-file-assets.mjs`
- Changed: `api/src/config/env.schema.ts`, `api/.env.example`, `docs/02-tech-stack.md`, `api/package.json` (multipart support: `multer` types), `.gitignore`

**Verification:** upload real and fake images with curl, download and compare bytes, check the file on disk.

**Result (as built)**
- **Files:** new `api/src/files/{file-asset.schema.ts, storage.service.ts, image-sniff.ts, image-sniff.spec.ts, storage.service.spec.ts, files.module.ts}`, `api/src/customers/{customer-logo.controller.ts, customer-logo.service.ts, customer-logo.e2e.spec.ts}`, `api/migrations/20261105120000-create-file-assets.mjs`; changed `config/env.schema.ts`, `.env.example`, `customers.module.ts`, `common/http-exception.filter.ts`, `tsconfig.json` (`multer` types), `package.json` (`@types/multer`, and the test script now runs with `--maxWorkers=4`). `.gitignore` already covered `api/.data/`.
- **Settings:** `UPLOAD_DIR` (default `.data/uploads`) and `MAX_UPLOAD_MB` (default 5; 0.01–50).
- **Storage:** `StorageService` keeps files at `<UPLOAD_DIR>/customers/<first 2 hex of hash>/<sha256>.<jpg|png|webp>`. The key is built from the content hash, never from the uploaded name; every key is matched against a strict pattern and checked to stay inside the upload folder (traversal keys such as `../x`, absolute and Windows paths are refused). Files are written to a temporary name and renamed, and identical content is stored once.
- **Type check:** `sniffImage` reads the first bytes: JPEG, PNG, WebP only (SVG, GIF, PDF, HTML refused). The client's file name and `Content-Type` are ignored. Not an image → `415 UNSUPPORTED_MEDIA_TYPE`; over the limit → `413 PAYLOAD_TOO_LARGE`; empty, missing or wrongly named field → `400`. Nothing is written to disk or the database for a refused upload.
- **`fileAssets`:** `storageKey, mime, size, sha256, status (PENDING|ATTACHED|ORPHANED), createdBy`, timestamps; indexes `status_createdAt` and `storageKey`. An upload is saved to disk and recorded `PENDING`; the transaction that attaches it to the customer marks it `ATTACHED`, marks the previous logo's asset `ORPHANED`, and writes the audit row. If that transaction fails the asset stays `PENDING` and the customer is unchanged (tested).
- **Endpoints:** `PUT /customers/:id/logo` (multipart field `file`) → `200` with the customer; `GET` streams the file with the stored type, `Content-Length`, `Cache-Control: private, no-cache`, `X-Content-Type-Options: nosniff` and an `ETag` (the hash; a matching `If-None-Match` gives `304`); `DELETE` → `204` and detaches. `GET` and `DELETE` with no logo, and any request for an unknown, malformed or deleted customer, give `404`. All need sign-in; nothing serves the upload folder.
- **Replace and remove keep the old file on disk.** Because identical images share one file, a file may only be deleted when no `ATTACHED` asset uses its key; the clean-up job that does this (PENDING/ORPHANED older than a threshold) is left for E08. `StorageService.delete` exists for it.
- **Verified:** 327 API tests pass in 26 suites (41 new: sniffing, storage keys and traversal, JPEG/PNG/WebP upload, fake `.png`, oversize, empty/missing, hostile file names, replace and orphaning, same image twice, rollback leaving PENDING, headers and byte-for-byte download, 304, missing file on disk, no static route, 401s, delete, audit rows, `hasLogo` in the list); lint, typecheck, build pass. Built app with curl: real PNG stored and downloaded byte-identical with the right headers, text file 415, 6 MB 413, no token 401, delete 204 then 404.
- **Test runner change:** with 26 suites each starting its own in-memory MongoDB, the default one-worker-per-core run (20 workers here) made four unrelated suites time out together. The `test` script now uses `--maxWorkers=4` (full run about 20 s).
- **Not verified / deferred:** the clean-up of unused files (E08); very slow or interrupted uploads; a multipart upload through the Next.js `/api` rewrite (T029); image dimensions are not checked and files are served as uploaded (no resizing, as decided).

---

## US11 — Customer screens

### T028 — Customers API client and list page  ✅ Done

**Definition:** `/customer` shows a real, searchable, paginated list.

**Acceptance criteria**
- T028-AC1: `lib/api/customers.ts` typed functions on the existing API client (list, get, create, update, delete, logo URL); types in `features/customers/customer.types.ts`.
- T028-AC2: Page shows a title, an "Add customer" button, a search box (debounced 300 ms, with a clear button) and the list; the search text and page live in the address bar (`?q=&page=`), so reload and Back work.
- T028-AC3: Wide screens: table (name, GSTIN, phone, email, state, added) with row actions View, Edit, Delete. Below 768 px: one card per customer with the same actions. No horizontal page scroll from 360 px.
- T028-AC4: Page-size selector (10/25/50), first/previous/next/last controls, "Showing 11–20 of 53".
- T028-AC5: States: loading (shared spinner, no layout jump), empty ("No customers yet" with the add button; "No customers match …" when searching), error (message with Retry). Stale responses of an older search never overwrite a newer one.
- T028-AC6: Delete from the list asks with the confirm popup (T021), calls the API, shows a toast and refreshes the page (or steps back one page if it was the last row).
- T028-AC7: Unit tests for query-string building/parsing and the pagination range text.

**DB collection definition:** None (uses `customers` via the API).

**UI flow:** Open Customers → list → type in search → results update → change page → click Delete → confirm → toast → list refreshes.

**API flow:** `GET /customers`, `DELETE /customers/:id`.

**Files (intended)**
- New: `web/src/lib/api/customers.ts`, `web/src/features/customers/{customer.types.ts, customer-list.tsx, customer-table.tsx, customer-cards.tsx, list-query.ts, list-query.test.ts, pagination.tsx}`
- Changed: `web/src/app/(app)/customer/page.tsx`

**Verification:** seed 30 customers; search, page, delete; check at 360, 768 and 1440 px; stop the API to see the error state.

**Result (as built)**
- **Files:** new `web/src/lib/api/customers.ts`, `web/src/features/customers/{customer.types.ts, list-query.ts, list-query.test.ts, format.ts, format.test.ts, state-names.ts, customer-list.tsx, customer-table.tsx, customer-cards.tsx, row-actions.tsx, pagination.tsx, search-box.tsx}`; changed `app/(app)/customer/page.tsx` and `lib/auth/auth-provider.tsx` (the auth context now also exposes `client`, the API client that holds the access token, so feature code can make requests). No new packages.
- **API client:** `createCustomersApi(client)` gives `list(search)`, `get`, `create`, `update`, `remove`, `removeLogo`, all typed. `customerLogoPath(id)` returns the logo address, but an `<img src>` cannot send the access token, so T029/T030 will fetch logos through the client instead of using it as an image address.
- **Address bar:** `?q=&page=&pageSize=`, only values that differ from the default (`/customer` alone is page 1, 10 rows, no search). Reading is forgiving: `page=abc`, `pageSize=7`, a 150-character `q` fall back or are cut. Typing in the search box replaces the address entry after 300 ms (one request per pause, checked); page and page-size changes add history entries, so Back and Forward step through them and the search box follows the address. A page past the end (`?page=99`) moves to the last page.
- **Screens:** below 768 px one card per customer; 768 px and up a table (Name, GSTIN, Phone, Email, Actions; State and Added join from 1024 px; action words appear from 1024 px, icons with accessible names before that). Pagination shows "Showing 11–20 of 53", first/previous/next/last, "Page 2 of 6" and a per-page choice (10/25/50). No horizontal page scroll at 360, 768 or 1440 px (measured).
- **States:** first load shows the shared spinner in a fixed-height box; later loads keep the old rows, faded, with a small spinner, so nothing jumps. Empty: "No customers yet." with Add customer, or "No customers match “…”." with Clear search. Error: a message with Retry (network trouble, or server trouble such as the API being down, in plain words). Each answer is stored with the address it was asked for, so a slow older answer never replaces a newer one (tested in the browser by delaying the first of two searches).
- **Delete:** the confirm dialog (T021), then the API call, a toast, and a refresh; deleting the last row of a later page steps back one page (verified: page 2 of 25-per-page emptied row by row, address moved to page 1). A 404 (already deleted) shows an info toast and refreshes; other failures show an error toast and keep the list.
- **Links:** View, Edit and Add customer point at `/customer/:id`, `/customer/:id/edit` and `/customer/new`, which are built in T029 and T030 (until then they show the not-found page).
- **Verified:** 86 web tests pass (20 new: address parsing, building and round trip, API query string, range text, page after delete, formatting); lint, typecheck and production build pass. In the browser against the real API with 30 seeded customers: list, search (one request), clear, paging, page size, Back/Forward, out-of-range page, regex characters in search, empty state, delete with confirm and toast, step-back after delete, error with the API stopped, Retry, stale-answer guard, 360/768/1440 px, and sign-in redirect back to `/customer`.
- **Not verified / deferred:** screen-reader announcements of the loading and range text; keyboard-only use of the table actions beyond tab order; the page as an ADMIN (non-super-admin) user in the browser; in `next dev` each list request is sent twice (React strict mode), which does not happen in the production build.

---

### T029 — Add/edit form with logo  ✅ Done

**Definition:** One form for creating and editing a customer.

**Acceptance criteria**
- T029-AC1: Routes `/customer/new` and `/customer/[id]/edit` share `CustomerForm` (React Hook Form + zod). Fields: name, email, phone, alternate phone, address line, city, pincode, GSTIN, logo.
- T029-AC2: Client rules match the API (name length, email, phone via the shared normaliser, pincode, GSTIN pattern + state code + check character through a copy of the same helper logic, covered by a test that runs both against one list of sample values).
- T029-AC3: Messages appear on blur and while typing after that; the first invalid field is focused on submit; GSTIN is upper-cased as typed; the state (from the first two GSTIN digits) is shown read-only.
- T029-AC4: API `VALIDATION_FAILED` errors and `GSTIN_EXISTS` are placed on the right field; other failures show an error toast; the submit button shows "Saving…" and cannot be double-submitted.
- T029-AC5: Logo picker: JPEG/PNG/WebP up to 5 MB checked before upload, preview, remove; saved with `PUT /customers/:id/logo` after the customer is saved; if only the logo fails, the customer stays saved, the user is told (toast) and can retry from edit.
- T029-AC6: Success → toast and back to the list (create) or the details page (edit). Leaving a changed form asks to confirm (T021).
- T029-AC7: The edit form loads the customer first (spinner) and shows the shared 404 when it is missing.
- T029-AC8: Unit tests: the zod schema against valid/invalid samples, and the API-error-to-field mapper.

**DB collection definition:** None.

**UI flow:** Customers → Add customer → fill → Save → toast → list shows it. Edit → change → Save → details.

**API flow:** `POST /customers`, `PATCH /customers/:id`, `GET /customers/:id`, `PUT /customers/:id/logo`.

**Files (intended)**
- New: `web/src/features/customers/{customer-form.tsx, customer-schema.ts, customer-schema.test.ts, gstin.ts, map-api-errors.ts, map-api-errors.test.ts, logo-picker.tsx}`, `web/src/app/(app)/customer/new/page.tsx`, `web/src/app/(app)/customer/[id]/edit/page.tsx`

**Verification:** create with and without a logo, duplicate GSTIN, invalid values, edit, change logo, cancel with unsaved changes.

**Result (as built)**
- **Files:** new `shared/customer-rules.samples.json` (one list of sample GSTINs, phones, names and cities read by both test suites), `api/src/customers/rules-samples.spec.ts`, and in `web/src/features/customers/`: `customer-form.tsx`, `customer-schema.ts(+test)`, `gstin.ts`, `phone.ts`, `logo-file.ts(+test)`, `logo-picker.tsx`, `map-api-errors.ts(+test)`, `rules-samples.test.ts`, `unsaved-guard.ts(+test)`, `use-unsaved-guard.ts`, `edit-customer.tsx`; pages `app/(app)/customer/new/page.tsx` and `customer/[id]/edit/page.tsx`. Changed: `lib/api/client.ts` (sends `FormData` as is; new `requestBlob` for images, with the same refresh-on-401), `lib/api/customers.ts` (`uploadLogo`, `getLogoBlob`), `api/src/customers/dto/create-customer.dto.ts`. No new packages.
- **One rule, two copies:** the web form repeats the API's rules (name, city, pincode, phone, GSTIN with state and check character). Both test suites read the same sample file, so the copies cannot drift unnoticed. The sample test found a real gap: names such as “श्री गणेश” were rejected because combining marks were not allowed, so both patterns now accept them (`\p{M}`); the API accepts them too.
- **Form:** messages show after leaving a field and then update while typing; on submit the first invalid field is focused; GSTIN is upper-cased as typed; the State box is read-only and filled from the first two GSTIN digits; a phone such as “+91 98765-43210” is saved as 10 digits. The button reads “Saving…” and fields are disabled while saving, so a double submit is not possible.
- **API errors:** `GSTIN_EXISTS` and `VALIDATION_FAILED` messages are placed on their fields and the first is focused (after the fields are enabled again); anything else is an error toast (network and server trouble in plain words).
- **Logo:** JPEG/PNG/WebP up to 5 MB, checked from the file's first bytes before upload; preview, Change, Remove (and Undo remove on edit). The saved logo is fetched through the API client as an image, because the endpoint needs the access token. The logo is uploaded after the customer is saved; if only that fails, a toast says the customer is saved. In create mode the page then moves to the edit page (the chosen file is not kept, so it must be chosen again); in edit mode the form stays and Save retries.
- **Edit:** the page loads the customer first (spinner), shows the shared 404 for an unknown id, and an error panel with Retry for other failures. Only changed fields are sent (`PATCH`); with nothing changed Save says “No changes to save.”. Success goes to the list (create) or `/customer/:id` (edit; that page arrives in T030, so it shows the not-found page until then).
- **Unsaved changes:** while the form is changed, closing or reloading the tab shows the browser's warning, clicking any link in the app asks “Discard changes?” (Keep editing / Discard changes), and Cancel asks the same. The browser's Back button cannot be intercepted by the App Router, so it is not covered.
- **Verified:** 189 web tests (103 new) and 379 API tests pass; lint, typecheck and production build pass. In the browser against the real API: empty submit (seven messages, Name focused), lower-case GSTIN upper-cased with state shown, wrong check character message, create with a logo (POST then PUT, toast, list), edit loads values and the saved logo, change name and remove the logo (PATCH then DELETE logo), unsaved-changes prompt on a link click, duplicate GSTIN placed on the field with focus, unknown id shows 404, no horizontal scroll at 360 px.
- **Not verified / deferred:** a logo upload that fails after the customer is saved (covered by reasoning and code, not forced in the browser); a multipart upload through a production deployment's proxy; screen-reader announcements of field errors; the ADMIN role in the browser. In the browser pane used for testing (hidden), the confirm dialog's backdrop stayed on screen after closing, in the list's Delete flow as well; this was not investigated further because it did not appear in earlier verification with the pane visible, so it is worth a look in a normal browser during T030.

---

### T030 — Customer details page and delete flow  ✅ Done

**Definition:** Read-only page for one customer with the logo, and the delete action.

**Acceptance criteria**
- T030-AC1: `/customer/[id]` shows logo (or a neutral placeholder), name, email, phones, full address, GSTIN, state name and code, added and last-changed dates; layout works from 360 px.
- T030-AC2: The logo is loaded with the signed-in request (not a public URL) and shown with a loading state; a broken or missing logo shows the placeholder.
- T030-AC3: Buttons: Back to customers, Edit, Delete. Delete uses the confirm popup (destructive), then toast and return to the list; a failed delete shows an error toast and stays.
- T030-AC4: An unknown or deleted id shows the shared 404 page.
- T030-AC5: Whole-epic check: lint, typecheck, unit and e2e tests pass; the end-to-end flow (sign in → add with logo → search → view → edit → delete) is verified in the browser against the mock database; docs updated; E03 closed.

**DB collection definition:** None.

**UI flow:** List → View → details → Edit / Delete → list.

**API flow:** `GET /customers/:id`, `GET /customers/:id/logo`, `DELETE /customers/:id`.

**Files (intended)**
- New: `web/src/features/customers/{customer-details.tsx, customer-logo.tsx}`, `web/src/app/(app)/customer/[id]/page.tsx`
- Changed: `web/src/features/customers/customer-table.tsx` (links)

**Verification:** the full walk-through above, at 360 and 1440 px.

**Result (as built)**
- **Files:** new `web/src/features/customers/{customer-details.tsx, customer-logo.tsx, use-customer.ts}` and `web/src/app/(app)/customer/[id]/page.tsx`. `use-customer.ts` is the shared "load one customer" hook (loading, ready, missing, error with Retry, and an old answer is never shown for a new id); the edit page was changed to use it too (`edit-customer.tsx`), and `logo-picker.tsx` now exports its preview helper. `customer-table.tsx` needed no change: its View and Edit links already pointed at these routes.
- **Page:** logo (or a neutral building icon), name, GSTIN, Edit and Delete buttons, then email (mailto link), phone, alternate phone, state name and code, address, added and last-changed dates. "Back to customers" sits above. Phones are shown as "98765 43210".
- **Logo:** fetched through the API client with the access token and shown as an image; a spinner while loading; a customer without a logo, a failed fetch or an image that cannot be drawn shows the placeholder.
- **Delete:** confirm popup (destructive), then the API call, a toast and back to the list; an already-deleted customer (404) shows an info toast and goes back to the list; any other failure shows an error toast and stays, with the button re-enabled. The button shows "Deleting…" and cannot be pressed twice.
- **Missing id:** an unknown or deleted id shows the shared 404 page; other load failures show a message with Retry.
- **Whole-epic check (E03-AC10):** API lint, 27 suites / 379 tests (including the e2e suites on the in-memory database); web lint, typecheck, 189 tests and production build pass. In the browser against the mock database: sign in, add a customer with a logo, find it by search, open it (logo drawn, all fields shown), edit the name (back on the details page with the new name and logo), delete it (back on the list; opening its address again shows the 404 page, and the API answered 404). Checked at 1280 px and at 360 px (no horizontal scroll).
- **Not verified / deferred:** 1440 px (1280 px was used instead); a failed delete (error toast) was not forced in the browser; screen-reader announcements; the ADMIN role in the browser. In the hidden browser pane used for testing, the confirm dialog's dark backdrop stayed on screen after the dialog closed (also in the list's Delete flow), which blocked clicks until the page was reloaded; it should be checked once in a normal visible browser, and fixed in the shared confirm dialog if it repeats.

---

# Epic E04 — Products and Units

*Planned 2026-11-06, not started. File lists are intended files and may be refined when each task starts. Collection rules follow [03-database-design.md](03-database-design.md) §3.4 with the changes in [04-epics.md](04-epics.md) (E04 decisions). All endpoints are under `/api/v1`, need a signed-in user and use the standard `{code,message,data}` envelope. Patterns are reused from E03: the audit service (T026), file storage (T027), list query and paging (T024, T028), form, error mapping and unsaved-changes guard (T029).*

## US12 — Product data and rules

### T031 — `products` schema, migration, unit and GST helpers  ✅ Done (2026-11-06)

**Definition:** The collection, its indexes, and the pure helpers for units, GST rates, HSN codes and money.

**Acceptance criteria**
- T031-AC1: Mongoose `Product` schema: `name`, `nameLower`, `unit` (`PIECE|PACK`), `unitPrice` (integer paise ≥ 0), `hsnCode`, `gstRate`, `stock { qtyOnHand }` (default 0, integer ≥ 0), `image? { fileId, mime, size }`, `isActive` (default true), `isDeleted`, `deletedAt?`, `legacyId?`, timestamps, `createdBy`, `updatedBy`. `nameLower` is kept in step by the schema.
- T031-AC2: Migration `…-create-products.mjs`: partial unique `{nameLower:1}` where `isDeleted:false`; `{nameLower:1,_id:1}`; `{createdAt:-1,_id:-1}`; `{isDeleted:1,isActive:1}`; working `down`.
- T031-AC3: `units.ts`: the unit list with display names, plural names, short names and `baseQty` (piece 1, pack 10); `isUnit(value)`.
- T031-AC4: `gst-rates.ts`: allowed rates (0, 0.25, 3, 5, 12, 18, 28) and `isGstRate(value)`; `money.ts`: `rupeesToPaise("12.50")` (exact, rejects more than 2 decimals, negatives and non-numbers) and `paiseToRupees`; `hsn.ts`: `isHsn(value)` (4, 6 or 8 digits).
- T031-AC5: Unit tests for each helper (edge cases: `"0.1"`, `"1e3"`, `"10."`, `" 5 "`, and 0.29-rupee rounding traps) and for the schema (`toJSON` shape: `id`, no `__v`, no `nameLower`; duplicate active name rejected, reusable after soft delete; migration runs twice and rolls back).

**DB collection definition — `products`:** as doc 03 §3.4 (name unique among active, unit enum, `unitPrice` in paise, `hsnCode`, one `gstRate`, embedded `stock.qtyOnHand`, `image`, `isActive`, soft delete, `legacyId`).

**UI flow:** None.  **API flow:** None (data layer only).

**Files (intended)**
- New: `api/src/products/{product.schema.ts, units.ts, gst-rates.ts, money.ts, hsn.ts, *.spec.ts, products.module.ts}`, `api/migrations/<timestamp>-create-products.mjs`
- Changed: `api/src/app.module.ts`

**Verification:** run migrations on the mock database and check the indexes; unit tests.

**Result (as built)**
- **Files:** new `api/src/products/{product.schema.ts, products.module.ts, units.ts, gst-rates.ts, hsn.ts, money.ts, helpers.spec.ts, products-collection.e2e.spec.ts}` and `api/migrations/20261106100000-create-products.mjs`; `ProductsModule` added to `app.module.ts`. No new packages.
- **Schema:** as the plan, with `stock` and `image` as sub-documents without their own ids. `stock.qtyOnHand` defaults to 0 and must be a whole number ≥ 0; `unitPrice` must be a safe whole number ≥ 0 (a zero price is allowed); `unit` and `gstRate` are checked against the lists; `hsnCode` against the 4/6/8-digit pattern. `toJSON` returns `id` and hides `_id` and `nameLower` (no `__v`). A `validate` hook keeps `nameLower` in step on create and later saves. `unit` and `gstRate` carry an explicit `type` because Nest cannot work out a union type by itself.
- **Indexes (migration):** `nameLower_unique_active` (unique, partial: `isDeleted:false`), `nameLower_id`, `createdAt_id_desc`, `isDeleted_isActive`. An inactive product still holds its name; only deleting frees it. `down` drops the collection.
- **Helpers:** `units.ts` (PIECE and PACK with names, plurals, short forms, `baseQty` 1 and 10, and `unitQuantityLabel`: "1 Piece (pc)", "5 Packs (pks)"); `gst-rates.ts` (0, 0.25, 3, 5, 12, 18, 28); `hsn.ts`; `money.ts`: `rupeesToPaise` works on the typed text with no floating-point arithmetic ("0.29" gives 29, not 28.999…), accepts up to 9 whole digits and 2 decimals, refuses negatives, exponents, "10.", ".5", separators and empty text; `paiseToRupees` gives "12.50". A round trip is checked for every amount from 0.00 to 50.00.
- **Verified:** 431 API tests pass in 29 suites (52 new here: 43 helper cases, 9 collection tests); lint, typecheck and build pass. The collection tests run on the in-memory database with the real migrations: indexes exist with the partial filter; defaults and derived name; every invalid value rejected; every GST slab and a zero price accepted; a second active product with the same name in any letter case gets a duplicate-key error (`11000`); the name is reusable after a soft delete; an inactive product keeps its name; the migration runs twice, rolls back and re-applies. Built app on a persistent mock database: the migration applied on first start and "No pending migrations" on the second.
- **Not verified:** the migration against a real external MongoDB; old data (E08).

---

### T032 — Create product endpoint  ✅ Done (2026-11-06)

**Definition:** `POST /products` with full validation.

**Acceptance criteria**
- T032-AC1: Body `{ name, unit, unitPrice, hsnCode, gstRate }`; `unitPrice` is an integer number of paise (the web form converts rupees). Unknown fields, including `stock`, `isActive` and `isDeleted`, are rejected (`400 VALIDATION_FAILED`, all errors listed with field paths as in E03).
- T032-AC2: Name trimmed, 2–100 characters, letters, digits and common punctuation, starting with a letter or digit; HSN 4, 6 or 8 digits; GST rate from the allowed set; unit from the list.
- T032-AC3: A second active product with the same name (case-insensitive) gives `409 PRODUCT_NAME_EXISTS` with the usual `data.errors`; concurrent creates leave one product (the unique index decides).
- T032-AC4: The product is created with `stock.qtyOnHand = 0` and `isActive = true`; one `CREATE` audit row is written in the same transaction; returns `201` with the product.
- T032-AC5: Tests: valid create, each invalid field, stock/isActive rejected, duplicate name (case-insensitive), parallel creates, audit row, rollback when the audit write fails, `401` without a token.

**DB collection definition:** None new.  **UI flow:** None yet (T037).  **API flow:** `POST /products`.

**Files (intended)**
- New: `api/src/products/{products.service.ts, products.controller.ts, dto/create-product.dto.ts, products.e2e.spec.ts}`
- Changed: `api/src/products/products.module.ts`, `api/src/common/http-exception.filter.ts` (only if a new code is needed)

**Verification:** e2e tests; curl against the built app.

**Result (as built)**
- **Files:** new `api/src/products/{dto/create-product.dto.ts, products.service.ts, products.controller.ts, products.e2e.spec.ts}`; changed `products.module.ts` (now imports the audit module, has the controller and service). No new packages and no change to the error filter (the named code travels in the exception body as for customers).
- **Endpoint:** `POST /products` → `201` with the product (`id`, name, unit, `unitPrice` in paise, `hsnCode`, `gstRate`, `stock.qtyOnHand: 0`, `isActive: true`, dates, `createdBy`/`updatedBy`; no `_id`, `nameLower` or `__v`). Needs a sign-in; any signed-in user may create.
- **Rules:** name trimmed, 2–100, letters (any script, including combining marks), digits and `. , & ' ( ) / + % -`, starting with a letter or digit; `unit` `PIECE` or `PACK`; `unitPrice` a whole number 0 to 99,999,999,999 (text, fractions and negatives refused); `hsnCode` trimmed, 4, 6 or 8 digits; `gstRate` a number from the slab list (text refused). `stock`, `isActive`, `isDeleted`, `nameLower`, `createdBy` and any unknown field give `400` ("property stock should not exist"), and all problems are listed at once, each starting with its field name, so the web form can place them.
- **Duplicates:** the same name in any letter case (and with spaces around it) gives `409 PRODUCT_NAME_EXISTS`, `data.errors: ["name is already used by another product"]`. An early check gives the friendly answer; the unique index decides under parallel requests (six parallel creates: one `201`, five `409`, one product, one audit row). An inactive product keeps its name; a soft-deleted one frees it.
- **Audit:** one `CREATE` row in the same transaction as the product, with the actor and the request id and the full after-state; a failed audit write leaves no product; a rejected request writes nothing.
- **Shared code:** the service reuses `Actor` and `isDuplicateKey` from the customers service; if a third module needs them they should move to `common/`.
- **Verified:** 469 API tests pass in 30 suites (38 new here: valid create and slabs/HSN/units/zero price, name scripts and punctuation, 18 invalid-value cases, 6 refused caller-set fields, duplicates incl. case, inactive and deleted, parallel creates, audit row and rollback, `401`); lint, typecheck and build pass. Built app with curl: valid create `201`, duplicate in different case `409 PRODUCT_NAME_EXISTS`, invalid body `400` with six messages, no token `401`, and the `X-Request-Id` appears in the log.
- **Not verified:** a real external MongoDB; the ADMIN role specifically (same guard as customers, which was tested).

---

## US13 — Product list, details, edit and delete API

### T033 — List, search, sort and paginate  ✅ Done (2026-11-06)

**Definition:** `GET /products` for the list page.

**Acceptance criteria**
- T033-AC1: Query `page` (default 1), `pageSize` (10, 25 or 50; default 10), `q`, `sort` (`name|unitPrice|createdAt`, default newest first), `order`, `active` (`true|false|all`, default `all`). Invalid values give `400` with field paths.
- T033-AC2: `q` is a case-insensitive "contains" over name and HSN code, escaped (so `(`, `.` and `*` are plain text); empty after trimming means no search.
- T033-AC3: Response `{ items, page, pageSize, total, totalPages }`; items carry `id`, `name`, `unit`, `unitPrice`, `hsnCode`, `gstRate`, `stock.qtyOnHand`, `isActive`, `hasImage` and dates; no deleted products; stable order (ties broken by `_id`).
- T033-AC4: Tests: paging maths, each sort, search variants including regex characters, active filter, deleted hidden, bad parameters, `401`.

**DB collection definition:** None new.  **UI flow:** None yet (T036).  **API flow:** `GET /products`.

**Files (intended)**
- New: `api/src/products/dto/list-products.query.ts`, `api/src/products/products-list.e2e.spec.ts`
- Changed: `products.service.ts`, `products.controller.ts`

**Verification:** e2e tests; curl with 30 seeded products.

**Result (as built)**
- **Files:** new `api/src/products/dto/list-products.query.ts` and `api/src/products/products-list.e2e.spec.ts`; changed `products.service.ts` (`list`, plus the `ProductListItem` and `ProductPage` types) and `products.controller.ts` (`GET /products`). No new packages.
- **Query:** `page` (1–100000, default 1), `pageSize` (10, 25 or 50, default 10), `q` (trimmed, up to 100 characters), `sort` (`name`, `-name`, `unitPrice`, `-unitPrice`, `createdAt`, `-createdAt`; default `-createdAt`), `active` (`all` default, `true`, `false`). One deviation from the plan text: direction is a leading `-` in `sort` (as in the customers list) instead of a separate `order` parameter, so the web list code can be reused. Anything else is `400 VALIDATION_FAILED` with the messages ("sort must be one of …"): unknown parameters, a repeated `q`, `active=TRUE` or `1`, `pageSize=100`.
- **Search:** case-insensitive "contains" over name and HSN code, with regex characters escaped (`.*`, `((`, `[a-z]`, `a|b`, `^Basmati` all match nothing, while "(Deluxe) Soap & Co." finds the product literally). Blank text means no search. It combines with sort, paging and the active filter, and `total` counts only the matches.
- **Order:** name sorts on the lower-case name; price and date sorts, and every tie, are broken by `_id` in the same direction, so pages never overlap or skip (tested with 12 products sharing a price and a time, on all four non-name sorts, and with a full walk of 23 products).
- **Response:** `{ items, page, pageSize, total, totalPages }`; each item has `id`, `name`, `unit`, `unitPrice` (paise), `hsnCode`, `gstRate`, `stock.qtyOnHand`, `isActive`, `hasImage`, `createdAt`, `updatedAt` (no image data, no internal fields). Deleted products never appear, whether active or not, in items or totals. A page past the end returns an empty list with the real total.
- **Verified:** 507 API tests pass in 31 suites (38 new); lint, typecheck and build pass. Built app with curl and 30 products: default page (30 total, 3 pages), page 3, search "item 2" (10 matches), highest price first (Item 30, 7500), bad sort `400`.
- **Not verified:** performance on very large catalogues (the search is a scan, as decided for customers); a real external MongoDB.

---

### T034 — Get, edit, activate/deactivate and soft-delete  ✅ Done (2026-11-09)

**Definition:** The remaining single-product endpoints.

**Acceptance criteria**
- T034-AC1: `GET /products/:id` returns the product (including `image` info) or `404` for a bad, unknown or deleted id.
- T034-AC2: `PATCH /products/:id` accepts any subset of `name, unit, unitPrice, hsnCode, gstRate, isActive` with the same rules as create; an empty body gives `400`; `stock` is rejected; a name clash gives `409 PRODUCT_NAME_EXISTS`; a PATCH that changes nothing returns `200`, writes no audit row and leaves `updatedAt` alone.
- T034-AC3: `DELETE /products/:id` soft-deletes (`isDeleted`, `deletedAt`) and returns `204`; the name can be reused; a second delete gives `404`.
- T034-AC4: Every change writes one audit row in the same transaction (`UPDATE` with changed fields, `DELETE` with `before`); an `isActive` flip is an `UPDATE`.
- T034-AC5: Tests for each endpoint, concurrency (parallel deletes give one audit row), rollback, `401`.

**DB collection definition:** None new.  **UI flow:** None yet.  **API flow:** `GET|PATCH|DELETE /products/:id`.

**Files (intended)**
- New: `api/src/products/dto/update-product.dto.ts`, `api/src/products/products-item.e2e.spec.ts`
- Changed: `products.service.ts`, `products.controller.ts`

**Verification:** e2e tests; curl walk-through.

**Result (as built)**
- **Files:** new `api/src/products/dto/update-product.dto.ts` and `api/src/products/products-item.e2e.spec.ts`; changed `products.service.ts` (`get`, `update`, `remove`) and `products.controller.ts` (`GET`, `PATCH`, `DELETE /products/:id`, with `ParseObjectIdPipe`). No new packages.
- **GET:** returns the product (with `image` info when present, inactive products included) and no internal fields (`nameLower`, `_id`). A malformed, unknown or deleted id gives `404`.
- **PATCH:** `UpdateProductDto` is the create DTO made optional plus `isActive`; the same rules apply. An empty body gives `400 "Send at least one field to change."`; `stock`, `isDeleted`, `image`, `createdBy`, `id` and `nameLower` are rejected as "should not exist". A name used by another live product (any case, active or inactive) gives `409 PRODUCT_NAME_EXISTS`; the product's own name, in any case, is allowed; a name only a deleted product used is free. Stock and image are never touched.
- **No-op:** a PATCH that says what is already true returns `200`, with no write, no audit row and an unchanged `updatedAt` (compared on the sanitized before/after, as for customers).
- **DELETE:** soft delete (`isDeleted`, `deletedAt`, `updatedBy`) with a conditional update, so of 5 parallel deletes exactly one gets `204`, four get `404`, and there is one audit row. The name becomes reusable; a second delete is `404`; inactive products can be deleted.
- **Audit:** `UPDATE` rows carry before, after, changed fields, actor and request id (an `isActive` flip records `["isActive"]`); `DELETE` rows carry `before`. A failed audit write rolls back both the update and the delete; rejected and 404 requests write nothing.
- **Verified:** 550 API tests pass in 32 suites (43 new); lint, typecheck and build pass. Built app with curl: get, price change, deactivate, `stock` rejected (`400`), empty body (`400`), name clash (`409 PRODUCT_NAME_EXISTS`), delete (`204`), delete again and get deleted (`404`).
- **Not verified:** a real external MongoDB; the ADMIN role against these routes (covered by the global guard, as for customers).

---

## US14 — Product image

### T035 — Product image endpoints  ✅ Done (2026-11-09)

**Definition:** Upload, replace, download and remove a product's image.

**Acceptance criteria**
- T035-AC1: `PUT /products/:id/image` (multipart field `file`) stores a JPEG, PNG or WebP up to `MAX_UPLOAD_MB` through the existing storage service (type from the first bytes, not the name or declared type); replacing releases the old file reference; returns the product.
- T035-AC2: `GET /products/:id/image` streams the file with its stored type and `Cache-Control: private`; `404` when there is none or the product is deleted; `DELETE` removes it (`204`, `404` when none).
- T035-AC3: Errors as for logos: `413` too large, `415` wrong type, `400` empty or missing file; a failed upload leaves the old image.
- T035-AC4: Image changes write an audit row (file id and size only, never bytes); the storage code shared with customer logos is reused, not copied (a small shared helper is extracted if needed, with the logo tests still passing).
- T035-AC5: e2e tests mirroring the logo tests (upload, replace, wrong type by content, too large, empty, delete, deleted product, `401`).

**DB collection definition:** None new (the `image` field and `fileAssets` exist).  **UI flow:** None yet.  **API flow:** `PUT|GET|DELETE /products/:id/image`.

**Files (intended)**
- New: `api/src/products/{product-image.service.ts, product-image.controller.ts, product-image.e2e.spec.ts}`
- Changed: `products.module.ts`, possibly a shared helper under `api/src/files/`

**Verification:** e2e tests; upload a real PNG with curl and fetch it back.

**Result (as built)**
- **Files:** new `api/src/products/{product-image.service.ts, product-image.controller.ts, product-image.e2e.spec.ts}` and the shared helper `api/src/files/image-upload.ts` (`checkImageUpload`: file present, not empty, JPEG/PNG/WebP by content); changed `products.module.ts` (imports `FilesModule`) and `customers/customer-logo.service.ts` (now uses the shared helper; its 27 tests still pass unchanged).
- **Endpoints:** `PUT /products/:id/image` (multipart field `file`) stores by content hash under `products/`, returns the product; `GET` streams the bytes with the stored type, `Cache-Control: private, no-cache`, `X-Content-Type-Options: nosniff`, an ETag (`304` when it matches); `DELETE` detaches (`204`, `404` when none).
- **Errors:** `415` for a wrong type (decided by content; SVG, GIF and HTML refused), `413` over `MAX_UPLOAD_MB`, `400` for empty, missing or wrongly named file, `404` for unknown, malformed or deleted products (checked before anything is written to disk), `401` signed out. A failed upload or failed database step leaves the old image; the new asset stays PENDING.
- **Audit:** every upload, replace and removal writes an `UPDATE` row with `image.fileId/mime/size` only, never bytes; replacing marks the old asset ORPHANED. File names are never used in paths.
- **Verified:** 17 new tests in `product-image.e2e.spec.ts`; lint and typecheck pass. The curl check with a real PNG was replaced by these tests, which fetch the exact bytes back.
- **Not verified:** a real external MongoDB; clean-up of orphaned files (a later job, as for logos).

---

## US15 — Product screens

### T036 — Products API client and list page  ✅ Done (2026-11-09)

**Definition:** `/product` shows the product list.

**Acceptance criteria**
- T036-AC1: `lib/api/products.ts` typed functions on the existing API client; types in `features/products/product.types.ts`; the list keeps its state in the address bar (`?q=&page=&pageSize=&sort=&active=`) like the customer list.
- T036-AC2: Title, "Add product" button, debounced search box with clear, active filter, and the list: table from 768 px (name, HSN, unit, price ₹, GST %, stock, status, actions), cards below; no horizontal scroll from 360 px; inactive products marked.
- T036-AC3: Pagination, page-size selector, "Showing x–y of n"; loading (shared spinner, no layout jump), empty ("No products yet" / "No products match …"), error with Retry; stale answers never overwrite newer ones.
- T036-AC4: Delete from the list uses the confirm popup, then toast and refresh (or one page back when the last row goes).
- T036-AC5: Formatting helpers `formatRupees(paise)` and unit labels with unit tests; address parsing tests as for customers.

**DB collection definition:** None.  **UI flow:** Products → search, page, delete.  **API flow:** `GET /products`, `DELETE /products/:id`.

**Files (intended)**
- New: `web/src/lib/api/products.ts`, `web/src/features/products/{product.types.ts, product-list.tsx, product-table.tsx, product-cards.tsx, list-query.ts(+test), format.ts(+test)}`
- Changed: `web/src/app/(app)/product/page.tsx`

**Verification:** seed 30 products; search, page, delete; 360, 768 and 1440 px; API stopped for the error state.

**Result (as built)**
- **Files:** new `web/src/lib/api/products.ts` (list, get, create, update, remove, uploadImage, getImageBlob, removeImage) and `web/src/features/products/{product.types.ts, format.ts(+test), list-query.ts(+test), row-actions.tsx, status-badge.tsx, product-table.tsx, product-cards.tsx, product-list.tsx}`; changed `app/(app)/product/page.tsx` (list inside Suspense) and `features/customers/search-box.tsx` (optional `placeholder` and `label`, so the products list reuses it). The pagination component and page-size rules are reused from the customer list, not copied.
- **List:** state lives in the address bar (`?q=&page=&pageSize=&sort=&active=`, only non-default values); odd values fall back to defaults. Title, "Add product", debounced search (name or HSN) with clear, "Show" filter (all, active, inactive) and "Sort by" (six options). Table from 768 px (HSN and Stock join at 1024 px), cards below; inactive rows are greyed and carry an "Inactive" badge, so colour is not the only signal. Price shows as ₹ with Indian grouping (`₹1,250.50`), units as "Piece" and "Pack (10 pieces)", stock as "0 pcs", read-only.
- **States:** shared spinner without layout jump, "No products yet" with an Add button, "No products match …" with Clear filters, error with Retry; each answer is tied to its request key so an older answer never replaces a newer one; a page past the end jumps to the last page. Delete uses the confirm popup, then a toast, and refreshes (or goes one page back when the last row of a page goes); an already-deleted product shows an info toast.
- **Verified:** 202 web tests pass (13 new in `format.test.ts` and `list-query.test.ts`); lint, typecheck clean. In the browser with 30 seeded products: sort by price high to low with `pageSize=25` shows Item 30 (₹3,705.05) first, "Showing 1–25 of 30", "Page 1 of 2", no console errors; at 360 px, 25 cards, the table hidden and no horizontal scroll.
- **Not verified:** the API-stopped error state, delete and the empty states by hand (code mirrors the customer list, which was checked); 768 and 1440 px.

---

### T037 — Add/edit form with image and GST preview  ✅ Done (2026-11-09)

**Definition:** One form for creating and editing a product.

**Acceptance criteria**
- T037-AC1: Routes `/product/new` and `/product/[id]/edit` share `ProductForm` (React Hook Form + zod): name, unit (select), unit price (₹, up to 2 decimals), HSN code, GST rate (select), active (edit only), image.
- T037-AC2: Client rules match the API, with a test that runs both against one shared sample list (as in T029); rupees convert to paise exactly (no floating-point errors), with tests.
- T037-AC3: A read-only "Price including GST" preview updates while typing (with the CGST/SGST split shown as information); it is never sent.
- T037-AC4: Messages on blur then while typing; first invalid field focused; API `VALIDATION_FAILED` and `PRODUCT_NAME_EXISTS` placed on the right field; other failures toast; "Saving…" and no double submit.
- T037-AC5: Image picker (type and size checked before upload, preview, remove; saved with `PUT` after the product is saved; if only the image fails the product stays saved and the user can retry), reusing the logo picker where possible.
- T037-AC6: Success → toast and list (create) or details (edit); unsaved-changes confirm; the edit page loads the product first and shows the shared 404 when missing.

**DB collection definition:** None.  **UI flow:** Products → Add product → fill → Save → list. Edit → Save → details.  **API flow:** `POST|PATCH|GET /products`, `PUT /products/:id/image`.

**Files (intended)**
- New: `web/src/features/products/{product-form.tsx, product-schema.ts(+test), money.ts(+test), gst-preview.ts(+test), map-api-errors.ts(+test), edit-product.tsx}`, `shared/product-rules.samples.json`, `api/src/products/rules-samples.spec.ts`, pages `product/new` and `product/[id]/edit`
- Changed: the image picker made generic if needed

**Verification:** create with and without an image, duplicate name, invalid values, edit, change image, cancel with unsaved changes; 360 px.

**Result (as built)**
- **Files:** new `web/src/features/products/{product-form.tsx, edit-product.tsx, use-product.ts, product-schema.ts(+test), money.ts(+test), gst-preview.ts(+test), map-api-errors.ts(+test), rules-samples.test.ts}`, `shared/product-rules.samples.json`, `api/src/products/rules-samples.spec.ts`, pages `product/new` and `product/[id]/edit`. Changed: `customers/logo-picker.tsx` (new `noun` prop, so the same picker serves "logo" and "image"; the preview alt text is now "Logo preview") and `customers/customer-form.tsx` (`Field` is exported and reused). The unsaved-changes guard and image type/size checks are reused from the customer feature.
- **Form:** one `ProductForm` for create and edit: name, unit (Piece, Pack of 10 pieces), unit price in ₹, HSN code, GST rate (select of the seven allowed rates), "Active" checkbox on edit only, image. Messages show on blur and then update while typing; the first invalid field is focused; "Saving…" and a disabled form prevent double submits. Edit sends only the changed fields (`buildUpdate`); nothing changed shows "No changes to save."
- **Money:** the price is parsed from text to whole paise with string arithmetic (0.29 gives 29, which floating point gets wrong); more than 2 decimals, negatives, `1e3`, `10.`, commas and over 9 whole-rupee digits are refused, exactly like the API.
- **GST preview:** "Price including GST" updates while typing, with GST and the CGST/SGST split (odd paise go to SGST); information only, never sent.
- **Errors:** API `VALIDATION_FAILED` messages are placed on their field by name prefix; `PRODUCT_NAME_EXISTS` goes on Name; other failures toast. If only the image fails, the product stays saved: on create the user lands on the edit page with the image to choose again, on edit "Press Save to try again".
- **Shared rules:** `shared/product-rules.samples.json` (11 names, 10 HSN codes, 16 rupee inputs, 11 GST rates) is run by both `rules-samples.spec.ts` (API, 48 tests) and `rules-samples.test.ts` (web), so the two sides cannot drift.
- **Verified:** 268 web tests pass (66 new) and 48 new API sample tests; lint and typecheck clean. In the browser: preview for ₹1250.50 at 18% shows ₹1,475.59 (GST ₹225.09, CGST ₹112.54, SGST ₹112.55); a duplicate name ("item 05") shows "A product with this name already exists." on Name and focuses it; a unique name saves, shows "Added “Walkthrough Rice”" and returns to the list.
- **Not verified by hand:** the image picker flow in the browser (file chooser cannot be driven here; the same picker was verified for logos, and the upload endpoint is covered by T035 tests), the unsaved-changes prompt on this form, 360 px.

---

### T038 — Product details page, delete flow and whole-epic check  ✅ Done (2026-11-09)

**Definition:** Read-only page for one product with its image, and the delete action; closes E04.

**Acceptance criteria**
- T038-AC1: `/product/[id]` shows image (or placeholder), name, unit, price ₹, HSN, GST rate with CGST/SGST split, price including GST, stock on hand (read-only), status, added and last-changed dates; works from 360 px.
- T038-AC2: The image is loaded with the signed-in request and shows a loading state; missing or broken shows a placeholder.
- T038-AC3: Back to products, Edit, Delete (confirm popup, toast, return to the list; failure toast and stay); an unknown or deleted id shows the shared 404.
- T038-AC4: Whole-epic check: lint, typecheck, unit and e2e tests pass; sign in → add with image → search → view → edit → deactivate → delete verified in the browser against the mock database; docs updated; E04 closed.

**DB collection definition:** None.  **UI flow:** List → View → Edit / Delete → list.  **API flow:** `GET /products/:id`, `GET /products/:id/image`, `DELETE /products/:id`.

**Files (intended)**
- New: `web/src/features/products/{product-details.tsx, product-image.tsx, use-product.ts}`, `web/src/app/(app)/product/[id]/page.tsx`

**Verification:** the full walk-through above, at 360 and 1440 px.

**Result (as built)**
- **Files:** new `web/src/features/products/{product-details.tsx, product-image.tsx}` and `web/src/app/(app)/product/[id]/page.tsx` (`use-product.ts` came with T037).
- **Details page:** image (or a package placeholder), name, status badge, unit, price in ₹, HSN code, GST rate with CGST/SGST rates, price including GST with the GST split, stock on hand (read-only, with the note that it changes through stock entries), status, added and last-changed dates. Back to products, Edit, and Delete with the confirm popup, then a toast and a return to the list; a failure toasts and stays; "already deleted" is an info toast. An unknown or deleted id shows the shared 404 page.
- **Image:** fetched with the signed-in request (spinner while loading); a missing or broken image shows the placeholder; same approach as the customer logo.
- **Whole-epic check (all green):** API lint, typecheck and 620 tests in 34 suites; web lint, typecheck, 268 tests in 23 files, and `next build` (routes `/product`, `/product/new`, `/product/[id]`, `/product/[id]/edit` built).
- **Browser walk-through, mock database, 1280 px:** sign in, list 30 seeded products (sort, page size, search), add a product (duplicate name rejected on the Name field, then saved), upload a real PNG (curl, fetched back byte-identical), open the details page (image shown, ₹1,475.59 with GST), edit (price ₹999.90, deactivated; saved image preloaded in the form), delete with confirm, and the deleted product's address shows the 404 page. At 360 px the list shows cards with no horizontal scroll.
- **Not verified:** the image picker via the file chooser and the unsaved-changes prompt on the product form (not drivable here; covered by the shared, previously verified logo picker and guard); 768 and 1440 px; screen readers; a real external MongoDB.

---

## US16 — Stock engine and opening stock (E05)

### T039 — `stockMovements` collection and migration  ✅ Done (2026-11-09)

**Definition:** The append-only stock history exists, with its schema and indexes.

**Acceptance criteria**
- T039-AC1: A `StockMovement` Mongoose schema: `productId`, `type` (`OPENING`, `STOCK_IN`, `SALE`, `SALE_CANCEL`, `ADJUSTMENT`), signed integer `quantity` (never 0), `balanceAfter` (≥ 0), optional `invoiceId`, `note` (up to 200 characters), `createdBy`, `createdAt`; no update or delete paths in code.
- T039-AC2: A migration creates the collection with indexes `{productId:1, createdAt:-1, _id:-1}` and a sparse `{invoiceId:1}`; running it twice changes nothing.
- T039-AC3: The type/sign rule is one helper with unit tests: `OPENING`, `STOCK_IN` and `SALE_CANCEL` are positive, `SALE` is negative, `ADJUSTMENT` may be either.
- T039-AC4: Tests prove the indexes exist, a zero or wrongly signed quantity is rejected, and documents cannot be changed through the model.

**DB collection definition:** `stockMovements` as in doc 03 §3.5.  **UI flow:** None.  **API flow:** None.

**Files (intended)**
- New: `api/src/stock/{stock-movement.schema.ts, movement-rules.ts(+spec), stock.module.ts}`, `api/migrations/<timestamp>-create-stock-movements.mjs`, `api/src/stock/stock-collection.e2e.spec.ts`
- Changed: `app.module.ts`

**Verification:** e2e test on the mock database; migration run twice.

**Result (as built)**
- **Files:** new `api/src/stock/{movement-rules.ts(+spec), stock-movement.schema.ts, stock.module.ts, stock-collection.e2e.spec.ts}` and `api/migrations/20261109100000-create-stock-movements.mjs`; changed `app.module.ts` (registers `StockModule`). No new packages.
- **Schema:** `StockMovement` in the `stockMovements` collection: `productId`, `type` (five types), signed `quantity`, `balanceAfter` (whole number ≥ 0), optional `invoiceId`, `note` (trimmed, up to 200), `createdBy`, `createdAt` only (no `updatedAt`). `toJSON` gives `id` and hides `_id`.
- **Rules helper:** `movementProblem(type, quantity)` is the single place for the type/sign rule: `OPENING`, `STOCK_IN`, `SALE_CANCEL` positive, `SALE` negative, `ADJUSTMENT` either; zero, fractions, NaN, infinity and more than 1,000,000 are refused (`MAX_MOVEMENT_QTY`, also the limit planned for opening stock). The schema validator uses it, so the model and the future service cannot disagree.
- **Append-only:** saving a changed existing movement, `updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`, `findOneAndReplace`, `deleteOne`, `deleteMany`, `findOneAndDelete` and `doc.deleteOne()` all throw "Stock movements are append-only…". Only inserts work through the model; test clean-up uses the raw collection. (The database-level insert/find-only role in doc 03 §8 is an E08 deployment item.)
- **Migration:** creates the collection and the indexes `productId_createdAt_id_desc` `{productId:1, createdAt:-1, _id:-1}` and `invoiceId_sparse`; run twice, rolled back, run again in the test with no errors.
- **Verified:** 22 new tests (14 in `movement-rules.spec.ts`, 8 in `stock-collection.e2e.spec.ts`); API now 642 tests in 36 suites; lint, typecheck and build pass (the build and the test app both run the migrations at start-up).
- **Not verified:** the migration against a real external MongoDB; the database-level restriction (E08).

---

### T040 — `StockService.apply()`: atomic, non-negative stock  ✅ Done (2026-11-09)

**Definition:** The single place where a product's `stock.qtyOnHand` changes, as designed in doc 03 §5.1.

**Acceptance criteria**
- T040-AC1: `apply(session, { productId, delta, type, invoiceId?, note?, actorId })` changes the balance with one conditional update (`qtyOnHand >= -delta`), then writes the movement with `balanceAfter` from the updated product, inside the caller's transaction.
- T040-AC2: A change that would make the balance negative throws `InsufficientStockError` (a `409 INSUFFICIENT_STOCK` with the product name, available and requested quantities); nothing is written.
- T040-AC3: An unknown or deleted product gives `404`; a quantity of 0, a non-integer, or a sign that does not match the type is refused before the database is touched.
- T040-AC4: If the movement insert or the surrounding transaction fails, the balance change is rolled back.
- T040-AC5: Tests: normal in/out, exact-to-zero, one too many, 20 parallel sales racing for 5 units (exactly 5 succeed, balance 0, 5 movements), rollback, and `balanceAfter` equal to the product balance after every step.

**DB collection definition:** None new.  **UI flow:** None.  **API flow:** Internal service (used by T041, E05 stock-in and E06 invoices).

**Files (intended)**
- New: `api/src/stock/{stock.service.ts, stock.errors.ts, stock.e2e.spec.ts}`
- Changed: `stock.module.ts`

**Verification:** concurrency test on the mock database.

**Result (as built)**
- **Files:** new `api/src/stock/{stock.service.ts, stock.errors.ts, stock.e2e.spec.ts}`; changed `stock.module.ts` (now registers the `Product` model itself and provides and exports `StockService`; it does not import `ProductsModule`, so products and later invoices can import `StockModule` without a circle). No new packages.
- **`apply(session, { productId, delta, type, invoiceId?, note?, actorId })`:** checks the quantity with `movementProblem` first (a `400` before any database call), then one `findOneAndUpdate` on `{ _id, isDeleted: false, stock.qtyOnHand >= -delta }` with `$inc`, which both checks and applies the change, then writes the `stockMovements` row with `balanceAfter` taken from the updated product, in the caller's session. It returns the movement. For additions the condition is always true.
- **Errors:** not enough stock gives `InsufficientStockError`, a `409` with code `INSUFFICIENT_STOCK`, message "Not enough stock." and `errors: ["<name>: <available> in stock, <requested> requested"]` (also exposes `productName`, `available`, `requested`). An unknown, malformed or deleted product gives `404`. Inactive products can still be changed.
- **Rollback:** the service never opens its own transaction; everything rolls back with the caller's. Tested: a later step throwing, the movement insert failing, and two products in one transaction where the second is short (the first change is undone too).
- **Concurrency:** 20 parallel sale transactions for 5 units give exactly 5 successes and 15 `INSUFFICIENT_STOCK`, a final balance of 0 and 5 movements with `balanceAfter` 4, 3, 2, 1, 0; run 4 times in a row without a failure.
- **Verified:** 12 new tests in `stock.e2e.spec.ts` (normal in/out, exact to zero, one too many, negative adjustments, unknown/deleted, bad quantities with no database call, rollbacks, race, mixed run where `balanceAfter` equals the balance after every step and the history sums to the balance); API now 654 tests in 37 suites; lint, typecheck and build pass.
- **Not verified:** a real external MongoDB under load (the mock runs a single-node replica set); nothing calls `apply` from an endpoint yet (T041, stock-in and invoices).

---

### T041 — Opening stock on create and the stock-history endpoint  ✅ Done (2026-11-09)

**Definition:** A new product can start with stock, and a product's history can be read.

**Acceptance criteria**
- T041-AC1: `POST /products` accepts an optional `openingStock` (whole number ≥ 0, default 0, up to 1,000,000); above 0 it is applied through `StockService` as an `OPENING` movement in the same transaction as the product and its audit row. The edit endpoint still rejects any stock field.
- T041-AC2: `GET /products/:id/stock-movements` returns `{ items, page, pageSize, total, totalPages }`, newest first with a stable order, page sizes 10/25/50; each item has `type`, `quantity`, `balanceAfter`, `invoiceId`, `note`, `createdAt` and who made it; `404` for an unknown or deleted product; `401` when signed out.
- T041-AC3: The product form (create only) gets an "Opening stock (pieces)" box with the same rule as the API and a shared-samples test; the details page shows the opening quantity through the stock figure.
- T041-AC4: Tests: create with and without opening stock, rollback when the movement fails (no product left), paging and order of the history, `401`; the form test and a browser check.
- T041-AC5: Whole-story check: API and web lint, typecheck, tests and build pass; verified in the browser against the mock database.

**DB collection definition:** None new.  **UI flow:** Products → Add product → Opening stock → Save.  **API flow:** `POST /products`, `GET /products/:id/stock-movements`.

**Files (intended)**
- New: `api/src/stock/{stock-movements.controller.ts, dto/list-movements.query.ts, stock-history.e2e.spec.ts}`
- Changed: `products.service.ts`, `dto/create-product.dto.ts`, `web/src/features/products/{product-form.tsx, product-schema.ts(+test)}`, `shared/product-rules.samples.json` and both sample tests

**Verification:** e2e tests; browser: add a product with opening stock 25, see "25 pcs" in list and details.

**Result (as built)**
- **API files:** new `api/src/stock/{stock-history.service.ts, stock-movements.controller.ts, dto/list-movements.query.ts, stock-history.e2e.spec.ts}`; changed `products/dto/create-product.dto.ts` (`openingStock`), `dto/update-product.dto.ts` (omits `openingStock`), `products.service.ts` (calls `StockService`), `products.module.ts` (imports `StockModule`), `stock/stock.module.ts` (controller, history service, `User` model), `products/rules-samples.spec.ts`, `shared/product-rules.samples.json`.
- **openingStock:** optional whole number 0 to 1,000,000 on `POST /products` (`400` naming `openingStock` otherwise). Above 0, `StockService.apply` writes an `OPENING` movement in the same transaction as the product and its audit row; the CREATE audit row shows the opening balance and the response shows `stock.qtyOnHand`. Left out or 0 writes no movement. `PATCH` rejects `openingStock` and `stock` ("should not exist"). If the stock step or the audit write fails, no product and no movement are left; a duplicate name creates nothing.
- **History:** `GET /products/:id/stock-movements?page=&pageSize=` (10/25/50, default 10) returns `{ items, page, pageSize, total, totalPages }`, newest first with `_id` breaking ties; each item has `id`, `type`, `quantity`, `balanceAfter`, `invoiceId` and `note` when present, `createdAt` and `createdBy { id, name }` (full name, else username). `404` for an unknown, malformed or deleted product, `400` for bad parameters, `401` signed out.
- **Web files:** changed `features/products/{product-schema.ts(+test), product-form.tsx, map-api-errors.ts, product.types.ts (StockMovement types)}` and `rules-samples.test.ts`. The add form (create only) has "Opening stock (pieces)": empty means 0, whole numbers up to 10,00,000, message on blur, API errors placed on the field; the edit form has no such box and `buildUpdate` ignores it. The list and details pages already show the quantity, so they show it with no further change.
- **Shared samples:** `openingStock` (8 values) is checked by the API against the real DTO rules (`validateSync`) and by the web against `isValidOpeningStock`.
- **Verified:** API 690 tests in 38 suites (36 new in `stock-history.e2e.spec.ts` plus 8 sample cases); web 280 tests (12 new); lint, typecheck and `next build` pass on both. In the browser: a 2.5 opening stock is refused with a message and the field focused; 25 saves and the list shows "25 pcs". curl: the history shows one `OPENING` row (+25, balance 25, "Administrator"), PATCH with `openingStock` gives `400`, `pageSize=5` gives `400`, unknown product `404`, no token `401`.
- **Not verified:** the history on a real external MongoDB; no screen shows the history yet (US18); 360 px for the new box.
- **Story check (US16):** the engine, the migration and the opening stock all pass lint, typecheck, tests and build on API and web, and the flow was checked in the browser against the mock database.

---

## US17 — Stock-in and adjustment (E05)

### T042 — Stock-in and adjustment endpoints  ✅ Done (2026-11-09)

**Definition:** The two ways staff change stock by hand, both going through `StockService`.

**Acceptance criteria**
- T042-AC1: `POST /products/:id/stock-in` with `{ quantity, note? }` (whole pieces, 1 to 1,000,000; note up to 200 characters, trimmed) adds stock as a `STOCK_IN` movement and returns the updated product and the movement.
- T042-AC2: `POST /products/:id/stock-adjustments` with `{ quantity, note }` (non-zero whole pieces, -1,000,000 to 1,000,000; `note` required, 3 to 200 characters, as the reason) writes an `ADJUSTMENT` movement. A removal larger than the balance gives `409 INSUFFICIENT_STOCK`.
- T042-AC3: The resulting balance may not exceed 100,000,000 pieces: `StockService` refuses with `409 STOCK_LIMIT_EXCEEDED` (naming the product, the balance and the limit); nothing is written.
- T042-AC4: Each call runs in one transaction: balance change, movement and one audit row (`UPDATE` on the product, with the stock before and after and the movement id). If any step fails, nothing remains.
- T042-AC5: `404` for an unknown, malformed or deleted product (inactive products are allowed); `400` naming the field for bad input; unknown fields (such as `type` or `balanceAfter`) are rejected; `401` signed out.
- T042-AC6: Tests: both endpoints, balance and `balanceAfter`, limits at the edges, `INSUFFICIENT_STOCK`, `STOCK_LIMIT_EXCEEDED`, rollback when the audit write fails, parallel stock-in (20 requests of 1 add exactly 20), the history endpoint showing the new rows with the actor, `401`.

**DB collection definition:** None new.  **UI flow:** None yet.  **API flow:** `POST /products/:id/stock-in`, `POST /products/:id/stock-adjustments`.

**Files (intended)**
- New: `api/src/stock/{stock-entries.controller.ts, stock-entries.service.ts, dto/stock-in.dto.ts, dto/stock-adjustment.dto.ts, stock-entries.e2e.spec.ts}`
- Changed: `stock.service.ts` and `stock.errors.ts` (balance limit), `stock.module.ts` (imports `AuditModule`), `movement-rules.ts` (`MAX_BALANCE`)

**Verification:** e2e tests; curl: stock-in 40, adjustment -3, adjustment beyond the balance, history.

**Result (as built)**
- `POST /products/:id/stock-in` (`{ quantity 1..1,000,000, note? ≤200, trimmed, blank = none }`) and `POST /products/:id/stock-adjustments` (`{ quantity` non-zero, ±1,000,000; `note` required 3..200 }) answer `201 { product, movement }`. Both are served by `StockEntriesController` and `StockEntriesService`, which call `StockService.apply` with type `STOCK_IN` or `ADJUSTMENT`.
- One transaction per call: balance change, movement and one audit row (`Product`, `UPDATE`, `before { stock.qtyOnHand }`, `after { stock.qtyOnHand, movementId }`, actor and request id). A failing audit write leaves stock, movements and audit unchanged (tested).
- The limit lives in `StockService`: the conditional update now also requires `qtyOnHand <= 100,000,000 - delta` (`MAX_BALANCE` in `movement-rules.ts`). On a miss it answers `409 STOCK_LIMIT_EXCEEDED` (`"<name>: <balance> in stock, the limit is 100000000"`) or `409 INSUFFICIENT_STOCK`. Exactly the limit is allowed. This also protects future sale cancellations.
- Unknown fields (`type`, `balanceAfter`, `productId`) give `400`; unknown, malformed and deleted products give `404`; inactive products are accepted; signed out gives `401`. The `Idempotency-Key` header was not added (decision 7).
- `StockModule` now imports `AuditModule`.
- Tests: `stock-entries.e2e.spec.ts` (33 cases, including 20 parallel stock-ins adding exactly 20 with balances 1..20, edges, rollback, history with actor). API total: 723 tests / 39 suites; lint and typecheck clean.
- Not run against a real external MongoDB (mock only), as before. The curl walk-through is part of T044.

---

### T043 — Stock entry screen  ✅ Done (2026-11-09)

**Definition:** `/product/[id]/stock` lets staff add stock or correct it.

**Acceptance criteria**
- T043-AC1: `lib/api/products.ts` gets `stockIn`, `adjustStock` and `listMovements`; types are shared with the history response.
- T043-AC2: The page loads the product first (shared 404 when missing) and shows its name, unit and current stock. The form has: kind (Stock in, Increase by adjustment, Decrease by adjustment), quantity, a unit choice (pieces or packs of 10, for products counted in packs), and a note (optional for stock in, required as "Reason" for adjustments).
- T043-AC3: A live line shows "25 pcs → 65 pcs" (or "Not enough stock" before sending); the same quantity and note rules as the API with a shared-samples test; packs convert to pieces exactly.
- T043-AC4: Messages on blur then while typing; API `VALIDATION_FAILED`, `INSUFFICIENT_STOCK` and `STOCK_LIMIT_EXCEEDED` are shown on the quantity field; other failures toast; "Saving…" and no double submit; unsaved-changes confirm.
- T043-AC5: Success → toast and back to the product page, which shows the new stock.

**DB collection definition:** None.  **UI flow:** Product → Update stock → fill → Save → product.  **API flow:** `GET /products/:id`, `POST …/stock-in`, `POST …/stock-adjustments`.

**Files (intended)**
- New: `web/src/features/products/{stock-entry-form.tsx, stock-entry-schema.ts(+test), stock-entry-page.tsx}`, `web/src/app/(app)/product/[id]/stock/page.tsx`, `shared/stock-rules.samples.json`, `api/src/stock/rules-samples.spec.ts`
- Changed: `web/src/lib/api/products.ts`, `product.types.ts`

**Verification:** unit tests; browser: stock in 40, remove 3 with a reason, remove too many (error on the field), packs entry; 360 px.

**Result (as built)**
- `lib/api/products.ts` gained `stockIn`, `adjustStock` and `listMovements`; `product.types.ts` gained `StockEntryResult` (next to the existing `StockMovement` types).
- `/product/[id]/stock` (`stock-entry-page.tsx` loads the product first, shared 404 and retry; `stock-entry-form.tsx`) has: kind (Stock in, Increase by adjustment, Decrease by adjustment), quantity, "Counted in" (pieces; packs of 10 offered only for products counted in packs) and a note (optional "Note" for stock in, required "Reason" for adjustments).
- Rules live in `stock-entry-schema.ts`: packs convert to pieces exactly (×10), quantity 1..1,000,000 pieces, reason 3..200, note ≤200, `previewBalance`, `toRequest` (decrease is sent as a negative quantity), `mapStockError`. The live line shows "10 pcs → 50 pcs (40 pcs added)", or "Not enough stock: 50 pcs on hand." / the 10,00,00,000 limit message in red.
- Messages show after leaving a field, then while typing. `VALIDATION_FAILED`, `INSUFFICIENT_STOCK` and `STOCK_LIMIT_EXCEEDED` appear on the quantity (or note) field; other failures toast; "Saving…" with the form disabled; unsaved-changes confirm on Cancel/leave. Success → toast "Stock of “…” is now 47 pcs" and back to the product page, which loads fresh.
- Shared rules: `shared/stock-rules.samples.json` is read by `api/src/stock/rules-samples.spec.ts` (against the real DTOs) and `stock-entry-schema.test.ts`, so the two sides cannot drift.
- Tests: web 329 (24 files), API 753 (40 suites); lint, typecheck and build clean.
- Browser (mock database, signed in as admin): opening 10; stock in 4 packs with a note → 10 → 50; decrease 100 with no reason → "Enter the reason for the change."; with a reason → "…: 50 in stock, 100 requested" on the quantity field, nothing saved; decrease 3 → 47 shown on the details page. History by curl: ADJUSTMENT −3 (47), STOCK_IN 40 (50), OPENING 10 (10). No horizontal overflow at 360 px.
- Not checked: the unsaved-changes prompt in the browser (unit-tested hook only), 768/1440 px, keyboard-only use. The entry points (buttons) come in T044.

---

### T044 — Entry points and US17 check  ✅ Done (2026-11-09)

**Definition:** The screen is reachable where staff need it, and the story is verified end to end.

**Acceptance criteria**
- T044-AC1: The product details page has an "Update stock" button next to Edit; each list row has an "Update stock" action (icon with text from 1024 px, same as the other actions).
- T044-AC2: The details page's stock figure refreshes after a stock entry (no stale value on return).
- T044-AC3: Whole-story check: API and web lint, typecheck, tests and build pass; browser walk-through against the mock database: add a product with opening stock 10, stock in 40, adjust -3, try to remove 100 (refused), check the figure in list and details and the history by curl (4 rows, balances 10, 50, 47).
- T044-AC4: Docs updated (E05 acceptance criteria, Result sections).

**DB collection definition:** None.  **UI flow:** List or details → Update stock.  **API flow:** as T042.

**Files (intended)**
- Changed: `web/src/features/products/{row-actions.tsx, product-details.tsx}`

**Verification:** the walk-through above at 360 and 1280 px.

**Result (as built)**
- Details page: an outline "Update stock" button (Boxes icon) between Edit and Delete. List: `RowActions` gained an "Update stock" link (`aria-label="Update stock of <name>"`), shown in both the table and the card list; in the table the words appear from 1024 px, like the other actions.
- The stock figure is never stale: the details page and the list load their data each time they open, so returning after an entry shows the new number (checked: list and details showed 47 pcs).
- Whole-story check: web lint, typecheck, 329 tests and build pass; API lint, typecheck and 753 tests pass.
- Browser walk-through (mock database, admin): added "Walkthrough Rice 25kg" with opening stock 10 through the form; from the list row → Update stock → stock in 40 → details 50 pcs; details → Update stock → decrease 3 with reason → 47 pcs; decrease 100 refused on the quantity field ("47 in stock, 100 requested"), nothing saved. History by curl: 3 rows newest first, ADJUSTMENT −3 (47), STOCK_IN 40 (50), OPENING 10 (10). (The "4 rows" in the plan counted a second stock-in that was not needed.)
- 360 px: no horizontal overflow, the row's Update stock link is visible and inside the screen. Desktop checked at the browser pane's width, not at exactly 1280 px.
- Not checked: the unsaved-changes prompt and keyboard-only use in the browser, a real external MongoDB, the ADMIN role (walk-through used the seeded admin).

---

## US18 — Stock history on the product page (E05)

### T045 — Stock history section  ✅ Done (2026-11-09)

**Definition:** The product page lists the product's stock movements from `GET /products/:id/stock-movements` (built in T041; no API change).

**Acceptance criteria**
- T045-AC1: A "Stock history" section under the details shows, newest first: date and time, kind (Opening stock, Stock in, Sale, Sale cancelled, Adjustment), change (`+40` green, `−3` red, in pieces), balance after, the note (shown as "Reason" text for adjustments) and who made it (name; "—" when unknown).
- T045-AC2: Paged with the shared `Pagination`; page size 10, 25 or 50 (default 10); the page and size are kept in the address (`?hpage=2&hsize=25`) so a refresh or a shared link shows the same rows, and they do not clash with other parameters.
- T045-AC3: A table from 640 px, a card list below it; no horizontal page scroll at 360 px; long notes wrap.
- T045-AC4: States: spinner while loading (the details above stay visible), "No stock changes yet." when empty, an error message with Retry when loading fails; a page past the end falls back to the last page. History failing never hides the product details.
- T045-AC5: Rows for sales (later, E06) show "Invoice" text for now where `invoiceId` is set; the link to the invoice is added in E06.
- T045-AC6: Tests: formatting (sign, colour class, kind label, who), query parsing, the section with a mocked client (rows, empty, error and retry, paging).

**DB collection definition:** None.  **UI flow:** Product → scroll to Stock history → page.  **API flow:** `GET /products/:id/stock-movements?page=&pageSize=`.

**Files (intended)**
- New: `web/src/features/products/{stock-history.tsx, stock-history-format.ts(+test), stock-history-query.ts(+test)}`
- Changed: `web/src/features/products/product-details.tsx`

**Verification:** unit tests; browser at 360 and desktop width with a product that has more than 10 movements.

**Result (as built)**
- `stock-history.tsx` adds a "Stock history" section under the details on `/product/[id]` (inside a Suspense boundary, because it reads the address). Newest first; columns Date (with time, "9 Nov 2026, 5:09 pm"), Kind (Opening stock, Stock in, Sale, Sale cancelled, Adjustment), Change (`+40` green, `−3` red, Indian grouping), Balance (pcs), Note / reason, By ("—" when unknown). Rows with an `invoiceId` show "Invoice" in front of the note (link comes in E06).
- A table from 640 px, a card list below (the card labels the text "Reason" for adjustments, "Note" otherwise). Shared `Pagination` (10/25/50). Page and size are `?hpage=` and `?hsize=` (defaults are left out of the address; other parameters are kept); `stock-history-query.ts` parses them and ignores odd values and the list's own `page`/`pageSize`.
- States: spinner while the first page loads; while changing page the old rows stay with controls disabled and a small spinner; "No stock changes yet."; error with Retry; a page past the end (`?hpage=9`) moves to the last page. The details above never wait for or hide because of the history. No API change.
- Tests: `stock-history-format.test.ts` and `stock-history-query.test.ts` (20 tests); web total 349 (26 files); lint, typecheck and build clean.
- **Not done as planned (T045-AC6):** a test of the section with a mocked client. The web project has no component-testing library (no testing-library or DOM environment), so the section was verified in the browser instead; adding the library is a separate decision.
- Browser (mock database, admin, product with 15 movements): 10 rows on page 1 (balances 59 down to 50), Next → `?hpage=2` shows 11–15 of 15 ending with Opening stock 10; size 25 → one page, `?hsize=25`; reload on `?hpage=2` shows the same rows; `?hpage=9` fell back to page 2; a product with no movements shows "No stock changes yet."; adjustment reason and delivery note shown; 360 px shows cards, no table and no horizontal overflow; 900 px shows the table without page overflow.
- Not checked: the error/Retry state in the browser (server not stopped mid-test), keyboard-only use, 1440 px, a real external MongoDB.

---

### T046 — Story check and refresh after entries  ✅ Done (2026-11-09)

**Definition:** The history is current whenever the person looks at it, and the story is verified end to end.

**Acceptance criteria**
- T046-AC1: After a stock entry the product page shows the new row at the top without a manual reload (the page loads fresh on arrival).
- T046-AC2: Whole-story check: web lint, typecheck, tests and build pass; browser walk-through against the mock database: a product with opening stock 10, stock in 40, adjustment −3, a refused −100 (no row), then 12 more small entries to get a second page; page through, change the size, reload on page 2, check the balances 10, 50, 47 … match the API by curl.
- T046-AC3: Docs updated (E05 acceptance criteria, Result sections).

**DB collection definition:** None.  **UI flow:** as T045.  **API flow:** as T045.

**Files (intended):** none expected beyond T045.

**Verification:** the walk-through above at 360 px and desktop width.

**Result (as built)**
- No code change was needed: the history loads fresh each time the product page opens, so a new entry shows at the top on arrival (T046-AC1).
- Whole-story check: API lint, typecheck and 753 tests (40 suites) pass; web lint, typecheck, 349 tests (26 files) and build pass.
- Browser walk-through (mock database, admin): added "Story Check Rice" through the form with opening stock 10 (history: Opening stock +10 → 10 pcs); Update stock → stock in 40 (new top row +40 → 50); Update stock → decrease 3 with reason (−3 → 47); decrease 100 refused on the quantity field ("47 in stock, 100 requested") and the history unchanged; back on the product page the three rows were as before. Then 12 more stock-ins of 1 by curl (15 rows in all): `?hpage=2` after a fresh load showed rows 11–15 (+1 → 49, +1 → 48, −3 → 47, +40 → 50, +10 → 10) and "Showing 11–15 of 15", identical to the API's page 2.
- The 360 px, size-change, past-the-end and empty-history checks were done in T045 and not repeated.
- Not checked: error/Retry state in the browser, keyboard-only use, 1440 px, a real external MongoDB, the ADMIN role (walk-through used the seeded admin), a component test of the section (no testing library in the web project).

---

## US19 — Business profile (E06)

### T047 — Business profile API  ⬜

**Definition:** One settings document `_id: "businessProfile"` that the tax rules and invoices read.

**Acceptance criteria**
- T047-AC1: A migration creates the `settings` collection (no extra index; `_id` is the key).
- T047-AC2: `GET /settings/business-profile` returns the profile, or `404 BUSINESS_PROFILE_MISSING` when it was never saved.
- T047-AC3: `PUT /settings/business-profile` with `{ name, gstin, address, invoicePrefix, invoiceFooter? }` creates or replaces it. `name` 2 to 100 characters; `gstin` valid 15-character GSTIN with the same check as customers (`stateCode` is derived from its first two digits and returned, never sent); `address` 5 to 300; `invoicePrefix` 2 to 10 letters or digits, upper-cased (default shown as `KRG` is only a hint); `invoiceFooter` up to 300 characters. Unknown fields rejected with `400` naming the field.
- T047-AC4: Changing the prefix is allowed and affects only invoices created afterwards.
- T047-AC5: `PUT/GET/DELETE /settings/business-profile/logo` use the shared image upload (same rules and limits as customer logos).
- T047-AC6: Each save is one transaction with an audit row (`Setting`, `UPDATE`, or `CREATE` the first time) with before and after; saving what is already saved writes nothing.
- T047-AC7: `401` signed out. Tests: create, replace, no-op save, validation edges, GSTIN state code, logo upload and removal, audit rows, `404`.

**DB collection definition:** `settings` (doc 03 §3.8).  **UI flow:** None yet.  **API flow:** as above.

**Files (intended)**
- New: `api/migrations/<date>-create-settings.mjs`, `api/src/settings/{settings.module.ts, business-profile.schema.ts, business-profile.service.ts, business-profile.controller.ts, business-logo.service.ts, dto/save-business-profile.dto.ts, business-profile.e2e.spec.ts}`
- Changed: `api/src/app.module.ts`; the GSTIN helper is reused from `customers/gstin.ts`

**Verification:** e2e tests; curl: 404, save, read, change prefix, logo.

---

### T048 — Business profile screen  ⬜

**Definition:** `/settings/business` lets staff enter and change the profile.

**Acceptance criteria**
- T048-AC1: A "Business" entry under a Settings item in the menu opens the page; it loads the profile (shared 404 handling does not apply: a missing profile shows an empty form with "Set up your business details before issuing invoices").
- T048-AC2: Fields: name, GSTIN (state shown as the person types, from the first two digits), address, invoice prefix, invoice footer, logo (same picker as customers).
- T048-AC3: Same rules as the API, with a shared samples test; messages on blur then while typing; API field errors shown on the field; "Saving…", no double submit; unsaved-changes confirm; success toast.
- T048-AC4: Works at 360 px.

**DB collection definition:** None.  **UI flow:** Menu → Settings → Business → Save.  **API flow:** T047.

**Files (intended)**
- New: `web/src/features/settings/{business-form.tsx, business-schema.ts(+test), business-page.tsx}`, `web/src/app/(app)/settings/business/page.tsx`, `web/src/lib/api/settings.ts`, `shared/business-rules.samples.json`, `api/src/settings/rules-samples.spec.ts`
- Changed: the navigation items file

**Verification:** unit tests; browser: empty state, save, edit, bad GSTIN, logo; 360 px.

---

### T049 — US19 check  ⬜

**Definition:** The story works end to end and is documented.

**Acceptance criteria**
- T049-AC1: API and web lint, typecheck, tests and build pass.
- T049-AC2: Browser walk-through against the mock database: open Business (empty state), save with GSTIN of one state, reload (values and derived state shown), change the prefix, set and remove the logo.
- T049-AC3: Docs updated (E06 criteria, Result sections).

**DB collection definition:** None.  **UI flow / API flow:** as T047 and T048.

**Files (intended):** none expected.

**Verification:** the walk-through above at 360 px and desktop width.
