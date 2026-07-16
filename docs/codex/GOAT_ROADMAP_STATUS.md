# MBD GOAT Roadmap Status

Last reconciled: 2026-07-15 after roadmap-item-15 verification and local landing; ECON-MARKET-REVENUE-1 is complete and item 16 has not started.

This ledger reconciles `MBD_REPO_AUDIT_AND_GOAT_ROADMAP_2026-07-10.md` against the live source, tests, goals, run artifacts, Git history, and canonical program documents. Source and tests outrank the audit. A historical feature is `PARTIAL`, not complete, when it lacks the roadmap item's bounded acceptance report, integrated slice commit, or required browser/calibration/performance proof.

Current invariants: GameSnapshot v34; Dexie v6; worker canonical; no bare simulation `Math.random()`; no fabricated old-save history; no hidden CPU advantage; no UI finalization before durable persistence. The three pre-existing user-owned dirty files remain outside campaign scope and must stay unstaged: `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`.

Allowed statuses are `VERIFIED COMPLETE`, `PARTIAL`, `IN PROGRESS`, `ACTIVE`, `PENDING`, `BLOCKED — ORACLE`, and `BLOCKED — EXTERNAL AUTHORIZATION`.

## Current campaign checkpoint

- Verified complete: items 1–15 and 80.
- Closed item: **11 — service-time arbitration drama**, now **VERIFIED COMPLETE** under Goal 21 / `ECON-ARBITRATION-1`; Goal 11's bounded contract clock remains complete.
- Closed item: **12 — qualifying offers and draft-pick compensation**, now **VERIFIED COMPLETE** under Goal 22 / `ECON-QUALIFYING-OFFERS-1`.
- Closed item: **13 — identity-driven CPU extensions**, now **VERIFIED COMPLETE** under Goal 23 / `ECON-EXTENSION-AI-1`.
- Closed item: **14 — owner payroll pressure/tax consequences**, now **VERIFIED COMPLETE** under Goal 24 / `ECON-OWNER-PAYROLL-PRESSURE-1`.
- Closed item: **15 — market-size revenue feeds budgets**, now **VERIFIED COMPLETE** under Goal 25 / `ECON-MARKET-REVENUE-1`; item 16 has not started.
- Item 8 remains locally landed at `2c07cc3eea4cfca1faef344e51b91818782b2da3`; Goal 11 is recorded below with its final commit after landing.
- Item 97 safe-delete work is integrated; the remaining Appendix-B restructure is `PARTIAL` and explicitly authorized by the campaign objective when roadmap order reaches it.
- Item 100 has useful release infrastructure but remains `PARTIAL`: local cadence/release-note tooling and rehearsal are unfinished. Push, tag, publish, deploy, and actual release remain outside current authority.

## Roadmap ledger

