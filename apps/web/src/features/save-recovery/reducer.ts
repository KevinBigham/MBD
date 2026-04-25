import type { LoadSaveSafelyResult, SaveLoadFailureReason } from '@/shared/lib/saveSystem';

export interface SaveRecoveryRequest {
  failure: Extract<LoadSaveSafelyResult, { ok: false }>;
  title: string;
  body: string;
  slotLabel: string;
  exportFilename: string;
}

type BusyStatus = 'showing_dialog' | 'exporting' | 'deleting' | 'retrying';

export type SaveRecoveryState =
  | { status: 'idle'; request: null; detailsVisible: false }
  | { status: 'detecting'; request: null; detailsVisible: false }
  | { status: BusyStatus; request: SaveRecoveryRequest; detailsVisible: boolean };

export type SaveRecoveryEvent =
  | { type: 'detect' }
  | { type: 'show_failure'; request: SaveRecoveryRequest }
  | { type: 'close' }
  | { type: 'toggle_details' }
  | { type: 'export_start' }
  | { type: 'export_finish' }
  | { type: 'delete_start' }
  | { type: 'delete_finish' }
  | { type: 'retry_start' }
  | { type: 'retry_success' }
  | { type: 'retry_failure'; request: SaveRecoveryRequest };

export const initialSaveRecoveryState: SaveRecoveryState = {
  status: 'idle',
  request: null,
  detailsVisible: false,
};

const TITLE_BY_REASON: Record<SaveLoadFailureReason, string> = {
  parse: 'The saved JSON is incomplete or malformed.',
  zod: 'The save data is missing required fields.',
  version_too_new: 'This save was created by a newer build.',
  version_too_old: 'This save is older than the supported migration path.',
  migration_failed: 'The save could not be migrated safely.',
  storage_failed: 'The browser storage layer could not read this save.',
};

const BODY_BY_REASON: Record<SaveLoadFailureReason, string> = {
  parse: 'MBD could not parse the stored payload. Export the raw JSON before deleting it if you want an escape hatch.',
  zod: 'MBD read the saved payload, but it does not match the expected snapshot shape.',
  version_too_new: 'Do not load this save in the current build. Keep the raw export and return after updating the app.',
  version_too_old: 'This save predates the durable migration chain, so it cannot be upgraded automatically.',
  migration_failed: 'A supported migration path exists, but the migration failed before a safe current snapshot could be produced.',
  storage_failed: 'IndexedDB returned an error while reading the slot. Retrying may work if the browser storage layer recovers.',
};

function slotLabel(slotNumber: number | null, slotId: string): string {
  return slotNumber == null ? slotId : `Slot ${slotNumber}`;
}

function exportFilename(slotId: string): string {
  return `mbd-${slotId}-recovery.json`;
}

export function createSaveRecoveryRequest(
  failure: Extract<LoadSaveSafelyResult, { ok: false }>,
): SaveRecoveryRequest {
  return {
    failure,
    title: TITLE_BY_REASON[failure.reason],
    body: BODY_BY_REASON[failure.reason],
    slotLabel: slotLabel(failure.detail.slotNumber, failure.detail.slotId),
    exportFilename: exportFilename(failure.detail.slotId),
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
      };
    case 'show_failure':
      return {
        status: 'showing_dialog',
        request: event.request,
        detailsVisible: false,
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
    case 'retry_start':
      return withCurrentRequest(state, 'retrying');
    case 'retry_failure':
      return {
        status: 'showing_dialog',
        request: event.request,
        detailsVisible: state.request === event.request ? state.detailsVisible : false,
      };
    default:
      return state;
  }
}
