import { Trophy } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { EmptyStatePanel } from '@/shared/components/EmptyStatePanel';
import type { LeaderboardEntry } from '@/shared/lib/saveSystem';

interface LocalLeaderboardPanelProps {
  leaderboardEntries: LeaderboardEntry[];
}

export default function LocalLeaderboardPanel({ leaderboardEntries }: LocalLeaderboardPanelProps) {
  return (
    <DensePanel
      title="Local Leaderboard"
      icon={<Trophy className="h-4 w-4 text-accent-success" />}
      titleClassName="text-dynasty-textBright"
      bodyClassName="space-y-3"
    >
      {leaderboardEntries.length > 0 ? leaderboardEntries.map((entry, index) => (
        <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-textBright">
                #{index + 1} · {entry.gmName}
              </div>
              <div className="mt-1 font-data text-xs text-dynasty-muted">
                {entry.teamName} · Season {entry.season} · {entry.record}
              </div>
            </div>
            <div className="font-brand text-2xl text-accent-primary">{entry.score}</div>
          </div>
          <div className="mt-2 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
        </div>
      )) : (
        <EmptyStatePanel
          title="No leaderboard entries yet"
          description="Save snapshots populate the cross-save leaderboard automatically."
        />
      )}
    </DensePanel>
  );
}
