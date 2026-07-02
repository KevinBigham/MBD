import { Star, Users } from 'lucide-react';
import { sourceLabel } from '@/shared/lib/labels';
import type { DraftRoomProspect, DraftRoomView } from '@/workers/sim.worker.helpers';
import { DraftBoardComparePanel } from './DraftBoardComparePanel';

function gradeTextClass(grade: number): string {
  if (grade >= 60) return 'text-accent-success';
  if (grade >= 50) return 'text-accent-info';
  if (grade >= 40) return 'text-accent-warning';
  return 'text-dynasty-muted';
}

function gradeChipClass(grade: number): string {
  if (grade >= 60) return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
  if (grade >= 50) return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
  if (grade >= 40) return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
  return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
}

function formatBonus(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}M`;
}

interface DraftCurrentPickPanelProps {
  draft: DraftRoomView;
  selectedProspect: DraftRoomProspect | null;
  prospects: DraftRoomProspect[];
  onDraft: () => void;
  onScout: () => void;
  onToggleBoard: () => void;
  drafting: boolean;
  scouting: boolean;
}

export function DraftCurrentPickPanel({
  draft,
  selectedProspect,
  prospects,
  onDraft,
  onScout,
  onToggleBoard,
  drafting,
  scouting,
}: DraftCurrentPickPanelProps) {
  const userOnClock = draft.currentPick?.userOnClock ?? false;
  const decisionRows = selectedProspect ? [
    { label: 'Scout accuracy', input: selectedProspect.decisionInputs.scoutAccuracy },
    { label: 'Disagreement', input: selectedProspect.decisionInputs.disagreement },
    { label: 'Makeup', input: selectedProspect.decisionInputs.makeup },
    { label: 'Signability', input: selectedProspect.decisionInputs.signability },
    { label: 'Risk', input: selectedProspect.decisionInputs.risk },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-heading text-sm uppercase tracking-[0.18em] text-dynasty-muted">On The Clock</p>
            {draft.currentPick ? (
              <>
                <p className="mt-2 font-heading text-xl font-semibold text-dynasty-textBright">
                  {draft.currentPick.teamName}
                </p>
                <p className="mt-1 font-data text-sm text-dynasty-muted">
                  Round {draft.currentPick.round}, Pick {draft.currentPick.pickNumber}
                </p>
              </>
            ) : (
              <p className="mt-2 font-heading text-lg font-semibold text-dynasty-textBright">
                Draft complete
              </p>
            )}
          </div>
          {draft.currentPick?.userOnClock && (
            <span className="inline-flex items-center gap-1 rounded border border-accent-success/30 bg-accent-success/10 px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-accent-success">
              <Star className="h-3 w-3" /> User Pick
            </span>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
        {selectedProspect ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-lg font-semibold text-dynasty-textBright">{selectedProspect.name}</p>
                <p className="mt-1 font-data text-sm text-dynasty-muted">
                  {selectedProspect.position} · {selectedProspect.origin} · Age {selectedProspect.age}
                </p>
                <p className="mt-1 font-data text-xs text-dynasty-muted">
                  {selectedProspect.background ?? selectedProspect.origin} · {(selectedProspect.looks ?? 0)} look{selectedProspect.looks === 1 ? '' : 's'} · Ask {formatBonus(selectedProspect.askBonus)}
                </p>
              </div>
              <div className="space-y-2 text-right">
                <div className={`rounded border px-3 py-2 font-data text-2xl font-bold ${gradeChipClass(selectedProspect.scoutingGrade)}`}>
                  {selectedProspect.scoutingGrade}
                </div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Consensus {selectedProspect.consensusGrade ?? selectedProspect.scoutingGrade}
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                data-mobile-critical-control="draft-scout-look"
                onClick={onScout}
                disabled={scouting}
                className="mobile-critical-control rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scouting ? 'Scouting...' : 'Scout Look'}
              </button>
              <button
                data-mobile-critical-control="draft-big-board"
                onClick={onToggleBoard}
                className="mobile-critical-control rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-warning hover:text-accent-warning"
              >
                {selectedProspect.bigBoardRank ? `Big Board #${selectedProspect.bigBoardRank}` : 'Add To Board'}
              </button>
            </div>
            <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-info">
                Decision Inputs
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {decisionRows.map(({ label, input }) => (
                  <div key={label} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
                        {label}
                      </div>
                      <div className="font-data text-xs font-semibold text-dynasty-textBright">{input.value}</div>
                    </div>
                    <div className="mt-2 font-heading text-sm text-dynasty-textBright">{input.label}</div>
                    <div className="mt-1 font-data text-[11px] leading-relaxed text-dynasty-muted">{input.detail}</div>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-heading text-xs leading-relaxed text-dynasty-text">
                {selectedProspect.decisionInputs.whyThisPick}
              </p>
            </div>
            <DraftBoardComparePanel selectedProspect={selectedProspect} prospects={prospects} />
            {selectedProspect.scoutConflict ? (
              <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">
                  Scout Debate · Divergence {selectedProspect.scoutConflict.divergence}
                </div>
                <div className="mt-2 grid gap-3 lg:grid-cols-3">
                  {selectedProspect.scoutConflict.opinions.map((opinion) => (
                    <div key={`${selectedProspect.id}-${opinion.source}`} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
                      <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
                        {sourceLabel(opinion.source)}
                      </div>
                      <div className={`mt-2 font-data text-2xl ${gradeTextClass(opinion.overallGrade)}`}>
                        {opinion.overallGrade}
                      </div>
                      <div className="mt-1 font-data text-[11px] text-dynasty-muted">
                        Floor {opinion.floor} · Ceiling {opinion.ceiling} · Confidence {opinion.confidence}
                      </div>
                      <div className="mt-2 font-heading text-xs text-dynasty-muted">
                        {opinion.summary}
                      </div>
                    </div>
                  ))}
                </div>
                {selectedProspect.scoutConflict.outcomeSummary ? (
                  <div className="mt-3 font-heading text-xs text-dynasty-muted">
                    {selectedProspect.scoutConflict.outcomeSummary}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button
              data-mobile-critical-control="draft-pick-submit"
              onClick={onDraft}
              disabled={!userOnClock || drafting}
              className={`mobile-critical-control mt-5 w-full rounded-md px-4 py-2 font-heading text-sm font-semibold transition-colors ${
                userOnClock && !drafting
                  ? 'bg-accent-primary text-white hover:bg-accent-primary/80'
                  : 'cursor-not-allowed bg-dynasty-border text-dynasty-muted'
              }`}
            >
              {drafting
                ? 'Submitting Pick...'
                : userOnClock
                  ? `Draft ${selectedProspect.lastName}`
                  : 'Waiting For Your Slot'}
            </button>
          </>
        ) : (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <Users className="h-10 w-10 text-dynasty-muted" />
            <p className="mt-3 font-heading text-sm text-dynasty-muted">
              Select a prospect to set your draft board.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 text-center">
          <div className="font-data text-xl font-semibold text-dynasty-textBright">{draft.counts.picksRemaining}</div>
          <div className="mt-1 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Available</div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 text-center">
          <div className="font-data text-xl font-semibold text-accent-success">
            {draft.userDraftClass?.picks.length ?? 0}
          </div>
          <div className="mt-1 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Your Picks</div>
        </div>
      </div>
    </div>
  );
}
