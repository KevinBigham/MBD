import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureOutgoingSaveSessionSnapshot,
  recoverWorkerAfterCandidateImportFailure,
  type SaveSessionTransitionRecoveryDependencies,
} from './saveSessionTransitionRecovery';

const dependencies = {
  getSaveSessionOwnershipSnapshot: vi.fn(),
  releaseActiveSaveSessionOwnership: vi.fn(),
  withActiveSaveSessionImportAuthorization: vi.fn(
    (_saveId, operation: () => Promise<unknown>) => operation(),
  ),
  withActiveSaveSessionSnapshotExportAuthorization: vi.fn(
    (_saveId, operation: () => Promise<unknown>) => operation(),
  ),
} as unknown as SaveSessionTransitionRecoveryDependencies;

const transition = {
  transitionId: Symbol('switch-to-b'),
  targetSaveId: 'save-slot-2',
  outgoingSaveId: 'save-slot-1',
};

describe('save-session transition worker recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dependencies.getSaveSessionOwnershipSnapshot).mockReturnValue({
      activeRootSaveId: 'save-slot-1',
      activeSaveId: 'save-slot-1',
      heldRootSaveIds: ['save-slot-1'],
      ownershipLost: false,
    });
    vi.mocked(dependencies.releaseActiveSaveSessionOwnership).mockResolvedValue(undefined);
  });

  it('captures the quiescent outgoing snapshot under exact active authorization', async () => {
    const snapshot = { schemaVersion: 34, season: 4, day: 91 };
    const exportSnapshot = vi.fn().mockResolvedValue(snapshot);

    await expect(captureOutgoingSaveSessionSnapshot(
      transition,
      exportSnapshot,
      dependencies,
    )).resolves.toBe(snapshot);

    expect(dependencies.withActiveSaveSessionSnapshotExportAuthorization).toHaveBeenCalledWith(
      'save-slot-1',
      exportSnapshot,
    );
  });

  it('restarts away the candidate and restores the outgoing worker before unpausing', async () => {
    const outgoingSnapshot = { schemaVersion: 34, season: 4, day: 91 };
    const restartWorker = vi.fn().mockResolvedValue(undefined);
    const importSnapshot = vi.fn().mockResolvedValue({ success: true });
    const setInitialized = vi.fn();

    await expect(recoverWorkerAfterCandidateImportFailure({
      importSnapshot,
      outgoingSnapshot,
      restartWorker,
      setInitialized,
      transition,
      dependencies,
    })).resolves.toEqual({ kind: 'restored_outgoing' });

    expect(restartWorker).toHaveBeenCalledTimes(1);
    expect(dependencies.withActiveSaveSessionImportAuthorization).toHaveBeenCalledWith(
      'save-slot-1',
      expect.any(Function),
    );
    expect(importSnapshot).toHaveBeenCalledWith(outgoingSnapshot);
    expect(dependencies.releaseActiveSaveSessionOwnership).not.toHaveBeenCalled();
    expect(setInitialized).not.toHaveBeenCalled();
  });

  it('fails closed when outgoing re-import throws after replacing worker state', async () => {
    const restartWorker = vi.fn().mockResolvedValue(undefined);
    const importSnapshot = vi.fn().mockRejectedValue(new Error('post-setState sync failed'));
    const setInitialized = vi.fn();

    const result = await recoverWorkerAfterCandidateImportFailure({
      importSnapshot,
      outgoingSnapshot: { schemaVersion: 34 },
      restartWorker,
      setInitialized,
      transition,
      dependencies,
    });

    expect(result).toMatchObject({ kind: 'reload_required' });
    expect(restartWorker).toHaveBeenCalledTimes(2);
    expect(dependencies.releaseActiveSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(setInitialized).toHaveBeenCalledWith(false);
  });

  it('fails closed when the outgoing capture was lost during a fatal export', async () => {
    const restartWorker = vi.fn().mockResolvedValue(undefined);
    const importSnapshot = vi.fn();
    const setInitialized = vi.fn();

    const result = await recoverWorkerAfterCandidateImportFailure({
      importSnapshot,
      outgoingSnapshot: null,
      restartWorker,
      setInitialized,
      transition,
      dependencies,
    });

    expect(result).toMatchObject({ kind: 'reload_required' });
    expect(importSnapshot).not.toHaveBeenCalled();
    expect(restartWorker).toHaveBeenCalledTimes(2);
    expect(dependencies.releaseActiveSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(setInitialized).toHaveBeenCalledWith(false);
  });

  it('releases a committed candidate when later activation work throws', async () => {
    vi.mocked(dependencies.getSaveSessionOwnershipSnapshot).mockReturnValue({
      activeRootSaveId: 'save-slot-2',
      activeSaveId: 'save-slot-2',
      heldRootSaveIds: ['save-slot-2'],
      ownershipLost: false,
    });
    const restartWorker = vi.fn().mockResolvedValue(undefined);
    const importSnapshot = vi.fn();
    const setInitialized = vi.fn();

    const result = await recoverWorkerAfterCandidateImportFailure({
      candidateCommitted: true,
      importSnapshot,
      outgoingSnapshot: { schemaVersion: 34 },
      restartWorker,
      setInitialized,
      transition,
      dependencies,
    });

    expect(result).toMatchObject({ kind: 'reload_required' });
    expect(importSnapshot).not.toHaveBeenCalled();
    expect(restartWorker).toHaveBeenCalledTimes(1);
    expect(dependencies.releaseActiveSaveSessionOwnership).toHaveBeenCalledTimes(1);
    expect(setInitialized).toHaveBeenCalledWith(false);
  });
});
