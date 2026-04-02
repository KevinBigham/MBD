import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  serviceTimeDays: number;
  optionYearsUsed: number;
  isOutOfOptions: boolean;
  minorLeagueLevel: string | null;
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
    era: string;
  } | null;
}

interface TeamChemistry {
  score: number;
  tier: string;
  trend: string;
  summary: string;
  reasons: string[];
}

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

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'bg-accent-success/20 text-accent-success';
    case 'B': return 'bg-accent-info/20 text-accent-info';
    case 'C': return 'bg-accent-warning/20 text-accent-warning';
    case 'D': return 'bg-accent-danger/20 text-accent-danger';
    default: return 'bg-dynasty-border text-dynasty-muted';
  }
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

function minorLevelLabel(level: string): string {
  switch (level) {
    case 'A_PLUS':
      return 'A+';
    case 'ROOKIE':
      return 'Rookie';
    default:
      return level;
  }
}

function formatServiceTime(serviceTimeDays: number): string {
  const years = Math.floor(serviceTimeDays / 172);
  const days = serviceTimeDays % 172;
  return `${years}y ${days}d`;
}

const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CL']);

const MINOR_LEVELS = [
  { key: 'AAA', label: 'AAA' },
  { key: 'AA', label: 'AA' },
  { key: 'A_PLUS', label: 'A+' },
  { key: 'A', label: 'A' },
  { key: 'ROOKIE', label: 'Rookie' },
  { key: 'INTERNATIONAL', label: 'International' },
] as const;

