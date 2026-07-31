// @vitest-environment node

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  ECON_LONG_SOAK_HORIZON,
  ECON_LONG_SOAK_CALIBRATION_SEEDS,
  ECON_LONG_SOAK_DIAGNOSTIC_MODE,
  ECON_LONG_SOAK_SEEDS,
  sha256,
  type EconLongSoakMode,
  type EconLongSoakSeed,
} from './econLongSoak.metrics.js';
import {
  assertEconLongSoakDiagnosticReceipt,
  assertEconLongSoakReceipt,
  stableJson,
} from './econLongSoak.receipts.js';
import {
  assertExactStreamingReplayRow,
  buildStreamingReplayDigest,
  plannedV35RoundTripSeasons,
  runEconLongSoak,
  runEconLongSoakSeasonBoundary,
  yieldEconLongSoakMacrotask,
  type EconLongSoakProgressMarker,
} from './econLongSoak.testSupport.js';

vi.mock('comlink', () => ({ expose: () => undefined }));

const enabled = process.env.MBD_ECON_LONG_SOAK === '1';
const longSoakIt = enabled ? it : it.skip;

/**
 * The direct lane is deliberately opt-in.  It is a proof harness for two
 * disposable compositions, not another way to run the canonical soak test.
 * In particular, do not move any of this setup to module scope: ordinary
 * Vitest discovery must neither require proof roots nor start Vite.
 */
const DIRECT_MODE_KEY = 'MBD_GOAL32_DIRECT_MODE';
const DIRECT_PREFIX = 'MBD_GOAL32_DIRECT_';
const DIRECT_PARENT = '31b82bbee4dd5d3b2a72bcc80821c33082108a47';
const DIRECT_BASELINE = {
  revision: '505cfdf7c3c11e0cb821bea0716641dbcb787555',
  tree: '0640b942317d7bfacebb33b2b5befa20e90cd746',
  parent: 'e51854080d4bae705483ae2d55a56c0cd5bd7127',
} as const;
const DIRECT_SUCCESSOR_PRODUCTION_SHA256 = {
  'apps/web/src/workers/sim.worker.helpers.ts': '768d95a446901d81f54c194e520bdc15e82a93b788ffdd10a5c7cb376524fd1b',
  'packages/sim-core/src/narrative/newsFeed.ts': '9c4a84e3eca72e1f05e0561c1b0bb934b47c865f9a0692e66b25cc8a6ba2ebb3',
  'apps/web/src/workers/sim.worker.farm.ts': 'f91e6e6bfca57072e57848185ed18610dc35ccc08add74209a4a8d0440c12feb',
  'apps/web/src/workers/sim.worker.narrativeFarm.ts': '08c0eb03e40e111b82d4acff16ecfc87bdcb132b419e7b41d83b5f751b22e720',
  'apps/web/src/workers/snapshot.ts': '6b21675a600ca24d23bfcd13aa860dad3cbbc73a3fd48774e63ad56d7612a840',
} as const;
const DIRECT_BASELINE_PRODUCTION_SHA256 = {
  'apps/web/src/workers/sim.worker.helpers.ts': '79bd367a80603185a2f73c8138883e31ff8d5c731e676ec11390789bc96f7aa4',
  'packages/sim-core/src/narrative/newsFeed.ts': 'a6f66ec5027a68ac624d9bdea9bdb5d4aaa4a800ff8a8b7af224270eeab4144c',
  'apps/web/src/workers/sim.worker.farm.ts': 'd01af0d469cbf27680b08c9618951256951958606f81cdf7ec9d3e81fcc8ab43',
  'apps/web/src/workers/sim.worker.narrativeFarm.ts': '6941c1802f2b7455639fc8020d3b58ee5a4c44b67d9d463bbfda820ed7b0b9d7',
  'apps/web/src/workers/snapshot.ts': '6b21675a600ca24d23bfcd13aa860dad3cbbc73a3fd48774e63ad56d7612a840',
} as const;
const DIRECT_INPUTS = {
  post15: {
    raw: '043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e',
    envelope: 'a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca',
  },
  season30Input: {
    raw: '3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3',
    envelope: '4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0',
  },
} as const;
const DIRECT_ROOT_IDS = [
  'freeAgencyPayrolls',
  'deduplicateNews',
  'recordProspectBondDebuts',
  'applySeasonEndPlayerMicroArcMoments',
] as const;
const HEX_64 = /^[a-f0-9]{64}$/;

type DirectMode = 'import_probe' | 'rph';
type DirectVariant = 'baseline' | 'successor';
type DirectDataAge = keyof typeof DIRECT_INPUTS;

interface DirectEnvironment {
  mode: DirectMode;
  baselineRoot: string;
  successorRoot: string;
  cacheRoot: string;
  candidate: {
    parent: string;
    commit: string;
    tree: string;
    fileSha256: string;
    binaryDiffSha256: string;
  };
  inputs: Record<DirectDataAge, string> | null;
}

function directSha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function directStableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(directStableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => (
      `${JSON.stringify(key)}:${directStableJson((value as Record<string, unknown>)[key])}`
    )).join(',')}}`;
  }
  return JSON.stringify(value);
}

function directDigest(value: unknown): string {
  return directSha256(directStableJson(value));
}

function directAssert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Goal 32 direct: ${message}`);
}

