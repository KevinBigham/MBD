export const SAVE_TREE_LOCK_PREFIX = 'mbd-save-tree-v1:';

export type SaveSessionOwnershipFailureKind =
  | 'contended'
  | 'unavailable'
  | 'request_failed'
  | 'unknown_tree'
  | 'not_owner';

export class SaveSessionOwnershipError extends Error {
  readonly kind: SaveSessionOwnershipFailureKind;
  readonly rootSaveId: string | null;

  constructor(
    kind: SaveSessionOwnershipFailureKind,
    message: string,
    rootSaveId: string | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'SaveSessionOwnershipError';
    this.kind = kind;
    this.rootSaveId = rootSaveId;
  }
}

export interface SaveSessionClaim {
  readonly rootSaveId: string;
  readonly resourceName: string;
  readonly claimId: symbol;
}

export interface SaveSessionOwnershipSnapshot {
  activeRootSaveId: string | null;
  activeSaveId: string | null;
  heldRootSaveIds: readonly string[];
  ownershipLost: boolean;
}

export type SaveSessionSnapshotExportAuthorization = 'ordinary' | 'transition';

interface WebLockLike {
  readonly name: string;
  readonly mode: 'exclusive' | 'shared';
}

export interface WebLockManagerLike {
  request<T>(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: WebLockLike | null) => T | PromiseLike<T>,
  ): Promise<T>;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface HeldRootLock {
  rootSaveId: string;
  resourceName: string;
  releaseGate: Deferred<void>;
  requestPromise: Promise<unknown> | null;
  releaseRequested: boolean;
  active: boolean;
  references: number;
  activationReferences: number;
  transientReferences: number;
}

interface InternalClaim extends SaveSessionClaim {
  publicClaim: SaveSessionClaim;
  released: boolean;
  purpose: 'activation' | 'transient';
}

function deferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function lockManagerFromBrowser(): WebLockManagerLike | null {
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return null;
  }
  return navigator.locks as unknown as WebLockManagerLike;
}

function requestFailureKind(error: unknown): SaveSessionOwnershipFailureKind {
  const name = error instanceof DOMException ? error.name : '';
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return name === 'SecurityError'
    || name === 'NotAllowedError'
    || name === 'InvalidStateError'
    || /secure context|insecure|not allowed|unavailable/i.test(message)
    ? 'unavailable'
    : 'request_failed';
}

export function saveTreeLockResourceName(rootSaveId: string): string {
  if (!/^save-slot-[1-9]\d*$/.test(rootSaveId)) {
    throw new SaveSessionOwnershipError(
      'unknown_tree',
      'MBD could not identify a stable root save slot for this dynasty.',
      rootSaveId || null,
    );
  }
  return `${SAVE_TREE_LOCK_PREFIX}${rootSaveId}`;
}

export function isSaveSessionOwnershipError(
  error: unknown,
): error is SaveSessionOwnershipError {
  return error instanceof SaveSessionOwnershipError;
}

export function saveSessionOwnershipFailureMessage(
  error: SaveSessionOwnershipError,
  targetLabel: string,
  unchangedOutcome: string,
): string {
  const target = targetLabel.trim() || 'this dynasty';
  const outcome = unchangedOutcome.trim();
  switch (error.kind) {
    case 'contended':
      return `${target} is open in another tab. Close that editor, then try again. ${outcome}`;
    case 'unavailable':
      return `Safe exclusive editing is unavailable in this browser for ${target}. Use a supported, secure browser window, then try again. ${outcome}`;
    case 'request_failed':
      return `MBD could not verify exclusive access to ${target}. Let any current gameplay or save action finish, close other MBD tabs, then try again. ${outcome}`;
    case 'unknown_tree':
      return `MBD could not identify the root save tree for ${target}, so the operation was stopped. Reload the Save Hub, then try again. ${outcome}`;
    case 'not_owner':
      return `This tab no longer controls ${target}. Reload or return to the Save Hub before trying again. ${outcome}`;
  }
}

