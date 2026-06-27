# Matt & Ian — Wedding Seating Chart 💍

A campy, wedding-themed web app to plan our reception seating: a floor-plan
visualizer with drag-and-drop, a smart auto-fill, group/subgroup splitting,
reserved placeholder tables for the in-law-managed groups, and shareable,
collaboratively-editable plans.

## Quick start

```bash
npm install
npm run dev   # http://localhost:3000 — a ?plan=<id> is created automatically
```

No database is needed for local dev: plans are saved as JSON under `.data/`
(gitignored). Production uses Vercel KV automatically when configured.

## Scripts

- `npm run dev` — dev server
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm test` — Vitest

## Persistence & sharing

- A plan is one JSON document keyed by an unguessable `planId` (URL `?plan=<id>`).
- `StorageAdapter` (`lib/store/types.ts`) has two implementations:
  - `LocalAdapter` — dev; files in `.data/plans/`.
  - `KvAdapter` — prod; Vercel KV, used automatically when `KV_REST_API_URL`
    and `KV_REST_API_TOKEN` are present.
- API: `GET`/`PUT /api/plan/:planId`, `POST /api/plan` (new id). Optimistic
  concurrency via a `version` field; the client polls every few seconds so
  collaborators see each other's edits.

## Deploy (Vercel)

1. Push to GitHub (public).
2. Import the repo at vercel.com → New Project.
3. Add a Redis store: Project → Storage → Create → (Upstash) Redis, then connect
   it. Vercel injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`.
4. Deploy, then share the URL (with `?plan=<id>`).

## Data model (`lib/types.ts`)

- **Guest** — one attending person.
- **Party** — the keep-together unit (couple/family). Never split across tables.
- **Group** — the 18 categories; flags `isPlaceholder` (in-law managed) and
  `isCouple` (Matt + Ian → sweetheart).
- **Subgroup** — a named subset of a group, for intentional splits.
- **Table** — `round` / `long` / `sweetheart`, `capacity`, `x`/`y` (0..100),
  optional `reservedForGroupId`.
- **Scenario** — a named arrangement: `partyId → { tableId, locked }`.
- **PlanDoc** — the whole document (guests, parties, groups, subgroups, tables,
  features, scenarios, `version`).

## Code map

- `lib/types.ts` — shared data model (stable contract).
- `lib/seed/*` — parsed guest list + seed builder.
- `lib/venue/layout.ts` — table positions / capacities + venue features.
- `lib/seating/index.ts` — auto-fill engine: `autoFill`, `balancedPartition`,
  `splitDownMiddle`.
- `lib/store/*` — persistence adapters + factory.
- `lib/plan/ops.ts` — pure `PlanDoc` mutation helpers.
- `lib/client/usePlan.ts` — SWR load/save hook.
- `app/api/plan/*` — REST endpoints.
- `app/page.tsx`, `components/*` — UI (floor plan, drag-and-drop).

Built with Next.js, React, Tailwind CSS, dnd-kit, and SWR.
