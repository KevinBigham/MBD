# Codex Source Atlas for Mr. Baseball Dynasty

Generated from the current `/Users/tkevinbigham/Downloads/MBD-main` snapshot on 2026-06-10. Line counts touched by GOAT implementation slices are updated through the 2026-06-18 v34 archive slice.

This atlas is exhaustive for files returned by `rg --files apps/web/src packages -g '!**/tsconfig.tsbuildinfo'` at generation time. It is a navigation aid, not a substitute for reading current source before editing.

## Totals

- Files listed: 1319.
- Lines counted: 275757.
- Groups: 82.

## How To Use

- Start with `docs/CODEX_GAME_GUIDE.md` for architecture and risk rules.
- Use `docs/CODEX_IMPROVEMENT_PLAN.md` to decide which area to improve next and what tests/docs to update.
- Use this atlas to locate every current source, test, schema, worker, route, and package file.
- Use `docs/CODEX_RELEASE_CHECKLIST.md` when the work is moving from focused implementation into demo/release readiness.
- `Exports / notes` is extracted mechanically. Empty exports usually mean route-local helpers, test files, CSS, snapshots, or config.
- Line counts are current snapshot counts only; rerun the source scan after large changes.

## Group Summary

| Files | Lines | Group |
| ---: | ---: | --- |
| 47 | 42222 | `apps/web/src/workers` |
| 142 | 35705 | `packages/sim-core/tests` |
| 132 | 17117 | `apps/web/src/features/dashboard` |
| 90 | 13695 | `apps/web/src/features/trade` |
| 26 | 9911 | `packages/sim-core/src/narrative` |
| 94 | 12415 | `apps/web/src/features/history` |
| 20 | 6752 | `packages/sim-core/src/onboarding` |
| 15 | 5593 | `packages/contracts/src/schemas` |
| 19 | 5493 | `packages/sim-core/src/player` |
| 46 | 7223 | `apps/web/src/features/roster` |
| 8 | 5308 | `packages/sim-core/src/moments` |
| 46 | 6933 | `apps/web/src/features/players` |
| 21 | 5431 | `packages/contracts/tests` |
| 16 | 4364 | `apps/web/src/app/layout` |
| 14 | 4181 | `packages/sim-core/src/league` |
| 22 | 3791 | `apps/web/src/features/settings` |
| 38 | 3885 | `apps/web/src/shared/components` |
| 17 | 3611 | `apps/web/src/shared/lib` |
| 33 | 4630 | `apps/web/src/features/onboarding` |
| 7 | 3592 | `packages/sim-core/src/roster` |
| 30 | 5188 | `apps/web/src/features/draft` |
| 34 | 4825 | `apps/web/src/features/offseason` |
| 20 | 4487 | `apps/web/src/features/setup` |
| 8 | 2424 | `packages/sim-core/src/sim` |
| 6 | 2410 | `packages/sim-core/src/trade` |
| 28 | 3577 | `apps/web/src/features/scouting` |
| 14 | 2086 | `apps/web/src/shared/hooks` |
| 5 | 1739 | `packages/sim-core/src/scouting` |
| 3 | 1561 | `packages/sim-core/src/finance` |
| 1 | 1464 | `packages/sim-core/src` |
| 8 | 1964 | `apps/web/src/features/assistant` |
| 14 | 2054 | `apps/web/src/features/front-office` |
| 18 | 2596 | `apps/web/src/features/free-agency` |
| 5 | 1242 | `packages/sim-core/src/stats` |
| 8 | 1464 | `apps/web/src/features/gm-career` |
| 6 | 1085 | `packages/sim-core/src/draft` |
| 16 | 2402 | `apps/web/src/features/press-room` |
| 10 | 1059 | `apps/web/src/features/save-recovery` |
| 11 | 1424 | `apps/web/src/features/schedule` |
| 6 | 2321 | `packages/sim-core/playtest-output` |
| 24 | 2887 | `apps/web/src/features/staff` |
| 9 | 930 | `apps/web/src/build` |
| 20 | 2094 | `apps/web/src/features/minors` |
| 13 | 1427 | `apps/web/src/features/finance` |
| 9 | 1358 | `apps/web/src/features/news` |
| 12 | 1399 | `apps/web/src/features/league` |
| 6 | 1073 | `apps/web/src/features/pulse` |
| 4 | 596 | `packages/sim-core/src/scenarios` |
| 8 | 1135 | `apps/web/src/features/achievements` |
| 11 | 1565 | `apps/web/src/features/playoffs` |
| 11 | 1043 | `apps/web/src/features/stats` |
| 1 | 535 | `packages/contracts/src` |
| 6 | 974 | `apps/web/src/features/scenarios` |
| 2 | 466 | `apps/web/src/app/boot` |
| 6 | 676 | `apps/web/src/features/rivalries` |
| 4 | 398 | `packages/sim-core` |
| 3 | 376 | `packages/sim-core/src/math` |
| 1 | 1186 | `packages/sim-core/src/calibration` |
| 2 | 356 | `apps/web/src/app/routes` |
| 6 | 842 | `apps/web/src/features/records` |
| 1 | 327 | `packages/sim-core/src/invariants` |
| 1 | 319 | `packages/sim-core/src/career` |
| 3 | 270 | `apps/web/src/app/providers` |
| 4 | 247 | `packages/ui/src/primitives` |
| 3 | 239 | `packages/sim-core/src/sharing` |
| 7 | 232 | `packages/design-tokens/src` |
| 2 | 194 | `apps/web/src/app` |
| 1 | 193 | `packages/sim-core/src/timeline` |
| 1 | 178 | `packages/sim-core/src/performance` |
| 3 | 157 | `packages/ui/src/data-display` |
| 1 | 289 | `apps/web/src/shared/touch` |
| 2 | 126 | `apps/web/src` |
| 2 | 102 | `packages/ui/src/layout` |
| 2 | 79 | `packages/ui/src` |
| 1 | 61 | `packages/ui/src/navigation` |
| 2 | 46 | `packages/ui` |
| 1 | 39 | `packages/contracts/src/dto` |
| 2 | 33 | `packages/contracts` |
| 2 | 27 | `packages/design-tokens` |
| 1 | 16 | `apps/web/src/shared/types` |
| 1 | 7 | `packages/ui/src/lib` |

## File Atlas

### apps/web/src

Files: 2. Lines: 126.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 109 | `apps/web/src/globals.css` | style |
| 17 | `apps/web/src/main.tsx` | - |

### apps/web/src/app

Files: 2. Lines: 194.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 139 | `apps/web/src/app/App.test.tsx` | test |
| 55 | `apps/web/src/app/App.tsx` | App |

### apps/web/src/app/boot

Files: 2. Lines: 466.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 284 | `apps/web/src/app/boot/AppBootGate.test.tsx` | test |
| 182 | `apps/web/src/app/boot/AppBootGate.tsx` | AppBootGate |

### apps/web/src/app/layout

Files: 16. Lines: 4364.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 1374 | `apps/web/src/app/layout/AppLayout.test.tsx` | test |
| 529 | `apps/web/src/app/layout/AppLayout.tsx` | AppLayout |
| 135 | `apps/web/src/app/layout/CommandPalette.test.tsx` | test |
| 307 | `apps/web/src/app/layout/CommandPalette.tsx` | CommandPalette |
| 174 | `apps/web/src/app/layout/MomentCardOverlay.test.tsx` | test |
| 200 | `apps/web/src/app/layout/MomentCardOverlay.tsx` | MomentCardOverlay |
| 273 | `apps/web/src/app/layout/MonthlyPulseOverlay.tsx` | MonthlyPulseOverlay |
| 82 | `apps/web/src/app/layout/seasonFlow.ts` | SeasonFlowStanding, SeasonFlowPreviewTeam, SeasonFlowPreviewSeries, SeasonFlowChampionSummary, SeasonFlowSeasonSummary, SeasonFlowOffseasonSummary, SeasonFlowState, SeasonFlowStatus, SeasonFlowAction |
| 221 | `apps/web/src/app/layout/SeasonFlowCard.tsx` | SeasonFlowCard |
| 151 | `apps/web/src/app/layout/Sidebar.test.tsx` | test |
| 309 | `apps/web/src/app/layout/Sidebar.tsx` | MobileTabBar, Sidebar |
| 133 | `apps/web/src/app/layout/SimControls.tsx` | SimControls |
| 123 | `apps/web/src/app/layout/TickerBar.test.tsx` | test |
| 93 | `apps/web/src/app/layout/TickerBar.tsx` | TickerBar |
| 119 | `apps/web/src/app/layout/TopBar.test.tsx` | test |
| 154 | `apps/web/src/app/layout/TopBar.tsx` | TopBar |

### apps/web/src/app/providers

Files: 3. Lines: 270.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 124 | `apps/web/src/app/providers/ErrorBoundary.test.tsx` | test |
| 114 | `apps/web/src/app/providers/ErrorBoundary.tsx` | ErrorBoundary |
| 32 | `apps/web/src/app/providers/RouteErrorBoundary.tsx` | RouteErrorBoundary |

### apps/web/src/app/routes

Files: 2. Lines: 356.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 166 | `apps/web/src/app/routes/index.test.tsx` | test |
| 190 | `apps/web/src/app/routes/index.tsx` | route; AppRoutes |

### apps/web/src/build

Files: 9. Lines: 930.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 87 | `apps/web/src/build/bundleBudget.test.ts` | test |
| 43 | `apps/web/src/build/bundleConfig.test.ts` | test |
| 203 | `apps/web/src/build/bundleConfig.ts` | isChartBundleFile, isWorkerBundleFile, resolveAppManualChunk, resolveWorkerManualChunk, getBudgetForBundleFile, MAIN_THREAD_CHUNK_BUDGET_BYTES, MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES, WORKER_CHUNK_BUDGET_BYTES, WORKER_CHUNK_GZIP_BUDGET_BYTES, WORKER_STORY_CHUNK_BUDGET_BYTES, WORKER_STORY_CHUNK_GZIP_BUDGET_BYTES, WORKER_CORE_CHUNK_GZIP_BUDGET_BYTES, CHART_CHUNK_BUDGET_BYTES, CHART_CHUNK_GZIP_BUDGET_BYTES, BundleBudget |
| 149 | `apps/web/src/build/deadChunkReload.test.ts` | test |
| 176 | `apps/web/src/build/deadChunkReload.ts` | isDeadChunkLoadFailure, registerDeadChunkReload, resetDeadChunkReloadForTests |
| 38 | `apps/web/src/build/pwaConfig.test.ts` | test |
| 45 | `apps/web/src/build/pwaConfig.ts` | createMbdPwaPlugin, mbdPwaManifest |
| 112 | `apps/web/src/build/registerServiceWorker.test.ts` | test |
| 77 | `apps/web/src/build/registerServiceWorker.ts` | showServiceWorkerUpdatedToast, registerMbdServiceWorker |

### apps/web/src/features/achievements

Files: 8. Lines: 1135.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 104 | `apps/web/src/features/achievements/components/AchievementsContentPanel.test.tsx` | test |
| 183 | `apps/web/src/features/achievements/components/AchievementsContentPanel.tsx` | component; AchievementView, AchievementCategoryFilter, default:AchievementsContentPanel |
| 158 | `apps/web/src/features/achievements/components/AwardCeremonyModal.test.tsx` | test |
| 206 | `apps/web/src/features/achievements/components/AwardCeremonyModal.tsx` | component; default:AwardCeremonyModal |
| 186 | `apps/web/src/features/achievements/hooks/useAchievementsRouteData.test.tsx` | test |
| 85 | `apps/web/src/features/achievements/hooks/useAchievementsRouteData.ts` | hook; CeremonyScript, useAchievementsRouteData |
| 161 | `apps/web/src/features/achievements/routes/AchievementsPage.test.tsx` | test |
| 52 | `apps/web/src/features/achievements/routes/AchievementsPage.tsx` | route; default:AchievementsPage |

### apps/web/src/features/assistant

Files: 8. Lines: 1964.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 179 | `apps/web/src/features/assistant/components/AssistantDetailDialog.test.tsx` | test |
| 209 | `apps/web/src/features/assistant/components/AssistantDetailDialog.tsx` | component; AssistantDetailDialog, AssistantDetailDialogProps |
| 249 | `apps/web/src/features/assistant/components/AssistantPanel.test.tsx` | test |
| 204 | `apps/web/src/features/assistant/components/AssistantPanel.tsx` | component; AssistantPanel, AssistantPanelProps |
| 256 | `apps/web/src/features/assistant/data/assistantGuidance.test.ts` | test |
| 662 | `apps/web/src/features/assistant/data/assistantGuidance.ts` | resolveAssistantRouteKey, selectRouteGuidance, buildAssistantNextAction, buildStoryCallback, REQUIRED_ASSISTANT_ROUTE_KEYS, ASSISTANT_GUIDANCE, AssistantAction, AssistantDecisionSpotlight, AssistantGuidance, AssistantNextActionContext, AssistantTickerItem, AssistantStoryCallback, AssistantStoryContext, AssistantRouteKey |
| 55 | `apps/web/src/features/assistant/lib/assistantState.test.ts` | test |
| 150 | `apps/web/src/features/assistant/lib/assistantState.ts` | assistantStorageKey, createInitialAssistantState, sanitizeAssistantState, reduceAssistantState, readAssistantState, writeAssistantState, ASSISTANT_STORAGE_VERSION, AssistantState, AssistantMode, AssistantStateEvent, AssistantSaveId |

### apps/web/src/features/dashboard

Files: 132. Lines: 17117.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 93 | `apps/web/src/features/dashboard/components/ActiveStorylinesPanel.test.tsx` | test |
| 96 | `apps/web/src/features/dashboard/components/ActiveStorylinesPanel.tsx` | component; DashboardStoryline, default:ActiveStorylinesPanel |
| 81 | `apps/web/src/features/dashboard/components/AttentionDesk.test.tsx` | test |
| 53 | `apps/web/src/features/dashboard/components/AttentionDesk.tsx` | component; AttentionDeskTone, AttentionDeskItem, default:AttentionDesk |
| 261 | `apps/web/src/features/dashboard/components/AwardRaceCard.test.tsx` | test |
| 133 | `apps/web/src/features/dashboard/components/AwardRaceCardBody.test.tsx` | test |
| 118 | `apps/web/src/features/dashboard/components/AwardRaceCardBody.tsx` | component; AwardEntry, AwardBoard, default:AwardRaceCardBody |
| 75 | `apps/web/src/features/dashboard/components/AwardRaceCard.tsx` | component; default:AwardRaceCard |
| 371 | `apps/web/src/features/dashboard/components/AwardRaceModal.test.tsx` | test |
| 110 | `apps/web/src/features/dashboard/components/AwardRaceModal.tsx` | component; AwardRaceDetailEntry, AwardRaceDetailBoard, AwardRacePriorSeasonWinner, AwardRaceDetailView, default:AwardRaceModal |
| 174 | `apps/web/src/features/dashboard/components/AwardRaceModalBody.test.tsx` | test |
| 254 | `apps/web/src/features/dashboard/components/AwardRaceModalBody.tsx` | component; AwardRaceDetailEntry, AwardRaceDetailBoard, AwardRacePriorSeasonWinner, AwardRaceDetailView, AwardKey, hasAwardRaceEntries, AwardRaceModalBody |
| 107 | `apps/web/src/features/dashboard/components/CareerCrossroadsPanel.test.tsx` | test |
| 65 | `apps/web/src/features/dashboard/components/CareerCrossroadsPanel.tsx` | component; CareerCrossroadsJob, default:CareerCrossroadsPanel |
| 78 | `apps/web/src/features/dashboard/components/CareerRetrospectiveAwardsShelf.test.tsx` | test |
| 63 | `apps/web/src/features/dashboard/components/CareerRetrospectiveAwardsShelf.tsx` | component; CareerRetrospectiveAwardsShelfView, default:CareerRetrospectiveAwardsShelf |
| 354 | `apps/web/src/features/dashboard/components/CareerRetrospectiveCard.test.tsx` | test |
| 72 | `apps/web/src/features/dashboard/components/CareerRetrospectiveCard.tsx` | component; default:CareerRetrospectiveCard |
| 133 | `apps/web/src/features/dashboard/components/CareerRetrospectiveCardBody.test.tsx` | test |
| 90 | `apps/web/src/features/dashboard/components/CareerRetrospectiveCardBody.tsx` | component; CareerRetrospectiveView, default:CareerRetrospectiveCardBody |
| 57 | `apps/web/src/features/dashboard/components/CareerRetrospectiveSeasonArc.test.tsx` | test |
| 65 | `apps/web/src/features/dashboard/components/CareerRetrospectiveSeasonArc.tsx` | component; CareerRetrospectiveSeasonHistoryEntry, default:CareerRetrospectiveSeasonArc |
| 116 | `apps/web/src/features/dashboard/components/CareerRetrospectiveStoryStack.test.tsx` | test |
| 210 | `apps/web/src/features/dashboard/components/CareerRetrospectiveStoryStack.tsx` | component; TeamMomentEntry, LegendArcEntry, SignatureArcEntry, default:CareerRetrospectiveStoryStack |
| 56 | `apps/web/src/features/dashboard/components/CareerRetrospectiveTopRivalry.test.tsx` | test |
| 45 | `apps/web/src/features/dashboard/components/CareerRetrospectiveTopRivalry.tsx` | component; CareerRetrospectiveTopRivalryView, default:CareerRetrospectiveTopRivalry |
| 76 | `apps/web/src/features/dashboard/components/CareerRetrospectiveTenureTitles.test.tsx` | test |
| 125 | `apps/web/src/features/dashboard/components/CareerRetrospectiveTenureTitles.tsx` | component; CareerRetrospectiveTenureTitlesView, default:CareerRetrospectiveTenureTitles |
| 106 | `apps/web/src/features/dashboard/components/ChaseWatchCardBody.test.tsx` | test |
| 218 | `apps/web/src/features/dashboard/components/ChaseWatchCardBody.tsx` | component; CareerChase, PaceChase, default:ChaseWatchCardBody |
| 226 | `apps/web/src/features/dashboard/components/ChaseWatchCard.test.tsx` | test |
| 72 | `apps/web/src/features/dashboard/components/ChaseWatchCard.tsx` | component; default:ChaseWatchCard |
| 120 | `apps/web/src/features/dashboard/components/DashboardBroadcastSection.test.tsx` | test |
| 29 | `apps/web/src/features/dashboard/components/DashboardBroadcastSection.tsx` | component; default:DashboardBroadcastSection |
| 93 | `apps/web/src/features/dashboard/components/DashboardIntelligenceGrid.test.tsx` | test |
| 57 | `apps/web/src/features/dashboard/components/DashboardIntelligenceGrid.tsx` | component; default:DashboardIntelligenceGrid |
| 227 | `apps/web/src/features/dashboard/components/DashboardLazyIntelligenceGrid.test.tsx` | test |
| 134 | `apps/web/src/features/dashboard/components/DashboardLazyIntelligenceGrid.tsx` | component; default:DashboardLazyIntelligenceGrid |
| 46 | `apps/web/src/features/dashboard/components/DashboardLoadingStates.test.tsx` | test |
| 35 | `apps/web/src/features/dashboard/components/DashboardLoadingStates.tsx` | component; DashboardCardFallback, DashboardSkeleton |
| 216 | `apps/web/src/features/dashboard/components/DashboardPageContent.test.tsx` | test |
| 189 | `apps/web/src/features/dashboard/components/DashboardPageContent.tsx` | component; DashboardPageContentProps, default:DashboardPageContent |
| 118 | `apps/web/src/features/dashboard/components/DashboardSimControlsPanel.test.tsx` | test |
| 90 | `apps/web/src/features/dashboard/components/DashboardSimControlsPanel.tsx` | component; DashboardSimAction, default:DashboardSimControlsPanel |
| 43 | `apps/web/src/features/dashboard/components/DynastyEndedPanel.test.tsx` | test |
| 14 | `apps/web/src/features/dashboard/components/DynastyEndedPanel.tsx` | component; default:DynastyEndedPanel |
| 91 | `apps/web/src/features/dashboard/components/FarmReportCardBody.test.tsx` | test |
| 86 | `apps/web/src/features/dashboard/components/FarmReportCardBody.tsx` | component; FarmMoveView, ProspectView, default:FarmReportCardBody |
| 20 | `apps/web/src/features/dashboard/components/FarmReportCard.tsx` | component; default:FarmReportCard |
| 64 | `apps/web/src/features/dashboard/components/FinancialCardBody.test.tsx` | test |
| 50 | `apps/web/src/features/dashboard/components/FinancialCardBody.tsx` | component; FinancialCardBodyProps, default:FinancialCardBody |
| 29 | `apps/web/src/features/dashboard/components/FinancialCard.tsx` | component; default:FinancialCard |
| 69 | `apps/web/src/features/dashboard/components/FirstDayBriefingPanel.test.tsx` | test |
| 52 | `apps/web/src/features/dashboard/components/FirstDayBriefingPanel.tsx` | component; default:FirstDayBriefingPanel |
| 99 | `apps/web/src/features/dashboard/components/FranchiseIdentityPanel.test.tsx` | test |
| 125 | `apps/web/src/features/dashboard/components/FranchiseIdentityPanel.tsx` | component; default:FranchiseIdentityPanel |
| 152 | `apps/web/src/features/dashboard/components/FranchiseLegacyCard.test.tsx` | test |
| 129 | `apps/web/src/features/dashboard/components/FranchiseLegacyCardBody.test.tsx` | test |
| 119 | `apps/web/src/features/dashboard/components/FranchiseLegacyCardBody.tsx` | component; default:FranchiseLegacyCardBody |
| 53 | `apps/web/src/features/dashboard/components/FranchiseLegacyCard.tsx` | component; default:FranchiseLegacyCard |
| 87 | `apps/web/src/features/dashboard/components/GameAdvisorBody.test.tsx` | test |
| 91 | `apps/web/src/features/dashboard/components/GameAdvisorBody.tsx` | component; Recommendation, default:GameAdvisorBody |
| 124 | `apps/web/src/features/dashboard/components/GameAdvisor.tsx` | component; default:GameAdvisor |
| 79 | `apps/web/src/features/dashboard/components/GameRecapCard.test.tsx` | test |
| 88 | `apps/web/src/features/dashboard/components/GameRecapCardBody.test.tsx` | test |
| 44 | `apps/web/src/features/dashboard/components/GameRecapCardBody.tsx` | component; GameRecapCardBodyProps, default:GameRecapCardBody |
| 30 | `apps/web/src/features/dashboard/components/GameRecapCard.tsx` | component; default:GameRecapCard |
| 129 | `apps/web/src/features/dashboard/components/MilestoneTrackerCardBody.test.tsx` | test |
| 119 | `apps/web/src/features/dashboard/components/MilestoneTrackerCardBody.tsx` | component; MilestoneAlert, default:MilestoneTrackerCardBody |
| 54 | `apps/web/src/features/dashboard/components/MilestoneTrackerCard.tsx` | component; default:MilestoneTrackerCard |
| 74 | `apps/web/src/features/dashboard/components/OpeningDayChecklistPanel.test.tsx` | test |
| 89 | `apps/web/src/features/dashboard/components/OpeningDayChecklistPanel.tsx` | component; default:OpeningDayChecklistPanel |
| 324 | `apps/web/src/features/dashboard/components/PennantRaceCard.test.tsx` | test |
| 143 | `apps/web/src/features/dashboard/components/PennantRaceCardBody.test.tsx` | test |
| 211 | `apps/web/src/features/dashboard/components/PennantRaceCardBody.tsx` | component; Heat, RaceTeam, DivisionRace, WildcardTeam, WildcardRace, default:PennantRaceCardBody |
| 82 | `apps/web/src/features/dashboard/components/PennantRaceCard.tsx` | component; default:PennantRaceCard |
| 375 | `apps/web/src/features/dashboard/components/PennantRaceModal.test.tsx` | test |
| 111 | `apps/web/src/features/dashboard/components/PennantRaceModal.tsx` | component; PennantRaceDetailTeam, PennantRaceDetailDivision, PennantRaceDetailWildcardTeam, PennantRaceDetailWildcard, PennantRaceDetailView, default:PennantRaceModal |
| 174 | `apps/web/src/features/dashboard/components/PennantRaceModalBody.test.tsx` | test |
| 227 | `apps/web/src/features/dashboard/components/PennantRaceModalBody.tsx` | component; PennantRaceDetailTeam, PennantRaceDetailDivision, PennantRaceDetailWildcardTeam, PennantRaceDetailWildcard, PennantRaceDetailView, hasPennantRaceEntries, PennantRaceModalBody |
| 170 | `apps/web/src/features/dashboard/components/PlayByPlayPanel.test.tsx` | test |
| 157 | `apps/web/src/features/dashboard/components/PlayByPlayPanel.tsx` | component; default:PlayByPlayPanel |
| 196 | `apps/web/src/features/dashboard/components/PlayerArcOfSeasonCard.test.tsx` | test |
| 80 | `apps/web/src/features/dashboard/components/PlayerArcOfSeasonCard.tsx` | component; default:PlayerArcOfSeasonCard |
| 108 | `apps/web/src/features/dashboard/components/PlayerArcOfSeasonCardBody.test.tsx` | test |
| 100 | `apps/web/src/features/dashboard/components/PlayerArcOfSeasonCardBody.tsx` | component; ArcMomentShape, PlayerArcEntryView, default:PlayerArcOfSeasonCardBody |
| 118 | `apps/web/src/features/dashboard/components/PressDigestCardBody.test.tsx` | test |
| 53 | `apps/web/src/features/dashboard/components/PressDigestCardBody.tsx` | component; PressDigestCardBodyProps, default:PressDigestCardBody |
| 15 | `apps/web/src/features/dashboard/components/PressDigestCard.tsx` | component; default:PressDigestCard |
| 124 | `apps/web/src/features/dashboard/components/RecentBroadcastRecapsPanel.test.tsx` | test |
| 66 | `apps/web/src/features/dashboard/components/RecentBroadcastRecapsPanel.tsx` | component; default:RecentBroadcastRecapsPanel |
| 161 | `apps/web/src/features/dashboard/components/RecentMomentsCard.test.tsx` | test |
| 102 | `apps/web/src/features/dashboard/components/RecentMomentsCardBody.test.tsx` | test |
| 132 | `apps/web/src/features/dashboard/components/RecentMomentsCardBody.tsx` | component; MomentShape, PlayerMomentView, TeamMomentView, MergedMomentView, default:RecentMomentsCardBody |
| 90 | `apps/web/src/features/dashboard/components/RecentMomentsCard.tsx` | component; default:RecentMomentsCard |
| 85 | `apps/web/src/features/dashboard/components/RivalryHistoryStack.test.tsx` | test |
| 78 | `apps/web/src/features/dashboard/components/RivalryHistoryStack.tsx` | component; DashboardRivalrySummary, DashboardThisDayInHistory, default:RivalryHistoryStack |
| 79 | `apps/web/src/features/dashboard/components/RosterHealthCardBody.test.tsx` | test |
| 56 | `apps/web/src/features/dashboard/components/RosterHealthCardBody.tsx` | component; FatigueWarningView, default:RosterHealthCardBody |
| 29 | `apps/web/src/features/dashboard/components/RosterHealthCard.tsx` | component; default:RosterHealthCard |
| 138 | `apps/web/src/features/dashboard/components/SeasonStoryReelBody.test.tsx` | test |
| 52 | `apps/web/src/features/dashboard/components/SeasonStoryReelBody.tsx` | component; SeasonStoryReelBody; type:SeasonStoryReelView |
| 464 | `apps/web/src/features/dashboard/components/SeasonStoryReelModal.test.tsx` | test |
| 194 | `apps/web/src/features/dashboard/components/SeasonStoryReelModal.tsx` | component; default:SeasonStoryReelModal; type:SeasonStoryReelView |
| 94 | `apps/web/src/features/dashboard/components/SeasonStoryReelSections.test.tsx` | test |
| 312 | `apps/web/src/features/dashboard/components/SeasonStoryReelSections.tsx` | component; SeasonStoryReelSections, isSeasonStoryReelEmpty, SeasonStoryReelView |
| 69 | `apps/web/src/features/dashboard/components/StandingsCard.test.tsx` | test |
| 92 | `apps/web/src/features/dashboard/components/StandingsCardBody.test.tsx` | test |
| 54 | `apps/web/src/features/dashboard/components/StandingsCardBody.tsx` | component; StandingsCardBodyProps, default:StandingsCardBody |
| 21 | `apps/web/src/features/dashboard/components/StandingsCard.tsx` | component; default:StandingsCard |
| 195 | `apps/web/src/features/dashboard/components/ThisWeekInHistoryCard.test.tsx` | test |
| 108 | `apps/web/src/features/dashboard/components/ThisWeekInHistoryCardBody.test.tsx` | test |
| 142 | `apps/web/src/features/dashboard/components/ThisWeekInHistoryCardBody.tsx` | component; HistoricalMomentShape, HistoricalPlayerEntry, HistoricalTeamEntry, HistoricalEntry, default:ThisWeekInHistoryCardBody |
| 84 | `apps/web/src/features/dashboard/components/ThisWeekInHistoryCard.tsx` | component; default:ThisWeekInHistoryCard |
| 81 | `apps/web/src/features/dashboard/components/TopPerformersPanel.test.tsx` | test |
| 57 | `apps/web/src/features/dashboard/components/TopPerformersPanel.tsx` | component; DashboardTopPerformer, default:TopPerformersPanel |
| 83 | `apps/web/src/features/dashboard/components/TradeIntelCardBody.test.tsx` | test |
| 81 | `apps/web/src/features/dashboard/components/TradeIntelCardBody.tsx` | component; TradeTickerItemView, default:TradeIntelCardBody |
| 35 | `apps/web/src/features/dashboard/components/TradeIntelCard.tsx` | component; default:TradeIntelCard |
| 136 | `apps/web/src/features/dashboard/components/gameDayBroadcast.ts` | teamAbbreviation, teamName, formatOrdinal, formatHalfInningLabel, formatInningsLabel, buildPlayByPlayGroups, deriveLineScore, BroadcastHighlight, BroadcastPlay, GameRecapView, GamePlayByPlayView, LineScoreRow, PlayByPlayGroup |
| 241 | `apps/web/src/features/dashboard/lib/dashboardPageTransforms.test.ts` | test |
| 354 | `apps/web/src/features/dashboard/lib/dashboardPageTransforms.ts` | buildAttentionItems, buildDashboardNudgeTriggers, getDashboardScheduleFlags, quickActionLabel, shouldAutoSkipFirstSeriesPointerNudge, shouldShowOpeningDayChecklist, DashboardSummary, ScheduleGameEntry, DashboardScheduleFlags, SimAction |
| 241 | `apps/web/src/features/dashboard/hooks/useDashboardActionHandlers.test.tsx` | test |
| 121 | `apps/web/src/features/dashboard/hooks/useDashboardActionHandlers.ts` | hook; useDashboardActionHandlers |
| 228 | `apps/web/src/features/dashboard/hooks/useDashboardPageController.test.tsx` | test |
| 203 | `apps/web/src/features/dashboard/hooks/useDashboardPageController.ts` | hook; DashboardPageControllerGameState, DashboardPageControllerWorker, useDashboardPageController |
| 165 | `apps/web/src/features/dashboard/hooks/useDashboardGuidedStart.test.tsx` | test |
| 122 | `apps/web/src/features/dashboard/hooks/useDashboardGuidedStart.ts` | hook; useDashboardGuidedStart |
| 251 | `apps/web/src/features/dashboard/hooks/useDashboardRouteData.test.tsx` | test |
| 188 | `apps/web/src/features/dashboard/hooks/useDashboardRouteData.ts` | GMCareerView, JobMarketView, useDashboardRouteData |
| 1104 | `apps/web/src/features/dashboard/routes/DashboardPage.test.tsx` | test |
| 51 | `apps/web/src/features/dashboard/routes/DashboardPage.tsx` | route; default:DashboardPage |