export class SaveSessionOwnershipCoordinator {
  private readonly getLockManager: () => WebLockManagerLike | null;
  private readonly heldRoots = new Map<string, HeldRootLock>();
  private readonly pendingAcquisitions = new Map<string, Promise<HeldRootLock>>();
  private readonly pendingActivationBegins = new Map<string, number>();
  private readonly pendingTransientBegins = new Map<string, number>();
  private readonly releasingRoots = new Map<string, Promise<void>>();
  private readonly claims = new Map<symbol, InternalClaim>();
  private readonly importAuthorizations = new Map<symbol, number>();
  private readonly newGameAuthorizations = new Map<symbol, number>();
  private readonly candidateSnapshotExportAuthorizations = new Map<symbol, {
    candidateSaveId: string | null;
    references: number;
  }>();
  private readonly activeSnapshotExportAuthorizations = new Map<string, number>();
  private readonly activeImportAuthorizations = new Map<string, number>();
  private readonly listeners = new Set<() => void>();
  private activeRootSaveId: string | null = null;
  private activeSaveId: string | null = null;
  private ownershipLost = false;
  private enforcementEnabled = false;
  private lifecycleEpoch = 0;
  private snapshot: SaveSessionOwnershipSnapshot = {
    activeRootSaveId: null,
    activeSaveId: null,
    heldRootSaveIds: [],
    ownershipLost: false,
  };

  constructor(getLockManager: () => WebLockManagerLike | null = lockManagerFromBrowser) {
    this.getLockManager = getLockManager;
  }

  enableEnforcement(): void {
    this.enforcementEnabled = true;
  }

  disableEnforcement(): void {
    this.enforcementEnabled = false;
  }

  isEnforcementEnabled(): boolean {
    return this.enforcementEnabled;
  }

  getSnapshot = (): SaveSessionOwnershipSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify(): void {
    this.snapshot = {
      activeRootSaveId: this.activeRootSaveId,
      activeSaveId: this.activeSaveId,
      heldRootSaveIds: Array.from(this.heldRoots.keys()).sort(),
      ownershipLost: this.ownershipLost,
    };
    for (const listener of this.listeners) {
      listener();
    }
  }

  private claimFor(
    held: HeldRootLock,
    purpose: InternalClaim['purpose'],
  ): SaveSessionClaim {
    const claim: SaveSessionClaim = Object.freeze({
      rootSaveId: held.rootSaveId,
      resourceName: held.resourceName,
      claimId: Symbol(held.resourceName),
    });
    // The frozen public object cannot carry mutable lifecycle state, so keep a
    // separate internal record keyed by its opaque symbol.
    const internal: InternalClaim = {
      ...claim,
      publicClaim: claim,
      released: false,
      purpose,
    };
    held.references += 1;
    if (purpose === 'activation') {
      held.activationReferences += 1;
    } else {
      held.transientReferences += 1;
    }
    this.claims.set(claim.claimId, internal);
    this.notify();
    return claim;
  }

  private requireClaim(claim: SaveSessionClaim): InternalClaim {
    const internal = this.claims.get(claim.claimId);
    if (!internal
      || internal.released
      || internal.publicClaim !== claim
      || internal.rootSaveId !== claim.rootSaveId
      || internal.resourceName !== claim.resourceName) {
      throw new SaveSessionOwnershipError(
        'not_owner',
        'This save-session ownership claim is no longer active.',
        claim.rootSaveId,
      );
    }
    return internal;
  }

