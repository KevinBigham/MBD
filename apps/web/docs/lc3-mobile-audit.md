# LC-3 Mobile Audit

Date: 2026-04-28
Branch: `codex/launch-candidate-mobile-survival-lc3`
Baseline: `1b51d2e`
Viewport audited: `375x667` portrait in Chromium via Playwright CLI

## Pre-Fix Method

- Started Vite at `http://127.0.0.1:5173/MBD/`.
- Created and continued a Quick Start save through the setup flow.
- Navigated primary app routes client-side so Zustand/worker state remained initialized.
- Measured visible interactive elements with `getBoundingClientRect()`.
- Treated any visible target below `44x44` as FAIL.
- Treated any visible `input`, `select`, or `textarea` with computed font size below `16px` as FAIL for iOS focus zoom.

## Viewport Meta

Existing `apps/web/index.html` viewport meta:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

Verdict: BORDERLINE. It does not disable user scaling, which is correct for accessibility, but it is missing `viewport-fit=cover`.

## Route Inventory

| Route | Smallest measured target | Input font < 16px | 375px portrait screenshot description | Verdict |
| --- | ---: | ---: | --- | --- |
| Setup / Save Hub (`/`) | `New Dynasty` `138x34`; save-slot actions `34px` high | 0 | Welcome card and save slots stack cleanly with no document horizontal scroll. All primary save actions are short desktop-height buttons. | FAIL |
| Quick Start Onboarding (`/onboarding`) | Guided nudge dismiss `26x26`; primary CTA `193x34` | 0 | Quick Start recap fills the viewport, guided-start nudge is reachable at the bottom, no horizontal scroll. Nudge close is too small. | FAIL |
| Dashboard / Game Day (`/dashboard`) | Help `24x24`; command `36x28`; settings `32x32`; card links `16-30px` high | 0 | Header, bottom nav, sim dock, and dashboard cards render in a single-column portrait stack with no document horizontal scroll. Many card micro-actions are too small. | FAIL |
| Roster (`/roster`) | Page help `20x20`; tabs `34-36px` high; player links `17px` high; action buttons `26px` high | 0 | Roster page renders without document horizontal scroll, but tab strip is wider than the viewport and effectively clipped inside the content area. | FAIL |
| Draft (`/draft`) | Page help `20x20`; route shortcuts `28px`; unavailable-state CTA `34px` | 0 | Draft unavailable state is readable in portrait with no document horizontal scroll. Help and route shortcut actions are too small. | FAIL |
| Trade (`/trade`) | Page help `20x20`; team/select inputs `36-37px` high | 3 | Trade center stacks into portrait without document horizontal scroll. Select/search controls use 13px text and 36px height. | FAIL |
| League Standings (`/league/standings`) | Page help `20x20`; route shortcut links `28px` | 0 | Standings divisions stack vertically and remain readable at 375px. Secondary navigation links are undersized. | FAIL |
| Players Directory (`/players`) | Search input `343x40`; command `36x28`; settings `32x32` | 1 | Players page is readable with no document horizontal scroll. Search input is below iOS-safe font size and below 44px height. | FAIL |
| Player Profile (`/players/:playerId`) | Back link `119x18`; tabs `36-37px` high | 0 | Profile header and tabs render without document horizontal scroll. Back link and tab triggers are below the 44px tap-target floor. | FAIL |
| Schedule (`/schedule`) | Help `24x24`; command `36x28`; settings `32x32` | 0 | Schedule screen renders cleanly in portrait with no document horizontal scroll. Top-bar icon actions are undersized. | FAIL |
| Press Room (`/press-room`) | Help `24x24`; filters `309x36` | 3 | Press Room columns stack correctly and avoid document horizontal scroll. Three filter selects are 12px and 36px high. | FAIL |
| GM Career (`/career`) | Help `24x24`; command `36x28`; settings `32x32` | 0 | GM Career hub is readable in portrait with no document horizontal scroll. Top-bar icon actions are undersized. | FAIL |
| History (`/history`) | Help `24x24`; filters `38x28`; tabs `34px` high | 2 | History cards stack in portrait. Select controls and history tab buttons are below target size and font-size floor. | FAIL |
| Settings (`/settings`) | Range sliders `293x16`; command `36x28`; settings `32x32` | 4 | Settings sections stack cleanly. Range sliders are too short; selects and branch-name input are below 16px font. | FAIL |

## Modal And Sheet Inventory

