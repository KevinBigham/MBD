# ECON-QUALIFYING-OFFERS-1 — Source Truth

## Preflight

- Worktree: `/Users/kevin/Downloads/MBD-qualifying-offers-12`
- Branch: `codex/qualifying-offers-12`
- Base/HEAD/local `main`: `f8cff466ecb0750e7b1912415177a97aa3a293ce`
- `origin/main`: `fd217dc57262cd104f4fc140cb6e6c571cfa9290`; remote push is not authorized.
- Package manager: `pnpm@9.15.4` is declared at the root. Package-local
  binaries are used because the desktop wrapper attempted pnpm 11 and wrote an
  invalid `allowBuilds` prompt before compilation; the transient edit was not
  retained.
- GameSnapshot: v34. Dexie operational schema: v6.
- Initial slice worktree: clean. The main checkout's user-owned changes to
  `.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and
  `docs/codex/PROGRAM.md` are protected and outside this worktree/commit.
- Item-12 completion report at preflight: absent.

## Baseline receipts

- sim-core finance/free-agency/draft/offseason: 4 files / 76 tests passed.
- web worker/QO hooks, route, controller, and panel: 6 files / 186 tests passed.
- A broader read-only test inventory reported 325 focused checks green across
  pure QO/draft, worker, UI, compatibility, persistence, soak, and determinism.
  That inventory also confirmed the root wrapper typecheck did not compile
  because of the pnpm-11 `allowBuilds` prompt; it is not a TypeScript receipt.
- These tests prove historical fragments are green. They do not prove the
  end-to-end QO → outside signing → compensation → draft → reload loop.

## Existing implementation

- Sim-core calculates the QO amount from the top 125 assigned MLB salaries,
  derives eligibility, issues records, and resolves acceptance through `GameRNG`.
- v34 already persists qualifying-offer records, compensatory picks, pick
  ownership/forfeiture, the draft session, news, and serialized offseason state.
- The worker auto-issues CPU offers on QO-phase entry, resolves outstanding
  offers on free-agency entry, releases rejected players into the canonical
  market, and calls compensation after user and CPU outside signings.
- Pure draft code already protects top-ten first-round picks, forfeits the next
  eligible pick, inserts supplemental slots after round one, and carries basic
  compensation context to the draft board.
- The existing Offseason route has a bounded QO panel. The Free Agency and
  Draft routes already own the later player-facing steps.

## Confirmed defects

1. Eligibility can prefer the legacy service-years map over exact service days.
2. The league QO amount is recalculated and can change between issues in one
   phase as contracts change.
3. The public issue action can issue a QO for a CPU-owned player.
4. Duplicate issue returns success, empty resolve still autosaves, and other
   rejected actions can report state changed.
5. Resolution walks persisted issuance order, so click/array order can remap
   seeded draws between players.
6. Compensation awards the former club even when no signing-club pick was
   forfeited. The loss is not linked to the QO receipt.
7. User/CPU signing commits span player, market, roster, news, and draft facts
   without one preflighted atomic compensation plan. Duplicate and inconsistent
   imported state are not defended.
8. Draft start checks only broad offseason state and forks RNG before the
   helper validates. The route exposes the draft in every offseason subphase.
   A prestarted session can freeze slots before later compensation exists.
9. QO issue/resolve and user FA/draft actions mutate through the ordinary worker
   lane, then autosave separately. The exact mutation-to-snapshot boundary is
   therefore unowned.
10. The QO panel omits issued/results, the FA surface omits pick cost, and
    consequence copy does not name the signing-team loss.
11. Existing tests prove pure fragments but never sign a rejected-QO player,
    reconcile award/loss, consume the actual worker supplemental slot, or hard
    reload the full causal loop.

## Frozen architecture decisions

- Preserve the current MBD per-season QO policy. This slice does not silently
  adopt six-year/one-career MLB rules.
- Freeze one QO salary in typed normalized offseason phase data. Missing old
  data is initialized once from current facts without fabricating old offers.
- Use `serviceTimeDays` only for eligibility and stable team/player ordering for
  issuance/resolution. Storage permutation cannot change per-player outcomes.
- Split public user-authorized issuance from internal team-scoped CPU issuance.
- Plan outside-signing compensation before any mutation. Exactly one award and
  one eligible loss commit together; no eligible loss rejects unchanged.
- Add a normalized factual forfeited-pick descriptor to existing serialized
  offseason phase data and deterministic factual news/archive copy. Keep v34;
  do not add a permanent structured career-QO schema.
- Require exact draft phase before any draft RNG/state work. Empty stale
  sessions may rebuild from canonical facts; conflicting sessions with completed
  picks fail closed rather than rewrite history.
- Extend the existing exact-save coordinator and worker session for QO, signing,
  and draft actions, including argument-bearing operations and no-change
  outcomes. Do not create a second persistence engine.

## Review synthesis

Three read-only lanes mapped live source, tests/browser proof, and adversarial
risk. They returned a pre-freeze `NO-GO` because draft phase authority,
argument-bearing exact-save actions, and the no-eligible-pick rule were not yet
explicit. Goal 22 now resolves each: draft is exact-phase gated before RNG,
manual causal actions extend the existing exact coordinator, and cross-team
compensation is a strict award/loss conservation rule with fail-unchanged when
no eligible pick exists.

## Boundaries

Roadmap item 13 and all later economy work remain untouched. No schema bump,
new route, dependency, real-MLB rules rewrite, extension/budget/revenue/trade
expansion, Day-One roster repair, or roadmap-item-18 30-season soak is authorized.

## Final source discoveries

1. The QO lifecycle is a relational aggregate, not independent arrays. A
   compensated record is accepted only when the canonical player assignment,
   one exact free-agent signing receipt, signed-market contract facts, frozen
   salary, one award, one forfeiture, and one terminal phase result agree.
2. CPU same-day bid admission needs a pure pick-reservation plan. Mutating a
   partial signing aggregate during bidder filtering could let an ineligible
   no-pick bidder suppress an eligible runner-up or leave invented lifecycle
   facts; the final path reserves entitlement only and commits facts once.
3. A worker result can be operationally successful but persistence-irrelevant.
   `flowStateChanged: false` now discards the exact flow, aborts the lease, and
   prevents snapshot capture, durable publication, autosave, or UI application.
4. Completed draft validation must bind the slot prefix to the selected player,
   signing decision/acquisition facts, and exact draft phase receipt. Slot shape
   alone cannot prevent delayed resurrection or mismatched imported history.
5. Exact draft-phase authority invalidated the old reload-smoke shortcut that
   entered the draft from season review. The production smoke now traverses the
   canonical public offseason phases and proves the strengthened gate instead
   of bypassing it.

## Final evidence

- Final review: `MERGE_READY`, zero actionable P0–P2.
- Root typecheck: 9/9 tasks passed with the pinned pnpm 9.15.4 runner.
- Full tests: contracts 24, UI 1, sim-core 1,665, and web 2,387 passed; only
  three intentional web skips remain.
- Build: 3,029 modules and 167 PWA precache entries; bundle budget passed.
- Determinism: 3/3.
- Production Chromium: QO causal journey 1/1 in 13.0s; existing reload-smoke
  2/2 in 4.7m; one worker, zero retries, no flaky classification.
- Deliberate mutant: disabling the no-eligible-pick rejection caused the
  integrated worker signing test to fail by reaching commit without a loss;
  restoration returned the same test to green.
- `git diff --check` is green and scoped production source adds no bare
  `Math.random()`.
