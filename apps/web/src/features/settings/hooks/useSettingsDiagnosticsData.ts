import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '@/shared/lib/logger';
import {
  getActiveSavePersistenceStatus,
  isActiveSavePersistenceReceiptDurable,
  type ActiveSavePersistenceReceipt,
  type ActiveSavePersistenceFailureKind,
  type ActiveSavePersistenceState,
  type ActiveSavePersistenceStatus,
} from '@/shared/lib/activeSavePersistence';
import {
  getLocalStorageEstimate,
  type LocalStorageEstimate,
} from '@/shared/lib/saveSystem';
import {
  classifyOriginStorageEstimate,
  readOriginStorageEstimate,
  type OriginStorageEstimate,
} from '@/shared/lib/storagePressure';
import type { PerformanceDiagnosticsView } from '@/workers/sim.worker.diagnostics';
import {
  beginSettingsOperation as beginSharedSettingsOperation,
  finishSettingsOperation as finishSharedSettingsOperation,
  type SettingsOperationOwner,
} from '../lib/settingsOperationCoordinator';

interface PruneStaleDataResult {
  diagnostics: PerformanceDiagnosticsView;
  prunedCount: number;
}

export interface PruneStaleEligibility {
  staleTickerEntries: number;
  staleWatchers: number;
}

interface UseSettingsDiagnosticsDataOptions {
  activeManagedSaveId: string | null;
  persistenceFailureKind?: ActiveSavePersistenceFailureKind | null;
  persistenceState?: ActiveSavePersistenceState;
  persistenceStatus?: ActiveSavePersistenceStatus;
  archiveOldSeasons?: () => Promise<unknown>;
  beginSettingsOperation?: () => SettingsOperationOwner | null;
  finishSettingsOperation?: (owner: SettingsOperationOwner) => void;
  getPersistenceStatus?: (saveId?: string | null) => ActiveSavePersistenceStatus;
  isPersistenceReceiptDurable?: (receipt: ActiveSavePersistenceReceipt) => boolean;
  getPerformanceDiagnostics?: () => Promise<unknown>;
  onStatusChange: (status: string) => void;
  persistActiveSave: () => Promise<{
    acceptedReceipt?: ActiveSavePersistenceReceipt | null;
    saved: boolean;
    saveName: string | null;
  }>;
  pruneStaleData?: () => Promise<unknown>;
  readLocalStorageEstimate?: () => Promise<LocalStorageEstimate>;
  readOriginStorageEstimate?: (failureKind?: ActiveSavePersistenceFailureKind | null) => Promise<OriginStorageEstimate>;
  settingsOperationBusy?: boolean;
  workerReady: boolean;
}

interface UseSettingsDiagnosticsDataResult {
  diagnostics: PerformanceDiagnosticsView | null;
  diagnosticsBusy: boolean | null;
  localEstimate: LocalStorageEstimate | null;
  originEstimate: OriginStorageEstimate | null;
  persistenceFailureKind?: ActiveSavePersistenceFailureKind | null;
  telemetryUnavailable?: boolean;
  handleArchiveOldSeasons: () => Promise<void>;
  handlePruneStaleData: (confirmedSaveId?: string, eligibility?: PruneStaleEligibility) => Promise<void>;
  refreshDiagnostics: (requestedSaveId?: string | null, preserveOnFailure?: boolean) => Promise<boolean>;
}

interface PendingMaintenanceRecovery {
  prunedCount: number;
  receipt: ActiveSavePersistenceReceipt;
}

interface SettledRead<T> {
  ok: boolean;
  value?: T;
  error?: unknown;
}

interface TelemetryRefreshResult {
  available: boolean;
  installed: boolean;
}

async function settleRead<T>(read: () => Promise<T>): Promise<SettledRead<T>> {
  try {
    return { ok: true, value: await read() };
  } catch (error) {
    return { ok: false, error };
  }
}