  private async requestPhysicalLock(
    rootSaveId: string,
    requestEpoch: number,
  ): Promise<HeldRootLock> {
    const resourceName = saveTreeLockResourceName(rootSaveId);
    const manager = this.getLockManager();
    if (!manager) {
      throw new SaveSessionOwnershipError(
        'unavailable',
        'This browser cannot safely coordinate dynasty ownership across tabs.',
        rootSaveId,
      );
    }

    const acquisition = deferred<HeldRootLock | null>();
    let acquisitionSettled = false;
    let held: HeldRootLock | null = null;
    let requestPromise: Promise<unknown>;

    try {
      requestPromise = Promise.resolve(manager.request(
        resourceName,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) {
            acquisitionSettled = true;
            acquisition.resolve(null);
            return;
          }

          if (requestEpoch !== this.lifecycleEpoch) {
            acquisitionSettled = true;
            acquisition.reject(new SaveSessionOwnershipError(
              'not_owner',
              'The save-session request ended before ownership was granted.',
              rootSaveId,
            ));
            return;
          }

          held = {
            rootSaveId,
            resourceName,
            releaseGate: deferred<void>(),
            requestPromise: null,
            releaseRequested: false,
            active: false,
            references: 0,
            activationReferences: 0,
            transientReferences: 0,
          };
          this.heldRoots.set(rootSaveId, held);
          acquisitionSettled = true;
          acquisition.resolve(held);
          this.notify();
          await held.releaseGate.promise;
        },
      ));
    } catch (error) {
      throw new SaveSessionOwnershipError(
        requestFailureKind(error),
        'MBD could not request exclusive ownership of this dynasty.',
        rootSaveId,
        { cause: error },
      );
    }

    void requestPromise.then(
      () => {
        if (held && !held.releaseRequested) {
          this.handleUnexpectedLoss(held);
        }
      },
      (error) => {
        if (!acquisitionSettled) {
          acquisitionSettled = true;
          acquisition.reject(error);
          return;
        }
        if (held && !held.releaseRequested) {
          this.handleUnexpectedLoss(held);
        }
      },
    );

    let acquired: HeldRootLock | null;
    try {
      acquired = await acquisition.promise;
    } catch (error) {
      if (isSaveSessionOwnershipError(error)) {
        throw error;
      }
      throw new SaveSessionOwnershipError(
        requestFailureKind(error),
        'MBD could not request exclusive ownership of this dynasty.',
        rootSaveId,
        { cause: error },
      );
    }

    if (!acquired) {
      await requestPromise;
      throw new SaveSessionOwnershipError(
        'contended',
        'This dynasty is already open for editing in another tab.',
        rootSaveId,
      );
    }
    acquired.requestPromise = requestPromise;
    return acquired;
  }

  private handleUnexpectedLoss(held: HeldRootLock): void {
    if (this.heldRoots.get(held.rootSaveId) !== held) {
      return;
    }
    this.heldRoots.delete(held.rootSaveId);
    for (const claim of this.claims.values()) {
      if (claim.rootSaveId === held.rootSaveId) {
        claim.released = true;
        this.claims.delete(claim.claimId);
      }
    }
    if (this.activeRootSaveId === held.rootSaveId) {
      this.activeRootSaveId = null;
      this.activeSaveId = null;
      this.ownershipLost = true;
    }
    this.notify();
  }

  private async beginClaim(
    rootSaveId: string,
    purpose: InternalClaim['purpose'],
  ): Promise<SaveSessionClaim> {
    const beginEpoch = this.lifecycleEpoch;
    saveTreeLockResourceName(rootSaveId);
    if (purpose === 'transient'
      && (this.pendingActivationBegins.get(rootSaveId) ?? 0) > 0) {
      throw new SaveSessionOwnershipError(
        'request_failed',
        'Another save-session activation is already using this dynasty tree.',
        rootSaveId,
      );
    }
    if (purpose === 'activation'
      && (this.pendingTransientBegins.get(rootSaveId) ?? 0) > 0) {
      throw new SaveSessionOwnershipError(
        'request_failed',
        'Another save operation is already using this dynasty tree.',
        rootSaveId,
      );
    }
    const reusable = this.heldRoots.get(rootSaveId);
    if (reusable && !reusable.releaseRequested) {
      if (purpose === 'transient' && reusable.activationReferences > 0) {
        throw new SaveSessionOwnershipError(
          'request_failed',
          'Another save-session activation is already using this dynasty tree.',
          rootSaveId,
        );
      }
      if (purpose === 'activation' && reusable.transientReferences > 0) {
        throw new SaveSessionOwnershipError(
          'request_failed',
          'Another save operation is already using this dynasty tree.',
          rootSaveId,
        );
      }
      return this.claimFor(reusable, purpose);
    }

    const releasing = this.releasingRoots.get(rootSaveId);
    if (releasing) {
      await releasing;
      if (beginEpoch !== this.lifecycleEpoch) {
        throw new SaveSessionOwnershipError(
          'not_owner',
          'The save-session request ended before ownership was granted.',
          rootSaveId,
        );
      }
      return this.beginClaim(rootSaveId, purpose);
    }

    let pending = this.pendingAcquisitions.get(rootSaveId);
    if (!pending) {
      pending = this.requestPhysicalLock(rootSaveId, beginEpoch);
      this.pendingAcquisitions.set(rootSaveId, pending);
      void pending.finally(() => {
        if (this.pendingAcquisitions.get(rootSaveId) === pending) {
          this.pendingAcquisitions.delete(rootSaveId);
        }
      }).catch(() => undefined);
    }
    const held = await pending;
    if (beginEpoch !== this.lifecycleEpoch) {
      await this.releasePhysicalIfUnused(held);
      throw new SaveSessionOwnershipError(
        'not_owner',
        'The save-session request ended before ownership was granted.',
        rootSaveId,
      );
    }
    return this.claimFor(held, purpose);
  }

  async begin(rootSaveId: string): Promise<SaveSessionClaim> {
    this.pendingActivationBegins.set(
      rootSaveId,
      (this.pendingActivationBegins.get(rootSaveId) ?? 0) + 1,
    );
    try {
      return await this.beginClaim(rootSaveId, 'activation');
    } finally {
      const remaining = (this.pendingActivationBegins.get(rootSaveId) ?? 1) - 1;
      if (remaining <= 0) {
        this.pendingActivationBegins.delete(rootSaveId);
      } else {
        this.pendingActivationBegins.set(rootSaveId, remaining);
      }
    }
  }

  private async beginTransient(rootSaveId: string): Promise<SaveSessionClaim> {
    this.pendingTransientBegins.set(
      rootSaveId,
      (this.pendingTransientBegins.get(rootSaveId) ?? 0) + 1,
    );
    try {
      return await this.beginClaim(rootSaveId, 'transient');
    } finally {
      const remaining = (this.pendingTransientBegins.get(rootSaveId) ?? 1) - 1;
      if (remaining <= 0) {
        this.pendingTransientBegins.delete(rootSaveId);
      } else {
        this.pendingTransientBegins.set(rootSaveId, remaining);
      }
    }
  }

  private async releaseInternalClaim(internal: InternalClaim): Promise<void> {
    if (internal.released) {
      return;
    }
    internal.released = true;
    this.claims.delete(internal.claimId);
    const held = this.heldRoots.get(internal.rootSaveId);
    if (held) {
      held.references = Math.max(0, held.references - 1);
      if (internal.purpose === 'activation') {
        held.activationReferences = Math.max(0, held.activationReferences - 1);
      } else {
        held.transientReferences = Math.max(0, held.transientReferences - 1);
      }
      await this.releasePhysicalIfUnused(held);
    }
    this.notify();
  }

  private async releasePhysicalIfUnused(held: HeldRootLock): Promise<void> {
    if (held.active || held.references > 0) {
      return;
    }
    const existingRelease = this.releasingRoots.get(held.rootSaveId);
    if (existingRelease) {
      await existingRelease;
      return;
    }
    if (held.releaseRequested) {
      await held.requestPromise;
      return;
    }
    held.releaseRequested = true;
    const releasePromise = (async () => {
      held.releaseGate.resolve();
      try {
        await held.requestPromise;
      } finally {
        if (this.heldRoots.get(held.rootSaveId) === held) {
          this.heldRoots.delete(held.rootSaveId);
        }
      }
    })();
    this.releasingRoots.set(held.rootSaveId, releasePromise);
    try {
      await releasePromise;
    } finally {
      if (this.releasingRoots.get(held.rootSaveId) === releasePromise) {
        this.releasingRoots.delete(held.rootSaveId);
      }
      this.notify();
    }
  }

  async commit(claim: SaveSessionClaim, activeSaveId: string): Promise<void> {
    const internal = this.requireClaim(claim);
    const nextHeld = this.heldRoots.get(internal.rootSaveId);
    if (!nextHeld || nextHeld.releaseRequested) {
      throw new SaveSessionOwnershipError(
        'not_owner',
        'Exclusive ownership ended before the dynasty could be activated.',
        internal.rootSaveId,
      );
    }

    const previousRootSaveId = this.activeRootSaveId;
    const previousHeld = previousRootSaveId == null
      ? null
      : this.heldRoots.get(previousRootSaveId) ?? null;
    nextHeld.active = true;
    this.activeRootSaveId = internal.rootSaveId;
    this.activeSaveId = activeSaveId;
    this.ownershipLost = false;
    if (previousHeld && previousHeld !== nextHeld) {
      previousHeld.active = false;
    }

    await this.releaseInternalClaim(internal);
    if (previousHeld && previousHeld !== nextHeld) {
      try {
        await this.releasePhysicalIfUnused(previousHeld);
      } catch {
        // Candidate activation is already authoritative. Failure while the
        // browser settles the outgoing request must not roll back or falsely
        // reject the newly active editor.
      }
    }
    this.notify();
  }

  async abort(claim: SaveSessionClaim): Promise<void> {
    await this.releaseInternalClaim(this.requireClaim(claim));
  }

  async releaseActive(): Promise<void> {
    const rootSaveId = this.activeRootSaveId;
    this.activeRootSaveId = null;
    this.activeSaveId = null;
    this.ownershipLost = false;
    if (rootSaveId) {
      const held = this.heldRoots.get(rootSaveId);
      if (held) {
        held.active = false;
        await this.releasePhysicalIfUnused(held);
      }
    }
    this.notify();
  }

  async withTransientOwnership<T>(
    rootSaveId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const claim = await this.beginTransient(rootSaveId);
    try {
      return await operation();
    } finally {
      await this.abort(claim);
    }
  }

  async withImportAuthorization<T>(
    claim: SaveSessionClaim,
    operation: () => Promise<T>,
  ): Promise<T> {
    const internal = this.requireClaim(claim);
    this.importAuthorizations.set(
      internal.claimId,
      (this.importAuthorizations.get(internal.claimId) ?? 0) + 1,
    );
    try {
      // The worker proxy consumes this one-shot authority synchronously before
      // its first await. Do not keep a save-wide scope open while Comlink is
      // in flight, where another callback could borrow it.
      return operation();
    } finally {
      const remaining = (this.importAuthorizations.get(internal.claimId) ?? 1) - 1;
      if (remaining <= 0) {
        this.importAuthorizations.delete(internal.claimId);
      } else {
        this.importAuthorizations.set(internal.claimId, remaining);
      }
    }
  }

  async withNewGameAuthorization<T>(
    claim: SaveSessionClaim,
    operation: () => Promise<T>,
  ): Promise<T> {
    const internal = this.requireClaim(claim);
    this.newGameAuthorizations.set(
      internal.claimId,
      (this.newGameAuthorizations.get(internal.claimId) ?? 0) + 1,
    );
    try {
      return operation();
    } finally {
      const remaining = (this.newGameAuthorizations.get(internal.claimId) ?? 1) - 1;
      if (remaining <= 0) {
        this.newGameAuthorizations.delete(internal.claimId);
      } else {
        this.newGameAuthorizations.set(internal.claimId, remaining);
      }
    }
  }

  async withCandidateSnapshotExportAuthorization<T>(
    claim: SaveSessionClaim,
    candidateSaveId: string | null,
    operation: () => Promise<T>,
  ): Promise<T> {
    const internal = this.requireClaim(claim);
    const current = this.candidateSnapshotExportAuthorizations.get(internal.claimId);
    if (current && current.candidateSaveId !== candidateSaveId) {
      throw new SaveSessionOwnershipError(
        'not_owner',
        'A save-session candidate cannot export a snapshot for another save.',
        internal.rootSaveId,
      );
    }
    this.candidateSnapshotExportAuthorizations.set(internal.claimId, {
      candidateSaveId,
      references: (current?.references ?? 0) + 1,
    });
    try {
      return operation();
    } finally {
      const active = this.candidateSnapshotExportAuthorizations.get(internal.claimId);
      const remaining = (active?.references ?? 1) - 1;
      if (!active || remaining <= 0) {
        this.candidateSnapshotExportAuthorizations.delete(internal.claimId);
      } else {
        this.candidateSnapshotExportAuthorizations.set(internal.claimId, {
          candidateSaveId: active.candidateSaveId,
          references: remaining,
        });
      }
    }
  }

  withActiveSnapshotExportAuthorization<T>(
    activeSaveId: string,
    operation: () => T,
  ): T {
    this.assertActiveOwner(activeSaveId);
    this.activeSnapshotExportAuthorizations.set(
      activeSaveId,
      (this.activeSnapshotExportAuthorizations.get(activeSaveId) ?? 0) + 1,
    );
    try {
      return operation();
    } finally {
      const remaining = (this.activeSnapshotExportAuthorizations.get(activeSaveId) ?? 1) - 1;
      if (remaining <= 0) {
        this.activeSnapshotExportAuthorizations.delete(activeSaveId);
      } else {
        this.activeSnapshotExportAuthorizations.set(activeSaveId, remaining);
      }
    }
  }

  withActiveImportAuthorization<T>(
    activeSaveId: string,
    operation: () => T,
  ): T {
    this.assertActiveOwner(activeSaveId);
    this.activeImportAuthorizations.set(
      activeSaveId,
      (this.activeImportAuthorizations.get(activeSaveId) ?? 0) + 1,
    );
    try {
      return operation();
    } finally {
      const remaining = (this.activeImportAuthorizations.get(activeSaveId) ?? 1) - 1;
      if (remaining <= 0) {
        this.activeImportAuthorizations.delete(activeSaveId);
      } else {
        this.activeImportAuthorizations.set(activeSaveId, remaining);
      }
    }
  }

  async withAllTransientOwnership<T>(
    rootSaveIds: readonly string[],
    operation: () => Promise<T>,
  ): Promise<T> {
    const orderedRoots = Array.from(new Set(rootSaveIds)).sort((left, right) =>
      left.localeCompare(right, 'en', { numeric: true }));
    const claims: SaveSessionClaim[] = [];
    try {
      for (const rootSaveId of orderedRoots) {
        claims.push(await this.beginTransient(rootSaveId));
      }
      return await operation();
    } finally {
      for (const claim of claims.reverse()) {
        await this.abort(claim);
      }
    }
  }

  ownsRoot(rootSaveId: string): boolean {
    const held = this.heldRoots.get(rootSaveId);
    return Boolean(held && !held.releaseRequested);
  }

  assertRootOwned(rootSaveId: string): void {
    if (!this.enforcementEnabled) {
      return;
    }
    if (!this.ownsRoot(rootSaveId)) {
      throw new SaveSessionOwnershipError(
        'not_owner',
        'This tab does not own the dynasty save tree.',
        rootSaveId,
      );
    }
  }

  assertActiveOwner(expectedSaveId?: string): void {
    if (!this.enforcementEnabled) {
      return;
    }
    if (
      !this.activeRootSaveId
      || !this.activeSaveId
      || (expectedSaveId != null && this.activeSaveId !== expectedSaveId)
      || !this.ownsRoot(this.activeRootSaveId)
    ) {
      throw new SaveSessionOwnershipError(
        'not_owner',
        'This tab is not the active editor for a dynasty.',
        this.activeRootSaveId,
      );
    }
  }

  assertImportAuthorized(): void {
    if (!this.enforcementEnabled) {
      return;
    }
    const authorizedClaimId = Array.from(this.importAuthorizations.keys()).find((claimId) => {
      const claim = this.claims.get(claimId);
      return Boolean(claim && !claim.released && this.ownsRoot(claim.rootSaveId));
    });
    if (authorizedClaimId != null) {
      this.importAuthorizations.delete(authorizedClaimId);
      return;
    }
    const activeSaveId = this.activeSaveId;
    const activeAuthorized = activeSaveId != null
      && this.activeRootSaveId != null
      && (this.activeImportAuthorizations.get(activeSaveId) ?? 0) > 0
      && this.ownsRoot(this.activeRootSaveId);
    if (activeAuthorized) {
      this.activeImportAuthorizations.delete(activeSaveId);
      return;
    }
    throw new SaveSessionOwnershipError(
      'not_owner',
      'Snapshot import requires an owned save-session candidate.',
      null,
    );
  }

  assertSnapshotExportAuthorized(
    expectedActiveSaveId: string | null,
  ): SaveSessionSnapshotExportAuthorization {
    if (!this.enforcementEnabled) {
      return 'ordinary';
    }

    const candidateAuthorization = Array.from(
      this.candidateSnapshotExportAuthorizations.entries(),
    ).find(([claimId, authorization]) => {
      const claim = this.claims.get(claimId);
      return Boolean(
        claim
        && !claim.released
        && authorization.candidateSaveId === expectedActiveSaveId
        && this.ownsRoot(claim.rootSaveId),
      );
    });
    if (candidateAuthorization) {
      this.candidateSnapshotExportAuthorizations.delete(candidateAuthorization[0]);
      return 'transition';
    }

    this.assertActiveOwner(expectedActiveSaveId ?? '__no-active-save__');
    if (expectedActiveSaveId != null
      && (this.activeSnapshotExportAuthorizations.get(expectedActiveSaveId) ?? 0) > 0) {
      this.activeSnapshotExportAuthorizations.delete(expectedActiveSaveId);
      return 'transition';
    }
    return 'ordinary';
  }

  assertNewGameAuthorized(rootSaveId: string): void {
    if (!this.enforcementEnabled) {
      return;
    }
    const authorizedClaimId = Array.from(this.newGameAuthorizations.keys()).find((claimId) => {
      const claim = this.claims.get(claimId);
      return Boolean(
        claim
        && !claim.released
        && claim.rootSaveId === rootSaveId
        && this.ownsRoot(claim.rootSaveId)
      );
    });
    if (authorizedClaimId != null) {
      this.newGameAuthorizations.delete(authorizedClaimId);
      return;
    }
    throw new SaveSessionOwnershipError(
      'not_owner',
      'New-dynasty simulation requires an owned activation candidate.',
      rootSaveId,
    );
  }

  async dispose(): Promise<void> {
    this.lifecycleEpoch += 1;
    this.activeRootSaveId = null;
    this.activeSaveId = null;
    this.ownershipLost = false;
    this.claims.clear();
    this.importAuthorizations.clear();
    this.newGameAuthorizations.clear();
    this.candidateSnapshotExportAuthorizations.clear();
    this.activeSnapshotExportAuthorizations.clear();
    this.activeImportAuthorizations.clear();
    const held = Array.from(this.heldRoots.values());
    for (const entry of held) {
      entry.active = false;
      entry.references = 0;
      entry.activationReferences = 0;
      entry.transientReferences = 0;
    }
    await Promise.all(held.map((entry) => this.releasePhysicalIfUnused(entry)));
    this.pendingAcquisitions.clear();
    this.pendingActivationBegins.clear();
    this.pendingTransientBegins.clear();
    await Promise.allSettled(this.releasingRoots.values());
    this.releasingRoots.clear();
    this.notify();
  }
}

