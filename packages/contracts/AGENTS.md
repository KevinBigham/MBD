# Contracts and Save Rules

These instructions extend the repository root `AGENTS.md` for `packages/contracts`.

- Read the live current snapshot version before editing any schema or migration.
- Prefer additive, backward-compatible fields and discriminated unions.
- A schema change is incomplete without migration logic, fixture(s), old/deep-save parse coverage, export/import round-trip, reload proof, and a documented rollback/compatibility story.
- Never fabricate data that an old save could not have recorded. Initialize new history collections empty and expose honest coverage metadata/copy.
- Deterministic IDs may not use wall clock time, random UUIDs, or unstable object iteration.
- Avoid generic untyped payload bags when a small typed event union will work.
- Do not bump the save version for runtime-only UI state or persistence-coordinator generations.
- If a proposed runtime field is stripped/rejected by the schema, either keep it out of serialized game truth or explicitly re-scope as a migration; do not sneak it through.
