import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, GradeBar, Skeleton, StatLine, Tabs, TabsList, TabsTrigger } from '@mbd/ui';
import { Clock3, DollarSign, FileSignature, GripVertical, ShieldCheck } from 'lucide-react';
import { AFFILIATE_LEVELS, PITCHER_POSITIONS } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { PageHelp } from '@/shared/components/PageHelp';
import { ResponsiveTable, type ColumnDef } from '@/shared/components/ResponsiveTable';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import { gradeBadgeColor } from '@/shared/lib/grade';
import { humanizeLabel, minorLevelLabel } from '@/shared/lib/labels';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { DayOneOpeningPlan, TeamChemistry } from '@mbd/contracts';

const LineupBuilder = lazy(() => import('../components/LineupBuilder'));
const DepthChartDnD = lazy(() => import('../components/DepthChartDnD'));

interface PromotionCandidateView {
  playerId: string;
  playerName: string;
  position: string;
  currentLevel: string;
  targetLevel: string;
  score: number;
  reason: string;
}

interface ComplianceIssueView {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

interface DFACandidateView {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  salary: number;
  score: number;
  reason: string;
}

interface RosterComplianceView {
  activeRosterCount: number;
  activeRosterLimit: number;
  fortyManCount: number;
  issues: ComplianceIssueView[];
  dfaRecommendations: DFACandidateView[];
}

interface AffiliateOverviewView {
  affiliates: Array<{
    level: string;
    label: string;
    wins: number;
    losses: number;
    gamesPlayed: number;
    runDifferential: number;
    topPerformer: {
      playerId: string;
      playerName: string;
      statLine: string;
    } | null;
  }>;
  recentBoxScores: Array<{
    id: string;
    day: number;
    level: string;
    label: string;
    result: string;
    scoreline: string;
    summary: string;
  }>;
  waiverClaims: Array<{
    playerId: string;
    playerName: string;
    fromTeamName: string;
    toTeamName: string | null;
    status: string;
    salary: number;
    priorityIndex: number | null;
  }>;
}

interface ExtensionCandidateView {
  playerId: string;
  playerName: string;
  position: string;
  yearsRemaining: number;
  currentSalary: number;
  willingness: number;
  demandMultiplier: number;
  walkAwayThreshold: number;
}

interface ExtensionOfferView {
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  noTradeClauseType: string;
  playerOption: boolean;
  teamOption: boolean;
  optOutYears: number[];
  signingBonus: number;
  buyoutAmount: number;
  deferredMoney: Array<{ yearOffset: number; amount: number }>;
}

interface ExtensionResponseView {
  status: 'accepted' | 'rejected' | 'countered';
  rounds: Array<{ round: number; status: string }>;
  counterOffer?: ExtensionOfferView;
}

type RosterPlanView = DayOneOpeningPlan;

interface PendingRosterAction {
  kind: 'promote' | 'demote' | 'dfa';
  playerId: string;
  playerName: string;
  position: string;
  detail: string;
  consequence: string;
  confirmLabel: string;
  actionId: string;
  run: () => Promise<unknown>;
}

function chemistryTone(tier: string): string {
  switch (tier) {
    case 'electric': return 'text-accent-success';
    case 'connected': return 'text-accent-info';
    case 'steady': return 'text-dynasty-text';
    case 'tense': return 'text-accent-warning';
    default: return 'text-accent-danger';
  }
}

function issueTone(severity: 'error' | 'warning'): string {
  return severity === 'error'
    ? 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger'
    : 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
}

function formatServiceTime(serviceTimeDays: number): string {
  const years = Math.floor(serviceTimeDays / 172);
  const days = serviceTimeDays % 172;
  return `${years}y ${days}d`;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function willingnessLabel(value: number): { label: string; variant: 'success' | 'info' | 'outline' } {
  if (value >= 0.7) return { label: 'High', variant: 'success' };
  if (value >= 0.5) return { label: 'Medium', variant: 'info' };
  return { label: 'Low', variant: 'outline' };
}

function gradeFromValue(value: number, floor: number, ceiling: number): number {
  const normalized = (value - floor) / Math.max(0.0001, ceiling - floor);
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(20 + (clamped * 60));
}

function dfaRiskLabel(candidate: DFACandidateView): { label: string; tone: string } {
  if (candidate.score >= 95) {
    return { label: 'Low roster risk', tone: 'text-accent-success' };
  }
  if (candidate.score >= 70) {
    return { label: 'Moderate roster risk', tone: 'text-accent-warning' };
  }
  return { label: 'Review before cutting', tone: 'text-accent-danger' };
}

function dfaSafeAction(candidate: DFACandidateView): string {
  if (candidate.salary >= 8) {
    return 'Shop salary first, then DFA if no market forms.';
  }
  if (candidate.age <= 25) {
    return 'Check options and depth chart before exposing upside.';
  }
  return 'DFA is the cleanest compliance move if the roster stays over the line.';
}

const PITCHER_POSITIONS_SET = new Set<string>(PITCHER_POSITIONS);

// UI depth chart order — intentionally different from sim-core ALL_POSITIONS
// (SS/3B swapped) to match baseball scorecard visual layout.
const ALL_POSITIONS = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'DH', 'SP', 'RP', 'CL'] as const;

function orderPlayersByPlan<T extends { id: string; displayRating: number }>(players: T[], orderedIds: string[] = []): T[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const ordered = orderedIds
    .map((playerId) => byId.get(playerId))
    .filter((player): player is T => player != null);
  const remaining = players
    .filter((player) => !orderedIds.includes(player.id))
    .sort((left, right) => right.displayRating - left.displayRating);
  return [...ordered, ...remaining];
}

function buildBullpenPlanFromDepth(
  roster: PlayerDTO[],
  depthPlan: Record<string, string[]>,
  rotationPlayerIds: string[],
): NonNullable<DayOneOpeningPlan['bullpen']> {
  const relievers = orderPlayersByPlan(
    roster.filter((player) => player.position === 'RP' || player.position === 'CL'),
    [...(depthPlan.RP ?? []), ...(depthPlan.CL ?? [])],
  );
  const closers = orderPlayersByPlan(
    roster.filter((player) => player.position === 'CL'),
    depthPlan.CL ?? [],
  );
  const starters = orderPlayersByPlan(
    roster.filter((player) => player.position === 'SP'),
    depthPlan.SP ?? rotationPlayerIds,
  );
  const closerId = closers[0]?.id ?? relievers[0]?.id ?? null;
  const setupIds = relievers
    .filter((player) => player.id !== closerId && !rotationPlayerIds.includes(player.id))
    .slice(0, 2)
    .map((player) => player.id);
  const longReliefId = [
    ...starters.filter((player) => !rotationPlayerIds.includes(player.id)),
    ...relievers,
  ].find((player) => player.id !== closerId && !setupIds.includes(player.id))?.id ?? null;

  return { closerId, setupIds, longReliefId };
}

function buildDepthPlanFromRosterPlan(plan: RosterPlanView | null): Record<string, string[]> {
  if (!plan) {
    return {};
  }

  return {
    SP: plan.rotationPlayerIds,
    RP: [
      plan.bullpen?.longReliefId,
      ...(plan.bullpen?.setupIds ?? []),
    ].filter((playerId): playerId is string => Boolean(playerId)),
    CL: plan.bullpen?.closerId ? [plan.bullpen.closerId] : [],
  };
}

function buildDepthChartGroups(roster: PlayerDTO[], depthPlan: Record<string, string[]> = {}) {
  return ALL_POSITIONS
    .map((pos) => ({
      position: pos,
      players: orderPlayersByPlan(
        roster
        .filter((p) => p.position === pos)
        .sort((a, b) => b.displayRating - a.displayRating),
        depthPlan[pos] ?? [],
      )
        .map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          position: p.position,
          displayRating: p.displayRating,
          letterGrade: p.letterGrade,
        })),
    }))
    .filter((g) => g.players.length > 0);
}