function directValue(
  environment: Record<string, string | undefined>,
  key: string,
): string {
  const value = environment[key];
  directAssert(typeof value === 'string' && value.length > 0, `missing ${key}`);
  return value;
}

function directExactKeys(value: Record<string, unknown>, keys: readonly string[], label: string): void {
  directAssert(Object.keys(value).join('\u0000') === keys.join('\u0000'), `${label} keys are not exact`);
}

/** Explicitly parses every direct variable; absent mode leaves ordinary tests inert. */
export function parseGoal32DirectEnvironment(
  environment: Record<string, string | undefined> = process.env,
): DirectEnvironment | null {
  const mode = environment[DIRECT_MODE_KEY];
  const supplied = Object.keys(environment).filter((key) => key.startsWith(DIRECT_PREFIX));
  if (mode === undefined) {
    directAssert(supplied.length === 0, 'direct variables require MBD_GOAL32_DIRECT_MODE');
    return null;
  }
  directAssert(mode === 'import_probe' || mode === 'rph', 'MBD_GOAL32_DIRECT_MODE must be import_probe or rph');
  const common = [
    DIRECT_MODE_KEY,
    'MBD_GOAL32_DIRECT_BASELINE_ROOT',
    'MBD_GOAL32_DIRECT_SUCCESSOR_ROOT',
    'MBD_GOAL32_DIRECT_CACHE_ROOT',
    'MBD_GOAL32_DIRECT_CANDIDATE_PARENT',
    'MBD_GOAL32_DIRECT_CANDIDATE_COMMIT',
    'MBD_GOAL32_DIRECT_CANDIDATE_TREE',
    'MBD_GOAL32_DIRECT_CANDIDATE_FILE_SHA256',
    'MBD_GOAL32_DIRECT_CANDIDATE_BINARY_DIFF_SHA256',
  ];
  const required = mode === 'rph'
    ? [...common, 'MBD_GOAL32_DIRECT_POST15', 'MBD_GOAL32_DIRECT_SEASON30_INPUT']
    : common;
  directAssert(supplied.length === required.length && supplied.every((key) => required.includes(key)),
    `${mode} direct environment has missing, extra, or mode-incompatible values`);
  const candidate = {
    parent: directValue(environment, 'MBD_GOAL32_DIRECT_CANDIDATE_PARENT'),
    commit: directValue(environment, 'MBD_GOAL32_DIRECT_CANDIDATE_COMMIT'),
    tree: directValue(environment, 'MBD_GOAL32_DIRECT_CANDIDATE_TREE'),
    fileSha256: directValue(environment, 'MBD_GOAL32_DIRECT_CANDIDATE_FILE_SHA256'),
    binaryDiffSha256: directValue(environment, 'MBD_GOAL32_DIRECT_CANDIDATE_BINARY_DIFF_SHA256'),
  };
  directAssert(candidate.parent === DIRECT_PARENT, 'candidate parent is not the fresh direct seed');
  for (const [label, value] of Object.entries(candidate)) {
    directAssert(HEX_64.test(value), `candidate ${label} is not a SHA-256/Git object id`);
  }
  return {
    mode,
    baselineRoot: directValue(environment, 'MBD_GOAL32_DIRECT_BASELINE_ROOT'),
    successorRoot: directValue(environment, 'MBD_GOAL32_DIRECT_SUCCESSOR_ROOT'),
    cacheRoot: directValue(environment, 'MBD_GOAL32_DIRECT_CACHE_ROOT'),
    candidate,
    inputs: mode === 'rph'
      ? {
        post15: directValue(environment, 'MBD_GOAL32_DIRECT_POST15'),
        season30Input: directValue(environment, 'MBD_GOAL32_DIRECT_SEASON30_INPUT'),
      }
      : null,
  };
}

function directNativeRoot(root: string, label: string): string {
  const absolute = path.resolve(root);
  const stat = lstatSync(absolute);
  directAssert(stat.isDirectory() && !stat.isSymbolicLink(), `${label} is not a native directory`);
  const real = realpathSync.native(absolute);
  directAssert(real === absolute, `${label} is not a canonical non-symlink root`);
  return real;
}

