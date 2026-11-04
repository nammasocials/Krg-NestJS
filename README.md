# Krg-NestJS

Migration of the Krg invoice-billing system (ASP.NET Core 10 + SQL Server + Angular 18) to **NestJS + MongoDB (Mongoose) + Next.js**, with uploads on local disk.

**Status:** E01 in progress — T001 done (`web/` scaffold running); API not started. PDFs are intentionally not generated until the PDF structure is agreed.

## Documents (`docs/`)

| File | Contents |
|---|---|
| [01-current-system-analysis.md](docs/01-current-system-analysis.md) | Existing stack, endpoints, data flows, DB inventory, 27 findings (bugs, security, performance) |
| [02-tech-stack.md](docs/02-tech-stack.md) | **Final** stack (decisions confirmed 2026-11-02), repo layout, old→new mapping, risks |
| [03-database-design.md](docs/03-database-design.md) | Optimized MongoDB design: collections, embedding vs references, indexes, transactions, trigger replacement, migration mapping, open questions |

### Backlog (step by step; only the current epic is detailed)

| File | Contents |
|---|---|
| [04-epics.md](docs/04-epics.md) | Roadmap E01–E08; E01 Layout and E02 Login & Authentication with descriptions and epic-level ACs |
| [05-user-stories.md](docs/05-user-stories.md) | E01 stories: US01 login layout, US02 layout after login (US03 planned) — with covered ACs and task list |
| [06-tasks.md](docs/06-tasks.md) | T001–T006: definition, ACs, DB, UI flow, API flow, files, verification |

Code locations: `web/` = Next.js UI, `api/` = NestJS API (pnpm monorepo in this folder; layout in doc 02 §4).

## Run (web)
`pnpm` is not installed globally on this machine; use corepack:
```bash
corepack pnpm install
corepack pnpm --filter web dev      # http://localhost:4000
corepack pnpm --filter web build
corepack pnpm --filter web lint
```
Copy `web/.env.example` to `web/.env.local` if you need to change values.

## Workflow
Implement a task → run → verify → mark Done. Story Done when all its tasks are Done; epic Done when all its stories are Done. Then detail the next epic.

## Next steps
1. Review E01 backlog (docs 04–06); then start T001.
2. Answer the open questions (doc 03 §8) before E02. Development uses the in-process MongoDB mock, switchable to a real database with `DB_MODE` (doc 02 §3.4); Q6 is now only about production hosting.
3. Define the PDF structure → generate PDFs from the Markdown files (not started).
4. Make the documents interactive (format to be decided).