function rosterActionFailed(result: unknown): result is { success: false; error?: string } {
  return typeof result === 'object'
    && result !== null
    && 'success' in result
    && (result as { success?: unknown }).success === false;
}

const MINOR_LEVELS = [...AFFILIATE_LEVELS, 'INTERNATIONAL'].map((key) => ({
  key,
  label: minorLevelLabel(key),
}));

export default function RosterPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, userTeamId, isInitialized, activeSaveId, activeSaveSlot } = useGameStore();
  const autosaveActiveGame = useActiveSaveAutosave();
  const [mlbRoster, setMlbRoster] = useState<PlayerDTO[]>([]);
  const [minors, setMinors] = useState<Record<string, PlayerDTO[]>>({});
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [rosterPlan, setRosterPlan] = useState<RosterPlanView | null>(null);
  const [depthPlan, setDepthPlan] = useState<Record<string, string[]>>({});
  const [promotionCandidates, setPromotionCandidates] = useState<PromotionCandidateView[]>([]);
  const [compliance, setCompliance] = useState<RosterComplianceView | null>(null);
  const [affiliateOverview, setAffiliateOverview] = useState<AffiliateOverviewView | null>(null);
  const [extensionCandidates, setExtensionCandidates] = useState<ExtensionCandidateView[]>([]);
  const [activeTab, setActiveTab] = useState<'mlb' | 'minors' | 'contracts' | 'lineup'>('mlb');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedExtension, setSelectedExtension] = useState<ExtensionCandidateView | null>(null);
  const [extensionOffer, setExtensionOffer] = useState<ExtensionOfferView | null>(null);
  const [offerYears, setOfferYears] = useState(5);
  const [offerSalary, setOfferSalary] = useState('');
  const [offerSigningBonus, setOfferSigningBonus] = useState('');
  const [offerNoTrade, setOfferNoTrade] = useState(false);
  const [offerOptOut, setOfferOptOut] = useState(false);
  const [negotiationResponse, setNegotiationResponse] = useState<ExtensionResponseView | null>(null);
  const [pendingRosterAction, setPendingRosterAction] = useState<PendingRosterAction | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const depthPlanStorageKey = useMemo(() => {
    const saveKey = activeSaveSlot != null ? `slot-${activeSaveSlot}` : (activeSaveId ?? 'unsaved');
    return `mbd:roster-depth-plan:${saveKey}:${userTeamId}`;
  }, [activeSaveId, activeSaveSlot, userTeamId]);

  const fetchRoster = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    const [
      rosterData,
      chemistryData,
      promotionData,
      complianceData,
      affiliateData,
      extensionData,
      planData,
    ] = await Promise.all([
      worker.getFullRoster(userTeamId),
      worker.getTeamChemistry(userTeamId),
      worker.getPromotionCandidates(userTeamId),
      worker.getRosterComplianceIssues(userTeamId),
      worker.getAffiliateOverview(userTeamId),
      worker.getExtensionCandidates(userTeamId),
      typeof (worker as Record<string, unknown>).getRosterPlan === 'function'
        ? worker.getRosterPlan()
        : Promise.resolve(null),
    ]);

    if (rosterData) {
      setMlbRoster(rosterData.mlb as PlayerDTO[]);
      setMinors(rosterData.minors as Record<string, PlayerDTO[]>);
    }

    setChemistry((chemistryData ?? null) as TeamChemistry | null);
    setPromotionCandidates((promotionData ?? []) as PromotionCandidateView[]);
    setCompliance((complianceData ?? null) as RosterComplianceView | null);
    setAffiliateOverview((affiliateData ?? null) as AffiliateOverviewView | null);
    setExtensionCandidates((extensionData ?? []) as ExtensionCandidateView[]);
    setRosterPlan((planData ?? null) as RosterPlanView | null);
  }, [isInitialized, userTeamId, worker, workerReady]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster, day, season, phase]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(depthPlanStorageKey);
    if (!raw) {
      setDepthPlan({});
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setDepthPlan(typeof parsed === 'object' && parsed !== null ? parsed as Record<string, string[]> : {});
    } catch {
      setDepthPlan({});
    }
  }, [depthPlanStorageKey]);

  const persistDepthPlan = useCallback((nextDepthPlan: Record<string, string[]>) => {
    setDepthPlan(nextDepthPlan);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(depthPlanStorageKey, JSON.stringify(nextDepthPlan));
    }
  }, [depthPlanStorageKey]);

  const persistRosterPlan = useCallback(async (patch: Partial<DayOneOpeningPlan>) => {
    if (typeof (worker as Record<string, unknown>).updateRosterPlan !== 'function') {
      return;
    }

    const result = await worker.updateRosterPlan(patch);
    if (result?.success) {
      setRosterPlan(result.plan as RosterPlanView);
      await autosaveActiveGame({ season });
    }
  }, [autosaveActiveGame, season, worker]);

  const runRosterAction = useCallback(async (actionId: string, operation: () => Promise<unknown>) => {
    setBusyAction(actionId);
    setActionMessage(null);
    try {
      const result = await operation();
      if (rosterActionFailed(result)) {
        setActionMessage(result.error ?? 'That roster move could not be completed.');
        return;
      }
      await fetchRoster();
      await autosaveActiveGame({ season });
    } finally {
      setBusyAction(null);
    }
  }, [autosaveActiveGame, fetchRoster, season]);

  const hitters = mlbRoster.filter((player) => !PITCHER_POSITIONS_SET.has(player.position));
  const pitchers = mlbRoster.filter((player) => PITCHER_POSITIONS_SET.has(player.position));
  const lineupPlayers = useMemo(
    () => orderPlayersByPlan(hitters, rosterPlan?.lineupPlayerIds ?? []).slice(0, 9),
    [hitters, rosterPlan?.lineupPlayerIds],
  );
  const rotationPlayers = useMemo(
    () => orderPlayersByPlan(
      pitchers.filter((player) => player.position === 'SP'),
      rosterPlan?.rotationPlayerIds ?? [],
    ).slice(0, 5),
    [pitchers, rosterPlan?.rotationPlayerIds],
  );
  const effectiveDepthPlan = useMemo(
    () => ({
      ...buildDepthPlanFromRosterPlan(rosterPlan),
      ...depthPlan,
    }),
    [depthPlan, rosterPlan],
  );
  const depthChartGroups = useMemo(
    () => buildDepthChartGroups(mlbRoster ?? [], effectiveDepthPlan),
    [effectiveDepthPlan, mlbRoster],
  );

  const handleLineupReorder = useCallback((orderedIds: string[]) => {
    void persistRosterPlan({ lineupPlayerIds: orderedIds.slice(0, 9) });
  }, [persistRosterPlan]);

  const handleRotationReorder = useCallback((orderedIds: string[]) => {
    void persistRosterPlan({ rotationPlayerIds: orderedIds.slice(0, 5) });
  }, [persistRosterPlan]);

  const handleDepthReorder = useCallback((position: string, orderedIds: string[]) => {
    const nextDepthPlan = {
      ...depthPlan,
      [position]: orderedIds,
    };
    persistDepthPlan(nextDepthPlan);

    if (!PITCHER_POSITIONS_SET.has(position)) {
      return;
    }

    const rotationPlayerIds = position === 'SP'
      ? orderedIds.slice(0, 5)
      : rosterPlan?.rotationPlayerIds ?? rotationPlayers.map((player) => player.id);
    void persistRosterPlan({
      rotationPlayerIds,
      bullpen: buildBullpenPlanFromDepth(mlbRoster, nextDepthPlan, rotationPlayerIds),
    });
  }, [depthPlan, mlbRoster, persistDepthPlan, persistRosterPlan, rosterPlan?.rotationPlayerIds, rotationPlayers]);

  const confirmRosterAction = useCallback(async () => {
    if (!pendingRosterAction) {
      return;
    }

    try {
      await runRosterAction(pendingRosterAction.actionId, pendingRosterAction.run);
    } finally {
      setPendingRosterAction(null);
    }
  }, [pendingRosterAction, runRosterAction]);

  const openNegotiation = useCallback(async (candidate: ExtensionCandidateView) => {
    const offer = await worker.getExtensionOffer(candidate.playerId, 5);
    if (!offer) return;

    setSelectedExtension(candidate);
    setExtensionOffer(offer as ExtensionOfferView);
    setOfferYears((offer as ExtensionOfferView).years);
    setOfferSalary((offer as ExtensionOfferView).annualSalary.toFixed(1));
    setOfferSigningBonus(((offer as ExtensionOfferView).signingBonus ?? 0).toFixed(1));
    setOfferNoTrade((offer as ExtensionOfferView).noTradeClause);
    setOfferOptOut(((offer as ExtensionOfferView).optOutYears ?? []).length > 0);
    setNegotiationResponse(null);
  }, [worker]);

  const closeNegotiation = useCallback(() => {
    setSelectedExtension(null);
    setExtensionOffer(null);
    setNegotiationResponse(null);
  }, []);

  const submitExtensionOffer = useCallback(async () => {
    if (!selectedExtension || !extensionOffer) return;

    setBusyAction(`extension-${selectedExtension.playerId}`);
    try {
      const response = await worker.negotiateExtension(selectedExtension.playerId, {
        ...extensionOffer,
        years: offerYears,
        annualSalary: Number.parseFloat(offerSalary) || extensionOffer.annualSalary,
        totalValue: (Number.parseFloat(offerSalary) || extensionOffer.annualSalary) * offerYears,
        signingBonus: Number.parseFloat(offerSigningBonus) || 0,
        noTradeClause: offerNoTrade,
        noTradeClauseType: offerNoTrade ? 'full' : 'none',
        optOutYears: offerOptOut ? [Math.max(2, offerYears - 1)] : [],
      });
      setNegotiationResponse((response ?? null) as ExtensionResponseView | null);
      if (response) {
        await autosaveActiveGame({ season });
      }
      if ((response as ExtensionResponseView | null)?.status === 'accepted') {
        await fetchRoster();
      }
    } finally {
      setBusyAction(null);
    }
  }, [
    autosaveActiveGame,
    extensionOffer,
    fetchRoster,
    offerNoTrade,
    offerOptOut,
    offerSalary,
    offerSigningBonus,
    offerYears,
    selectedExtension,
    season,
    worker,
  ]);

  const openDemoteAction = useCallback((player: PlayerDTO) => {
    setPendingRosterAction({
      kind: 'demote',
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      detail: `${player.position} | ${player.letterGrade} | Options used ${player.optionYearsUsed}${player.isOutOfOptions ? ' | Out of options' : ''}`,
      consequence: player.isOutOfOptions
        ? 'This player is out of options and may need to clear waivers before reaching the minors.'
        : 'This uses a minor-league assignment path and can change active-roster depth immediately.',
      confirmLabel: 'Confirm Demotion',
      actionId: `demote-${player.id}`,
      run: () => worker.demotePlayer(player.id),
    });
  }, [worker]);

  const openPromoteAction = useCallback((player: PlayerDTO, levelLabel: string) => {
    setPendingRosterAction({
      kind: 'promote',
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      detail: `${levelLabel} | ${player.letterGrade} | OVR ${player.displayRating}`,
      consequence: 'This moves the player up the ladder immediately and may change 40-man or active-roster pressure.',
      confirmLabel: 'Confirm Promotion',
      actionId: `promote-${player.id}`,
      run: () => worker.promotePlayer(player.id),
    });
  }, [worker]);

  const renderPlayerName = useCallback((player: PlayerDTO) => (
    <Link
      to={`/players/${player.id}`}
      className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
    >
      {player.firstName} {player.lastName}
    </Link>
  ), []);

  const renderGrade = useCallback((player: PlayerDTO) => (
    <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeBadgeColor(player.letterGrade)}`}>
      {player.letterGrade}
    </span>
  ), []);

  const renderDemoteButton = useCallback((player: PlayerDTO) => (
    <button
      type="button"
      onClick={() => openDemoteAction(player)}
      disabled={busyAction === `demote-${player.id}`}
      className="w-full rounded border border-dynasty-border px-3 py-2 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 md:w-auto md:px-2 md:py-1"
    >
      Demote
    </button>
  ), [busyAction, openDemoteAction]);

  const renderPromoteButton = useCallback((player: PlayerDTO, levelLabel: string) => (
    <button
      type="button"
      onClick={() => openPromoteAction(player, levelLabel)}
      disabled={busyAction === `promote-${player.id}`}
      className="w-full rounded border border-accent-success/50 px-3 py-2 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/10 disabled:opacity-50 md:w-auto md:px-2 md:py-1"
    >
      Promote
    </button>
  ), [busyAction, openPromoteAction]);

  const hitterColumns = useMemo<ColumnDef<PlayerDTO>[]>(() => [
    {
      key: 'player',
      label: 'Player',
      primary: true,
      render: renderPlayerName,
    },
    {
      key: 'position',
      label: 'POS',
      render: (player) => player.position,
    },
    {
      key: 'overall',
      label: 'OVR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.displayRating,
    },
    {
      key: 'grade',
      label: 'GRD',
      className: 'text-center',
      render: renderGrade,
    },
    {
      key: 'age',
      label: 'AGE',
      className: 'text-right',
      render: (player) => player.age,
    },
    {
      key: 'service',
      label: 'SVC',
      className: 'text-right',
      render: (player) => formatServiceTime(player.serviceTimeDays),
    },
    {
      key: 'options',
      label: 'OPT',
      className: 'text-right',
      render: (player) => `${player.optionYearsUsed}${player.isOutOfOptions ? ' / OOO' : ''}`,
    },
    {
      key: 'plate-appearances',
      label: 'PA',
      className: 'text-right',
      hideOnMobile: true,
      render: (player) => player.stats?.pa ?? '-',
    },
    {
      key: 'average',
      label: 'AVG',
      className: 'text-right',
      render: (player) => player.stats?.avg ?? '-',
    },
    {
      key: 'home-runs',
      label: 'HR',
      className: 'text-right',
      render: (player) => player.stats?.hr ?? '-',
    },
    {
      key: 'rbi',
      label: 'RBI',
      className: 'text-right',
      render: (player) => player.stats?.rbi ?? '-',
    },
    {
      key: 'war',
      label: 'WAR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.advanced?.war?.toFixed(1) ?? '-',
    },
    {
      key: 'action',
      label: 'Action',
      className: 'text-right',
      mobileClassName: 'col-span-3',
      render: renderDemoteButton,
    },
  ], [renderDemoteButton, renderGrade, renderPlayerName]);

  const pitcherColumns = useMemo<ColumnDef<PlayerDTO>[]>(() => [
    {
      key: 'player',
      label: 'Player',
      primary: true,
      render: renderPlayerName,
    },
    {
      key: 'position',
      label: 'POS',
      render: (player) => player.position,
    },
    {
      key: 'overall',
      label: 'OVR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.displayRating,
    },
    {
      key: 'grade',
      label: 'GRD',
      className: 'text-center',
      render: renderGrade,
    },
    {
      key: 'age',
      label: 'AGE',
      className: 'text-right',
      render: (player) => player.age,
    },
    {
      key: 'service',
      label: 'SVC',
      className: 'text-right',
      render: (player) => formatServiceTime(player.serviceTimeDays),
    },
    {
      key: 'options',
      label: 'OPT',
      className: 'text-right',
      render: (player) => `${player.optionYearsUsed}${player.isOutOfOptions ? ' / OOO' : ''}`,
    },
    {
      key: 'era',
      label: 'ERA',
      className: 'text-right',
      render: (player) => player.stats?.era ?? '-',
    },
    {
      key: 'strikeouts',
      label: 'K',
      className: 'text-right',
      render: (player) => player.stats?.strikeouts ?? '-',
    },
    {
      key: 'walks',
      label: 'BB',
      className: 'text-right',
      render: (player) => player.stats?.walks ?? '-',
    },
    {
      key: 'war',
      label: 'WAR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.advanced?.war?.toFixed(1) ?? '-',
    },
    {
      key: 'action',
      label: 'Action',
      className: 'text-right',
      mobileClassName: 'col-span-3',
      render: renderDemoteButton,
    },
  ], [renderDemoteButton, renderGrade, renderPlayerName]);

  const buildMinorColumns = useCallback((levelKey: string, levelLabel: string): ColumnDef<PlayerDTO>[] => [
    {
      key: 'player',
      label: 'Player',
      primary: true,
      render: renderPlayerName,
    },
    {
      key: 'position',
      label: 'POS',
      render: (player) => player.position,
    },
    {
      key: 'overall',
      label: 'OVR',
      className: 'text-right',
      highlight: true,
      render: (player) => player.displayRating,
    },
    {
      key: 'grade',
      label: 'GRD',
      className: 'text-center',
      render: renderGrade,
    },
    {
      key: 'age',
      label: 'AGE',
      className: 'text-right',
      render: (player) => player.age,
    },
    {
      key: 'options',
      label: 'OPT',
      className: 'text-right',
      render: (player) => `${player.optionYearsUsed}${player.isOutOfOptions ? ' / OOO' : ''}`,
    },
    {
      key: 'action',
      label: 'Action',
      className: 'text-right',
      mobileClassName: 'col-span-3',
      render: (player) => levelKey !== 'INTERNATIONAL'
        ? renderPromoteButton(player, levelLabel)
        : <span className="font-heading text-xs text-dynasty-muted">Intake only</span>,
    },
  ], [renderGrade, renderPlayerName, renderPromoteButton]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Roster</h1>
          <p className="font-data text-sm text-dynasty-muted">
            {mlbRoster.length} players on active roster
          </p>
        </div>
        <PageHelp pageKey="roster" />
      </div>

      {actionMessage ? (
        <div className="rounded-lg border border-accent-warning/40 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
          {actionMessage}
        </div>
      ) : null}

      {chemistry && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-heading text-xs uppercase text-dynasty-muted">Clubhouse chemistry</div>
              <div className="mt-1 flex items-end gap-3">
                <div className={`font-data text-4xl font-bold ${chemistryTone(chemistry.tier)}`}>
                  {chemistry.score}
                </div>
                <div className="pb-1 font-heading text-sm text-dynasty-muted">
                  {humanizeLabel(chemistry.tier)} | {humanizeLabel(chemistry.trend)}
                </div>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-text">
                {chemistry.summary}
              </div>
            </div>
            <div className="grid gap-2 text-sm">
              {chemistry.reasons.map((reason) => (
                <div key={reason} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-dynasty-muted">
                  {reason}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'mlb' | 'minors' | 'contracts' | 'lineup')}>
        <TabsList>
          <TabsTrigger value="mlb" onClick={() => setActiveTab('mlb')}>MLB Control Room</TabsTrigger>
          <TabsTrigger value="minors" onClick={() => setActiveTab('minors')}>Minor Leagues</TabsTrigger>
          <TabsTrigger value="contracts" onClick={() => setActiveTab('contracts')}>Contracts</TabsTrigger>
          <TabsTrigger value="lineup" onClick={() => setActiveTab('lineup')}>
            <GripVertical className="mr-1 inline h-3 w-3" />Lineup Builder
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'mlb' && (
        <div className="space-y-6">
          {compliance && (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div>
                  <div className="font-heading text-xs uppercase text-dynasty-muted">Roster Compliance War Room</div>
                  <div className="mt-1 font-heading text-sm text-dynasty-text">
                    Active limits, 40-man pressure, and the safest next move in one place.
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                      <div className="font-heading text-xs uppercase text-dynasty-muted">Active</div>
                      <div className="font-data text-lg text-dynasty-text">
                        {compliance.activeRosterCount}/{compliance.activeRosterLimit}
                      </div>
                      <div className="mt-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                        {Math.max(0, compliance.activeRosterCount - compliance.activeRosterLimit)} over
                      </div>
                    </div>
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                      <div className="font-heading text-xs uppercase text-dynasty-muted">40-Man</div>
                      <div className="font-data text-lg text-dynasty-text">
                        {compliance.fortyManCount}/40
                      </div>
                      <div className="mt-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                        {Math.max(0, compliance.fortyManCount - 40)} over
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 lg:min-w-[24rem]">
                  {compliance.issues.length > 0 ? compliance.issues.map((issue) => (
                    <div
                      key={`${issue.code}-${issue.message}`}
                      className={`rounded border px-3 py-2 text-sm ${issueTone(issue.severity)}`}
                    >
                      {issue.message}
                    </div>
                  )) : (
                    <div className="rounded border border-accent-success/40 bg-accent-success/10 px-3 py-2 text-sm text-accent-success">
                      Active roster and 40-man roster are compliant today.
                    </div>
                  )}
                </div>
              </div>

              {compliance.dfaRecommendations.length > 0 && (
                <div className="mt-4 border-t border-dynasty-border pt-4">
                  <div className="font-heading text-xs uppercase text-dynasty-muted">Recommended cuts</div>
                  <div className="mt-1 font-heading text-sm text-dynasty-muted">
                    Showing the three cleanest pressure-release options first. Keep the full roster tables below for deeper review.
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {compliance.dfaRecommendations.slice(0, 3).map((candidate) => {
                      const risk = dfaRiskLabel(candidate);
                      return (
                        <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                              <div className="font-data text-xs text-dynasty-muted">
                                {candidate.position} | Age {candidate.age} | ${candidate.salary.toFixed(1)}M
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-data text-sm text-accent-warning">Cut score {candidate.score}</div>
                              <div className={`mt-1 font-heading text-[10px] uppercase tracking-wide ${risk.tone}`}>{risk.label}</div>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2">
                            <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                              <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Reason</div>
                              <div className="mt-1 text-sm text-dynasty-muted">{candidate.reason}</div>
                            </div>
                            <div className="rounded border border-accent-info/30 bg-accent-info/5 px-3 py-2">
                              <div className="font-heading text-[10px] uppercase tracking-wide text-accent-info">Safe next action</div>
                              <div className="mt-1 text-sm text-dynasty-text">{dfaSafeAction(candidate)}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingRosterAction({
                              kind: 'dfa',
                              playerId: candidate.playerId,
                              playerName: candidate.playerName,
                              position: candidate.position,
                              detail: `${candidate.position} | Age ${candidate.age} | ${moneyLabel(candidate.salary)}`,
                              consequence: 'This removes the player from the active/40-man picture and exposes him to waiver-claim risk.',
                              confirmLabel: `Confirm DFA`,
                              actionId: `dfa-${candidate.playerId}`,
                              run: () => worker.designateForAssignment(candidate.playerId),
                            })}
                            disabled={busyAction === `dfa-${candidate.playerId}`}
                            className="mt-3 rounded border border-accent-danger/50 px-3 py-1.5 font-heading text-xs text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:opacity-50"
                          >
                            DFA {candidate.playerName}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="border-b border-dynasty-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold text-dynasty-text">
                Position Players ({hitters.length})
              </h2>
            </div>
            <div className="p-3 md:p-0">
              <ResponsiveTable
                data={hitters}
                columns={hitterColumns}
                keyExtractor={(player) => player.id}
                emptyMessage="No position players on the active roster."
              />
            </div>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="border-b border-dynasty-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold text-dynasty-text">
                Pitchers ({pitchers.length})
              </h2>
            </div>
            <div className="p-3 md:p-0">
              <ResponsiveTable
                data={pitchers}
                columns={pitcherColumns}
                keyExtractor={(player) => player.id}
                emptyMessage="No pitchers on the active roster."
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'minors' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-heading text-xs uppercase text-dynasty-muted">Promotion recommendations</div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">
                  Best ready-now minor leaguers based on affiliate performance and age-to-level fit.
                </div>
              </div>
              <Link to="/minors" className="font-heading text-xs text-accent-info hover:text-accent-primary">
                Open affiliate hub
              </Link>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {promotionCandidates.length > 0 ? promotionCandidates.map((candidate) => (
                <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                      <div className="font-data text-xs text-dynasty-muted">
                        {candidate.position} | {minorLevelLabel(candidate.currentLevel)} to {minorLevelLabel(candidate.targetLevel)}
                      </div>
                    </div>
                    <div className="font-data text-sm text-accent-success">Score {candidate.score}</div>
                  </div>
                  <div className="mt-2 text-sm text-dynasty-muted">{candidate.reason}</div>
                  <button
                    type="button"
                    onClick={() => setPendingRosterAction({
                      kind: 'promote',
                      playerId: candidate.playerId,
                      playerName: candidate.playerName,
                      position: candidate.position,
                      detail: `${minorLevelLabel(candidate.currentLevel)} to ${minorLevelLabel(candidate.targetLevel)} | Score ${candidate.score}`,
                      consequence: 'This changes the player assignment now and can start service-time, option, and active-depth consequences.',
                      confirmLabel: 'Confirm Promotion',
                      actionId: `promote-${candidate.playerId}`,
                      run: () => worker.promotePlayer(candidate.playerId),
                    })}
                    disabled={busyAction === `promote-${candidate.playerId}`}
                    className="mt-3 rounded border border-accent-success/50 px-3 py-1.5 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/10 disabled:opacity-50"
                  >
                    Promote
                  </button>
                </div>
              )) : (
                <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                  No affiliate bats or arms are forcing a promotion today.
                </div>
              )}
            </div>
          </div>

          {affiliateOverview && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 lg:col-span-2">
                  <div className="font-heading text-xs uppercase text-dynasty-muted">Affiliate snapshot</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {affiliateOverview.affiliates.map((affiliate) => (
                      <div key={affiliate.level} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-heading text-sm text-dynasty-text">{affiliate.label}</div>
                            <div className="font-data text-xs text-dynasty-muted">
                              {affiliate.wins}-{affiliate.losses} in {affiliate.gamesPlayed} G
                            </div>
                          </div>
                          <div className={`font-data text-sm ${affiliate.runDifferential >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                            {affiliate.runDifferential >= 0 ? '+' : ''}{affiliate.runDifferential}
                          </div>
                        </div>
                        {affiliate.topPerformer && (
                          <div className="mt-3 text-sm text-dynasty-muted">
                            <span className="font-heading text-dynasty-text">{affiliate.topPerformer.playerName}</span>
                            {' '}| {affiliate.topPerformer.statLine}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                  <div className="font-heading text-xs uppercase text-dynasty-muted">Waiver wire</div>
                  <div className="mt-3 space-y-3">
                    {affiliateOverview.waiverClaims.length > 0 ? affiliateOverview.waiverClaims.map((claim) => (
                      <div key={`${claim.playerId}-${claim.status}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                        <div className="font-heading text-sm text-dynasty-text">{claim.playerName}</div>
                        <div className="mt-1 text-xs text-dynasty-muted">
                          {claim.status === 'pending' ? 'Pending claim' : humanizeLabel(claim.status)} | {claim.fromTeamName}
                        </div>
                        <div className="mt-2 text-xs text-dynasty-muted">
                          ${claim.salary.toFixed(1)}M
                          {claim.priorityIndex ? ` | Priority ${claim.priorityIndex}` : ''}
                        </div>
                        {claim.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void runRosterAction(`claim-${claim.playerId}`, () => worker.claimOffWaivers(claim.playerId))}
                            disabled={busyAction === `claim-${claim.playerId}`}
                            className="mt-3 rounded border border-accent-info/50 px-3 py-1.5 font-heading text-xs text-accent-info transition-colors hover:bg-accent-info/10 disabled:opacity-50"
                          >
                            Claim {claim.playerName}
                          </button>
                        )}
                      </div>
                    )) : (
                      <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                        No active waiver claims right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
                <div className="font-heading text-xs uppercase text-dynasty-muted">Recent affiliate results</div>
                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  {affiliateOverview.recentBoxScores.length > 0 ? affiliateOverview.recentBoxScores.slice(0, 9).map((boxScore) => (
                    <div key={boxScore.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-heading text-sm text-dynasty-text">{boxScore.label}</div>
                          <div className="font-data text-xs text-dynasty-muted">Day {boxScore.day}</div>
                        </div>
                        <div className={`font-data text-sm ${boxScore.result === 'W' ? 'text-accent-success' : 'text-accent-danger'}`}>
                          {boxScore.result}
                        </div>
                      </div>
                      <div className="mt-2 font-data text-sm text-dynasty-text">{boxScore.scoreline}</div>
                      <div className="mt-1 text-sm text-dynasty-muted">{boxScore.summary}</div>
                    </div>
                  )) : (
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-4 text-sm text-dynasty-muted">
                      Affiliate schedules have not opened yet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {MINOR_LEVELS.map((level) => {
            const players = minors[level.key] ?? [];
            return (
              <div key={level.key} className="rounded-lg border border-dynasty-border bg-dynasty-surface">
                <div className="border-b border-dynasty-border px-4 py-3">
                  <h2 className="font-heading text-sm font-semibold text-dynasty-text">
                    {level.label} ({players.length})
                  </h2>
                </div>
                <div className="p-3 md:p-0">
                  <ResponsiveTable
                    data={players.slice(0, 12)}
                    columns={buildMinorColumns(level.key, level.label)}
                    keyExtractor={(player) => player.id}
                    emptyMessage={`No players listed at ${level.label}.`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                  <FileSignature className="h-4 w-4 text-accent-primary" />
                  Extension Candidates
                </CardTitle>
              </div>
              <Badge variant="outline">
                {extensionCandidates.length} active files
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {extensionCandidates.length > 0 ? extensionCandidates.map((candidate) => {
                const willingness = willingnessLabel(candidate.willingness);
                const demandMultiplier = candidate.demandMultiplier ?? 1;
                const walkAwayThreshold = candidate.walkAwayThreshold ?? 0.12;
                return (
                  <div key={candidate.playerId} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                        <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                          {candidate.position} | {candidate.yearsRemaining} year control left
                        </div>
                        <StatLine
                          className="mt-3"
                          stats={[
                            { label: 'Current', value: moneyLabel(candidate.currentSalary) },
                            { label: 'Demand', value: `${demandMultiplier.toFixed(2)}x` },
                            { label: 'Willingness', value: `${Math.round(candidate.willingness * 100)}%` },
                          ]}
                        />
                      </div>
                      <div className="w-full max-w-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant={willingness.variant}>{willingness.label}</Badge>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void openNegotiation(candidate)}
                          >
                            Negotiate
                          </Button>
                        </div>
                        <GradeBar label="Willingness" grade={gradeFromValue(candidate.willingness, 0, 1)} />
                        <GradeBar label="Leverage" grade={gradeFromValue(demandMultiplier, 1, 1.55)} />
                        <GradeBar label="Risk" grade={gradeFromValue(walkAwayThreshold, 0.04, 0.28)} />
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
                  No extension files are open for this roster right now.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {pendingRosterAction && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-6">
          <Card className="w-full max-w-xl border-accent-warning/40 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-heading text-dynasty-text">Confirm Roster Move</CardTitle>
                <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {pendingRosterAction.kind} | {pendingRosterAction.position}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPendingRosterAction(null)}>
                Cancel
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-base text-dynasty-textBright">{pendingRosterAction.playerName}</div>
                <div className="mt-1 font-data text-xs text-dynasty-muted">{pendingRosterAction.detail}</div>
              </div>
              <div className="rounded-lg border border-accent-warning/30 bg-accent-warning/10 px-4 py-3 font-heading text-sm text-accent-warning">
                {pendingRosterAction.consequence}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingRosterAction(null)}>
                  Keep Current Roster
                </Button>
                <Button
                  type="button"
                  variant={pendingRosterAction.kind === 'dfa' ? 'destructive' : 'default'}
                  loading={busyAction === pendingRosterAction.actionId}
                  onClick={() => void confirmRosterAction()}
                >
                  {pendingRosterAction.confirmLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedExtension && extensionOffer && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-6">
          <Card className="w-full max-w-3xl border-accent-primary/30 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="font-heading text-dynasty-text">Extension Negotiation</CardTitle>
                <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {selectedExtension.playerName}
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeNegotiation}>
                Close
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Clock3 className="h-4 w-4 text-accent-info" />
                      Current Deal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StatLine
                      stats={[
                        { label: 'Years', value: selectedExtension.yearsRemaining },
                        { label: 'Salary', value: moneyLabel(selectedExtension.currentSalary) },
                      ]}
                    />
                  </CardContent>
                </Card>

                <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-accent-success" />
                      Proposed Extension
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <label className="block">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">Years</div>
                      <input
                        value={offerYears}
                        onChange={(event) => setOfferYears(Number.parseInt(event.target.value, 10) || 1)}
                        className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">AAV</div>
                      <input
                        value={offerSalary}
                        onChange={(event) => setOfferSalary(event.target.value)}
                        className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                      />
                    </label>
                    <label className="block">
                      <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">Signing Bonus</div>
                      <input
                        value={offerSigningBonus}
                        onChange={(event) => setOfferSigningBonus(event.target.value)}
                        className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                      />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 text-sm text-dynasty-text">
                        <input type="checkbox" checked={offerNoTrade} onChange={(event) => setOfferNoTrade(event.target.checked)} />
                        <ShieldCheck className="h-4 w-4 text-accent-info" />
                        No-trade clause
                      </label>
                      <label className="flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 text-sm text-dynasty-text">
                        <input type="checkbox" checked={offerOptOut} onChange={(event) => setOfferOptOut(event.target.checked)} />
                        <Clock3 className="h-4 w-4 text-accent-warning" />
                        Opt-out
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {negotiationResponse && (
                <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Latest Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant={negotiationResponse.status === 'accepted' ? 'success' : negotiationResponse.status === 'countered' ? 'info' : 'outline'}>
                      {negotiationResponse.status}
                    </Badge>
                    {negotiationResponse.counterOffer && (
                      <StatLine
                        stats={[
                          { label: 'Counter Years', value: negotiationResponse.counterOffer.years },
                          { label: 'Counter AAV', value: moneyLabel(negotiationResponse.counterOffer.annualSalary) },
                        ]}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeNegotiation}>
                  Walk Away
                </Button>
                <Button
                  type="button"
                  loading={busyAction === `extension-${selectedExtension.playerId}`}
                  onClick={() => void submitExtensionOffer()}
                >
                  Submit Offer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'lineup' && (
        <div className="space-y-6" data-testid="lineup-tab">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-dynasty-text">
                <GripVertical className="mr-2 inline h-4 w-4 text-accent-primary" />
                Batting Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
                <LineupBuilder
                  players={lineupPlayers
                    .map((p) => ({
                      id: p.id,
                      firstName: p.firstName,
                      lastName: p.lastName,
                      position: p.position,
                      displayRating: p.displayRating,
                      letterGrade: p.letterGrade,
                    }))}
                  onReorder={handleLineupReorder}
                />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-dynasty-text">Starting Rotation</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-72 rounded-lg" />}>
                <LineupBuilder
                  players={rotationPlayers.map((p) => ({
                    id: p.id,
                    firstName: p.firstName,
                    lastName: p.lastName,
                    position: p.position,
                    displayRating: p.displayRating,
                    letterGrade: p.letterGrade,
                  }))}
                  onReorder={handleRotationReorder}
                  ariaLabel="Starting rotation"
                  emptyLabel="No starting pitchers available for rotation"
                  instructionsId="rotation-instructions"
                  instructionsText="Drag pitchers to reorder the rotation, or use the up/down buttons."
                  slotLabel={(slot) => `Rotation ${slot}`}
                />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-dynasty-text">Positional Depth Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
                <DepthChartDnD
                  groups={depthChartGroups}
                  onReorder={handleDepthReorder}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
