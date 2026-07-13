# ECON-CLOCK-1 — Pre-clock Population Baseline

Recorded 2026-07-12 from exact branch base
`2c07cc3eea4cfca1faef344e51b91818782b2da3`, before any Goal 11 production
edit.

## Command receipt

```text
pnpm --filter @mbd/web exec vitest run \
  src/workers/econClockPopulationBaseline.temp.test.ts --reporter=verbose

Test Files  1 passed (1)
Tests       1 passed (1)
Duration    810.43s
```

The temporary test used the real worker `newGame` → `simToPlayoffs` →
`simRemainingPlayoffs` → complete-offseason → `startNextSeason` loop for seeds
7111, 7112, and 7113 across six rollovers. It was deleted immediately after the
green observation. No temporary source remains.

Population categories are live-runtime facts:

- `major`: assigned (`teamId !== ''`) and `rosterStatus === 'MLB'`;
- `minor`: assigned and not MLB;
- `unassigned`: `teamId === ''`, the runtime representation used for free-agent
  truth and unsigned amateur outcomes because `GeneratedPlayer` has no
  `FREE_AGENT` roster level;
- `total`: all canonical worker players;
- `bytes`: `estimateSnapshotSize(exportSnapshot())`.

## Source-grounded entry and exit mechanics

- `DRAFT_CLASS_SIZE` is 750, but `DRAFT_ROUNDS` × `NUM_TEAMS` is exactly
  20 × 32 = 640 selections. `recordDraftPickForState()` adds every selected
  prospect to canonical players before signing resolution; an unsigned pick is
  released but remains canonical/unassigned. The measured result is exactly 640
  draft entrants every rollover.
- IFA AI signing is bounded by the finite season pool, remaining bonus budgets,
  and one attempted signing per CPU organization per simulated IFA day. The
  observed annual IFA entrants are 1–11.
- `determineRetirements()` skips every player younger than 32, makes ages 36–37
  eligible at 5%, increases the rate from age 38, and forces age 44 retirement.
  Rollover removes only the selected retirement IDs from canonical players.
- Goal 11 does not own draft intake, IFA intake, retirement policy, amateur
  pruning, or Day-One roster repair. Its natural expiry path changes assignment
  and market membership, not canonical population.

## Raw season populations

| Seed | Season | Total | Major | Minor | Unassigned | Snapshot bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7111 | 1 | 5,408 | 896 | 4,512 | 0 | 7,683,964 |
| 7111 | 2 | 6,021 | 863 | 4,887 | 271 | 16,800,169 |
| 7111 | 3 | 6,603 | 839 | 5,242 | 522 | 21,804,041 |
| 7111 | 4 | 7,181 | 834 | 5,570 | 777 | 27,057,661 |
| 7111 | 5 | 7,762 | 836 | 5,874 | 1,052 | 32,729,807 |
| 7111 | 6 | 8,322 | 833 | 6,168 | 1,321 | 38,615,198 |
| 7111 | 7 | 8,868 | 838 | 6,451 | 1,579 | 44,549,642 |
| 7112 | 1 | 5,408 | 896 | 4,512 | 0 | 7,683,814 |
| 7112 | 2 | 6,008 | 859 | 4,885 | 264 | 16,718,891 |
| 7112 | 3 | 6,592 | 842 | 5,223 | 527 | 21,739,313 |
| 7112 | 4 | 7,182 | 835 | 5,549 | 798 | 26,990,548 |
| 7112 | 5 | 7,757 | 836 | 5,885 | 1,036 | 32,707,078 |
| 7112 | 6 | 8,337 | 836 | 6,221 | 1,280 | 38,677,160 |
| 7112 | 7 | 8,891 | 835 | 6,495 | 1,561 | 44,625,012 |
| 7113 | 1 | 5,408 | 896 | 4,512 | 0 | 7,682,886 |
| 7113 | 2 | 6,023 | 870 | 4,877 | 276 | 16,735,600 |
| 7113 | 3 | 6,627 | 849 | 5,239 | 539 | 21,782,106 |
| 7113 | 4 | 7,199 | 836 | 5,579 | 784 | 27,087,215 |
| 7113 | 5 | 7,776 | 832 | 5,864 | 1,080 | 32,676,604 |
| 7113 | 6 | 8,323 | 836 | 6,138 | 1,349 | 38,500,389 |
| 7113 | 7 | 8,874 | 832 | 6,423 | 1,619 | 44,365,165 |

