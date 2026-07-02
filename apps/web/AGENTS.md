# Web Application Rules

These instructions extend the repository root `AGENTS.md` for `apps/web`.

## UI-to-save contract

- Trace every changed action through UI -> worker mutation -> exact post-mutation snapshot -> active save ID -> IndexedDB -> hard reload -> visible result.
- Never display `Saved` from a timer, optimistic mutation result, snapshot export, or queued write. Display it only after durable persistence of the latest desired snapshot.
- Persistence failures must be visible and recoverable without rerunning the gameplay action.
- If the user changes saves while a write is pending, never persist the old snapshot into the new save slot.
- Prefer one explicit, testable persisted-mutation executor/coordinator over copied call-site logic. Do not hide mutation semantics behind a proxy unless Comlink binding, typing, no-op behavior, and coverage are proven.

## Browser proof

- Add stable test IDs only where semantic locators are insufficient.
- High-emotion mutations require real IndexedDB reload tests, not only mocked unit tests.
- Test failure injection, burst ordering, stale-write prevention, old-save load, and import/export when relevant.
- Verify the touched experience in Chromium and at 375x667 or the repository's established mobile viewport.
- Preserve PWA behavior; do not move mutation ownership into a service worker or background sync.

## UI quality

- Use text plus state, not color alone.
- Save errors use assertive announcement; normal save progress uses polite announcement.
- Extend existing routes and components. No new route unless the active goal explicitly authorizes it.
- Prefer worker DTOs/shared contracts over new direct runtime imports from simulation internals. Do not launch a broad import cleanup inside a feature slice.
