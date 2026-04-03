import { AlertTriangle, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';

interface SaveRecoveryDialogProps {
  slot: number;
  message: string;
  busy?: boolean;
  onRepair: () => void;
  onStartFresh: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function SaveRecoveryDialog({
  slot,
  message,
  busy = false,
  onRepair,
  onStartFresh,
  onDelete,
  onClose,
}: SaveRecoveryDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dynasty-base/80 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-accent-warning/40 bg-dynasty-surface p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-accent-warning/10 p-3 text-accent-warning">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
              Save Recovery
            </div>
            <h2 className="mt-2 font-heading text-xl font-semibold text-dynasty-textBright">
              Slot {slot} needs attention
            </h2>
            <p className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <button
            type="button"
            disabled={busy}
            onClick={onRepair}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-accent-primary px-4 py-3 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Try to repair
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onStartFresh}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-dynasty-border px-4 py-3 font-heading text-sm text-dynasty-text hover:bg-dynasty-elevated disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Start fresh
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-accent-danger/40 px-4 py-3 font-heading text-sm text-accent-danger hover:bg-accent-danger/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Delete this save
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-md border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-wide text-dynasty-muted hover:bg-dynasty-elevated disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