### apps/web/src/features/draft

Files: 30. Lines: 5188.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 150 | `apps/web/src/features/draft/components/DraftBoard.test.tsx` | test |
| 122 | `apps/web/src/features/draft/components/DraftBoard.tsx` | component; DraftBoard |
| 117 | `apps/web/src/features/draft/components/DraftBoardComparePanel.test.tsx` | test |
| 127 | `apps/web/src/features/draft/components/DraftBoardComparePanel.tsx` | component; DraftBoardComparePanel |
| 108 | `apps/web/src/features/draft/components/DraftAvailabilityPanel.test.tsx` | test |
| 60 | `apps/web/src/features/draft/components/DraftAvailabilityPanel.tsx` | component; DraftAvailabilityPanel |
| 238 | `apps/web/src/features/draft/components/DraftCurrentPickPanel.test.tsx` | test |
| 216 | `apps/web/src/features/draft/components/DraftCurrentPickPanel.tsx` | component; DraftCurrentPickPanel |
| 305 | `apps/web/src/features/draft/components/DraftPageContent.test.tsx` | test |
| 79 | `apps/web/src/features/draft/components/DraftPageContent.tsx` | component; default:DraftPageContent |
| 108 | `apps/web/src/features/draft/components/DraftPostDraftGradesPanel.test.tsx` | test |
| 62 | `apps/web/src/features/draft/components/DraftPostDraftGradesPanel.tsx` | component; DraftPostDraftGradesPanel |
| 148 | `apps/web/src/features/draft/components/DraftProspectsPanel.test.tsx` | test |
| 115 | `apps/web/src/features/draft/components/DraftProspectsPanel.tsx` | component; DraftProspectsPanel |
| 80 | `apps/web/src/features/draft/components/DraftRoomHeaderPanel.test.tsx` | test |
| 56 | `apps/web/src/features/draft/components/DraftRoomHeaderPanel.tsx` | component; DraftRoomHeaderPanel |
| 148 | `apps/web/src/features/draft/components/DraftSummaryPanel.test.tsx` | test |
| 91 | `apps/web/src/features/draft/components/DraftSummaryPanel.tsx` | component; DraftSummaryPanel |
| 105 | `apps/web/src/features/draft/components/DraftTicker.test.tsx` | test |
| 85 | `apps/web/src/features/draft/components/DraftTicker.tsx` | component; DraftTicker |
| 166 | `apps/web/src/features/draft/components/DraftWarRoomPanel.test.tsx` | test |
| 177 | `apps/web/src/features/draft/components/DraftWarRoomPanel.tsx` | component; DraftWarRoomPanel |
| 261 | `apps/web/src/features/draft/hooks/useDraftActionHandlers.test.tsx` | test |
| 179 | `apps/web/src/features/draft/hooks/useDraftActionHandlers.ts` | hook; useDraftActionHandlers |
| 207 | `apps/web/src/features/draft/hooks/useDraftPageController.test.tsx` | test |
| 217 | `apps/web/src/features/draft/hooks/useDraftPageController.ts` | hook; UseDraftPageControllerOptions, useDraftPageController |
| 313 | `apps/web/src/features/draft/hooks/useDraftRouteData.test.tsx` | test |
| 200 | `apps/web/src/features/draft/hooks/useDraftRouteData.ts` | hook; useDraftRouteData |
| 921 | `apps/web/src/features/draft/routes/DraftPage.test.tsx` | test |
| 27 | `apps/web/src/features/draft/routes/DraftPage.tsx` | route; default:DraftPage |

### apps/web/src/features/finance

Files: 13. Lines: 1427.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 161 | `apps/web/src/features/finance/components/FinanceContractTablePanel.test.tsx` | test |
| 150 | `apps/web/src/features/finance/components/FinanceContractTablePanel.tsx` | component; FinanceContractFilter, FinanceContractSortKey, FinanceContractTablePanel |
| 129 | `apps/web/src/features/finance/components/FinanceDecisionDeskPanel.test.tsx` | test |
| 92 | `apps/web/src/features/finance/components/FinanceDecisionDeskPanel.tsx` | component; FinanceDecisionDeskPanel |
| 46 | `apps/web/src/features/finance/components/FinanceFutureCommitmentsPanel.test.tsx` | test |
| 51 | `apps/web/src/features/finance/components/FinanceFutureCommitmentsPanel.tsx` | component; FinanceFutureCommitmentsPanel |
| 81 | `apps/web/src/features/finance/components/FinanceSummaryCardsPanel.test.tsx` | test |
| 95 | `apps/web/src/features/finance/components/FinanceSummaryCardsPanel.tsx` | component; FinanceSummaryCardsPanel |
| 26 | `apps/web/src/features/finance/components/financePresentation.ts` | FinanceContractEntry, formatDollars, formatMoney, isExtensionPriorityContract |
| 182 | `apps/web/src/features/finance/hooks/useFinanceRouteData.test.tsx` | test |
| 172 | `apps/web/src/features/finance/hooks/useFinanceRouteData.ts` | hook; useFinanceRouteData; type:FinanceData; type:FinanceRouteDataOptions; type:FinanceRouteDataResult |
| 150 | `apps/web/src/features/finance/routes/FinancePage.test.tsx` | test |
| 92 | `apps/web/src/features/finance/routes/FinancePage.tsx` | route; default:FinancePage |

### apps/web/src/features/free-agency

Files: 18. Lines: 2596.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 128 | `apps/web/src/features/free-agency/components/FreeAgencyContractOfferPanel.test.tsx` | test |
| 150 | `apps/web/src/features/free-agency/components/FreeAgencyContractOfferPanel.tsx` | component; default:FreeAgencyContractOfferPanel; type:FreeAgencyOfferBudget; type:FreeAgentOfferPlayer |
| 189 | `apps/web/src/features/free-agency/components/FreeAgencyMarketBoardPanel.test.tsx` | test |
| 187 | `apps/web/src/features/free-agency/components/FreeAgencyMarketBoardPanel.tsx` | component; default:FreeAgencyMarketBoardPanel; type:DemandFilter; type:FreeAgencyMarketAgent; type:PositionFilter; type:SortKey |
| 146 | `apps/web/src/features/free-agency/components/FreeAgencyPageContent.test.tsx` | test |
| 121 | `apps/web/src/features/free-agency/components/FreeAgencyPageContent.tsx` | component; default:FreeAgencyPageContent |
| 128 | `apps/web/src/features/free-agency/components/MarketIntelPanel.test.tsx` | test |
| 134 | `apps/web/src/features/free-agency/components/MarketIntelPanel.tsx` | component; default:MarketIntelPanel |
| 97 | `apps/web/src/features/free-agency/components/MarketIntelPlayerReportCard.test.tsx` | test |
| 194 | `apps/web/src/features/free-agency/components/MarketIntelPlayerReportCard.tsx` | component; default:MarketIntelPlayerReportCard; formatMarketMoney, type:ComparableContract; type:MarketReport; type:SigningPrediction |
| 139 | `apps/web/src/features/free-agency/hooks/useFreeAgencyMarketIntelData.test.tsx` | test |
| 57 | `apps/web/src/features/free-agency/hooks/useFreeAgencyMarketIntelData.ts` | hook; useFreeAgencyMarketIntelData; type:FreeAgencyMarketIntelligenceData; type:FreeAgencyMarketSummary |
| 197 | `apps/web/src/features/free-agency/hooks/useFreeAgencyOfferActions.test.tsx` | test |
| 106 | `apps/web/src/features/free-agency/hooks/useFreeAgencyOfferActions.ts` | hook; useFreeAgencyOfferActions; type:FreeAgencyOfferActionsOptions; type:FreeAgencyOfferActionsResult |
| 214 | `apps/web/src/features/free-agency/hooks/useFreeAgencyRouteData.test.tsx` | test |
| 198 | `apps/web/src/features/free-agency/hooks/useFreeAgencyRouteData.ts` | hook; useFreeAgencyRouteData; type:FinanceOverview; type:FreeAgencyRouteDataOptions; type:FreeAgencyRouteDataResult |
| 157 | `apps/web/src/features/free-agency/routes/FreeAgencyPage.test.tsx` | test |
| 54 | `apps/web/src/features/free-agency/routes/FreeAgencyPage.tsx` | route; default:FreeAgencyPage |

### apps/web/src/features/front-office

Files: 14. Lines: 2054.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 151 | `apps/web/src/features/front-office/components/FrontOfficeClubhouseWebCard.test.tsx` | test |
| 166 | `apps/web/src/features/front-office/components/FrontOfficeClubhouseWebCard.tsx` | component; FrontOfficeMentorshipPairingView, FrontOfficeClubhouseLeaderView, FrontOfficeClubhouseConflictRiskView, FrontOfficeMentorshipView, FrontOfficeClubhouseWebCard |
| 93 | `apps/web/src/features/front-office/components/FrontOfficeHealthCards.test.tsx` | test |
| 116 | `apps/web/src/features/front-office/components/FrontOfficeHealthCards.tsx` | component; FrontOfficeReputationView, FrontOfficeReputationCard, FrontOfficeChemistryCard |
| 107 | `apps/web/src/features/front-office/components/FrontOfficeIdentityCard.test.tsx` | test |
| 178 | `apps/web/src/features/front-office/components/FrontOfficeIdentityCard.tsx` | component; FrontOfficeAlignmentScore, FrontOfficeIdentityView, FrontOfficeIdentityCard |
| 96 | `apps/web/src/features/front-office/components/FrontOfficeLeagueStandingCard.test.tsx` | test |
| 134 | `apps/web/src/features/front-office/components/FrontOfficeLeagueStandingCard.tsx` | component; FrontOfficeRelationshipView, FrontOfficeLeagueStandingCard |
| 93 | `apps/web/src/features/front-office/components/FrontOfficeOwnerCards.test.tsx` | test |
| 131 | `apps/web/src/features/front-office/components/FrontOfficeOwnerCards.tsx` | component; FrontOfficeOwnerView, FrontOfficeOwnerProfileCard, FrontOfficeBudgetCard |
| 307 | `apps/web/src/features/front-office/hooks/useFrontOfficeRouteData.test.tsx` | test |
| 93 | `apps/web/src/features/front-office/hooks/useFrontOfficeRouteData.ts` | hook; useFrontOfficeRouteData |
| 316 | `apps/web/src/features/front-office/routes/FrontOfficePage.test.tsx` | test |
| 73 | `apps/web/src/features/front-office/routes/FrontOfficePage.tsx` | route; default:FrontOfficePage |

### apps/web/src/features/gm-career

Files: 8. Lines: 1464.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 150 | `apps/web/src/features/gm-career/components/GMCareerContentPanel.test.tsx` | test |
| 256 | `apps/web/src/features/gm-career/components/GMCareerContentPanel.tsx` | component; GMCareerContentPanel |
| 377 | `apps/web/src/features/gm-career/components/TeamIdentityCard.test.tsx` | test |
| 203 | `apps/web/src/features/gm-career/components/TeamIdentityCard.tsx` | component; default:TeamIdentityCard |
| 195 | `apps/web/src/features/gm-career/hooks/useGMCareerRouteData.test.tsx` | test |
| 54 | `apps/web/src/features/gm-career/hooks/useGMCareerRouteData.ts` | hook; useGMCareerRouteData |
| 192 | `apps/web/src/features/gm-career/routes/GMCareerPage.test.tsx` | test |
| 37 | `apps/web/src/features/gm-career/routes/GMCareerPage.tsx` | route; default:GMCareerPage |

### apps/web/src/features/history

Files: 94. Lines: 12415.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 88 | `apps/web/src/features/history/components/AllTimeLeadersPanel.test.tsx` | test |
| 103 | `apps/web/src/features/history/components/AllTimeLeadersPanel.tsx` | component; AllTimeLeaderEntry, AllTimeLeadersView, default:AllTimeLeadersPanel |
| 101 | `apps/web/src/features/history/components/AwardLedgerPanel.test.tsx` | test |
| 50 | `apps/web/src/features/history/components/AwardLedgerPanel.tsx` | component; default:AwardLedgerPanel |
| 110 | `apps/web/src/features/history/components/AwardRaceWatchPanel.test.tsx` | test |
| 63 | `apps/web/src/features/history/components/AwardRaceWatchPanel.tsx` | component; default:AwardRaceWatchPanel |
| 104 | `apps/web/src/features/history/components/DynastyCardsPanel.test.tsx` | test |
| 65 | `apps/web/src/features/history/components/DynastyCardsPanel.tsx` | component; default:DynastyCardsPanel |
| 70 | `apps/web/src/features/history/components/DynastyScorePanel.test.tsx` | test |
| 49 | `apps/web/src/features/history/components/DynastyScorePanel.tsx` | component; DynastyScoreSummary, default:DynastyScorePanel |
| 157 | `apps/web/src/features/history/components/DynastyTimelineChapterCard.tsx` | component; DynastyTimelineChapterCard |
| 87 | `apps/web/src/features/history/components/DynastyTimelineMemoryBeatRow.test.tsx` | test |
| 76 | `apps/web/src/features/history/components/DynastyTimelineMemoryBeatRow.tsx` | component; default:DynastyTimelineMemoryBeatRow |
| 120 | `apps/web/src/features/history/components/DynastyTimelineSeasonRow.test.tsx` | test |
| 72 | `apps/web/src/features/history/components/DynastyTimelineSeasonRow.tsx` | component; default:DynastyTimelineSeasonRow |
| 90 | `apps/web/src/features/history/components/HallOfFamePanel.test.tsx` | test |
| 57 | `apps/web/src/features/history/components/HallOfFamePanel.tsx` | component; HallOfFameEntryView, default:HallOfFamePanel |
| 138 | `apps/web/src/features/history/components/HistoryAwardsTabPanel.test.tsx` | test |
| 45 | `apps/web/src/features/history/components/HistoryAwardsTabPanel.tsx` | component; default:HistoryAwardsTabPanel |
| 38 | `apps/web/src/features/history/components/HistoryLoadingSkeleton.test.tsx` | test |
| 18 | `apps/web/src/features/history/components/HistoryLoadingSkeleton.tsx` | component; default:HistoryLoadingSkeleton |
| 87 | `apps/web/src/features/history/components/HistoryMainTabs.test.tsx` | test |
| 42 | `apps/web/src/features/history/components/HistoryMainTabs.tsx` | component; default:HistoryMainTabs |
| 129 | `apps/web/src/features/history/components/HistoryPageContent.test.tsx` | test |
| 239 | `apps/web/src/features/history/components/HistoryPageContent.tsx` | component; HistoryPageContentProps, default:HistoryPageContent |
| 145 | `apps/web/src/features/history/components/HistoryRecordsTabPanel.test.tsx` | test |
| 42 | `apps/web/src/features/history/components/HistoryRecordsTabPanel.tsx` | component; default:HistoryRecordsTabPanel |
| 83 | `apps/web/src/features/history/components/LocalLeaderboardPanel.test.tsx` | test |
| 41 | `apps/web/src/features/history/components/LocalLeaderboardPanel.tsx` | component; default:LocalLeaderboardPanel |
| 172 | `apps/web/src/features/history/components/RecordsPanel.test.tsx` | test |
| 166 | `apps/web/src/features/history/components/RecordsPanel.tsx` | component; RecordBookView, default:RecordsPanel |
| 96 | `apps/web/src/features/history/components/RivalryWatchPanel.test.tsx` | test |
| 84 | `apps/web/src/features/history/components/RivalryWatchPanel.tsx` | component; default:RivalryWatchPanel |
| 118 | `apps/web/src/features/history/components/SeasonArchiveSummaryCard.test.tsx` | test |
| 81 | `apps/web/src/features/history/components/SeasonArchiveSummaryCard.tsx` | component; default:SeasonArchiveSummaryCard |
| 139 | `apps/web/src/features/history/components/SeasonAwardsPanel.test.tsx` | test |
| 58 | `apps/web/src/features/history/components/SeasonAwardsPanel.tsx` | component; default:SeasonAwardsPanel |
| 163 | `apps/web/src/features/history/components/SeasonBrowserPanel.test.tsx` | test |
| 201 | `apps/web/src/features/history/components/SeasonBrowserPanel.tsx` | component; default:SeasonBrowserPanel |
| 84 | `apps/web/src/features/history/components/SeasonBrowserTabs.test.tsx` | test |
| 44 | `apps/web/src/features/history/components/SeasonBrowserTabs.tsx` | component; SEASON_BROWSER_TABS, SeasonBrowserTab, default:SeasonBrowserTabs |
| 102 | `apps/web/src/features/history/components/SeasonComparisonCard.test.tsx` | test |
| 85 | `apps/web/src/features/history/components/SeasonComparisonCard.tsx` | component; SeasonComparisonView, default:SeasonComparisonCard |
| 124 | `apps/web/src/features/history/components/SeasonDraftPanel.test.tsx` | test |
| 36 | `apps/web/src/features/history/components/SeasonDraftPanel.tsx` | component; default:SeasonDraftPanel |
| 121 | `apps/web/src/features/history/components/SeasonFinancialsPanel.test.tsx` | test |
| 36 | `apps/web/src/features/history/components/SeasonFinancialsPanel.tsx` | component; default:SeasonFinancialsPanel |
| 106 | `apps/web/src/features/history/components/SeasonLeadersPanel.test.tsx` | test |
| 55 | `apps/web/src/features/history/components/SeasonLeadersPanel.tsx` | component; default:SeasonLeadersPanel |
| 108 | `apps/web/src/features/history/components/SeasonPlayoffsPanel.test.tsx` | test |
| 45 | `apps/web/src/features/history/components/SeasonPlayoffsPanel.tsx` | component; default:SeasonPlayoffsPanel |
| 68 | `apps/web/src/features/history/components/SeasonRecapAwardsSlide.test.tsx` | test |
| 32 | `apps/web/src/features/history/components/SeasonRecapAwardsSlide.tsx` | component; default:SeasonRecapAwardsSlide |
| 75 | `apps/web/src/features/history/components/SeasonRecapLeadersSlide.test.tsx` | test |
| 36 | `apps/web/src/features/history/components/SeasonRecapLeadersSlide.tsx` | component; default:SeasonRecapLeadersSlide |
| 108 | `apps/web/src/features/history/components/SeasonRecapModalBody.test.tsx` | test |
| 140 | `apps/web/src/features/history/components/SeasonRecapModalBody.tsx` | component; SEASON_RECAP_SLIDES, SeasonRecapModalBody, getVisibleSeasonRecapSlides, SeasonRecapData, SeasonRecapSlideConfig, SeasonRecapSlideId |
| 175 | `apps/web/src/features/history/components/SeasonRecapModal.test.tsx` | test |
| 128 | `apps/web/src/features/history/components/SeasonRecapModal.tsx` | component; SeasonRecapModal, type:SeasonRecapData |
| 66 | `apps/web/src/features/history/components/SeasonRecapNarrativeSlide.test.tsx` | test |
| 34 | `apps/web/src/features/history/components/SeasonRecapNarrativeSlide.tsx` | component; default:SeasonRecapNarrativeSlide |
| 89 | `apps/web/src/features/history/components/SeasonRecapRecordSlide.test.tsx` | test |
| 49 | `apps/web/src/features/history/components/SeasonRecapRecordSlide.tsx` | component; default:SeasonRecapRecordSlide |
| 133 | `apps/web/src/features/history/components/SeasonRecapSlideNavigation.test.tsx` | test |
| 75 | `apps/web/src/features/history/components/SeasonRecapSlideNavigation.tsx` | component; default:SeasonRecapSlideNavigation |
| 64 | `apps/web/src/features/history/components/SeasonRecapTitleSlide.test.tsx` | test |
| 26 | `apps/web/src/features/history/components/SeasonRecapTitleSlide.tsx` | component; default:SeasonRecapTitleSlide |
| 67 | `apps/web/src/features/history/components/SeasonRecapTransactionsSlide.test.tsx` | test |
| 27 | `apps/web/src/features/history/components/SeasonRecapTransactionsSlide.tsx` | component; default:SeasonRecapTransactionsSlide |
| 200 | `apps/web/src/features/history/components/SeasonStandingsPanel.test.tsx` | test |
| 97 | `apps/web/src/features/history/components/SeasonStandingsPanel.tsx` | component; SeasonStandingsGroup, default:SeasonStandingsPanel |
| 103 | `apps/web/src/features/history/components/SeasonTransactionsPanel.test.tsx` | test |
| 32 | `apps/web/src/features/history/components/SeasonTransactionsPanel.tsx` | component; default:SeasonTransactionsPanel |
| 140 | `apps/web/src/features/history/components/TeamSeasonDetailCard.test.tsx` | test |
| 104 | `apps/web/src/features/history/components/TeamSeasonDetailCard.tsx` | component; default:TeamSeasonDetailCard |
| 73 | `apps/web/src/features/history/components/TimelineComparisonDeltaMetric.test.tsx` | test |
| 60 | `apps/web/src/features/history/components/TimelineComparisonDeltaMetric.tsx` | component; formatTimelineComparisonDelta, timelineComparisonDeltaColor, default:TimelineComparisonDeltaMetric |
| 177 | `apps/web/src/features/history/components/TimelineComparisonPanel.tsx` | component; TimelineComparisonPanel |
| 54 | `apps/web/src/features/history/components/TimelineComparisonRosterFlow.test.tsx` | test |
| 71 | `apps/web/src/features/history/components/TimelineComparisonRosterFlow.tsx` | component; default:TimelineComparisonRosterFlow |
| 213 | `apps/web/src/features/history/components/TimelinePanel.test.tsx` | test |
| 71 | `apps/web/src/features/history/components/TimelinePanel.tsx` | component; default:TimelinePanel |
| 108 | `apps/web/src/features/history/components/TrophyRoomPanel.test.tsx` | test |
| 105 | `apps/web/src/features/history/components/TrophyRoomPanel.tsx` | component; AchievementSummary, default:TrophyRoomPanel |
| 1206 | `apps/web/src/features/history/lib/buildDynastyTimelineChapters.test.ts` | test |
| 948 | `apps/web/src/features/history/lib/buildDynastyTimelineChapters.ts` | buildDynastyTimelineSeasonSummaries, buildDynastyTimelineChapters, DynastyTimelineEntryLike, DynastyTimelinePlayerMomentBeat, DynastyTimelineTeamMomentBeat, DynastyTimelineMemoryBeat, DynastyTimelineMemoryBeatKind, DynastyTimelineSeasonSummary, DynastyTimelineChapter, DynastyEraState, DynastyTimelineSeasonView |
| 216 | `apps/web/src/features/history/lib/historyPageTransforms.test.ts` | test |
| 262 | `apps/web/src/features/history/lib/historyPageTransforms.ts` | buildSeasonRecapData, collectHistoryIds, divisionLabelForTeam, EMPTY_DISPLAY_NAMES, formatAwardLabel, formatMoney, groupArchiveStandings, HISTORY_TABS, isArchivedSeasonView, isFullSeasonArchive, sortSeasonsDescending, uniqueStrings, HistoryDisplayNames, HistoryTab |
| 291 | `apps/web/src/features/history/hooks/useHistoryPagePresentation.test.tsx` | test |
| 244 | `apps/web/src/features/history/hooks/useHistoryPagePresentation.ts` | hook; useHistoryPagePresentation, HistoryPagePresentationRouteData |
| 328 | `apps/web/src/features/history/hooks/useHistoryRouteData.test.tsx` | test |
| 377 | `apps/web/src/features/history/hooks/useHistoryRouteData.ts` | hook; useHistoryRouteData, BranchSaveView |
| 744 | `apps/web/src/features/history/routes/HistoryPage.test.tsx` | test |
| 66 | `apps/web/src/features/history/routes/HistoryPage.tsx` | route; default:HistoryPage |

### apps/web/src/features/league

Files: 12. Lines: 1399.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 188 | `apps/web/src/features/league/components/LeagueLeadersContentPanel.test.tsx` | test |
| 261 | `apps/web/src/features/league/components/LeagueLeadersContentPanel.tsx` | component; LeagueLeadersContentPanelProps, default:LeagueLeadersContentPanel |
| 92 | `apps/web/src/features/league/components/StandingsContentPanel.test.tsx` | test |
| 158 | `apps/web/src/features/league/components/StandingsContentPanel.tsx` | component; default:StandingsContentPanel |
| 186 | `apps/web/src/features/league/hooks/useLeagueLeadersRouteData.test.tsx` | test |
| 40 | `apps/web/src/features/league/hooks/useLeagueLeadersRouteData.ts` | hook; useLeagueLeadersRouteData |
| 139 | `apps/web/src/features/league/hooks/useStandingsRouteData.test.tsx` | test |
| 36 | `apps/web/src/features/league/hooks/useStandingsRouteData.ts` | hook; useStandingsRouteData |
| 164 | `apps/web/src/features/league/routes/LeadersPage.test.tsx` | test |
| 26 | `apps/web/src/features/league/routes/LeadersPage.tsx` | route; default:LeadersPage |
| 83 | `apps/web/src/features/league/routes/StandingsPage.test.tsx` | test |
| 26 | `apps/web/src/features/league/routes/StandingsPage.tsx` | route; default:StandingsPage |

