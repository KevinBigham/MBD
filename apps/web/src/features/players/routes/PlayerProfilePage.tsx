import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton, StatLine, Tabs, TabsContent, TabsList, TabsTrigger } from '@mbd/ui';
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpCircle,
  BrainCircuit,
  ClipboardX,
  FileSignature,
  GitCompareArrows,
  History,
  LineChart,
  ShieldAlert,
} from 'lucide-react';
import { PageShell } from '@/shared/components/PageShell';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  moneyLabel,
  normalizePlayerProfileTab,
  type PlayerProfileTab,
  type PlayerProfileView,
} from '../components/playerProfileShared';

const ProfileHeader = lazy(() => import('../components/ProfileHeader'));
const StatsTab = lazy(() => import('../components/StatsTab'));
const DevelopmentTab = lazy(() => import('../components/DevelopmentTab'));
const ScoutingTab = lazy(() => import('../components/ScoutingTab'));
const HistoryTab = lazy(() => import('../components/HistoryTab'));
const PersonalityTab = lazy(() => import('../components/PersonalityTab'));

interface ExtensionOfferView {
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  noTradeClauseType: 'none' | 'partial' | 'full';
  playerOption: boolean;
  teamOption: boolean;
  optOutYears: number[];
  signingBonus: number;
  buyoutAmount: number;
  deferredMoney: Array<{ yearOffset: number; amount: number }>;
}

interface ExtensionResponseView {
  status: 'accepted' | 'rejected' | 'countered';
  counterOffer?: ExtensionOfferView;
  rounds: Array<{
    playerDemand?: ExtensionOfferView;
  }>;
}

interface RosterActionView {
  success: boolean;
  error?: string;
}

interface ActionState {
  tone: 'success' | 'error' | 'info';
  message: string;
}

const TAB_LABELS: Record<PlayerProfileTab, string> = {
  stats: 'Stats',
  development: 'Development',
  scouting: 'Scouting',
  history: 'History',
  personality: 'Personality',
};

const TAB_ICONS: Record<PlayerProfileTab, JSX.Element> = {
  stats: <LineChart className="h-4 w-4" />,
  development: <ArrowUpCircle className="h-4 w-4" />,
  scouting: <ShieldAlert className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
  personality: <BrainCircuit className="h-4 w-4" />,
};

const TAB_COMPONENTS = {
  stats: StatsTab,
  development: DevelopmentTab,
  scouting: ScoutingTab,
  history: HistoryTab,
  personality: PersonalityTab,
} satisfies Record<PlayerProfileTab, typeof StatsTab>;