function directWithin(child: string, root: string): boolean {
  const relative = path.relative(root, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

function directGit(root: string, args: string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
}

interface DirectIdentity {
  root: string;
  revision: string;
  tree: string;
  parent: string;
  productionSha256: Record<string, string>;
}

function directAssertRoot(
  root: string,
  variant: DirectVariant,
  environment: DirectEnvironment,
): DirectIdentity {
  const canonical = directNativeRoot(root, variant);
  const expected = variant === 'baseline'
    ? DIRECT_BASELINE
    : { revision: environment.candidate.commit, tree: environment.candidate.tree, parent: environment.candidate.parent };
  directAssert(directGit(canonical, ['rev-parse', 'HEAD']) === expected.revision, `${variant} HEAD changed`);
  directAssert(directGit(canonical, ['rev-parse', 'HEAD^{tree}']) === expected.tree, `${variant} tree changed`);
  directAssert(directGit(canonical, ['rev-parse', 'HEAD^']) === expected.parent, `${variant} parent changed`);
  directAssert(directGit(canonical, ['show', '-s', '--format=%P', 'HEAD']) === expected.parent, `${variant} commit does not have the exact sole parent`);
  directAssert(directGit(canonical, ['status', '--porcelain=v1', '--untracked-files=all']) === '', `${variant} root is dirty`);
  if (variant === 'successor') {
    directAssert(directGit(canonical, ['diff', '--name-only', environment.candidate.parent, environment.candidate.commit])
      === 'apps/web/src/workers/econLongSoak.test.ts', 'candidate changes more than the proof file');
    const candidateBytes = readFileSync(path.join(canonical, 'apps/web/src/workers/econLongSoak.test.ts'));
    directAssert(directSha256(candidateBytes) === environment.candidate.fileSha256, 'candidate file SHA-256 mismatch');
    const binaryDiff = execFileSync('git', ['-C', canonical, 'diff', '--binary', environment.candidate.parent, environment.candidate.commit,
      '--', 'apps/web/src/workers/econLongSoak.test.ts']);
    directAssert(directSha256(binaryDiff) === environment.candidate.binaryDiffSha256, 'candidate binary-diff SHA-256 mismatch');
  }
  const expectedHashes = variant === 'baseline' ? DIRECT_BASELINE_PRODUCTION_SHA256 : DIRECT_SUCCESSOR_PRODUCTION_SHA256;
  const productionSha256: Record<string, string> = {};
  for (const [relative, expectedHash] of Object.entries(expectedHashes)) {
    const absolute = path.join(canonical, relative);
    directAssert(directWithin(absolute, canonical), `production path escaped ${variant} root`);
    directAssert(lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink(), `${relative} is not a native source file`);
    const actualHash = directSha256(readFileSync(absolute));
    directAssert(actualHash === expectedHash, `${variant} frozen source changed: ${relative}`);
    productionSha256[relative] = actualHash;
  }
  return { root: canonical, revision: expected.revision, tree: expected.tree, parent: expected.parent, productionSha256 };
}

function directAssertIdentities(environment: DirectEnvironment): { baseline: DirectIdentity; successor: DirectIdentity } {
  const baseline = directAssertRoot(environment.baselineRoot, 'baseline', environment);
  const successor = directAssertRoot(environment.successorRoot, 'successor', environment);
  directAssert(baseline.root !== successor.root, 'baseline and successor roots are identical');
  directAssert(!directWithin(baseline.root, successor.root) && !directWithin(successor.root, baseline.root), 'composition roots overlap');
  const cache = directNativeRoot(environment.cacheRoot, 'external cache');
  directAssert(!directWithin(cache, baseline.root) && !directWithin(cache, successor.root)
    && !directWithin(baseline.root, cache) && !directWithin(successor.root, cache), 'cache root is not external');
  return { baseline, successor };
}

function directSnapshotWithoutRng(snapshot: Record<string, unknown>): Record<string, unknown> {
  const { rng: _rng, ...withoutRng } = snapshot;
  return withoutRng;
}

interface DirectCheckpoint {
  raw: string;
  rawSha256: string;
  envelopeDigest: string;
  snapshot: Record<string, unknown>;
}

function directCheckpoint(file: string, dataAge: DirectDataAge): DirectCheckpoint {
  const absolute = path.resolve(file);
  const stat = lstatSync(absolute);
  directAssert(stat.isFile() && !stat.isSymbolicLink(), `${dataAge} checkpoint is not a regular native file`);
  const raw = readFileSync(absolute, 'utf8');
  const expected = DIRECT_INPUTS[dataAge];
  directAssert(directSha256(raw) === expected.raw, `${dataAge} raw checkpoint hash mismatch`);
  const envelope = JSON.parse(raw) as Record<string, unknown>;
  directAssert(envelope !== null && typeof envelope === 'object', `${dataAge} envelope is not an object`);
  directAssert(typeof envelope.envelopeDigest === 'string' && HEX_64.test(envelope.envelopeDigest), `${dataAge} envelope digest is invalid`);
  directAssert(envelope.envelopeDigest === expected.envelope, `${dataAge} envelope digest mismatch`);
  directAssert(envelope.snapshot !== null && typeof envelope.snapshot === 'object', `${dataAge} envelope omits snapshot`);
  // Producer digest excludes exactly envelopeDigest. Snapshot remains part of the authenticated projection.
  const { envelopeDigest, ...producerProjection } = envelope;
  directAssert(directDigest(producerProjection) === envelopeDigest, `${dataAge} producer envelope digest does not authenticate snapshot`);
  return { raw, rawSha256: expected.raw, envelopeDigest, snapshot: envelope.snapshot as Record<string, unknown> };
}

interface DirectContext {
  identity: DirectIdentity;
  close(): Promise<void>;
  resolve(specifier: string): Promise<string>;
  load(specifier: string): Promise<Record<string, unknown>>;
}

async function directOpenContext(identity: DirectIdentity, cacheRoot: string, ordinal: number): Promise<DirectContext> {
  // Dynamic loading is intentionally inside the direct lane; ordinary discovery never imports Vite.
  const { createServer } = await import('vite');
  const root = identity.root;
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'error',
    cacheDir: path.join(cacheRoot, `goal32-direct-vite-${ordinal}`),
    server: { fs: { allow: [root] } },
    resolve: {
      alias: {
        '@': path.join(root, 'apps/web/src'),
        '@mbd/contracts': path.join(root, 'packages/contracts/src/index.ts'),
        '@mbd/design-tokens': path.join(root, 'packages/design-tokens/src/index.ts'),
        '@mbd/sim-core': path.join(root, 'packages/sim-core/src/index.ts'),
        '@mbd/ui': path.join(root, 'packages/ui/src/index.ts'),
      },
    },
  });
  const resolve = async (specifier: string): Promise<string> => {
    const resolved = await server.pluginContainer.resolveId(specifier, undefined, { ssr: true });
    directAssert(resolved?.id, `Vite did not resolve ${specifier}`);
    const id = realpathSync.native(resolved.id.split('?')[0]!);
    directAssert(directWithin(id, root), `Vite resolved ${specifier} outside the intended root`);
    return id;
  };
  return {
    identity,
    async close() { await server.close(); },
    resolve,
    async load(specifier: string) {
      await resolve(specifier);
      return server.ssrLoadModule(specifier) as Promise<Record<string, unknown>>;
    },
  };
}

