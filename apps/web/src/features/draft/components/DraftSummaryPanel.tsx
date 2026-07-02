import { Check } from 'lucide-react';
import type { DraftRoomView } from '@/workers/sim.worker.helpers';

function gradeChipClass(grade: number): string {
  if (grade >= 60) return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
  if (grade >= 50) return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
  if (grade >= 40) return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
  return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
}

export function DraftSummaryPanel({
  draft,
  bonusOffers,
  onBonusChange,
  onSign,
  signingPlayerId,
}: {
  draft: DraftRoomView;
  bonusOffers: Record<string, string>;
  onBonusChange: (playerId: string, value: string) => void;
  onSign: (playerId: string) => void;
  signingPlayerId: string | null;
}) {
  if (draft.status !== 'complete' || !draft.userDraftClass) {
    return null;
  }

  return (
    <div className="rounded-lg border border-accent-success/25 bg-accent-success/8 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-heading text-sm uppercase tracking-[0.18em] text-accent-success">Your Draft Class</p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-dynasty-textBright">
            Overall Grade {draft.userDraftClass.overallGrade}
          </h2>
          <p className="mt-1 font-data text-sm text-dynasty-muted">
            Average scouting grade {draft.userDraftClass.averageScoutingGrade}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded border border-accent-success/30 bg-accent-success/10 px-3 py-2 font-data text-sm text-accent-success">
          <Check className="h-4 w-4" /> Draft Complete
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {draft.userDraftClass.picks.map((pick) => (
          <div key={pick.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm font-semibold text-dynasty-textBright">{pick.playerName}</p>
                <p className="mt-1 font-data text-xs text-dynasty-muted">
                  {pick.position} · {pick.origin}
                </p>
                <p className="mt-1 font-data text-xs text-dynasty-muted">
                  Slot ${pick.slotValue.toFixed(2)}M · Ask ${pick.askBonus.toFixed(2)}M
                </p>
              </div>
              <span className={`rounded border px-2 py-1 font-data text-sm font-semibold ${gradeChipClass(pick.scoutingGrade)}`}>
                {pick.scoutingGrade}
              </span>
            </div>
            <p className="mt-2 font-heading text-sm text-dynasty-text">{pick.assessment}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={bonusOffers[pick.playerId] ?? pick.askBonus.toFixed(2)}
                onChange={(event) => onBonusChange(pick.playerId, event.target.value)}
                className="w-28 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-data text-sm text-dynasty-text"
              />
              <button
                data-mobile-critical-control="draft-bonus-offer"
                onClick={() => onSign(pick.playerId)}
                disabled={pick.signed !== null || signingPlayerId === pick.playerId}
                className="mobile-critical-control rounded bg-accent-primary px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pick.signed === true
                  ? 'Signed'
                  : pick.signed === false
                    ? 'Declined'
                    : signingPlayerId === pick.playerId
                      ? 'Negotiating...'
                      : 'Offer Bonus'}
              </button>
              {pick.agreedBonus != null && (
                <span className="font-data text-xs text-accent-success">Agreed ${pick.agreedBonus.toFixed(2)}M</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