/** The archive worker API remains for compatibility, but is intentionally not a player action. */
export function useSettingsDiagnosticsData({
  activeManagedSaveId,
  persistenceFailureKind = null,
  persistenceState,
  persistenceStatus,
  beginSettingsOperation = beginSharedSettingsOperation,
  finishSettingsOperation = (owner) => { finishSharedSettingsOperation(owner); },
  getPersistenceStatus = getActiveSavePersistenceStatus,
  isPersistenceReceiptDurable = isActiveSavePersistenceReceiptDurable,
  getPerformanceDiagnostics,
  onStatusChange,
  persistActiveSave,
  pruneStaleData,
  readLocalStorageEstimate = getLocalStorageEstimate,
  readOriginStorageEstimate: readOriginEstimate = readOriginStorageEstimate,
  settingsOperationBusy = false,
  workerReady,
}: UseSettingsDiagnosticsDataOptions): UseSettingsDiagnosticsDataResult {
  const [diagnostics, setDiagnostics] = useState<PerformanceDiagnosticsView | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [localEstimate, setLocalEstimate] = useState<LocalStorageEstimate | null>(null);
  const [originEstimate, setOriginEstimate] = useState<OriginStorageEstimate | null>(null);
  const [telemetryUnavailable, setTelemetryUnavailable] = useState(false);
  const telemetryRequestRef = useRef(0);
  const activeSaveIdRef = useRef(activeManagedSaveId);
  const mountedRef = useRef(true);
  const pendingMaintenanceRef = useRef<PendingMaintenanceRecovery | null>(null);
  const recoveryInFlightRef = useRef(false);
  const effectiveFailureKind = persistenceStatus?.failureKind ?? persistenceFailureKind;
  const effectivePersistenceState = persistenceStatus?.state ?? persistenceState;
  const displayedOriginEstimate = useMemo(() => (
    effectiveFailureKind === 'quota'
      ? classifyOriginStorageEstimate(
          originEstimate
            ? { usage: originEstimate.usage, quota: originEstimate.quota }
            : undefined,
          effectiveFailureKind,
        )
      : originEstimate
  ), [effectiveFailureKind, originEstimate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      telemetryRequestRef.current += 1;
    };
  }, []);

  const refreshTelemetry = useCallback(async (
    requestedSaveId = activeSaveIdRef.current,
    options: {
      includeWorker?: boolean;
      preserveOnFailure?: boolean;
    } = {},
  ): Promise<TelemetryRefreshResult> => {
    const request = ++telemetryRequestRef.current;
    const includeWorker = options.includeWorker ?? true;
    const preserveOnFailure = options.preserveOnFailure ?? false;
    const workerRead: Promise<SettledRead<PerformanceDiagnosticsView | null>> = includeWorker
      ? (workerReady && getPerformanceDiagnostics
          ? settleRead(async () => await getPerformanceDiagnostics() as PerformanceDiagnosticsView | null)
          : Promise.resolve({ ok: false }))
      : Promise.resolve({ ok: true, value: null });
    const [workerResult, localResult, originResult] = await Promise.all([
      workerRead,
      settleRead(readLocalStorageEstimate),
      settleRead(() => readOriginEstimate()),
    ]);
    const current = mountedRef.current
      && request === telemetryRequestRef.current
      && requestedSaveId === activeSaveIdRef.current;
    if (!current) return { available: false, installed: false };

    if (includeWorker) {
      if (workerResult.ok) setDiagnostics(workerResult.value ?? null);
      else if (!preserveOnFailure) setDiagnostics(null);
      if (!workerResult.ok && workerResult.error != null) {
        logger.error('Failed to refresh exact-save diagnostics:', workerResult.error);
      }
    }
    if (localResult.ok) setLocalEstimate(localResult.value ?? null);
    else if (!preserveOnFailure) setLocalEstimate(null);
    if (!localResult.ok && localResult.error != null) {
      logger.error('Failed to refresh local MBD storage evidence:', localResult.error);
    }
    if (originResult.ok) setOriginEstimate(originResult.value ?? null);
    else if (!preserveOnFailure) setOriginEstimate(null);
    if (!originResult.ok && originResult.error != null) {
      logger.error('Failed to refresh origin storage evidence:', originResult.error);
    }

    const available = (!includeWorker || workerResult.ok)
      && localResult.ok
      && localResult.value?.status !== 'unavailable'
      && originResult.ok
      && originResult.value?.pressure !== 'unavailable';
    setTelemetryUnavailable(!available);
    return { available, installed: true };
  }, [getPerformanceDiagnostics, readLocalStorageEstimate, readOriginEstimate, workerReady]);

  const refreshDiagnostics = useCallback(async (
    requestedSaveId = activeSaveIdRef.current,
    preserveOnFailure = false,
  ): Promise<boolean> => {
    const result = await refreshTelemetry(requestedSaveId, {
      includeWorker: true,
      preserveOnFailure,
    });
    return result.installed;
  }, [refreshTelemetry]);

  useEffect(() => {
    activeSaveIdRef.current = activeManagedSaveId;
    telemetryRequestRef.current += 1;
    if (pendingMaintenanceRef.current?.receipt.saveId !== activeManagedSaveId) {
      pendingMaintenanceRef.current = null;
    }
    setDiagnostics(null);
    setLocalEstimate(null);
    setOriginEstimate(null);
    setTelemetryUnavailable(false);
    void refreshDiagnostics(activeManagedSaveId);
  }, [activeManagedSaveId, refreshDiagnostics]);

  const previousSettingsBusyRef = useRef(settingsOperationBusy);
  useEffect(() => {
    const wasBusy = previousSettingsBusyRef.current;
    previousSettingsBusyRef.current = settingsOperationBusy;
    if (wasBusy && !settingsOperationBusy) {
      void refreshDiagnostics(activeManagedSaveId, true);
    }
  }, [activeManagedSaveId, refreshDiagnostics, settingsOperationBusy]);

  // Persistence-only Retry is owned by the existing save coordinator. Reconcile
  // only the exact retained maintenance generation, under the same Settings
  // operation latch, and never replay the worker mutation or snapshot capture.
  useEffect(() => {
    const pending = pendingMaintenanceRef.current;
    if (
      !pending
      || recoveryInFlightRef.current
      || diagnosticsBusy
      || settingsOperationBusy
      || effectivePersistenceState !== 'saved'
      || persistenceStatus?.saveId !== pending.receipt.saveId
      || persistenceStatus.desiredGeneration !== pending.receipt.generation
      || persistenceStatus.durableGeneration !== pending.receipt.generation
      || persistenceStatus.pendingWrites !== 0
      || activeManagedSaveId !== pending.receipt.saveId
      || !isPersistenceReceiptDurable(pending.receipt)
    ) return;
    const operationOwner = beginSettingsOperation();
    if (!operationOwner) return;

    recoveryInFlightRef.current = true;
    if (mountedRef.current) setDiagnosticsBusy(true);
    void (async () => {
      const refreshed = await refreshTelemetry(pending.receipt.saveId, {
        includeWorker: true,
        preserveOnFailure: true,
      });
      const liveStatus = getPersistenceStatus(pending.receipt.saveId);
      if (
        !refreshed.installed
        || !mountedRef.current
        || activeSaveIdRef.current !== pending.receipt.saveId
        || pendingMaintenanceRef.current !== pending
        || liveStatus.state !== 'saved'
        || liveStatus.saveId !== pending.receipt.saveId
        || liveStatus.desiredGeneration !== pending.receipt.generation
        || liveStatus.durableGeneration !== pending.receipt.generation
        || liveStatus.pendingWrites !== 0
        || !isPersistenceReceiptDurable(pending.receipt)
      ) return;
      pendingMaintenanceRef.current = null;
      onStatusChange(refreshed.available
        ? `Pruned ${pending.prunedCount} stale entries and saved them durably through persistence-only Retry.`
        : `Pruned ${pending.prunedCount} stale entries and saved them durably through persistence-only Retry. Telemetry is temporarily unavailable.`);
    })().finally(() => {
      recoveryInFlightRef.current = false;
      if (mountedRef.current) setDiagnosticsBusy(false);
      finishSettingsOperation(operationOwner);
    });
  }, [
    activeManagedSaveId,
    beginSettingsOperation,
    diagnosticsBusy,
    effectivePersistenceState,
    finishSettingsOperation,
    getPersistenceStatus,
    isPersistenceReceiptDurable,
    onStatusChange,
    persistenceStatus,
    refreshTelemetry,
    settingsOperationBusy,
  ]);

  const handlePruneStaleData = useCallback(async (
    confirmedSaveId?: string,
    eligibility?: PruneStaleEligibility,
  ) => {
    if (
      !activeManagedSaveId
      || !pruneStaleData
      || !getPerformanceDiagnostics
      || confirmedSaveId !== activeManagedSaveId
      || !eligibility
      || !Number.isInteger(eligibility.staleTickerEntries)
      || !Number.isInteger(eligibility.staleWatchers)
      || eligibility.staleTickerEntries < 0
      || eligibility.staleWatchers < 0
    ) return;
    const operationOwner = beginSettingsOperation();
    if (!operationOwner) return;
    setDiagnosticsBusy(true);
    onStatusChange('');
    try {
      const current = await getPerformanceDiagnostics() as PerformanceDiagnosticsView | null;
      if (activeSaveIdRef.current !== confirmedSaveId || activeManagedSaveId !== confirmedSaveId) {
        onStatusChange('Prune confirmation expired because the active save changed. Reopen it to review current facts.');
        return;
      }
      if (
        !current
        || current.queues.staleTickerEntries !== eligibility.staleTickerEntries
        || current.queues.staleWatchers !== eligibility.staleWatchers
      ) {
        onStatusChange('Prune confirmation expired because stale-data eligibility changed. Reopen it to review current facts.');
        return;
      }
      const result = await pruneStaleData() as PruneStaleDataResult;
      if (result.prunedCount === 0) {
        onStatusChange('No expired ticker entries or resolved/expired consequence watchers needed pruning.');
        return;
      }
      const persistence = await persistActiveSave().catch((error: unknown) => {
        logger.error('Failed to persist pruned save state:', error);
        return { acceptedReceipt: null, saved: false as const, saveName: null };
      });
      if (!persistence.saved) {
        const failure = getPersistenceStatus(confirmedSaveId);
        const acceptedReceipt = persistence.acceptedReceipt ?? null;
        pendingMaintenanceRef.current = acceptedReceipt
          && failure.canRetry
          && acceptedReceipt.saveId === confirmedSaveId
          && failure.saveId === acceptedReceipt.saveId
          && failure.desiredGeneration === acceptedReceipt.generation
          && failure.desiredGeneration > failure.durableGeneration
          ? { receipt: acceptedReceipt, prunedCount: result.prunedCount }
          : null;
        const telemetry = await refreshTelemetry(confirmedSaveId, {
          includeWorker: false,
          preserveOnFailure: true,
        });
        if (!telemetry.installed) return;
        onStatusChange(failure.failureKind === 'export'
          ? `Pruned ${result.prunedCount} stale entries in memory, but snapshot capture failed before a durable write. Reload restores the prior durable save; Retry is unavailable.`
          : `Pruned ${result.prunedCount} stale entries in memory, but the change is not durable. Reload restores the prior durable save; ${pendingMaintenanceRef.current ? 'Use the persistence-only Retry in save status.' : 'Retry cannot preserve this maintenance change.'}`);
        return;
      }
      pendingMaintenanceRef.current = null;
      const telemetry = await refreshTelemetry(confirmedSaveId, {
        includeWorker: true,
        preserveOnFailure: true,
      });
      if (!telemetry.installed) return;
      onStatusChange(telemetry.available
        ? `Pruned ${result.prunedCount} expired ticker entries or resolved/expired consequence watchers from the active save.`
        : `Pruned ${result.prunedCount} expired ticker entries or resolved/expired consequence watchers and saved them durably. Telemetry is temporarily unavailable.`);
    } catch (error) {
      logger.error('Failed to prune stale data:', error);
      if (mountedRef.current && activeSaveIdRef.current === confirmedSaveId) {
        onStatusChange('Stale-data maintenance did not complete. No durable storage claim was made.');
      }
    } finally {
      if (mountedRef.current) setDiagnosticsBusy(false);
      finishSettingsOperation(operationOwner);
    }
  }, [
    activeManagedSaveId,
    beginSettingsOperation,
    finishSettingsOperation,
    getPerformanceDiagnostics,
    getPersistenceStatus,
    onStatusChange,
    persistActiveSave,
    pruneStaleData,
    refreshTelemetry,
  ]);

  const handleArchiveOldSeasons = useCallback(async () => {
    onStatusChange('Detailed season history is protected. Lossless archival is not available.');
  }, [onStatusChange]);

  return {
    diagnostics,
    diagnosticsBusy,
    handleArchiveOldSeasons,
    handlePruneStaleData,
    localEstimate,
    originEstimate: displayedOriginEstimate,
    persistenceFailureKind: effectiveFailureKind,
    refreshDiagnostics,
    telemetryUnavailable,
  };
}
