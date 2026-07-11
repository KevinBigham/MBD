import type { LoadSaveSafelyResult, SaveLoadFailureReason } from '@/shared/lib/saveSystem';

export interface SaveRecoveryRequest {
  failure: Extract<LoadSaveSafelyResult, { ok: false }>;
  title: string;
  body: string;
  slotLabel: string;
  exportFilename: string;
  canRepair: boolean;
}

type BusyStatus = 'showing_dialog' | 'exporting' | 'deleting' | 'retrying' | 'repairing';

export type SaveRecoveryState =
  | { status: 'idle'; request: null; detailsVisible: false; actionError: null }
  | { status: 'detecting'; request: null; detailsVisible: false; actionError: null }
  | {
    status: BusyStatus;
    request: SaveRecoveryRequest;
    detailsVisible: boolean;
    actionError: string | null;
  };

export type SaveRecoveryEvent =
  | { type: 'detect' }
  | { type: 'show_failure'; request: SaveRecoveryRequest }
  | { type: 'close' }
  | { type: 'toggle_details' }
  | { type: 'export_start' }
  | { type: 'export_finish' }
  | { type: 'delete_start' }
  | { type: 'delete_finish' }
  | { type: 'delete_failure'; message: string }
  | { type: 'retry_start' }
  | { type: 'retry_success' }
  | { type: 'retry_failure'; request: SaveRecoveryRequest }
  | { type: 'repair_start' }
  | { type: 'repair_failure'; message: string }
  | { type: 'repair_reload_failure'; message: string };

export const initialSaveRecoveryState: SaveRecoveryState = {
  status: 'idle',
  request: null,
  detailsVisible: false,
  actionError: null,
};

const TITLE_BY_REASON: Record<SaveLoadFailureReason, string> = {
  parse: 'The saved JSON is incomplete or malformed.',
  zod: 'The save data is missing required fields.',
  version_too_new: 'This save was created by a newer build.',
  version_too_old: 'This save is older than the supported migration path.',
  migration_failed: 'The save could not be migrated safely.',
  storage_failed: 'The browser storage layer could not read this save.',
  integrity_failed: 'This local save changed after MBD sealed it.',
};

const BODY_BY_REASON: Record<SaveLoadFailureReason, string> = {
  parse: 'MBD could not parse the stored payload. Export the raw JSON before deleting it if you want an escape hatch.',
  zod: 'MBD read the saved payload, but it does not match the expected snapshot shape.',
  version_too_new: 'Do not load this save in the current build. Keep the raw export and return after updating the app.',
  version_too_old: 'This save predates the durable migration chain, so it cannot be upgraded automatically.',
  migration_failed: 'A supported migration path exists, but the migration failed before a safe current snapshot could be produced.',
  storage_failed: 'IndexedDB returned an error while reading the slot. Retrying may work if the browser storage layer recovers.',
  integrity_failed: 'MBD stopped before loading data that changed after it was sealed. This check detects accidental local corruption; it is not a security guarantee or an older-save rollback.',
};

function integrityBody(
  failure: Extract<LoadSaveSafelyResult, { ok: false }>,
  canRepair: boolean,
): string {
  const kind = failure.detail.integrityFailureKind;
  if (kind === 'unavailable') {
    return 'MBD could not run the required SHA-256 integrity check in this browser, so it stopped before loading. This does not mean the save data changed. Keep a raw export and retry in a supported browser.';
  }

  const base = kind === 'unsupported'
    ? 'This build does not understand the save\'s integrity format, so MBD stopped before loading. This does not prove that the save data changed, and the check is not a security guarantee.'
    : BODY_BY_REASON.integrity_failed;
  if (!canRepair) {
    return `${base} No verified same-generation copy is currently available.`;
  }

  const repairTime = failure.detail.repairUpdatedAt
    ? new Date(failure.detail.repairUpdatedAt)
    : null;
  const copyTime = repairTime && !Number.isNaN(repairTime.getTime())
    ? ` from ${repairTime.toLocaleString()}`
    : '';
  return `${base} A verified copy of the same save generation${copyTime} is available to restore.`;
}