### apps/web/src/features/minors

Files: 20. Lines: 2094.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 132 | `apps/web/src/features/minors/components/AffiliateResultsPanel.test.tsx` | test |
| 125 | `apps/web/src/features/minors/components/AffiliateResultsPanel.tsx` | component; default:AffiliateResultsPanel, AffiliateResultView, AffiliateBoxScoreView |
| 78 | `apps/web/src/features/minors/components/AffiliateStandingsPanel.test.tsx` | test |
| 48 | `apps/web/src/features/minors/components/AffiliateStandingsPanel.tsx` | component; default:AffiliateStandingsPanel, AffiliateStandingView |
| 85 | `apps/web/src/features/minors/components/DevelopmentFocusBoard.test.tsx` | test |
| 55 | `apps/web/src/features/minors/components/DevelopmentFocusBoard.tsx` | component; default:DevelopmentFocusBoard; DevelopmentFocus |
| 93 | `apps/web/src/features/minors/components/FarmReportPanel.test.tsx` | test |
| 98 | `apps/web/src/features/minors/components/FarmReportPanel.tsx` | component; default:FarmReportPanel, FarmReportView |
| 64 | `apps/web/src/features/minors/components/PipelineHealthPanel.test.tsx` | test |
| 39 | `apps/web/src/features/minors/components/PipelineHealthPanel.tsx` | component; default:PipelineHealthPanel, PipelineHealthView |
| 152 | `apps/web/src/features/minors/components/PipelineTriageColumn.test.tsx` | test |
| 32 | `apps/web/src/features/minors/components/PipelineTriageColumn.tsx` | component; default:PipelineTriageColumn; PipelineProspect |
| 132 | `apps/web/src/features/minors/components/PipelineView.tsx` | component; default:PipelineView |
| 115 | `apps/web/src/features/minors/components/ProspectBreakoutTracker.tsx` | component; default:ProspectBreakoutTracker |
| 62 | `apps/web/src/features/minors/components/WaiverTrafficPanel.test.tsx` | test |
| 41 | `apps/web/src/features/minors/components/WaiverTrafficPanel.tsx` | component; default:WaiverTrafficPanel, WaiverClaimView |
| 319 | `apps/web/src/features/minors/hooks/useMinorsRouteData.test.tsx` | test |
| 107 | `apps/web/src/features/minors/hooks/useMinorsRouteData.ts` | hook; useMinorsRouteData, AffiliateOverviewView, MinorsPipelineTriage |
| 224 | `apps/web/src/features/minors/routes/MinorsPage.test.tsx` | test |
| 93 | `apps/web/src/features/minors/routes/MinorsPage.tsx` | route; default:MinorsPage |

### apps/web/src/features/news

Files: 9. Lines: 1358.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 176 | `apps/web/src/features/news/components/NewsInboxPanel.test.tsx` | test |
| 160 | `apps/web/src/features/news/components/NewsInboxPanel.tsx` | component; NewsInboxPanel |
| 112 | `apps/web/src/features/news/components/NewsItemCard.test.tsx` | test |
| 152 | `apps/web/src/features/news/components/NewsItemCard.tsx` | component; default:NewsItemCard; newsCategoryLabel |
| 246 | `apps/web/src/features/news/hooks/useNewsRouteData.test.tsx` | test |
| 184 | `apps/web/src/features/news/hooks/useNewsRouteData.ts` | ALL_NEWS_CATEGORY, NEWS_LIMIT, useNewsRouteData, NewsReadFilter, NewsCategoryFilter, UseNewsRouteDataOptions |
| 18 | `apps/web/src/features/news/lib/newsEvents.ts` | dispatchNewsRead, subscribeToNewsReadEvents |
| 238 | `apps/web/src/features/news/routes/NewsPage.test.tsx` | test |
| 72 | `apps/web/src/features/news/routes/NewsPage.tsx` | route; default:NewsPage |

### apps/web/src/features/offseason

Files: 34. Lines: 4825.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 113 | `apps/web/src/features/offseason/components/OffseasonCommandCenterPanel.test.tsx` | test |
| 183 | `apps/web/src/features/offseason/components/OffseasonCommandCenterPanel.tsx` | component; OffseasonCommandCenterPanel, OffseasonCommandCenterView |
| 89 | `apps/web/src/features/offseason/components/OffseasonCurrentPhasePanel.test.tsx` | test |
| 64 | `apps/web/src/features/offseason/components/OffseasonCurrentPhasePanel.tsx` | component; OffseasonCurrentPhasePanel |
| 65 | `apps/web/src/features/offseason/components/OffseasonExtensionCandidatesPanel.test.tsx` | test |
| 57 | `apps/web/src/features/offseason/components/OffseasonExtensionCandidatesPanel.tsx` | component; OffseasonExtensionCandidatesPanel, ExtensionCandidateView |
| 81 | `apps/web/src/features/offseason/components/OffseasonMarketDayBriefingPanel.test.tsx` | test |
| 53 | `apps/web/src/features/offseason/components/OffseasonMarketDayBriefingPanel.tsx` | component; OffseasonMarketDayBriefingPanel, OffseasonMarketDaySummaryView |
| 325 | `apps/web/src/features/offseason/components/OffseasonPageContent.test.tsx` | test |
| 164 | `apps/web/src/features/offseason/components/OffseasonPageContent.tsx` | component; default:OffseasonPageContent, OffseasonPageContentProps |
| 46 | `apps/web/src/features/offseason/components/OffseasonPhaseTrackerPanel.test.tsx` | test |
| 58 | `apps/web/src/features/offseason/components/OffseasonPhaseTrackerPanel.tsx` | component; OffseasonPhaseTrackerPanel, OffseasonPhaseStepView |
| 102 | `apps/web/src/features/offseason/components/OffseasonQualifyingOffersPanel.test.tsx` | test |
| 80 | `apps/web/src/features/offseason/components/OffseasonQualifyingOffersPanel.tsx` | component; OffseasonQualifyingOffersPanel, QualifyingOfferEligibleView |
| 56 | `apps/web/src/features/offseason/components/OffseasonResultSummaryGrid.test.tsx` | test |
| 59 | `apps/web/src/features/offseason/components/OffseasonResultSummaryGrid.tsx` | component; OffseasonResultSummaryGrid, OffseasonPhaseResultsView |
| 141 | `apps/web/src/features/offseason/components/OffseasonRule5BoardPanel.test.tsx` | test |
| 156 | `apps/web/src/features/offseason/components/OffseasonRule5BoardPanel.tsx` | component; OffseasonRule5BoardPanel |
| 201 | `apps/web/src/features/offseason/components/OffseasonRule5Panel.test.tsx` | test |
| 295 | `apps/web/src/features/offseason/components/OffseasonRule5Panel.tsx` | component; OffseasonRule5Panel, Rule5View, Rule5PlayerView, Rule5SelectionView, Rule5ObligationView, Rule5OfferBackStateView |
| 76 | `apps/web/src/features/offseason/components/OffseasonSpringTrainingPanel.test.tsx` | test |
| 97 | `apps/web/src/features/offseason/components/OffseasonSpringTrainingPanel.tsx` | component; OffseasonSpringTrainingPanel, SpringTrainingView |
| 110 | `apps/web/src/features/offseason/components/OffseasonTransactionLedgerPanel.test.tsx` | test |
| 75 | `apps/web/src/features/offseason/components/OffseasonTransactionLedgerPanel.tsx` | component; OffseasonTransactionLedgerPanel, OffseasonTransactionGroupView |
| 39 | `apps/web/src/features/offseason/components/OffseasonUnavailablePanel.test.tsx` | test |
| 28 | `apps/web/src/features/offseason/components/OffseasonUnavailablePanel.tsx` | component; OffseasonUnavailablePanel |
| 159 | `apps/web/src/features/offseason/hooks/useOffseasonActionHandlers.test.tsx` | test |
| 189 | `apps/web/src/features/offseason/hooks/useOffseasonActionHandlers.ts` | hook; useOffseasonActionHandlers |
| 188 | `apps/web/src/features/offseason/hooks/useOffseasonPageController.test.tsx` | test |
| 256 | `apps/web/src/features/offseason/hooks/useOffseasonPageController.ts` | hook; OFFSEASON_PHASE_CONFIG, OFFSEASON_PHASES, UseOffseasonPageControllerOptions, useOffseasonPageController |
| 317 | `apps/web/src/features/offseason/hooks/useOffseasonRouteData.test.tsx` | test |
| 184 | `apps/web/src/features/offseason/hooks/useOffseasonRouteData.ts` | hook; useOffseasonRouteData, OffseasonData |
| 697 | `apps/web/src/features/offseason/routes/OffseasonPage.test.tsx` | test |
| 22 | `apps/web/src/features/offseason/routes/OffseasonPage.tsx` | route; default:OffseasonPage |

### apps/web/src/features/onboarding

Files: 33. Lines: 4630.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 205 | `apps/web/src/features/onboarding/__tests__/guidedStartNudges.test.tsx` | test |
| 72 | `apps/web/src/features/onboarding/components/AGMRuntimePanel.tsx` | component; AGMRuntimePanel |
| 181 | `apps/web/src/features/onboarding/components/AGMSelectionPanel.tsx` | component; AGMSelectionPanel |
| 48 | `apps/web/src/features/onboarding/components/AssessmentPanel.tsx` | component; AssessmentPanel |
| 48 | `apps/web/src/features/onboarding/components/ChapterProgress.tsx` | component; ChapterProgress |
| 75 | `apps/web/src/features/onboarding/components/OnboardingChoiceGrid.test.tsx` | test |
| 37 | `apps/web/src/features/onboarding/components/OnboardingChoiceGrid.tsx` | component; OnboardingChoiceGrid, OnboardingChoiceOption |
| 176 | `apps/web/src/features/onboarding/components/RevisedOnboardingChapterPanel.test.tsx` | test |
| 311 | `apps/web/src/features/onboarding/components/RevisedOnboardingChapterPanel.tsx` | component; default:RevisedOnboardingChapterPanel, buildDialogueText, buildFallbackBody, ChoiceField, RevisedOnboardingChapterPanelProps |
| 102 | `apps/web/src/features/onboarding/components/RevisedOnboardingChrome.test.tsx` | test |
| 129 | `apps/web/src/features/onboarding/components/RevisedOnboardingChrome.tsx` | component; OnboardingEmptyState, OnboardingErrorBanner, OnboardingLoadingState, OnboardingPageShell, OnboardingProgressAside, OnboardingRouteHeader |
| 93 | `apps/web/src/features/onboarding/components/RevisedOnboardingFlowContent.test.tsx` | test |
| 91 | `apps/web/src/features/onboarding/components/RevisedOnboardingFlowContent.tsx` | component; default:RevisedOnboardingFlowContent |
| 96 | `apps/web/src/features/onboarding/components/chapters/FarmAssessmentView.tsx` | component; FarmAssessmentView |
| 117 | `apps/web/src/features/onboarding/components/chapters/FinancialView.tsx` | component; FinancialView |
| 223 | `apps/web/src/features/onboarding/components/chapters/HireCoachesView.tsx` | component; HireCoachesView |
| 189 | `apps/web/src/features/onboarding/components/chapters/HireScoutsView.tsx` | component; HireScoutsView |
| 75 | `apps/web/src/features/onboarding/components/chapters/OwnerMeetingView.tsx` | component; OwnerMeetingView |
| 64 | `apps/web/src/features/onboarding/components/chapters/PressConferenceView.tsx` | component; PressConferenceView |
| 101 | `apps/web/src/features/onboarding/components/chapters/RosterAssessmentView.tsx` | component; RosterAssessmentView |
| 93 | `apps/web/src/features/onboarding/components/chapters/ScoutingBriefingView.tsx` | component; ScoutingBriefingView |
| 96 | `apps/web/src/features/onboarding/components/chapters/SeasonStrategyView.tsx` | component; SeasonStrategyView |
| 94 | `apps/web/src/features/onboarding/components/chapters/StaffEvaluationView.tsx` | component; StaffEvaluationView |
| 34 | `apps/web/src/features/onboarding/components/shared.tsx` | component; GradeBadge |
| 344 | `apps/web/src/features/onboarding/hooks/useRevisedOnboardingPageController.test.tsx` | test |
| 331 | `apps/web/src/features/onboarding/hooks/useRevisedOnboardingPageController.tsx` | hook; RevisedOnboardingPageControllerWorker, RevisedOnboardingPageControllerGameState, UseRevisedOnboardingPageControllerOptions, RevisedOnboardingPageScreen, UseRevisedOnboardingPageControllerResult, useRevisedOnboardingPageController |
| 136 | `apps/web/src/features/onboarding/nudges/GuidedStartNudgeCard.tsx` | GuidedStartNudgeCard, GuidedStartNudgeCardProps |
| 95 | `apps/web/src/features/onboarding/nudges/guidedStartNudgeStore.ts` | normalizeGuidedStartSaveSlotId, guidedStartNudgeStorageKey, seenRecordFor, readGuidedStartNudgeRecord, registerGuidedStartSave, markGuidedStartNudgeSeen, GuidedStartSaveSlotId |
| 13 | `apps/web/src/features/onboarding/nudges/index.ts` | barrel/index; re-export {GuidedStartNudgeCard}, re-export {useNudges, type UseNudgesOptions, type UseNudgesResult}, re-export {GUIDED_START_NUDGE_IDS, type GuidedStartNudgeId}, re-export {guidedStartNudgeStorageKey, markGuidedStartNudgeSeen, normalizeGuidedStartSaveSlotId, readGuidedStartNudgeRecord, registerGuidedStartSave}, GuidedStartNudgeCard, useNudges, type UseNudgesOptions, type UseNudgesResult, GUIDED_START_NUDGE_IDS, type GuidedStartNudgeId, guidedStartNudgeStorageKey, markGuidedStartNudgeSeen, normalizeGuidedStartSaveSlotId, readGuidedStartNudgeRecord, ... (+1) |
| 100 | `apps/web/src/features/onboarding/nudges/nudgeState.ts` | isGuidedStartNudgeId, sanitizeSeenMap, createInitialNudgeState, reduceNudgeState, selectCurrentNudgeId, GUIDED_START_NUDGE_IDS, GuidedStartNudgeRecord, GuidedStartNudgeState, GuidedStartNudgeId, GuidedStartNudgeSeen, GuidedStartNudgeEvent |
| 78 | `apps/web/src/features/onboarding/nudges/useNudges.ts` | hook; useNudges, UseNudgesOptions, UseNudgesResult |
| 704 | `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.test.tsx` | test |
| 79 | `apps/web/src/features/onboarding/routes/RevisedOnboardingPage.tsx` | route; default:RevisedOnboardingPage |

### apps/web/src/features/players

Files: 46. Lines: 6933.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 189 | `apps/web/src/features/players/components/BreakoutIntelligencePanel.tsx` | component; default:BreakoutIntelligencePanel |
| 121 | `apps/web/src/features/players/components/DevelopmentDecisionPanel.test.tsx` | test |
| 101 | `apps/web/src/features/players/components/DevelopmentDecisionPanel.tsx` | component; default:DevelopmentDecisionPanel |
| 102 | `apps/web/src/features/players/components/DevelopmentTrajectoryPanel.test.tsx` | test |
| 82 | `apps/web/src/features/players/components/DevelopmentTrajectoryPanel.tsx` | component; default:DevelopmentTrajectoryPanel |
| 232 | `apps/web/src/features/players/components/DevelopmentTab.tsx` | component; default:DevelopmentTab |
| 178 | `apps/web/src/features/players/components/HistoryTab.tsx` | component; default:HistoryTab |
| 92 | `apps/web/src/features/players/components/MomentsTab.tsx` | component; default:MomentsTab |
| 72 | `apps/web/src/features/players/components/PersonalityTab.tsx` | component; default:PersonalityTab |
| 116 | `apps/web/src/features/players/components/PlayerComparisonResultsPanel.test.tsx` | test |
| 151 | `apps/web/src/features/players/components/PlayerComparisonResultsPanel.tsx` | component; default:PlayerComparisonResultsPanel |
| 133 | `apps/web/src/features/players/components/PlayerComparisonSearchPicker.test.tsx` | test |
| 114 | `apps/web/src/features/players/components/PlayerComparisonSearchPicker.tsx` | component; PlayerComparisonSearchPicker; type:PlayerComparisonSearchResult |
| 145 | `apps/web/src/features/players/components/PlayerProfileActionsPanel.test.tsx` | test |
| 174 | `apps/web/src/features/players/components/PlayerProfileActionsPanel.tsx` | component; default:PlayerProfileActionsPanel, PlayerProfileRosterAction, PlayerProfileBusyAction, PlayerProfileActionState, PendingProfileRosterAction, PlayerProfileActionsPanelProps |
| 91 | `apps/web/src/features/players/components/PlayerProfileContractSnapshotPanel.test.tsx` | test |
| 52 | `apps/web/src/features/players/components/PlayerProfileContractSnapshotPanel.tsx` | component; default:PlayerProfileContractSnapshotPanel, PlayerProfileContractSnapshotPanelProps |
| 177 | `apps/web/src/features/players/components/PlayerProfileInnerTabsDensePanel.test.tsx` | test |
| 188 | `apps/web/src/features/players/components/PlayerProfilePageContent.test.tsx` | test |
| 141 | `apps/web/src/features/players/components/PlayerProfilePageContent.tsx` | component; default:PlayerProfilePageContent, PlayerProfileSkeleton, PlayerProfilePageActions, PlayerProfilePageContentProps |
| 116 | `apps/web/src/features/players/components/PlayerProfileTabsPanel.test.tsx` | test |
| 96 | `apps/web/src/features/players/components/PlayerProfileTabsPanel.tsx` | component; default:PlayerProfileTabsPanel |
| 160 | `apps/web/src/features/players/components/PlayersPageContent.test.tsx` | test |
| 95 | `apps/web/src/features/players/components/PlayersPageContent.tsx` | component; default:PlayersPageContent, PlayersPageContentProps |
| 146 | `apps/web/src/features/players/components/ProfileHeader.tsx` | component; default:ProfileHeader |
| 154 | `apps/web/src/features/players/components/ProjectionsPanel.tsx` | component; default:ProjectionsPanel |
| 174 | `apps/web/src/features/players/components/ScoutConsensusPanel.tsx` | component; default:ScoutConsensusPanel |
| 171 | `apps/web/src/features/players/components/ScoutingTab.tsx` | component; default:ScoutingTab |
| 120 | `apps/web/src/features/players/components/SimilarPlayersPanel.tsx` | component; default:SimilarPlayersPanel |
| 153 | `apps/web/src/features/players/components/StatsTab.tsx` | component; default:StatsTab |
| 62 | `apps/web/src/features/players/components/StoryArcsTab.tsx` | component; default:StoryArcsTab |
| 363 | `apps/web/src/features/players/components/playerProfileShared.ts` | normalizePlayerProfileTab, labelize, moneyLabel, displayBand, moraleTone, badgeVariantForTrajectory, badgeVariantForStoryPhase, storyPhaseProgress, badgeVariantForSetback, formatMonth, formatMinorLevel, formatDecimal, formatInnings, isPitcherProfile, ... (+7) |
| 186 | `apps/web/src/features/players/hooks/usePlayerProfileActions.test.tsx` | test |
| 202 | `apps/web/src/features/players/hooks/usePlayerProfileActions.ts` | usePlayerProfileActions |
| 167 | `apps/web/src/features/players/hooks/usePlayerComparisonRouteData.test.tsx` | test |
| 86 | `apps/web/src/features/players/hooks/usePlayerComparisonRouteData.ts` | AttributeComparison, ComparisonPlayerRef, PlayerComparisonData, RankedAttribute, StatComparison, usePlayerComparisonRouteData |
| 171 | `apps/web/src/features/players/hooks/usePlayerProfileView.test.tsx` | test |
| 54 | `apps/web/src/features/players/hooks/usePlayerProfileView.ts` | usePlayerProfileView |
| 201 | `apps/web/src/features/players/hooks/usePlayersRouteData.test.tsx` | test |
| 57 | `apps/web/src/features/players/hooks/usePlayersRouteData.ts` | usePlayersRouteData |
| 198 | `apps/web/src/features/players/routes/PlayerComparisonPage.test.tsx` | test |
| 101 | `apps/web/src/features/players/routes/PlayerComparisonPage.tsx` | route; default:PlayerComparisonPage |
| 861 | `apps/web/src/features/players/routes/PlayerProfilePage.test.tsx` | test |
| 77 | `apps/web/src/features/players/routes/PlayerProfilePage.tsx` | route; default:PlayerProfilePage |
| 81 | `apps/web/src/features/players/routes/PlayersPage.test.tsx` | test |
| 30 | `apps/web/src/features/players/routes/PlayersPage.tsx` | route; default:PlayersPage |

### apps/web/src/features/playoffs

Files: 11. Lines: 1565.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 135 | `apps/web/src/features/playoffs/components/MomentumPanel.tsx` | component; default:MomentumPanel |
| 186 | `apps/web/src/features/playoffs/components/PlayoffCurrentSeriesPanel.test.tsx` | test |
| 159 | `apps/web/src/features/playoffs/components/PlayoffCurrentSeriesPanel.tsx` | component; default:PlayoffCurrentSeriesPanel |
| 129 | `apps/web/src/features/playoffs/components/PlayoffPreviewGrid.test.tsx` | test |
| 67 | `apps/web/src/features/playoffs/components/PlayoffPreviewGrid.tsx` | component; default:PlayoffPreviewGrid |
| 252 | `apps/web/src/features/playoffs/components/PlayoffsContentPanel.test.tsx` | test |
| 119 | `apps/web/src/features/playoffs/components/PlayoffsContentPanel.tsx` | component; PlayoffsContentPanel, DynastyScoreSummary |
| 209 | `apps/web/src/features/playoffs/hooks/usePlayoffsPageController.test.tsx` | test |
| 109 | `apps/web/src/features/playoffs/hooks/usePlayoffsPageController.ts` | hook; usePlayoffsPageController, PlayoffsPageControllerOptions |
| 146 | `apps/web/src/features/playoffs/routes/PlayoffsPage.test.tsx` | test |
| 54 | `apps/web/src/features/playoffs/routes/PlayoffsPage.tsx` | route; default:PlayoffsPage |

### apps/web/src/features/press-room

Files: 15. Lines: 2172.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 195 | `apps/web/src/features/press-room/components/PressConferenceModal.test.tsx` | test |
| 255 | `apps/web/src/features/press-room/components/PressConferenceModal.tsx` | component; PressConferenceModal |
| 67 | `apps/web/src/features/press-room/components/PressRoomFilterControls.test.tsx` | test |
| 91 | `apps/web/src/features/press-room/components/PressRoomFilterControls.tsx` | component; default:PressRoomFilterControls |
| 137 | `apps/web/src/features/press-room/components/PressRoomPageContent.test.tsx` | test |
| 104 | `apps/web/src/features/press-room/components/PressRoomPageContent.tsx` | component; default:PressRoomPageContent |
| 162 | `apps/web/src/features/press-room/components/PressRoomSourceBoard.test.tsx` | test |
| 283 | `apps/web/src/features/press-room/components/PressRoomSourceBoard.tsx` | component; default:PressRoomSourceBoard; type:PressRoomFeedSection; type:PressRoomSectionKey |
| 46 | `apps/web/src/features/press-room/components/PressRoomSummaryCards.test.tsx` | test |
| 52 | `apps/web/src/features/press-room/components/PressRoomSummaryCards.tsx` | component; default:PressRoomSummaryCards |
| 63 | `apps/web/src/features/press-room/components/PressRoomTransactionLog.test.tsx` | test |
| 81 | `apps/web/src/features/press-room/components/PressRoomTransactionLog.tsx` | component; default:PressRoomTransactionLog |
| 256 | `apps/web/src/features/press-room/hooks/usePressRoomRouteData.test.tsx` | test |
| 325 | `apps/web/src/features/press-room/hooks/usePressRoomRouteData.ts` | hook; usePressRoomRouteData |
| 214 | `apps/web/src/features/press-room/routes/PressRoomPage.test.tsx` | test |
| 71 | `apps/web/src/features/press-room/routes/PressRoomPage.tsx` | route; default:PressRoomPage |

### apps/web/src/features/pulse

Files: 6. Lines: 1073.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 186 | `apps/web/src/features/pulse/components/PulseContentPanel.test.tsx` | test |
| 318 | `apps/web/src/features/pulse/components/PulseContentPanel.tsx` | component; PulseContentPanel |
| 195 | `apps/web/src/features/pulse/hooks/usePulseRouteData.test.tsx` | test |
| 84 | `apps/web/src/features/pulse/hooks/usePulseRouteData.ts` | hook; usePulseRouteData |
| 235 | `apps/web/src/features/pulse/routes/PulsePage.test.tsx` | test |
| 55 | `apps/web/src/features/pulse/routes/PulsePage.tsx` | route; default:PulsePage |

### apps/web/src/features/records

Files: 6. Lines: 842.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 131 | `apps/web/src/features/records/components/RecordWatchContentPanel.test.tsx` | test |
| 271 | `apps/web/src/features/records/components/RecordWatchContentPanel.tsx` | component; RecordWatchContentPanel; type:RecordWatchViewMode |
| 177 | `apps/web/src/features/records/hooks/useRecordWatchRouteData.test.tsx` | test |
| 60 | `apps/web/src/features/records/hooks/useRecordWatchRouteData.ts` | hook; RecordBookGroups, useRecordWatchRouteData |
| 167 | `apps/web/src/features/records/routes/RecordWatchPage.test.tsx` | test |
| 36 | `apps/web/src/features/records/routes/RecordWatchPage.tsx` | route; default:RecordWatchPage |

### apps/web/src/features/rivalries

Files: 6. Lines: 676.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 108 | `apps/web/src/features/rivalries/components/RivalriesContentPanel.test.tsx` | test |
| 197 | `apps/web/src/features/rivalries/components/RivalriesContentPanel.tsx` | component; default:RivalriesContentPanel |
| 130 | `apps/web/src/features/rivalries/hooks/useRivalriesRouteData.test.tsx` | test |
| 37 | `apps/web/src/features/rivalries/hooks/useRivalriesRouteData.ts` | hook; useRivalriesRouteData |
| 180 | `apps/web/src/features/rivalries/routes/RivalriesPage.test.tsx` | test |
| 24 | `apps/web/src/features/rivalries/routes/RivalriesPage.tsx` | route; default:RivalriesPage |

### apps/web/src/features/roster