const DIRECT_MODULES = {
  helper: '/apps/web/src/workers/sim.worker.helpers.ts',
  news: '/packages/sim-core/src/narrative/newsFeed.ts',
  farm: '/apps/web/src/workers/sim.worker.farm.ts',
  narrative: '/apps/web/src/workers/sim.worker.narrativeFarm.ts',
  snapshot: '/apps/web/src/workers/snapshot.ts',
} as const;

async function directAssertModuleSources(context: DirectContext): Promise<Record<keyof typeof DIRECT_MODULES, string>> {
  const resolved = {} as Record<keyof typeof DIRECT_MODULES, string>;
  for (const [key, specifier] of Object.entries(DIRECT_MODULES) as Array<[keyof typeof DIRECT_MODULES, string]>) {
    const moduleId = await context.resolve(specifier);
    const relative = path.relative(context.identity.root, moduleId).split(path.sep).join('/');
    const expected = context.identity.productionSha256[relative];
    directAssert(expected !== undefined, `resolved module ${relative} is not an authenticated production source`);
    directAssert(directSha256(readFileSync(moduleId)) === expected, `resolved source bytes changed: ${relative}`);
    resolved[key] = moduleId;
  }
  return resolved;
}

function directMeasure<T>(id: (typeof DIRECT_ROOT_IDS)[number], ordinal: number, invoke: () => T) {
  const start = process.hrtime.bigint();
  const value = invoke();
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  directAssert(Number.isFinite(elapsedMs) && elapsedMs >= 0, `${id} elapsed time is invalid`);
  return { value, row: { id, ordinal, callCount: 1, elapsedMs } };
}

interface DirectRecord {
  schema: string;
  goal: string;
  ordinal: number;
  variant: DirectVariant;
  dataAge: DirectDataAge;
  checkpoint: { rawSha256: string; envelopeDigest: string; preSnapshotDigest: string; preStateDigest: string; preRngDigest: string; roundTripSnapshotDigest: string; roundTripStateDigest: string; roundTripRngDigest: string };
  sourceIdentity: { root: string; parent: string; revision: string; tree: string; productionDigest: string };
  moduleSourceDigests: Record<keyof typeof DIRECT_MODULES, string>;
  roots: Array<{ id: (typeof DIRECT_ROOT_IDS)[number]; ordinal: number; callCount: number; elapsedMs: number; resultDigest: string }>;
  factualDigests: { payroll: string; news: string; prospectBonds: string; playerMicroArcs: string };
  finalSnapshotDigest: string;
  stateDigest: string;
  rngDigest: string;
  semanticDigest: string;
}

