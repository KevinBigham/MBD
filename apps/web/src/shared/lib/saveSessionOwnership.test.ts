// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest';
import {
  SAVE_TREE_LOCK_PREFIX,
  SaveSessionOwnershipCoordinator,
  SaveSessionOwnershipError,
  saveSessionOwnershipFailureMessage,
  saveTreeLockResourceName,
  type WebLockManagerLike,
} from './saveSessionOwnership';

class MemoryWebLockManager implements WebLockManagerLike {
  readonly held = new Set<string>();
  readonly requests: string[] = [];
  rejectNext: Error | null = null;

  async request<T>(
    name: string,
    _options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: { name: string; mode: 'exclusive' } | null) => T | PromiseLike<T>,
  ): Promise<T> {
    this.requests.push(name);
    if (this.rejectNext) {
      const error = this.rejectNext;
      this.rejectNext = null;
      throw error;
    }
    if (this.held.has(name)) {
      return await callback(null);
    }
    this.held.add(name);
    try {
      return await callback({ name, mode: 'exclusive' });
    } finally {
      this.held.delete(name);
    }
  }
}

class DelayedWebLockManager extends MemoryWebLockManager {
  private continueRequest!: () => void;
  readonly requestPaused = new Promise<void>((resolve) => {
    this.continueRequest = resolve;
  });
  private requestSeen!: () => void;
  readonly requestStarted = new Promise<void>((resolve) => {
    this.requestSeen = resolve;
  });

  override async request<T>(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: { name: string; mode: 'exclusive' } | null) => T | PromiseLike<T>,
  ): Promise<T> {
    this.requestSeen();
    await this.requestPaused;
    return super.request(name, options, callback);
  }

  grant(): void {
    this.continueRequest();
  }
}

class SlowReleaseWebLockManager extends MemoryWebLockManager {
  private allowRelease!: () => void;
  private releaseSeen!: () => void;
  readonly releaseStarted = new Promise<void>((resolve) => {
    this.releaseSeen = resolve;
  });
  private readonly releaseGate = new Promise<void>((resolve) => {
    this.allowRelease = resolve;
  });

  override async request<T>(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: { name: string; mode: 'exclusive' } | null) => T | PromiseLike<T>,
  ): Promise<T> {
    return super.request(name, options, async (lock) => {
      const result = await callback(lock);
      if (lock) {
        this.releaseSeen();
        await this.releaseGate;
      }
      return result;
    });
  }

  finishRelease(): void {
    this.allowRelease();
  }
}

const coordinators: SaveSessionOwnershipCoordinator[] = [];

function coordinator(manager: MemoryWebLockManager | null) {
  const instance = new SaveSessionOwnershipCoordinator(() => manager);
  coordinators.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(coordinators.splice(0).map((instance) => instance.dispose()));
});