Files: 46. Lines: 7223.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 92 | `apps/web/src/features/roster/components/DepthChartDnD.test.tsx` | test |
| 270 | `apps/web/src/features/roster/components/DepthChartDnD.tsx` | component; sortPositionGroups, DepthChartPlayer, PositionGroup, default:DepthChartDnD |
| 107 | `apps/web/src/features/roster/components/ExtensionCommandCenter.test.tsx` | test |
| 133 | `apps/web/src/features/roster/components/ExtensionCommandCenter.tsx` | component; ExtensionCommandCenter, ExtensionCandidateView |
| 109 | `apps/web/src/features/roster/components/ExtensionOfferGuardrails.test.tsx` | test |
| 136 | `apps/web/src/features/roster/components/ExtensionOfferGuardrails.tsx` | component; ExtensionOfferGuardrails |
| 102 | `apps/web/src/features/roster/components/LineupBuilder.test.tsx` | test |
| 257 | `apps/web/src/features/roster/components/LineupBuilder.tsx` | component; LineupPlayer, default:LineupBuilder |
| 183 | `apps/web/src/features/roster/components/RosterActionConfirmationModal.test.tsx` | test |
| 93 | `apps/web/src/features/roster/components/RosterActionConfirmationModal.tsx` | component; RosterActionConfirmationModal, PendingRosterActionView |
| 117 | `apps/web/src/features/roster/components/RosterCompliancePanel.test.tsx` | test |
| 157 | `apps/web/src/features/roster/components/RosterCompliancePanel.tsx` | component; RosterCompliancePanel, ComplianceIssueView, DFACandidateView, RosterComplianceView |
| 105 | `apps/web/src/features/roster/components/RosterContractsPanel.test.tsx` | test |
| 95 | `apps/web/src/features/roster/components/RosterContractsPanel.tsx` | component; RosterContractsPanel |
| 297 | `apps/web/src/features/roster/components/RosterExtensionNegotiationModal.test.tsx` | test |
| 259 | `apps/web/src/features/roster/components/RosterExtensionNegotiationModal.tsx` | component; RosterExtensionNegotiationModal, ExtensionOfferView, ExtensionResponseView |
| 160 | `apps/web/src/features/roster/components/RosterLineupPanel.test.tsx` | test |
| 66 | `apps/web/src/features/roster/components/RosterLineupPanel.tsx` | component; RosterLineupPanel |
| 221 | `apps/web/src/features/roster/components/RosterMinorLeaguesPanel.test.tsx` | test |
| 215 | `apps/web/src/features/roster/components/RosterMinorLeaguesPanel.tsx` | component; RosterMinorLeaguesPanel, PromotionCandidateView, AffiliateOverviewView |
| 152 | `apps/web/src/features/roster/components/RosterMinorLevelTable.test.tsx` | test |
| 119 | `apps/web/src/features/roster/components/RosterMinorLevelTable.tsx` | component; RosterMinorLevelTable, RosterMinorLevelTableProps |
| 161 | `apps/web/src/features/roster/components/RosterMlbControlPanel.test.tsx` | test |
| 60 | `apps/web/src/features/roster/components/RosterMlbControlPanel.tsx` | component; RosterMlbControlPanel |
| 107 | `apps/web/src/features/roster/components/RosterPageContent.test.tsx` | test |
| 65 | `apps/web/src/features/roster/components/RosterPageContent.tsx` | component; RosterPageContentProps, default:RosterPageContent |
| 78 | `apps/web/src/features/roster/components/RosterStatusPanel.test.tsx` | test |
| 73 | `apps/web/src/features/roster/components/RosterStatusPanel.tsx` | component; RosterStatusPanel |
| 64 | `apps/web/src/features/roster/components/RosterTabs.test.tsx` | test |
| 25 | `apps/web/src/features/roster/components/RosterTabs.tsx` | component; RosterTab, default:RosterTabs |
| 250 | `apps/web/src/features/roster/hooks/useRosterActionHandlers.test.tsx` | test |
| 161 | `apps/web/src/features/roster/hooks/useRosterActionHandlers.ts` | hook; useRosterActionHandlers, PendingRosterAction |
| 161 | `apps/web/src/features/roster/hooks/useRosterExtensionNegotiation.test.tsx` | test |
| 132 | `apps/web/src/features/roster/hooks/useRosterExtensionNegotiation.ts` | hook; useRosterExtensionNegotiation |
| 213 | `apps/web/src/features/roster/hooks/useRosterLineupControls.test.tsx` | test |
| 183 | `apps/web/src/features/roster/hooks/useRosterLineupControls.ts` | hook; useRosterLineupControls |
| 216 | `apps/web/src/features/roster/hooks/useRosterPageController.test.tsx` | test |
| 225 | `apps/web/src/features/roster/hooks/useRosterPageController.ts` | hook; useRosterPageController |
| 324 | `apps/web/src/features/roster/hooks/useRosterRouteData.test.tsx` | test |
| 130 | `apps/web/src/features/roster/hooks/useRosterRouteData.ts` | hook; useRosterRouteData, RosterPlanView |
| 220 | `apps/web/src/features/roster/lib/rosterMlbColumns.test.tsx` | test |
| 186 | `apps/web/src/features/roster/lib/rosterMlbColumns.tsx` | buildHitterColumns, buildPitcherColumns |
| 97 | `apps/web/src/features/roster/lib/rosterPlanTransforms.test.ts` | test |
| 87 | `apps/web/src/features/roster/lib/rosterPlanTransforms.ts` | orderPlayersByPlan, buildBullpenPlanFromDepth, buildDepthPlanFromRosterPlan, buildDepthChartGroups |
| 534 | `apps/web/src/features/roster/routes/RosterPage.test.tsx` | test |
| 26 | `apps/web/src/features/roster/routes/RosterPage.tsx` | route; default:RosterPage |

### apps/web/src/features/save-recovery

Files: 10. Lines: 1059.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 88 | `apps/web/src/features/save-recovery/__tests__/reducer.test.ts` | test |
| 87 | `apps/web/src/features/save-recovery/__tests__/SaveLoadErrorBoundary.test.tsx` | test |
| 172 | `apps/web/src/features/save-recovery/__tests__/SaveRecoveryDialog.test.tsx` | test |
| 100 | `apps/web/src/features/save-recovery/__tests__/SaveRecoveryProvider.test.tsx` | test |
| 26 | `apps/web/src/features/save-recovery/download.ts` | rawRecoveryJson, downloadRawRecoveryJson |
| 22 | `apps/web/src/features/save-recovery/index.ts` | barrel/index; re-export {SaveLoadErrorBoundary, createSaveLoadRecoveryError, isSaveLoadRecoveryError, type SaveLoadRecoveryError}, re-export {SaveRecoveryDialog}, re-export {SaveRecoveryProvider, useSaveRecovery, type ShowSaveRecoveryOptions}, re-export {createSaveRecoveryRequest, initialSaveRecoveryState, saveRecoveryReducer, type SaveRecoveryEvent, type SaveRecoveryRequest, type SaveRecoveryState}, re-export {downloadRawRecoveryJson, rawRecoveryJson}, SaveLoadErrorBoundary, createSaveLoadRecoveryError, isSaveLoadRecoveryError, type SaveLoadRecoveryError, SaveRecoveryDialog, SaveRecoveryProvider, useSaveRecovery, type ShowSaveRecoveryOptions, createSaveRecoveryRequest, ... (+7) |
| 136 | `apps/web/src/features/save-recovery/reducer.ts` | createSaveRecoveryRequest, saveRecoveryReducer, initialSaveRecoveryState, SaveRecoveryRequest, SaveRecoveryState, SaveRecoveryEvent |
| 98 | `apps/web/src/features/save-recovery/SaveLoadErrorBoundary.tsx` | createSaveLoadRecoveryError, isSaveLoadRecoveryError, SaveLoadErrorBoundary, SaveLoadRecoveryError |
| 160 | `apps/web/src/features/save-recovery/SaveRecoveryDialog.tsx` | SaveRecoveryDialog |
| 170 | `apps/web/src/features/save-recovery/SaveRecoveryProvider.tsx` | SaveRecoveryProvider, useSaveRecovery, ShowSaveRecoveryOptions |

### apps/web/src/features/scenarios

Files: 6. Lines: 974.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 123 | `apps/web/src/features/scenarios/hooks/useScenarioCatalogRouteData.ts` | hook; useScenarioCatalogRouteData |
| 238 | `apps/web/src/features/scenarios/hooks/useScenarioCatalogRouteData.test.tsx` | test |
| 144 | `apps/web/src/features/scenarios/components/ScenarioCatalogContentPanel.test.tsx` | test |
| 264 | `apps/web/src/features/scenarios/components/ScenarioCatalogContentPanel.tsx` | component; default:ScenarioCatalogContentPanel, ObjectivesView, Scenario, ScenarioProgress, ObjectiveItem |
| 168 | `apps/web/src/features/scenarios/routes/ScenarioCatalogPage.test.tsx` | test |
| 37 | `apps/web/src/features/scenarios/routes/ScenarioCatalogPage.tsx` | route; default:ScenarioCatalogPage |

### apps/web/src/features/schedule

Files: 15. Lines: 1755.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 107 | `apps/web/src/features/schedule/components/BoxScoreContentPanel.test.tsx` | test |
| 204 | `apps/web/src/features/schedule/components/BoxScoreContentPanel.tsx` | component; PlayEntry, BoxScoreData, GamePlayByPlayView, default:BoxScoreContentPanel |
| 112 | `apps/web/src/features/schedule/components/EnhancedPlayByPlay.tsx` | component; default:EnhancedPlayByPlay |
| 176 | `apps/web/src/features/schedule/components/ScheduleContentPanel.test.tsx` | test |
| 161 | `apps/web/src/features/schedule/components/ScheduleContentPanel.tsx` | component; default:ScheduleContentPanel, ScheduleGameEntry |
| 130 | `apps/web/src/features/schedule/hooks/useBoxScoreRouteData.test.tsx` | test |
| 45 | `apps/web/src/features/schedule/hooks/useBoxScoreRouteData.ts` | hook; useBoxScoreRouteData |
| 130 | `apps/web/src/features/schedule/hooks/useEnhancedPlayByPlayData.test.tsx` | test |
| 52 | `apps/web/src/features/schedule/hooks/useEnhancedPlayByPlayData.ts` | hook; useEnhancedPlayByPlayData, EnhancedPlayByPlayEntry, EnhancedPlayByPlayData |
| 134 | `apps/web/src/features/schedule/hooks/useScheduleRouteData.test.tsx` | test |
| 34 | `apps/web/src/features/schedule/hooks/useScheduleRouteData.ts` | hook; useScheduleRouteData |
| 191 | `apps/web/src/features/schedule/routes/BoxScorePage.test.tsx` | test |
| 71 | `apps/web/src/features/schedule/routes/BoxScorePage.tsx` | route; default:BoxScorePage |
| 171 | `apps/web/src/features/schedule/routes/SchedulePage.test.tsx` | test |
| 37 | `apps/web/src/features/schedule/routes/SchedulePage.tsx` | route; default:SchedulePage |

### apps/web/src/features/scouting

Files: 28. Lines: 3577.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 136 | `apps/web/src/features/scouting/components/IFABoardPanel.test.tsx` | test |
| 110 | `apps/web/src/features/scouting/components/IFABoardPanel.tsx` | component; default:IFABoardPanel |
| 186 | `apps/web/src/features/scouting/components/InternationalProspectReportPanel.test.tsx` | test |
| 204 | `apps/web/src/features/scouting/components/InternationalProspectReportPanel.tsx` | component; default:InternationalProspectReportPanel |
| 241 | `apps/web/src/features/scouting/components/InternationalScoutingPanel.test.tsx` | test |
| 175 | `apps/web/src/features/scouting/components/InternationalScoutingPanel.tsx` | component; ScoutingTradeTarget, formatScoutingMoney, default:InternationalScoutingPanel |
| 102 | `apps/web/src/features/scouting/components/ProScoutReportPanel.test.tsx` | test |
| 133 | `apps/web/src/features/scouting/components/ProScoutReportPanel.tsx` | component; ScoutReportView, default:ProScoutReportPanel |
| 247 | `apps/web/src/features/scouting/components/ProScoutingPanel.test.tsx` | test |
| 132 | `apps/web/src/features/scouting/components/ProScoutingPanel.tsx` | component; ScoutReportView, default:ProScoutingPanel |
| 108 | `apps/web/src/features/scouting/components/ScoutConflictCard.test.tsx` | test |
| 131 | `apps/web/src/features/scouting/components/ScoutConflictCard.tsx` | component; default:ScoutConflictCard |
| 153 | `apps/web/src/features/scouting/components/ScoutConflictsTab.test.tsx` | test |
| 77 | `apps/web/src/features/scouting/components/ScoutConflictsTab.tsx` | component; ScoutConflictsTab |
| 65 | `apps/web/src/features/scouting/components/ScoutingDepartmentPanel.test.tsx` | test |
| 55 | `apps/web/src/features/scouting/components/ScoutingDepartmentPanel.tsx` | component; ScoutingDepartmentPanel, ScoutView |
| 82 | `apps/web/src/features/scouting/components/ScoutingFrontOfficeContextPanel.test.tsx` | test |
| 71 | `apps/web/src/features/scouting/components/ScoutingFrontOfficeContextPanel.tsx` | component; ScoutingFrontOfficeContextPanel, ScoutingOwnerStateView |
| 137 | `apps/web/src/features/scouting/components/ScoutingPageContent.test.tsx` | test |
| 122 | `apps/web/src/features/scouting/components/ScoutingPageContent.tsx` | component; ScoutingPageContentProps, default:ScoutingPageContent |
| 55 | `apps/web/src/features/scouting/components/ScoutingViewTabs.test.tsx` | test |
| 68 | `apps/web/src/features/scouting/components/ScoutingViewTabs.tsx` | component; ScoutingView, default:ScoutingViewTabs |
| 140 | `apps/web/src/features/scouting/hooks/useScoutConflictsData.test.tsx` | test |
| 65 | `apps/web/src/features/scouting/hooks/useScoutConflictsData.ts` | hook; useScoutConflictsData; type:ScoutConflict; type:ScoutOpinion |
| 204 | `apps/web/src/features/scouting/hooks/useScoutingPageController.test.tsx` | test |
| 238 | `apps/web/src/features/scouting/hooks/useScoutingPageController.ts` | hook; UseScoutingPageControllerOptions, useScoutingPageController |
| 115 | `apps/web/src/features/scouting/routes/ScoutingPage.test.tsx` | test |
| 25 | `apps/web/src/features/scouting/routes/ScoutingPage.tsx` | route; default:ScoutingPage |

### apps/web/src/features/settings

Files: 22. Lines: 3791.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 70 | `apps/web/src/features/settings/components/SettingsAboutPanel.test.tsx` | test |
| 33 | `apps/web/src/features/settings/components/SettingsAboutPanel.tsx` | component; default:SettingsAboutPanel |
| 158 | `apps/web/src/features/settings/components/SettingsDiagnosticsPanel.test.tsx` | test |
| 180 | `apps/web/src/features/settings/components/SettingsDiagnosticsPanel.tsx` | component; default:SettingsDiagnosticsPanel |
| 184 | `apps/web/src/features/settings/components/SettingsPageContent.test.tsx` | test |
| 151 | `apps/web/src/features/settings/components/SettingsPageContent.tsx` | component; SettingsSectionKey, default:SettingsPageContent |
| 143 | `apps/web/src/features/settings/components/SettingsPreferencesPanel.test.tsx` | test |
| 278 | `apps/web/src/features/settings/components/SettingsPreferencesPanel.tsx` | component; SettingsDefaultStatView, SettingsPreferenceSectionKey, SettingsPreferencesPanel, SettingsPreferencesPanelProps, SettingsSimSpeed, SettingsTableDensity |
| 181 | `apps/web/src/features/settings/components/SettingsSaveDataPanel.test.tsx` | test |
| 280 | `apps/web/src/features/settings/components/SettingsSaveDataPanel.tsx` | component; SettingsSaveDataPanel, SettingsSaveDataPanelProps |
| 75 | `apps/web/src/features/settings/components/SettingsSection.test.tsx` | test |
| 43 | `apps/web/src/features/settings/components/SettingsSection.tsx` | component; default:SettingsSection |
| 199 | `apps/web/src/features/settings/hooks/useSettingsDiagnosticsData.test.tsx` | test |
| 105 | `apps/web/src/features/settings/hooks/useSettingsDiagnosticsData.ts` | hook; useSettingsDiagnosticsData |
| 137 | `apps/web/src/features/settings/hooks/useSettingsInstallPrompt.test.tsx` | test |
| 70 | `apps/web/src/features/settings/hooks/useSettingsInstallPrompt.ts` | hook; useSettingsInstallPrompt |
| 170 | `apps/web/src/features/settings/hooks/useSettingsPreferenceControls.test.tsx` | test |
| 109 | `apps/web/src/features/settings/hooks/useSettingsPreferenceControls.ts` | hook; useSettingsPreferenceControls |
| 320 | `apps/web/src/features/settings/hooks/useSettingsSaveData.test.tsx` | test |
| 284 | `apps/web/src/features/settings/hooks/useSettingsSaveData.ts` | hook; useSettingsSaveData |
| 552 | `apps/web/src/features/settings/routes/SettingsPage.test.tsx` | test |
| 69 | `apps/web/src/features/settings/routes/SettingsPage.tsx` | route; default:SettingsPage |

### apps/web/src/features/setup

Files: 20. Lines: 4487.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 227 | `apps/web/src/features/setup/components/SetupDynastyWizardPanel.test.tsx` | test |
| 304 | `apps/web/src/features/setup/components/SetupDynastyWizardPanel.tsx` | component; default:SetupDynastyWizardPanel, ScenarioCatalogEntry, SetupDayOneExperience, SetupDifficulty, SetupDynastyWizardPanelProps, SetupPlayMode, SetupWizardMode |
| 227 | `apps/web/src/features/setup/components/SetupPageContent.test.tsx` | test |
| 112 | `apps/web/src/features/setup/components/SetupPageContent.tsx` | component; default:SetupPageContent, SetupPageContentProps |
| 209 | `apps/web/src/features/setup/components/SetupSaveHubPanel.test.tsx` | test |
| 187 | `apps/web/src/features/setup/components/SetupSaveHubPanel.tsx` | component; default:SetupSaveHubPanel, SetupSaveHubPanelProps |
| 118 | `apps/web/src/features/setup/components/SetupSeasonPreviewPanel.test.tsx` | test |
| 219 | `apps/web/src/features/setup/components/SetupSeasonPreviewPanel.tsx` | component; default:SetupSeasonPreviewPanel, SetupSeasonPreviewPanelProps |
| 177 | `apps/web/src/features/setup/components/SetupTeamPickerPanel.test.tsx` | test |
| 224 | `apps/web/src/features/setup/components/SetupTeamPickerPanel.tsx` | component; default:SetupTeamPickerPanel, SetupPreview, SetupTeamOption, SetupTeamPickerFilters, SetupTeamPickerPanelProps, TeamPreviewFilter |
| 272 | `apps/web/src/features/setup/hooks/useSetupActionHandlers.test.tsx` | test |
| 270 | `apps/web/src/features/setup/hooks/useSetupActionHandlers.ts` | hook; UseSetupActionHandlersOptions, UseSetupActionHandlersResult, useSetupActionHandlers |
| 181 | `apps/web/src/features/setup/hooks/useSetupPageController.test.tsx` | test |
| 287 | `apps/web/src/features/setup/hooks/useSetupPageController.ts` | hook; SETUP_TEAM_OPTIONS, UseSetupPageControllerOptions, useSetupPageController |
| 246 | `apps/web/src/features/setup/hooks/useSetupRouteData.test.tsx` | test |
| 171 | `apps/web/src/features/setup/hooks/useSetupRouteData.ts` | hook; useSetupRouteData |
| 142 | `apps/web/src/features/setup/hooks/useSetupWizardControls.test.tsx` | test |
| 130 | `apps/web/src/features/setup/hooks/useSetupWizardControls.ts` | hook; generateDefaultGMName, useSetupWizardControls |
| 757 | `apps/web/src/features/setup/routes/SetupPage.test.tsx` | test |
| 27 | `apps/web/src/features/setup/routes/SetupPage.tsx` | route; default:SetupPage |

### apps/web/src/features/staff

Files: 24. Lines: 2887.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 129 | `apps/web/src/features/staff/components/CoachingRadarChart.tsx` | component; default |
| 53 | `apps/web/src/features/staff/components/StaffBudgetPanel.test.tsx` | test |
| 30 | `apps/web/src/features/staff/components/StaffBudgetPanel.tsx` | component; StaffBudgetPanel |
| 104 | `apps/web/src/features/staff/components/StaffChemistryPanel.test.tsx` | test |
| 129 | `apps/web/src/features/staff/components/StaffChemistryPanel.tsx` | component; StaffChemistryPanel |
| 121 | `apps/web/src/features/staff/components/StaffCurrentStaffPanel.test.tsx` | test |
| 71 | `apps/web/src/features/staff/components/StaffCurrentStaffPanel.tsx` | component; StaffCurrentStaffPanel |
| 69 | `apps/web/src/features/staff/components/StaffImpactPanel.test.tsx` | test |
| 39 | `apps/web/src/features/staff/components/StaffImpactPanel.tsx` | component; StaffImpactPanel |
| 154 | `apps/web/src/features/staff/components/StaffMarketPanel.test.tsx` | test |
| 121 | `apps/web/src/features/staff/components/StaffMarketPanel.tsx` | component; StaffMarketPanel |
| 203 | `apps/web/src/features/staff/components/StaffMentorshipPanel.test.tsx` | test |
| 184 | `apps/web/src/features/staff/components/StaffMentorshipPanel.tsx` | component; default:StaffMentorshipPanel, MentorshipPairingView, ClubhouseLeaderView, ClubhouseConflictRiskView, MentorshipView |
| 90 | `apps/web/src/features/staff/components/StaffOnboardingImpactPanel.test.tsx` | test |
| 73 | `apps/web/src/features/staff/components/StaffOnboardingImpactPanel.tsx` | component; StaffOnboardingImpactPanel |
| 252 | `apps/web/src/features/staff/components/StaffPageContent.test.tsx` | test |
| 120 | `apps/web/src/features/staff/components/StaffPageContent.tsx` | component; default:StaffPageContent, StaffPageTab, StaffPageContentProps |
| 38 | `apps/web/src/features/staff/components/staffPresentation.ts` | CoachView, StaffBudgetView, PlayerAffinityView, ratingFromFraction, moneyLabel |
| 126 | `apps/web/src/features/staff/hooks/useStaffActionHandlers.test.tsx` | test |
| 53 | `apps/web/src/features/staff/hooks/useStaffActionHandlers.ts` | hook; useStaffActionHandlers |
| 245 | `apps/web/src/features/staff/hooks/useStaffRouteData.test.tsx` | test |
| 130 | `apps/web/src/features/staff/hooks/useStaffRouteData.ts` | CoachingImpactView, ChemistryView, useStaffRouteData |
| 288 | `apps/web/src/features/staff/routes/StaffPage.test.tsx` | test |
| 65 | `apps/web/src/features/staff/routes/StaffPage.tsx` | route; default:StaffPage |

### apps/web/src/features/stats

Files: 11. Lines: 1043.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 50 | `apps/web/src/features/stats/components/QualityScaleBar.test.ts` | test |
| 133 | `apps/web/src/features/stats/components/QualityScaleBar.tsx` | component; QualityScaleBar, QUALITY_SCALES |
| 120 | `apps/web/src/features/stats/components/StatsDefinitionLibraryPanel.test.tsx` | test |
| 147 | `apps/web/src/features/stats/components/StatsDefinitionLibraryPanel.tsx` | component; CategoryFilter, StatCategory, StatDefinition, StatsDefinitionLibraryPanel |
| 63 | `apps/web/src/features/stats/components/StatsEncyclopediaContent.test.tsx` | test |
| 84 | `apps/web/src/features/stats/components/StatsEncyclopediaContent.tsx` | component; StatsEncyclopediaContentProps, default:StatsEncyclopediaContent |
| 134 | `apps/web/src/features/stats/data/statDefinitions.ts` | STAT_DEFINITIONS |
| 121 | `apps/web/src/features/stats/hooks/useStatsEncyclopediaRouteData.test.tsx` | test |
| 49 | `apps/web/src/features/stats/hooks/useStatsEncyclopediaRouteData.ts` | hook; LeagueContextView, useStatsEncyclopediaRouteData |
| 106 | `apps/web/src/features/stats/routes/StatsEncyclopediaPage.test.tsx` | test |
| 36 | `apps/web/src/features/stats/routes/StatsEncyclopediaPage.tsx` | route; default:StatsEncyclopediaPage |

### apps/web/src/features/trade

