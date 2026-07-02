# MBD Wiring Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Verdict

Status: YELLOW for save/mutation wiring in the current dirty tree, YELLOW for domain wiring.

The initial wiring failures were disconnected contracts between UI actions, worker mutations, saved state, and player-visible copy. The current dirty tree now wires draft, app-shell overlay, press, and readiness fixes with focused tests passing. The remaining wiring problems are deeper: development, mentorship, and AI identity have substantial logic/read-models, but the player cannot always act on them or see CPU organizations using them symmetrically.

## Required Wiring Cases

| Case type | Finding | Evidence | Status |
|---|---|---|---|
| UI exists but simulation does not | Dirty-tree development focus advice now has an `Apply plan` mutation path; broader playing-time/mentorship controls remain. | `sim.worker.pipeline.ts:188-270`, `sim.worker.actions.ts`, `MinorsPage.tsx`. | YELLOW |
| Simulation exists but UI does not | AI/user identity and development effects exist, but AI org profiles are not clearly surfaced. | `sim.worker.frontOfficeIdentity.ts`, `draftAI.ts`. | YELLOW |
| Data exists but nothing consumes it | Authored minors content is consumed for new games only; old saves do not consume upgrade content. | `CHANGELOG.md:7-10`, `sim.worker.setup.ts:256-264`. | YELLOW |
| Logic exists but player never sees result | Press response now autosaves in dirty tree, but visible consequence refresh/close behavior still needs browser validation. | `AppLayout.tsx`, `sim.worker.actions.ts:2139-2220`. | YELLOW |
| Minor league systems not meaningfully surfaced | Minors are surfaced, but plan/playing-time/mentor controls are thin. | `/minors`, pipeline, mentorship query. | YELLOW |
| Scouting data does not drive decisions | Scouting route is strong; dirty-tree draft scouting autosave now passes focused tests, but draft save-status UI and reload smoke remain. | `useScoutingPageController.ts:109-194`, `useDraftActionHandlers.ts:104-135`. | YELLOW |
| Draft logic does not connect to development | Draftees enter systems, but post-draft development controls/CTAs are weak. | Draft handlers and development-control search. | YELLOW |
| Player history not preserved/displayed | v34 preserves future archives; old saves migrate empty. | `save.ts:2808-2828`, history queries. | YELLOW |
| Save data written but never read/read but never written | Dirty-tree app-shell overlay autosave now passes focused tests and broad gates; browser reload smoke remains. | `AppLayout.tsx`, `AppLayoutShellAutosave.test.tsx`, `monthlyPulse.ts:458-490`, `snapshot.ts`. | YELLOW |
| Similar values calculated differently | Dirty-tree readiness normalization now presents 20-80 OVR grades; DTO naming cleanup remains. | `prospectReadiness.ts`, `dashboardPageTransforms.ts`, `FarmReportCardBody.tsx`. | YELLOW |

## Save And Mutation Trust Matrix

| Mutation area | Save/persistence evidence | Result |
|---|---|---|
| New game setup | `useSetupActionHandlers.ts:224` calls `saveGame`; tests assert v34 snapshot. | GREEN |
| Onboarding continuation/completion | Controller uses `saveGame`/`saveGameById`. | GREEN |
| App-shell sim controls | `AppLayout.tsx:180-199` persists after sim. | GREEN |
| Monthly report/decision/ceremony overlays | Dirty-tree `persistShellMutation` saves after report, decision, and ceremony mutations; focused tests passed. | YELLOW |
| Press responses | Dirty-tree `handlePressConferenceResponse` responds and persists; focused test passed. | YELLOW |
| Dashboard actions | `useDashboardActionHandlers.ts` calls autosave for relevant mutations. | GREEN |
| Roster actions | Roster route passes `useActiveSaveAutosave`; tests assert autosave. | GREEN |
| Player profile actions | `usePlayerProfileActions.ts` autosaves existing actions. | GREEN |
| Staff actions | `useStaffActionHandlers.ts` autosaves successful staff actions. | GREEN |
| Scouting route actions | `useScoutingPageController.ts:117`, `139`, `164`, `187` autosave. | GREEN |
| Draft room actions | Dirty-tree `useDraftActionHandlers.ts` autosaves start/pick/scout/toggle/sign/sim-rest; focused tests passed. | YELLOW |
| Trade actions | `useTradeSnapshotPersistence.ts` schedules autosave/save by id. | GREEN |
| News read state | `useNewsRouteData.ts:98-166` persists active save after marking read. | GREEN |
| Free agency | `useFreeAgencyOfferActions.ts:72` autosaves. | GREEN |
| Offseason | `useOffseasonActionHandlers.ts:59` and controller paths autosave. | GREEN |
| Settings save/import | `useSettingsSaveData.ts` handles manual saves/import. | GREEN |

## Worker Boundary Findings

| Severity | Finding | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| P1 | 56 non-worker non-test web files import `@mbd/sim-core`. | Static import scan. | UI is coupled to sim internals despite guide preference for worker DTOs. | Prioritize runtime-value imports for conversion to worker DTOs/shared contracts. |
| P2 | `useWorker` mutation list does not imply persistence. | `useWorker.ts:34-96`, `148-152`. | Future agents can mistake worker action success for save safety. | Document/save-policy every mutation lane or centralize mutation persistence. |
| P2 | Large worker modules cluster wiring risk. | `sim.worker.helpers.ts` 5,468 lines; `queries.ts` 5,024; `actions.ts` 3,130; `trade.ts` 3,628. | Fixes cross domains and are hard to review. | Split only around active product slices. |

## Highest Priority Wiring Fixes

1. Full-gate and browser-reload validation for dirty-tree draft/app-shell/press/readiness fixes.
2. Browser validation and ownership review for the dirty development advice-to-action mutation.
3. Mentorship persistence or clear read-only labeling.
4. AI organization identity wiring across draft/development/trade/payroll.
5. Worker-boundary import cleanup for runtime-value imports.
