import { Component, type ReactNode } from 'react';
import { type LoadSaveSafelyResult } from '@/shared/lib/saveSystem';
import { logger } from '@/shared/lib/logger';
import { useSaveRecovery } from './SaveRecoveryProvider';

const SAVE_LOAD_RECOVERY_ERROR = Symbol('SaveLoadRecoveryError');

export interface SaveLoadRecoveryError extends Error {
  [SAVE_LOAD_RECOVERY_ERROR]: true;
  failure: Extract<LoadSaveSafelyResult, { ok: false }>;
}

export function createSaveLoadRecoveryError(
  failure: Extract<LoadSaveSafelyResult, { ok: false }>,
): SaveLoadRecoveryError {
  const error = new Error(failure.detail.message) as SaveLoadRecoveryError;
  error.name = 'SaveLoadRecoveryError';
  error[SAVE_LOAD_RECOVERY_ERROR] = true;
  error.failure = failure;
  return error;
}

export function isSaveLoadRecoveryError(error: unknown): error is SaveLoadRecoveryError {
  return Boolean(
    error
    && typeof error === 'object'
    && (error as { [SAVE_LOAD_RECOVERY_ERROR]?: unknown })[SAVE_LOAD_RECOVERY_ERROR] === true,
  );
}

interface SaveLoadErrorBoundaryImplProps {
  children: ReactNode;
  onRecovery: (
    failure: Extract<LoadSaveSafelyResult, { ok: false }>,
    resetBoundary: () => void,
  ) => void;
}

interface SaveLoadErrorBoundaryImplState {
  error: unknown;
}

class SaveLoadErrorBoundaryImpl extends Component<
  SaveLoadErrorBoundaryImplProps,
  SaveLoadErrorBoundaryImplState
> {
  constructor(props: SaveLoadErrorBoundaryImplProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): SaveLoadErrorBoundaryImplState {
    return { error };
  }

  componentDidCatch(error: unknown, info: { componentStack: string }) {
    if (!isSaveLoadRecoveryError(error)) {
      return;
    }

    logger.error('SaveLoadErrorBoundary caught a save-load failure:', error, info);
    this.props.onRecovery(error.failure, () => {
      this.setState({ error: null });
    });
  }

  render() {
    if (this.state.error) {
      if (isSaveLoadRecoveryError(this.state.error)) {
        return null;
      }

      throw this.state.error;
    }

    return this.props.children;
  }
}

export function SaveLoadErrorBoundary({ children }: { children: ReactNode }) {
  const recovery = useSaveRecovery();

  return (
    <SaveLoadErrorBoundaryImpl
      onRecovery={(failure, resetBoundary) => {
        recovery.showFailure({
          failure,
          onRetry: () => {
            resetBoundary();
          },
        });
      }}
    >
      {children}
    </SaveLoadErrorBoundaryImpl>
  );
}