Files: 90. Lines: 13695.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 86 | `apps/web/src/features/trade/components/DeadlineBiddingWarCard.test.tsx` | test |
| 56 | `apps/web/src/features/trade/components/DeadlineBiddingWarCard.tsx` | component; default:DeadlineBiddingWarCard |
| 46 | `apps/web/src/features/trade/components/DeadlineDramaPanel.tsx` | component; default:DeadlineDramaPanel |
| 141 | `apps/web/src/features/trade/components/DeadlineDramaPanelBody.test.tsx` | test |
| 220 | `apps/web/src/features/trade/components/DeadlineDramaPanelBody.tsx` | component; DeadlineEventType, DeadlineEvent, BiddingWarRound, ActiveBiddingWar, TradeDeadlineDrama, default:DeadlineDramaPanelBody |
| 52 | `apps/web/src/features/trade/components/DeadlineEventRow.test.tsx` | test |
| 107 | `apps/web/src/features/trade/components/DeadlineEventRow.tsx` | component; DeadlineEventType, DeadlineEvent, default:DeadlineEventRow |
| 101 | `apps/web/src/features/trade/components/DeadlineRecapCard.test.tsx` | test |
| 55 | `apps/web/src/features/trade/components/DeadlineRecapCard.tsx` | component; default:DeadlineRecapCard |
| 103 | `apps/web/src/features/trade/components/DeadlineTheatreCard.test.tsx` | test |
| 197 | `apps/web/src/features/trade/components/DeadlineTheatreCard.tsx` | component; default:DeadlineTheatreCard |
| 144 | `apps/web/src/features/trade/components/MultiTeamControlColumn.test.tsx` | test |
| 127 | `apps/web/src/features/trade/components/MultiTeamControlColumn.tsx` | component; default:MultiTeamControlColumn |
| 156 | `apps/web/src/features/trade/components/MultiTeamFrameworkSummaryPanel.test.tsx` | test |
| 99 | `apps/web/src/features/trade/components/MultiTeamFrameworkSummaryPanel.tsx` | component; MultiTeamRoleView, MultiTeamFrameworkTeamView, MultiTeamMovedPlayerView, default:MultiTeamFrameworkSummaryPanel |
| 162 | `apps/web/src/features/trade/components/MultiTeamLaneCard.test.tsx` | test |
| 138 | `apps/web/src/features/trade/components/MultiTeamLaneCard.tsx` | component; MultiTeamRole, MultiTeamLaneState, default:MultiTeamLaneCard |
| 92 | `apps/web/src/features/trade/components/MultiTeamResultStack.test.tsx` | test |
| 70 | `apps/web/src/features/trade/components/MultiTeamResultStack.tsx` | component; default:MultiTeamResultStack |
| 333 | `apps/web/src/features/trade/components/MultiTeamTradeModal.test.tsx` | test |
| 290 | `apps/web/src/features/trade/components/MultiTeamTradeModal.tsx` | component; default:MultiTeamTradeModal |
| 210 | `apps/web/src/features/trade/components/TradeActivityColumn.test.tsx` | test |
| 131 | `apps/web/src/features/trade/components/TradeActivityColumn.tsx` | component; default:TradeActivityColumn |
| 179 | `apps/web/src/features/trade/components/TradeAssetColumnPanel.test.tsx` | test |
| 252 | `apps/web/src/features/trade/components/TradeAssetColumnPanel.tsx` | component; default:TradeAssetColumnPanel |
| 255 | `apps/web/src/features/trade/components/TradeAssetSelectionGrid.test.tsx` | test |
| 118 | `apps/web/src/features/trade/components/TradeAssetSelectionGrid.tsx` | component; DraftPickAsset, TradeAssetFilter, default:TradeAssetSelectionGrid |
| 137 | `apps/web/src/features/trade/components/TradeBuilderContextPanel.test.tsx` | test |
| 208 | `apps/web/src/features/trade/components/TradeBuilderContextPanel.tsx` | component; RelationshipView; default:TradeBuilderContextPanel |
| 219 | `apps/web/src/features/trade/components/TradeBuilderPanel.test.tsx` | test |
| 44 | `apps/web/src/features/trade/components/TradeBuilderPanel.tsx` | component; default:TradeBuilderPanel |
| 175 | `apps/web/src/features/trade/components/TradeBuilderStack.test.tsx` | test |
| 26 | `apps/web/src/features/trade/components/TradeBuilderStack.tsx` | component; default:TradeBuilderStack |
| 121 | `apps/web/src/features/trade/components/TradeDeadlineDashboard.test.tsx` | test |
| 36 | `apps/web/src/features/trade/components/TradeDeadlineDashboard.tsx` | component; default:TradeDeadlineDashboard |
| 97 | `apps/web/src/features/trade/components/TradeHistoryLedgerPanel.test.tsx` | test |
| 61 | `apps/web/src/features/trade/components/TradeHistoryLedgerPanel.tsx` | component; default:TradeHistoryLedgerPanel |
| 38 | `apps/web/src/features/trade/components/TradeLoadingSkeleton.test.tsx` | test |
| 14 | `apps/web/src/features/trade/components/TradeLoadingSkeleton.tsx` | component; default:TradeLoadingSkeleton |
| 60 | `apps/web/src/features/trade/components/TradeMarketStatusPanel.test.tsx` | test |
| 27 | `apps/web/src/features/trade/components/TradeMarketStatusPanel.tsx` | component; default:TradeMarketStatusPanel |
| 136 | `apps/web/src/features/trade/components/TradeNegotiationPanel.test.tsx` | test |
| 127 | `apps/web/src/features/trade/components/TradeNegotiationPanel.tsx` | component; default:TradeNegotiationPanel |
| 123 | `apps/web/src/features/trade/components/TradeNegotiationSummaryCard.test.tsx` | test |
| 77 | `apps/web/src/features/trade/components/TradeNegotiationSummaryCard.tsx` | component; default:TradeNegotiationSummaryCard |
| 103 | `apps/web/src/features/trade/components/TradeOfferCard.test.tsx` | test |
| 125 | `apps/web/src/features/trade/components/TradeOfferCard.tsx` | component; default:TradeOfferCard |
| 78 | `apps/web/src/features/trade/components/TradePackageEvaluationCard.test.tsx` | test |
| 169 | `apps/web/src/features/trade/components/TradePackageEvaluationCard.tsx` | component; TradePackageSummaryItem; default:TradePackageEvaluationCard |
| 160 | `apps/web/src/features/trade/components/TradePageContent.test.tsx` | test |
| 35 | `apps/web/src/features/trade/components/TradePageContent.tsx` | component; default:TradePageContent, TradePageContentProps |
| 42 | `apps/web/src/features/trade/components/TradePageHeader.test.tsx` | test |
| 15 | `apps/web/src/features/trade/components/TradePageHeader.tsx` | component; default:TradePageHeader |
| 76 | `apps/web/src/features/trade/components/TradeResultBanner.test.tsx` | test |
| 67 | `apps/web/src/features/trade/components/TradeResultBanner.tsx` | component; TradeResultView; default:TradeResultBanner |
| 74 | `apps/web/src/features/trade/components/tradePresentation.ts` | buildTradeAssetLabel, dialogueUrgencyClass, fairnessText, modeBadgeClass, modeLabel |
| 264 | `apps/web/src/features/trade/hooks/useTradeActionHandlers.test.tsx` | test |
| 291 | `apps/web/src/features/trade/hooks/useTradeActionHandlers.ts` | UseTradeActionHandlersOptions, useTradeActionHandlers |
| 162 | `apps/web/src/features/trade/hooks/useTradeAssetBuilder.test.tsx` | test |
| 166 | `apps/web/src/features/trade/hooks/useTradeAssetBuilder.ts` | UseTradeAssetBuilderOptions, UseTradeAssetBuilderResult, useTradeAssetBuilder |
| 147 | `apps/web/src/features/trade/hooks/useTradeBuilderCoordinator.test.tsx` | test |
| 88 | `apps/web/src/features/trade/hooks/useTradeBuilderCoordinator.ts` | UseTradeBuilderCoordinatorOptions, UseTradeBuilderCoordinatorResult, useTradeBuilderCoordinator |
| 158 | `apps/web/src/features/trade/hooks/useTradeDialogue.test.tsx` | test |
| 72 | `apps/web/src/features/trade/hooks/useTradeDialogue.ts` | useTradeDialogue |
| 137 | `apps/web/src/features/trade/hooks/useTradeMarketContext.test.tsx` | test |
| 63 | `apps/web/src/features/trade/hooks/useTradeMarketContext.ts` | UseTradeMarketContextOptions, UseTradeMarketContextResult, useTradeMarketContext |
| 211 | `apps/web/src/features/trade/hooks/useTradeMultiTeamBuilder.test.tsx` | test |
| 269 | `apps/web/src/features/trade/hooks/useTradeMultiTeamBuilder.ts` | UseTradeMultiTeamBuilderOptions, UseTradeMultiTeamBuilderResult, useTradeMultiTeamBuilder |
| 151 | `apps/web/src/features/trade/hooks/useTradeMultiTeamRosters.test.tsx` | test |
| 73 | `apps/web/src/features/trade/hooks/useTradeMultiTeamRosters.ts` | useTradeMultiTeamRosters |
| 170 | `apps/web/src/features/trade/hooks/useTradeNegotiationState.test.tsx` | test |
| 146 | `apps/web/src/features/trade/hooks/useTradeNegotiationState.ts` | UseTradeNegotiationStateOptions, UseTradeNegotiationStateResult, useTradeNegotiationState |
| 169 | `apps/web/src/features/trade/hooks/useTradePageController.test.tsx` | test |
| 330 | `apps/web/src/features/trade/hooks/useTradePageController.ts` | hook; TradePageControllerWorker, TradePageControllerGameState, UseTradePageControllerOptions, UseTradePageControllerResult, useTradePageController |
| 107 | `apps/web/src/features/trade/hooks/useTradePackageSummary.test.tsx` | test |
| 72 | `apps/web/src/features/trade/hooks/useTradePackageSummary.ts` | UseTradePackageSummaryOptions, UseTradePackageSummaryResult, useTradePackageSummary |
| 181 | `apps/web/src/features/trade/hooks/useTradeRouteData.test.tsx` | test |
| 202 | `apps/web/src/features/trade/hooks/useTradeRouteData.ts` | useTradeRouteData |
| 101 | `apps/web/src/features/trade/hooks/useTradeResultAudio.test.tsx` | test |
| 21 | `apps/web/src/features/trade/hooks/useTradeResultAudio.ts` | useTradeResultAudio |
| 183 | `apps/web/src/features/trade/hooks/useTradeSnapshotPersistence.test.tsx` | test |
| 47 | `apps/web/src/features/trade/hooks/useTradeSnapshotPersistence.ts` | useTradeSnapshotPersistence |
| 554 | `apps/web/src/features/trade/lib/tradeBuilderTransforms.test.ts` | test |
| 611 | `apps/web/src/features/trade/lib/tradeBuilderTransforms.ts` | ALL_TEAMS, ALL_TEAM_OPTIONS, tradeResultStatusFromNegotiationDecision, tradeResultFromNegotiationAction, tradeResultStatusFromOfferDecision, tradeResultFromOfferResponse, normalizeMultiTeamRoles, buildInitialMultiTeamLanes, buildOpenMultiTeamBuilderState, sortPlayerList, teamDisplayName, multiTeamProposalFromLanes, buildMultiTeamMovedPlayers, setMultiTeamLaneTeam, toggleMultiTeamLanePlayer, updateMultiTeamLaneDestination, addMultiTeamLane, removeMultiTeamLane, estimateValue, fairnessRatio, fairnessLabel, validateTradeSubmission, ... (+24) |
| 219 | `apps/web/src/features/trade/lib/tradePageContentProps.test.ts` | test |
| 250 | `apps/web/src/features/trade/lib/tradePageContentProps.ts` | buildTradePageContentProps, BuildTradePageContentPropsInput |
| 165 | `apps/web/src/features/trade/lib/tradeRouteContentProps.test.ts` | test |
| 138 | `apps/web/src/features/trade/lib/tradeRouteContentProps.ts` | buildTradeRouteContentProps, BuildTradeRouteContentPropsInput |
| 1164 | `apps/web/src/features/trade/routes/TradePage.test.tsx` | test |
| 23 | `apps/web/src/features/trade/routes/TradePage.tsx` | route; default:TradePage |

### apps/web/src/shared/components

Files: 38. Lines: 3885.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 61 | `apps/web/src/shared/components/AnimatedNumber.tsx` | component; AnimatedNumber |
| 64 | `apps/web/src/shared/components/charts/AttributeRadar.test.ts` | test |
| 146 | `apps/web/src/shared/components/charts/AttributeRadar.tsx` | component; transformHitterRadarData, transformPitcherRadarData, RadarDataPoint, default:AttributeRadar |
| 70 | `apps/web/src/shared/components/charts/CareerArcChart.test.ts` | test |
| 130 | `apps/web/src/shared/components/charts/CareerArcChart.tsx` | component; transformCareerArcData, CareerArcDataPoint, default:CareerArcChart |
| 214 | `apps/web/src/shared/components/charts/charts-edge-cases.test.ts` | test |
| 99 | `apps/web/src/shared/components/charts/chartTheme.ts` | chartGridProps, chartAxisProps, chartTooltipProps, CHART_COLORS, SERIES_PALETTE, CHART_FONTS, HITTER_ATTRS, PITCHER_ATTRS, HITTER_ATTR_LABELS, PITCHER_ATTR_LABELS, DISPLAY_RATING_MIN, DISPLAY_RATING_MAX |
| 49 | `apps/web/src/shared/components/charts/DevCurveChart.test.ts` | test |
| 125 | `apps/web/src/shared/components/charts/DevCurveChart.tsx` | component; transformDevCurveData, DevCurveDataPoint, default:DevCurveChart |
| 47 | `apps/web/src/shared/components/charts/LeagueLeadersChart.test.ts` | test |
| 105 | `apps/web/src/shared/components/charts/LeagueLeadersChart.tsx` | component; transformLeaderData, LeaderBarData, default:LeagueLeadersChart |
| 51 | `apps/web/src/shared/components/charts/PayrollBreakdownChart.test.ts` | test |
| 121 | `apps/web/src/shared/components/charts/PayrollBreakdownChart.tsx` | component; transformPayrollData, formatSalary, PayrollSlice, default:PayrollBreakdownChart |
| 50 | `apps/web/src/shared/components/charts/ProspectCompareChart.test.ts` | test |
| 131 | `apps/web/src/shared/components/charts/ProspectCompareChart.tsx` | component; transformProspectCompareData, ProspectRadarEntry, ProspectInput, default:ProspectCompareChart |
| 49 | `apps/web/src/shared/components/charts/Sparkline.test.ts` | test |
| 64 | `apps/web/src/shared/components/charts/Sparkline.tsx` | component; transformSparklineData, sparklineTrendColor, SparklineDataPoint, default:Sparkline |
| 54 | `apps/web/src/shared/components/charts/StandingsTrendChart.test.ts` | test |
| 134 | `apps/web/src/shared/components/charts/StandingsTrendChart.tsx` | component; transformStandingsData, StandingsBarData, default:StandingsTrendChart |
| 238 | `apps/web/src/shared/components/ContextualHelp.tsx` | component; ContextualHelp, PAGE_HELP |
| 56 | `apps/web/src/shared/components/DensePanel.test.tsx` | test |
| 70 | `apps/web/src/shared/components/DensePanel.tsx` | component; DensePanel |
| 95 | `apps/web/src/shared/components/EmptyStatePanel.test.tsx` | test |
| 64 | `apps/web/src/shared/components/EmptyStatePanel.tsx` | component; EmptyStatePanel |
| 191 | `apps/web/src/shared/components/KeyboardShortcutsPanel.tsx` | component; KeyboardShortcutsPanel |
| 59 | `apps/web/src/shared/components/KeyboardShortcutsPanel.test.tsx` | test |
| 119 | `apps/web/src/shared/components/PageHelp.test.tsx` | test |
| 124 | `apps/web/src/shared/components/PageHelp.tsx` | component; PageHelp |
| 108 | `apps/web/src/shared/components/PageShell.test.tsx` | test |
| 67 | `apps/web/src/shared/components/PageShell.tsx` | component; PageShell |
| 34 | `apps/web/src/shared/components/ProgressFill.tsx` | component; ProgressFill |
| 38 | `apps/web/src/shared/components/ResponsiveTable.test.ts` | test |
| 133 | `apps/web/src/shared/components/ResponsiveTable.tsx` | component; ColumnDef |
| 41 | `apps/web/src/shared/components/SeasonNarrativePanel.tsx` | component; SeasonNarrativePanel |
| 63 | `apps/web/src/shared/components/TeamLogo.test.tsx` | test |
| 179 | `apps/web/src/shared/components/TeamLogo.tsx` | component; TeamLogo, getTeamColors |
| 214 | `apps/web/src/shared/components/TourProvider.tsx` | component; useTour, TourProvider |
| 260 | `apps/web/src/shared/components/TourStep.tsx` | component; TourStep |

### apps/web/src/shared/hooks

Files: 14. Lines: 2086.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 37 | `apps/web/src/shared/hooks/useActiveSaveAutosave.ts` | hook; useActiveSaveAutosave |
| 127 | `apps/web/src/shared/hooks/useAudioPreferencesStore.test.ts` | test |
| 120 | `apps/web/src/shared/hooks/useAudioPreferencesStore.ts` | hook; AUDIO_PREFERENCES_STORAGE_KEY, AUDIO_PREFERENCES_DEFAULTS, useAudioPreferencesStore |
| 43 | `apps/web/src/shared/hooks/useEffectiveReducedMotion.ts` | hook; useEffectiveReducedMotion |
| 83 | `apps/web/src/shared/hooks/useFocusTrap.test.ts` | test |
| 87 | `apps/web/src/shared/hooks/useFocusTrap.ts` | hook |
| 73 | `apps/web/src/shared/hooks/useGameStore.test.ts` | test |
| 117 | `apps/web/src/shared/hooks/useGameStore.ts` | hook; GAME_STORE_STORAGE_KEY, useGameStore, GameState |
| 82 | `apps/web/src/shared/hooks/usePreferencesStore.test.ts` | test |
| 127 | `apps/web/src/shared/hooks/usePreferencesStore.ts` | hook; PREFERENCES_STORAGE_KEY, PREFERENCES_DEFAULTS, usePreferencesStore |
| 27 | `apps/web/src/shared/hooks/useReducedMotion.test.ts` | test |
| 22 | `apps/web/src/shared/hooks/useReducedMotion.ts` | hook; useReducedMotion |
| 207 | `apps/web/src/shared/hooks/useWorker.test.tsx` | test |
| 944 | `apps/web/src/shared/hooks/useWorker.ts` | hook; useWorker |

### apps/web/src/shared/lib

Files: 17. Lines: 3611.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 95 | `apps/web/src/shared/lib/activeSavePersistence.test.ts` | test |
| 53 | `apps/web/src/shared/lib/activeSavePersistence.ts` | persistActiveSaveSnapshot |
| 257 | `apps/web/src/shared/lib/audio.test.ts` | test |
| 578 | `apps/web/src/shared/lib/audio.ts` | getAudioEngine, resetAudioEngineForTest, AudioEngine, AudioEffectName, AmbientMode |
| 55 | `apps/web/src/shared/lib/demoQaRegression.test.ts` | test |
| 28 | `apps/web/src/shared/lib/grade.ts` | gradeBadgeColor, gradeTextColor |
| 77 | `apps/web/src/shared/lib/labels.test.ts` | test |
| 80 | `apps/web/src/shared/lib/labels.ts` | humanizeLabel, momentTypeLabel, divisionLabel, minorLevelLabel, phaseLabel, sourceLabel, categoryLabel, roleLabel |
| 34 | `apps/web/src/shared/lib/logger.test.ts` | test |
| 22 | `apps/web/src/shared/lib/logger.ts` | logger |
| 163 | `apps/web/src/shared/lib/pageHelpDefinitions.ts` | PAGE_HELP, PageHelpEntry |
| 47 | `apps/web/src/shared/lib/performance.test.ts` | test |
| 58 | `apps/web/src/shared/lib/performance.ts` | getLatestPerformanceMetric, clearPerformanceMetrics, SIM_MONTH_BENCHMARK_MS, SAVE_IO_BUDGET_MS, PerformanceMetric |
| 885 | `apps/web/src/shared/lib/saveSystem.test.ts` | test |
| 947 | `apps/web/src/shared/lib/saveSystem.ts` | buildLeaderboardEntry, upsertLeaderboardEntry, listLeaderboardEntries, deleteLeaderboardEntriesForSlot, createAutoSaveScheduler, normalizeLoadedSaveRecord, buildSaveRecord, saveGameById, saveGame, loadGameById, loadGame, loadSaveSafely, inspectSaveById, inspectSave, ... (+24) |
| 106 | `apps/web/src/shared/lib/tourDefinition.ts` | TOUR_STEPS, TOUR_LOCALSTORAGE_KEY, TOUR_TOTAL_STEPS, TourStepConfig, TourPlacement |
| 126 | `apps/web/src/shared/lib/webVitals.ts` | initWebVitals, getWebVitalsSnapshot, WEB_VITALS_THRESHOLDS, WebVitalsSnapshot |

### apps/web/src/shared/touch

Files: 1. Lines: 243.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 289 | `apps/web/src/shared/touch/mobileTouchTargets.test.ts` | test |

### apps/web/src/shared/types

Files: 1. Lines: 16.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 16 | `apps/web/src/shared/types/pressRoom.ts` | PressRoomEntry, PressRoomSource, PressRoomTag |

### apps/web/src/test

Files: 1. Lines: 57.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 57 | `apps/web/src/test/setup.ts` | test setup; installs jsdom `matchMedia` shim |

### apps/web/src/workers

Files: 47. Lines: 42222.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 62 | `apps/web/src/workers/content/minorLeagueContent.test.ts` | test |
| 659 | `apps/web/src/workers/content/minorLeagueContent.ts` | worker content materializer; MINOR_LEAGUE_CONTENT_PACK, full 5,408-row authored roster expansion, getMinorLeagueAffiliateContent, getMinorLeagueAffiliateIdentityView, getMinorLeagueAffiliateOpponentLabel, getMinorLeaguePlayerContentForTeam, getMinorLeaguePlayerContentByIdentity, getMinorLeaguePlayerGenerationContent |
| 1 | `apps/web/src/workers/content/minorLeagueContentPack.v1.json` | compact worker content seed pack |
| 344 | `apps/web/src/workers/sim.worker.achievements.test.ts` | test |
| 524 | `apps/web/src/workers/sim.worker.achievements.ts` | worker; recordDraftedHomegrownPlayer, recordInternationalHomegrownPlayer, recordProspectCallup, recordFreeAgentSigning, recordExtensionCompleted, recordMonthlyDivisionLead, captureSeasonAchievementFacts, buildAchievementMetrics, syncAchievementState, buildAchievementView, AchievementView |
| 3076 | `apps/web/src/workers/sim.worker.actions.ts` | worker; actionApi |
| 243 | `apps/web/src/workers/sim.worker.archivedGames.test.ts` | test |
| 392 | `apps/web/src/workers/sim.worker.archivedGames.ts` | worker; syncArchivedMajorGames, buildArchivedGamePlayByPlayView, archivedGameView, archivedMomentGameId |
| 245 | `apps/web/src/workers/sim.worker.balance.test.ts` | test |
| 97 | `apps/web/src/workers/sim.worker.budget.ts` | worker; getDifficultyProfileForState, difficultyAdjustValue, getDifficultyAdjustedBudget, getTeamPayrollCap, getTeamIFABonusPool, getTeamFreeAgencyAppealScore, DIFFICULTY_PROFILES |
| 471 | `apps/web/src/workers/sim.worker.ceremony.ts` | worker; createDefaultFranchiseState, createEmptyCeremonyState, createEmptyAchievementState, getCeremonyStateView, queueCeremonyMoment, dismissCeremonyMoment, maybeQueuePlayoffClinchMoment, queuePlayoffSeriesMoment, queueAwardMoments, queueHallOfFameMoments, queueRecordBrokenMoment, queueCareerMilestoneMoments, queueProspectDebutMoment |
| 559 | `apps/web/src/workers/sim.worker.consequences.ts` | worker; applySeriesOutcomeConsequences, applyTradeConsequences, applySigningConsequences, applyAISigningConsequences, applyPostseasonConsequences, applyRetirementConsequences |
| 61 | `apps/web/src/workers/sim.worker.diagnostics.test.ts` | test |
| 338 | `apps/web/src/workers/sim.worker.diagnostics.ts` | worker; recordRuntimeDiagnostic, recordWorkerQueryTiming, measureWorkerQuerySync, buildWorkerQueryDiagnosticsView, clearWorkerQueryTimingsForTest, estimateSnapshotSizeBytes, normalizePerformanceDiagnostics, buildPerformanceDiagnosticsView, archiveOldSeasonsInState, pruneStaleWorkerData, RuntimeDiagnosticsState, PerformanceDiagnosticsView, WorkerQueryDiagnosticsView |
| 286 | `apps/web/src/workers/sim.worker.draft.ts` | worker; buildDraftCommentaryView, buildDraftProspectReactionView, buildDraftPostDraftGradesView, publishDraftGradesNarrative, DraftCommentaryView, DraftPostDraftGradesView |
| 402 | `apps/web/src/workers/sim.worker.farm.ts` | worker; registerDraftedProspectAcquisition, registerInternationalProspectAcquisition, syncMinorLeagueStatHistory, recordProspectBondDebuts, applySeasonEndProspectBondUpdates, applyDevelopmentSetbackCheckpoint, getLoyaltyAdjustedAppeal, getProspectBondView, getActiveDevelopmentSetbackView, getMinorLeagueProgressionView |
| 330 | `apps/web/src/workers/sim.worker.frontOfficeIdentity.test.ts` | test |
| 972 | `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts` | worker; getAssistantGmProfileModifiers, getEffectiveScoutingAccuracy, scoreMandateAlignment, scoreSpendingAlignment, scoreTradeAlignment, scoreDevelopmentAlignment, scoreMediaAlignment, getOwnerAlignmentDecisionScore, applyOnboardingIdentityBaseline, applyMonthlyDevelopmentIdentity, adjustDevelopmentSetbackForIdentity, applyMonthlyFrontOfficeConsequences, applyPressToneConsequences, buildFrontOfficeIdentityView, ... (+5) |
| 5452 | `apps/web/src/workers/sim.worker.helpers.ts` | worker; setState, updatePlayerTeamAssignment, releasePlayerAssignment, retirePlayerAssignment, requireState, timestamp, getTeamPlayers, deriveWorkerTeamBuildingArchetype, createEmptyTradeState, createEmptyInternationalScoutingState, createEmptyDraftState, createEmptyMinorLeagueState, createStableWorkerRng, advanceMinorLeagueDay, ExtensionNegotiationReview, ... (+82) |
| 252 | `apps/web/src/workers/sim.worker.integration.helpers.ts` | worker; resetIntegrationState, startGame, totalWinsAndLosses, validateRosterIntegrity, validateStatBounds, advanceEntireOffseason, jumpToLateSeasonCheckpoint, forceCompletedPlayoffBracket, normalizeSnapshotForComparison, runFullSeasonCycle, createLegacyV8Snapshot, seedRetiringHallOfFamer, api, requireState, ... (+2) |
| 77 | `apps/web/src/workers/sim.worker.integration.test.ts` | test |
| 339 | `apps/web/src/workers/sim.worker.legacy.ts` | worker; accrueCareerStatsForSeason, syncHistoricalPlayersForRetirements, upsertFranchiseTimelineEntry, enrichFranchiseTimelineWithDepartures, processHallOfFameForRetirements, getDynastyScoreSummary, hallOfFameTeamSummary |
| 110 | `apps/web/src/workers/sim.worker.milestones.ts` | worker; buildCareerMilestoneEvents |
| 492 | `apps/web/src/workers/sim.worker.monthlyPulse.ts` | worker; applyMonthlyLeagueEvents, captureMonthlyAdvanceContext, generateMonthlyPulse, getMonthlyPulse, getCurrentLeagueEvents, getLeagueEventHistory, acknowledgeMonthlyReport, dismissDecisionSpotlight |
| 1408 | `apps/web/src/workers/sim.worker.narrative.ts` | worker; finalizeRivalriesForSeason, recordSeasonArchive, rebuildBriefing, ensureNarrativeState, refreshNarrativeState, ensureAwardHistoryForSeason, recordSeasonHistory, finalizeSeasonHistoryRetirements, recordBreakoutNarratives, getPersonalityProfileForPlayer, getRivalriesForTeam, getAwardHistory, getSeasonHistory, getHistoryOverview, ... (+9) |
| 873 | `apps/web/src/workers/sim.worker.narrativeFarm.ts` | worker; applyDebutFlashbacks, applyBreakoutCountdowns, applyMonthlyPressConference, applyMonthlyNarrativeHooks, applyRegularSeasonTeamDynastyMarkers, applyRegularSeasonPositionGroupMoments, applyRegularSeasonPlayerMicroArcMoments, applyWeeklyMoments, getWeeklyMomentCheckpointDays, applyWeeklyMomentsForCompletedRange, applySeasonEndPlayerMicroArcMoments, applySeasonEndTeamDynastyMarkers, applySeasonEndPlayerArcMoments, applyOffseasonNarrativeHooks |
| 214 | `apps/web/src/workers/sim.worker.onboarding.test.ts` | test |
| 1076 | `apps/web/src/workers/sim.worker.onboarding.ts` | worker; getOnboardingData, getAGMCandidates, getRevisedOnboardingData, applyStaffHires, applyScoutingHire, completeOnboarding, completeRevisedOnboarding, OnboardingData, RevisedOnboardingData, DayOneOwnerScene, DayOneRecap, DayOneStepCopy, DayOneOpeningPlanView, DayOneDevelopmentPlanInput, ... (+1) |
| 423 | `apps/web/src/workers/sim.worker.onboardingBalance.test.ts` | test |
| 356 | `apps/web/src/workers/sim.worker.pipeline.ts` | worker; buildProspectPipelineView, ProspectPipelineView |
| 250 | `apps/web/src/workers/sim.worker.pressRoom.ts` | worker; buildPressRoomFeed |
| 2573 | `apps/web/src/workers/sim.worker.queries.test.ts` | test |
| 5018 | `apps/web/src/workers/sim.worker.queries.ts` | worker; queryApi |
| 274 | `apps/web/src/workers/sim.worker.records.ts` | worker; initializeRecordTracking, syncRecordTracking, previewRecordWatchList |
| 67 | `apps/web/src/workers/sim.worker.rollover.integration.test.ts` | test |
| 98 | `apps/web/src/workers/sim.worker.seasonNarrative.ts` | worker; buildSeasonRecapView, buildOffseasonHeadlineView, SeasonRecapView, OffseasonHeadlineView |
| 441 | `apps/web/src/workers/sim.worker.setup.ts` | worker; getDifficultyAdjustedTradeFairness, getDifficultyAdjustedCompetitiveAav, getTeamStaffBudget, getTeamTradeReputationModifier, buildNewGameState, buildSetupPreview, NewGameOptions, SetupPreview, re-export {DIFFICULTY_PROFILES, getDifficultyAdjustedBudget, getDifficultyProfileForState, getTeamFreeAgencyAppealScore, getTeamIFABonusPool, getTeamPayrollCap}, DIFFICULTY_PROFILES, getDifficultyAdjustedBudget, getDifficultyProfileForState, getTeamFreeAgencyAppealScore, getTeamIFABonusPool, ... (+1) |
| 25 | `apps/web/src/workers/sim.worker.state.ts` | worker; createEmptyMonthlyPulseState, createEmptyJobMarket, createDefaultFanSentiment |
| 236 | `apps/web/src/workers/sim.worker.stats.ts` | worker; getProjectedWarRange, buildAdvancedStatsIndex, getAdvancedStatsForPlayer, buildLeagueLeaderEntries, PlayerAdvancedStatsDTO, ProjectedWarRangeDTO |
| 179 | `apps/web/src/workers/sim.worker.storyArcs.ts` | worker; syncSeasonStartStoryArcs, advanceMonthlyStoryArcs, advanceTradeSagaClimax |
| 7282 | `apps/web/src/workers/sim.worker.test.ts` | test |
| 405 | `apps/web/src/workers/sim.worker.ticker.ts` | worker; refreshTickerFeed |
| 3628 | `apps/web/src/workers/sim.worker.trade.ts` | worker; pruneExpiredNegotiations, isTradeMarketOpen, buildTradeOffersView, buildTradeHistoryView, getNegotiationView, getOpenNegotiationViews, evaluateMultiTeamTradeFairness, generateMultiTeamConditionalClause, proposeMultiTeamFramework, executeMultiTeamTradeFramework, buildTradeDialogueView, buildTradeDeadlineStateView, buildTradeAssetInventoryView, clearPendingTradeOffers, ... (+31) |
| 39 | `apps/web/src/workers/sim.worker.ts` | worker; api, WorkerApi |
| 161 | `apps/web/src/workers/snapshot.onboarding.test.ts` | test |
| 1308 | `apps/web/src/workers/snapshot.test.ts` | test |
| 522 | `apps/web/src/workers/snapshot.ts` | worker; exportGameSnapshot, isSaveCompatible, importGameSnapshot |