function directAssertRecord(
  record: DirectRecord,
  descriptor: { ordinal: number; variant: DirectVariant; dataAge: DirectDataAge },
  identity: DirectIdentity,
): void {
  directExactKeys(record as unknown as Record<string, unknown>, [
    'schema', 'goal', 'ordinal', 'variant', 'dataAge', 'checkpoint', 'sourceIdentity', 'moduleSourceDigests', 'roots', 'factualDigests', 'finalSnapshotDigest', 'stateDigest', 'rngDigest', 'semanticDigest',
  ], 'direct record');
  directAssert(record.schema === 'mbd.goal32.direct.v1' && record.goal === 'ECON-LATE-HORIZON-HISTORY-PERF-1', 'record schema/goal mismatch');
  directAssert(record.ordinal === descriptor.ordinal && record.variant === descriptor.variant && record.dataAge === descriptor.dataAge,
    'record descriptor identity mismatch');
  directExactKeys(record.checkpoint, ['rawSha256', 'envelopeDigest', 'preSnapshotDigest', 'preStateDigest', 'preRngDigest', 'roundTripSnapshotDigest', 'roundTripStateDigest', 'roundTripRngDigest'], 'checkpoint');
  directAssert(record.checkpoint.rawSha256 === DIRECT_INPUTS[descriptor.dataAge].raw
    && record.checkpoint.envelopeDigest === DIRECT_INPUTS[descriptor.dataAge].envelope, 'record checkpoint identity mismatch');
  directAssert(record.checkpoint.preSnapshotDigest === record.checkpoint.roundTripSnapshotDigest
    && record.checkpoint.preStateDigest === record.checkpoint.roundTripStateDigest
    && record.checkpoint.preRngDigest === record.checkpoint.roundTripRngDigest, 'checkpoint round-trip facts mismatch');
  directExactKeys(record.sourceIdentity, ['root', 'parent', 'revision', 'tree', 'productionDigest'], 'source identity');
  directAssert(record.sourceIdentity.root === identity.root && record.sourceIdentity.parent === identity.parent
    && record.sourceIdentity.revision === identity.revision && record.sourceIdentity.tree === identity.tree
    && record.sourceIdentity.productionDigest === directDigest(identity.productionSha256), 'record source identity mismatch');
  directExactKeys(record.moduleSourceDigests, ['helper', 'news', 'farm', 'narrative', 'snapshot'], 'module source digests');
  const expectedModuleDigests = {
    helper: identity.productionSha256['apps/web/src/workers/sim.worker.helpers.ts'],
    news: identity.productionSha256['packages/sim-core/src/narrative/newsFeed.ts'],
    farm: identity.productionSha256['apps/web/src/workers/sim.worker.farm.ts'],
    narrative: identity.productionSha256['apps/web/src/workers/sim.worker.narrativeFarm.ts'],
    snapshot: identity.productionSha256['apps/web/src/workers/snapshot.ts'],
  };
  directAssert(directStableJson(record.moduleSourceDigests) === directStableJson(expectedModuleDigests), 'module source bytes mismatch');
  directAssert(record.roots.length === DIRECT_ROOT_IDS.length, 'record root count mismatch');
  for (let index = 0; index < DIRECT_ROOT_IDS.length; index += 1) {
    const row = record.roots[index]!;
    directExactKeys(row as unknown as Record<string, unknown>, ['id', 'ordinal', 'callCount', 'elapsedMs', 'resultDigest'], `root ${index + 1}`);
    directAssert(row.id === DIRECT_ROOT_IDS[index] && row.ordinal === index + 1 && row.callCount === 1
      && Number.isFinite(row.elapsedMs) && row.elapsedMs >= 0 && HEX_64.test(row.resultDigest), `root ${index + 1} is invalid`);
  }
  directExactKeys(record.factualDigests, ['payroll', 'news', 'prospectBonds', 'playerMicroArcs'], 'factual digests');
  directAssert([...Object.values(record.factualDigests), record.finalSnapshotDigest, record.stateDigest, record.rngDigest, record.semanticDigest]
    .every((digest) => HEX_64.test(digest)), 'semantic record digest is malformed');
  directAssert(record.roots.every((row, index) => row.resultDigest === Object.values(record.factualDigests)[index]),
    'root result digest does not bind its factual result');
  directAssert(record.semanticDigest === directDigest({
    factualDigests: record.factualDigests,
    stateDigest: record.stateDigest,
    rngDigest: record.rngDigest,
  }), 'semantic digest does not bind factual/final-state/RNG facts');
}

class DirectCollector {
  private readonly records: DirectRecord[] = [];

  constructor(private readonly identities: { baseline: DirectIdentity; successor: DirectIdentity }) {}

  accept(record: DirectRecord, descriptor: { ordinal: number; variant: DirectVariant; dataAge: DirectDataAge }): void {
    directAssert(this.records.length === descriptor.ordinal - 1, 'record is missing, duplicate, extra, or reordered');
    directAssertRecord(record, descriptor, this.identities[descriptor.variant]);
    this.records.push(record);
  }

  finish(): readonly DirectRecord[] {
    directAssert(this.records.length === 4, 'collector did not receive exactly four records');
    for (const [left, right] of [[0, 1], [2, 3]] as const) {
      const baseline = this.records[left]!;
      const successor = this.records[right]!;
      directAssert(baseline.variant === 'baseline' && successor.variant === 'successor' && baseline.dataAge === successor.dataAge,
        'collector pair identity swapped');
      directAssert(directStableJson(baseline.checkpoint) === directStableJson(successor.checkpoint), 'pre-state/checkpoint parity failed');
      directAssert(directStableJson(baseline.factualDigests) === directStableJson(successor.factualDigests), 'factual parity failed');
      directAssert(baseline.finalSnapshotDigest === successor.finalSnapshotDigest
        && baseline.stateDigest === successor.stateDigest && baseline.rngDigest === successor.rngDigest
        && baseline.semanticDigest === successor.semanticDigest, 'final-state/RNG semantic parity failed');
    }
    return this.records;
  }
}

