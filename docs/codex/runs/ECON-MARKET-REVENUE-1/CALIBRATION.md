# ECON-MARKET-REVENUE-1 — Calibration Receipt

## Method

The authoritative hard study ran the current-schema league for seeds `7501`,
`7502`, `7503`, and `7504` across four completed seasons each. Every season
used the real regular-season, postseason, exact Season Review transition,
contract, extension, and free-agency systems. The study emitted every literal
team statement and counted the persisted receipt flags rather than inferring
them from the formula.

Result: `1/1` in `494.99s` (`493.946s` test time), producing 16 season rows,
512 statements, and 512 unique receipts. All frozen structural and
affected-economy assertions passed.

## Opening economy guard

| Seed | MLB payroll | Average MLB salary | Payroll spread |
| ---: | ---: | ---: | ---: |
| 7501 | $6,329.95M | $7.06M | $142.21M |
| 7502 | $6,336.05M | $7.07M | $109.83M |
| 7503 | $6,475.52M | $7.23M | $142.85M |
| 7504 | $6,468.93M | $7.22M | $149.37M |

All four opening leagues stayed inside the inherited `$3.8B-$6.8B` payroll,
`$2.5M-$8.5M` average-salary, and `$25M-$350M` payroll-spread gates. The
average-salary band is deliberately an opening-generator gate; it is not
misreported as a post-offseason annual bound.

## Observed four-by-four envelopes

| Metric | Observed | Frozen gate | Result |
| --- | ---: | ---: | --- |
| Annual mean budget | $263.26M-$264.94M | $255M-$275M | PASS |
| Free-agent market | 515-1,000 | 450-1,089 | PASS |
| Total FA signings | 26-53 | 21-58 | PASS |
| Meaningful FA signings | 26-52 | 21-57 | PASS |
| Top FA AAV | $42M | $20M-$45M | PASS |
| Accepted extensions | 18-51 | 8-80 | PASS |
| Annual MLB payroll | $4,841.13M-$5,987.74M | inherited economy assertions | PASS |
| Annual payroll spread | $151.84M-$264.03M | $25M-$350M | PASS |
| Statement surfaces per row | 4 | exactly 4 | PASS |
| Cross-surface contradictions | 0 | exactly 0 | PASS |
| Receipts per row | 32 | exactly 32 | PASS |
| Duplicate receipts | 0 | exactly 0 | PASS |
| First-application user news/briefing | 1 / 1 | exactly 1 / 1 | PASS |

The literal statements observed `$175M-$315M` market baselines, `-5.43%` to
`+4.94%` record effects, `0%` or `3.5%` playoff rates, `$166.36M-$341.59M`
gross revenue, `$166.36M-$382.58M` annual budgets, and
`$153.05M-$351.97M` payroll caps. Controlled boundary tests separately prove
the full formula limits, including the `[-8%, +8%]` record clamp and all three
allocation factors; the generated four-year sample need not hit every
mathematical endpoint.

Item-14 owner-pressure classifications remained bounded across the study:
`0-1` below floor, `20-30` on plan, `1-12` above the soft ceiling, and `6-8`
projected taxpayers per season row.

## Budget trends

| Seed | First mean | Last mean | CAGR | First-half slope | Second-half slope | Acceleration |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7501 | $263.57M | $264.45M | 0.11% | +$0.60M | +$0.18M | -$0.42M |
| 7502 | $263.26M | $264.55M | 0.16% | +$0.93M | -$0.39M | -$1.32M |
| 7503 | $264.15M | $264.63M | 0.06% | +$0.26M | +$0.17M | -$0.09M |
| 7504 | $263.84M | $264.19M | 0.04% | +$0.64M | -$0.39M | -$1.03M |

Every CAGR stayed inside `[-1%, +1%]`, both half-slopes stayed inside
`[-$3M, +$3M]`, and acceleration stayed inside `[-$4M, +$4M]`. No recursive
budget growth or item-15-attributable acceleration appeared.

## Settlement isolation

For each of the 16 settlements, the harness compared before/after digests for
nonfinancial owner state, franchise state, players, contracts, payroll,
rosters, and the parent RNG. All 112 digest pairs were equal. The only direct
settlement changes were the six intended financial fields, normalized receipts,
and the singular user presentation pair.

## Interpretation and limit

This study proves the bounded four-season item-15 system. It does not claim
actual ticket sales, cash, revenue sharing, paid tax, or a 30-season economy
soak. Those systems do not exist in the live schema, and roadmap item 18 retains
the long-horizon soak.