| Item | Tier | Outcome | Status | Goal/run | Evidence | Commit | Relay threads | Dependencies | Next action |
| ---: | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | Permanent CI reload-smoke mutation journey | VERIFIED COMPLETE | Goal 13 / `TRUST-PLAYWRIGHT-1` | `runs/TRUST-PLAYWRIGHT-1/COMPLETION.md`; production reload E2E | `0fdf9eb` | Historical route not recorded in completion artifact | None | Preserve gate |
| 2 | 1 | Truthful global last-saved/pending-writes indicator | VERIFIED COMPLETE | Goal 14 / `TRUST-SAVE-INDICATOR-1` | `runs/TRUST-SAVE-INDICATOR-1/COMPLETION.md` | `5629309` | Historical route not recorded in completion artifact | Item 1 | Preserve contract |
| 3 | 1 | Autosave failure surfacing, retry, export fallback | VERIFIED COMPLETE | Goal 15 / `TRUST-AUTOSAVE-RECOVERY-1` | `runs/TRUST-AUTOSAVE-RECOVERY-1/COMPLETION.md`; failure/reload proof | `0a6c64c` | Historical route not recorded in completion artifact | Items 1–2 | Preserve recovery semantics |
| 4 | 1 | Integrity checksum and guided repair | VERIFIED COMPLETE | Goal 16 / `TRUST-SAVE-INTEGRITY-1` | `runs/TRUST-SAVE-INTEGRITY-1/COMPLETION.md`; integrity DB/browser proof | `c006ab9` | Historical route not recorded in completion artifact | Items 1–3 | Preserve v34/Dexie-v5 envelope |
| 5 | 1 | Exclusive same-save-tree multi-tab guard | VERIFIED COMPLETE | Goal 17 / `TRUST-MULTITAB-GUARD-1` | `runs/TRUST-MULTITAB-GUARD-1/COMPLETION.md`; 137 focused; full gates; Playwright 1/1 + 2/2 | `203cb48` | Terra `019f51c9…` (`gpt-5.6-terra`, high, CORRECTIONS_READY); Sol `019f51c7…` (`gpt-5.6-sol`, xhigh, MERGE_READY); Luna `019f51e1…` (`gpt-5.6-luna`, medium, LANDED_ON_MAIN) | Items 1–4 | Preserve mixed-version warning |
| 6 | 1 | Every-supported-version export/import CI matrix | VERIFIED COMPLETE | Goal 18 / `TRUST-EXPORT-SCHEMA-MATRIX-1` | `runs/TRUST-EXPORT-SCHEMA-MATRIX-1/COMPLETION.md`; 33-version worker/JSON matrix; focused/full gates; zero-retry reload-smoke | See landed item-6 revision in repository history | Terra `019f51f7-5277-7570-add0-fd4a2acb1778` (`gpt-5.6-terra`, high→xhigh); Sol `019f51c7-4ff9-7b13-8b14-d0120e47225c` (`gpt-5.6-sol`, xhigh, MERGE_READY); Luna closeout (`gpt-5.6-luna`, medium) | Item 5 | Preserve v34/Dexie-v5 contract; item 7 is next |
| 7 | 1 | Storage-pressure size/quota/pruning UX | VERIFIED COMPLETE | Goal 19 / `TRUST-STORAGE-PRESSURE-1` | `runs/TRUST-STORAGE-PRESSURE-1/COMPLETION.md`; focused 49 suites / 372 tests; full gates; fresh 3,022-module / 167-entry PWA; zero-retry storage-pressure, multitab, and reload-smoke Chromium proof | Commit containing this report; verify from landing history | Terra `019f529d-211d-7590-b834-3014f5a3a102` (`gpt-5.6-terra`, high→xhigh, archived); manual relay-pattern fallback writer; replacement Sol `019f534c-8009-7ab1-8849-e9c59b7c49cc` (`gpt-5.6-sol`, xhigh, MERGE_READY, zero P0–P2); Luna `gpt-5.6-luna`, medium, LANDED_ON_MAIN | Item 6 | Preserve truthful storage metrics, exact-save retry, and narrow prune; do not begin item 8 in this closeout |
| 8 | 1 | Write-ahead sim-day intent journal | VERIFIED COMPLETE | Goal 20 / `TRUST-SIM-ADVANCE-JOURNAL-1` | `runs/TRUST-SIM-ADVANCE-JOURNAL-1/{SOURCE_TRUTH,PLAN,COMPLETION}.md`; Dexie-v6 WAL, exact whole-command rollback, no replay; focused 14 files/460 tests; root gates; Chromium reload 2/2 and four-spec 5/5 | Commit containing this report; final SHA recorded below after landing | Terra `019f537c-cd7a-7d71-92f5-50edf41ac54c` (`gpt-5.6-terra`, high) sole writer; Sol `019f552e-4389-7501-8f16-a1256dcd1824` (`gpt-5.6-sol`, xhigh) `MERGE_READY` 0/0/0; Luna `019f564f-3366-70e1-8e73-ba1ebdb1f2ae` (`gpt-5.6-luna`, medium) closeout; parent manual relay fallback for host browser commands | Items 5–7 | Item 9/10 next only after live Goal 11 confirms one coherent HIGH_RISK seam |
| 9 | 2 | Living contract clock | VERIFIED COMPLETE | Goal 11 / `runs/ECON-CLOCK-1` | Completion matrix; strict current-schema soak/replay; compact-v33 compatibility; ECON Playwright and reload-smoke; root gates; `MERGE_READY` 0/0/0 | `0df078234c96a465a00c15aaa4336619e1baa800` | Sol `019f552e-4389-7501-8f16-a1256dcd1824` xhigh architecture/final review; Terra `019f57d9-5a81-7c41-af54-3ffb3a39878d` high implementation; Luna `019f5963-de05-78c0-9aaa-fc5bc778d7b4` medium closeout | Tier 1 | Preserve clock/market/save-boundary invariants |
| 10 | 2 | Symmetric option-year resolution | VERIFIED COMPLETE | Goal 11 / `runs/ECON-CLOCK-1`; bundled at one clock seam | Team-option-only deterministic rule, named user/CPU symmetry, zero-RNG proof, Finance/Offseason/News truth, reload proof | Same Goal-11 landing commit | Same relay as item 9 | Item 9 | Preserve deterministic symmetry; player options remain cut |
| 11 | 2 | Service-time arbitration drama | VERIFIED COMPLETE | Goal 21 / `runs/ECON-ARBITRATION-1` | Completion matrix; persisted deterministic docket; exact-save lease/session proof; full gates; production arbitration 1/1 and reload-smoke 2/2 | Commit containing this report; final SHA in local Git history | Parent single writer; three read-only source/test/risk reviewers; parent final adversarial review | Items 9–10 | Preserve service-day authority, exact-save fencing, and durable-only presentation |
| 12 | 2 | Qualifying offers and pick compensation | VERIFIED COMPLETE | Goal 22 / `runs/ECON-QUALIFYING-OFFERS-1` | Completion matrix; atomic award/loss conservation; exact-save issue/resolve/sign/draft; full gates; production QO 1/1 and reload-smoke 2/2 | Commit containing this report; final SHA in local Git history | Manual relay-pattern fallback: parent sole writer/closeout; read-only source/test/risk maps; final `/root/qoffers_final_review` `MERGE_READY` with zero P0–P2 | Items 9–11 | Preserve fixed salary, aggregate validation, exact draft phase, and no-free-award law; item 13 is next |
| 13 | 2 | Identity-driven CPU extensions | VERIFIED COMPLETE | Goal 23 / `runs/ECON-EXTENSION-AI-1` | Completion matrix; persisted-GM bounded team policy with identity-neutral player RNG; candidate-scoped lanes; exact budget/aggregate/save proof; four-seed study; production extension 1/1 and reload-smoke 2/2, final 3/3 | Commit containing this report; final SHA in local Git history | Manual relay-pattern fallback: parent sole writer/closeout; read-only source/test/risk maps; `/root/extensions_final_review` final `MERGE_READY` 0/0/0 after `FIX_AND_REVIEW` 0/4/1 and 0/1/0 | Items 9, 49 (bounded consumption only) | Preserve player-side neutrality, candidate isolation, exact budget, and aggregate/save fencing; item 49 remains partial |
| 14 | 2 | Owner payroll pressure/tax consequences | VERIFIED COMPLETE | Goal 24 / `runs/ECON-OWNER-PAYROLL-PRESSURE-1` | Pure owner policy; canonical tax basis; exact annual receipts; old-save, 4×4 study, production/reload, and root-gate proof | Commit containing this report; exact SHA in local Git history | Manual relay-pattern fallback: parent sole writer/closeout; read-only source/test/risk maps; `/root/ownerpayroll_risk_review` final `MERGE_READY` 0/0/0 after two bounded correction loops | Items 9, 51 (bounded owner-state consumption only) | Preserve advisory semantics, tax basis, once-only receipts, and item-15 boundary |
| 15 | 2 | Market-size revenue feeds budgets | VERIFIED COMPLETE | Goal 25 / `runs/ECON-MARKET-REVENUE-1` | Pure statement; exact annual settlement/repair; 4x4 study; production/reload and root gates | Commit containing this report; exact SHA in local Git history | Manual relay-pattern fallback: parent sole writer/closeout; read-only risk/test maps; `/root/revenue_final_review` `MERGE_READY` after two bounded correction loops | Items 9, 14 | Preserve exact annual authority, modeled vocabulary, and no-recursive-budget law; item 16 remains unstarted |
| 16 | 2 | Explainable free-agent decisions | PARTIAL | No run | FA fit/reason surfaces exist; full requested model incomplete | Historical source | — | Items 9, 49 | Complete reasons and browser proof |
| 17 | 2 | Salary retention and cash in trades | PENDING | No goal/run | Trade assets have no retained-salary/cash type | — | — | Items 9, 54 | Design contract-safe trade assets |
| 18 | 2 | 30-season multi-seed economy soak | PARTIAL | No goal/run | Calibration records some economy measures; current sample is far below 30 seasons | — | — | Items 9–17 | Add enforced long-horizon bands |
| 19 | 3 | Legal Day-1 26/40 rosters | PENDING | Goal 12 `DAY-ONE-ROSTERS-1`; no run | Live generator still produces 28 MLB and invalid derived 40-man shape | — | — | Item 9 | Execute goal 12 after ECON-CLOCK-1 |
| 20 | 3 | Affiliate position balance | PENDING | Goal 12; no run | Current generation retains low-pitcher affiliate shape | — | — | Item 19 | Implement with legal generation slice |
| 21 | 3 | Legal minors contracts | PENDING | Goal 12; no run | Non-MLB generation still assigns zero-year deals | — | — | Items 9, 19 | Coordinate initial values with clock semantics |
| 22 | 3 | Permanent zero-violation generation gate | PENDING | Goal 12; no run | Audit test remains environment-gated | — | — | Items 19–21 | Promote to ordinary multi-seed CI |
| 23 | 3 | Seeded hidden gems per organization | PARTIAL | Goal 12; no run | Ceiling/trajectory content exists; no tested per-org floor | Historical source | — | Items 19–22 | Add deterministic gem bands without truth leak |
| 24 | 3 | Generation depth-chart optimizer | PENDING | Goal 12; no run | No generation-time optimizer found | — | — | Items 19–23 | Add pure composition pass |
| 25 | 3 | Rule-5 exposure sanity at generation | PARTIAL | Goal 12; no run | Rule-5 engine/tests exist; invalid initial protection remains | Historical source | — | Items 19–24 | Test curated initial protection |
| 26 | 3 | League-wide Day-1 talent map | PARTIAL | No goal/run | Team-local onboarding/farm assessment exists; no league-wide map | Historical source | — | Items 19–25 | Extend authored new-world summary |
| 27 | 4 | Persisted mentorship assignments or honest relabel | PARTIAL | No run | Mentor relationships and bounded effects persist; player assignment UI/contract unclear | Historical source | — | Trust + identity | Reconcile auto-derived versus player-owned lever |
| 28 | 4 | Playing-time promises | PENDING | No goal/run | No persisted role-target/development consumer found | — | — | Item 27 | Design costed usage targets |
| 29 | 4 | Profile-level development-plan editing | PARTIAL | No run | Minors board mutates plans; profile displays only | Historical source | — | Item 27 | Reuse action on profile with reload proof |
| 30 | 4 | Save-backed development event stream | PARTIAL | No run | Development ledger/reports/setbacks persist; unified requested stream incomplete | Historical source | — | MEMORY-0 | Consolidate factual event ownership |
| 31 | 4 | Injury severity/rehab/re-injury/career arcs | PARTIAL | No run | Severity and re-injury source/tests exist; rehab/career arcs incomplete | Historical source | — | Development foundation | Add rehab and long-term consequences |
| 32 | 4 | Coaching quality modifies development | PARTIAL | No run | Staff modifier is consumed by development pipeline with tests | Historical source | — | Item 49 identity | Add dedicated calibration/completion proof |
| 33 | 4 | Pitcher workload management | PARTIAL | No run | Fatigue warnings exist; no innings-limit/shutdown decision model | Historical source | — | Items 31–32 | Add explicit costed controls |
| 34 | 4 | Old-save authored-minors upgrade | PENDING | Goal 10 `OLDSAVE-MINORS-1`; no run | Goal only; new-game generation does not enrich old saves | — | — | Goal 12 + MEMORY-0 | Execute after Day-One rosters |
| 35 | 4 | Level-specific minor run environments | PENDING | No goal/run | No level run-environment factor found | — | — | Item 19 | Add calibrated level factors |
| 36 | 4 | Explainable prospect readiness | PARTIAL | No run | Promotion reasons exist but remain generic | Historical source | — | Items 29–35 | Add stat-specific visible reasoning |
| 37 | 4 | Winter ball/offseason programs | PENDING | No goal/run | No implementation found | — | — | Development foundation | Create bounded offseason choice slice |
| 38 | 4 | Farm rankings with movement/press | PARTIAL | No run | Day-1 rank and Farm Report exist; no year-over-year history | Historical source | — | Items 30, 35 | Add factual series and press beats |
| 39 | 5 | Scouting fog and convergence | PARTIAL | No run | Quality error bars/repeated-look convergence tests exist | Historical source | — | Trust | Add distance factor and browser completion proof |
| 40 | 5 | Scout personalities alter boards | PARTIAL | No run | Tool/stat/makeup biases and tests exist; full-board divergence unproven | Historical source | — | Item 39 | Prove bounded board differences |
| 41 | 5 | Regional coverage budgeting | PENDING | No goal/run | No allocation/budget model found | — | — | Items 39–40 | Design costed coverage loop |
| 42 | 5 | Draft AI organization identity | PARTIAL | Goal 04 `ORG-DRAFT-1`; no run | Per-team draft strategy source/tests exist; no goal completion/fairness report | Historical source | — | Trust | Execute/reconcile goal 04 |
| 43 | 5 | Draft-day pick trades | PARTIAL | No run | Pick ownership mutation/tests exist; no complete player-facing lane | Historical source | — | Item 42 | Add draft-day UI/AI valuation proof |
| 44 | 5 | Signability and bonus-pool chess | PARTIAL | No run | Bonus asks, under-slot rejection, commitments, signing UI exist | Historical source | — | Items 42–43 | Close pool/over-slot/compensation loop |
| 45 | 5 | Year-varying draft-class quality | PARTIAL | No run | Deterministic prospect variance exists; explicit annual quality bands/press absent | Historical source | — | Item 42 | Add quality state and narrative proof |
| 46 | 5 | Playable international free agency | PARTIAL | No run | IFA engine, worker tests, and board UI exist | Historical source | — | Scouting + economy | Add bounded completion/reload/calibration |
| 47 | 5 | Mock drafts and uncertain rumor mill | PENDING | No goal/run | No draft mock/rumor engine found | — | — | Items 39–46 | Create scouting-dependent slice |
| 48 | 5 | +3/+5 retroactive draft grades | PENDING | No goal/run | Immediate grades exist; no delayed evaluation/memory stories | — | — | MEMORY-0 + item 42 | Add factual delayed grading |
| 49 | 6 | Durable cross-domain CPU org identity | PARTIAL | Goals 06/07/08 and Goal 23 domain consumption; no item-49 run | Persisted current-GM personality now shapes extensions, but franchise identity remains neither permanent nor unified across decisions | Historical source plus `runs/ECON-EXTENSION-AI-1` | Manual item-13 source/test/risk review confirmed the bounded distinction | ORG-DRAFT-1 | Execute remaining domain goals sequentially; do not treat item 13 as item-49 completion |
| 50 | 6 | Named CPU GMs with careers | PARTIAL | No run | CPU personalities/firing events exist; no durable named tenure/reputation entity | Historical source | — | Item 49 | Add factual GM career ledger |
| 51 | 6 | CPU owner archetypes | PARTIAL | No run | Team archetypes, patience, budgets, and tests exist | Historical source | — | Item 49 | Prove CPU behavior and calibration |
| 52 | 6 | Visible rebuild/contend state machine | PARTIAL | No run | Buyer/seller/season strategies are derived, not durable public multi-year state | Historical source | — | Items 49–51 | Add persistent visible state |
| 53 | 6 | Deadline posture and bounded bluffs | PARTIAL | No run | Buyer/seller posture and press source/tests exist | Historical source | — | Item 52 | Calibrate posture/behavior agreement and bluffs |
| 54 | 6 | CPU-CPU trade fairness soak | PARTIAL | Goal 07 `ORG-TRADE-1`; no run | Valuation/fairness tests exist; no multi-seed league-drift soak | Historical source | — | Items 9, 42, 49 | Execute goal 07 after economy clock |
| 55 | 6 | Difficulty by decision quality only | PENDING | No goal/run | Live budget/bid difficulty modifiers violate locked direction | — | — | Economy + identity | Remove hidden resource modifiers; prove decisions-only |
| 56 | 6 | Front Office DNA page per franchise | PARTIAL | No run | User-club owner-intel page exists; no all-rivals DNA view | Historical source | — | Items 49–55 | Extend existing front-office surface |
| 57 | 6 | Rivalry-aware bounded premium | PARTIAL | Goal 07; no run | Rivalry trade penalty exists and is tested | Historical source | — | Items 54–56 | Surface explanation and fairness soak |
| 58 | 6 | Era strategy meta-shifts | PENDING | No goal/run | No population trend engine found | — | — | Items 49–57 | Build after durable identities |
| 59 | 7 | Derived franchise/league era engine | PENDING | Goal 09 `MEMORY-ERAS-1`; no run | Isolated era moments exist; no derived era read model | — | — | MEMORY-0 | Execute goal 09 |
| 60 | 7 | Prospect-to-legend continuity | PENDING | Goal 03 `PROSPECT-1`; no run | Draft/career/HOF pieces exist without automatic continuity proof | — | — | MEMORY-0 + TRUST-A | Execute goal 03 |
| 61 | 7 | Hall of Fame | PARTIAL | No run | HOF engine, rollover integration, and UI/tests exist | Historical source | — | Memory spine | Add ballots/debates/ceremony completion proof |
| 62 | 7 | Retired numbers/Mount Rushmore/statues | PENDING | No goal/run | No durable artifact/state/UI found | — | — | Items 59–61 | Create memory artifact slice |
| 63 | 7 | Live record-chase countdown beats | PARTIAL | No run | Chase Watch/record events exist; exact −10/−3/−1 cadence absent | Historical source | — | MEMORY-0 | Add deterministic press cadence |
| 64 | 7 | Honest old-save era enrichment | PENDING | Goal 09; no run | No implementation; fabrication guard remains binding | — | — | MEMORY-0 + item 59 | Add sparse factual summaries only |
| 65 | 7 | Career retrospective for every retiree | PARTIAL | No run | Retrospective worker/UI/tests exist; every-retiree coverage unproven | Historical source | — | Memory spine | Prove coverage and reload |
| 66 | 7 | Franchise head-to-head history | PARTIAL | No run | Rivalry history/wins/playoff streaks and UI exist | Historical source | — | Items 59, 69 | Add meetings/iconic archived games |
| 67 | 7 | This day in dynasty history | PARTIAL | No run | This Week in History widget/query exists | Historical source | — | MEMORY-0 | Add exact-day derivation/browser proof |
| 68 | 7 | Dynasty chronicle HTML/PDF export | PENDING | No goal/run | No exporter found | — | — | Items 59–67 | Create privacy/layout-safe export slice |
| 69 | 8 | Box-score-to-story polish | PARTIAL | No run | Recap cards/panels and archive/live worker tests exist | Historical source | — | Memory + archives | Define narrative quality acceptance |
| 70 | 8 | Ballpark identity affecting sim/story | PARTIAL | No run | Park factors exist for stats; game simulation does not consume them; venues/quirks absent | Historical source | — | Sim calibration | Wire park inputs and add identity |
| 71 | 8 | Scalable 32-club/192-affiliate identity system | PARTIAL | No run | 32 SVGs, TeamLogo, procedural affiliate marks, authored 192 identities | Historical source | — | Authored world | Add dedicated visual/browser matrix |
| 72 | 8 | Award reveal ceremonies | PARTIAL | No run | Ceremony modal/queue/tests exist | Historical source | — | Memory/presentation | Add dedicated reload/browser completion |
| 73 | 8 | Playoff series presentation | PARTIAL | No run | Series/momentum/preview surfaces and tests exist | Historical source | — | Archives | Add clinch/elimination browser journey |
| 74 | 8 | Optional terminal audio cues | PARTIAL | No run | Muted-by-default audio engine/preferences/cues/tests exist | Historical source | — | Accessibility | Add autoplay/a11y/browser proof |
| 75 | 8 | Weightier Day-One onboarding | PARTIAL | No run | Revised onboarding/Day-One system and balance tests exist | Historical source | — | Item 19 | Reconcile against June materiality finding |
| 76 | 8 | Density modes and column customization | PARTIAL | No run | Density setting/tokens exist; column visibility customization absent | Historical source | — | UI foundation | Add persisted column controls |
| 77 | 8 | Bloomberg keyboard command palette | PARTIAL | No run | CommandPalette and Cmd/Ctrl+K tests exist | Historical source | — | Accessibility | Add dedicated keyboard/focus/browser report |
| 78 | 8 | Mobile one-thumb sim loop | PARTIAL | No run | Mobile nav/bottom controls/touch tests/375px checks exist | Historical source | — | UI foundation | Run full 375px route/table acceptance |
| 79 | 8 | Accessibility pass | PARTIAL | No run | ARIA/focus/reduced-motion/contrast primitives and tests exist | Historical source | — | UI items | Run holistic automated/manual audit |
| 80 | 8 | Finish tutorial assistant | VERIFIED COMPLETE | `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md`; `docs/tutorial-assistant/completion-audit.md` | Dismissible/replayable assistant; 390×844 browser/release proof | `3f28275` | Historical route not recorded in current completion inventory | None | Preserve; optional playtest is nonblocking |
| 81 | 9 | Close Markov/walk-off/extras physics flags | PARTIAL | No run | Basic Markov/walk-off tests exist; targeted closure is incomplete | Historical source | — | Determinism | Add exhaustive regression slice |
| 82 | 9 | Defensible true-Log5 review | PARTIAL | No run | `log5.ts` is explicitly Log5-inspired; invariant tests lack odds-ratio calibration | Historical source | — | Item 81 | Document or upgrade, then recalibrate |
| 83 | 9 | Batted-ball profiles × defense × park | PARTIAL | No run | GB/FB/LD buckets exist; interaction model absent | Historical source | — | Items 70, 82 | Add seeded layer and calibration |
| 84 | 9 | Defense value converts/allows hits | PENDING | No goal/run | Ratings/display exist; game outcomes do not use range/arm/positioning | — | — | Item 83 | Create defense simulation slice |
| 85 | 9 | Attribute/coaching baserunning decisions | PENDING | No goal/run | Fixed Markov advance; no steals/aggression engine | — | — | Items 81–84 | Create seeded baserunning slice |
| 86 | 9 | Leverage/fatigue bullpen AI | PARTIAL | No run | Fixed pitcher replacement exists; no leverage/role policy | Historical source | — | Items 81–85 | Add deterministic bullpen policy |
| 87 | 9 | Platoon/handedness strategy | PENDING | No goal/run | Modifier exists but simulation/lineup/pen does not supply strategy | — | — | Items 82–86 | Add handedness contracts and tests |
| 88 | 9 | Seeded weather/park variance | PENDING | No goal/run | No weather simulation/state/tests found | — | — | Items 70, 83 | Create deterministic environment slice |
| 89 | 9 | 30-year aging realism audit | PARTIAL | No run | Aging curves/tests exist; no long-horizon population study | Historical source | — | Economy/world changes | Add multi-seed study and bands |
| 90 | 9 | Per-release statistical sanity audit | PARTIAL | No run | Calibration covers runs/BA/ERA/HR/WAR; BABIP/K%/HR-FB gate absent | Historical source | — | Items 81–89 | Extend and enforce release calibration |
| 91 | 10 | Split mega-workers | PARTIAL | No run | Many worker modules exist; four named files remain ~100–180KB | Historical source | — | Stable behavior | Extract domains in bounded slices |
| 92 | 10 | Remove cycles and harden gate | PENDING | No run | Fresh cycle command reports 19; script is fail-open | — | — | Item 91 | Remove cycles; make CI fail-closed |
| 93 | 10 | Burn unused exports; hard knip gate | PENDING | No run | Fresh structure check reports 227 unused exports + dependency; fail-open | — | — | Items 91–92 | Remove findings; harden gate |
| 94 | 10 | Enforce web/contracts DTO boundary | PENDING | No run | Fresh scan finds 114 web files / 129 direct sim-core imports | — | — | Item 91 | Add DTO seam and decrementing gate |
| 95 | 10 | Rotate STATUS log | PENDING | No goal/run | Root `STATUS.md` remains ~805KB; no archive/index | — | — | None | Execute bounded docs slice in order |
| 96 | 10 | Canon/archive documentation pass | PENDING | No goal/run | `MASTER_CONTEXT.md` still claims v17; banners absent | — | — | Item 95 | Canon/archive pass |
| 97 | 10 | Complete repo slim/restructure | PARTIAL | Audit Appendix A/B | Safe-delete integrated; June audits/content still unmoved | `c4e154b`, `d0aff48` | Historical cleanup route not recorded | Items 95–96 | Execute authorized Appendix-B `git mv` restructure |
| 98 | 10 | Long-save performance budgets | PARTIAL | No run | Diagnostics/size/performance tests exist; no enforced 30-season latency/memory/save bands | Historical source | — | Integrated gameplay | Add benchmark and CI budgets |
| 99 | 10 | Privacy-safe opt-in diagnostic bundle | PARTIAL | No run | Runtime/save diagnostics exist; no redacted support bundle | Historical source | — | Item 98 | Define consent/redaction/bundle tests |
| 100 | 10 | v1.x release train | PARTIAL | No run | Checklist, PWA ADR, changelog, and Pages workflow exist; cadence/notes automation absent | Historical source | — | Items 1–99 | Complete local tooling/rehearsal; actual tag/push/publish/deploy awaits explicit authorization |

