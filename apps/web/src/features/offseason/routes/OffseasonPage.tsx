import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRightLeft,
  Award,
  Calendar,
  Check,
  ChevronRight,
  DollarSign,
  FileText,
  Gavel,
  Globe2,
  ShieldAlert,
  ShieldCheck,
  SkipForward,
  Tent,
  Undo2,
  UserMinus,
} from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

const PHASE_CONFIG: Record<string, { label: string; icon: typeof Calendar; description: string }> = {
  season_review: {
    label: 'Season Review',
    icon: Award,
    description: 'Review your season performance, awards, and franchise standings.',
  },
  arbitration: {
    label: 'Arbitration',
    icon: DollarSign,
    description: 'Negotiate salaries with arbitration-eligible players.',
  },
  tender_nontender: {
    label: 'Tender / Non-Tender',
    icon: UserMinus,
    description: 'Decide which players to tender contracts and which to non-tender.',
  },
  qualifying_offers: {
    label: 'Qualifying Offers',
    icon: FileText,
    description: 'Extend qualifying offers to eligible free agents before the market opens.',
  },
  free_agency: {
    label: 'Free Agency',
    icon: FileText,
    description: 'Sign free agents to fill roster gaps and improve your team.',
  },
  draft: {
    label: 'Amateur Draft',
    icon: FileText,
    description: 'Select prospects to build the future of your franchise.',
  },
  protection_audit: {
    label: 'Protection Audit',
    icon: ShieldCheck,
    description: 'Protect Rule 5-eligible prospects before the 40-man deadline.',
  },
  rule5_draft: {
    label: 'Rule 5 Draft',
    icon: Gavel,
    description: 'Manage the major-league Rule 5 board and active roster obligations.',
  },
  international_signing: {
    label: 'International Signing',
    icon: Globe2,
    description: 'Scout and sign the current international amateur class.',
  },
  spring_training: {
    label: 'Spring Training',
    icon: Tent,
    description: 'Finalize your roster and prepare for the upcoming season.',
  },
};

const ALL_PHASES = [
  'season_review',
  'arbitration',
  'tender_nontender',
  'qualifying_offers',
  'free_agency',
  'draft',
  'protection_audit',
  'rule5_draft',
  'international_signing',
  'spring_training',
];

interface Rule5PlayerView {
  playerId: string;
  teamId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  rosterStatus: string;
  rule5EligibleAfterSeason: number;
}

interface Rule5SelectionView {
  playerId: string;
  playerName: string;
  originalTeamId: string;
  draftingTeamId: string;
  overallPick: number;
  round: number;
}

interface Rule5ObligationView {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  draftedAfterSeason: number;
  status: 'active' | 'returned' | 'cleared';
}

interface Rule5OfferBackStateView {
  playerId: string;
  originalTeamId: string;
  draftingTeamId: string;
  status: 'pending' | 'accepted' | 'declined';
}

interface Rule5View {
  phase: 'protection_audit' | 'rule5_draft' | 'complete';
  currentTeamId: string | null;
  draftOrder: string[];
  consecutivePasses: number;
  protectedCount: number;
  protectedLimit: number;
  protectedPlayers: Rule5PlayerView[];
  eligiblePlayers: Rule5PlayerView[];
  selections: Rule5SelectionView[];
  obligations: Rule5ObligationView[];
  offerBackStates: Rule5OfferBackStateView[];
}

interface OffseasonData {
  currentPhase: string;
  phaseDay: number;
  totalDay: number;
  completed: boolean;
  phaseResults: {
    arbitrationResolved: unknown[];
    tenderedPlayers: string[];
    nonTenderedPlayers: string[];
    freeAgentSignings: unknown[];
    draftPicks: unknown[];
    ifaSignings: unknown[];
    retiredPlayers: unknown[];
  };
  transactionGroups?: Array<{
    phase: string;
    label: string;
    rows: Array<{
      id: string;
      tone: 'user' | 'division_rival' | 'neutral';
      summary: string;
    }>;
  }>;
  rule5?: Rule5View;
}

function isOffseasonData(value: unknown): value is OffseasonData {
  return typeof value === 'object' && value !== null && 'currentPhase' in value && 'phaseResults' in value;
}

