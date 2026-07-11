# Goal 18 — TRUST-EXPORT-SCHEMA-MATRIX-1

## Player outcome

Every save version the live runtime still promises to accept can be imported,
normalized to the current truthful snapshot, exported through the canonical JSON
envelope, re-imported, and compared deterministically in CI. Players can trust
that a supported legacy save remains portable; unsupported, future, and malformed
saves remain rejected explicitly.

## Authority and scope

This is roadmap item 6 in `MBD_REPO_AUDIT_AND_GOAT_ROADMAP_2026-07-10.md`:
"Export/import round-trip test in CI across every supported schema version."
The live source defines the supported boundary. At goal start it is GameSnapshot
v2 through v34 inclusive: `parseGameSnapshot` has explicit v2–v33 migration
paths and parses v34 directly; the app loader separately rejects versions below
v2 and above v34. Re-verify this before test edits.

The slice owns a single authoritative compatibility matrix and its test inputs.
It must exercise the existing canonical worker import/export route and existing
canonical JSON export/import route—never a second serializer or migrator.

## Done state

1. A focused CI test enumerates every live-supported version rather than a
   convenient fixture subset. For each version it proves:
   - legacy input enters through the canonical worker import path;
   - the resulting current v34 snapshot has pinned, version-appropriate
     normalization/default expectations;
   - canonical JSON export and re-import produce deterministic canonical
     equality (excluding the intentionally wall-clock `exportedAt` envelope
     value only);
   - a worker export after JSON re-import remains the same current snapshot.
2. Test data is honest. Existing contract fixtures are reused where available;
   missing v2–v15 coverage is provided by named, minimal legacy builders that
   intentionally model their historical shapes. The matrix records why each
   builder is needed. Season-10 v33 uses the existing deep fixture and asserts
   `archivedGames: []`, never invented history.
3. Current v34 JSON round trip and boundaries remain independently explicit:
   too-old, newer, and malformed input reject with the existing safe
   classifications.
4. Any defect found is fixed only at the migration/import/export seam and is
   regression-pinned. No schema or Dexie version bump is allowed without a
   stop-and-report because this is a CI compatibility slice.
5. Required focused contract/worker/save-system tests and relevant typechecks
   pass. Before handoff, a decisive matrix case is intentionally broken or
   omitted, the expected failure is observed, it is restored exactly, and the
   green command is rerun. Browser work is required only if live governance
   makes a new Settings import → durable save → hard reload claim necessary;
   otherwise document that the matrix makes no browser claim and preserves the
   existing permanent reload-smoke gate.

## Non-goals

- New import/export product UX, quota UI, journals, or item 7 work.
- Save schema/Dexie version changes, migration policy changes, fixture rewrites,
  or production refactors not required by a discovered compatibility failure.
- Fabricated historical events, archived games, or replacement players.
- Completion/merge/push/tag/release work; those belong to the post-review owner.

## Required evidence

- `docs/codex/runs/TRUST-EXPORT-SCHEMA-MATRIX-1/SOURCE_TRUTH.md`
- living `PLAN.md` in that run directory
- focused test/typecheck command receipts, count of matrix cases, and the
  negative-control receipt in the plan
- adversarial self-review before handoff; `COMPLETION.md` is intentionally
  deferred until review and closeout.