| Surface | Smallest measured / code-inspected target | Backdrop / dismissal | Portrait behavior | Verdict |
| --- | ---: | --- | --- | --- |
| Command Palette | Search input `373x43` at 13px; command rows `32px` high by code | Backdrop tap closes; Escape closes | Opens centered, but lacks `role="dialog"` / `aria-modal` and input font triggers iOS zoom. | FAIL |
| Mobile More sheet | Close `28x28`; nav links are approximately `44px+` | Backdrop tap closes; close button exists; Escape did not close in the manual run | Sheet is reachable in portrait, but close button is undersized. | FAIL |
| Page Help | Close `18x18`; help opener `20-24px` | Backdrop tap and Escape close | Dialog is reachable, but open/close affordances are too small. | FAIL |
| Pennant Race modal | Close `30x30` | Backdrop tap and Escape close | Code uses `fixed inset-0`, but it is rendered inside `PageShell`; current `translate-y-0` transform can make fixed overlays use the page shell as containing block. | FAIL |
| Award Race modal | Close `30x30` | Backdrop tap and Escape close | Same `PageShell` containing-block issue as Pennant Race. Measured dialog rect after deep-scroll: `x=16`, `y=-3822`, `height=6023.5`. | FAIL |
| Career Retrospective card | Links `16px` high (`GM dossier`, season story triggers when present) | N/A | Card renders in portrait; story-reel trigger links/buttons are too small when data exists. | FAIL |
| Season Story Reel modal | Close `p-1.5`; prev/next `p-1` by code inspection | Backdrop tap and Escape close | Modal has scrollable body and width cap, but close/prev/next controls are below 44px and inherit PageShell fixed-position risk when mounted from dashboard cards. | FAIL |
| Save Recovery dialog | Close `p-2`; primary actions `py-3` | Escape closes when not busy; close button exists | Dialog is likely reachable, but icon close is below 44px by class contract. | BORDERLINE |

## Inputs Below 16px

- `apps/web/src/features/setup/routes/SetupPage.tsx`
  - Difficulty `select`: `text-sm`, measured 13px.
  - GM name `input`: `text-sm`, measured 13px when wizard is open.
- `apps/web/src/features/players/routes/PlayersPage.tsx`
  - Player search `input`: measured 13px.
- `apps/web/src/features/trade/routes/TradePage.tsx`
  - Team `select`: measured 13px.
  - Two trade search inputs: measured 13px.
- `apps/web/src/features/press-room/routes/PressRoomPage.tsx`
  - Team/type/tag `select` filters: measured 12px.
- `apps/web/src/features/history/routes/HistoryPage.tsx`
  - Two compact `select` controls: measured 12px.
- `apps/web/src/features/settings/routes/SettingsPage.tsx`
  - Sim speed/default stat view/table density `select`s: measured 13px.
  - Branch-name `input`: measured 13px.
- `apps/web/src/app/layout/CommandPalette.tsx`
  - Command search input: measured 13px.

## Existing Test Oracle

- `apps/web/src/app/layout/AppLayout.test.tsx` covers mobile navigation, sidebar/sheet behavior, route layout, and sim controls.
- `apps/web/src/app/layout/CommandPalette.test.tsx` covers command palette rendering/navigation but does not currently assert dialog semantics or mobile input font class.
- `apps/web/src/features/setup/routes/SetupPage.test.tsx` covers setup wizard/save-slot flow and can assert mobile-safe input/select classes.
- `apps/web/src/features/dashboard/routes/DashboardPage.test.tsx` covers dashboard card rendering and guided-start nudges.
- `apps/web/src/features/dashboard/components/PennantRaceModal.test.tsx` and `AwardRaceModal.test.tsx` cover modal rendering and can assert 44px close buttons/backdrop dismissal.
- `apps/web/src/features/dashboard/components/SeasonStoryReelModal.test.tsx` covers season-story modal behavior and can assert close/prev/next target classes.
- `apps/web/src/features/dashboard/components/CareerRetrospectiveCard.test.tsx` covers the card and story-reel opener path.
- `apps/web/src/features/save-recovery/__tests__/SaveRecoveryDialog.test.tsx` covers escape behavior and dialog semantics.
- `apps/web/src/shared/components/PageShell.test.tsx` covers the page shell class contract and is the right oracle for removing persistent transforms from entered pages.
- `apps/web/src/shared/components/ResponsiveTable.test.ts` covers mobile table/card behavior, but jsdom does not catch real pixel overflow.

Current gap: existing tests mostly assert rendering, not the 44px/touch/font-size class contracts. LC-3 should add class-contract tests for shared/top-level primitives and representative route forms.

## Pre-Fix Root Causes

