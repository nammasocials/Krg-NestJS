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

### T019 — Loading spinner and loading states  ⬜

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

---

### T020 — Toast notifications  ⬜

**Definition:** A small, accessible way to tell the user "saved", "failed", or "heads up" from anywhere.

**Acceptance criteria**
- T020-AC1: `ToastProvider` in the root layout and a `useToast()` hook with `success(message)`, `error(message)`, `info(message)` (optional title and duration).
- T020-AC2: Built on `@base-ui/react` Toast (already installed; no new package). Toasts appear top-right on wide screens and full width at the top on phones, never covering the header's Logout.
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

---

### T021 — Confirm popup  ⬜

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
