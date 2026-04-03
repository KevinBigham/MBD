import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { estimateProjectedWarRange, toDisplayRating } from '@mbd/sim-core';
import { Badge, Card, CardContent, CardHeader, CardTitle, GradeBar, StatLine } from '@mbd/ui';
import { ArrowLeft, BrainCircuit, FileSignature, TrendingUp } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  position: string;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  rosterStatus: string;
  teamId: string;
  ceiling: number | null;
  floor: number | null;
  developmentProgram: string | null;
  developmentTrajectory: string;
  personalityTraits?: string[];
  contract: {
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
  };
  extensionHistory: Array<{
    season: number;
    teamId: string;
    years: number;
    annualSalary: number;
    totalValue: number;
    outcome: string;
  }>;
  stats: {
    pa: number;
    ab: number;
    hits: number;
    hr: number;
    rbi: number;
    bb: number;
    k: number;
    avg: string;
    ip: number;
    earnedRuns: number;
    strikeouts: number;
    walks: number;
    hitsAllowed: number;
    era: string;
  } | null;
  historical?: boolean;
  historicalSummary?: {
    playerId: string;
    fullName: string;
    position: string;
    lastKnownTeamId: string;
    active: boolean;
    retiredSeason: number | null;
    seasonsPlayed: number;
    personalityTraits: string[];
  } | null;
}

interface AdvancedStatsView {
  war: number;
  woba: number | null;
  wrcPlus: number | null;
  opsPlus: number | null;
  iso: number | null;
  fip: number | null;
  xfip: number | null;
  whip: number | null;
  kPer9: number | null;
  bbPer9: number | null;
  kBb: number | null;
}

interface PersonalityProfile {
  playerId: string;
  archetype: string;
  morale: {
    score: number;
    trend: string;
    summary: string;
    lastUpdated: string;
  };
  personality: {
    workEthic: number;
    mentalToughness: number;
    leadership: number;
    competitiveness: number;
  };
  summary: string;
}

interface DevelopmentReportsView {
  playerId: string;
  history: Array<{
    season: number;
    month: number;
    trajectory: string;
    summary: string;
    overallRating: number;
  }>;
  recommendations: Array<{
    playerId: string;
    teamId: string;
    fromPosition: string;
    toPosition: string;
    confidence: number;
    reason: string;
  }>;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
}