function integrityTitle(
  failure: Extract<LoadSaveSafelyResult, { ok: false }>,
): string {
  if (failure.detail.integrityFailureKind === 'unavailable') {
    return 'MBD could not verify this local save in this browser.';
  }
  if (failure.detail.integrityFailureKind === 'unsupported') {
    return 'This build cannot verify the save\'s integrity format.';
  }
  return TITLE_BY_REASON.integrity_failed;
}

function slotLabel(slotNumber: number | null, slotId: string): string {
  return slotNumber == null ? slotId : `Slot ${slotNumber}`;
}

function exportFilename(slotId: string): string {
  return `mbd-${slotId}-recovery.json`;
}

export function createSaveRecoveryRequest(
  failure: Extract<LoadSaveSafelyResult, { ok: false }>,
): SaveRecoveryRequest {
  const canRepair = failure.reason === 'integrity_failed'
    && failure.detail.repairAvailable === true;
  return {
    failure,
    title: failure.reason === 'integrity_failed'
      ? integrityTitle(failure)
      : TITLE_BY_REASON[failure.reason],
    body: failure.reason === 'integrity_failed'
      ? integrityBody(failure, canRepair)
      : BODY_BY_REASON[failure.reason],
    slotLabel: slotLabel(failure.detail.slotNumber, failure.detail.slotId),
    exportFilename: exportFilename(failure.detail.slotId),
    canRepair,
  };
}

function withCurrentRequest(
  state: SaveRecoveryState,
  status: BusyStatus,
): SaveRecoveryState {
  if (!state.request) {
    return state;
  }

  return {
    ...state,
    status,
    actionError: null,
  };
}

export function saveRecoveryReducer(
  state: SaveRecoveryState,
  event: SaveRecoveryEvent,
): SaveRecoveryState {
  switch (event.type) {
    case 'detect':
      return {
        status: 'detecting',
        request: null,
        detailsVisible: false,
        actionError: null,
      };
    case 'show_failure':
      return {
        status: 'showing_dialog',
        request: event.request,
        detailsVisible: false,
        actionError: null,
      };
    case 'close':
    case 'delete_finish':
    case 'retry_success':
      return initialSaveRecoveryState;
    case 'toggle_details':
      if (!state.request) {
        return state;
      }
      return {
        ...state,
        detailsVisible: !state.detailsVisible,
      };
    case 'export_start':
      return withCurrentRequest(state, 'exporting');
    case 'export_finish':
      return withCurrentRequest(state, 'showing_dialog');
    case 'delete_start':
      return withCurrentRequest(state, 'deleting');
    case 'delete_failure':
      if (!state.request) {
        return state;
      }
      return {
        ...state,
        status: 'showing_dialog',
        actionError: event.message,
      };
    case 'retry_start':
      return withCurrentRequest(state, 'retrying');
    case 'repair_start':
      return withCurrentRequest(state, 'repairing');
    case 'retry_failure':
      return {
        status: 'showing_dialog',
        request: event.request,
        detailsVisible: state.request === event.request ? state.detailsVisible : false,
        actionError: null,
      };
    case 'repair_failure':
      if (!state.request) {
        return state;
      }
      return {
        ...state,
        status: 'showing_dialog',
        request: {
          ...state.request,
          title: 'The verified copy could not be restored.',
          body: 'MBD rechecked storage before replacing anything and could not complete a verified restore. No repair source is currently being offered. Export the raw JSON, use Retry to recheck the save, or delete it.',
          canRepair: false,
        },
        actionError: event.message,
      };
    case 'repair_reload_failure':
      if (!state.request) {
        return state;
      }
      return {
        ...state,
        status: 'showing_dialog',
        request: {
          ...state.request,
          title: 'The verified copy was restored, but loading is still blocked.',
          body: 'MBD restored the verified same-generation copy without replaying gameplay, but the ordinary load still failed. This integrity check is not a security guarantee. Use Retry to try the load again.',
          canRepair: false,
        },
        actionError: event.message,
      };
    default:
      return state;
  }
}