function PlayerProfileSkeleton() {
  return (
    <div className="space-y-6" data-testid="player-profile-loading">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-48 rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-[34rem] rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

function TabFallback({
  title,
}: {
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-dynasty-text">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </CardContent>
    </Card>
  );
}

function actionToneClasses(tone: ActionState['tone']): string {
  switch (tone) {
    case 'success':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'info':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    default:
      return 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger';
  }
}

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, day, season, userTeamId } = useGameStore();
  const [view, setView] = useState<PlayerProfileView | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [busyAction, setBusyAction] = useState<'extend' | 'promote' | 'demote' | 'dfa' | null>(null);

  const activeTab = normalizePlayerProfileTab(searchParams.get('tab'));
  const ActiveTabComponent = useMemo(() => TAB_COMPONENTS[activeTab], [activeTab]);

  const fetchProfile = useCallback(async () => {
    if (!isInitialized || !workerReady || !playerId) {
      return;
    }

    setLoading(true);
    try {
      const data = await worker.getPlayerProfileView(playerId);
      setView((data as PlayerProfileView | null) ?? null);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, playerId, worker, workerReady]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile, day, season]);

  const updateTab = useCallback((nextValue: string) => {
    const nextTab = normalizePlayerProfileTab(nextValue);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'stats') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const player = view?.player ?? null;
  const isUserTeamPlayer = Boolean(player && !player.historical && player.teamId === userTeamId);
  const canPromote = Boolean(isUserTeamPlayer && player && player.rosterStatus !== 'MLB');
  const canDemote = Boolean(isUserTeamPlayer && player?.rosterStatus === 'MLB');
  const canDfa = Boolean(isUserTeamPlayer && player);

  const handleRosterAction = useCallback(async (
    action: 'promote' | 'demote' | 'dfa',
  ) => {
    if (!player) {
      return;
    }

    setBusyAction(action);
    setActionState(null);
    try {
      const result = (action === 'promote'
        ? await worker.promotePlayer(player.id)
        : action === 'demote'
          ? await worker.demotePlayer(player.id)
          : await worker.designateForAssignment(player.id)) as RosterActionView;

      if (!result.success) {
        setActionState({
          tone: 'error',
          message: result.error ?? 'The roster move could not be completed.',
        });
        return;
      }

      setActionState({
        tone: 'success',
        message: action === 'promote'
          ? 'Player promoted and profile refreshed.'
          : action === 'demote'
            ? 'Player optioned and profile refreshed.'
            : 'Player designated for assignment and profile refreshed.',
      });
      await fetchProfile();
    } finally {
      setBusyAction(null);
    }
  }, [fetchProfile, player, worker]);

  const handleExtend = useCallback(async () => {
    if (!player) {
      return;
    }

    setBusyAction('extend');
    setActionState(null);
    try {
      const offer = await worker.getExtensionOffer(player.id, 5) as ExtensionOfferView | null;
      if (!offer) {
        setActionState({
          tone: 'error',
          message: 'No five-year extension framework is available for this player.',
        });
        return;
      }

      const result = await worker.negotiateExtension(player.id, offer) as ExtensionResponseView | null;
      if (!result) {
        setActionState({
          tone: 'error',
          message: 'The extension negotiation could not be started.',
        });
        return;
      }

      if (result.status === 'accepted') {
        setActionState({
          tone: 'success',
          message: `Extension accepted at ${moneyLabel(offer.annualSalary)} AAV for ${offer.years} years.`,
        });
      } else if (result.status === 'countered') {
        const counter = result.counterOffer ?? result.rounds.at(-1)?.playerDemand;
        setActionState({
          tone: 'info',
          message: counter
            ? `Counteroffer received: ${moneyLabel(counter.annualSalary)} AAV over ${counter.years} years.`
            : 'Counteroffer received from the player camp.',
        });
      } else {
        setActionState({
          tone: 'error',
          message: 'The player rejected the initial five-year extension offer.',
        });
      }

      await fetchProfile();
    } finally {
      setBusyAction(null);
    }
  }, [fetchProfile, player, worker]);

  if (!loading && !player) {
    return (
      <PageShell>
        <div className="space-y-6">
          <Link
            to="/players"
            className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Players
          </Link>

          <Card>
            <CardContent className="p-10 text-center">
              <div className="font-brand text-3xl tracking-wide text-dynasty-textBright">Player Not Found</div>
              <p className="mt-3 font-heading text-sm text-dynasty-muted">
                The requested player profile is unavailable in the current save.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell loading={loading && view == null} skeleton={<PlayerProfileSkeleton />}>
      {player ? (
        <div className="space-y-6">
          <Link
            to="/players"
            className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Players
          </Link>

          <Suspense fallback={<Skeleton className="h-48 rounded-2xl" />}>
            <ProfileHeader player={player} />
          </Suspense>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <Tabs value={activeTab} onValueChange={updateTab}>
                    <TabsList className="flex w-full flex-wrap gap-2 border-none">
                      {Object.entries(TAB_LABELS).map(([tab, label]) => (
                        <TabsTrigger
                          key={tab}
                          value={tab}
                          className="rounded-lg border border-dynasty-border bg-dynasty-elevated data-[state=active]:border-accent-primary data-[state=active]:bg-accent-primary/10"
                        >
                          {TAB_ICONS[tab as PlayerProfileTab]}
                          {label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value={activeTab} forceMount className="mt-5">
                      <Suspense fallback={<TabFallback title={TAB_LABELS[activeTab]} />}>
                        <ActiveTabComponent view={view!} />
                      </Suspense>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-dynasty-text">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Compare button — always visible for non-historical */}
                  {!player.historical && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <Link to={`/players/compare?a=${player.id}`}>
                        <GitCompareArrows className="h-4 w-4" />
                        Compare Player
                      </Link>
                    </Button>
                  )}

                  {isUserTeamPlayer ? (
                    <>
                      <Button asChild variant="outline" className="w-full justify-start">
                        <Link to={`/trade?playerId=${player.id}`}>
                          <ArrowLeftRight className="h-4 w-4" />
                          Trade Player
                        </Link>
                      </Button>

                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        loading={busyAction === 'extend'}
                        onClick={() => void handleExtend()}
                      >
                        <FileSignature className="h-4 w-4" />
                        Extend Contract
                      </Button>

                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        loading={busyAction === 'promote'}
                        disabled={!canPromote}
                        onClick={() => void handleRosterAction('promote')}
                      >
                        <ArrowUpCircle className="h-4 w-4" />
                        Promote to MLB
                      </Button>

                      <Button
                        variant="secondary"
                        className="w-full justify-start"
                        loading={busyAction === 'demote'}
                        disabled={!canDemote}
                        onClick={() => void handleRosterAction('demote')}
                      >
                        <ArrowDownCircle className="h-4 w-4" />
                        Option to Minors
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        loading={busyAction === 'dfa'}
                        disabled={!canDfa}
                        onClick={() => void handleRosterAction('dfa')}
                      >
                        <ClipboardX className="h-4 w-4" />
                        Designate for Assignment
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-6 font-heading text-sm text-dynasty-muted">
                      Quick actions are only available for live players on your active club.
                    </div>
                  )}

                  {actionState ? (
                    <div className={`rounded-lg border px-4 py-3 font-heading text-sm ${actionToneClasses(actionState.tone)}`}>
                      {actionState.message}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-dynasty-text">Contract Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <StatLine
                    stats={[
                      { label: 'Years', value: player.contract.years },
                      { label: 'AAV', value: moneyLabel(player.contract.annualSalary) },
                      { label: 'Total', value: moneyLabel(player.contract.totalValue) },
                    ]}
                  />
                  <StatLine
                    stats={[
                      { label: 'Bonus', value: moneyLabel(player.contract.signingBonus) },
                      { label: 'Opt-Outs', value: player.contract.optOutYears.length || '--' },
                      { label: 'NTC', value: player.contract.noTradeClause ? player.contract.noTradeClauseType : 'none' },
                    ]}
                  />
                  <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3">
                    <div className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      Roster Context
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{player.rosterStatus}</Badge>
                      {player.minorLeagueLevel ? (
                        <Badge variant="outline">{player.minorLeagueLevel}</Badge>
                      ) : null}
                      {player.isOutOfOptions ? (
                        <Badge variant="warning">Out of Options</Badge>
                      ) : (
                        <Badge variant="info">Options Used {player.optionYearsUsed}</Badge>
                      )}
                    </div>
                    <div className="mt-3 font-heading text-sm text-dynasty-muted">
                      Service time: {Math.floor(player.serviceTimeDays / 172)} years · {player.serviceTimeDays % 172} days
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