## Item 5 landing receipt

- Branch before landing: `codex/multitab-guard-5`; integrated local branch: `main`.
- Commit and final local-main revision: `203cb48d61319b3d18fc10531710eddce95e3c71` (`Add exclusive multi-tab save guard`), 56 files.
- Focused: 16 files / 137 tests. Typecheck: 9/9 Turbo tasks. Full test: five packages, including sim-core 140 files / 1,646 tests and web 451 files / 1,823 tests.
- Build/PWA: 3,020 modules / 166 precache entries. Determinism: 3/3. Dedicated multitab Playwright: 1/1 in 11.0 seconds, no retry. Full reload-smoke: 2/2 in 5.0 minutes, no retry.
- Negative control disabled the transition pause guard, failed the intended worker test, was restored, and passed 2/2.
- Sol review closed occupied-retry proof, blocked-Space proof, and truthful `ownership_lost` mapping; final verdict `MERGE_READY`, no remaining P0–P2.
- Independent post-landing verification: `HEAD`, `main`, and `codex/multitab-guard-5` all equal the commit; index empty; only the three protected files remain dirty and unstaged.

## Item 6 landing receipt

- Goal 18 is verified complete on the local checkout after final focused/full gates, explicit item-only staging, intentional commit, and fast-forward of local `main`. The exact commit is intentionally reported by the closeout command/history rather than embedded self-referentially in this pre-commit ledger update.
- Final route: Terra `019f51f7-5277-7570-add0-fd4a2acb1778` high→xhigh implementation/corrections; Sol `019f51c7-4ff9-7b13-8b14-d0120e47225c` xhigh definitive `MERGE_READY`, zero P0–P2; Luna `gpt-5.6-luna` medium closeout writer. No item 7 work began.
- Final gates: focused 27/27, 151/151, 24/24; root typecheck, full test, production build/PWA, determinism, and fresh zero-retry Chromium reload-smoke 2/2 all passed. Protected files remained unchanged, dirty, and unstaged.