export default function RosterPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, userTeamId, isInitialized } = useGameStore();
  const [mlbRoster, setMlbRoster] = useState<PlayerDTO[]>([]);
  const [minors, setMinors] = useState<Record<string, PlayerDTO[]>>({});
  const [chemistry, setChemistry] = useState<TeamChemistry | null>(null);
  const [promotionCandidates, setPromotionCandidates] = useState<PromotionCandidateView[]>([]);
  const [compliance, setCompliance] = useState<RosterComplianceView | null>(null);
  const [affiliateOverview, setAffiliateOverview] = useState<AffiliateOverviewView | null>(null);
  const [activeTab, setActiveTab] = useState<'mlb' | 'minors'>('mlb');
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const fetchRoster = useCallback(async () => {
    if (!isInitialized || !workerReady) return;

    const [
      rosterData,
      chemistryData,
      promotionData,
      complianceData,
      affiliateData,
    ] = await Promise.all([
      worker.getFullRoster(userTeamId),
      worker.getTeamChemistry(userTeamId),
      worker.getPromotionCandidates(userTeamId),
      worker.getRosterComplianceIssues(userTeamId),
      worker.getAffiliateOverview(userTeamId),
    ]);

    if (rosterData) {
      setMlbRoster(rosterData.mlb as PlayerDTO[]);
      setMinors(rosterData.minors as Record<string, PlayerDTO[]>);
    }

    setChemistry((chemistryData ?? null) as TeamChemistry | null);
    setPromotionCandidates((promotionData ?? []) as PromotionCandidateView[]);
    setCompliance((complianceData ?? null) as RosterComplianceView | null);
    setAffiliateOverview((affiliateData ?? null) as AffiliateOverviewView | null);
  }, [isInitialized, userTeamId, worker, workerReady]);

  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster, day, season, phase]);

  const runRosterAction = useCallback(async (actionId: string, operation: () => Promise<unknown>) => {
    setBusyAction(actionId);
    try {
      await operation();
      await fetchRoster();
    } finally {
      setBusyAction(null);
    }
  }, [fetchRoster]);

  const hitters = mlbRoster.filter((player) => !PITCHER_POSITIONS.has(player.position));
  const pitchers = mlbRoster.filter((player) => PITCHER_POSITIONS.has(player.position));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-dynasty-text">Roster</h1>
        <p className="font-data text-sm text-dynasty-muted">
          {mlbRoster.length} players on active roster
        </p>
      </div>

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
                  {chemistry.tier.toUpperCase()} | {chemistry.trend.toUpperCase()}
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('mlb')}
          className={`rounded-md px-4 py-2 font-heading text-sm font-semibold transition-colors ${
            activeTab === 'mlb'
              ? 'bg-accent-primary text-white'
              : 'bg-dynasty-surface text-dynasty-muted hover:text-dynasty-text'
          }`}
        >
          MLB Control Room
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('minors')}
          className={`rounded-md px-4 py-2 font-heading text-sm font-semibold transition-colors ${
            activeTab === 'minors'
              ? 'bg-accent-primary text-white'
              : 'bg-dynasty-surface text-dynasty-muted hover:text-dynasty-text'
          }`}
        >
          Minor Leagues
        </button>
      </div>

      {activeTab === 'mlb' && (
        <div className="space-y-6">
          {compliance && (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div>
                  <div className="font-heading text-xs uppercase text-dynasty-muted">Roster compliance</div>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                      <div className="font-heading text-xs uppercase text-dynasty-muted">Active</div>
                      <div className="font-data text-lg text-dynasty-text">
                        {compliance.activeRosterCount}/{compliance.activeRosterLimit}
                      </div>
                    </div>
                    <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
                      <div className="font-heading text-xs uppercase text-dynasty-muted">40-Man</div>
                      <div className="font-data text-lg text-dynasty-text">
                        {compliance.fortyManCount}/40
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
                  <div className="font-heading text-xs uppercase text-dynasty-muted">40-man pressure relief</div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {compliance.dfaRecommendations.map((candidate) => (
                      <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                            <div className="font-data text-xs text-dynasty-muted">
                              {candidate.position} | Age {candidate.age} | ${candidate.salary.toFixed(1)}M
                            </div>
                          </div>
                          <div className="font-data text-sm text-accent-warning">Score {candidate.score}</div>
                        </div>
                        <div className="mt-2 text-sm text-dynasty-muted">{candidate.reason}</div>
                        <button
                          type="button"
                          onClick={() => void runRosterAction(`dfa-${candidate.playerId}`, () => worker.designateForAssignment(candidate.playerId))}
                          disabled={busyAction === `dfa-${candidate.playerId}`}
                          className="mt-3 rounded border border-accent-danger/50 px-3 py-1.5 font-heading text-xs text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:opacity-50"
                        >
                          DFA {candidate.playerName}
                        </button>
                      </div>
                    ))}
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                    <th className="px-4 py-2 text-left font-heading">Player</th>
                    <th className="px-2 py-2 text-left font-heading">POS</th>
                    <th className="px-2 py-2 text-right font-data">OVR</th>
                    <th className="px-2 py-2 text-center font-heading">GRD</th>
                    <th className="px-2 py-2 text-right font-data">AGE</th>
                    <th className="px-2 py-2 text-right font-data">SVC</th>
                    <th className="px-2 py-2 text-right font-data">OPT</th>
                    <th className="px-2 py-2 text-right font-data">PA</th>
                    <th className="px-2 py-2 text-right font-data">AVG</th>
                    <th className="px-2 py-2 text-right font-data">HR</th>
                    <th className="px-2 py-2 text-right font-data">RBI</th>
                    <th className="px-4 py-2 text-right font-heading">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hitters.map((player) => (
                    <tr key={player.id} className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated">
                      <td className="px-4 py-2">
                        <Link
                          to={`/players/${player.id}`}
                          className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
                        >
                          {player.firstName} {player.lastName}
                        </Link>
                      </td>
                      <td className="px-2 py-2 font-data text-dynasty-muted">{player.position}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.displayRating}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeColor(player.letterGrade)}`}>
                          {player.letterGrade}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.age}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{formatServiceTime(player.serviceTimeDays)}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">
                        {player.optionYearsUsed}{player.isOutOfOptions ? ' / OOO' : ''}
                      </td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.stats?.pa ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.avg ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.hr ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.rbi ?? '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void runRosterAction(`demote-${player.id}`, () => worker.demotePlayer(player.id))}
                          disabled={busyAction === `demote-${player.id}`}
                          className="rounded border border-dynasty-border px-2 py-1 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                        >
                          Demote
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
            <div className="border-b border-dynasty-border px-4 py-3">
              <h2 className="font-heading text-sm font-semibold text-dynasty-text">
                Pitchers ({pitchers.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                    <th className="px-4 py-2 text-left font-heading">Player</th>
                    <th className="px-2 py-2 text-left font-heading">POS</th>
                    <th className="px-2 py-2 text-right font-data">OVR</th>
                    <th className="px-2 py-2 text-center font-heading">GRD</th>
                    <th className="px-2 py-2 text-right font-data">AGE</th>
                    <th className="px-2 py-2 text-right font-data">SVC</th>
                    <th className="px-2 py-2 text-right font-data">OPT</th>
                    <th className="px-2 py-2 text-right font-data">ERA</th>
                    <th className="px-2 py-2 text-right font-data">K</th>
                    <th className="px-2 py-2 text-right font-data">BB</th>
                    <th className="px-4 py-2 text-right font-heading">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pitchers.map((player) => (
                    <tr key={player.id} className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated">
                      <td className="px-4 py-2">
                        <Link
                          to={`/players/${player.id}`}
                          className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
                        >
                          {player.firstName} {player.lastName}
                        </Link>
                      </td>
                      <td className="px-2 py-2 font-data text-dynasty-muted">{player.position}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.displayRating}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeColor(player.letterGrade)}`}>
                          {player.letterGrade}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.age}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{formatServiceTime(player.serviceTimeDays)}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">
                        {player.optionYearsUsed}{player.isOutOfOptions ? ' / OOO' : ''}
                      </td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.era ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.stats?.strikeouts ?? '-'}</td>
                      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.stats?.walks ?? '-'}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => void runRosterAction(`demote-${player.id}`, () => worker.demotePlayer(player.id))}
                          disabled={busyAction === `demote-${player.id}`}
                          className="rounded border border-dynasty-border px-2 py-1 font-heading text-xs text-dynasty-muted transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                        >
                          Demote
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    onClick={() => void runRosterAction(`promote-${candidate.playerId}`, () => worker.promotePlayer(candidate.playerId))}
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
                          {claim.status === 'pending' ? 'Pending claim' : claim.status.toUpperCase()} | {claim.fromTeamName}
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                        <th className="px-4 py-2 text-left font-heading">Player</th>
                        <th className="px-2 py-2 text-left font-heading">POS</th>
                        <th className="px-2 py-2 text-right font-data">OVR</th>
                        <th className="px-2 py-2 text-center font-heading">GRD</th>
                        <th className="px-2 py-2 text-right font-data">AGE</th>
                        <th className="px-2 py-2 text-right font-data">OPT</th>
                        <th className="px-4 py-2 text-right font-heading">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.slice(0, 12).map((player) => (
                        <tr key={player.id} className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated">
                          <td className="px-4 py-2">
                            <Link
                              to={`/players/${player.id}`}
                              className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
                            >
                              {player.firstName} {player.lastName}
                            </Link>
                          </td>
                          <td className="px-2 py-2 font-data text-dynasty-muted">{player.position}</td>
                          <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.displayRating}</td>
                          <td className="px-2 py-2 text-center">
                            <span className={`inline-block w-6 rounded text-center font-data text-xs font-bold ${gradeColor(player.letterGrade)}`}>
                              {player.letterGrade}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right font-data text-dynasty-muted">{player.age}</td>
                          <td className="px-2 py-2 text-right font-data text-dynasty-muted">
                            {player.optionYearsUsed}{player.isOutOfOptions ? ' / OOO' : ''}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {level.key !== 'INTERNATIONAL' ? (
                              <button
                                type="button"
                                onClick={() => void runRosterAction(`promote-${player.id}`, () => worker.promotePlayer(player.id))}
                                disabled={busyAction === `promote-${player.id}`}
                                className="rounded border border-accent-success/50 px-2 py-1 font-heading text-xs text-accent-success transition-colors hover:bg-accent-success/10 disabled:opacity-50"
                              >
                                Promote
                              </button>
                            ) : (
                              <span className="font-heading text-xs text-dynasty-muted">Intake only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
