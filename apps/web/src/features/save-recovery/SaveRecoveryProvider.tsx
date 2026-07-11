import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { retireSaveTreePersistenceForDelete } from '@/shared/lib/activeSavePersistence';
import {
  deleteSaveById,
  resolveSaveSessionTarget,
  type LoadSaveSafelyResult,
} from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';
import {
  isSaveSessionOwnershipError,
  saveSessionOwnershipFailureMessage,
  SaveSessionOwnershipError,
  withTransientSaveSessionOwnership,
} from '@/shared/lib/saveSessionOwnership';
import { downloadRawRecoveryJson } from './download';
import { SaveRecoveryDialog } from './SaveRecoveryDialog';
import {
  createSaveRecoveryRequest,
  initialSaveRecoveryState,
  saveRecoveryReducer,
  type SaveRecoveryRequest,
  type SaveRecoveryState,
} from './reducer';

type RetryResult = boolean | void | Promise<boolean | void>;

interface SaveRecoveryActions {
  onDelete?: () => Promise<boolean | void> | boolean | void;
  onRetry?: () => RetryResult;
  onRepair?: () => RetryResult;
}

export interface ShowSaveRecoveryOptions extends SaveRecoveryActions {
  failure: Extract<LoadSaveSafelyResult, { ok: false }>;
}

interface SaveRecoveryContextValue {
  state: SaveRecoveryState;
  showFailure: (options: ShowSaveRecoveryOptions) => SaveRecoveryRequest;
  close: () => void;
  exportRaw: () => Promise<void>;
  deleteBrokenSave: () => Promise<void>;
  retry: () => Promise<void>;
  repair: () => Promise<void>;
  toggleDetails: () => void;
}

const SaveRecoveryContext = createContext<SaveRecoveryContextValue | null>(null);

const REPAIR_FAILURE_MESSAGE =
  'MBD could not restore the verified copy. Nothing was replaced. Export the raw JSON, use Retry to recheck the save, or delete it.';
const REPAIR_RELOAD_FAILURE_MESSAGE =
  'The verified copy was restored, but MBD could not load it. The restored data remains in place; use Retry to try the ordinary load again.';
const DELETE_FAILURE_MESSAGE =
  'MBD could not safely finish deleting this save. No successful deletion was recorded; export the raw JSON, recover the related save if prompted, or retry.';

function recoveryTargetLabel(request: SaveRecoveryRequest): string {
  return request.failure.detail.slotNumber != null
    ? `Slot ${request.failure.detail.slotNumber}`
    : request.failure.detail.slotId;
}

function activeDialogStatus(state: SaveRecoveryState): Exclude<SaveRecoveryState['status'], 'idle' | 'detecting'> | null {
  return state.status === 'idle' || state.status === 'detecting' ? null : state.status;
}