## Item 8 landing receipt and permanent workflow reset

- Item 8 is `VERIFIED COMPLETE` on the commit containing
  `runs/TRUST-SIM-ADVANCE-JOURNAL-1/COMPLETION.md`; the final commit SHA is
  intentionally filled from repository history after the landing commit, never
  invented self-referentially here.
- Dexie is v6 for the operational journal and GameSnapshot remains v34. Item 9
  and item 10 are next, but item 9 remains untouched until a new high-risk
  Goal 11 reconciliation proves one owner, persistence boundary, migration
  policy, proof harness, and rollback plan.
- Permanent campaign classes are `VERIFY_ONLY`, `FINISH_PARTIAL`,
  `NEW_FEATURE`, and `HIGH_RISK`. Existing meaningful implementation defaults
  to `FINISH_PARTIAL`; HIGH_RISK is reserved for schema/persistence,
  worker-authority, deterministic RNG, contract/offseason rollover,
  world-generation, and historical enrichment seams.
- Hard limits: one pre-implementation Sol gate, one final Sol gate, at most two
  correction loops, one independent auditor by default, and two context
  compactions before split-or-land review. A third correction loop requires a
  new bounded goal or explicit P0/P1 justification. Every future run's
  `CURRENT.md` contains only Phase, Writer, Changed paths, Last green command,
  Current blocker, and Next action. Every slice reports `LIGHT`, `NORMAL`,
  `HEAVY`, or `EXCEPTIONAL`; a NORMAL slice that becomes HEAVY is split.