## Raw annual flows

`Market` is the canonical market's remaining free-agent count at completed
offseason, before rollover clears the market.

| Seed | Rollover | Entrants | Exits | Draft picks | IFA signings | Non-tenders | Market |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7111 | 1 | 643 | 30 | 640 | 3 | 15 | 108 |
| 7111 | 2 | 641 | 59 | 640 | 1 | 1 | 179 |
| 7111 | 3 | 644 | 66 | 640 | 4 | 8 | 299 |
| 7111 | 4 | 644 | 63 | 640 | 4 | 7 | 329 |
| 7111 | 5 | 650 | 90 | 640 | 10 | 2 | 477 |
| 7111 | 6 | 644 | 98 | 640 | 4 | 3 | 614 |
| 7112 | 1 | 646 | 46 | 640 | 6 | 11 | 107 |
| 7112 | 2 | 651 | 67 | 640 | 11 | 1 | 192 |
| 7112 | 3 | 646 | 56 | 640 | 6 | 5 | 303 |
| 7112 | 4 | 649 | 74 | 640 | 9 | 10 | 330 |
| 7112 | 5 | 647 | 67 | 640 | 7 | 4 | 463 |
| 7112 | 6 | 644 | 90 | 640 | 4 | 1 | 633 |
| 7113 | 1 | 645 | 30 | 640 | 5 | 7 | 104 |
| 7113 | 2 | 648 | 44 | 640 | 8 | 1 | 178 |
| 7113 | 3 | 643 | 71 | 640 | 3 | 6 | 293 |
| 7113 | 4 | 649 | 72 | 640 | 9 | 22 | 354 |
| 7113 | 5 | 645 | 98 | 640 | 5 | 5 | 454 |
| 7113 | 6 | 647 | 96 | 640 | 7 | 6 | 617 |

Observed bands before Goal 11: annual entrants 641–651, exits 30–98, net total
growth 546–615, IFA entrants 1–11, and completed-offseason market 104–633.

## Slope and curvature receipt

For metric `x`, first-half slope is `(x_season4 - x_season1) / 3`, second-half
slope is `(x_season7 - x_season4) / 3`, and curvature signal is `second - first`.

| Metric | Seed | First-half/year | Second-half/year | Curvature |
| --- | ---: | ---: | ---: | ---: |
| Total players | 7111 | 591.00 | 562.33 | -28.67 |
| Total players | 7112 | 591.33 | 569.67 | -21.67 |
| Total players | 7113 | 597.00 | 558.33 | -38.67 |
| Assigned minors | 7111 | 352.67 | 293.67 | -59.00 |
| Assigned minors | 7112 | 345.67 | 315.33 | -30.33 |
| Assigned minors | 7113 | 355.67 | 281.33 | -74.33 |
| Assigned MLB | 7111 | -20.67 | 1.33 | 22.00 |
| Assigned MLB | 7112 | -20.33 | 0.00 | 20.33 |
| Assigned MLB | 7113 | -20.00 | -1.33 | 18.67 |
| Unassigned | 7111 | 259.00 | 267.33 | 8.33 |
| Unassigned | 7112 | 266.00 | 254.33 | -11.67 |
| Unassigned | 7113 | 261.33 | 278.33 | 17.00 |
| Snapshot bytes | 7111 | 6,457,899 | 5,830,660 | -627,239 |
| Snapshot bytes | 7112 | 6,435,578 | 5,878,155 | -557,423 |
| Snapshot bytes | 7113 | 6,468,110 | 5,759,317 | -708,793 |

Cross-seed means:

- total: first 593.11/year, second 563.44/year, curvature -29.67/year;
- assigned minors: first 351.33/year, second 296.78/year, curvature -54.56/year;
- assigned MLB: first -20.33/year, second 0.00/year, curvature +20.33/year
  (the source normalizes the initial 28-player MLB shape, then stabilizes near
  26 per club; Goal 12 still owns initial legality);
- unassigned: first 262.11/year, second 266.67/year, curvature +4.56/year;
- bytes: first 6,453,862/year, second 5,822,711/year, curvature
  -631,151/year.

This receipt is evidence for Sol's numeric band selection, not itself the final
band contract. The implementation soak must rerun the same formulas after source
freeze and separately measure Goal-11 expirations, option outcomes, duplicate
clocking, duplicate free-agency entry, and no-Goal-11 roster regression.

