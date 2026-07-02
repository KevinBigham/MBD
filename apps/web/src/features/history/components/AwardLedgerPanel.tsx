import { Award } from 'lucide-react';
import type { AwardHistoryEntry } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';

interface AwardLedgerPanelProps {
  awardHistory: AwardHistoryEntry[];
  formatAwardLabel: (award: string) => string;
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}

export default function AwardLedgerPanel({
  awardHistory,
  formatAwardLabel,
  playerName,
  teamName,
}: AwardLedgerPanelProps) {
  return (
    <DensePanel
      title="Award Ledger"
      className="xl:col-span-2"
      icon={<Award className="h-4 w-4 text-accent-info" />}
      titleClassName="text-dynasty-textBright"
      bodyClassName="space-y-3"
    >
      {awardHistory.length > 0 ? awardHistory.map((entry) => (
        <div key={`${entry.season}-${entry.award}-${entry.playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-sm text-dynasty-text">
              Season {entry.season} {entry.league} {formatAwardLabel(entry.award)}
            </div>
            <div className="font-data text-xs text-dynasty-muted">
              {teamName(entry.teamId)}
            </div>
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {playerName(entry.playerId)}
          </div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            {entry.summary}
          </div>
        </div>
      )) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
          No awards recorded yet. Complete a season to start building the ledger.
        </div>
      )}
    </DensePanel>
  );
}