### packages/contracts

Files: 2. Lines: 33.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 24 | `packages/contracts/package.json` | config/json |
| 9 | `packages/contracts/tsconfig.json` | config/json |

### packages/contracts/src

Files: 1. Lines: 535.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 535 | `packages/contracts/src/index.ts` | barrel/index; re-export {PositionEnum, DevelopmentPhaseEnum, RosterStatusEnum, MinorLeagueLevelEnum, DevelopmentProgramEnum, DevelopmentTrajectoryEnum}, re-export {CoachRoleEnum, CoachSpecialtyEnum, CoachSchema}, re-export {DivisionEnum, OwnerArchetypeEnum, TeamSchema}, re-export {PAOutcomeEnum, PAResultSchema, InningHalfEnum, GameResultSchema}, re-export {TransactionTypeEnum, RosterTransactionSchema}, re-export {AffiliateLevelEnum, AffiliatePlayerStatsSchema, AffiliateStateSchema, WaiverClaimSchema, AffiliateBoxScoreSchema, DevelopmentLedgerEntrySchema}, re-export {ArchivedGameKindEnum, ArchivedGameLineScoreSchema, ArchivedGameHighlightSchema, ArchivedGameBoxScoreSchema}, re-export {SaveMetaSchema, SaveSlotSchema, CURRENT_GAME_SNAPSHOT_VERSION, GameRNGStateSchema, SimPhaseEnum, SnapshotPlayerSchema}, ... (+242) |

### packages/contracts/src/dto

Files: 1. Lines: 39.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 39 | `packages/contracts/src/dto/dashboard.ts` | ActionItemTypeEnum, ActionItemSchema, DashboardDTOSchema, ActionItemType, ActionItem, DashboardDTO |

### packages/contracts/src/schemas

Files: 15. Lines: 5593.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 109 | `packages/contracts/src/schemas/draft.ts` | schema; ScoutReportSchema, DraftProspectBackgroundEnum, DraftScoutingReportSchema, DraftSignabilitySchema, DraftPickOwnershipSchema, DraftCompensatoryPickSchema, QualifyingOfferStatusEnum, QualifyingOfferRecordSchema, DraftSigningDecisionSchema, DraftPickSchema, DraftClassSchema, ScoutReport, DraftProspectBackground, DraftScoutingReport, ... (+8) |
| 32 | `packages/contracts/src/schemas/finance.ts` | schema; ContractDetailSchema, ContractDetail |
| 248 | `packages/contracts/src/schemas/franchise.ts` | schema; DifficultyEnum, PlayModeEnum, FranchiseOnboardingSchema, AGMCandidateIdEnum, GMPhilosophySchema, DayOneExperienceEnum, DayOneStatusEnum, DayOneCurrentStepEnum, DayOneBudgetAllocationEnum, DayOnePromotionStanceEnum, DayOneCrisisTypeEnum, DayOneBullpenPlanSchema, DayOneOpeningPlanSchema, DayOneStateSchema, ... (+38) |
| 54 | `packages/contracts/src/schemas/game.ts` | schema; PAOutcomeEnum, PAResultSchema, InningHalfEnum, GameResultSchema, PAOutcome, PAResult, InningHalf, GameResult |
| 32 | `packages/contracts/src/schemas/league.ts` | schema; StandingsEntrySchema, AwardTypeEnum, AwardSchema, StandingsEntry, AwardType, Award |
| 165 | `packages/contracts/src/schemas/minors.ts` | schema; AffiliateLevelEnum, AffiliatePlayerStatsSchema, AffiliateStateSchema, WaiverClaimSchema, AffiliateBoxScoreSchema, DevelopmentLedgerEntrySchema, DevelopmentReportEntrySchema, PositionConversionRecommendationSchema, MinorLeagueSeasonLineSchema, DevelopmentSetbackTypeEnum, DevelopmentSetbackSchema, MinorLeagueStateSchema, AffiliateLevel, AffiliatePlayerStats, ... (+10) |
| 55 | `packages/contracts/src/schemas/monthlyPulse.ts` | schema; DecisionSpotlightUrgencyEnum, MonthlyPlayerOfTheMonthSchema, ScheduleDifficultySchema, MonthlyReportSchema, DecisionSpotlightItemSchema, MonthlyPulseStateSchema, DecisionSpotlightUrgency, MonthlyPlayerOfTheMonth, ScheduleDifficulty, MonthlyReport, DecisionSpotlightItem, MonthlyPulseState |
| 1220 | `packages/contracts/src/schemas/narrative.ts` | schema; NewsPriorityEnum, NewsTagEnum, NewsCategoryEnum, NewsItemSchema, MomentTypeEnum, MomentSchema, SignatureMomentTypeEnum, MomentRoundEnum, SignatureMomentSchema, NicknameIdEnum, EarnedNicknameSchema, NicknameSeasonHistoryEntrySchema, PlayerNicknameStateSchema, TradeMemorySchema, ArchivedGameKindEnum, ArchivedGameLineScoreSchema, ArchivedGameHighlightSchema, ArchivedGameBoxScoreSchema, ... (+166) |
| 209 | `packages/contracts/src/schemas/player.ts` | schema; PositionEnum, DevelopmentPhaseEnum, RosterStatusEnum, MinorLeagueLevelEnum, DevelopmentProgramEnum, DevelopmentTrajectoryEnum, NoTradeClauseTypeEnum, HitterAttributesSchema, PitcherAttributesSchema, PersonalitySchema, PersonalityTraitSchema, InjurySchema, DeferredMoneyInstallmentSchema, ExtensionHistoryEntrySchema, ... (+22) |
| 26 | `packages/contracts/src/schemas/roster.ts` | schema; TransactionTypeEnum, RosterTransactionSchema, TransactionType, RosterTransaction |
| 3120 | `packages/contracts/src/schemas/save.ts` | schema; migrateGameSnapshot, parseGameSnapshot, SaveMetaSchema, SaveSlotSchema, GameRNGStateSchema, SimPhaseEnum, SnapshotPlayerV7Schema, SnapshotPlayerV17Schema, SnapshotPlayerSchema, ScheduledGameSchema, StandingsRecordSchema, PlayerStatEntrySchema, SerializedSeasonStateSchema, NarrativeSnapshotSchema, ... (+97) |
| 50 | `packages/contracts/src/schemas/staff.ts` | schema; CoachRoleEnum, CoachSpecialtyEnum, CoachSchema, CoachRole, CoachSpecialty, Coach |
| 32 | `packages/contracts/src/schemas/team.ts` | schema; DivisionEnum, OwnerArchetypeEnum, TeamSchema, Division, OwnerArchetype, Team |
| 220 | `packages/contracts/src/schemas/trade.ts` | schema; TradeAssetSchema, TradeStatusEnum, TradePackageSchema, TradeProposalSchema, PersistentTradeOfferSchema, TradeHistoryEntrySchema, NegotiationPhaseEnum, NegotiationDialogueSchema, CounterOfferSchema, NegotiationProposalSchema, PersistentNegotiationContextSchema, PersistentNegotiationStateSchema, TradeParticipantRoleEnum, TradeParticipantSchema, ... (+24) |
| 34 | `packages/contracts/src/schemas/worker.ts` | schema; WorkerCommandEnum, WorkerResponseStatusEnum, WorkerRequestSchema, WorkerResponseSchema, WorkerCommand, WorkerResponseStatus, WorkerRequest, WorkerResponse |

### packages/contracts/tests

Files: 21. Lines: 5431.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 149 | `packages/contracts/tests/fixtures/save/v16/core.json` | config/json |
| 141 | `packages/contracts/tests/fixtures/save/v17/core.json` | config/json |
| 218 | `packages/contracts/tests/fixtures/save/v18/core.json` | config/json |
| 218 | `packages/contracts/tests/fixtures/save/v19/core.json` | config/json |
| 221 | `packages/contracts/tests/fixtures/save/v20/core.json` | config/json |
| 221 | `packages/contracts/tests/fixtures/save/v21/core.json` | config/json |
| 221 | `packages/contracts/tests/fixtures/save/v22/core.json` | config/json |
| 221 | `packages/contracts/tests/fixtures/save/v23/core.json` | config/json |
| 241 | `packages/contracts/tests/fixtures/save/v24/core.json` | config/json |
| 241 | `packages/contracts/tests/fixtures/save/v25/core.json` | config/json |
| 271 | `packages/contracts/tests/fixtures/save/v26/core.json` | config/json |
| 284 | `packages/contracts/tests/fixtures/save/v27/core.json` | config/json |
| 284 | `packages/contracts/tests/fixtures/save/v28/core.json` | config/json |
| 284 | `packages/contracts/tests/fixtures/save/v29/core.json` | config/json |
| 284 | `packages/contracts/tests/fixtures/save/v30/core.json` | config/json |
| 315 | `packages/contracts/tests/fixtures/save/v31/core.json` | config/json |
| 315 | `packages/contracts/tests/fixtures/save/v32/core.json` | config/json |
| 315 | `packages/contracts/tests/fixtures/save/v33/core.json` | config/json |
| 314 | `packages/contracts/tests/fixtures/save/v33/season10.json` | config/json |
| 315 | `packages/contracts/tests/fixtures/save/v34/core.json` | config/json |
| 376 | `packages/contracts/tests/save.migration.test.ts` | test |

### packages/design-tokens

Files: 2. Lines: 27.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 19 | `packages/design-tokens/package.json` | config/json |
| 8 | `packages/design-tokens/tsconfig.json` | config/json |

### packages/design-tokens/src

Files: 7. Lines: 232.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 33 | `packages/design-tokens/src/colors.ts` | dynasty, accent, DynastyColor, AccentColor |
| 20 | `packages/design-tokens/src/density.ts` | density, DensityConfig, DensityMode |
| 22 | `packages/design-tokens/src/index.ts` | barrel/index; re-export {dynasty, accent}, re-export {fontFamily, fontSize, fontWeight}, re-export {spacing}, re-export {shadows}, re-export {density}, re-export {default as mbdPreset, mbdPreset as tailwindPreset}, dynasty, accent, fontFamily, fontSize, fontWeight, spacing, shadows, density, ... (+2) |
| 15 | `packages/design-tokens/src/shadows.ts` | shadows, ShadowLevel |
| 25 | `packages/design-tokens/src/spacing.ts` | spacing, SpacingKey |
| 78 | `packages/design-tokens/src/tailwind-preset.ts` | default, mbdPreset |
| 39 | `packages/design-tokens/src/typography.ts` | fontFamily, fontSize, fontWeight, FontSizeEntry, FontFamily, FontSize, FontWeight |

### packages/sim-core

Files: 4. Lines: 398.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 346 | `packages/sim-core/AUDIT_REPORT.md` | docs |
| 29 | `packages/sim-core/package.json` | config/json |
| 13 | `packages/sim-core/tsconfig.json` | config/json |
| 10 | `packages/sim-core/vitest.config.ts` | default |

### packages/sim-core/playtest-output

Files: 6. Lines: 2321.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 841 | `packages/sim-core/playtest-output/calibration-onboarding-balance.json` | config/json |
| 97 | `packages/sim-core/playtest-output/calibration-onboarding-balance.md` | docs |
| 392 | `packages/sim-core/playtest-output/calibration.json` | config/json |
| 68 | `packages/sim-core/playtest-output/calibration.md` | docs |
| 166 | `packages/sim-core/playtest-output/demo-readiness-sweep.md` | docs |
| 757 | `packages/sim-core/playtest-output/sample-dynasty.md` | docs |

### packages/sim-core/src

Files: 1. Lines: 1464.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 1464 | `packages/sim-core/src/index.ts` | barrel/index; re-export {GameRNG, createGameRNG, computeLog5Probabilities}, re-export {archiveOldSeasons, estimateSnapshotSize, pruneStaleData}, re-export {compareTimelines}, re-export {CALIBRATION_FOLLOW_UP_METRICS, CALIBRATION_TARGET_BANDS, CALIBRATION_WORKER_TARGET_BANDS, buildCalibrationReport, renderCalibrationJson, renderCalibrationMarkdown, runSeasonCalibration, summarizeOnboardingBalanceSample}, re-export {CalibrationOnboardingBalanceSample, CalibrationReportOptions, CalibrationWorkerSample, CalibrationWorkerSeasonMetrics}, re-export {buildLeagueAdvancedContext, calculateAdvancedStatLine, calculateBattingAverage, calculateFip, calculateIso, calculateObp}, re-export {ERA_PLUS_SHUTOUT_CAP, computeTeamBullpenEraPlus, computeTeamEraPlus, computeTeamWrcPlus, findLeadingHitterByWrcPlus, getPrimaryStarterEraPlusLines}, re-export {CAREER_MILESTONES, calculateMilestoneProgress, getMilestoneAlerts}, re-export {CAREER_SHUTOUT_MILESTONE, isCompleteGameShutout, recordCareerShutout}, re-export {SEASON_GAMES, findNotableProjections, formatPaceLabel, projectSeasonStats}, ... (+786) |

### packages/sim-core/src/calibration

Files: 1. Lines: 1219.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 1219 | `packages/sim-core/src/calibration/index.ts` | barrel/index; CALIBRATION_TARGET_BANDS, CALIBRATION_WORKER_TARGET_BANDS, CALIBRATION_FOLLOW_UP_METRICS, runSeasonCalibration, summarizeSeasonCalibration, summarizeOnboardingBalanceSample, buildCalibrationReport, renderCalibrationMarkdown, renderCalibrationJson, SeasonCalibrationConfig, SeasonCalibrationTeamRecord, SeasonCalibrationBattingTotals, SeasonCalibrationSeason, SeasonCalibrationResult, SeasonCalibrationSummary, SeasonCalibrationSeasonSummary, SeasonCalibrationWarDistribution, CalibrationReport, CalibrationReportOptions, CalibrationWorkerSample, CalibrationWorkerSeasonMetrics, CalibrationOnboardingBalanceSample, CalibrationOnboardingBalanceSummary |

### packages/sim-core/src/career

Files: 1. Lines: 319.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 319 | `packages/sim-core/src/career/index.ts` | barrel/index; initializeGMCareer, recordSeasonResult, processGMFiring, applyForJob, getCareerLegacyScore, generateJobMarket, CareerStandingsEntry |

### packages/sim-core/src/draft

Files: 6. Lines: 1085.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 303 | `packages/sim-core/src/draft/draftAI.ts` | determineDraftOrder, evaluateTeamNeeds, aiSelectPick, simulateFullDraft, DraftPick, DraftResult |
| 234 | `packages/sim-core/src/draft/draftPicks.ts` | createDefaultDraftPickOwnership, tradeDraftPickOwnership, awardCompensatoryPick, forfeitHighestEligiblePick, buildDraftPickSlots, PROTECTED_TOP_TEN_PICK_COUNT, DraftPickOwnership, DraftPickDescriptor, DraftCompensatoryPick, DraftCompensatoryPickAward, DraftPickSlot |
| 339 | `packages/sim-core/src/draft/draftPool.ts` | generateDraftClass, rankProspects, DRAFT_CLASS_SIZE, DRAFT_ROUNDS, NUM_TEAMS, DraftProspect, DraftClass, DraftProspectBackground |
| 102 | `packages/sim-core/src/draft/draftScouting.ts` | scoutDraftProspect, DraftScoutingReport |
| 68 | `packages/sim-core/src/draft/draftSigning.ts` | resolveDraftSigning, DraftSigningOutcome |
| 44 | `packages/sim-core/src/draft/index.ts` | barrel/index; re-export {generateDraftClass, rankProspects, DRAFT_CLASS_SIZE, DRAFT_ROUNDS, NUM_TEAMS}, re-export {determineDraftOrder, aiSelectPick, evaluateTeamNeeds, simulateFullDraft}, re-export {scoutDraftProspect}, re-export {resolveDraftSigning}, re-export {PROTECTED_TOP_TEN_PICK_COUNT, createDefaultDraftPickOwnership, tradeDraftPickOwnership, awardCompensatoryPick, forfeitHighestEligiblePick, buildDraftPickSlots}, generateDraftClass, rankProspects, DRAFT_CLASS_SIZE, DRAFT_ROUNDS, NUM_TEAMS, determineDraftOrder, aiSelectPick, evaluateTeamNeeds, simulateFullDraft, ... (+8) |

### packages/sim-core/src/finance

