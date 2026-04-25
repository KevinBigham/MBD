import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { deleteSaveById, type LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';
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
  onDelete?: () => Promise<void> | void;
  onRetry?: () => RetryResult;
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
  toggleDetails: () => void;
}

const SaveRecoveryContext = createContext<SaveRecoveryContextValue | null>(null);

function activeDialogStatus(state: SaveRecoveryState): Exclude<SaveRecoveryState['status'], 'idle' | 'detecting'> | null {
  return state.status === 'idle' || state.status === 'detecting' ? null : state.status;
}

export function SaveRecoveryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(saveRecoveryReducer, initialSaveRecoveryState);
  const actionsRef = useRef<SaveRecoveryActions>({});
  const stateRef = useRef(state);
  stateRef.current = state;

  const showFailure = useCallback((options: ShowSaveRecoveryOptions) => {
    const request = createSaveRecoveryRequest(options.failure);
    actionsRef.current = {
      onDelete: options.onDelete,
      onRetry: options.onRetry,
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
      if (actionsRef.current.onDelete) {
        await actionsRef.current.onDelete();
      } else {
        await deleteSaveById(request.failure.detail.slotId);
      }
      actionsRef.current = {};
      dispatch({ type: 'delete_finish' });
    } catch (error) {
      logger.error('Failed to delete broken save:', error);
      dispatch({ type: 'show_failure', request });
    }
  }, []);

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
    toggleDetails,
  }), [close, deleteBrokenSave, exportRaw, retry, showFailure, state, toggleDetails]);

  const dialogStatus = activeDialogStatus(state);

  return (
    <SaveRecoveryContext.Provider value={value}>
      {children}
      {dialogStatus && state.request ? (
        <SaveRecoveryDialog
          request={state.request}
          stateStatus={dialogStatus}
          detailsVisible={state.detailsVisible}
          onClose={close}
          onDelete={() => void deleteBrokenSave()}
          onExportRaw={() => void exportRaw()}
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