- Pre-coding evidence budgets must name focused domain tests, compatibility and
  old-save proof, deterministic/soak proof, UI/browser proof, final root gates,
  and a maximum of two correction loops. Item 8 is recorded as `EXCEPTIONAL`.
- Impact-first overlay:

| Item | Impact rank | Dependency ready | Work class | Size | Shared seam/bundle | Required proof | Active writer | Next eligible action |
|---:|---:|---|---|---|---|---|---|---|
| 8 | 1 | Verified | EXCEPTIONAL | XL | worker authority + Dexie v6 + boot/save tree | focused, negative control, root gates, production Chromium two-page/reload/mobile | Closed; Luna landed | Verify local-main commit; no reopen |
| 9 | 2 | Verified | HIGH_RISK | L | living contract clock/offseason owner | completion matrix, separate compact-v33/current-league soak, deterministic rollover, UI/browser, root gates, rollback | Closed; Luna landing owner | Preserve clock/market/save-boundary invariants |
| 10 | 3 | Verified | HIGH_RISK | L | deterministic team-option resolution | same as item 9; named symmetry and zero-RNG; no adjacent arbitration/revenue expansion | Closed; Luna landing owner | Preserve deterministic symmetry; player options remain cut |
| 19 | 4 | After economy dependency | VERIFY_ONLY or FINISH_PARTIAL | M | existing onboarding/day-one calibration | focused calibration and bounded browser proof | Unassigned | Reconcile live goal/source |
| 20 | 5 | After memory dependency | FINISH_PARTIAL | M | narrative/history factual event ownership | deterministic history, old-save honesty, reload/export proof | Unassigned | Reconcile live goal/source |
| 21 | 6 | After item 20 seam | FINISH_PARTIAL | M | derived franchise/league era read model | factual derivation, old-save, deterministic multi-season and browser proof | Unassigned | Reconcile live goal/source |
| 22 | 7 | After item 21 seam | FINISH_PARTIAL | M | memory continuity and player-to-legend history | provenance, no fabricated history, export/reload proof | Unassigned | Reconcile live goal/source |

