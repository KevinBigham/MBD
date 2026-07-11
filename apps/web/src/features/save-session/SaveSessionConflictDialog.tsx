import { type KeyboardEvent, useEffect, useId, useRef } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

export type SaveSessionConflictKind =
  | 'contended'
  | 'unavailable'
  | 'request_failed'
  | 'ownership_lost'
  | 'unknown_tree';

export interface SaveSessionConflictDialogProps {
  targetLabel?: string | null;
  targetName?: string | null;
  slotNumber?: number | null;
  failureKind: SaveSessionConflictKind;
  checking: boolean;
  actionError?: string | null;
  onCheckAgain: () => void;
}

interface ConflictCopy {
  title: string;
  summary: string;
  body: string;
  result: string;
}

const CONFLICT_COPY: Record<SaveSessionConflictKind, ConflictCopy> = {
  contended: {
    title: 'Dynasty already open',
    summary: 'Another MBD tab controls editing for this dynasty.',
    body: 'To prevent competing writes, this tab stopped before gameplay loaded. Close the other tab completely, then check again. Leaving the owner in the background does not release the dynasty.',
    result: 'Still locked. Close the owning tab completely, then check again.',
  },
  unavailable: {
    title: 'Safe editing unavailable',
    summary: 'This browser window cannot provide the exclusive-tab protection MBD requires.',
    body: 'MBD stopped before loading gameplay so two tabs cannot write the same dynasty. Open MBD in a supported, secure browser window, then check again.',
    result: 'This tab remains locked. Gameplay has not loaded and this save has not been written here.',
  },
  request_failed: {
    title: 'Couldn\u2019t verify exclusive access',
    summary: 'The browser rejected MBD\u2019s request to protect this save session.',
    body: 'MBD stopped before loading gameplay. This is a browser coordination problem, not save corruption or a failed autosave. Close other MBD tabs or use a supported, secure browser window, then check again.',
    result: 'Exclusive access was not verified. This tab remains locked and has not changed the save.',
  },
  ownership_lost: {
    title: 'Editing ownership changed',
    summary: 'This tab lost exclusive editing ownership before the dynasty finished opening.',
    body: 'MBD stopped before activating gameplay. The browser did not reject this request, and this is not save corruption or a failed autosave. Close or reload other MBD tabs, then check again.',
    result: 'Editing ownership is no longer current. This tab remains locked and has not changed the save.',
  },
  unknown_tree: {
    title: 'Couldn\u2019t identify this save tree',
    summary: 'MBD cannot safely determine which root dynasty owns this save or branch.',
    body: 'MBD stopped before loading gameplay so related root and what-if saves cannot race. Check again after browser storage is available. If this repeats, reload MBD and choose the dynasty from the Save Hub.',
    result: 'Save-tree ownership is still unknown. This tab remains locked and has not changed the save.',
  },
};

function normalizedText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function targetDetails(
  targetName: string | null | undefined,
  targetLabel: string | null | undefined,
  slotNumber: number | null | undefined,
): string[] {
  const slotLabel = typeof slotNumber === 'number'
    && Number.isInteger(slotNumber)
    && slotNumber > 0
    ? `Slot ${slotNumber}`
    : null;

  return Array.from(new Set([
    normalizedText(targetName),
    normalizedText(targetLabel),
    slotLabel,
  ].filter((value): value is string => value != null)));
}

export function SaveSessionConflictDialog({
  targetLabel = null,
  targetName = null,
  slotNumber = null,
  failureKind,
  checking,
  actionError = null,
  onCheckAgain,
}: SaveSessionConflictDialogProps) {
  const copy = CONFLICT_COPY[failureKind];
  const details = targetDetails(targetName, targetLabel, slotNumber);
  const titleId = useId();
  const summaryId = useId();
  const bodyId = useId();
  const targetId = useId();
  const statusId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const checkAgainRef = useRef<HTMLButtonElement>(null);
  const describedBy = [summaryId, bodyId, details.length > 0 ? targetId : null, statusId]
    .filter((id): id is string => id != null)
    .join(' ');

  useEffect(() => {
    if (checking) {
      trapRef.current?.focus();
      return;
    }
    checkAgainRef.current?.focus();
  }, [checking, trapRef]);

  const preventDismiss = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      data-failure-kind={failureKind}
      onKeyDown={preventDismiss}
      className="fixed inset-0 z-[70] flex min-h-[100dvh] w-full items-center justify-center overflow-y-auto bg-dynasty-base/95 px-4 py-4 text-dynasty-text backdrop-blur-sm sm:py-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      <div
        ref={trapRef}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto overscroll-contain rounded-lg border border-accent-warning/50 bg-dynasty-surface p-5 shadow-2xl sm:max-h-[calc(100vh-4rem)] sm:p-8"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-full border border-accent-warning/30 bg-accent-warning/10 p-3 text-accent-warning">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
              Save Session Guard
            </div>
            <h1
              id={titleId}
              className="mt-2 font-heading text-2xl font-semibold leading-tight text-dynasty-textBright"
            >
              {copy.title}
            </h1>
          </div>
        </div>

        <p
          id={summaryId}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="mt-6 font-heading text-base font-semibold leading-6 text-dynasty-textBright"
        >
          {copy.summary}
        </p>
        <p
          id={bodyId}
          className="mt-3 font-heading text-sm leading-6 text-dynasty-muted"
        >
          {copy.body}
        </p>

        {details.length > 0 ? (
          <div className="mt-5 rounded-md border border-dynasty-border bg-dynasty-base/60 px-4 py-3">
            <div className="font-data text-[10px] uppercase tracking-[0.2em] text-dynasty-muted">
              Locked target
            </div>
            <p
              id={targetId}
              className="mt-1 break-words font-heading text-sm font-semibold leading-6 text-dynasty-textBright"
            >
              {details.join(' \u00b7 ')}
            </p>
          </div>
        ) : null}

        <div
          id={statusId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-5 rounded-md border border-accent-info/30 bg-accent-info/10 px-4 py-3 font-heading text-sm leading-6 text-accent-info"
        >
          {checking ? 'Checking for exclusive access\u2026' : copy.result}
        </div>

        {actionError ? (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="mt-4 rounded-md border border-accent-danger/50 bg-accent-danger/10 px-4 py-3 font-heading text-sm leading-6 text-accent-danger"
          >
            {actionError}
          </div>
        ) : null}

        <button
          ref={checkAgainRef}
          type="button"
          disabled={checking}
          aria-busy={checking}
          aria-label={checking ? 'Checking for exclusive save access' : 'Check again'}
          onClick={() => {
            if (!checking) onCheckAgain();
          }}
          className="focus-ring mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-accent-primary/60 bg-accent-primary/15 px-4 py-3 font-heading text-sm font-semibold text-accent-primary transition-colors hover:bg-accent-primary/25 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${checking ? 'animate-spin motion-reduce:animate-none' : ''}`}
            aria-hidden="true"
          />
          {checking ? 'Checking\u2026' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