function directHostileCollectorControls(
  records: readonly DirectRecord[],
  identities: { baseline: DirectIdentity; successor: DirectIdentity },
): void {
  const descriptors = [
    { ordinal: 1, variant: 'baseline' as const, dataAge: 'post15' as const },
    { ordinal: 2, variant: 'successor' as const, dataAge: 'post15' as const },
    { ordinal: 3, variant: 'baseline' as const, dataAge: 'season30Input' as const },
    { ordinal: 4, variant: 'successor' as const, dataAge: 'season30Input' as const },
  ];
  const hostile = (mutate: (rows: DirectRecord[]) => DirectRecord[]) => {
    const collector = new DirectCollector(identities);
    const rows = mutate(structuredClone(records) as DirectRecord[]);
    let rejected = false;
    try {
      rows.forEach((row, index) => collector.accept(row, descriptors[index]!));
      collector.finish();
    } catch {
      rejected = true;
    }
    directAssert(rejected, 'otherwise-valid hostile record passed the real collector');
  };
  hostile((rows) => rows.slice(1));
  hostile((rows) => [...rows, structuredClone(rows[3]!) as DirectRecord]);
  hostile((rows) => [rows[1]!, rows[0]!, rows[2]!, rows[3]!]);
  hostile((rows) => rows.map((row, index) => index === 1 ? { ...row, sourceIdentity: { ...row.sourceIdentity, revision: DIRECT_BASELINE.revision } } : row));
  hostile((rows) => rows.map((row, index) => index === 3 ? { ...row, semanticDigest: directSha256('altered-semantic') } : row));
}

async function directRunDescriptor(
  environment: DirectEnvironment,
  identity: DirectIdentity,
  variant: DirectVariant,
  dataAge: DirectDataAge,
  ordinal: number,
): Promise<DirectRecord> {
  directAssert(environment.inputs !== null, 'R/P/H mode requires authenticated inputs');
  const checkpoint = directCheckpoint(environment.inputs[dataAge], dataAge);
  const context = await directOpenContext(identity, environment.cacheRoot, ordinal);
  try {
    const moduleIds = await directAssertModuleSources(context);
    const [helper, news, farm, narrative, snapshot] = await Promise.all([
      context.load(DIRECT_MODULES.helper), context.load(DIRECT_MODULES.news), context.load(DIRECT_MODULES.farm), context.load(DIRECT_MODULES.narrative), context.load(DIRECT_MODULES.snapshot),
    ]);
    const importSnapshot = snapshot.importGameSnapshot as (input: unknown) => any;
    const exportSnapshot = snapshot.exportGameSnapshot as (state: any) => Record<string, unknown>;
    directAssert(typeof importSnapshot === 'function' && typeof exportSnapshot === 'function', 'snapshot API did not resolve');
    const state = importSnapshot(structuredClone(checkpoint.snapshot));
    const preSnapshot = exportSnapshot(state);
    const preStateDigest = directDigest(directSnapshotWithoutRng(preSnapshot));
    const preRngDigest = directDigest(preSnapshot.rng);
    const roundTripSnapshot = exportSnapshot(importSnapshot(structuredClone(preSnapshot)));
    directAssert(directStableJson(roundTripSnapshot) === directStableJson(preSnapshot), 'checkpoint import/export bytes changed');
    const payroll = directMeasure('freeAgencyPayrolls', 1, () => (helper.buildFreeAgencyPayrolls as Function)(state, 'autonomous_league'));
    const deduplicated = directMeasure('deduplicateNews', 2, () => (news.deduplicateNews as Function)(state.news));
    const debuts = directMeasure('recordProspectBondDebuts', 3, () => (farm.recordProspectBondDebuts as Function)(state));
    const moments = directMeasure('applySeasonEndPlayerMicroArcMoments', 4, () => (narrative.applySeasonEndPlayerMicroArcMoments as Function)(state));
    const factualDigests = {
      payroll: directDigest(Array.from((payroll.value as Map<unknown, unknown>).entries())),
      news: directDigest(deduplicated.value),
      prospectBonds: directDigest({ returnedPlayerIds: debuts.value, bonds: state.prospectBonds }),
      playerMicroArcs: directDigest(Array.from(state.playerMoments.entries())),
    };
    const rows = [payroll, deduplicated, debuts, moments].map(({ row }, index) => ({
      ...row,
      resultDigest: Object.values(factualDigests)[index]!,
    }));
    const finalSnapshot = exportSnapshot(state);
    const stateDigest = directDigest(directSnapshotWithoutRng(finalSnapshot));
    const rngDigest = directDigest(finalSnapshot.rng);
    directAssertIdentities(environment); // recheck all root/head/tree/clean/source identities after mutation work.
    return {
      schema: 'mbd.goal32.direct.v1',
      goal: 'ECON-LATE-HORIZON-HISTORY-PERF-1',
      ordinal,
      variant,
      dataAge,
      checkpoint: {
        rawSha256: checkpoint.rawSha256,
        envelopeDigest: checkpoint.envelopeDigest,
        preSnapshotDigest: directDigest(preSnapshot),
        preStateDigest,
        preRngDigest,
        roundTripSnapshotDigest: directDigest(roundTripSnapshot),
        roundTripStateDigest: directDigest(directSnapshotWithoutRng(roundTripSnapshot)),
        roundTripRngDigest: directDigest(roundTripSnapshot.rng),
      },
      sourceIdentity: {
        root: identity.root,
        parent: identity.parent,
        revision: identity.revision,
        tree: identity.tree,
        productionDigest: directDigest(identity.productionSha256),
      },
      moduleSourceDigests: Object.fromEntries(Object.entries(moduleIds).map(([key, moduleId]) => [key, directSha256(readFileSync(moduleId))])) as Record<keyof typeof DIRECT_MODULES, string>,
      roots: rows,
      factualDigests,
      finalSnapshotDigest: directDigest(finalSnapshot),
      stateDigest,
      rngDigest,
      semanticDigest: directDigest({ factualDigests, stateDigest, rngDigest }),
    };
  } finally {
    await context.close();
  }
}