function moraleTone(score: number): string {
  if (score >= 70) return 'text-accent-success';
  if (score >= 55) return 'text-accent-info';
  if (score >= 40) return 'text-accent-warning';
  return 'text-accent-danger';
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function labelize(value: string): string {
  return value.replaceAll('_', ' ');
}

function displayBand(value: number | null): number {
  if (value == null) return 0;
  return value > 100 ? toDisplayRating(value) : value;
}

function badgeVariantForTrajectory(trajectory: string): 'success' | 'info' | 'warning' | 'outline' {
  switch (trajectory) {
    case 'ahead_of_curve':
    case 'improving':
      return 'success';
    case 'stalling':
    case 'on_track':
      return 'info';
    case 'declining':
      return 'warning';
    default:
      return 'outline';
  }
}

function formatMonth(month: number): string {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return labels[Math.max(0, Math.min(labels.length - 1, month - 1))] ?? `M${month}`;
}

function formatDecimal(value: number | null | undefined, digits: number): string {
  if (value == null) return '--';
  return value.toFixed(digits);
}

function formatInnings(outs: number): string {
  const innings = Math.floor(outs / 3);
  const remainder = outs % 3;
  return `${innings}.${remainder}`;
}

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CL']);

export default function PlayerProfilePage() {
  const { playerId } = useParams<{ playerId: string }>();
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, day, season } = useGameStore();
  const [player, setPlayer] = useState<PlayerDTO | null>(null);
  const [profile, setProfile] = useState<PersonalityProfile | null>(null);
  const [developmentReports, setDevelopmentReports] = useState<DevelopmentReportsView | null>(null);
  const [advancedStats, setAdvancedStats] = useState<AdvancedStatsView | null>(null);

  const fetchPlayer = useCallback(async () => {
    if (!isInitialized || !workerReady || !playerId) return;

    const [playerData, profileData, reportData, advancedData] = await Promise.all([
      worker.getPlayer(playerId),
      worker.getPersonalityProfile(playerId),
      worker.getDevelopmentReports(playerId),
      worker.getAdvancedStats(playerId),
    ]);

    setPlayer(playerData as PlayerDTO | null);
    setProfile(profileData as PersonalityProfile | null);
    setDevelopmentReports(reportData as DevelopmentReportsView | null);
    setAdvancedStats(advancedData as AdvancedStatsView | null);
  }, [isInitialized, playerId, worker, workerReady]);

  useEffect(() => {
    void fetchPlayer();
  }, [fetchPlayer, day, season]);

  if (!player) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="font-heading text-dynasty-muted">Loading player...</div>
      </div>
    );
  }

  const isPitcher = PITCHER_POSITIONS.has(player.position);
  const trajectoryVariant = badgeVariantForTrajectory(player.developmentTrajectory);
  const currentContract = player.contract;
  const projectedWar = estimateProjectedWarRange({
    overall: player.displayRating,
    floor: displayBand(player.floor),
    ceiling: displayBand(player.ceiling),
    isPitcher,
  });

  return (
    <div className="space-y-6">
      <Link
        to="/players"
        className="inline-flex items-center gap-1.5 font-heading text-sm text-dynasty-muted hover:text-accent-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Players
      </Link>

      <Card>
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-dynasty-text">
              {player.firstName} {player.lastName}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Badge variant="outline">{player.position}</Badge>
              <span className="font-data text-sm text-dynasty-muted">Age {player.age}</span>
              <span className="font-data text-sm text-dynasty-muted">{player.teamId.toUpperCase()}</span>
              <Badge variant="info">{player.rosterStatus}</Badge>
              <Badge variant={trajectoryVariant}>{player.developmentTrajectory}</Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="font-data text-4xl font-bold text-dynasty-text">
              {player.displayRating}
            </div>
            <span className={`mt-1 inline-block rounded px-3 py-0.5 font-data text-lg font-bold ${gradeColor(player.letterGrade)}`}>
              {player.letterGrade}
            </span>
          </div>
        </CardContent>
      </Card>

      {player.historical && player.historicalSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Historical Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-heading text-sm text-dynasty-text">
                {player.historicalSummary.fullName} is preserved as a retired franchise figure.
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">
                {player.historicalSummary.retiredSeason != null
                  ? `Retired after Season ${player.historicalSummary.retiredSeason}`
                  : 'Retirement season unavailable'}
                {' · '}
                {player.historicalSummary.seasonsPlayed} seasons
              </div>
              <div className="mt-2 font-heading text-xs text-dynasty-muted">
                Last club: {player.historicalSummary.lastKnownTeamId.toUpperCase()}
              </div>
            </div>
            {player.historicalSummary.personalityTraits.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {player.historicalSummary.personalityTraits.map((trait) => (
                  <Badge key={trait} variant="outline">{trait}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
              <TrendingUp className="h-4 w-4 text-accent-success" />
              Development Trajectory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Current Program
                </div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">
                  {player.developmentProgram ? labelize(player.developmentProgram) : 'No assignment'}
                </div>
              </div>
              <Badge variant={trajectoryVariant}>{player.developmentTrajectory}</Badge>
            </div>
            <div className="space-y-3">
              <GradeBar label="Floor" grade={displayBand(player.floor)} />
              <GradeBar label="Current" grade={player.displayRating} />
              <GradeBar label="Ceiling" grade={displayBand(player.ceiling)} />
            </div>
            <StatLine
              stats={[
                { label: 'Floor', value: displayBand(player.floor) || '--' },
                { label: 'Current', value: player.displayRating },
                { label: 'Ceiling', value: displayBand(player.ceiling) || '--' },
              ]}
            />
            <StatLine
              stats={[
                { label: 'WAR Floor', value: projectedWar.floorWar?.toFixed(1) ?? '--' },
                { label: 'WAR Now', value: projectedWar.currentWar.toFixed(1) },
                { label: 'WAR Ceiling', value: projectedWar.ceilingWar?.toFixed(1) ?? '--' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
              <FileSignature className="h-4 w-4 text-accent-warning" />
              Contract Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatLine
              stats={[
                { label: 'Years', value: currentContract.years },
                { label: 'AAV', value: moneyLabel(currentContract.annualSalary) },
                { label: 'Total', value: moneyLabel(currentContract.totalValue) },
              ]}
            />
            <StatLine
              stats={[
                { label: 'Bonus', value: moneyLabel(currentContract.signingBonus) },
                { label: 'Opt-Outs', value: currentContract.optOutYears.length || '--' },
                { label: 'NTC', value: currentContract.noTradeClause ? currentContract.noTradeClauseType : 'none' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {advancedStats && (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Advanced Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {isPitcher ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatBlock label="WAR" value={formatDecimal(advancedStats.war, 1)} highlight />
                <StatBlock label="FIP" value={formatDecimal(advancedStats.fip, 2)} />
                <StatBlock label="xFIP" value={formatDecimal(advancedStats.xfip, 2)} />
                <StatBlock label="WHIP" value={formatDecimal(advancedStats.whip, 2)} />
                <StatBlock label="K/9" value={formatDecimal(advancedStats.kPer9, 1)} />
                <StatBlock label="K/BB" value={formatDecimal(advancedStats.kBb, 2)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatBlock label="WAR" value={formatDecimal(advancedStats.war, 1)} highlight />
                <StatBlock label="wOBA" value={formatDecimal(advancedStats.woba, 3)} />
                <StatBlock label="wRC+" value={formatDecimal(advancedStats.wrcPlus, 0)} />
                <StatBlock label="OPS+" value={formatDecimal(advancedStats.opsPlus, 0)} />
                <StatBlock label="ISO" value={formatDecimal(advancedStats.iso, 3)} />
                <StatBlock label="Proj WAR" value={projectedWar.ceilingWar?.toFixed(1) ?? '--'} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-dynasty-text">
                <BrainCircuit className="h-4 w-4 text-accent-info" />
                Personality Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="info">{labelize(profile.archetype)}</Badge>
                <div className={`font-data text-lg font-bold ${moraleTone(profile.morale.score)}`}>
                  Morale {profile.morale.score}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <PersonalityStat label="Work Ethic" value={profile.personality.workEthic} />
                <PersonalityStat label="Toughness" value={profile.personality.mentalToughness} />
                <PersonalityStat label="Leadership" value={profile.personality.leadership} />
                <PersonalityStat label="Compete" value={profile.personality.competitiveness} />
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-xs uppercase text-dynasty-muted">Read</div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">
                  {profile.summary}
                </div>
                <div className="mt-3 font-data text-xs text-dynasty-muted">
                  {profile.morale.trend.toUpperCase()} | Updated {profile.morale.lastUpdated}
                </div>
              </div>
              {player.personalityTraits?.length ? (
                <div className="flex flex-wrap gap-2">
                  {player.personalityTraits.map((trait) => (
                    <Badge key={trait} variant="outline">{trait}</Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Checkpoint History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentReports?.history.length ? developmentReports.history.map((entry) => (
              <div key={`${entry.season}-${entry.month}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    {formatMonth(entry.month)} S{entry.season}
                  </div>
                  <Badge variant={badgeVariantForTrajectory(entry.trajectory)}>{entry.trajectory}</Badge>
                </div>
                <div className="mt-2 text-sm text-dynasty-muted">{entry.summary}</div>
                <div className="mt-2 font-data text-xs text-dynasty-muted">
                  Overall {displayBand(entry.overallRating)}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-sm text-dynasty-muted">
                No monthly checkpoints recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Conversion Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {developmentReports?.recommendations.length ? developmentReports.recommendations.map((entry) => (
              <div key={`${entry.playerId}-${entry.fromPosition}-${entry.toPosition}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    {entry.fromPosition} to {entry.toPosition}
                  </div>
                  <Badge variant={entry.confidence >= 0.65 ? 'success' : 'info'}>
                    {Math.round(entry.confidence * 100)}%
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-dynasty-muted">{entry.reason}</div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-sm text-dynasty-muted">
                No position-change recommendations on file.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Extension History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {player.extensionHistory.length ? player.extensionHistory.map((entry) => (
              <div key={`${entry.season}-${entry.teamId}-${entry.years}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    Season {entry.season}
                  </div>
                  <Badge variant={entry.outcome === 'accepted' ? 'success' : entry.outcome === 'rejected' ? 'warning' : 'outline'}>
                    {entry.outcome}
                  </Badge>
                </div>
                <StatLine
                  className="mt-2"
                  stats={[
                    { label: 'Team', value: entry.teamId.toUpperCase() },
                    { label: 'Years', value: entry.years },
                    { label: 'AAV', value: moneyLabel(entry.annualSalary) },
                    { label: 'Total', value: moneyLabel(entry.totalValue) },
                  ]}
                />
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-4 py-6 text-sm text-dynasty-muted">
                No extension negotiations recorded.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {player.stats ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-dynasty-text">Season Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {isPitcher ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                <StatBlock label="ERA" value={player.stats.era} />
                <StatBlock label="K" value={String(player.stats.strikeouts)} />
                <StatBlock label="BB" value={String(player.stats.walks)} />
                <StatBlock label="H" value={String(player.stats.hitsAllowed)} />
                <StatBlock label="ER" value={String(player.stats.earnedRuns)} />
                <StatBlock label="IP" value={formatInnings(player.stats.ip)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
                <StatBlock label="AVG" value={player.stats.avg} />
                <StatBlock label="HR" value={String(player.stats.hr)} highlight />
                <StatBlock label="RBI" value={String(player.stats.rbi)} />
                <StatBlock label="H" value={String(player.stats.hits)} />
                <StatBlock label="BB" value={String(player.stats.bb)} />
                <StatBlock label="K" value={String(player.stats.k)} />
                <StatBlock label="PA" value={String(player.stats.pa)} />
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-heading text-sm text-dynasty-muted">
              No stats yet. Sim games to see this player&apos;s performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PersonalityStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3 text-center">
      <div className="font-heading text-[10px] uppercase text-dynasty-muted">{label}</div>
      <div className="mt-1 font-data text-2xl font-bold text-dynasty-text">{value}</div>
    </div>
  );
}

function StatBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{label}</div>
      <div className={`mt-1 font-data text-2xl font-bold ${highlight ? 'text-accent-primary' : 'text-dynasty-text'}`}>
        {value}
      </div>
    </div>
  );
}