const activeSaveSessionOwnership = new SaveSessionOwnershipCoordinator();

export function enableSaveSessionOwnershipEnforcement(): void {
  activeSaveSessionOwnership.enableEnforcement();
}

export function isSaveSessionOwnershipEnforcementEnabled(): boolean {
  return activeSaveSessionOwnership.isEnforcementEnabled();
}

export function getSaveSessionOwnershipSnapshot(): SaveSessionOwnershipSnapshot {
  return activeSaveSessionOwnership.getSnapshot();
}

export function subscribeToSaveSessionOwnership(listener: () => void): () => void {
  return activeSaveSessionOwnership.subscribe(listener);
}

export function beginSaveSessionOwnership(rootSaveId: string): Promise<SaveSessionClaim> {
  return activeSaveSessionOwnership.begin(rootSaveId);
}

export function commitSaveSessionOwnership(
  claim: SaveSessionClaim,
  activeSaveId: string,
): Promise<void> {
  return activeSaveSessionOwnership.commit(claim, activeSaveId);
}

export function abortSaveSessionOwnership(claim: SaveSessionClaim): Promise<void> {
  return activeSaveSessionOwnership.abort(claim);
}

export function releaseActiveSaveSessionOwnership(): Promise<void> {
  return activeSaveSessionOwnership.releaseActive();
}