function isSuccessResult(value: unknown): value is { success: boolean } {
  return typeof value === 'object' && value !== null && 'success' in value;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function playerLine(player: Rule5PlayerView): string {
  return `${player.playerName} | ${player.position} | Age ${player.age} | OVR ${player.overallRating}`;
}

export default function OffseasonPage() {
  const worker = useWorker();
  const { phase, season, isInitialized, userTeamId } = useGameStore();
  const [offseason, setOffseason] = useState<OffseasonData | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});

  const applyOffseasonData = useCallback((data: OffseasonData | null) => {
    if (!data) return;
    setOffseason(data);
    setExpandedPhases((current) => {
      const next = { ...current };
      for (const group of data.transactionGroups ?? []) {
        if (!(group.phase in next)) {
          next[group.phase] = true;
        }
      }
      return next;
    });
  }, []);

  const fetchOffseason = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return null;
    const data = await worker.getOffseasonState();
    if (data) {
      applyOffseasonData(data as OffseasonData);
      return data as OffseasonData;
    }
    return null;
  }, [applyOffseasonData, isInitialized, worker]);

  useEffect(() => {
    void fetchOffseason();
  }, [fetchOffseason, phase]);

  const handleAdvance = async () => {
    setAdvancing(true);
    try {
      const data = await worker.advanceOffseason();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleSkip = async () => {
    setAdvancing(true);
    try {
      const data = await worker.skipOffseasonPhase();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleToggleProtection = async (playerId: string) => {
    setAdvancing(true);
    try {
      const result = await worker.toggleRule5Protection(playerId);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleLockProtection = async () => {
    setAdvancing(true);
    try {
      const data = await worker.lockRule5Protection();
      if (isOffseasonData(data)) {
        applyOffseasonData(data);
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleRule5Pick = async (playerId: string) => {
    setAdvancing(true);
    try {
      const result = await worker.makeRule5Pick(playerId);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handlePassRule5Pick = async () => {
    setAdvancing(true);
    try {
      const result = await worker.passRule5Pick();
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
      }
    } finally {
      setAdvancing(false);
    }
  };

  const handleResolveOfferBack = async (playerId: string, acceptReturn: boolean) => {
    setAdvancing(true);
    try {
      const result = await worker.resolveRule5OfferBack(playerId, acceptReturn);
      if (isSuccessResult(result) && result.success) {
        await fetchOffseason();
      }
    } finally {
      setAdvancing(false);
    }
  };

  if (phase !== 'offseason') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
            Offseason
          </h1>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            The offseason begins after the playoffs conclude.
          </p>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8">
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <Calendar className="h-12 w-12 text-dynasty-muted" />
            <h2 className="font-heading text-lg font-semibold text-dynasty-text">
              Season In Progress
            </h2>
            <p className="max-w-md font-heading text-sm text-dynasty-muted">
              The offseason wizard will guide you through arbitration, free agency,
              the amateur draft, and roster decisions after the season ends.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const fallbackPhaseConfig = PHASE_CONFIG.season_review!;
  const currentPhaseConfig: (typeof PHASE_CONFIG)[string] = offseason
    ? PHASE_CONFIG[offseason.currentPhase] ?? fallbackPhaseConfig
    : fallbackPhaseConfig;
  const CurrentPhaseIcon = currentPhaseConfig.icon;
  const currentPhaseIdx = offseason ? ALL_PHASES.indexOf(offseason.currentPhase) : 0;
  const transactionGroups = offseason?.transactionGroups ?? [];
  const rule5 = offseason?.rule5;
  const userProtectedPlayers = rule5?.protectedPlayers ?? [];
  const userAtRiskPlayers = rule5?.eligiblePlayers.filter((player) => player.teamId === userTeamId) ?? [];
  const rule5Pool = rule5?.eligiblePlayers.filter((player) => player.teamId !== userTeamId) ?? [];
  const userOnClock = rule5?.phase === 'rule5_draft' && rule5.currentTeamId === userTeamId;
  const pendingOfferBackStates = rule5?.offerBackStates.filter((entry) => entry.status === 'pending') ?? [];

  const rowToneClasses = (tone: 'user' | 'division_rival' | 'neutral') => {
    switch (tone) {
      case 'user':
        return 'border-l-2 border-accent-success bg-accent-success/10 text-accent-success';
      case 'division_rival':
        return 'border-l-2 border-accent-warning bg-accent-warning/10 text-accent-warning';
      default:
        return 'border-l-2 border-dynasty-border bg-dynasty-elevated text-dynasty-text';
    }
  };

  const toggleGroup = (groupPhase: string) => {
    setExpandedPhases((current) => ({
      ...current,
      [groupPhase]: !current[groupPhase],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Offseason - Season {season}
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Navigate through each phase to prepare for the next season.
        </p>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-1">
          {ALL_PHASES.map((phaseId, idx) => {
            const config = PHASE_CONFIG[phaseId]!;
            const Icon = config.icon;
            const isActive = idx === currentPhaseIdx;
            const isDone = idx < currentPhaseIdx;
            return (
              <div key={phaseId} className="flex flex-1 items-center">
                <div
                  className={`flex flex-col items-center gap-1 ${
                    isActive
                      ? 'text-accent-primary'
                      : isDone
                        ? 'text-accent-success'
                        : 'text-dynasty-muted'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      isActive
                        ? 'border-accent-primary bg-accent-primary/20'
                        : isDone
                          ? 'border-accent-success bg-accent-success/20'
                          : 'border-dynasty-border bg-dynasty-elevated'
                    }`}
                  >
                    {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className="hidden text-center font-heading text-[10px] sm:block">
                    {config.label}
                  </span>
                </div>
                {idx < ALL_PHASES.length - 1 && (
                  <div className={`mx-1 h-0.5 flex-1 ${idx < currentPhaseIdx ? 'bg-accent-success' : 'bg-dynasty-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border-2 border-accent-primary/50 bg-dynasty-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CurrentPhaseIcon className="h-5 w-5 text-accent-primary" />
              <h2 className="font-heading text-lg font-semibold text-dynasty-textBright">
                {currentPhaseConfig.label}
              </h2>
              {offseason && (
                <span className="font-data text-xs text-dynasty-muted">
                  Day {offseason.phaseDay}
                </span>
              )}
            </div>
            <p className="mt-2 max-w-2xl font-heading text-sm text-dynasty-muted">
              {currentPhaseConfig.description}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdvance}
              disabled={advancing}
              className="flex items-center gap-1 rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
              Advance Day
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={advancing}
              className="flex items-center gap-1 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-sm text-dynasty-muted transition-colors hover:text-dynasty-text disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
              Skip Phase
            </button>
          </div>
        </div>
      </div>

      {offseason && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <ResultCard label="Arbitrations" value={offseason.phaseResults.arbitrationResolved.length} icon={DollarSign} />
          <ResultCard label="Tendered" value={offseason.phaseResults.tenderedPlayers.length} icon={Check} />
          <ResultCard label="Non-Tendered" value={offseason.phaseResults.nonTenderedPlayers.length} icon={UserMinus} />
          <ResultCard label="FA Signings" value={offseason.phaseResults.freeAgentSignings.length} icon={FileText} />
          <ResultCard label="Draft Picks" value={offseason.phaseResults.draftPicks.length} icon={Award} />
          <ResultCard label="Retirements" value={offseason.phaseResults.retiredPlayers.length} icon={Calendar} />
        </div>
      )}

      {rule5 && (
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
              <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                    Protection Audit
                  </h2>
                  <p className="mt-1 font-heading text-xs text-dynasty-muted">
                    Keep eligible prospects off the board by adding them to the 40-man.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-textBright">
                    40-Man {rule5.protectedCount}/{rule5.protectedLimit}
                  </span>
                  {rule5.phase === 'protection_audit' && (
                    <button
                      type="button"
                      onClick={handleLockProtection}
                      disabled={advancing}
                      className="rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                    >
                      Lock Audit
                    </button>
                  )}
                </div>
              </div>
              <div className="grid gap-4 p-4 lg:grid-cols-2">
                <Rule5Section
                  title="Protected"
                  icon={ShieldCheck}
                  emptyLabel="No protected Rule 5 prospects."
                  items={userProtectedPlayers}
                  actionLabel="Unprotect"
                  disabled={advancing || rule5.phase !== 'protection_audit'}
                  onAction={handleToggleProtection}
                />
                <Rule5Section
                  title="At Risk"
                  icon={ShieldAlert}
                  emptyLabel="No exposed Rule 5 players on your farm."
                  items={userAtRiskPlayers}
                  actionLabel="Protect"
                  disabled={advancing || rule5.phase !== 'protection_audit' || rule5.protectedCount >= rule5.protectedLimit}
                  onAction={handleToggleProtection}
                />
              </div>
            </div>

            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
              <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                    Active Obligations
                  </h2>
                  <p className="mt-1 font-heading text-xs text-dynasty-muted">
                    Drafted Rule 5 players must stay on the MLB roster until the obligation clears.
                  </p>
                </div>
                <span className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-1 font-data text-xs text-dynasty-textBright">
                  {rule5.obligations.length} tracked
                </span>
              </div>
              <div className="space-y-2 p-4">
                {rule5.obligations.length > 0 ? (
                  rule5.obligations.map((obligation) => (
                    <div
                      key={obligation.playerId}
                      className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-data text-xs text-dynasty-textBright">
                          {teamLabel(obligation.draftingTeamId)} owes MLB roster time to {obligation.playerId}
                        </div>
                        <span className="rounded border border-dynasty-border px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                          {obligation.status}
                        </span>
                      </div>
                      <div className="mt-1 font-heading text-xs text-dynasty-muted">
                        From {teamLabel(obligation.originalTeamId)} after Season {obligation.draftedAfterSeason}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                    No active Rule 5 obligations.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
              <div className="flex items-start justify-between gap-4 border-b border-dynasty-border px-4 py-3">
                <div>
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                    Rule 5 Board
                  </h2>
                  <p className="mt-1 font-heading text-xs text-dynasty-muted">
                    Reverse-order draft. The board ends once the league passes out.
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-data text-xs text-dynasty-textBright">
                    On Clock: {rule5.currentTeamId ? teamLabel(rule5.currentTeamId) : 'Complete'}
                  </div>
                  <div className="font-heading text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Consecutive Passes {rule5.consecutivePasses}/{rule5.draftOrder.length}
                  </div>
                </div>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    Draft Order
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {rule5.draftOrder.map((teamId) => {
                      const active = rule5.currentTeamId === teamId && rule5.phase === 'rule5_draft';
                      return (
                        <span
                          key={teamId}
                          className={`rounded border px-2 py-1 font-data text-xs ${
                            active
                              ? 'border-accent-primary bg-accent-primary/15 text-accent-primary'
                              : 'border-dynasty-border bg-dynasty-elevated text-dynasty-text'
                          }`}
                        >
                          {teamAbbreviation(teamId)}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    Eligible Pool
                  </div>
                  {userOnClock && (
                    <button
                      type="button"
                      onClick={handlePassRule5Pick}
                      disabled={advancing}
                      className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                    >
                      Pass Pick
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {rule5Pool.length > 0 ? (
                    rule5Pool.slice(0, 12).map((player) => (
                      <div
                        key={player.playerId}
                        className="flex items-center justify-between gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
                      >
                        <div>
                          <div className="font-data text-xs text-dynasty-textBright">
                            {playerLine(player)}
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">
                            {teamLabel(player.teamId)} | Eligible after Season {player.rule5EligibleAfterSeason}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRule5Pick(player.playerId)}
                          disabled={advancing || !userOnClock}
                          className="rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                        >
                          Draft
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                      The eligible pool is empty.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    Completed Selections
                  </div>
                  <div className="space-y-2">
                    {rule5.selections.length > 0 ? (
                      rule5.selections.map((selection) => (
                        <div
                          key={`${selection.overallPick}-${selection.playerId}`}
                          className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
                        >
                          <div className="font-data text-xs text-dynasty-textBright">
                            Pick {selection.overallPick}: {selection.playerName}
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">
                            {teamLabel(selection.draftingTeamId)} from {teamLabel(selection.originalTeamId)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
                        No Rule 5 picks have been made yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {pendingOfferBackStates.length > 0 && (
              <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
                <div className="border-b border-dynasty-border px-4 py-3">
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
                    Offer-Back Queue
                  </h2>
                  <p className="mt-1 font-heading text-xs text-dynasty-muted">
                    Resolve Rule 5 offer-back decisions before a drafted player leaves the active roster.
                  </p>
                </div>
                <div className="space-y-3 p-4">
                  {pendingOfferBackStates.map((offerBack) => (
                    <div
                      key={offerBack.playerId}
                      className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3"
                    >
                      <div className="font-data text-xs text-dynasty-textBright">
                        Offer back {offerBack.playerId} to {teamLabel(offerBack.originalTeamId)}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveOfferBack(offerBack.playerId, true)}
                          disabled={advancing}
                          className="flex items-center gap-1 rounded bg-accent-primary px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-accent-primary/80 disabled:opacity-50"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Return Player
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveOfferBack(offerBack.playerId, false)}
                          disabled={advancing}
                          className="flex items-center gap-1 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Original Club Declines
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {transactionGroups.length > 0 && (
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
                    onClick={() => toggleGroup(group.phase)}
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
      )}
    </div>
  );
}

function Rule5Section({
  title,
  icon: Icon,
  items,
  emptyLabel,
  actionLabel,
  disabled,
  onAction,
}: {
  title: string;
  icon: typeof ShieldCheck;
  items: Rule5PlayerView[];
  emptyLabel: string;
  actionLabel: string;
  disabled: boolean;
  onAction: (playerId: string) => Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {items.length > 0 ? (
        items.map((player) => (
          <div
            key={player.playerId}
            className="flex items-center justify-between gap-3 rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2"
          >
            <div>
              <div className="font-data text-xs text-dynasty-textBright">
                {playerLine(player)}
              </div>
              <div className="mt-1 font-heading text-xs text-dynasty-muted">
                Eligible after Season {player.rule5EligibleAfterSeason}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void onAction(player.playerId)}
              disabled={disabled}
              className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs font-semibold uppercase tracking-[0.16em] text-dynasty-text transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
            >
              {actionLabel}
            </button>
          </div>
        ))
      ) : (
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-3">
      <div className="flex items-center gap-1.5 text-dynasty-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-heading text-xs">{label}</span>
      </div>
      <div className="mt-1 font-data text-2xl font-bold text-dynasty-text">{value}</div>
    </div>
  );
}
