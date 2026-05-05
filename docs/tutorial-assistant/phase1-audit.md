# Tutorial Assistant V1 Phase 1 Audit

Date: 2026-05-05

## Current FTUE

- Save Hub (`/`) creates or resumes dynasties.
- New saves route to `/onboarding`.
- Onboarding uses `RevisedOnboardingPage`, deterministic assistant GM / Day One systems, and guided-start nudges.
- Quick Start saves are registered for localStorage nudges.
- The global tour can auto-start on `/dashboard` once the welcome briefing is dismissed.
- Dashboard has `GameAdvisor`, but it is dashboard-only and disappears when no recommendation is generated.

## Core Game Loop

1. Create or resume a save.
2. Complete Quick Start or Full Day One.
3. Review the dashboard and immediate advisor/season-flow cards.
4. Make roster, lineup, scouting, finance, trade, and development decisions.
5. Sim days/weeks/months through the season.
6. Respond to monthly pulse, press conferences, roster compliance, injuries, trades, and prospect movement.
7. Enter playoffs or offseason.
8. Run arbitration/extensions, free agency, draft, Rule 5, staff/scouting, and season prep.
9. Start the next season and let records, rivalries, achievements, story arcs, and career history accumulate.

## Highest-Friction "What Now?" Moments

| Moment | Why It Hurts | Assistant Intervention |
| --- | --- | --- |
| First dashboard after onboarding | Too many cards and sim controls compete for attention | Global "What should I do now?" opens with one next action, why it matters, and a route link |
| Roster compliance | Blocking issue, but baseball roster rules are dense | Explain the violation, which OVR/position/service-time columns matter, and what action to try first |
| Early scouting/draft prep | Users may ignore scouting until draft day | Route-aware hint: scout before you draft; OVR is current value, ceiling is upside, confidence is report quality |
| Trade center | Users may not know how to value packages | Explain OVR, age, contract, control, position scarcity, and GM personality |
| Free agency/offseason | Many tasks unlock at once | Checklist-style guidance: arbitration/extensions, FA, draft prep, roster holes, budget |
| Minors/development | Promotion timing is opaque | Explain OVR vs age/level/readiness and why rushing prospects can hurt |
| Finance | Payroll and tax pressure are not inherently fun | Explain how payroll affects owner patience, deadline flexibility, and offseason plans |
| Player profile | Deep tabs can overwhelm users | Explain which tabs answer current ability, future, stats, scouting, story, and history |
| Mobile navigation | Many routes are hidden under More | Assistant should link directly to the suggested route and avoid requiring nav discovery |

## Page-Level Guidance Plan

| Page | Decision Moment | Assistant Intervention |
| --- | --- | --- |
| Setup / Save Hub | Which mode/save/team to start | Explain Quick Start vs Full Day One and what makes a good first dynasty |
| Onboarding | Day One choices and AGM | Explain each chapter's stakes and reassure users that choices shape style, not hidden failure |
| Dashboard | Next best action | Summarize season state, point to one route, and explain what to check before simming |
| Roster | Promote/demote/lineup/depth | Explain OVR, grade, position, service, options, and compliance |
| Minors | Promotion/development | Explain readiness, ceiling/floor, age/level fit, and prospect story |
| Players | Search/comparison | Explain OVR vs stats vs fit and where to go for deeper profile |
| Player Compare | Choose between players | Explain side-by-side attributes, OVR, age, contract, and role fit |
| Player Profile | Understand one player | Explain header ratings and relevant tabs |
| Scouting | Assign attention | Explain report confidence, scout disagreement, and current vs potential value |
| Staff | Coach hires | Explain teaching, impact, fit, and development consequences |
| Draft | Pick prospects | Explain current OVR, ceiling, signability, confidence, and team need |
| Trade | Build packages | Explain value ingredients and why AI GMs respond differently |
| Standings | Playoff context | Explain GB, run differential, streaks, and when to buy/sell |
| Leaders | Star context | Explain leaderboards as scouting and awards context |
| Schedule | Advance/inspect games | Explain when to sim and when to inspect box scores |
| Box Score | Learn from result | Explain key lines and play-by-play lessons |
| Press Room | Read story/state | Explain what news changes decisions versus flavor |
| Playoffs | Postseason choices | Explain momentum, series state, and sim flow |
| Free Agency | Sign players | Explain OVR, age, asking price, market pressure, and payroll |
| Offseason | Sequence tasks | Explain required ordering and blocking tasks |
| Finance | Budget/payroll | Explain payroll room, tax, commitments, and owner pressure |
| GM Career | Long-term career | Explain score, jobs, and owner outcomes |
| History | Dynasty memory | Explain season archives and story so far |
| Achievements | Optional goals | Explain progress and why it can guide a save |
| Rivalries | Relationship context | Explain trade/playoff intensity and consequences |
| Front Office | Owner intel | Explain patience, chemistry, reputation, and risk |
| Pulse | Monthly decisions | Explain decision queue and urgency |
| Scenarios | Challenge mode | Explain constraints and first steps |
| Stats | Stat reference | Explain how to use stat definitions during decisions |
| Records | Legacy chase | Explain active record chases and story stakes |
| Settings | Controls/accessibility | Explain tour replay, density, audio, saves, diagnostics |

## Mobile Pain Points To Guard

- Assistant must not cover bottom sim controls or the mobile nav.
- Assistant expanded view should be a bottom drawer with bounded height.
- Controls need 44px touch targets.
- Text should remain scannable at 360px width.
- Dismiss/replay controls must be reachable without horizontal scroll.
- Reduced motion must turn animation into opacity/position-free transitions.

## Recommended Phase 3 Scope

- Add a global Assistant entry point in `AppLayout`.
- Data-drive guidance for every route in one typed table.
- Persist progress/cooldowns in localStorage keyed by active save id/slot.
- Preserve the existing tour, page help, guided-start nudges, and GameAdvisor in this slice; integrate rather than remove.
- Use the Assistant as the new unifying surface for "what should I do now?", route help, ratings explanation, replay, and story callbacks.