async function runGoal32Direct(environment: DirectEnvironment): Promise<void> {
  const identities = directAssertIdentities(environment);
  if (environment.mode === 'import_probe') {
    const baseline = await directOpenContext(identities.baseline, environment.cacheRoot, 1);
    const successor = await directOpenContext(identities.successor, environment.cacheRoot, 2);
    try {
      await Promise.all([directAssertModuleSources(baseline), directAssertModuleSources(successor)]);
    } finally {
      await Promise.all([baseline.close(), successor.close()]);
    }
    directAssertIdentities(environment);
    return;
  }
  const descriptors = [
    { identity: identities.baseline, variant: 'baseline' as const, dataAge: 'post15' as const },
    { identity: identities.successor, variant: 'successor' as const, dataAge: 'post15' as const },
    { identity: identities.baseline, variant: 'baseline' as const, dataAge: 'season30Input' as const },
    { identity: identities.successor, variant: 'successor' as const, dataAge: 'season30Input' as const },
  ];
  const collector = new DirectCollector(identities);
  for (const [index, descriptor] of descriptors.entries()) {
    const record = await directRunDescriptor(environment, descriptor.identity, descriptor.variant, descriptor.dataAge, index + 1);
    collector.accept(record, { ordinal: index + 1, variant: descriptor.variant, dataAge: descriptor.dataAge });
  }
  const records = collector.finish();
  directHostileCollectorControls(records, identities);
  const totals = [records.slice(0, 2), records.slice(2, 4)].map((pair) => pair.map((record) => (
    record.roots.reduce((sum, row) => sum + row.elapsedMs, 0)
  )));
  const D15 = Math.floor(totals[0]![0]! - totals[0]![1]!);
  const D30 = Math.floor(totals[1]![0]! - totals[1]![1]!);
  const R = (22 * D15) + (16 * D30);
  const P = 2_948_890 - R;
  const H = 1_938_000;
  directAssert(D15 >= 0 && D30 >= 0 && R >= 1_010_890 && P <= H,
    `R/P/H threshold failed: D15=${D15}, D30=${D30}, R=${R}, P=${P}, H=${H}`);
  directAssertIdentities(environment);
}

