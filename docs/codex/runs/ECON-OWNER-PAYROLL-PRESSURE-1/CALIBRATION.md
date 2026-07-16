# ECON-OWNER-PAYROLL-PRESSURE-1 — Calibration Receipt

## Authoritative command and revision state

Final hard-band command after correction loop 2:

```sh
MBD_OWNER_PAYROLL_STUDY=1 PATH=/tmp/mbd-pnpm9-shim:$PATH \
  pnpm --filter @mbd/web exec vitest run \
  src/workers/ownerPayrollPressure.study.test.ts --reporter=verbose
```

The final source-frozen run passed 1 file / 1 test in 516.06 seconds (517.00
seconds total), with no retry or flaky classification. Its literal output is
retained locally at `/tmp/mbd-owner-payroll-study-final.log`. The earlier
540.17-second measurement and 551.45-second hard-band runs are historical
receipts only; the 516.06-second run is authoritative because it followed the
Owner Meeting and inspectable-tax-evidence corrections.

## Opening-day source-owned gates

| Seed | Total MLB payroll | Average MLB salary | Payroll spread | On plan | Above soft | Tax exposed | Max projected tax |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 7401 | $6,397.12M | $7.14M | $143.49M | 19 | 13 | 6 | $16.18M |
| 7402 | $6,403.62M | $7.15M | $137.25M | 18 | 14 | 7 | $9.07M |
| 7403 | $6,397.84M | $7.14M | $150.21M | 19 | 13 | 5 | $15.02M |
| 7404 | $6,408.66M | $7.15M | $130.37M | 18 | 14 | 6 | $8.94M |

All four seeds passed the existing opening-day `$3.8B-$6.8B` total payroll,
`$2.5M-$8.5M` average salary, and `$25M-$350M` spread gates. Natural owner
identity was exactly 22 `win_now`, 10 `patient_builder`, and zero
`penny_pincher` for every seed.

## Four-by-four annual incidence

| Season | Total MLB payroll range | Average salary range | Spread range | Below floor | On plan | Above soft | Tax exposed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | $5,339.12M-$5,672.21M | $11.31M-$11.42M | $172.10M-$196.53M | 0 | 14-17 | 15-18 | 4-6 |
| 2 | $4,954.49M-$5,298.33M | $14.76M-$15.56M | $227.89M-$261.23M | 0-1 | 20-21 | 10-11 | 3-6 |
| 3 | $4,859.49M-$5,089.16M | $19.50M-$20.89M | $267.85M-$304.38M | 0-1 | 20-29 | 3-11 | 5-6 |
| 4 | $4,731.43M-$4,883.05M | $23.94M-$25.30M | $295.56M-$311.12M | 1 | 22-26 | 5-9 | 2-5 |

Across all 16 annual rows, observed incidence was `0-1` below floor, `14-29`
on plan, `3-18` above soft ceiling, and `2-6` tax exposed. The frozen bands
remain `0-3`, `12-31`, `1-20`, and `0-8`: the measured extrema plus the
pre-frozen two-team envelope, materially narrower than `[0, 32]`.

## Inspectable payroll and tax facts

The final hard study emitted source values rather than using a digest as a
substitute for tax evidence:

- total payroll range: `$94.00M-$401.88M`;
- taxable payroll range: `$0.00M-$323.61M`;
- tax threshold set: exactly `$230.00M`;
- tax overage range: `$0.00M-$93.61M`;
- projected tax range: `$0.00M-$37.21M`;
- taxpayer facts: 74 tuples, each containing team ID, total payroll, taxable
  payroll, threshold, overage, and projected tax.

Every annual row compared the direct worker policy with normalized Owner Intel,
Finance summary, team finance, Dashboard, and Offseason output. Cross-surface
contradictions were zero. Controlled boundary fixtures separately prove all
three archetypes; under floor; exact floor; exact soft ceiling; above soft;
exact tax line; taxpayer behavior; and minors-only payroll exclusion.

## Reconciliation and side-effect audit

- live receipts: 512/512, exactly one team/season;
- controlled first-application receipts: 512/512;
- user news items: 16; user briefings: 16;
- duplicate receipts and invalid policies: zero;
- owner, franchise, contract, and parent-RNG changes caused by controlled
  reconciliation: `0 / 0 / 0 / 0`;
- natural owner identity: 22/10/0 on every row;
- repeated same-state policy results: exact.

## Corrections made before freeze

The initial draft incorrectly used an opening-day average-salary generator band
as an annual post-offseason gate and provisionally capped above-soft teams at 12
without measurement. Live source and measurement corrected both: the generator
bands remain opening-only, while annual incidence uses the measured-range-plus-
two bands above. A later review found that the study asserted side-effect and
surface agreement without measuring each value, and then hid per-team tax facts
behind a digest. The final study audits every claimed invariant, includes Owner
Intel, and emits every taxpayer tuple. No gameplay formula was retuned to make
the evidence pass.
