# Sol Gate-M v3 Architecture Amendment 1 — Dual Launch

> **RETIRED HISTORICAL EVIDENCE.** Superseded by the 2026-07-27 verification
> stop-loss. Do not implement, patch, authorize, or execute this amendment.

Historical status: `ARCHITECTURE_AMENDED`.

## Source finding

The first clean-environment contract probe proved that the special preparation
runtime executes inside Vitest's Tinypool worker rather than in the outer Vitest
config process. The inner runtime has the correct v3 cwd and Node executable,
but its argv targets Tinypool's worker entry and its execArgv is
`["--conditions","node","--conditions","development"]`. The original R
architecture's single-launch tuple is therefore superseded. No Gate-M attempt
was armed and no source freeze or authority artifact exists.

## R2 evidence order

Preserve R unchanged. R2 supersedes only its launch topology:

`R -> R2 -> Q1/Q2 -> P -> F -> M/S -> A -> V -> H -> RUN -> T`

Q1 and Q2 are two fresh clean-process probe receipts with byte-identical
canonical dual-launch/dependency payloads. P binds both. F binds R2, Q1/Q2, P,
dependencies, and final source. A binds F/M/S/P and both normalized launches;
it contains no A, V, or H hash. V reopens A. H binds A and V and is created
last.

## Outer capture

The special Vitest config must use one `defineConfig(() => ...)` callback to
capture the outer cwd, execPath, argv, execArgv, complete sorted environment,
and dependency identity before worker creation. A private global-symbol guard
rejects a second or preexisting capture. One deep-canonicalized value is
injected into the reviewed worker graph through a unique Vite `define`
identifier. No environment or ambient-global fallback is permitted.

## Inner capture and comparison

Runtime independently captures the live Tinypool-worker cwd, execPath, argv,
execArgv, complete sorted environment, and dependencies. After reopening A, V,
and H, runtime normalizes only the A/H environment values to
`__A_SHA256__`/`__H_SHA256__`, then exact-compares injected outer capture with
`A.launch.outer`, live inner capture with `A.launch.inner`, and both dependency
manifests with `A.dependencies`. These checks precede `/bin/ps`, compiler,
materialization, VM, or publication.

## Reserved-pair probe

There is no separate probe environment flag. Probe mode uses the exact final
Gate-M-shaped command with A=`a` repeated 64 and H=`c` repeated 64. That exact
pair keeps the bridge/materialization inert and emits exactly one canonical
probe marker. Either reserved value alone, either outside Gate-M, a missing
value, or either used as a real authority fails closed. The actual A/H values
are forbidden from matching the reserved pair.

Run two fresh `/usr/bin/env -i` probe processes. Both must pass the complete
focused suite, remain materialization-inert, emit one marker, and produce
byte-identical normalized dual-launch/dependency payloads. Any instability
stops before F.

## Dependency identities

R2 binds the exact v3-to-v2 dependency links plus Node, Vitest, and Tinypool
realpaths, modes, sizes, and hashes. At minimum:

- root link target SHA-256
  `baa7f801013fce0e22a818fd11037c8df32dfa27286add9e8d6f274b3115d6ae`;
- web link target SHA-256
  `6dce1892444f36679c2a9925619b7d9bc8586383e7a5b0fc179fa7d02a120d0e`;
- Node SHA-256
  `de225762a2e4ca48405039e77f1f4db7bcdd35628d2312ed442789bfba2b87d0`;
- Vitest entry/package hashes
  `39db22f579acf5639bbb17a261408debbde03f4692c0c439e77e7f13aeba74d6`
  and `555361762b31957f3960220aad50df9f43c9f82d830862ef6e3588168fbe111c`;
- Tinypool worker/package hashes
  `e08e03c909cf9b5790f5969d09e4114d5b8908f3c0b75fbb487010f8cd54393e`
  and `fab0aa2756e7cf5c2dc020daafa86c2b5fa3cfd2f9087393418b9a7379dc3dda`.

Changed target string, realpath, file hash, worker entry, execArgv, outer/inner
field, injected capture, or environment key/value must fail before process
observation or materialization.

## Scope and continuation

Terra may continue the existing four-file v3 foundation after immutable R2 is
authored. This architecture amendment does not consume a correction loop. It
does not authorize a fifth file, production change, Goal 32, Item 19, dynamic
Gate M, evidence authority, or source freeze.
