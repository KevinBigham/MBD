import { useEffect } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';

export interface PendingRosterActionView {
  kind: 'promote' | 'demote' | 'dfa';
  playerId: string;
  playerName: string;
  position: string;
  detail: string;
  consequence: string;
  confirmLabel: string;
  actionId: string;
}

interface RosterActionConfirmationModalProps {
  action: PendingRosterActionView;
  busyAction: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RosterActionConfirmationModal({
  action,
  busyAction,
  onCancel,
  onConfirm,
}: RosterActionConfirmationModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-6">
      <Card
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-action-confirmation-title"
        tabIndex={-1}
        className="w-full max-w-xl border-accent-warning/40 shadow-2xl"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle id="roster-action-confirmation-title" className="font-heading text-dynasty-text">
              Confirm Roster Move
            </CardTitle>
            <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {action.kind} | {action.position}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
            <div className="font-heading text-base text-dynasty-textBright">{action.playerName}</div>
            <div className="mt-1 font-data text-xs text-dynasty-muted">{action.detail}</div>
          </div>
          <div className="rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
            {action.consequence}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Keep Current Roster
            </Button>
            <Button
              type="button"
              variant={action.kind === 'dfa' ? 'destructive' : 'default'}
              loading={busyAction === action.actionId}
              onClick={onConfirm}
            >
              {action.confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
