# Sol Causal Proof Architecture — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `APPROVED_ARCHITECTURE — 2026-07-31`

This architecture replaces the rejected proof-authority boundary after Sol's
`STOP_REQUIRED`, actionable P0/P1/P2 `0/4/0`. It is one semantic replacement,
not `r3`, a recovery lineage, or R41.

## Exact scope

Only these five paths may change, byte-identically in both disposable
compositions:

1. `apps/web/src/workers/econLongSoak.receipts.ts`
2. `apps/web/src/workers/econLongSoak.receipts.test.ts`
3. `apps/web/src/workers/econLongSavePerf.integration.test.ts`
4. `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`
5. `apps/web/src/workers/econMilestonePathCpuProfile.test.ts`

Fresh semantic root:
`/private/tmp/mbd-goal32-causal-proof-5a4eb60-20260731`.

Preserve the rejected proof-authority root and commits in `CURRENT.md` as
immutable evidence. No sixth path, gameplay, RNG, save, cap, helper, receipt
key/formula, diagnostic-order, or source-freeze change is allowed.

## Generated authority

The validated manifest `sourceFreeze.files` must contain exactly one
`packages/sim-core/src/narrative/newsFeed.ts` row. Its SHA-256 becomes the sole
Goal-32 News source binding carried by `Goal32ProofAuthority` and
`ReceiptIdentityBinder`. Missing, duplicate, malformed, historical Goal-31,
or mismatched hashes reject. Goal-31 keeps its explicit historical constant;
Goal-32 never accepts it.

Before publication, re-read the retained manifest through its held descriptor,
rederive the live successor, regenerate the complete authority (including the
News binding), and exact-compare it to the acquired authority.

## Current-byte retention

Final retained-file validation must positionally read the current bytes through
the already-held descriptor from offset zero, require exact length plus EOF,
fstat before and after, hash those current bytes, compare them to the retained
raw bytes/hash, and then require the pathname still names the same regular
non-symlink inode. Cached-buffer hashing alone is forbidden.

## Causal child transport

The child must not publish or return an observation through a pathname. It
emits exactly one descriptor-bound frame to captured stderr:

`@@MBD_GOAL32_OBSERVATION_V1:<tag>:<length>:<sha256>:<canonical-base64>@@\n`

The tag is derived from manifest raw/internal identities, ordinal, variant,
data age, input hash, and composition identity. Raw observation bytes are
limited to 262,144 bytes. The parent captures raw buffers with a 4 MiB
`maxBuffer`, rejects any stdout frame and missing, duplicate, malformed,
noncanonical, wrong-tag, wrong-length, wrong-hash, oversized, signaled, or
nonzero-exit evidence, and parses only the decoded captured bytes. One nested
pnpm/Vitest self-test must prove the exact framed transport without simulation,
timer, diagnostic root, or evidence write.

## Publication state machine

```text
ACQUIRE
  pin root -> retain manifest -> derive authority and binder
COMPUTE
  execute selected operation -> return staged bytes only
REVALIDATE
  current manifest bytes -> root -> live composition -> News source binding
PUBLISH
  exclusive mode-000 held descriptors -> positional writes -> fsync -> readback
POSTVALIDATE
  complete closure -> promote sidecars first and causal receipt last -> closure
SUCCESS
  close descriptors
FAILURE
  no output before publish; otherwise mode-000 quarantine and reject root
```

Goal-32 computation callbacks may not create final output paths. Central sync
and async wrappers publish only after computation and authority revalidation.
All final paths are unique absolute direct children of the fresh semantic root.
Publication opens with `O_CREAT | O_EXCL | O_RDWR | O_NOFOLLOW`, writes through
the held descriptor, fsyncs, positionally re-reads, and validates every FD,
pathname, root, manifest, live composition, and source binding. The causal
receipt is promoted last. A failed publish is mode-000 and deterministically
quarantined when pathname identity remains safe; otherwise the root is
permanently rejected. Prior evidence is never deleted.

The parent creates input copies, observation archives, and reducer through held
descriptors. After reducer creation it revalidates reducer, manifest, all
inputs, all captured observations, all retained immutable sources, both live
composition identities, and exact manifest equality.

## Required negative controls

- missing/duplicate News manifest row and historical Goal-31 hash;
- callback failure creates no final path;
- manifest/live-successor drift during `await` prevents publication;
- same-size changed bytes with restored mtime fail held-FD rehash;
- missing/duplicate/malformed/wrong-tag child frames;
- exact nested pnpm/Vitest frame recovery;
- no child output pathname consumption;
- parent archive bytes equal the captured bytes;
- mutation of manifest, input, source, observation, or reducer fails closure;
- failed publication leaves no admissible final artifact;
- sidecars precede the causal receipt;
- a deliberate cached-buffer mutant turns the named current-byte regression
  red and passes again after exact restoration.

## Gates and stop budget

One implementation pass and at most one bounded correction loop. Then:

1. exact five-path/byte-identity and twelve-path composition checks;
2. focused four-file Vitest matrix in both compositions, retries disabled;
3. deliberate current-byte mutant red/restore/green;
4. web typecheck in both compositions;
5. one fresh manifest in the causal root with independent hash/byte checks;
6. one manifest check-only;
7. one three-consumer real-source-binding readiness check-only;
8. one independent Sol/xhigh review with actionable P0/P1/P2 `0/0/0`.

Only then may the previously authorized single no-retry R/P/H diagnostic run.
Any sixth path, transport instability, copied identity, pathname provenance,
cached projection, prevalidation publication, gameplay/RNG/save/cap/receipt
change, focused failure, or review P0-P2 is immediate `STOP_REQUIRED`. No new
user permission is required under `docs/codex/STANDING_USER_AUTHORITY.md`.

## Terminal implementation stop

Status: `STOPPED_PERMANENTLY — IMPLEMENTATION AND CORRECTION EXHAUSTED`

The implementation remained incomplete after its sole authorized correction:
actual Goal-32 lanes still bypassed the causal publisher, the original held FD
was not the sole publication descriptor, direct proof remained unchanged, and
the nested transport/publication negative controls were absent. No diagnostic,
timer, proof, admission, retry, or causal artifact root ran or was created.

The dirty compositions and all prior evidence are preserved exactly as
recorded in `CURRENT.md`. This architecture must not be corrected, executed,
revived, renamed, or used to mint another semantic root. Sol replaced it with
the smaller repository-owned boundary in `SOL_DIRECT_IN_PROCESS_GATE.md`.
