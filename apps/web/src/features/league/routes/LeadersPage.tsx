import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { LeaderboardStatKey } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface PlayerDTO {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  teamId: string;
  displayRating: number;
  stats: {
    avg: string;
    hr: number;
    rbi: number;
    hits: number;
    strikeouts: number;
    era: string;
  } | null;
  advanced: {
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
  } | null;
}

const FEATURED_CATS: { key: LeaderboardStatKey; label: string }[] = [
  { key: 'war', label: 'WAR' },
  { key: 'woba', label: 'wOBA' },
  { key: 'fip', label: 'FIP' },
];

const BATTING_CATS: { key: LeaderboardStatKey; label: string }[] = [
  { key: 'wrc_plus', label: 'wRC+' },
  { key: 'ops_plus', label: 'OPS+' },
  { key: 'iso', label: 'ISO' },
  { key: 'avg', label: 'AVG' },
  { key: 'hr', label: 'HR' },
  { key: 'rbi', label: 'RBI' },
  { key: 'hits', label: 'Hits' },
];

const PITCHING_CATS: { key: LeaderboardStatKey; label: string }[] = [
  { key: 'xfip', label: 'xFIP' },
  { key: 'whip', label: 'WHIP' },
  { key: 'k_per_9', label: 'K/9' },
  { key: 'bb_per_9', label: 'BB/9' },
  { key: 'k_bb', label: 'K/BB' },
  { key: 'era', label: 'ERA' },
  { key: 'k', label: 'K' },
];

const PITCHING_STATS = new Set<LeaderboardStatKey>([
  'fip',
  'xfip',
  'whip',
  'k_per_9',
  'bb_per_9',
  'k_bb',
  'era',
  'k',
]);

function formatDecimal(value: number | null | undefined, digits: number): string {
  if (value == null) {
    return '-';
  }
  return value.toFixed(digits);
}

function isPitchingCategory(stat: LeaderboardStatKey): boolean {
  return PITCHING_STATS.has(stat);
}

function activeLabel(stat: LeaderboardStatKey): string {
  return [...FEATURED_CATS, ...BATTING_CATS, ...PITCHING_CATS].find((entry) => entry.key === stat)?.label ?? stat;
}

function getStatValue(player: PlayerDTO, stat: LeaderboardStatKey): string {
  switch (stat) {
    case 'war':
      return formatDecimal(player.advanced?.war, 1);
    case 'woba':
      return formatDecimal(player.advanced?.woba, 3);
    case 'wrc_plus':
      return formatDecimal(player.advanced?.wrcPlus, 0);
    case 'ops_plus':
      return formatDecimal(player.advanced?.opsPlus, 0);
    case 'iso':
      return formatDecimal(player.advanced?.iso, 3);
    case 'fip':
      return formatDecimal(player.advanced?.fip, 2);
    case 'xfip':
      return formatDecimal(player.advanced?.xfip, 2);
    case 'whip':
      return formatDecimal(player.advanced?.whip, 2);
    case 'k_per_9':
      return formatDecimal(player.advanced?.kPer9, 1);
    case 'bb_per_9':
      return formatDecimal(player.advanced?.bbPer9, 1);
    case 'k_bb':
      return formatDecimal(player.advanced?.kBb, 2);
    case 'avg':
      return player.stats?.avg ?? '-';
    case 'hr':
      return String(player.stats?.hr ?? '-');
    case 'rbi':
      return String(player.stats?.rbi ?? '-');
    case 'hits':
      return String(player.stats?.hits ?? '-');
    case 'k':
      return String(player.stats?.strikeouts ?? '-');
    case 'era':
      return player.stats?.era ?? '-';
    default:
      return '-';
  }
}

function HitterSupportColumns({ player }: { player: PlayerDTO }) {
  return (
    <>
      <td className="px-2 py-2 text-right font-data text-dynasty-text">{formatDecimal(player.advanced?.war, 1)}</td>
      <td className="px-2 py-2 text-right font-data text-dynasty-text">{formatDecimal(player.advanced?.woba, 3)}</td>
      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{formatDecimal(player.advanced?.wrcPlus, 0)}</td>
    </>
  );
}