Files: 3. Lines: 1561.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 1174 | `packages/sim-core/src/finance/contracts.ts` | serviceDaysToYears, qualifiesForSuperTwo, calculatePlayerValue, generateArbitrationCase, resolveArbitration, evaluateHoldout, calculateTeamPayroll, calculateLuxuryTax, getTeamBudget, advanceContracts, generateContractOffer, getArbEligiblePlayers, evaluateExtensionWillingness, calculateExtensionOffer, ... (+34) |
| 71 | `packages/sim-core/src/finance/index.ts` | barrel/index; re-export {// Constants LEAGUE_MINIMUM_SALARY, LUXURY_TAX_THRESHOLD, LUXURY_TAX_TIERS, PRE_ARB_MAX_YEARS, ARB_FIRST_YEAR, ARB_LAST_YEAR}, re-export {findComparableContracts, generateMarketReport, predictSigning, generateMarketSummary, type ComparableContract, type SigningPrediction}, // Constants LEAGUE_MINIMUM_SALARY, LUXURY_TAX_THRESHOLD, LUXURY_TAX_TIERS, PRE_ARB_MAX_YEARS, ARB_FIRST_YEAR, ARB_LAST_YEAR, ARB_MAX_BASE_SALARY, ARB_DIVISOR, ARB_YEAR_MULTIPLIERS, ARB_PERFORMANCE_VARIANCE, ARB_TEAM_WIN_PROBABILITY, SUPER_TWO_COHORT_SHARE, ... (+45) |
| 318 | `packages/sim-core/src/finance/marketIntelligence.ts` | findComparableContracts, predictSigning, generateMarketReport, generateMarketSummary, ComparableContract, SigningPrediction, MarketReportContext, MarketReport, MarketSummary |

### packages/sim-core/src/invariants

Files: 1. Lines: 327.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 327 | `packages/sim-core/src/invariants/checker.ts` | checkUniquePlayerAssignment, checkRosterLimits, checkStandingsConsistency, checkRatingBounds, runInvariantChecks, InvariantViolation, InvariantCheckResult, InvariantSeverity |

### packages/sim-core/src/league

Files: 14. Lines: 4181.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 185 | `packages/sim-core/src/league/achievements.ts` | checkAchievements, ACHIEVEMENT_DEFINITIONS, AchievementMetricMap, AchievementProgressValue, AchievementDefinition, AchievementUnlockResult, CheckAchievementsArgs, CheckAchievementsResult, AchievementCategory |
| 376 | `packages/sim-core/src/league/awardNarratives.ts` | generateAwardNarrative, generateAwardCeremony, AWARD_NAMES, AwardNarrativeContext, AwardNarrative, AwardCeremonyScript, AwardReactionTone |
| 268 | `packages/sim-core/src/league/awards.ts` | calculateAwardRaces, finalizeAwardResults, buildRookieOfTheYearVotingEntries, AwardRaceEntry, AwardRaces |
| 266 | `packages/sim-core/src/league/frontOffice.ts` | TEAM_BUILDING_ARCHETYPES, createFrontOfficeState, evaluateFrontOfficeState, frontOfficeTradeModifier, frontOfficeFreeAgencyAppeal, deriveTeamBuildingArchetype, teamBuildingFreeAgencyAggression, teamBuildingPromotionScoreAdjustment, teamBuildingExtensionPriorityAdjustment, FrontOfficeEvaluationContext, TeamBuildingArchetype, TeamBuildingIdentityContext, TeamBuildingPromotionContext, TeamBuildingExtensionPriorityContext |
| 213 | `packages/sim-core/src/league/gmRelationships.ts` | createRelationshipMap, getRelationship, modifyRelationship, addTradeMemory, decayRelationships, getRelationshipTier, getTradeValueAdjustment, generateRelationshipTooltip, RELATIONSHIP_TIER_THRESHOLDS, GRUDGE_DECAY_RATE, PERMANENT_DECAY_RATE, MAX_TRADE_HISTORY, MAX_TRADE_PENALTY_PCT, TradeMemory, ... (+4) |
| 384 | `packages/sim-core/src/league/hallOfFame.ts` | evaluateHOFCandidate, processHOFInductions, calculateDynastyScore, CareerBattingTotals, CareerPitchingTotals, CareerStatsLedger, HallOfFameCandidate, HallOfFameEvaluation, HallOfFameEntry, HallOfFameBallotEntry, ProcessHOFInductionsArgs, ProcessHOFInductionsResult, FranchiseTimelineEntry, DynastyScoreSummary |
| 190 | `packages/sim-core/src/league/index.ts` | barrel/index; re-export {TEAMS, DIVISIONS, getTeamsByDivision, getTeamById}, re-export {StandingsTracker}, re-export {generateSchedule, getGamesForDay, getSeasonLength, isDivisionGame}, re-export {getPersonalityArchetype, createInitialPlayerMorale, applyMoraleEvent, calculateTeamChemistry, chemistryScoreToModifier, createOwnerState}, re-export {TEAM_BUILDING_ARCHETYPES, createFrontOfficeState, evaluateFrontOfficeState, deriveTeamBuildingArchetype, frontOfficeTradeModifier, frontOfficeFreeAgencyAppeal, teamBuildingPromotionScoreAdjustment, teamBuildingExtensionPriorityAdjustment}, re-export {calculateAwardRaces, buildRookieOfTheYearVotingEntries, finalizeAwardResults}, re-export {AWARD_NAMES, generateAwardNarrative, generateAwardCeremony}, re-export {getRivalry, seedHistoricalRivalries, upsertRivalry, recordRivalryGame, deriveRivalriesFromStandings, finalizeSeasonRivalries}, re-export {backfillLegacyRecordBook, getRecordWatchList, updateRecordBook}, re-export {evaluateHOFCandidate, processHOFInductions, calculateDynastyScore}, re-export {ACHIEVEMENT_DEFINITIONS, checkAchievements}, re-export {RELATIONSHIP_TIER_THRESHOLDS, GRUDGE_DECAY_RATE, PERMANENT_DECAY_RATE, MAX_TRADE_HISTORY, MAX_TRADE_PENALTY_PCT, createRelationshipMap}, TEAMS, ... (+68) |
| 572 | `packages/sim-core/src/league/narrativeState.ts` | getPersonalityArchetype, createInitialPlayerMorale, applyMoraleEvent, calculateTeamChemistry, chemistryScoreToModifier, createOwnerState, evaluateOwnerState, applyOwnerDecisionDelta, buildFrontOfficeBriefing, MoraleEvent, OwnerEvaluationContext, BriefingContext, TeamChemistryContext, PersonalityArchetype |
| 525 | `packages/sim-core/src/league/records.ts` | backfillLegacyRecordBook, updateRecordBook, getRecordWatchList, LegacyRecordBookArgs, TeamStandingRecord, PlayerSeasonRecord, UpdateRecordBookArgs, BrokenRecord, RecordWatchArgs |
| 127 | `packages/sim-core/src/league/relationshipEffects.ts` | adjustFABidForRelationship, shouldPassOnWaiverClaim, adjustDraftPickTradeValue, getRule5TargetingBonus, generateRelationshipEffectNarrative, RelationshipEffect |
| 632 | `packages/sim-core/src/league/rivalries.ts` | getRivalry, seedHistoricalRivalries, upsertRivalry, recordRivalryGame, deriveRivalriesFromStandings, finalizeSeasonRivalries, recordBlockbusterTradeRivalry, recordStarDefectionRivalry, rivalryTradePenalty, rivalryGameModifier, computeRivalryIntensityScore, getRivalryMatchupNarrative, RIVALRY_MATCHUP_BRIEFING_MIN_SCORE, RIVALRY_HIGH_LEVERAGE_MIN_SCORE, ... (+6) |
| 181 | `packages/sim-core/src/league/schedule.ts` | generateSchedule, getGamesForDay, getSeasonLength, isDivisionGame, ScheduledGame |
| 197 | `packages/sim-core/src/league/standings.ts` | StandingsTracker, TeamRecord, StandingsEntry |
| 76 | `packages/sim-core/src/league/teams.ts` | getTeamsByDivision, getTeamById, TEAMS, DIVISIONS, TeamDef, Division, OwnerArchetype |

### packages/sim-core/src/math

Files: 3. Lines: 376.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 6 | `packages/sim-core/src/math/index.ts` | barrel/index; re-export {GameRNG, createGameRNG}, re-export {computeLog5Probabilities}, GameRNG, createGameRNG, computeLog5Probabilities |
| 200 | `packages/sim-core/src/math/log5.ts` | computeLog5Probabilities, OutcomeRates, Log5Modifiers, Log5Input |
| 170 | `packages/sim-core/src/math/prng.ts` | createGameRNG, GameRNG, GameRNGState |

### packages/sim-core/src/moments

Files: 8. Lines: 5308.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 157 | `packages/sim-core/src/moments/arbitrationMoments.ts` | detectArbitrationMoments, detectHoldoutResolutions, ArbitrationMomentDetectionContext, HoldoutResolutionDetectionContext, ArbitrationDetectedMoment |
| 228 | `packages/sim-core/src/moments/index.ts` | barrel/index; re-export {detectArbitrationMoments}, re-export {buildTeamSeasonSummaries, CHAMPIONSHIP_RUN_IMPACT, CHAMPIONSHIP_RUN_RELEVANCE, CONTENTION_COLLAPSE_IMPACT, CONTENTION_COLLAPSE_RELEVANCE, CONTENTION_COLLAPSE_WINS_THRESHOLD}, re-export {COMEBACK_PLAYER_IMPACT, COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD, COMEBACK_PLAYER_RELEVANCE, COMEBACK_PLAYER_WAR_THRESHOLD, REDEMPTION_ARC_IMPACT, REDEMPTION_ARC_RELEVANCE}, re-export {detectWeeklyMoments}, re-export {MOMENT_IMPACT_THRESHOLD, MOMENT_RELEVANCE_DECAY_RATE, MAX_MOMENTS_PER_PLAYER, PERMANENT_CLUTCH_WALK_OFF_COUNT, WALK_OFF_HR_IMPACT, NO_HITTER_IMPACT}, re-export {NICKNAME_TRIGGERS, FLASH_WINDOW_SIZE, FLASH_REQUIRED_LEAGUE_LEADS, PROFESSOR_WINDOW_SIZE, PROFESSOR_RATIO_THRESHOLD, IRON_MAN_WINDOW_SIZE}, detectArbitrationMoments, buildTeamSeasonSummaries, CHAMPIONSHIP_RUN_IMPACT, CHAMPIONSHIP_RUN_RELEVANCE, CONTENTION_COLLAPSE_IMPACT, CONTENTION_COLLAPSE_RELEVANCE, CONTENTION_COLLAPSE_WINS_THRESHOLD, CONTENTION_WINDOW_OPENS_IMPACT, ... (+166) |
| 881 | `packages/sim-core/src/moments/momentDetector.ts` | compareMomentType, detectMoment, applyMomentEffects, decayMoments, formatMomentDescription, MOMENT_IMPACT_THRESHOLD, MOMENT_RELEVANCE_DECAY_RATE, MAX_MOMENTS_PER_PLAYER, PERMANENT_CLUTCH_WALK_OFF_COUNT, WALK_OFF_HR_IMPACT, NO_HITTER_IMPACT, PERFECT_GAME_IMPACT, FOUR_HR_GAME_IMPACT, PLAYOFF_ERROR_IMPACT, ... (+36) |
| 980 | `packages/sim-core/src/moments/nicknames.ts` | getNicknameDisplayText, evaluateNicknames, NICKNAME_TRIGGERS, HOT_STREAK_NICKNAME_IDS, COLD_STREAK_NICKNAME_IDS, POWER_STYLE_NICKNAME_IDS, CONTACT_STYLE_NICKNAME_IDS, SPEED_STYLE_NICKNAME_IDS, FLASH_WINDOW_SIZE, FLASH_REQUIRED_LEAGUE_LEADS, PROFESSOR_WINDOW_SIZE, PROFESSOR_RATIO_THRESHOLD, IRON_MAN_WINDOW_SIZE, IRON_MAN_GAMES_THRESHOLD, ... (+63) |
| 1453 | `packages/sim-core/src/moments/seasonIdentityMoments.ts` | buildTeamSeasonSummaries, resolvePlayoffTeamIds, detectChampionshipRun, detectContentionCollapse, detectFirstDynastyPeak, detectThreePeat, detectDominantRotation, detectBullpenCollapse, detectLineupOfEra, detectLosingSeasonStreak, detectEraEndingCollapse, detectRebuildBegun, detectBreakoutSeason, detectContentionWindowOpens, ... (+53) |
| 750 | `packages/sim-core/src/moments/signatureMoments.ts` | estimatedWar, detectComebackPlayer, detectRookieSensation, detectRedemptionArc, detectLateCareerPeak, detectRookieBreakout, detectInjuryReturnHero, detectTradeDeadlineSpark, detectSeptemberCallupHero, COMEBACK_PLAYER_IMPACT, COMEBACK_PLAYER_RELEVANCE, COMEBACK_PLAYER_MISSED_GAMES_THRESHOLD, COMEBACK_PLAYER_WAR_THRESHOLD, ROOKIE_SENSATION_IMPACT, ... (+36) |
| 145 | `packages/sim-core/src/moments/tradeMoments.ts` | detectTradeMoments, detectDeadlineIdentityMoments, BLOCKBUSTER_TRADE_RATING_THRESHOLD, BLOCKBUSTER_TRADE_VALUE_THRESHOLD, BLOCKBUSTER_TRADE_MOVED_IMPACT, BLOCKBUSTER_TRADE_ACQUIRED_IMPACT, DEADLINE_SELLER_IMPACT, DEADLINE_BUYER_IMPACT, TradeMomentDetectionContext, TradeDetectedMoment, DeadlineIdentityMomentDetectionContext, DeadlineIdentityDetectedMoment |
| 714 | `packages/sim-core/src/moments/weeklyMoments.ts` | detectWeeklyMoments, WeeklyMomentDetectionContext, WeeklyDetectedMoment |

### packages/sim-core/src/narrative

Files: 26. Lines: 9911.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 209 | `packages/sim-core/src/narrative/arbitrationPressConferences.ts` | generateArbitrationPressConference, ArbitrationPressConferenceContext, ArbitrationPressConference |
| 196 | `packages/sim-core/src/narrative/awardCeremonyProse.ts` | resolveAwardCapstoneBranch, pickAwardCeremonyLine, AWARD_CAPSTONE_BRANCH_VARIANTS, ResolveAwardCapstoneBranchContext, PickAwardCeremonyLineContext, AwardCapstonePoolId, MvpCapstoneBranch, CyYoungCapstoneBranch, RookieOfTheYearCapstoneBranch, AwardCapstoneBranch, AwardWinnerRole, AwardAcquisitionType |
| 955 | `packages/sim-core/src/narrative/consequences.ts` | buildTradeConsequenceBundle, buildSigningConsequenceBundle, buildPostseasonConsequenceBundle, buildRetirementConsequenceBundle, buildTradeAftermathChain, appendConsequenceWatchers, evaluateConsequenceWatchers, calculateRushingRisk, calculateFanSentiment, OwnerDecisionDelta, PlayerMoraleDelta, ConsequenceBundle, TradeConsequenceContext, SigningConsequenceContext, ... (+8) |
| 547 | `packages/sim-core/src/narrative/draft.ts` | generateDraftCommentary, generateDraftBuzz, generateDraftPickPreview, generateDraftGrades, DraftNarrativeProspect, DraftNarrativePick, DraftNarrativeCurrentPick, DraftCommentaryEntry, DraftBuzzItem, DraftPickPreview, DraftTeamGrade, DraftNarrativeTone |
| 123 | `packages/sim-core/src/narrative/dynastyMarkerProse.ts` | pickStableDynastyMarkerHeadline, pickStableDynastyMarkerBody, DYNASTY_MARKER_HEADLINE_VARIANTS, DYNASTY_MARKER_BODY_VARIANTS, DynastyMarkerRenderContext, DynastyMarkerTopicId |
| 283 | `packages/sim-core/src/narrative/eventBriefings.ts` | generateExtensionSignedBriefing, generateRebuildAnnouncementBriefing, EXTENSION_SIGNED_MIN_YEARS, EXTENSION_SIGNED_MIN_AAV, EXTENSION_SIGNED_MIN_TOTAL_VALUE, REBUILD_ANNOUNCEMENT_WIN_PCT_THRESHOLD, ExtensionSignedBriefingContext, RebuildAnnouncementBriefingContext |
| 444 | `packages/sim-core/src/narrative/farmNarratives.ts` | generateDebutFlashback, detectBreakoutCountdowns, generatePressConference, generateInteractivePressConference, BreakoutCountdown, BreakoutCountdownSnapshot, PressConferenceContext, PressConferenceResponse, InteractivePressConference |
| 83 | `packages/sim-core/src/narrative/hofProse.ts` | resolveHallOfFameBranch, pickHallOfFameInductionSummary, HOF_CAPSTONE_BRANCH_VARIANTS, ResolveHallOfFameBranchContext, PickHallOfFameInductionSummaryContext, HallOfFameInductionType, HallOfFameCapstoneBranch |
| 275 | `packages/sim-core/src/narrative/holdoutCoverage.ts` | generateHoldoutBriefing, generateHoldoutResolutionBriefing, HoldoutCoverageContext, HoldoutBriefing |
| 253 | `packages/sim-core/src/narrative/index.ts` | barrel/index; re-export {// Functions generateNews, generateNewsId, checkMilestones, generateStandingsNews, getUnreadNews, markAsRead}, re-export {buildTradeConsequenceBundle, buildSigningConsequenceBundle, buildPostseasonConsequenceBundle, buildRetirementConsequenceBundle, buildTradeAftermathChain, appendConsequenceWatchers}, re-export {generateTickerEntries, pruneTickerFeed}, re-export {generatePlayByPlay, generateGameHighlights, generateGameRecap}, re-export {SITUATION_CONTEXTS, generateEnhancedPlayByPlay}, re-export {generateDraftCommentary, generateDraftBuzz, generateDraftPickPreview, generateDraftGrades}, re-export {deriveTradeDeadlineMode, generateTradeDialogue, generateTradeChatter}, re-export {detectNewStoryArcs, advanceStoryArcs}, re-export {detectBreakoutCountdowns, generateDebutFlashback, generatePressConference, generateInteractivePressConference}, re-export {evaluatePressConferenceResponse, generateEnhancedPressConference, selectPressConferenceTopic}, re-export {generateArbitrationPressConference}, re-export {AWARD_CAPSTONE_BRANCH_VARIANTS, pickAwardCeremonyLine, resolveAwardCapstoneBranch}, re-export {HOF_CAPSTONE_BRANCH_VARIANTS, pickHallOfFameInductionSummary, resolveHallOfFameBranch}, re-export {RETIREMENT_CAPSTONE_BRANCH_VARIANTS, pickDebutPressLine, pickFarewellTourLine, pickJerseyRetirementLine, pickRetirementSpeechLine, resolveDebutPressBranch}, ... (+73) |
| 1067 | `packages/sim-core/src/narrative/leagueEvents.ts` | generateMonthlyLeagueEvents, evaluateEventRippleEffects, generateLeagueEventNarrative, EVENTS_PER_MONTH_MIN, EVENTS_PER_MONTH_MAX, MAX_EVENT_TEAMS, MAX_EVENT_PLAYERS, TRADE_DEADLINE_MONTH_START, TRADE_DEADLINE_MONTH_END, EARLY_SEASON_MONTH_END, LATE_SEASON_MONTH_START, BLOCKBUSTER_DEADLINE_BONUS, INJURY_DEADLINE_BONUS, GM_FIRING_DEADLINE_BONUS, ... (+38) |
| 1330 | `packages/sim-core/src/narrative/newsFeed.ts` | generateNewsId, generateNews, checkMilestones, generateStandingsNews, getUnreadNews, markAsRead, deduplicateNews, generateSeasonRecap, generateRetirementNews, NewsItem, Moment, GameEvent, RetirementNewsContext, NewsPriority, ... (+3) |
| 107 | `packages/sim-core/src/narrative/offseasonRecap.ts` | generateOffseasonHeadline, generateSeasonRecapNarrative |
| 362 | `packages/sim-core/src/narrative/playByPlay.ts` | generatePlayByPlay, generateGameHighlights, generateGameRecap, GameHighlight |
| 236 | `packages/sim-core/src/narrative/playByPlayEnhanced.ts` | generateEnhancedPlayByPlay, SITUATION_CONTEXTS, PlayByPlayContext, EnhancedPlayByPlayEntry |
| 120 | `packages/sim-core/src/narrative/playerArcProse.ts` | pickStablePlayerArcHeadline, pickStablePlayerArcBody, PLAYER_ARC_HEADLINE_VARIANTS, PLAYER_ARC_BODY_VARIANTS, PlayerArcRenderContext, PlayerArcTopicId |
| 126 | `packages/sim-core/src/narrative/playerMicroArcProse.ts` | pickStablePlayerMicroArcHeadline, pickStablePlayerMicroArcBody, PLAYER_MICRO_ARC_HEADLINE_VARIANTS, PLAYER_MICRO_ARC_BODY_VARIANTS, PlayerMicroArcRenderContext, PlayerMicroArcTopicId |
| 123 | `packages/sim-core/src/narrative/positionGroupProse.ts` | pickStablePositionGroupHeadline, pickStablePositionGroupBody, POSITION_GROUP_HEADLINE_VARIANTS, POSITION_GROUP_BODY_VARIANTS, PositionGroupRenderContext, PositionGroupTopicId |
| 1280 | `packages/sim-core/src/narrative/pressConferences.ts` | getRivalryPressTopic, selectPressConferenceTopic, generateEnhancedPressConference, evaluatePressConferenceResponse, PRESS_CONFERENCE_RESPONSE_TONES, PRESS_CONFERENCE_TOPIC_CATEGORIES, RIVALRY_PRESS_TOPIC_IDS, PressConferenceSeasonRange, PressConferenceTopicContext, EnhancedPressConferenceResponse, PressConferenceTopic, EnhancedPressConference, PressConferenceOutcome, RivalryPressTopicContext, ... (+4) |
| 288 | `packages/sim-core/src/narrative/retirementProse.ts` | resolveRetirementBranch, resolveJerseyRetirementBranch, resolveFarewellTourBranch, resolveDebutPressBranch, pickRetirementSpeechLine, pickJerseyRetirementLine, pickFarewellTourLine, pickDebutPressLine, RETIREMENT_CAPSTONE_BRANCH_VARIANTS, ResolveRetirementBranchContext, ResolveJerseyRetirementBranchContext, ResolveFarewellTourBranchContext, ResolveDebutPressBranchContext, PickRetirementSpeechLineContext, ... (+9) |
| 48 | `packages/sim-core/src/narrative/stableProse.ts` | hashStableProseKey, stableCapstoneProseKey, renderStableTemplate, StableCapstoneProseKey |
| 484 | `packages/sim-core/src/narrative/storyArcs.ts` | detectNewStoryArcs, advanceStoryArcs, StoryArcSnapshot |
| 306 | `packages/sim-core/src/narrative/ticker.ts` | generateTickerEntries, pruneTickerFeed, TickerScoreContext, TickerStandingsChangeContext, TickerTradeContext, TickerInjuryContext, TickerMilestoneContext, TickerProspectCallupContext, TickerRecordWatchContext, TickerRumorCandidate, TickerGenerationContext |
| 206 | `packages/sim-core/src/narrative/tradeDeadlinePressConferences.ts` | generateTradeDeadlinePressConference, buildTradeBroadcastCoverage, TradeDeadlinePressConferenceContext, TradeDeadlinePressConference, TradeBroadcastCoverage |
| 226 | `packages/sim-core/src/narrative/tradeTheatre.ts` | deriveTradeDeadlineMode, generateTradeDialogue, generateTradeChatter, TradeDialogue, TradeChatterItem, TradeDeadlineMode, TradeNegotiationType |
| 234 | `packages/sim-core/src/narrative/weeklyMomentProse.ts` | pickStableWeeklyMomentHeadline, pickStableWeeklyMomentBody, WEEKLY_MOMENT_HEADLINE_VARIANTS, WEEKLY_MOMENT_BODY_VARIANTS, WeeklyMomentRenderContext, WeeklyMomentStableKey, WeeklyMomentTopicId |

### packages/sim-core/src/onboarding

Files: 20. Lines: 6752.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 215 | `packages/sim-core/src/onboarding/agmCandidates.ts` | selectAGM, toAssistantGMProfile, AGM_CANDIDATES, VoiceStyle, AGMCandidate, AGMCandidateId |
| 357 | `packages/sim-core/src/onboarding/assistantGM.ts` | generateAssistantGM, getDialogueVoice, generateGreeting, generateFarewell, ONBOARDING_MODE, BaseballPhilosophy, DialogueVoice, AssistantGMProfile, AssistantGMBackground, AssistantGMPersonality |
| 513 | `packages/sim-core/src/onboarding/chapterDialogue.ts` | generateChapterIntro, generateRosterReaction, generateFarmReaction, generateStaffReaction, generateFinancialReaction, generateScoutingReaction, generateStrategyReaction, generateOwnerReaction, generatePressReaction, generateChapterTransition, getNextChapter, DialogueLine, DialogueTone |
| 288 | `packages/sim-core/src/onboarding/choiceReactions.ts` | reactToSeasonGoal, reactToDevelopmentStyle, reactToSpendingStyle, reactToTradeApproach, reactToScoutingFocus, reactToMediaTone, ChoiceReaction |
| 480 | `packages/sim-core/src/onboarding/coachingTips.ts` | generateChapterTips, generateDecisionExplanation, generateOnboardingHighlights, generateQuickReference, CoachingTip, DecisionPoint, DecisionCoaching, OnboardingHighlight, QuickReferenceCard, ChapterAssessmentData, AllChapterData |
| 1253 | `packages/sim-core/src/onboarding/dayOne.ts` | buildDayOneTeamCard, buildDayOneOrgReview, buildOpeningDayPlan, buildDayOneDefaults, buildDayOneNarrativePack, buildDayOneTeaser, pickDayOneCrisis, buildDayOneImpacts, DayOneOpeningBullpenPlan, DayOneOpeningPlan, DayOneProjectedImpact, DayOneTeaser, DayOneNarrativeContext, DayOneNarrativePack, ... (+10) |
| 253 | `packages/sim-core/src/onboarding/farmAssessment.ts` | profileTopProspects, assessPipelineHealth, generateFarmNarrative, assessFarmSystem, ProspectProfile, PipelineHealth, FarmAssessment |
| 198 | `packages/sim-core/src/onboarding/financialPlaybook.ts` | analyzePayrollBreakdown, identifyExtensionPriorities, calculateFinancialFlexibility, generateFinancialPlaybook, FinancialContext, PayrollBreakdown, ExtensionPriority, FinancialFlexibility, FinancialPlaybook |
| 461 | `packages/sim-core/src/onboarding/flowEngine.ts` | createOnboardingState, advanceChapter, completeChapter, isOnboardingComplete, getCurrentChapter, getChapterProgress, getGMPhilosophy, createRevisedOnboardingState, advanceRevisedChapter, selectAGMInFlow, setStaffHiresInFlow, setScoutingHireInFlow, getOnboardingResult, ONBOARDING_CHAPTER_IDS, ... (+13) |
| 257 | `packages/sim-core/src/onboarding/index.ts` | barrel/index; re-export {buildDayOneDefaults, buildDayOneImpacts, buildDayOneNarrativePack, buildDayOneOrgReview, buildDayOneTeamCard, buildDayOneTeaser}, re-export {CHAPTER_ORDER, ONBOARDING_CHAPTER_IDS, REVISED_CHAPTER_ORDER, advanceChapter, advanceRevisedChapter, completeChapter}, re-export {AGM_CANDIDATES, selectAGM, toAssistantGMProfile}, re-export {applyScoutingHire, applyStaffHires, generateScoutingHiringSlate, generateStaffHiringSlate, getManagerStyleModifier}, re-export {ONBOARDING_MODE, generateAssistantGM, generateFarewell, generateGreeting, getDialogueVoice}, re-export {generateChapterIntro, generateChapterTransition, generateFarmReaction, generateFinancialReaction, generateOwnerReaction, generatePressReaction}, re-export {generateChapterTips, generateDecisionExplanation, generateOnboardingHighlights, generateQuickReference}, re-export {reactToDevelopmentStyle, reactToMediaTone, reactToScoutingFocus, reactToSeasonGoal, reactToSpendingStyle, reactToTradeApproach}, re-export {ROUND_THREE_DIALOGUE}, re-export {generateChapterScript, generateFullOnboardingScript, generateRevisedOnboardingScript}, re-export {generateBudgetOverview, generateOwnerMeeting, getOwnerPersonalityProfile}, re-export {assessFarmSystem, assessPipelineHealth, generateFarmNarrative, profileTopProspects}, re-export {analyzePayrollBreakdown, calculateFinancialFlexibility, generateFinancialPlaybook, identifyExtensionPriorities}, re-export {generateOnboardingOpeningStatementOptions, generateOnboardingPressConference}, ... (+93) |
| 229 | `packages/sim-core/src/onboarding/ownerMeeting.ts` | getOwnerPersonalityProfile, generateBudgetOverview, generateOwnerMeeting, OwnerMeetingContext, OwnerPersonality, BudgetOverview, OwnerMeetingBriefing |
| 93 | `packages/sim-core/src/onboarding/pressConference.ts` | generateOnboardingOpeningStatementOptions, generateOnboardingPressConference, OnboardingPressConferenceContext, OpeningStatementOption, OnboardingPressConferenceBriefing |
| 307 | `packages/sim-core/src/onboarding/rosterAssessment.ts` | identifyStarPlayers, analyzeLineupStrengths, identifyPositionNeeds, summarizeContractSituation, assessRoster, StarPlayerProfile, LineupAnalysis, PositionNeed, ContractSituation, RosterAssessment |
| 153 | `packages/sim-core/src/onboarding/roundThreeDialogue.ts` | ROUND_THREE_DIALOGUE |
| 161 | `packages/sim-core/src/onboarding/scoutingBriefing.ts` | scoutDivisionRival, identifyLeagueThreats, generateScoutingBriefing, ScoutingBriefingContext, RivalReport, ThreatAssessment, ScoutingBriefing |
| 732 | `packages/sim-core/src/onboarding/scriptOrchestrator.ts` | generateChapterScript, generateFullOnboardingScript, generateRevisedOnboardingScript, OnboardingScriptContext, ChapterScript, OnboardingScript, RevisedOnboardingScriptContext, RevisedChapterScript, AGMStaffOpinion, RevisedOnboardingScript |
| 167 | `packages/sim-core/src/onboarding/seasonStrategy.ts` | rankStrategicPriorities, generateSeasonStrategy, SeasonStrategyContext, StrategicPriority, SeasonStrategyOption, SeasonStrategyBriefing |
| 75 | `packages/sim-core/src/onboarding/shared.ts` | clamp, average, fullNameFromParts, getPlayerFullName, byString, sortPlayersByRating, gradeFromThresholds, isPitcherPosition, splitRoster, findBestPlayerAtPosition, ONBOARDING_POSITION_ORDER, OnboardingGrade |
| 153 | `packages/sim-core/src/onboarding/staffEvaluation.ts` | profileKeyCoaches, assessStaffStrengths, evaluateCoachingStaff, CoachProfile, StaffStrengths, StaffEvaluation |
| 407 | `packages/sim-core/src/onboarding/staffHiring.ts` | getManagerStyleModifier, generateStaffHiringSlate, applyStaffHires, generateScoutingHiringSlate, applyScoutingHire, StaffCandidate, StaffHiringSlate, StaffHireChoices, OnboardingTeamContext, ManagerStyleModifier, AppliedStaffHires, ScoutingDirectorCandidate, PersistedScoutingDirector, ScoutingHiringSlate, ... (+4) |

### packages/sim-core/src/performance

Files: 1. Lines: 178.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 178 | `packages/sim-core/src/performance/index.ts` | barrel/index; estimateSnapshotSize, archiveOldSeasons, pruneStaleData |

### packages/sim-core/src/player

Files: 19. Lines: 5493.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 47 | `packages/sim-core/src/player/attributeDescriptors.ts` | isPitcher, getAttributeDescriptors, getAttributeValue, HITTER_ATTRIBUTE_DESCRIPTORS, PITCHER_ATTRIBUTE_DESCRIPTORS, AttributeDescriptor |
| 126 | `packages/sim-core/src/player/attributes.ts` | toDisplayRating, toInternalRating, toLetterGrade, hitterOverall, pitcherOverall, clampRating, RATING_MIN, RATING_MAX, DISPLAY_MIN, DISPLAY_MAX, GRADE_THRESHOLDS, HITTER_WEIGHTS, PITCHER_WEIGHTS, HitterAttributes, ... (+2) |
| 634 | `packages/sim-core/src/player/breakoutEngine.ts` | calculateBreakoutProbability, classifyDevelopmentTrajectory, detectRegressionRisk, predictProspectCeiling, generateBreakoutScoutReport, BreakoutSeasonHistoryEntry, BreakoutFactor, BreakoutAssessment, RegressionAssessment, CeilingProjection, BreakoutRiskLevel, RegressionRiskLevel, CeilingConfidenceLevel, BreakoutDevelopmentTrajectory |
| 43 | `packages/sim-core/src/player/breakouts.ts` | detectProspectBreakouts, BreakoutEvent |
| 383 | `packages/sim-core/src/player/coaching.ts` | calculateCoachMarketValue, calculateStaffBudget, calculateCoachingPayroll, generateCoachingStaff, generateCoachFreeAgents, getCoachingDevelopmentModifier, hireCoach, fireCoach, getCoachSpecialtyForPosition, COACH_ROLES, COACH_SPECIALTIES, Coach, CoachRole, CoachSpecialty |
| 446 | `packages/sim-core/src/player/coachingChemistry.ts` | calculateCoachSynergy, calculateCoachPlayerAffinity, calculateStaffHarmony, getCoachDevelopmentBonus, identifyChemistryIssues, CoachSynergy, CoachPlayerAffinity, StaffHarmony, ChemistryIssue |
| 374 | `packages/sim-core/src/player/comparison.ts` | comparePlayersHead2Head, rankPlayerAttributes, comparePlayerStats, generateComparisonSummary, AttributeComparison, ComparisonResult, StatComparison, RankedAttribute |
| 418 | `packages/sim-core/src/player/development.ts` | updateDevPhase, growMentalToughness, shouldRetire, developPlayer, developAllPlayers, DevProgram |
| 402 | `packages/sim-core/src/player/developmentPipeline.ts` | initializePlayerDevelopmentProfile, getBreakoutProbability, runMonthlyDevelopmentCheckpoint, reconcileDevelopmentPipeline, getPositionConversionTargets, MonthlyDevelopmentCheckpointResult |
| 113 | `packages/sim-core/src/player/developmentSetbacks.ts` | applyDevelopmentSetback, recoverDevelopmentSetback, isDevelopmentSetbackExpired, checkDevelopmentSetback |
| 20 | `packages/sim-core/src/player/enums.ts` | PITCHER_POSITIONS, ROSTER_LEVELS, FORTY_MAN_LIMIT, RosterLevel |
| 863 | `packages/sim-core/src/player/generation.ts` | generatePlayer, generateTeamRoster, generateLeaguePlayers, HITTER_POSITIONS, ALL_POSITIONS, DEV_PHASES, DEVELOPMENT_PROGRAMS, DEVELOPMENT_TRAJECTORIES, NO_TRADE_CLAUSE_TYPES, DeferredMoneyInstallment, ExtensionHistoryEntry, ArbitrationHistoryEntry, HoldoutState, GeneratedPlayer, ... (+7) |
| 185 | `packages/sim-core/src/player/index.ts` | barrel/index; re-export {toDisplayRating, toInternalRating, toLetterGrade, hitterOverall, pitcherOverall, clampRating}, re-export {generatePlayer, generateTeamRoster, generateLeaguePlayers, HITTER_POSITIONS, PITCHER_POSITIONS, ALL_POSITIONS}, re-export {assignPlayerToTeam, getLongestTeamTenureSeasons, getTenureSeasonCount, releasePlayerFromTeam, retirePlayerFromTeam, seedInitialTeamTenure}, re-export {PERSONALITY_TRAITS, POSITIVE_CHEMISTRY_TRAITS, NEGATIVE_CHEMISTRY_TRAITS, CLUBHOUSE_LEADER_TRAITS, PLAYOFF_COMPOSURE_TRAITS, VOLATILE_PERFORMANCE_TRAITS}, re-export {COACH_ROLES, COACH_SPECIALTIES, calculateCoachMarketValue, calculateCoachingPayroll, calculateStaffBudget, fireCoach}, re-export {getBreakoutProbability, getPositionConversionTargets, initializePlayerDevelopmentProfile, reconcileDevelopmentPipeline, runMonthlyDevelopmentCheckpoint}, re-export {createProspectBond, getProspectLoyaltyModifier, updateProspectBonds}, re-export {applyDevelopmentSetback, checkDevelopmentSetback, recoverDevelopmentSetback, isDevelopmentSetbackExpired}, re-export {developPlayer, developAllPlayers, updateDevPhase, shouldRetire, growMentalToughness}, re-export {checkInjury, advanceInjury, getInjuryMultiplier, generateInjury, describeInjury, processInjuries}, re-export {detectProspectBreakouts}, re-export {calculateCoachSynergy, calculateCoachPlayerAffinity, calculateStaffHarmony, getCoachDevelopmentBonus, identifyChemistryIssues}, re-export {findMentorCandidates, findProtegeeCandidates, pairMentors, advanceMentorship, getMentorshipDevelopmentBonus, toMentorRelationship}, re-export {comparePlayersHead2Head, comparePlayerStats, rankPlayerAttributes, generateComparisonSummary}, ... (+91) |
| 436 | `packages/sim-core/src/player/injury.ts` | generateInjury, checkInjury, advanceInjury, getInjuryMultiplier, describeInjury, processInjuries, Injury, InjuryType, InjurySeverity |
| 293 | `packages/sim-core/src/player/mentorship.ts` | findMentorCandidates, findProtegeeCandidates, pairMentors, advanceMentorship, getMentorshipDevelopmentBonus, toMentorRelationship, fromMentorRelationship, MentorshipPairing, MentorshipEvent |
| 256 | `packages/sim-core/src/player/personalityTraits.ts` | assignPersonalityTraits, deriveDeterministicPersonalityTraits, countMatchingTraits, calculatePlayoffComposureModifier, PERSONALITY_TRAITS, POSITIVE_CHEMISTRY_TRAITS, NEGATIVE_CHEMISTRY_TRAITS, CLUBHOUSE_LEADER_TRAITS, PLAYOFF_COMPOSURE_TRAITS, VOLATILE_PERFORMANCE_TRAITS, PersonalityTraitContext |
| 126 | `packages/sim-core/src/player/prospectBonds.ts` | getProspectLoyaltyModifier, createProspectBond, updateProspectBonds, ProspectBondSnapshot |
| 232 | `packages/sim-core/src/player/similarity.ts` | findSimilarPlayers, getPlayerArchetype, SimilarPlayer, SimilarityResult, PlayerArchetype |
| 114 | `packages/sim-core/src/player/teamTenures.ts` | getTenureSeasonCount, getLongestTeamTenureSeasons, seedInitialTeamTenure, assignPlayerToTeam, releasePlayerFromTeam, retirePlayerFromTeam |

### packages/sim-core/src/roster

Files: 7. Lines: 3592.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 919 | `packages/sim-core/src/roster/freeAgency.ts` | calculateMarketValue, getDemandLevel, projectContractYears, createFreeAgencyMarket, calculateQualifyingOfferSalary, getQualifyingOfferEligiblePlayers, issueQualifyingOffer, shouldIssueQualifyingOffer, resolveQualifyingOffer, generateAIOffer, simulateFADay, simulateFullFreeAgency, makeUserOffer, getTopFreeAgents, ... (+6) |
| 157 | `packages/sim-core/src/roster/index.ts` | barrel/index; re-export {// Constants MLB_ROSTER_LIMIT, FORTY_MAN_LIMIT, MIN_PITCHERS, MIN_POSITION_PLAYERS, MAX_MINOR_LEAGUE_OPTIONS, // Functions buildRosterState}, re-export {OFFSEASON_PHASES, createOffseasonState, getOffseasonLength, getPhaseIndex, getNextPhase, getPhaseDuration}, re-export {calculateRule5EligibleAfterSeason, createRule5Session, estimateBackfilledRule5EligibilityAfterSeason, lockRule5ProtectionAudit, makeRule5Selection, passRule5DraftTurn}, re-export {calculateMarketValue, getDemandLevel, projectContractYears, createFreeAgencyMarket, calculateQualifyingOfferSalary, getQualifyingOfferEligiblePlayers}, re-export {AFFILIATE_LEVELS, AFFILIATE_SCHEDULE_LENGTHS, EXPANDED_MLB_ROSTER_LIMIT, SEPTEMBER_EXPANDED_ROSTER_DAYS, ROOKIE_AFFILIATE_START_DAY, createMinorLeagueState}, re-export {getMinorLeagueProgression, recordMinorLeagueStats}, // Constants MLB_ROSTER_LIMIT, FORTY_MAN_LIMIT, MIN_PITCHERS, MIN_POSITION_PLAYERS, MAX_MINOR_LEAGUE_OPTIONS, // Functions buildRosterState, validateRoster, executeRosterAction, ... (+67) |
| 870 | `packages/sim-core/src/roster/minorLeagues.ts` | createMinorLeagueState, accrueServiceTimeDay, consumeOptionYear, buildWaiverPriority, placeOnWaivers, claimOffWaivers, isExpandedRosterWindow, getActiveRosterLimit, getRosterComplianceIssues, getPromotionCandidates, simulateAffiliateDay, EXPANDED_MLB_ROSTER_LIMIT, SEPTEMBER_EXPANDED_ROSTER_DAYS, ROOKIE_AFFILIATE_START_DAY, ... (+17) |
| 47 | `packages/sim-core/src/roster/minorLeagueStats.ts` | recordMinorLeagueStats, getMinorLeagueProgression |
| 522 | `packages/sim-core/src/roster/offseason.ts` | createOffseasonState, getOffseasonLength, getPhaseIndex, getNextPhase, getPhaseDuration, advanceOffseasonDay, skipCurrentPhase, recordArbitration, recordTenderDecisions, recordExtensionResults, recordQualifyingOfferResults, recordCoachChange, recordFASigning, recordDraftPicks, ... (+18) |
| 788 | `packages/sim-core/src/roster/rosterManager.ts` | getNextLevel, getMLBRosterCount, get40ManCount, needsRosterMove, buildRosterState, validateRoster, promotePlayer, demotePlayer, dfaPlayer, executeRosterAction, autoFillMLBRoster, MLB_ROSTER_LIMIT, MIN_PITCHERS, MIN_POSITION_PLAYERS, AutoFillRosterOptions, ... (+7) |
| 293 | `packages/sim-core/src/roster/rule5.ts` | calculateRule5EligibleAfterSeason, estimateBackfilledRule5EligibilityAfterSeason, createRule5Session, toggleRule5Protection, lockRule5ProtectionAudit, makeRule5Selection, passRule5DraftTurn, Rule5EligiblePlayer, Rule5Selection, Rule5Obligation, Rule5OfferBackState, Rule5SessionState, Rule5ActionResult, CreateRule5SessionArgs |

### packages/sim-core/src/scenarios

Files: 4. Lines: 596.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 22 | `packages/sim-core/src/scenarios/index.ts` | barrel/index; re-export {SCENARIO_LIBRARY, getScenarioById, readScenarioRecord, type ScenarioDefinition}, re-export {applyScenarioOverrides, evaluateScenarioProgress, completeScenario}, re-export {SCENARIO_OBJECTIVES, getScenarioObjectives, evaluateObjectiveProgress}, SCENARIO_LIBRARY, getScenarioById, readScenarioRecord, type ScenarioDefinition, applyScenarioOverrides, evaluateScenarioProgress, completeScenario, SCENARIO_OBJECTIVES, getScenarioObjectives, evaluateObjectiveProgress |
| 178 | `packages/sim-core/src/scenarios/scenarioEngine.ts` | applyScenarioOverrides, evaluateScenarioProgress, completeScenario |
| 48 | `packages/sim-core/src/scenarios/scenarioLibrary.ts` | getScenarioById, readScenarioRecord, SCENARIO_LIBRARY, ScenarioDefinition |
| 348 | `packages/sim-core/src/scenarios/scenarioObjectives.ts` | getScenarioObjectives, evaluateObjectiveProgress, SCENARIO_OBJECTIVES, ScenarioObjective, ScenarioObjectiveSet, ObjectiveProgressContext |

### packages/sim-core/src/scouting

Files: 5. Lines: 1739.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 262 | `packages/sim-core/src/scouting/conflicts.ts` | generateScoutConflict, resolveScoutConflicts |
| 56 | `packages/sim-core/src/scouting/index.ts` | barrel/index; re-export {// Types type ScoutBias, type Scout, type ScoutReport, // Functions generateScout, generateScoutingStaff, scoutPlayer}, re-export {DEFAULT_IFA_BONUS_POOL, IFA_POOL_MIN, IFA_POOL_MAX, scoutQualityToAccuracy, getInternationalScoutAccuracy, generateIFAPool}, re-export {generateScoutConflict, resolveScoutConflicts}, // Types type ScoutBias, type Scout, type ScoutReport, // Functions generateScout, generateScoutingStaff, scoutPlayer, combineReports, getTeamScoutingAccuracy, generateScoutNotes, DEFAULT_IFA_BONUS_POOL, IFA_POOL_MIN, ... (+13) |
| 510 | `packages/sim-core/src/scouting/international.ts` | scoutQualityToAccuracy, getInternationalScoutAccuracy, generateIFAPool, createInternationalScoutingState, getAvailableIFAProspects, getRemainingIFABudget, scoutIFAProspect, tradeIFABonusPool, convertIFAProspectToPlayer, signIFAProspect, DEFAULT_IFA_BONUS_POOL, IFA_POOL_MIN, IFA_POOL_MAX, InternationalProspect, ... (+8) |
| 566 | `packages/sim-core/src/scouting/scoutingEngine.ts` | generateScout, generateScoutingStaff, scoutPlayer, combineReports, getTeamScoutingAccuracy, generateScoutNotes, Scout, ScoutReport, ScoutBias |
| 345 | `packages/sim-core/src/scouting/scoutLearning.ts` | updateScoutConfidence, buildMultiScoutConsensus, calculateScoutAccuracy, generateScoutLearningEvent, estimateAttributeWithUncertainty, ScoutObservation, ConsensusReport, ScoutAccuracyProfile, ScoutLearningEvent, AttributeEstimate, ScoutProfile, ScoutPrediction, ActualOutcome, ConsensusAgreementLevel, ... (+1) |

### packages/sim-core/src/sharing

Files: 3. Lines: 239.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 189 | `packages/sim-core/src/sharing/dynastyCards.ts` | generateSeasonRecapCard, generateChampionshipCard, generateDynastyCard |
| 7 | `packages/sim-core/src/sharing/index.ts` | barrel/index; re-export {generateDynastyCard, generateSeasonRecapCard, generateChampionshipCard}, re-export {calculateDynastyLeaderboardScore}, generateDynastyCard, generateSeasonRecapCard, generateChampionshipCard, calculateDynastyLeaderboardScore |
| 43 | `packages/sim-core/src/sharing/leaderboard.ts` | calculateDynastyLeaderboardScore |

### packages/sim-core/src/sim

Files: 8. Lines: 2424.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 75 | `packages/sim-core/src/sim/calendar.ts` | getRegularSeasonMonthForDay, getNextMonthStartDay, getRegularSeasonGameDays, getTradeDeadlineDay, getDaysUntilTradeDeadline, isTradeDeadlineModeDay, REGULAR_SEASON_DAYS, REGULAR_SEASON_MONTHS, RegularSeasonMonth |
| 386 | `packages/sim-core/src/sim/gameSimulator.ts` | simulateGame, GameTeam, GameBoxScore, GameSimulationOptions, PlayerGameStats |
| 82 | `packages/sim-core/src/sim/index.ts` | barrel/index; re-export {resolvePlateAppearance}, re-export {advanceRunners, freshRunnerState}, re-export {simulateGame}, re-export {REGULAR_SEASON_DAYS, REGULAR_SEASON_MONTHS, getRegularSeasonGameDays, getDaysUntilTradeDeadline, getRegularSeasonMonthForDay, getTradeDeadlineDay}, re-export {createSeasonState, simulateDay, simulateWeek, simulateMonth}, re-export {buildPlayoffPreview, determinePlayoffSeeds, initializePlayoffBracket, simPlayoffGame, simNextPlayoffGame, simPlayoffSeries}, resolvePlateAppearance, advanceRunners, freshRunnerState, simulateGame, REGULAR_SEASON_DAYS, REGULAR_SEASON_MONTHS, getRegularSeasonGameDays, getDaysUntilTradeDeadline, ... (+19) |
| 185 | `packages/sim-core/src/sim/markov.ts` | advanceRunners, freshRunnerState, RunnerState, MarkovResult, BaseState |
| 196 | `packages/sim-core/src/sim/plateAppearance.ts` | resolvePlateAppearance, PAContext, PAResult, PAOutcome |
| 264 | `packages/sim-core/src/sim/playoffMomentum.ts` | calculateHomeFieldAdvantage, calculatePitcherFatigue, calculateMustWinPressure, calculateStreakMomentum, buildPlayoffGameModifiers, generateMomentumNarrative, FatigueResult, PressureModifier, PlayoffGameContext, GameModifiers |
| 846 | `packages/sim-core/src/sim/playoffSimulator.ts` | determinePlayoffSeeds, buildPlayoffPreview, initializePlayoffBracket, simPlayoffGame, simulateSeries, advancePlayoffRound, simPlayoffSeries, simNextPlayoffGame, simPlayoffRound, isPlayoffComplete, simulatePlayoffs, PlayoffSeed, PlayoffKeyPerformer, PlayoffGameResult, ... (+9) |
| 390 | `packages/sim-core/src/sim/seasonSimulator.ts` | createSeasonState, simulateDay, simulateWeek, simulateMonth, SeasonState, DaySimResult, SeasonSimulationOptions |

### packages/sim-core/src/stats

Files: 5. Lines: 1242.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 395 | `packages/sim-core/src/stats/advanced.ts` | calculateBattingAverage, calculateObp, calculateSlg, calculateOps, calculateIso, calculateWoba, calculateFip, calculateXfip, estimateProjectedWarFromGrade, estimateProjectedWarRange, buildLeagueAdvancedContext, calculateAdvancedStatLine, LeagueAdvancedContext, AdvancedStatLine, ... (+2) |
| 149 | `packages/sim-core/src/stats/milestones.ts` | calculateMilestoneProgress, getMilestoneAlerts, CAREER_MILESTONES, CareerMilestoneDefinition, CareerStatTotals, MilestoneProgress, MilestoneAlert |
| 361 | `packages/sim-core/src/stats/projections.ts` | formatPaceLabel, projectSeasonStats, findNotableProjections, SEASON_GAMES, HitterProjectedStatLine, PitcherProjectedStatLine, SeasonProjection, NotableProjection, ProjectedStatLine |
| 60 | `packages/sim-core/src/stats/shutouts.ts` | isCompleteGameShutout, recordCareerShutout, COMPLETE_GAME_OUTS, CAREER_SHUTOUT_MILESTONE |
| 277 | `packages/sim-core/src/stats/teamAggregates.ts` | computeTeamEraPlus, computeTeamBullpenEraPlus, getPrimaryStarterEraPlusLines, computeTeamWrcPlus, rankTeamsByWrcPlus, findLeadingHitterByWrcPlus, ERA_PLUS_SHUTOUT_CAP, TeamPitchingAggregate, StarterEraPlusLine, TeamWrcPlusLine, TeamWrcPlusRank, LeadingHitterLine |

### packages/sim-core/src/timeline

Files: 1. Lines: 193.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 193 | `packages/sim-core/src/timeline/index.ts` | barrel/index; compareTimelines |

### packages/sim-core/src/trade

Files: 6. Lines: 2410.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 484 | `packages/sim-core/src/trade/deadlineDrama.ts` | generateDeadlineTimeline, getDeadlineEventsForDay, generateBiddingWar, resolveDeadlineBuzzerBeater, DeadlineEvent, DeadlineContext, BiddingRound, BiddingWar, BuzzerBeaterResult, DeadlineEventType |
| 62 | `packages/sim-core/src/trade/index.ts` | barrel/index; re-export {evaluatePlayerTradeValue, comparePackages, type PlayerTradeValue, type PackageComparison}, re-export {assignGMPersonality, evaluateTradeProposal, generateAITradeOffers, executeTrade, generateTradeId, type GMPersonality}, re-export {generateDeadlineTimeline, getDeadlineEventsForDay, generateBiddingWar, resolveDeadlineBuzzerBeater, type DeadlineEventType, type DeadlineEvent}, re-export {MAX_NEGOTIATION_ROUNDS, PENDING_EXPIRE_DAYS, INSTANT_REJECT_THRESHOLD, COUNTER_RANGE_LOW, COUNTER_RANGE_HIGH, initiateNegotiation}, evaluatePlayerTradeValue, comparePackages, type PlayerTradeValue, type PackageComparison, assignGMPersonality, evaluateTradeProposal, generateAITradeOffers, executeTrade, generateTradeId, type GMPersonality, ... (+24) |
| 366 | `packages/sim-core/src/trade/multiTeamTrade.ts` | evaluateMultiTeamFairness, generateConditionalClause, evaluateCondition, detectTradeCascades, generateMultiTeamTradeNarrative, proposeMultiTeamTrade, MultiTeamProposal, TradeParticipant, MultiTeamTradeResult, FairnessAssessment, TradeCondition, ConditionOutcome, CompletedTrade, PendingTrade, ... (+4) |
| 671 | `packages/sim-core/src/trade/tradeAI.ts` | generateTradeId, assignGMPersonality, evaluateTradeProposal, generateAITradeOffers, executeTrade, TradeProposal, TradeResult, TradeGenerationContext, GMPersonality, TradeStatus |
| 614 | `packages/sim-core/src/trade/tradeNegotiation.ts` | calculateCounterOffer, initiateNegotiation, advanceNegotiation, resolveNegotiation, generateNegotiationDialogue, isNegotiationComplete, MAX_NEGOTIATION_ROUNDS, PENDING_EXPIRE_DAYS, INSTANT_REJECT_THRESHOLD, COUNTER_RANGE_LOW, COUNTER_RANGE_HIGH, NegotiationProposal, NegotiationContext, NegotiationDialogue, ... (+6) |
| 217 | `packages/sim-core/src/trade/valuation.ts` | evaluatePlayerTradeValue, comparePackages, PlayerTradeValue, PackageComparison |

### packages/sim-core/tests

Files: 142. Lines: 35705.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 4 | `packages/sim-core/tests/__snapshots__/determinism.snapshot.test.ts.snap` | test |
| 136 | `packages/sim-core/tests/achievements.test.ts` | test |
| 62 | `packages/sim-core/tests/agmCandidates.test.ts` | test |
| 331 | `packages/sim-core/tests/arbitrationMoments.test.ts` | test |
| 202 | `packages/sim-core/tests/arbitrationPressConferences.test.ts` | test |
| 245 | `packages/sim-core/tests/assistantGMCharacter.test.ts` | test |
| 219 | `packages/sim-core/tests/assistantGMChoiceReactions.test.ts` | test |
| 654 | `packages/sim-core/tests/assistantGMDialogue.test.ts` | test |
| 527 | `packages/sim-core/tests/assistantGMOrchestrator.test.ts` | test |
| 545 | `packages/sim-core/tests/assistantGMTips.test.ts` | test |
| 112 | `packages/sim-core/tests/attributes.test.ts` | test |
| 148 | `packages/sim-core/tests/awardNarratives.test.ts` | test |
| 156 | `packages/sim-core/tests/balanceTuning.test.ts` | test |
| 71 | `packages/sim-core/tests/benchClutchWeek.test.ts` | test |
| 512 | `packages/sim-core/tests/breakoutEngine.test.ts` | test |
| 166 | `packages/sim-core/tests/bullpenCollapse.test.ts` | test |
| 97 | `packages/sim-core/tests/bullpenOverwork.test.ts` | test |
| 26 | `packages/sim-core/tests/calendar.test.ts` | test |
| 89 | `packages/sim-core/tests/calibration.test.ts` | test |
| 637 | `packages/sim-core/tests/calibrationDump.generate.ts` | test |
| 390 | `packages/sim-core/tests/calibrationReport.test.ts` | test |
| 304 | `packages/sim-core/tests/capstoneProse.test.ts` | test |
| 76 | `packages/sim-core/tests/career.test.ts` | test |
| 127 | `packages/sim-core/tests/careerShutouts.test.ts` | test |
| 87 | `packages/sim-core/tests/closerWeek.test.ts` | test |
| 157 | `packages/sim-core/tests/coaching.test.ts` | test |
| 312 | `packages/sim-core/tests/coachingChemistry.test.ts` | test |
| 96 | `packages/sim-core/tests/comebackPlayer.test.ts` | test |
| 369 | `packages/sim-core/tests/comparison.test.ts` | test |
| 435 | `packages/sim-core/tests/contracts.test.ts` | test |
| 405 | `packages/sim-core/tests/dayOne.test.ts` | test |
| 185 | `packages/sim-core/tests/deadlineDrama.test.ts` | test |
| 93 | `packages/sim-core/tests/determinism.snapshot.test.ts` | test |
| 233 | `packages/sim-core/tests/development.test.ts` | test |
| 270 | `packages/sim-core/tests/developmentPipeline.test.ts` | test |
| 49 | `packages/sim-core/tests/developmentSetbacks.test.ts` | test |
| 155 | `packages/sim-core/tests/dominantRotation.test.ts` | test |
| 391 | `packages/sim-core/tests/draft.test.ts` | test |
| 227 | `packages/sim-core/tests/draftNarrative.test.ts` | test |
| 45 | `packages/sim-core/tests/dynastyMarkerProse.test.ts` | test |
| 110 | `packages/sim-core/tests/eraEndingCollapse.test.ts` | test |
| 214 | `packages/sim-core/tests/eventBriefings.test.ts` | test |
| 150 | `packages/sim-core/tests/farmNarratives.test.ts` | test |
| 402 | `packages/sim-core/tests/finance.test.ts` | test |
| 378 | `packages/sim-core/tests/freeAgency.test.ts` | test |
| 221 | `packages/sim-core/tests/frontOffice.test.ts` | test |
| 171 | `packages/sim-core/tests/gameSimulator.test.ts` | test |
| 138 | `packages/sim-core/tests/generation.test.ts` | test |
| 325 | `packages/sim-core/tests/gmRelationships.test.ts` | test |
| 215 | `packages/sim-core/tests/hallOfFame.test.ts` | test |
| 456 | `packages/sim-core/tests/holdoutCoverage.test.ts` | test |
| 88 | `packages/sim-core/tests/hotColdStreakWeek.test.ts` | test |
| 209 | `packages/sim-core/tests/injury.test.ts` | test |
| 145 | `packages/sim-core/tests/injuryReturnHero.test.ts` | test |
| 125 | `packages/sim-core/tests/international.test.ts` | test |
| 262 | `packages/sim-core/tests/invariants.test.ts` | test |
| 71 | `packages/sim-core/tests/lateCareerPeak.test.ts` | test |
| 430 | `packages/sim-core/tests/leagueEvents.test.ts` | test |
| 148 | `packages/sim-core/tests/lifecycle.integration.test.ts` | test |
| 201 | `packages/sim-core/tests/lineupOfEra.test.ts` | test |
| 286 | `packages/sim-core/tests/log5.test.ts` | test |
| 224 | `packages/sim-core/tests/marketIntelligence.test.ts` | test |
| 83 | `packages/sim-core/tests/markov.test.ts` | test |
| 302 | `packages/sim-core/tests/mentorship.test.ts` | test |
| 254 | `packages/sim-core/tests/milestones.test.ts` | test |
| 266 | `packages/sim-core/tests/minorLeagues.test.ts` | test |
| 74 | `packages/sim-core/tests/minorLeagueStats.test.ts` | test |
| 1355 | `packages/sim-core/tests/momentDetector.test.ts` | test |
| 563 | `packages/sim-core/tests/multiTeamTrade.test.ts` | test |
| 579 | `packages/sim-core/tests/narrative.test.ts` | test |
| 579 | `packages/sim-core/tests/narrativeConsequences.test.ts` | test |
| 542 | `packages/sim-core/tests/narrativeState.test.ts` | test |
| 286 | `packages/sim-core/tests/narrativeWave3.integration.test.ts` | test |
| 198 | `packages/sim-core/tests/narrativeWave4.integration.test.ts` | test |
| 909 | `packages/sim-core/tests/nicknames.test.ts` | test |
| 176 | `packages/sim-core/tests/offseason.test.ts` | test |
| 125 | `packages/sim-core/tests/offseasonRecap.test.ts` | test |
| 23 | `packages/sim-core/tests/onboardingDialogue.test.ts` | test |
| 176 | `packages/sim-core/tests/onboardingFarmAssessment.test.ts` | test |
| 164 | `packages/sim-core/tests/onboardingFinancialPlaybook.test.ts` | test |
| 195 | `packages/sim-core/tests/onboardingFlow.test.ts` | test |
| 131 | `packages/sim-core/tests/onboardingOwnerMeeting.test.ts` | test |
| 60 | `packages/sim-core/tests/onboardingPressConference.test.ts` | test |
| 207 | `packages/sim-core/tests/onboardingRosterAssessment.test.ts` | test |
| 148 | `packages/sim-core/tests/onboardingScoutingBriefing.test.ts` | test |
| 263 | `packages/sim-core/tests/onboardingSeasonStrategy.test.ts` | test |
| 89 | `packages/sim-core/tests/onboardingStaffEvaluation.test.ts` | test |
| 114 | `packages/sim-core/tests/onboardingStaffHiring.test.ts` | test |
| 912 | `packages/sim-core/tests/pbt.invariants.test.ts` | test |
| 148 | `packages/sim-core/tests/perennialContender.test.ts` | test |
| 370 | `packages/sim-core/tests/performance.test.ts` | test |
| 320 | `packages/sim-core/tests/playByPlay.test.ts` | test |
| 165 | `packages/sim-core/tests/playByPlayEnhanced.test.ts` | test |
| 42 | `packages/sim-core/tests/playerArcProse.test.ts` | test |
| 48 | `packages/sim-core/tests/playerMicroArcProse.test.ts` | test |
| 167 | `packages/sim-core/tests/playoffGauntlet.test.ts` | test |
| 372 | `packages/sim-core/tests/playoffMomentum.test.ts` | test |
| 262 | `packages/sim-core/tests/playoffs.test.ts` | test |
| 455 | `packages/sim-core/tests/playtestNarrativeDump.generate.ts` | test |
| 45 | `packages/sim-core/tests/positionGroupProse.test.ts` | test |
| 282 | `packages/sim-core/tests/pressConferences.test.ts` | test |
| 266 | `packages/sim-core/tests/prng.test.ts` | test |
| 216 | `packages/sim-core/tests/projections.test.ts` | test |
| 111 | `packages/sim-core/tests/prospectBonds.test.ts` | test |
| 425 | `packages/sim-core/tests/records.test.ts` | test |
| 70 | `packages/sim-core/tests/redemptionArc.test.ts` | test |
| 203 | `packages/sim-core/tests/relationshipEffects.test.ts` | test |
| 92 | `packages/sim-core/tests/revisedOnboardingFlow.test.ts` | test |
| 328 | `packages/sim-core/tests/revisedOnboardingOrchestrator.test.ts` | test |
| 344 | `packages/sim-core/tests/rivalries.test.ts` | test |
| 70 | `packages/sim-core/tests/rookieBreakout.test.ts` | test |
| 147 | `packages/sim-core/tests/rookieSensation.test.ts` | test |
| 427 | `packages/sim-core/tests/roster.test.ts` | test |
| 192 | `packages/sim-core/tests/rule5.test.ts` | test |
| 118 | `packages/sim-core/tests/scenarioObjectives.test.ts` | test |
| 212 | `packages/sim-core/tests/scenarios.test.ts` | test |
| 96 | `packages/sim-core/tests/schedule.test.ts` | test |
| 99 | `packages/sim-core/tests/scoutConflicts.test.ts` | test |
| 195 | `packages/sim-core/tests/scouting.test.ts` | test |
| 517 | `packages/sim-core/tests/scoutLearning.test.ts` | test |
| 1273 | `packages/sim-core/tests/seasonIdentityMoments.test.ts` | test |
| 96 | `packages/sim-core/tests/seasonSimulator.test.ts` | test |
| 130 | `packages/sim-core/tests/septemberCallupHero.test.ts` | test |
| 119 | `packages/sim-core/tests/septemberHeroics.test.ts` | test |
| 297 | `packages/sim-core/tests/sharing.test.ts` | test |
| 305 | `packages/sim-core/tests/similarity.test.ts` | test |
| 464 | `packages/sim-core/tests/smokeGate.integration.test.ts` | test |
| 107 | `packages/sim-core/tests/standings.test.ts` | test |
| 197 | `packages/sim-core/tests/stats.test.ts` | test |
| 313 | `packages/sim-core/tests/storyArcs.test.ts` | test |
| 58 | `packages/sim-core/tests/teams.test.ts` | test |
| 129 | `packages/sim-core/tests/threePeat.test.ts` | test |
| 174 | `packages/sim-core/tests/ticker.test.ts` | test |
| 414 | `packages/sim-core/tests/timeline.test.ts` | test |
| 367 | `packages/sim-core/tests/trade.test.ts` | test |
| 247 | `packages/sim-core/tests/tradeDeadlinePressConferences.test.ts` | test |
| 131 | `packages/sim-core/tests/tradeDeadlineSpark.test.ts` | test |
| 185 | `packages/sim-core/tests/tradeMoments.test.ts` | test |
| 654 | `packages/sim-core/tests/tradeNegotiation.test.ts` | test |
| 68 | `packages/sim-core/tests/tradeTheatre.test.ts` | test |
| 151 | `packages/sim-core/tests/veteranCoreRetires.test.ts` | test |
| 67 | `packages/sim-core/tests/weeklyMomentProse.test.ts` | test |

### packages/ui

Files: 2. Lines: 46.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 36 | `packages/ui/package.json` | config/json |
| 10 | `packages/ui/tsconfig.json` | config/json |

### packages/ui/src

Files: 2. Lines: 79.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 31 | `packages/ui/src/index.test.ts` | test |
| 48 | `packages/ui/src/index.ts` | barrel/index; re-export {cn}, re-export {Button, buttonVariants}, re-export {Badge, badgeVariants}, re-export {Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter}, re-export {Skeleton}, re-export {Tabs, TabsList, TabsTrigger, TabsContent}, re-export {GradeBar}, re-export {StatLine}, re-export {TrendArrow}, re-export {Container}, re-export {Stack}, cn, Button, buttonVariants, ... (+18) |

### packages/ui/src/data-display

Files: 3. Lines: 157.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 68 | `packages/ui/src/data-display/GradeBar.tsx` | GradeBar |
| 40 | `packages/ui/src/data-display/StatLine.tsx` | StatLine |
| 49 | `packages/ui/src/data-display/TrendArrow.tsx` | TrendArrow |

### packages/ui/src/layout

Files: 2. Lines: 102.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 22 | `packages/ui/src/layout/Container.tsx` | Container |
| 80 | `packages/ui/src/layout/Stack.tsx` | Stack |

### packages/ui/src/lib

Files: 1. Lines: 7.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 7 | `packages/ui/src/lib/utils.ts` | cn |

### packages/ui/src/navigation

Files: 1. Lines: 61.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 61 | `packages/ui/src/navigation/Tabs.tsx` | Tabs, TabsList, TabsTrigger, TabsContent |

### packages/ui/src/primitives

Files: 4. Lines: 247.

| Lines | File | Exports / notes |
| ---: | --- | --- |
| 49 | `packages/ui/src/primitives/Badge.tsx` | Badge, badgeVariants |
| 97 | `packages/ui/src/primitives/Button.tsx` | Button, buttonVariants |
| 76 | `packages/ui/src/primitives/Card.tsx` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| 25 | `packages/ui/src/primitives/Skeleton.tsx` | Skeleton |