export function SaveRecoveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(saveRecoveryReducer, initialSaveRecoveryState);
  const actionsRef = useRef<SaveRecoveryActions>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const withRequestOwnership = useCallback(async <T,>(
    request: SaveRecoveryRequest,
    operation: () => Promise<T>,
  ): Promise<T> => {
    const target = await resolveSaveSessionTarget(request.failure.detail.slotId);
    if (!target) {
      throw new SaveSessionOwnershipError(
        'unknown_tree',
        'MBD could not identify the root dynasty for this recovery action.',
        null,
      );
    }
    return withTransientSaveSessionOwnership(target.rootSaveId, operation);
  }, []);

  const showFailure = useCallback((options: ShowSaveRecoveryOptions) => {
    const request = createSaveRecoveryRequest(options.failure);
    actionsRef.current = {
      onDelete: options.onDelete,
      onRetry: options.onRetry,
      onRepair: options.onRepair,
    };
    dispatch({ type: 'show_failure', request });
    return request;
  }, []);

  const close = useCallback(() => {
    actionsRef.current = {};
    dispatch({ type: 'close' });
  }, []);

  const exportRaw = useCallback(async () => {
    const request = stateRef.current.request;
    if (!request) {
      return;
    }

    dispatch({ type: 'export_start' });
    try {
      downloadRawRecoveryJson(request);
    } catch (error) {
      logger.error('Failed to export raw recovery JSON:', error);
    } finally {
      dispatch({ type: 'export_finish' });
    }
  }, []);

  const deleteBrokenSave = useCallback(async () => {
    const request = stateRef.current.request;
    if (!request) {
      return;
    }

    dispatch({ type: 'delete_start' });
    try {
      const deleted = await withRequestOwnership(request, async () => {
        if (actionsRef.current.onDelete) {
          return await actionsRef.current.onDelete();
        }
        await retireSaveTreePersistenceForDelete(
          request.failure.detail.slotId,
          async () => {
            await deleteSaveById(request.failure.detail.slotId);
          },
        );
        return true;
      });
      if (deleted === false) {
        dispatch({ type: 'show_failure', request });
        return;
      }
      actionsRef.current = {};
      dispatch({ type: 'delete_finish' });
    } catch (error) {
      logger.error('Failed to delete broken save:', error);
      dispatch({
        type: 'delete_failure',
        message: isSaveSessionOwnershipError(error)
          ? saveSessionOwnershipFailureMessage(
              error,
              recoveryTargetLabel(request),
              'Nothing was deleted.',
            )
          : DELETE_FAILURE_MESSAGE,
      });
    }
  }, [withRequestOwnership]);

  const retry = useCallback(async () => {
    const request = stateRef.current.request;
    if (!request) {
      return;
    }

    dispatch({ type: 'retry_start' });
    try {
      const result = await actionsRef.current.onRetry?.();
      if (result === false) {
        dispatch({ type: 'retry_failure', request });
        return;
      }
      actionsRef.current = {};
      dispatch({ type: 'retry_success' });
    } catch (error) {
      logger.error('Failed to retry save load:', error);
      dispatch({ type: 'retry_failure', request });
    }
  }, []);

  const repair = useCallback(async () => {
    const request = stateRef.current.request;
    const { onRepair, onRetry } = actionsRef.current;
    if (!request?.canRepair || !onRepair || !onRetry) {
      return;
    }

    dispatch({ type: 'repair_start' });
    try {
      const repaired = await withRequestOwnership(request, async () => onRepair());
      if (stateRef.current.request !== request) {
        return;
      }
      if (repaired === false) {
        dispatch({ type: 'repair_failure', message: REPAIR_FAILURE_MESSAGE });
        return;
      }
    } catch (error) {
      logger.error('Failed to restore verified save copy:', error);
      if (stateRef.current.request === request) {
        dispatch({
          type: 'repair_failure',
          message: isSaveSessionOwnershipError(error)
            ? saveSessionOwnershipFailureMessage(
                error,
                recoveryTargetLabel(request),
                'Nothing was restored.',
              )
            : REPAIR_FAILURE_MESSAGE,
        });
      }
      return;
    }

    dispatch({ type: 'retry_start' });
    try {
      const loaded = await onRetry();
      if (stateRef.current.request !== request) {
        return;
      }
      if (loaded === false) {
        dispatch({
          type: 'repair_reload_failure',
          message: REPAIR_RELOAD_FAILURE_MESSAGE,
        });
        return;
      }
      actionsRef.current = {};
      dispatch({ type: 'retry_success' });
    } catch (error) {
      logger.error('Failed to load restored save copy:', error);
      if (stateRef.current.request === request) {
        dispatch({
          type: 'repair_reload_failure',
          message: REPAIR_RELOAD_FAILURE_MESSAGE,
        });
      }
    }
  }, [withRequestOwnership]);

  const toggleDetails = useCallback(() => {
    dispatch({ type: 'toggle_details' });
  }, []);

  const value = useMemo<SaveRecoveryContextValue>(() => ({
    state,
    showFailure,
    close,
    exportRaw,
    deleteBrokenSave,
    retry,
    repair,
    toggleDetails,
  }), [close, deleteBrokenSave, exportRaw, repair, retry, showFailure, state, toggleDetails]);

  const dialogStatus = activeDialogStatus(state);

  return (
    <SaveRecoveryContext.Provider value={value}>
      {children}
      {dialogStatus && state.request ? (
        <SaveRecoveryDialog
          request={state.request}
          stateStatus={dialogStatus}
          detailsVisible={state.detailsVisible}
          actionError={state.actionError}
          onClose={close}
          onDelete={() => void deleteBrokenSave()}
          onExportRaw={() => void exportRaw()}
          onRepair={state.request.canRepair && actionsRef.current.onRepair && actionsRef.current.onRetry
            ? () => void repair()
            : undefined}
          onRetry={() => void retry()}
          onToggleDetails={toggleDetails}
        />
      ) : null}
    </SaveRecoveryContext.Provider>
  );
}

export function useSaveRecovery(): SaveRecoveryContextValue {
  const value = useContext(SaveRecoveryContext);
  if (!value) {
    throw new Error('useSaveRecovery must be used within SaveRecoveryProvider.');
  }
  return value;
}
