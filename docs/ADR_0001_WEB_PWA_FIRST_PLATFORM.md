# ADR 0001: Web/PWA-First Platform for v1

Date: 2026-06-18

## Status

Accepted for v1.

## Context

Mr. Baseball Dynasty is targeting a genuine v1 release as a hardcore-first single-player GM sim. The locked v1 direction is desktop browser first, responsive tablet/mobile browser second, and installable/offline-capable PWA as the release platform. A future desktop or Steam build is allowed, but it must not block web v1 or force a wrapper into this release.

The current app already has the right platform foundation:

- Vite web app under the `/MBD/` base path.
- `vite-plugin-pwa` manifest and Workbox service-worker generation in `apps/web/src/build/pwaConfig.ts`.
- Manual service-worker registration/update handling in `apps/web/src/build/registerServiceWorker.ts`.
- Install prompt state in `apps/web/src/features/settings/hooks/useSettingsInstallPrompt.ts`.
- Browser-local save, import/export, autosave, branch, and recovery surfaces under `apps/web/src/shared/lib` and Settings.
- Worker-canonical simulation state, with Zustand kept as the UI mirror.

## Decision

Ship v1 as a browser app plus installable PWA. Do not add Electron, Tauri, Steamworks, native file-system APIs, or desktop packaging for v1.

Keep future desktop/Steam optional by maintaining these seams:

- Runtime shell: web boot, routing, service-worker registration, install prompt, and update toasts stay in `apps/web/src/build`, `apps/web/src/app`, and Settings UI. They must not leak into sim-core.
- Persistence: saves remain import/exportable browser data through the existing save system. Any future native wrapper should call a platform adapter around save import/export rather than changing `GameSnapshot`.
- Simulation: worker remains canonical. Desktop shells may host the same worker bundle or a worker-equivalent runtime, but sim-core remains UI-agnostic and seeded.
- Content: authored v1 content stays in versioned compact worker content packs. Future desktop builds can cache the same content chunks; they should not fork content format.
- Assets: original scalable logo fallbacks and PWA icons are web assets first. Future desktop packaging can reuse them or add store-specific icons without changing team IDs or save data.

## Current v1 Platform Gates

Automated gates:

- `npx --yes pnpm@9.15.4 --filter @mbd/web exec vitest run src/build/pwaConfig.test.ts src/build/registerServiceWorker.test.ts src/build/deadChunkReload.test.ts src/features/settings/hooks/useSettingsInstallPrompt.test.tsx --reporter=verbose`
- `npx --yes pnpm@9.15.4 --filter @mbd/web build`
- `npx --yes pnpm@9.15.4 --filter @mbd/web exec vitest run src/build/bundleConfig.test.ts src/build/bundleBudget.test.ts --reporter=verbose`
- Full release gates from `docs/CODEX_RELEASE_CHECKLIST.md`.

Manual/browser gates:

- Desktop browser smoke: create a new dynasty, quick sim, autosave, reload, export/import, and confirm no critical console errors.
- Mobile/tablet responsive smoke: Save Hub, Dashboard, Roster/Minors, Trade, Draft/Scouting, History, and Settings.
- PWA installability smoke: install prompt or browser install affordance, standalone display mode, app icon presence, update toast on service-worker controller change, and usable Settings install status.
- Offline smoke: after a built app has loaded once, reload while offline and confirm shell/new-game path still loads from the service worker. Existing saves must remain recoverable through browser storage/import.

## Consequences

- v1 release work should improve browser/PWA reliability before any native wrapper work.
- Platform-specific code must stay at the app shell boundary. Sim-core, contracts, calibration, and content generation must stay platform-neutral.
- PWA/offline checks are release blockers, but a desktop/Steam wrapper is not.
- Future desktop/Steam work can start from this ADR by adding a new ADR for packaging, updater, file-system save import/export, and storefront constraints.

## Non-Goals For v1

- No pitch-by-pitch manager mode.
- No native desktop wrapper.
- No Steam SDK integration.
- No platform-specific save schema.
- No hidden AI bonuses tied to platform or difficulty.