export function parseEnvironment(environment: Record<string, string | undefined> = process.env) {
  const mode = environment.MBD_ECON_LONG_SOAK_MODE;
  if (mode !== 'measurement' && mode !== 'strict' && mode !== ECON_LONG_SOAK_DIAGNOSTIC_MODE) {
    throw new Error('MBD_ECON_LONG_SOAK_MODE must be measurement, strict, or diagnostic_inherited_candidates.');
  }
  const seed = Number(environment.MBD_ECON_LONG_SOAK_SEED);
  if (!Number.isInteger(seed) || !(ECON_LONG_SOAK_SEEDS as readonly number[]).includes(seed)) {
    throw new Error('MBD_ECON_LONG_SOAK_SEED must be exactly one allowlisted seed (7111..7114).');
  }
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE
    && !(ECON_LONG_SOAK_CALIBRATION_SEEDS as readonly number[]).includes(seed)) {
    throw new Error('Diagnostic mode accepts exactly one calibration seed (7111..7113); seed 7114 remains held out.');
  }
  const requestedSmokeHorizon = Number(environment.MBD_ECON_LONG_SOAK_TEST_HORIZON);
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE
    && Number.isInteger(requestedSmokeHorizon)
    && requestedSmokeHorizon !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Diagnostic mode requires the exact ${ECON_LONG_SOAK_HORIZON}-season horizon.`);
  }
  const horizon = mode === 'measurement'
    && Number.isInteger(requestedSmokeHorizon)
    && requestedSmokeHorizon >= 1
    && requestedSmokeHorizon < ECON_LONG_SOAK_HORIZON
    ? requestedSmokeHorizon
    : ECON_LONG_SOAK_HORIZON;
  const sourceRevision = environment.MBD_ECON_LONG_SOAK_SOURCE_REVISION ?? 'UNSPECIFIED';
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE && sourceRevision === 'UNSPECIFIED') {
    throw new Error('Diagnostic mode requires MBD_ECON_LONG_SOAK_SOURCE_REVISION to be the exact source revision.');
  }
  return {
    mode: mode as EconLongSoakMode,
    seed: seed as EconLongSoakSeed,
    horizon,
    sourceRevision,
    out: environment.MBD_ECON_LONG_SOAK_OUT,
  };
}

describe('ECON-LONG-SOAK-1 real-worker receipt harness', () => {
  it('parses only the three explicit modes and fences diagnostic seeds/horizon', () => {
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: 'other',
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/measurement, strict, or diagnostic/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: 'diagnostic_fa_entry_only',
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/diagnostic_inherited_candidates/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7114',
    })).toThrow(/held out/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7111',
      MBD_ECON_LONG_SOAK_TEST_HORIZON: '1',
    })).toThrow(/30-season/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/SOURCE_REVISION/);
    expect(parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7113',
      MBD_ECON_LONG_SOAK_SOURCE_REVISION: 'dd505e1',
    })).toMatchObject({ mode: ECON_LONG_SOAK_DIAGNOSTIC_MODE, seed: 7113, horizon: 30 });
  });

  it('uses a real macrotask yield and emits exact out-of-band progress markers', async () => {
    let timerServiced = false;
    setTimeout(() => { timerServiced = true; }, 0);
    await Promise.resolve();
    expect(timerServiced).toBe(false);
    await yieldEconLongSoakMacrotask();
    expect(timerServiced).toBe(true);

    const markers: EconLongSoakProgressMarker[] = [];
    const canonicalResult = { row: 16, digest: 'canonical' };
    const withoutProgress = await runEconLongSoakSeasonBoundary(
      'primary',
      16,
      undefined,
      () => canonicalResult,
    );
    const withProgress = await runEconLongSoakSeasonBoundary(
      'replay',
      16,
      (marker) => markers.push(marker),
      () => canonicalResult,
    );
    expect(markers).toEqual([
      { phase: 'replay', status: 'start', seasonIndex: 16 },
      { phase: 'replay', status: 'complete', seasonIndex: 16 },
    ]);
    expect(Object.keys(markers[0]!).sort()).toEqual(['phase', 'seasonIndex', 'status']);
    expect(stableJson(withProgress)).toBe(stableJson(withoutProgress));
    expect(sha256(withProgress)).toBe(sha256(withoutProgress));
  });

  it('streams exact replay rows and preserves the canonical suffix digest definition', () => {
    const primaryRows = Array.from({ length: ECON_LONG_SOAK_HORIZON }, (_, index) => ({
      seasonIndex: index + 1,
      canonical: `row-${index + 1}`,
    }));
    for (let index = 16; index <= ECON_LONG_SOAK_HORIZON; index += 1) {
      assertExactStreamingReplayRow(primaryRows[index - 1], structuredClone(primaryRows[index - 1]), index);
    }
    expect(() => assertExactStreamingReplayRow(
      primaryRows[20],
      { ...primaryRows[20], canonical: 'mutated' },
      21,
    )).toThrow(/row 21 byte-for-byte/);
    expect(buildStreamingReplayDigest(primaryRows)).toBe(sha256(primaryRows.slice(15)));
    expect(plannedV35RoundTripSeasons(ECON_LONG_SOAK_HORIZON)).toEqual([10, 15, 20, 30]);
    expect(plannedV35RoundTripSeasons(2)).toEqual([2]);
  });

  longSoakIt('runs exactly one allowlisted seed through autonomous production lifecycle', async () => {
    const env = parseEnvironment();
    const progress: EconLongSoakProgressMarker[] = [];
    const receipt = await runEconLongSoak({
      ...env,
      onProgress: (marker) => {
        progress.push(marker);
        process.stderr.write(`${stableJson(marker)}\n`);
      },
    });
    if (env.mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE) {
      assertEconLongSoakDiagnosticReceipt(receipt, env.sourceRevision);
    } else {
      assertEconLongSoakReceipt(receipt, {
        allowSmokeHorizon: env.horizon < ECON_LONG_SOAK_HORIZON,
        enforceInheritedCandidates: env.horizon === ECON_LONG_SOAK_HORIZON,
      });
    }
    expect(receipt.content.seed).toBe(env.seed);
    expect(receipt.content.rows).toHaveLength(env.horizon);
    expect(receipt.content.rows.every((row) => row.nextSeason === row.completedSeason + 1)).toBe(true);
    const expectedProgress: EconLongSoakProgressMarker[] = [];
    for (let seasonIndex = 1; seasonIndex <= env.horizon; seasonIndex += 1) {
      expectedProgress.push(
        { phase: 'primary', status: 'start', seasonIndex },
        { phase: 'primary', status: 'complete', seasonIndex },
      );
    }
    if (env.horizon === ECON_LONG_SOAK_HORIZON) {
      for (let seasonIndex = 16; seasonIndex <= ECON_LONG_SOAK_HORIZON; seasonIndex += 1) {
        expectedProgress.push(
          { phase: 'replay', status: 'start', seasonIndex },
          { phase: 'replay', status: 'complete', seasonIndex },
        );
      }
    }
    expect(progress).toEqual(expectedProgress);
    expect(Object.prototype.hasOwnProperty.call(receipt.content, 'progress')).toBe(false);
    if (env.out) writeFileSync(env.out, `${stableJson(receipt)}\n`, { encoding: 'utf8', flag: 'wx' });
  }, 2_400_000);
});

describe('Goal 32 direct in-process proof (explicit opt-in only)', () => {
  const directRequested = Object.keys(process.env).some((key) => key.startsWith(DIRECT_PREFIX));
  const directIt = directRequested ? it : it.skip;

  directIt('authenticates isolated roots before importing or measuring any production root', async () => {
    const environment = parseGoal32DirectEnvironment();
    directAssert(environment !== null, 'direct test requires an explicit direct mode');
    await runGoal32Direct(environment);
  }, 2_400_000);
});