- Release state remains `READY — AWAITING EXPLICIT RELEASE AUTHORIZATION`; no
  push, deploy, tag, publish, or release is implied by local landing.

## First incomplete item source contract

Item 16 remains `PARTIAL`. Live source has free-agent fit/reason fragments but
no reconciled item-16 goal/run proving a complete, deterministic, symmetric,
player-facing decision explanation across real signings and reload. The next
legal slice must create its own bounded goal and run, reconcile that live source,
and preserve items 9-15 contract, budget, owner-policy, and exact-save
invariants. No item-16 source work began in this run.

## Item 9/10 landing receipt

- Goal 11 / `ECON-CLOCK-1` completed with no schema/RNG change and no Goal-12
  work. Final evidence is in `docs/codex/runs/ECON-CLOCK-1/COMPLETION.md`.
- Local landing commit: `0df078234c96a465a00c15aaa4336619e1baa800`
  (`Complete deterministic contract clock and options`); `main` and the source
  branch point to the same revision with an empty index.
- Final gates: typecheck 9/9; root tests 8/8 tasks; build/PWA 5/5; determinism
  3/3; strict soak/replay 2/2 each with digest
  `5477faee99676a965a51a9ea394a179097f8c41c1ad96c06f83d3fb43ffe0814`; compact
  v33 compatibility 1/1; ECON Playwright 1/1; reload-smoke desktop/mobile 2/2;
  all browser runs zero-retry; Sol `MERGE_READY` 0/0/0.
