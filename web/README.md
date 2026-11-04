# web — Krg Invoice Manager UI

Next.js (App Router) + Tailwind 4 + shadcn/ui. See `../docs/02-tech-stack.md` and `../docs/06-tasks.md`.

```bash
corepack pnpm --filter web dev        # http://localhost:4000
corepack pnpm --filter web build
corepack pnpm --filter web lint
corepack pnpm --filter web typecheck
```

Config: copy `.env.example` to `.env.local`. `API_BASE_URL` (default `http://localhost:5000`) is where `/api/*` is forwarded.
