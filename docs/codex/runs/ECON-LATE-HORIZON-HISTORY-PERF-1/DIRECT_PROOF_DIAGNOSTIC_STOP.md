# Direct-Proof Diagnostic Stop — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `STOPPED — R/P/H GATE RED — NO RETRY — FINAL ADMISSION CLOSED`

Date: 2026-07-31

## Outcome

The fresh persistent direct-proof route reached its single authorized paired
`R/P/H` diagnostic and failed the unchanged performance threshold:

```text
D15 = 5,543ms
D30 = 9,377ms
R   = 271,978ms
P   = 2,676,912ms
H   = 1,938,000ms
```

`R` was `738,912ms` below the required `1,010,890ms` recovery, and `P` was
`738,912ms` above `H`. Vitest exited `1` after `92.217s` of test time. The
strict PASS summary was correctly not emitted. The command was not retried,
and the conditional final admission did not run.

Failure classification: **production performance insufficiency**. The exact
four semantics-neutral Goal-32 seams do not recover enough of the frozen
Goal-31 forecast deficit. This is not a flaky test, CI failure, checkpoint
defect, proof-program defect, gameplay change, RNG drift, save/schema change,
or evidence-recording defect.

## Authenticated candidate

- baseline commit/tree/parent:
  `505cfdf7c3c11e0cb821bea0716641dbcb787555` /
  `0640b942317d7bfacebb33b2b5befa20e90cd746` /
  `e51854080d4bae705483ae2d55a56c0cd5bd7127`;
- fresh successor seed:
  `31b82bbee4dd5d3b2a72bcc80821c33082108a47`;
- first proof candidate:
  `a16639b832df77795c27b3b87a9a42a7a63fd024`;
- corrected candidate commit/tree/parent:
  `79d022333e9ad4cedcd2d14bbcf8b0afd03e2ab0` /
  `25d3c58f291e87e131d0e7967256163d1ccb1192` /
  `a16639b832df77795c27b3b87a9a42a7a63fd024`;
- candidate file SHA-256:
  `08181daaaa2d5e07c6ab3fa927b2b06f1a93cee047a7c98c275ded46641072e9`;
- immediate-parent binary-diff SHA-256:
  `6d01f9d0762645c3d3a90920a2e479aa3245f4ba40a0cf809ef79b91a604245b`;
- independent Sol verdict before execution:
  `MERGE_READY`, actionable P0/P1/P2 `0/0/0`;
- remote evidence branch:
  `origin/codex/goal32-direct-successor-85310795-candidate-r1`.

The candidate changed only
`apps/web/src/workers/econLongSoak.test.ts` from its immediate parent. Its
persistent baseline and successor roots were clean before and after the gate.

## Pre-timing receipts

The sole fresh import probe passed on its first attempt:

- one test passed, four intentionally skipped;
- `2.599s` command wall time;
- no simulation root, protected timer, diagnostic, or evidence summary ran.

After the probe:

- focused `econLongSoak.test.ts`: three passed, two intentionally skipped;
- affected web typecheck: passed;
- static Sol review: zero actionable P0-P2.

## Canonical input recapture

The lost temporary inputs were reproduced—not reconstructed from prose—by the
exact repository-owned Goal-31 producer commit:

- producer commit/tree/parent:
  `2f3329b0886396cd9d8550aa42ea2738d02c4126` /
  `51771ce9dfe6a2bfceae0122e2368cee8a8fb969` /
  `1e81a593d8a37bdfe0ab78b357569b23543ce187`;
- composition identity:
  `dfd54a111f351610316458cd449ee76b946a3cac5661fc0f67672759e028d6b8`;
- persistent producer root:
  `/Users/kevin/Downloads/MBD-goal31-recapture-2f3329b-20260731`;
- persistent evidence root:
  `/Users/kevin/Downloads/MBD-goal32-recapture-evidence-2f3329b-20260731`.

Exact artifacts:

| Input | Bytes | Raw SHA-256 | Envelope digest |
| --- | ---: | --- | --- |
| `season15.json` | 97,077,025 | `043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e` | `a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca` |
| `season29.json` | 188,382,012 | `3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3` | `4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0` |

Both raw and envelope values exactly reproduced the frozen historical values.
Season 15 stopped after its completed boundary; the continuation ran only
seasons 16 through 29 and never started season 30. The producer validation,
season-15 consumer validation, and season-29 output validation all passed on
their first attempts and exercised their repository-owned hostile matrices.

## Command counters

| Lane | Result |
| --- | --- |
| fresh Goal-32 import probe | `1/1` green |
| season-15 capture | `1/1` green |
| season-15 producer validation | `1/1` green |
| season-15 consumer validation | `1/1` green |
| season-29 capture | `1/1` green |
| season-29 output validation | `1/1` green |
| R/P/H diagnostic | `1/1` red, consumed |
| conditional final admission | `0/1`, closed because diagnostic was red |
| retry | `0` |
| R41/custom recovery lineage | prohibited and unused |

## Consequences

- The Goal-32 production candidate is not landable on `main`.
- The final forecast/admission, root release gates, local-main landing,
  deployment, and release remain closed.
- Item 18 remains blocked on its performance prerequisite; Item 19 remains
  closed.
- No fifth seam, cap/timeout/seed/horizon change, or reinterpretation is
  permitted by the exhausted Goal-32 route.
- A future route must be technically distinct and must not rerun this consumed
  diagnostic. It requires a source-grounded acceptance/oracle amendment before
  any new performance execution can open.