- Relay: Sol `019f552e-4389-7501-8f16-a1256dcd1824` xhigh; Terra
  `019f57d9-5a81-7c41-af54-3ffb3a39878d` high; Luna current medium closeout.
- Release state remains `READY — AWAITING EXPLICIT RELEASE AUTHORIZATION`; no
  push, deploy, tag, publish, or release is implied by local landing.

## Item 14 landing receipt

- Goal 24 / `ECON-OWNER-PAYROLL-PRESSURE-1` is verified complete in the
  item-only commit containing this report. The exact revision is verified from
  local Git history after commit and reported in the closeout response.
- Final gates: focused owner surface 19/91; loop-2 sim-core 30/30 and web 20
  passed plus one intentional skip; hard 4×4 study 1/1 in 516.06 seconds; root
  typecheck 9/9; full contracts 24, UI 1, sim-core 1,681, web 2,407 with four
  intentional skips; determinism 3/3; 3,030-module / 167-entry PWA; production
  owner journey 1/1; reload-smoke 2/2; all browser runs one worker, zero retry,
  and no flaky result.
- Manual relay-pattern fallback: parent sole writer and closeout; read-only
  source/test/risk maps; final `/root/ownerpayroll_risk_review` verdict
  `MERGE_READY`, P0/P1/P2 `0/0/0`, after two bounded correction loops.
