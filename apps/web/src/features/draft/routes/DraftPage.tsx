import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock3,
  LayoutGrid,
  Radio,
  Star,
  Users,
  Zap,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type {
  DraftActionResult,
  DraftBoardCell,
  DraftRoomPick,
  DraftRoomProspect,
  DraftRoomView,
} from '@/workers/sim.worker.helpers';

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

function toneClasses(tone: DraftRoomPick['tone'] | DraftBoardCell['tone']): string {
  switch (tone) {
    case 'user':
      return 'border-accent-success/35 bg-accent-success/12 text-accent-success';
    case 'division_rival':
      return 'border-accent-warning/35 bg-accent-warning/12 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
}

function formatBonus(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}M`;
}

function statusText(view: DraftRoomView | null, phase: string): string {
  if (phase !== 'offseason') return 'Draft Unavailable';
  if (!view || view.status === 'available') return 'Draft Available';
  if (view.status === 'complete') return 'Draft Complete';
  return 'Draft In Progress';
}

function formatProgress(view: DraftRoomView | null, visiblePicks: DraftRoomPick[]): string {
  if (!view) return '';

  if (visiblePicks.length > 0) {
    const latest = visiblePicks[visiblePicks.length - 1]!;
    return `Round ${latest.round} of ${view.counts.totalRounds} — Pick ${latest.pickNumber} of ${view.counts.totalPicks}`;
  }

  if (view.currentPick) {
    return `Round ${view.currentPick.round} of ${view.counts.totalRounds} — Pick ${view.currentPick.pickNumber} of ${view.counts.totalPicks}`;
  }

  return `0 of ${view.counts.totalPicks}`;
}

function ProspectsPanel({
  prospects,
  selectedProspectId,
  onSelect,
}: {
  prospects: DraftRoomProspect[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<'grade' | 'position'>('grade');

  const sortedProspects = useMemo(() => {
    const next = [...prospects];
    next.sort((left, right) => {
      if (sortKey === 'grade') {
        if (right.scoutingGrade !== left.scoutingGrade) {
          return right.scoutingGrade - left.scoutingGrade;
        }
        return left.name.localeCompare(right.name);
      }
      if (left.position !== right.position) {
        return left.position.localeCompare(right.position);
      }
      return right.scoutingGrade - left.scoutingGrade;
    });
    return next;
  }, [prospects, sortKey]);

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">Available Prospects</h2>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            Board Sorted {sortKey === 'grade' ? 'By Grade' : 'By Position'}
          </p>
        </div>
        <button
          onClick={() => setSortKey((current) => (current === 'grade' ? 'position' : 'grade'))}
          className="rounded border border-dynasty-border px-3 py-1 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-info hover:text-accent-info"
        >
          Sort {sortKey === 'grade' ? 'POS' : 'Grade'}
        </button>
      </div>
      <div className="max-h-[32rem] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dynasty-surface">
            <tr className="border-b border-dynasty-border text-left font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              <th className="px-4 py-2">Board</th>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2">POS</th>
              <th className="px-2 py-2 text-right">Age</th>
              <th className="px-2 py-2">Looks</th>
              <th className="px-2 py-2">Origin</th>
              <th className="px-2 py-2 text-right">User</th>
              <th className="px-2 py-2 text-right">Cns</th>
              <th className="px-4 py-2 text-right">Ask</th>
            </tr>
          </thead>
          <tbody>
            {sortedProspects.map((prospect, index) => {
              const selected = selectedProspectId === prospect.id;
              return (
                <tr
                  key={prospect.id}
                  onClick={() => onSelect(prospect.id)}
                  className={`cursor-pointer border-b border-dynasty-border/50 text-sm transition-colors ${
                    selected ? 'bg-accent-primary/12' : 'hover:bg-dynasty-elevated'
                  }`}
                >
                  <td className="px-4 py-2 font-data text-dynasty-muted">
                    {prospect.bigBoardRank ?? index + 1}
                  </td>
                  <td className="px-2 py-2 font-heading font-medium text-dynasty-textBright">{prospect.name}</td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.position}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-muted">{prospect.age}</td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.looks ?? 0}</td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.origin}</td>
                  <td className={`px-4 py-2 text-right font-data font-semibold ${gradeTextClass(prospect.scoutingGrade)}`}>
                    {prospect.scoutingGrade}
                  </td>
                  <td className={`px-2 py-2 text-right font-data ${gradeTextClass(prospect.consensusGrade ?? prospect.scoutingGrade)}`}>
                    {prospect.consensusGrade ?? prospect.scoutingGrade}
                  </td>
                  <td className="px-4 py-2 text-right font-data text-dynasty-muted">{formatBonus(prospect.askBonus)}</td>
                </tr>
              );
            })}
            {sortedProspects.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center font-heading text-sm text-dynasty-muted">
                  No prospects remain on the board.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CurrentPickPanel({
  draft,
  selectedProspect,
  onDraft,
  onScout,
  onToggleBoard,
  drafting,
  scouting,
}: {
  draft: DraftRoomView;
  selectedProspect: DraftRoomProspect | null;
  onDraft: () => void;
  onScout: () => void;
  onToggleBoard: () => void;
  drafting: boolean;
  scouting: boolean;
}) {
  const userOnClock = draft.currentPick?.userOnClock ?? false;

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
                onClick={onScout}
                disabled={scouting}
                className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scouting ? 'Scouting...' : 'Scout Look'}
              </button>
              <button
                onClick={onToggleBoard}
                className="rounded border border-dynasty-border px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-warning hover:text-accent-warning"
              >
                {selectedProspect.bigBoardRank ? `Big Board #${selectedProspect.bigBoardRank}` : 'Add To Board'}
              </button>
            </div>
            <button
              onClick={onDraft}
              disabled={!userOnClock || drafting}
              className={`mt-5 w-full rounded-md px-4 py-2 font-heading text-sm font-semibold transition-colors ${
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

function DraftTicker({
  picks,
  progressLabel,
}: {
  picks: DraftRoomPick[];
  progressLabel: string;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-accent-info" />
          <div>
            <h2 className="font-heading text-sm font-semibold text-dynasty-text">Draft Ticker</h2>
            <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {progressLabel}
            </p>
          </div>
        </div>
        <span className="font-data text-xs text-dynasty-muted">{picks.length} picks shown</span>
      </div>
      <div className="max-h-[32rem] overflow-y-auto px-2 py-2">
        {picks.length === 0 ? (
          <p className="px-2 py-10 text-center font-heading text-sm text-dynasty-muted">
            Start the draft to begin the ticker.
          </p>
        ) : (
          picks.map((pick) => (
            <div
              key={`${pick.pickNumber}-${pick.playerId}`}
              className={`mb-2 rounded border px-3 py-2 ${toneClasses(pick.tone)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    Round {pick.round} · Pick {pick.pickNumber}
                  </p>
                  <p className="mt-1 font-heading text-sm font-semibold">
                    {pick.teamAbbreviation} selected {pick.playerName}
                  </p>
                  <p className="mt-1 font-data text-xs text-dynasty-muted">
                    {pick.position} · {pick.origin}
                  </p>
                </div>
                <span className={`rounded border px-2 py-1 font-data text-sm font-semibold ${gradeChipClass(pick.scoutingGrade)}`}>
                  {pick.scoutingGrade}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DraftBoard({ draft, visibleCount }: { draft: DraftRoomView; visibleCount: number }) {
  const visiblePickNumbers = new Set(
    draft.completedPicks.slice(0, visibleCount).map((pick) => pick.pickNumber),
  );

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex items-center gap-2 border-b border-dynasty-border px-4 py-3">
        <LayoutGrid className="h-4 w-4 text-dynasty-muted" />
        <div>
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">Draft Board</h2>
          <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            User picks in green, division rivals in amber
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[96rem] border-separate border-spacing-0">
          <thead>
            <tr className="bg-dynasty-surface">
              <th className="sticky left-0 z-20 border-b border-r border-dynasty-border bg-dynasty-surface px-3 py-2 text-left font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                Rd
              </th>
              {draft.board.teams.map((team, index) => (
                <th
                  key={`${team.teamId}-${index}`}
                  className="border-b border-dynasty-border px-2 py-2 text-center font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted"
                >
                  {team.abbreviation}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft.board.rounds.map((row) => (
              <tr key={row.round}>
                <td className="sticky left-0 z-10 border-r border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-xs text-dynasty-muted">
                  {row.round}
                </td>
                {row.cells.map((cell) => {
                  const visiblePick = cell.pick && visiblePickNumbers.has(cell.pick.pickNumber) ? cell.pick : null;
                  return (
                    <td key={cell.slotId} className="border-b border-r border-dynasty-border/60 p-1 align-top">
                      <div className={`min-h-14 rounded border px-2 py-1 ${visiblePick ? toneClasses(cell.tone) : 'border-dynasty-border bg-dynasty-elevated/60 text-dynasty-muted'}`}>
                        {visiblePick ? (
                          <>
                            <div className="font-data text-[10px] uppercase tracking-[0.18em]">{visiblePick.pickNumber}</div>
                            <div className="mt-1 font-heading text-xs font-semibold leading-tight">
                              {visiblePick.playerName}
                            </div>
                            <div className="mt-1 font-data text-[10px] text-dynasty-muted">
                              {visiblePick.position} · {visiblePick.scoutingGrade}
                            </div>
                          </>
                        ) : (
                          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted/70">
                            {cell.teamAbbreviation}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DraftSummary({
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
                onClick={() => onSign(pick.playerId)}
                disabled={pick.signed !== null || signingPlayerId === pick.playerId}
                className="rounded bg-accent-primary px-3 py-2 font-heading text-xs uppercase tracking-[0.18em] text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:opacity-40"
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

export default function DraftPage() {
  const worker = useWorker();
  const {
    getDraftClass,
    startDraft,
    makeDraftPick,
    scoutDraftPlayer,
    toggleDraftBigBoard,
    signDraftPick,
    simulateRemainingDraft,
  } = worker;
  const { phase, season, isInitialized } = useGameStore();

  const [draft, setDraft] = useState<DraftRoomView | null>(null);
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [scouting, setScouting] = useState(false);
  const [signingPlayerId, setSigningPlayerId] = useState<string | null>(null);
  const [watchTargetCount, setWatchTargetCount] = useState<number | null>(null);
  const [revealedPickCount, setRevealedPickCount] = useState(0);
  const [bonusOffers, setBonusOffers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    try {
      const data = await getDraftClass();
      setDraft(data as DraftRoomView | null);
    } catch {
      setDraft(null);
    }
  }, [getDraftClass, isInitialized, worker.isReady]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft, phase, season]);

  useEffect(() => {
    if (!draft) {
      setRevealedPickCount(0);
      setSelectedProspectId(null);
      return;
    }

    if (watchTargetCount == null) {
      setRevealedPickCount(draft.completedPicks.length);
    }

    if (!selectedProspectId || !draft.availableProspects.some((prospect) => prospect.id === selectedProspectId)) {
      setSelectedProspectId(draft.availableProspects[0]?.id ?? null);
    }
  }, [draft, selectedProspectId, watchTargetCount]);

  useEffect(() => {
    if (watchTargetCount == null) return;
    if (revealedPickCount >= watchTargetCount) {
      setWatchTargetCount(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setRevealedPickCount((current) => Math.min(current + 1, watchTargetCount));
    }, 120);

    return () => window.clearTimeout(timer);
  }, [revealedPickCount, watchTargetCount]);

  const selectedProspect = draft?.availableProspects.find((prospect) => prospect.id === selectedProspectId) ?? null;
  const visiblePicks = draft?.completedPicks.slice(0, watchTargetCount == null ? draft.completedPicks.length : revealedPickCount) ?? [];
  const watching = watchTargetCount != null;

  const applyDraftResult = (result: DraftActionResult | null, options?: { watch?: boolean }) => {
    if (!result?.success || !result.draft) {
      if (result?.error) {
        setError(result.error);
      }
      return;
    }

    setDraft(result.draft);
    setError(null);

    if (options?.watch) {
      const finalCount = result.draft.completedPicks.length;
      const startCount = Math.max(0, finalCount - result.newPicks.length);
      setRevealedPickCount(startCount);
      setWatchTargetCount(finalCount);
    } else {
      setWatchTargetCount(null);
      setRevealedPickCount(result.draft.completedPicks.length);
    }
  };

  const handleStartDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await startDraft();
      applyDraftResult(result as DraftActionResult);
    } catch {
      setError('Draft system unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePick = async () => {
    if (!selectedProspect) return;
    setLoading(true);
    setError(null);
    try {
      const result = await makeDraftPick(selectedProspect.id);
      applyDraftResult(result as DraftActionResult);
    } catch {
      setError('Failed to submit draft pick.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoutProspect = async () => {
    if (!selectedProspect) return;
    setScouting(true);
    setError(null);
    try {
      await scoutDraftPlayer(selectedProspect.id);
      await loadDraft();
    } catch {
      setError('Failed to update scouting report.');
    } finally {
      setScouting(false);
    }
  };

  const handleToggleBigBoard = async () => {
    if (!selectedProspect) return;
    setError(null);
    try {
      await toggleDraftBigBoard(selectedProspect.id);
      await loadDraft();
    } catch {
      setError('Failed to update big board.');
    }
  };

  const handleSignDraftPick = async (playerId: string) => {
    const offeredBonus = Number.parseFloat(bonusOffers[playerId] ?? '0');
    if (!Number.isFinite(offeredBonus) || offeredBonus <= 0) {
      setError('Enter a valid bonus offer.');
      return;
    }

    setSigningPlayerId(playerId);
    setError(null);
    try {
      await signDraftPick(playerId, offeredBonus);
      await loadDraft();
    } catch {
      setError('Failed to complete draft signing.');
    } finally {
      setSigningPlayerId(null);
    }
  };

  const handleWatchDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await simulateRemainingDraft();
      applyDraftResult(result as DraftActionResult, { watch: true });
    } catch {
      setError('Failed to simulate the remaining draft.');
    } finally {
      setLoading(false);
    }
  };

  const status = statusText(draft, phase);
  const progressLabel = formatProgress(draft, visiblePicks);

  if (phase !== 'offseason') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Draft Room</h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">Season {season} Amateur Draft</p>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Users className="h-12 w-12 text-dynasty-muted" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-text">Draft Available During Offseason</h2>
            <p className="max-w-md font-heading text-sm text-dynasty-muted">
              The draft room opens after the regular season and playoffs are finished.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!draft || draft.status === 'available') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Draft Room</h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">Season {season} Amateur Draft</p>
        </div>

        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Users className="h-12 w-12 text-dynasty-muted" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-text">{status}</h2>
            <p className="max-w-md font-heading text-sm text-dynasty-muted">
              Start the draft to load the class, reveal the first picks, and put your front office on the clock.
            </p>
            <button
              onClick={handleStartDraft}
              disabled={loading}
              className="rounded-md bg-accent-primary px-6 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:cursor-not-allowed disabled:bg-dynasty-border disabled:text-dynasty-muted"
            >
              {loading ? 'Preparing Draft...' : 'Start Draft'}
            </button>
            {error && (
              <p className="font-data text-xs text-accent-danger">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">Draft Room</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded border border-dynasty-border bg-dynasty-surface px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {status}
            </span>
            {draft.currentPick?.userOnClock && (
              <span className="inline-flex items-center gap-1 rounded border border-accent-success/30 bg-accent-success/10 px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-accent-success">
                <Star className="h-3 w-3" /> You Are On The Clock
              </span>
            )}
          </div>
          <p className="mt-2 font-heading text-sm text-dynasty-muted">{progressLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleWatchDraft}
            disabled={loading || watching || draft.status === 'complete'}
            className="inline-flex items-center gap-2 rounded-md border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.18em] text-dynasty-text transition-colors hover:border-accent-info hover:text-accent-info disabled:cursor-not-allowed disabled:text-dynasty-muted"
          >
            {watching ? <Clock3 className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
            {watching ? 'Watching Draft' : 'Watch Draft'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-accent-danger/30 bg-accent-danger/10 px-4 py-2 font-data text-xs text-accent-danger">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <ProspectsPanel
            prospects={draft.availableProspects}
            selectedProspectId={selectedProspectId}
            onSelect={setSelectedProspectId}
          />
        </div>
        <div className="xl:col-span-3">
          <CurrentPickPanel
            draft={draft}
            selectedProspect={selectedProspect}
            onDraft={handleMakePick}
            onScout={handleScoutProspect}
            onToggleBoard={handleToggleBigBoard}
            drafting={loading}
            scouting={scouting}
          />
        </div>
        <div className="xl:col-span-4">
          <DraftTicker picks={visiblePicks} progressLabel={progressLabel} />
        </div>
      </div>

      <DraftBoard draft={draft} visibleCount={visiblePicks.length} />
      <DraftSummary
        draft={draft}
        bonusOffers={bonusOffers}
        onBonusChange={(playerId, value) => setBonusOffers((current) => ({ ...current, [playerId]: value }))}
        onSign={handleSignDraftPick}
        signingPlayerId={signingPlayerId}
      />
    </div>
  );
}