export function withTransientSaveSessionOwnership<T>(
  rootSaveId: string,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withTransientOwnership(rootSaveId, operation);
}

export function withSaveSessionImportAuthorization<T>(
  claim: SaveSessionClaim,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withImportAuthorization(claim, operation);
}

export function withSaveSessionNewGameAuthorization<T>(
  claim: SaveSessionClaim,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withNewGameAuthorization(claim, operation);
}

export function withSaveSessionCandidateSnapshotExportAuthorization<T>(
  claim: SaveSessionClaim,
  candidateSaveId: string | null,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withCandidateSnapshotExportAuthorization(
    claim,
    candidateSaveId,
    operation,
  );
}

export function withActiveSaveSessionSnapshotExportAuthorization<T>(
  activeSaveId: string,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withActiveSnapshotExportAuthorization(
    activeSaveId,
    operation,
  );
}

export function withActiveSaveSessionImportAuthorization<T>(
  activeSaveId: string,
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withActiveImportAuthorization(activeSaveId, operation);
}

export function withAllTransientSaveSessionOwnership<T>(
  rootSaveIds: readonly string[],
  operation: () => Promise<T>,
): Promise<T> {
  return activeSaveSessionOwnership.withAllTransientOwnership(rootSaveIds, operation);
}

export function assertSaveTreeSessionOwned(rootSaveId: string): void {
  activeSaveSessionOwnership.assertRootOwned(rootSaveId);
}

export function assertAllSaveTreeSessionsOwned(rootSaveIds: readonly string[]): void {
  for (const rootSaveId of rootSaveIds) {
    activeSaveSessionOwnership.assertRootOwned(rootSaveId);
  }
}

export function assertActiveSaveSessionOwned(expectedSaveId?: string): void {
  activeSaveSessionOwnership.assertActiveOwner(expectedSaveId);
}

export function assertSaveSessionImportAuthorized(): void {
  activeSaveSessionOwnership.assertImportAuthorized();
}

export function assertSaveSessionNewGameAuthorized(rootSaveId: string): void {
  activeSaveSessionOwnership.assertNewGameAuthorized(rootSaveId);
}

export function assertSaveSessionSnapshotExportAuthorized(
  expectedActiveSaveId: string | null,
): SaveSessionSnapshotExportAuthorization {
  return activeSaveSessionOwnership.assertSnapshotExportAuthorized(expectedActiveSaveId);
}

export async function resetSaveSessionOwnershipForTesting(): Promise<void> {
  await activeSaveSessionOwnership.dispose();
  activeSaveSessionOwnership.disableEnforcement();
}