- GameSnapshot remains v34 and Dexie v6. No push, deploy, tag, publication,
  release, item-15 work, or unrelated-file staging occurred.

## Item 15 landing receipt

- Goal 25 / `ECON-MARKET-REVENUE-1` is verified complete in the item-only
  commit containing this report. The exact revision is verified from local Git
  history after commit and reported in the closeout response.
- Formula and authority: explicit 8/14/10 market tiers, bounded completed-record
  effect, fixed 3.5% berth bump, owner-archetype allocation, and one atomic
  exact Season Review Advance/Skip settlement for all 32 clubs. GameSnapshot
  remains v34 and Dexie remains v6.
- Final gates: focused sim-core 95, focused web 27, broad worker/persistence/
  boot 376, authentic rollover 2/2, hard 4x4 study 1/1 in 494.99 seconds with
  512 statements/receipts, root typecheck 9/9, full sim-core 1,689 and web
  2,422 with five intentional skips, determinism 3/3, 3,032-module / 167-entry
  PWA, production item journey 1/1, and reload-smoke 2/2. Browser gates used
  one worker, zero retries, and no flaky result.
- Manual relay-pattern fallback: parent sole writer and closeout; read-only
  `/root/revenue_risk_map` and `/root/revenue_test_map`; final
  `/root/revenue_final_review` verdict `MERGE_READY`, zero P0-P2, after two
  bounded correction loops.
- No push, deploy, tag, publication, release, item-16 work, or unrelated-file
  staging occurred.
