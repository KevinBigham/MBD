import { ChevronRight } from 'lucide-react';

export interface OffseasonTransactionGroupView {
  phase: string;
  label: string;
  rows: Array<{
    id: string;
    tone: 'user' | 'division_rival' | 'neutral';
    summary: string;
  }>;
}

function rowToneClasses(tone: 'user' | 'division_rival' | 'neutral') {
  switch (tone) {
    case 'user':
      return 'border-l-2 border-accent-success bg-accent-success/10 text-accent-success';
    case 'division_rival':
      return 'border-l-2 border-accent-warning bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-l-2 border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
}

export function OffseasonTransactionLedgerPanel({
  transactionGroups,
  expandedPhases,
  onToggleGroup,
}: {
  transactionGroups: OffseasonTransactionGroupView[];
  expandedPhases: Record<string, boolean>;
  onToggleGroup: (groupPhase: string) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="border-b border-dynasty-border px-4 py-3">
        <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
          Completed Transactions
        </h2>
      </div>
      <div className="space-y-3 p-4">
        {transactionGroups.map((group) => {
          const expanded = expandedPhases[group.phase] ?? true;
          return (
            <div key={group.phase} className="rounded border border-dynasty-border bg-dynasty-elevated/40">
              <button
                type="button"
                onClick={() => onToggleGroup(group.phase)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <div>
                  <div className="font-heading text-sm font-semibold text-dynasty-textBright">
                    {group.label}
                  </div>
                  <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    {group.rows.length} transaction{group.rows.length === 1 ? '' : 's'}
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-dynasty-muted transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </button>
              {expanded && (
                <div className="space-y-2 border-t border-dynasty-border px-3 py-3">
                  {group.rows.map((row) => (
                    <div key={row.id} className={`rounded px-3 py-2 font-data text-xs ${rowToneClasses(row.tone)}`}>
                      {row.summary}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