## Post-clock authoritative measurement

The permanent current-schema harness reran after Goal 11 source freeze:

```text
MBD_ECON_CLOCK_SOAK=1 MBD_ECON_CLOCK_SOAK_MEASURE=1 \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econClockSoak.test.ts --reporter=verbose

Test Files  1 passed (1)
Tests       2 passed (2)
Rollovers   18 passed (7111/7112/7113 × 6)
Duration    894.07s test / 894.79s command
Receipt     34f2d653f434c8235e18da9375f24d46145c72347d5f2ca94d2d30cbcc569c0e
```

The digest covers full transition matrices, market-cohort rows, six roster
checkpoints per team per rollover, and causal roster rows. Compact single-seed
replays reproduced every market-cohort hash and exposed the following scalar
table without changing the digest input.

| Seed | Rollover | Total | Minor | MLB | Unassigned | Snapshot bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7111 | 0 | 5,408 | 4,512 | 896 | 0 | 7,683,958 |
| 7111 | 1 | 6,028 | 4,509 | 832 | 687 | 16,359,466 |
| 7111 | 2 | 6,614 | 4,456 | 797 | 1,361 | 21,089,010 |
| 7111 | 3 | 7,202 | 4,674 | 414 | 2,114 | 25,893,672 |
| 7111 | 4 | 7,766 | 4,969 | 329 | 2,468 | 31,053,591 |
| 7111 | 5 | 8,333 | 5,225 | 277 | 2,831 | 36,327,446 |
| 7111 | 6 | 8,886 | 5,429 | 276 | 3,181 | 41,690,232 |
| 7112 | 0 | 5,408 | 4,512 | 896 | 0 | 7,683,808 |
| 7112 | 1 | 6,000 | 4,456 | 832 | 712 | 16,213,041 |
| 7112 | 2 | 6,595 | 4,447 | 748 | 1,400 | 21,008,961 |
| 7112 | 3 | 7,189 | 4,702 | 376 | 2,111 | 25,817,387 |
| 7112 | 4 | 7,759 | 4,958 | 332 | 2,469 | 31,013,178 |
| 7112 | 5 | 8,329 | 5,205 | 298 | 2,826 | 36,359,860 |
| 7112 | 6 | 8,876 | 5,391 | 288 | 3,197 | 41,783,561 |
| 7113 | 0 | 5,408 | 4,512 | 896 | 0 | 7,682,880 |
| 7113 | 1 | 6,014 | 4,469 | 832 | 713 | 16,202,742 |
| 7113 | 2 | 6,604 | 4,445 | 771 | 1,388 | 20,984,611 |
| 7113 | 3 | 7,206 | 4,685 | 386 | 2,135 | 25,839,392 |
| 7113 | 4 | 7,781 | 4,945 | 318 | 2,518 | 31,028,497 |
| 7113 | 5 | 8,340 | 5,162 | 276 | 2,902 | 36,329,307 |
| 7113 | 6 | 8,886 | 5,410 | 274 | 3,202 | 41,844,060 |

Post-clock annual observations were: entrants 643–648, exits 25–101, net
growth 546–620, natural MLB expirations 87–662, market entry 451–961, and
post-phase market 433–924. Draft entrants remained exactly 640 per rollover;
IFA entrants were 3–8. Every rollover reported zero unexplained assignment
changes, zero lost prior market members, zero duplicate entry, and zero
Goal-11-caused roster overage. Seed 7112 rollover 5 specifically rejected the
two formerly excess SFB admissions.

Post-clock slope extrema across individual seeds were:

| Metric | First half | Second half | Curvature |
| --- | ---: | ---: | ---: |
| Total | 593.67–599.33 | 560.00–562.33 | -39.33…-31.33 |
| Assigned minors | 54.00–63.33 | 229.67–251.67 | 166.33–197.67 |
| Assigned MLB | -173.33…-160.67 | -46.00…-29.33 | 114.67–144.00 |
| Unassigned | 703.67–711.67 | 355.67–362.00 | -356.00…-341.67 |
| Snapshot bytes | 6,044,526–6,069,905 | 5,265,520–5,334,889 | -804,385…-717,281 |

Sol thread `019f552e-4389-7501-8f16-a1256dcd1824` applied the frozen margin
rule to this post-clock artifact. The resulting permanent bands are recorded in
`SOL_ARCHITECTURE_GATE.md`; this finite receipt makes no asymptotic claim.