describe('save session ownership', () => {
  it('uses a stable versioned root-tree resource and rejects non-root identities', () => {
    expect(saveTreeLockResourceName('save-slot-3')).toBe(`${SAVE_TREE_LOCK_PREFIX}save-slot-3`);
    expect(() => saveTreeLockResourceName('branch-3')).toThrowError(
      expect.objectContaining({ kind: 'unknown_tree' }),
    );
  });

  it('grants exactly one coordinator for the same tree and allows retry after release', async () => {
    const manager = new MemoryWebLockManager();
    const first = coordinator(manager);
    const second = coordinator(manager);
    const firstClaim = await first.begin('save-slot-1');

    await expect(second.begin('save-slot-1')).rejects.toMatchObject({
      kind: 'contended',
      rootSaveId: 'save-slot-1',
    });
    expect(manager.held).toEqual(new Set([`${SAVE_TREE_LOCK_PREFIX}save-slot-1`]));

    await first.abort(firstClaim);
    const secondClaim = await second.begin('save-slot-1');
    expect(secondClaim.rootSaveId).toBe('save-slot-1');
    await second.abort(secondClaim);
  });

  it('coalesces simultaneous same-document acquisition and keeps the lock until every claim ends', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    const [first, second] = await Promise.all([
      owner.begin('save-slot-1'),
      owner.begin('save-slot-1'),
    ]);

    expect(manager.requests).toEqual([`${SAVE_TREE_LOCK_PREFIX}save-slot-1`]);
    await owner.abort(first);
    expect(manager.held.has(`${SAVE_TREE_LOCK_PREFIX}save-slot-1`)).toBe(true);
    await owner.abort(second);
    expect(manager.held.size).toBe(0);
  });

  it('returns a referentially stable external-store snapshot until ownership changes', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    const initial = owner.getSnapshot();
    expect(owner.getSnapshot()).toBe(initial);

    const claim = await owner.begin('save-slot-1');
    const acquired = owner.getSnapshot();
    expect(acquired).not.toBe(initial);
    expect(owner.getSnapshot()).toBe(acquired);
    await owner.abort(claim);
  });

  it('does not leak a lock granted after coordinator disposal', async () => {
    const manager = new DelayedWebLockManager();
    const owner = coordinator(manager);
    const acquisition = owner.begin('save-slot-1');
    await manager.requestStarted;

    await owner.dispose();
    manager.grant();

    await expect(acquisition).rejects.toMatchObject({ kind: 'not_owner' });
    expect(manager.held.size).toBe(0);
    expect(owner.getSnapshot().heldRootSaveIds).toEqual([]);
  });

  it('waits for physical release before a fast same-document reacquisition', async () => {
    const manager = new SlowReleaseWebLockManager();
    const owner = coordinator(manager);
    const first = await owner.begin('save-slot-1');
    const release = owner.abort(first);
    await manager.releaseStarted;
    let reacquired = false;
    const reacquisition = owner.begin('save-slot-1').then((claim) => {
      reacquired = true;
      return claim;
    });

    await Promise.resolve();
    expect(reacquired).toBe(false);
    manager.finishRelease();
    await release;
    const second = await reacquisition;
    expect(second.rootSaveId).toBe('save-slot-1');
    expect(manager.requests).toEqual([
      `${SAVE_TREE_LOCK_PREFIX}save-slot-1`,
      `${SAVE_TREE_LOCK_PREFIX}save-slot-1`,
    ]);
    await owner.abort(second);
  });

  it('keeps different root slots independent', async () => {
    const manager = new MemoryWebLockManager();
    const first = coordinator(manager);
    const second = coordinator(manager);
    const firstClaim = await first.begin('save-slot-1');
    const secondClaim = await second.begin('save-slot-2');

    expect(manager.held).toEqual(new Set([
      `${SAVE_TREE_LOCK_PREFIX}save-slot-1`,
      `${SAVE_TREE_LOCK_PREFIX}save-slot-2`,
    ]));
    await first.abort(firstClaim);
    await second.abort(secondClaim);
  });

  it('commits an active tree, borrows it reentrantly, and releases only on explicit active release', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    const candidate = await owner.begin('save-slot-1');
    await owner.commit(candidate, 'branch-alpha');

    expect(owner.getSnapshot()).toMatchObject({
      activeRootSaveId: 'save-slot-1',
      activeSaveId: 'branch-alpha',
      heldRootSaveIds: ['save-slot-1'],
    });
    const borrowed = await owner.begin('save-slot-1');
    await owner.abort(borrowed);
    expect(manager.held.has(`${SAVE_TREE_LOCK_PREFIX}save-slot-1`)).toBe(true);

    await owner.releaseActive();
    expect(manager.held.size).toBe(0);
  });

  it('preserves the outgoing editor when a distinct candidate aborts', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');
    const candidate = await owner.begin('save-slot-2');
    await owner.abort(candidate);

    expect(owner.getSnapshot()).toMatchObject({
      activeRootSaveId: 'save-slot-1',
      activeSaveId: 'save-slot-1',
      heldRootSaveIds: ['save-slot-1'],
    });
  });

  it('activates the candidate before releasing the outgoing root', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');
    const candidate = await owner.begin('save-slot-2');
    await owner.commit(candidate, 'save-slot-2');

    expect(owner.getSnapshot()).toMatchObject({
      activeRootSaveId: 'save-slot-2',
      activeSaveId: 'save-slot-2',
      heldRootSaveIds: ['save-slot-2'],
    });
    expect(manager.held).toEqual(new Set([`${SAVE_TREE_LOCK_PREFIX}save-slot-2`]));
  });

  it('uses transient ownership without disturbing the active tree', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');
    const observed: string[][] = [];

    await owner.withTransientOwnership('save-slot-2', async () => {
      observed.push([...manager.held].sort());
    });

    expect(observed[0]).toEqual([
      `${SAVE_TREE_LOCK_PREFIX}save-slot-1`,
      `${SAVE_TREE_LOCK_PREFIX}save-slot-2`,
    ]);
    expect(owner.getSnapshot().activeRootSaveId).toBe('save-slot-1');
    expect(manager.held).toEqual(new Set([`${SAVE_TREE_LOCK_PREFIX}save-slot-1`]));
  });

  it('does not let a transient destructive action borrow an activation candidate', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');
    const branchCandidate = await owner.begin('save-slot-1');
    const operation = async () => undefined;

    await expect(owner.withTransientOwnership('save-slot-1', operation)).rejects.toMatchObject({
      kind: 'request_failed',
      rootSaveId: 'save-slot-1',
    });
    await owner.abort(branchCandidate);
    await expect(owner.withTransientOwnership('save-slot-1', operation)).resolves.toBeUndefined();
  });

  it('does not let activation borrow a tree from an in-flight transient action', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    let releaseOperation!: () => void;
    let operationStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      operationStarted = resolve;
    });
    const operation = owner.withTransientOwnership('save-slot-2', async () => {
      operationStarted();
      await new Promise<void>((resolve) => {
        releaseOperation = resolve;
      });
    });
    await started;

    await expect(owner.begin('save-slot-2')).rejects.toMatchObject({
      kind: 'request_failed',
      rootSaveId: 'save-slot-2',
    });
    releaseOperation();
    await operation;
    const candidate = await owner.begin('save-slot-2');
    await owner.abort(candidate);
  });

  it.each([
    ['contended', 'open in another tab'],
    ['unavailable', 'unavailable in this browser'],
    ['request_failed', 'could not verify exclusive access'],
    ['unknown_tree', 'could not identify the root save tree'],
    ['not_owner', 'no longer controls'],
  ] as const)('uses honest action copy for %s ownership failures', (kind, expectedCopy) => {
    const error = new SaveSessionOwnershipError(kind, 'internal detail', 'save-slot-2');
    const copy = saveSessionOwnershipFailureMessage(
      error,
      'Slot 2',
      'Nothing was deleted.',
    );

    expect(copy).toContain(expectedCopy);
    expect(copy).toContain('Nothing was deleted.');
    if (kind !== 'contended') {
      expect(copy).not.toContain('is open in another tab');
    }
  });

  it('acquires all roots in stable order and releases every partial claim on contention', async () => {
    const manager = new MemoryWebLockManager();
    const blocker = coordinator(manager);
    const owner = coordinator(manager);
    await blocker.commit(await blocker.begin('save-slot-3'), 'save-slot-3');

    await expect(owner.withAllTransientOwnership(
      ['save-slot-5', 'save-slot-1', 'save-slot-3', 'save-slot-2'],
      async () => undefined,
    )).rejects.toMatchObject({ kind: 'contended', rootSaveId: 'save-slot-3' });

    expect(owner.getSnapshot().heldRootSaveIds).toEqual([]);
    expect(manager.held).toEqual(new Set([`${SAVE_TREE_LOCK_PREFIX}save-slot-3`]));
    expect(manager.requests.slice(1)).toEqual([
      `${SAVE_TREE_LOCK_PREFIX}save-slot-1`,
      `${SAVE_TREE_LOCK_PREFIX}save-slot-2`,
      `${SAVE_TREE_LOCK_PREFIX}save-slot-3`,
    ]);
  });

  it('fails closed when Web Locks is unavailable or the request rejects', async () => {
    const unavailable = coordinator(null);
    await expect(unavailable.begin('save-slot-1')).rejects.toMatchObject({
      kind: 'unavailable',
    });

    const manager = new MemoryWebLockManager();
    manager.rejectNext = new Error('manager exploded');
    const rejected = coordinator(manager);
    await expect(rejected.begin('save-slot-1')).rejects.toMatchObject({
      kind: 'request_failed',
    });
  });

  it('enforces central root and active-editor assertions only after application enablement', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    expect(() => owner.assertRootOwned('save-slot-1')).not.toThrow();
    owner.enableEnforcement();
    expect(() => owner.assertRootOwned('save-slot-1')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );

    const claim = await owner.begin('save-slot-1');
    expect(() => owner.assertRootOwned('save-slot-1')).not.toThrow();
    expect(() => owner.assertActiveOwner()).toThrowError(SaveSessionOwnershipError);
    await owner.commit(claim, 'save-slot-1');
    expect(() => owner.assertActiveOwner()).not.toThrow();
  });

  it('authorizes worker snapshot import only inside an active candidate scope', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    owner.enableEnforcement();
    const claim = await owner.begin('save-slot-1');

    expect(() => owner.assertImportAuthorized()).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    await owner.withImportAuthorization(claim, async () => {
      expect(() => owner.assertImportAuthorized()).not.toThrow();
    });
    expect(() => owner.assertImportAuthorized()).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    await owner.abort(claim);
  });

  it('authorizes newGame only for the exact activation candidate root', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    owner.enableEnforcement();
    const claim = await owner.begin('save-slot-2');

    expect(() => owner.assertNewGameAuthorized('save-slot-2')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    await owner.withNewGameAuthorization(claim, async () => {
      expect(() => owner.assertNewGameAuthorized('save-slot-2')).not.toThrow();
      expect(() => owner.assertNewGameAuthorized('save-slot-1')).toThrowError(
        expect.objectContaining({ kind: 'not_owner' }),
      );
    });
    expect(() => owner.assertNewGameAuthorized('save-slot-2')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    await owner.abort(claim);
  });

  it('separates ordinary active exports from explicit transition import/export scopes', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    owner.enableEnforcement();
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');

    expect(owner.assertSnapshotExportAuthorized('save-slot-1')).toBe('ordinary');
    expect(() => owner.assertSnapshotExportAuthorized('save-slot-2')).toThrowError(
      expect.objectContaining({ kind: 'not_owner' }),
    );
    await owner.withActiveSnapshotExportAuthorization('save-slot-1', async () => {
      expect(owner.assertSnapshotExportAuthorized('save-slot-1')).toBe('transition');
    });
    await owner.withActiveImportAuthorization('save-slot-1', async () => {
      expect(() => owner.assertImportAuthorized()).not.toThrow();
    });

    const candidate = await owner.begin('save-slot-2');
    await owner.withCandidateSnapshotExportAuthorization(candidate, async () => {
      expect(owner.assertSnapshotExportAuthorized(null)).toBe('transition');
      expect(owner.assertSnapshotExportAuthorized('save-slot-1')).toBe('ordinary');
    });
    expect(owner.assertSnapshotExportAuthorized('save-slot-1')).toBe('ordinary');
    await owner.abort(candidate);
  });

  it('releases every candidate and active lock when the document coordinator disposes', async () => {
    const manager = new MemoryWebLockManager();
    const owner = coordinator(manager);
    await owner.commit(await owner.begin('save-slot-1'), 'save-slot-1');
    await owner.begin('save-slot-2');

    await owner.dispose();
    expect(manager.held.size).toBe(0);
    expect(owner.getSnapshot()).toMatchObject({
      activeRootSaveId: null,
      activeSaveId: null,
      heldRootSaveIds: [],
    });
  });
});
