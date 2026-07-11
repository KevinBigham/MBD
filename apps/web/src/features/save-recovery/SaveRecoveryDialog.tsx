import { useEffect } from 'react';
import { AlertTriangle, Download, Eye, RefreshCw, Trash2, X } from 'lucide-react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import type { SaveRecoveryRequest, SaveRecoveryState } from './reducer';

interface SaveRecoveryDialogProps {
  request: SaveRecoveryRequest;
  stateStatus: Exclude<SaveRecoveryState['status'], 'idle' | 'detecting'>;
  detailsVisible: boolean;
  actionError?: string | null;
  onClose: () => void;
  onDelete: () => void;
  onExportRaw: () => void;
  onRepair?: () => void;
  onRetry: () => void;
  onToggleDetails: () => void;
}

function isBusy(status: SaveRecoveryDialogProps['stateStatus']): boolean {
  return status === 'exporting'
    || status === 'deleting'
    || status === 'retrying'
    || status === 'repairing';
}

function busyLabel(status: SaveRecoveryDialogProps['stateStatus']): string | null {
  if (status === 'exporting') return 'Exporting...';
  if (status === 'deleting') return 'Deleting...';
  if (status === 'retrying') return 'Retrying...';
  if (status === 'repairing') return 'Restoring verified copy...';
  return null;
}

export function SaveRecoveryDialog({
  request,
  stateStatus,
  detailsVisible,
  actionError = null,
  onClose,
  onDelete,
  onExportRaw,
  onRepair,
  onRetry,
  onToggleDetails,
}: SaveRecoveryDialogProps) {
  const busy = isBusy(stateStatus);
  const canRepair = request.canRepair && onRepair != null;
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (busy) {
      trapRef.current?.focus();
    }
  }, [busy, trapRef]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-dynasty-base/85 px-4 py-4 backdrop-blur-sm sm:py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-recovery-title"
      aria-describedby="save-recovery-summary save-recovery-body"
    >
      <div
        ref={trapRef}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-lg border border-accent-warning/50 bg-dynasty-surface p-6 shadow-2xl sm:max-h-[calc(100vh-4rem)]"
      >
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-accent-warning/10 p-3 text-accent-warning">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
              Save Recovery
            </div>
            <h2 id="save-recovery-title" className="mt-2 font-heading text-xl font-semibold text-dynasty-textBright">
              {request.slotLabel} needs recovery
            </h2>
            <p id="save-recovery-summary" className="mt-3 font-heading text-sm font-semibold text-dynasty-text">
              {request.title}
            </p>
            <p id="save-recovery-body" className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">
              {request.body}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close save recovery dialog"
            className="focus-ring rounded border border-dynasty-border p-2 text-dynasty-muted transition-colors hover:bg-dynasty-elevated hover:text-dynasty-text disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={onExportRaw}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-dynasty-border px-4 py-3 font-heading text-sm font-semibold text-dynasty-text transition-colors hover:bg-dynasty-elevated disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export raw JSON
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-accent-danger/50 px-4 py-3 font-heading text-sm font-semibold text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete this save
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onToggleDetails}
            aria-expanded={detailsVisible}
            aria-controls="save-recovery-error-details"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-dynasty-border px-4 py-3 font-heading text-sm font-semibold text-dynasty-text transition-colors hover:bg-dynasty-elevated disabled:opacity-50"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
            {detailsVisible ? 'Hide error details' : 'View error details'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRetry}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-accent-primary px-4 py-3 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </button>
          {canRepair ? (
            <button
              type="button"
              disabled={busy}
              onClick={onRepair}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-accent-primary px-4 py-3 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primaryHover disabled:opacity-50 sm:col-span-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Restore verified copy
            </button>
          ) : null}
        </div>

        {busyLabel(stateStatus) ? (
          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-4 rounded border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-sm text-accent-info"
          >
            {busyLabel(stateStatus)}
          </div>
        ) : null}

        {actionError ? (
          <div
            role="alert"
            className="mt-4 rounded border border-accent-danger/50 bg-accent-danger/10 px-3 py-2 font-heading text-sm leading-6 text-accent-danger"
          >
            {actionError}
          </div>
        ) : null}

        {detailsVisible ? (
          <div id="save-recovery-error-details" className="mt-5 rounded border border-dynasty-border bg-dynasty-base p-4">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              Error Details
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words font-data text-xs leading-5 text-dynasty-text">
              {JSON.stringify({
                reason: request.failure.reason,
                slotId: request.failure.detail.slotId,
                schemaVersion: request.failure.detail.schemaVersion ?? null,
                message: request.failure.detail.message,
                integrityFailureKind: request.failure.detail.integrityFailureKind ?? null,
                expectedChecksum: request.failure.detail.expectedChecksum ?? null,
                actualChecksum: request.failure.detail.actualChecksum ?? null,
                repairAvailable: request.canRepair,
                repairUpdatedAt: request.failure.detail.repairUpdatedAt ?? null,
              }, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
