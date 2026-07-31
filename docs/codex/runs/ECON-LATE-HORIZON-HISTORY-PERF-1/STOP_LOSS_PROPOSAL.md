# Stop-Loss Proposal — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `SUPERSEDED AFTER REVIEW — REJECTED CHECKPOINT PRESERVED; SEE SOL_CAUSAL_ARCHITECTURE.md`

This checkpoint responds to the fresh Sol `FIX_AND_REVIEW` verdict,
P0/P1/P2 `0/2/0`. Kevin's standing authorization in
`docs/codex/STANDING_USER_AUTHORITY.md` opens the exact five-file changes,
fresh compositions, semantic artifact seal, focused gates, check-only gates,
and one Sol review. Diagnostic, forecast, proof, admission, retry, and Item 19
remain closed until their existing gates open them.

## Defect classes

1. **P1 evidence-recording defect:** observation bytes and artifact-root
   identity are not retained through admission.
2. **P1 architecture-contract defect:** direct proof, forecast, and admission
   still derive incompatible Goal-31 identity.

Neither finding is a production, gameplay, RNG, save, schema, cap, or measured
performance defect.

## Exact proof-file boundary

Apply one byte-identical patch to both non-landed compositions, changing only:

1. `apps/web/src/workers/econLongSoak.receipts.ts`
2. `apps/web/src/workers/econLongSoak.receipts.test.ts`
3. `apps/web/src/workers/econLongSavePerf.integration.test.ts`
4. `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`
5. `apps/web/src/workers/econMilestonePathCpuProfile.test.ts`

No sixth source/test path opens. All eleven non-helper proof paths remain
byte-identical across compositions. Helpers, the landable source freeze,
production paths, dependencies, schemas, caps, RNG, saves, and receipt
keys/formulas remain unchanged.

## One generated Goal-32 proof authority

`econLongSoak.receipts.ts` becomes the one authoritative generator:

- stable-read the exact operator-supplied Goal-32 manifest and verify its raw
  SHA-256, internal digest, and full schema;
- derive the live successor composition once and require exact equality with
  `manifest.successorComposition`;
- derive one `Goal32ProofAuthority` containing the manifest raw/internal
  identities and the receipt-compatible source projection:
  `schema, sourceFreezeRevision, sourceFreezeTree, compositionRevision,
  compositionTree, files, digest`;
- derive every value from the manifest and live composition; copy no HEAD,
  tree, path, helper, observer, or source-freeze constant;
- pass that authority explicitly through capture, validation, forecast,
  profile, and admission; default identity derivation is forbidden.

Historical Goal-31 derivation remains preserved evidence. No Goal-32 execution
mode may call it. Every fresh receipt admitted later must exact-equal the one
generated Goal-32 authority.

## One retained evidence boundary

The same central module owns the complete orchestration pin:

- open and retain one artifact-root directory descriptor;
- record canonical path, device, and inode once;
- assert that identity before and after every manifest/input/output operation,
  child spawn, and reducer write;
- pass the root fingerprint to children, which verify it before manifest/input
  reads and exclusive output creation;
- stable-read each source/input/output through one `O_NOFOLLOW` descriptor;
- retain the exact buffer, hash, stat identity, and descriptor;
- create input copies from the retained source buffer, never by reopening the
  source pathname;
- parse each child observation from its retained buffer, never by reopening
  the output pathname;
- before reduction, re-fstat every retained descriptor and require each
  pathname to resolve to the same file identity;
- close descriptors only in `finally`;
- write the unchanged reducer receipt with `wx` only after every pin passes.

## Hostile controls

Focused tests reject:

- same-path regular-file replacement after first observation read;
- artifact-root replacement by a different directory;
- child/outer root device or inode disagreement;
- output deletion, rename, in-place change, or inode substitution before
  reduction;
- stale Goal-31 identity;
- wrong Goal-32 manifest, successor HEAD/tree, helper, observer, path closure,
  source freeze, or manifest digest;
- baseline identity where successor identity is required;
- dirty, redirected, stale, or wrong-root successor;
- missing or extra proof-authority environment keys;
- any receipt identity differing from the generated authority.

One deliberate mutant removes the final retained-file/root assertion. The
corresponding hostile test must fail; correct bytes are restored and rerun
green.

## Check-only and review gates

Use one common proof-authority check-only environment and one Vitest invocation
over the three consumer files. The actual direct-proof, forecast, and
final-admission parsers must accept the live successor authority while running:

- zero simulation or gameplay calls;
- zero timers or measured roots;
- zero child spawns;
- zero artifact/output writes.

The existing manifest check-only gate must also pass against fresh
compositions and the fresh manifest. Both gates use retries disabled.

Preserve
`/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730-r2` unchanged as
rejected manifest-only evidence. Do not create `-r3` or a recovery lineage.
Use one new semantic root:

`/private/tmp/mbd-goal32-proof-authority-5a4eb60-20260731`

Create fresh composition commits from the same original parents with exact
twelve-path diffs, unchanged helpers, and identical eleven non-helper blobs.
The new manifest independently revalidates the immutable `-r2` parity
receipts. Run only:

1. focused tests;
2. affected web typecheck;
3. one manifest check-only;
4. one three-consumer proof-readiness check-only;
5. one independent Sol/xhigh review.

Zero actionable P0-P2 is required before the already-authorized paired
diagnostic can open.

## Stop conditions

Stop before diagnostic execution if:

- any sixth source/test path is needed;
- production, helper, source-freeze, parity, cap, or receipt contract changes;
- Goal-31 identity remains reachable from a Goal-32 execution mode;
- identity is copied outside the central generator;
- admitted bytes are reopened instead of retained;
- root identity is not held for the whole orchestration;
- either check-only writes, measures, or spawns;
- any focused gate fails;
- review reports an actionable P0-P2;
- copied-identity or pathname-provenance failure recurs.

## Authorization received

> I authorize one first-principles Goal-32 proof-authority stop-loss
> replacement checkpoint exactly as proposed: one Terra/high writer may
> modify only `apps/web/src/workers/econLongSoak.receipts.ts`,
> `apps/web/src/workers/econLongSoak.receipts.test.ts`,
> `apps/web/src/workers/econLongSavePerf.integration.test.ts`,
> `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`, and
> `apps/web/src/workers/econMilestonePathCpuProfile.test.ts`, identically in
> both non-landed compositions; replace copied Goal-31 identity with one
> manifest-derived Goal-32 proof authority; retain one stable output
> buffer/file identity and one artifact-root inode across orchestration; create
> one fresh semantic artifact root and manifest; run only focused tests,
> affected web typecheck, manifest check-only, three-consumer proof-readiness
> check-only, and one independent Sol/xhigh review. This supersedes only the
> rejected `-r2` proof candidate and grants the narrow correction-cap exception
> required for this checkpoint. Preserve all prior evidence, source freeze,
> exact twelve-path composition boundary, eleven-path cross-composition byte
> identity, helpers, parity receipts, caps, gameplay/RNG/save/receipt
> contracts, R41 prohibition, Item-19 closure, and remote/release prohibition.
> Do not execute the diagnostic, final proof, forecast, admission, or retry
> unless the fresh review returns zero actionable P0-P2 under the previously
> granted authority; stop on any actionable P0-P2 or any need beyond this exact
> boundary.

Kevin's 2026-07-31 standing authorization grants this exact request and the
narrow correction-cap exception. No further permission request is required.