function PitcherSupportColumns({ player }: { player: PlayerDTO }) {
  return (
    <>
      <td className="px-2 py-2 text-right font-data text-dynasty-text">{formatDecimal(player.advanced?.war, 1)}</td>
      <td className="px-2 py-2 text-right font-data text-dynasty-text">{formatDecimal(player.advanced?.fip, 2)}</td>
      <td className="px-2 py-2 text-right font-data text-dynasty-muted">{formatDecimal(player.advanced?.xfip, 2)}</td>
    </>
  );
}

export default function LeadersPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { day, season, phase, isInitialized } = useGameStore();
  const [activeCat, setActiveCat] = useState<LeaderboardStatKey>('war');
  const [leaders, setLeaders] = useState<PlayerDTO[]>([]);

  const fetchLeaders = useCallback(async () => {
    if (!isInitialized || !worker.isReady) return;
    const data = await worker.getLeagueLeaders(activeCat, 20);
    setLeaders(data as PlayerDTO[]);
  }, [isInitialized, workerReady, activeCat]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchLeaders();
  }, [fetchLeaders, day, season, phase]);

  const pitchingView = isPitchingCategory(activeCat);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">League Leaders</h1>
          <p className="font-data text-sm text-dynasty-muted">Season {season} sabermetric board</p>
        </div>
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-3 text-sm">
          <div className="font-heading uppercase tracking-[0.18em] text-dynasty-muted">Spotlight</div>
          <div className="mt-1 font-heading text-dynasty-text">
            WAR, wOBA, and FIP now update directly from season results.
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex flex-wrap gap-2">
          <span className="mr-2 self-center font-heading text-xs uppercase text-dynasty-muted">Featured</span>
          {FEATURED_CATS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`rounded-md px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                activeCat === cat.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mr-2 self-center font-heading text-xs uppercase text-dynasty-muted">Batting</span>
          {BATTING_CATS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`rounded-md px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                activeCat === cat.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="mr-2 self-center font-heading text-xs uppercase text-dynasty-muted">Pitching</span>
          {PITCHING_CATS.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCat(cat.key)}
              className={`rounded-md px-3 py-1.5 font-heading text-xs font-semibold transition-colors ${
                activeCat === cat.key
                  ? 'bg-accent-primary text-white'
                  : 'bg-dynasty-elevated text-dynasty-muted hover:text-dynasty-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
        <div className="border-b border-dynasty-border px-4 py-3">
          <h2 className="font-heading text-sm font-semibold text-dynasty-text">
            {activeLabel(activeCat)} leaders
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dynasty-border text-xs text-dynasty-muted">
                <th className="w-12 px-4 py-2 text-left font-heading">#</th>
                <th className="px-2 py-2 text-left font-heading">Player</th>
                <th className="px-2 py-2 text-left font-heading">POS</th>
                <th className="px-2 py-2 text-left font-heading">TEAM</th>
                <th className="px-2 py-2 text-right font-data">OVR</th>
                <th className="px-2 py-2 text-right font-data">WAR</th>
                <th className="px-2 py-2 text-right font-data">{pitchingView ? 'FIP' : 'wOBA'}</th>
                <th className="px-2 py-2 text-right font-data">{pitchingView ? 'xFIP' : 'wRC+'}</th>
                <th className="px-4 py-2 text-right font-data font-bold">{activeLabel(activeCat)}</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((player, idx) => (
                <tr key={player.id} className="border-b border-dynasty-border/50 text-sm hover:bg-dynasty-elevated">
                  <td className="px-4 py-2 font-data text-dynasty-muted">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <Link
                      to={`/players/${player.id}`}
                      className="font-heading font-medium text-dynasty-text hover:text-accent-primary"
                    >
                      {player.firstName} {player.lastName}
                    </Link>
                  </td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{player.position}</td>
                  <td className="px-2 py-2 font-data text-dynasty-muted">{player.teamId.toUpperCase()}</td>
                  <td className="px-2 py-2 text-right font-data text-dynasty-text">{player.displayRating}</td>
                  {pitchingView ? <PitcherSupportColumns player={player} /> : <HitterSupportColumns player={player} />}
                  <td className="px-4 py-2 text-right font-data text-lg font-bold text-accent-primary">
                    {getStatValue(player, activeCat)}
                  </td>
                </tr>
              ))}
              {leaders.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center font-heading text-sm text-dynasty-muted">
                    Sim games to populate the leaderboard board.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
