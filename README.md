# Mr. Baseball Dynasty

A deep baseball franchise dynasty simulator. Build your front office, draft prospects, make trades, and pursue championships across decades.

**[PLAY NOW](https://kevinbigham.github.io/MBD/)**

---

## What Is This?

Mr. Baseball Dynasty (MBD) is a browser-based, single-player baseball management sim. You take over as GM of a franchise and guide it through seasons of roster moves, scouting, player development, trades, free agency, and postseason runs. Every decision ripples forward through a fully deterministic simulation engine.

### Features

- **Full Season Simulation** -- Day-by-day sim with box scores, standings, and stat tracking
- **Scouting & Draft** -- Amateur draft, international free agents, scout assignments, prospect rankings
- **Player Development** -- Minor league system, development curves, attribute progression
- **Trade Engine** -- AI-driven trade proposals, counter-offers, deadline deals
- **Free Agency** -- Bidding, contract negotiations, salary cap management
- **GM Career Mode** -- Get hired, get fired, build a legacy across multiple franchises
- **History & Records** -- Hall of Fame, record books, season archives, dynasty cards
- **Press Room** -- Generated narratives, story arcs, press conferences
- **War Room Visualizations** -- Recharts-powered charts, radar plots, sparklines, drag-and-drop lineup builder
- **PWA Support** -- Install as an app on desktop or mobile, works offline
- **Deterministic Engine** -- Seeded RNG means every save produces identical results on replay

## Tech Stack

- **Frontend:** React 18, TypeScript (strict), Vite 6, Tailwind CSS
- **State:** Zustand stores, Dexie (IndexedDB) for saves
- **Simulation:** Pure TypeScript engine running in a Web Worker via Comlink
- **Visualization:** Recharts, @dnd-kit
- **Design:** Bloomberg Terminal aesthetic with custom design tokens
- **Testing:** Vitest (700+ tests across sim-core and web app)
- **Monorepo:** pnpm workspaces + Turborepo

## Architecture

```
mr-baseball-dynasty/
  apps/web/              React frontend (17 feature pages)
  packages/sim-core/     Pure simulation engine (no DOM, no React)
  packages/contracts/    Zod schemas shared between packages
  packages/sim-worker/   Web Worker bridge (Comlink)
  packages/ui/           Shared UI component library
  packages/design-tokens/ Color, typography, spacing tokens
```

## Development

```bash
# Prerequisites: Node 20+, pnpm 9+
pnpm install
pnpm dev          # Start dev server (apps/web)
pnpm test         # Run all tests
pnpm build        # Production build
```

## License

Private project. All rights reserved.