- Most hand-rolled action controls use `px-3 py-1.5` or `px-3 py-2`, producing 28-37px targets.
- Top bar icon controls use `p-1` / `p-1.5`, producing 20-36px targets.
- `@mbd/ui` `Button` and `TabsTrigger` are below 44px (`h-8`, `h-9`, `h-10`, `py-2`), but package files are outside this LC-3 edit radius. Web app wrappers/classes must compensate unless Kevin widens scope.
- `PageShell` leaves `translate-y-0` on entered content, which creates a persistent CSS transform containing block. Fixed overlays mounted inside route cards can be positioned relative to the route content rather than the viewport.
- Compact filter controls use `text-xs` / `text-sm`; the design system resolves those to 12-13px in this app, which triggers iOS Safari focus zoom.

## Post-Fix Verdict

Post-fix browser sweep:

- Viewports: `375x667`, `360x640`, `414x896`.
- Method: reopened the Quick Start save, stayed inside the initialized SPA, changed routes client-side, and measured visible interactive elements with `getBoundingClientRect()`.
- Route result: every measured primary route had `overflowX=0`, `badCount=0` for visible targets below `44x44`, and `inputFontBelow16=0` at all three viewport sizes.
- Player profile result: `/players/f589431b-a8a0-49e6-a688-15c64220fe71` measured separately at `375x667` with `overflowX=0`, `badCount=0`, and `inputFontBelow16=0`.
- Overlay result: Command Palette, Mobile More sheet, and Page Help measured at `375x667` with zero undersized visible controls and zero inputs below 16px; Command Palette backdrop tap dismissed; Mobile More Escape dismissed; Page Help backdrop tap dismissed.
- Dashboard race/story modals were not available in the day-zero browser save, so their final verdict uses component tests plus the shared `PageShell` fixed-overlay class contract.

Updated `apps/web/index.html` viewport meta:

```html
<meta name="viewport" content="viewport-fit=cover, width=device-width, initial-scale=1.0" />
```

| Route | Post-fix measurement | Screenshot description at `375x667` | Verdict |
| --- | --- | --- | --- |
| Setup / Save Hub (`/`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Welcome and save slots stack cleanly; primary actions are 44px+ touch targets. | PASS |
| Quick Start Onboarding (`/onboarding`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Quick Start recap remains reachable; nudge and CTA controls meet the tap floor. | PASS |
| Dashboard / Game Day (`/dashboard`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Header, bottom nav, sim controls, and first dashboard stack are clean in portrait. | PASS |
| Roster (`/roster`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Tabs and player links are reachable without document horizontal scroll. | PASS |
| Draft (`/draft`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Unavailable-state content and route shortcuts remain stacked and touch-safe. | PASS |
| Trade (`/trade`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Trade controls stack in portrait; selects/search inputs use the 16px mobile font floor. | PASS |
| League Standings (`/league/standings`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Division blocks remain readable; secondary nav links are 44px+ targets. | PASS |
| Players Directory (`/players`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Search field keeps 44px height and 16px computed font size on mobile. | PASS |
| Player Profile (`/players/:playerId`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Back link, tabs, and profile controls render without cutoff or undersized targets. | PASS |
| Schedule (`/schedule`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Schedule content and top actions remain touch-safe in portrait. | PASS |
| Press Room (`/press-room`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Filter controls stack/read cleanly and compute to 16px font at 414px and below. | PASS |
| GM Career (`/career`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Career hub remains readable with top actions at the tap floor. | PASS |
| History (`/history`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | History filters/tabs are touch-safe and avoid document horizontal scroll. | PASS |
| Settings (`/settings`) | `overflowX=0`, `badCount=0`, `inputFontBelow16=0` | Settings sections stack cleanly; sliders/selects/input controls are mobile-safe. | PASS |

| Surface | Post-fix evidence | Verdict |
| --- | --- | --- |
| Command Palette | Browser measured zero undersized targets / zero low-font inputs; `role="dialog"` + `aria-modal="true"`; backdrop tap dismissed. | PASS |
| Mobile More sheet | Browser measured zero undersized visible targets; close button is 44px+; Escape dismissed. | PASS |
| Page Help | Browser measured zero undersized visible targets; backdrop tap dismissed. | PASS |
| Pennant Race modal | Close button has `min-h-11 min-w-11`; backdrop/Escape tests pass; `PageShell` no longer leaves a fixed-overlay-breaking transform. | PASS |
| Award Race modal | Close button has `min-h-11 min-w-11`; backdrop/Escape tests pass; `PageShell` no longer leaves a fixed-overlay-breaking transform. | PASS |
| Career Retrospective card | Dashboard route sweep reports zero undersized visible links/buttons; shared mobile CSS covers anchor/button tap floors. | PASS |
| Season Story Reel modal | Close/prev/next controls have `min-h-11 min-w-11`; backdrop/Escape tests pass; `PageShell` fixed-overlay contract is green. | PASS |
| Save Recovery dialog | Global mobile control floor covers the close/action buttons; existing dialog semantics and dismissal tests remain green. | PASS |
