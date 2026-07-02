import { Flame, Trophy } from 'lucide-react';
import type { ActiveBiddingWar } from './DeadlineDramaPanelBody';

interface DeadlineBiddingWarCardProps {
  war: ActiveBiddingWar;
}

export default function DeadlineBiddingWarCard({ war }: DeadlineBiddingWarCardProps) {
  const sortedRounds = [...war.rounds].sort((a, b) => a.round - b.round);

  return (
    <div className="rounded-xl border border-accent-warning/30 bg-accent-warning/5 p-4">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-accent-warning" />
        <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">
          Active Bidding War
        </h3>
        {war.settled && (
          <span className="rounded-full border border-accent-success/40 bg-accent-success/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-accent-success">
            Settled
          </span>
        )}
      </div>
      <div className="mt-3 font-heading text-base font-semibold text-accent-warning">
        {war.targetPlayerName}
      </div>
      <div className="mt-3 space-y-2">
        {sortedRounds.map((round) => {
          const isWinner = war.settled && war.winnerId === round.teamId;
          return (
            <div
              key={`${round.teamId}-${round.round}`}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                isWinner
                  ? 'border-accent-success/40 bg-accent-success/10'
                  : 'border-dynasty-border bg-dynasty-surface'
              }`}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dynasty-border bg-dynasty-elevated font-data text-[10px] text-dynasty-muted">
                {round.round}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading text-sm text-dynasty-text">
                  {round.offerDescription}
                </div>
              </div>
              {isWinner && (
                <Trophy className="h-4 w-4 shrink-0 text-accent-success" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
