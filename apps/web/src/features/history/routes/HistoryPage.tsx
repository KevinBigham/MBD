import { useEffect, useState, useCallback } from 'react';
import { History, Award, Flame, Trophy } from 'lucide-react';
import type { AwardHistoryEntry, Rivalry, SeasonHistoryEntry, SeasonStatLeader } from '@mbd/contracts';
import type { AwardRaceEntry, AwardRaces } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

interface HistoryDisplayNames {
  players: Record<string, string>;
  teams: Record<string, string>;
}

interface HallOfFameEntryView {
  playerId: string;
  playerName: string;
  position: string;
  seasonsPlayed: number;
  teamIds: string[];
  inductionSeason: number;
  score: number;
  inductionType: string;
  careerStats: {
    batting: { hits: number; hr: number; rbi: number } | null;
    pitching: { wins: number; strikeouts: number; inningsPitched: number; earnedRuns: number } | null;
  };
}

interface FranchiseTimelineEntryView {
  season: number;
  record: string;
  playoffResult: string;
  championship: boolean;
  keyAcquisitions: string[];
  keyDepartures: string[];
  dynastyScore: number;
}

interface DynastyScoreSummary {
  score: number;
  grade: string;
  breakdown: {
    championships: number;
    worldSeriesAppearances: number;
    playoffAppearances: number;
    ninetyWinSeasons: number;
    divisionTitles: number;
    losingSeasons: number;
    awardWinners: number;
  };
}

interface AchievementView {
  id: string;
  category: 'dynasty' | 'development' | 'moneyball' | 'records' | 'longevity';
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
  unlockSummary: string | null;
  progress: {
    current: number;
    target: number;
    summary?: string;
  };
}

const EMPTY_DISPLAY_NAMES: HistoryDisplayNames = {
  players: {},
  teams: {},
};

function intensityTone(intensity: number): string {
  if (intensity >= 75) return 'text-accent-danger';
  if (intensity >= 55) return 'text-accent-warning';
  if (intensity >= 35) return 'text-accent-info';
  return 'text-dynasty-muted';
}

function formatAwardLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function uniqueStrings(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function collectHistoryIds(
  awardRaces: AwardRaces | null,
  awardHistory: AwardHistoryEntry[],
  seasonHistory: SeasonHistoryEntry[],
  rivalries: Rivalry[],
  hallOfFame: HallOfFameEntryView[],
): { playerIds: string[]; teamIds: string[] } {
  const playerIds = [
    ...(awardRaces?.mvp ?? []).map((entry) => entry.playerId),
    ...(awardRaces?.cyYoung ?? []).map((entry) => entry.playerId),
    ...(awardRaces?.roy ?? []).map((entry) => entry.playerId),
    ...awardHistory.map((entry) => entry.playerId),
    ...hallOfFame.map((entry) => entry.playerId),
    ...seasonHistory.flatMap((entry) => [
      ...entry.awards.map((award) => award.playerId),
      ...entry.statLeaders.hr.map((leader) => leader.playerId),
      ...entry.statLeaders.rbi.map((leader) => leader.playerId),
      ...entry.statLeaders.avg.map((leader) => leader.playerId),
      ...entry.statLeaders.era.map((leader) => leader.playerId),
      ...entry.statLeaders.k.map((leader) => leader.playerId),
      ...entry.statLeaders.w.map((leader) => leader.playerId),
      ...entry.notableRetirements.map((retirement) => retirement.playerId),
      ...entry.blockbusterTrades.flatMap((trade) => trade.playerIds),
    ]),
  ];
  const teamIds = [
    ...(awardRaces?.mvp ?? []).map((entry) => entry.teamId),
    ...(awardRaces?.cyYoung ?? []).map((entry) => entry.teamId),
    ...(awardRaces?.roy ?? []).map((entry) => entry.teamId),
    ...awardHistory.map((entry) => entry.teamId),
    ...hallOfFame.flatMap((entry) => entry.teamIds),
    ...seasonHistory.flatMap((entry) => [
      entry.championTeamId ?? '',
      entry.runnerUpTeamId ?? '',
      ...entry.awards.map((award) => award.teamId),
      ...entry.statLeaders.hr.map((leader) => leader.teamId),
      ...entry.statLeaders.rbi.map((leader) => leader.teamId),
      ...entry.statLeaders.avg.map((leader) => leader.teamId),
      ...entry.statLeaders.era.map((leader) => leader.teamId),
      ...entry.statLeaders.k.map((leader) => leader.teamId),
      ...entry.statLeaders.w.map((leader) => leader.teamId),
      ...entry.notableRetirements.map((retirement) => retirement.teamId),
      ...entry.blockbusterTrades.flatMap((trade) => trade.teamIds),
      entry.userSeason?.teamId ?? '',
    ]),
    ...rivalries.flatMap((rivalry) => [rivalry.teamA, rivalry.teamB]),
  ];

  return {
    playerIds: uniqueStrings(playerIds),
    teamIds: uniqueStrings(teamIds),
  };
}

export default function HistoryPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, userTeamId, day, season, phase } = useGameStore();
  const [awardRaces, setAwardRaces] = useState<AwardRaces | null>(null);
  const [awardHistory, setAwardHistory] = useState<AwardHistoryEntry[]>([]);
  const [seasonHistory, setSeasonHistory] = useState<SeasonHistoryEntry[]>([]);
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntryView[]>([]);
  const [franchiseTimeline, setFranchiseTimeline] = useState<FranchiseTimelineEntryView[]>([]);
  const [dynastyScore, setDynastyScore] = useState<DynastyScoreSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementView[]>([]);
  const [selectedAchievementId, setSelectedAchievementId] = useState<string | null>(null);
  const [displayNames, setDisplayNames] = useState<HistoryDisplayNames>(EMPTY_DISPLAY_NAMES);

  const fetchHistory = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const [races, awards, seasons, rivalriesData, hallOfFameData, timelineData, dynastyData, achievementData] = await Promise.all([
        worker.getAwardRaces(),
        worker.getAwardHistory(),
        worker.getSeasonHistory(),
        worker.getRivalries(userTeamId),
        worker.getHallOfFame(),
        worker.getFranchiseTimeline(),
        worker.getDynastyScore(),
        worker.getAchievements(),
      ]);
      const nextAwardRaces = races ?? null;
      const nextAwardHistory = awards ?? [];
      const nextSeasonHistory = seasons ?? [];
      const nextRivalries = rivalriesData ?? [];
      const nextHallOfFame = hallOfFameData ?? [];
      const nextTimeline = timelineData ?? [];
      const { playerIds, teamIds } = collectHistoryIds(
        nextAwardRaces as AwardRaces | null,
        nextAwardHistory as AwardHistoryEntry[],
        nextSeasonHistory as SeasonHistoryEntry[],
        nextRivalries as Rivalry[],
        nextHallOfFame as HallOfFameEntryView[],
      );
      const resolvedNames = playerIds.length > 0 || teamIds.length > 0
        ? await worker.resolveHistoryDisplayNames(playerIds, teamIds)
        : EMPTY_DISPLAY_NAMES;

      setAwardRaces(nextAwardRaces as AwardRaces | null);
      setAwardHistory(nextAwardHistory as AwardHistoryEntry[]);
      setSeasonHistory(nextSeasonHistory as SeasonHistoryEntry[]);
      setRivalries(nextRivalries as Rivalry[]);
      setHallOfFame(nextHallOfFame as HallOfFameEntryView[]);
      setFranchiseTimeline(nextTimeline as FranchiseTimelineEntryView[]);
      setDynastyScore((dynastyData ?? null) as DynastyScoreSummary | null);
      setAchievements((achievementData ?? []) as AchievementView[]);
      setSelectedAchievementId((current) => current ?? (((achievementData ?? []) as AchievementView[])[0]?.id ?? null));
      setDisplayNames((resolvedNames ?? EMPTY_DISPLAY_NAMES) as HistoryDisplayNames);
    } catch (err) {
      console.error('Failed to fetch history data:', err);
    }
  }, [isInitialized, workerReady, worker, userTeamId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, day, season, phase]);

  const playerName = (playerId: string) => displayNames.players[playerId] ?? playerId;
  const teamName = (teamId: string | null) => {
    if (!teamId) return 'Unknown team';
    return displayNames.teams[teamId] ?? teamId.toUpperCase();
  };
  const selectedAchievement = achievements.find((achievement) => achievement.id === selectedAchievementId) ?? achievements[0] ?? null;
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Franchise History
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Award races, season recaps, and the grudges your franchise is building.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Dynasty Score</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-[0.45fr_0.55fr]">
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="font-brand text-5xl text-accent-primary">{dynastyScore?.grade ?? 'F'}</div>
              <div className="mt-2 font-data text-sm text-dynasty-muted">{dynastyScore?.score ?? 0} total points</div>
            </div>
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="font-heading text-xs text-dynasty-muted">Titles: {dynastyScore?.breakdown.championships ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Pennants: {dynastyScore?.breakdown.worldSeriesAppearances ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Playoff trips: {dynastyScore?.breakdown.playoffAppearances ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Division crowns: {dynastyScore?.breakdown.divisionTitles ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">90-win years: {dynastyScore?.breakdown.ninetyWinSeasons ?? 0}</div>
                <div className="font-heading text-xs text-dynasty-muted">Award winners: {dynastyScore?.breakdown.awardWinners ?? 0}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent-primary" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Current Award Watch</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <AwardRaceCard title="MVP" entries={awardRaces?.mvp ?? []} playerName={playerName} teamName={teamName} />
            <AwardRaceCard title="Cy Young" entries={awardRaces?.cyYoung ?? []} playerName={playerName} teamName={teamName} />
            <AwardRaceCard title="Rookie of the Year" entries={awardRaces?.roy ?? []} playerName={playerName} teamName={teamName} />
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent-warning" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Rivalry Watch</h2>
          </div>
          <div className="space-y-3">
            {rivalries.length > 0 ? rivalries.map((rivalry) => (
              <div key={rivalry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    {teamName(rivalry.teamA)} vs {teamName(rivalry.teamB)}
                  </div>
                  <div className={`font-data text-sm ${intensityTone(rivalry.intensity)}`}>
                    {rivalry.intensity}
                  </div>
                </div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  {rivalry.summary}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rivalry.reasons.map((reason) => (
                    <span key={reason} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                Rivalries will appear once the standings tighten or postseason history starts to repeat.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent-success" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Hall of Fame</h2>
          </div>
          <div className="space-y-3">
            {hallOfFame.length > 0 ? hallOfFame.map((entry) => (
              <div key={`${entry.playerId}-${entry.inductionSeason}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">{entry.playerName}</div>
                  <div className="font-data text-xs text-dynasty-muted">Season {entry.inductionSeason}</div>
                </div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  {entry.position} · {entry.seasonsPlayed} seasons · {entry.score} score
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-muted">
                  {entry.teamIds.map((teamId) => teamName(teamId)).join(', ')}
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-muted">
                  {entry.careerStats.batting
                    ? `${entry.careerStats.batting.hits} hits · ${entry.careerStats.batting.hr} HR · ${entry.careerStats.batting.rbi} RBI`
                    : `${entry.careerStats.pitching?.wins ?? 0} wins · ${entry.careerStats.pitching?.strikeouts ?? 0} strikeouts`}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                Retired legends will appear here once the Hall of Fame begins to fill.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-accent-warning" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Trophy Room</h2>
            <div className="ml-auto font-data text-[11px] text-dynasty-muted">
              {unlockedAchievements}/{achievements.length}
            </div>
          </div>
          {selectedAchievement && (
            <div className="mb-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">{selectedAchievement.name}</div>
                  <div className="mt-1 font-heading text-xs uppercase text-dynasty-muted">{selectedAchievement.category}</div>
                </div>
                <div className={`font-data text-xs ${selectedAchievement.unlocked ? 'text-accent-warning' : 'text-dynasty-muted'}`}>
                  {selectedAchievement.unlocked ? (selectedAchievement.unlockedAt ?? 'Unlocked') : 'Locked'}
                </div>
              </div>
              <div className="mt-2 font-heading text-sm text-dynasty-text">{selectedAchievement.description}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-dynasty-surface">
                <div
                  className={`h-full rounded-full ${selectedAchievement.unlocked ? 'bg-accent-warning' : 'bg-accent-primary'}`}
                  style={{ width: `${Math.max(6, Math.min(100, (selectedAchievement.progress.current / Math.max(1, selectedAchievement.progress.target)) * 100))}%` }}
                />
              </div>
              <div className="mt-2 font-data text-xs text-dynasty-muted">
                {selectedAchievement.progress.current} / {selectedAchievement.progress.target}
                {selectedAchievement.progress.summary ? ` ${selectedAchievement.progress.summary}` : ''}
              </div>
              {selectedAchievement.unlockSummary && (
                <div className="mt-2 font-heading text-xs text-dynasty-muted">
                  {selectedAchievement.unlockSummary}
                </div>
              )}
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {achievements.map((achievement) => (
              <button
                key={achievement.id}
                className={`rounded border px-3 py-3 text-left transition-colors ${
                  achievement.unlocked
                    ? 'border-accent-warning/40 bg-accent-warning/10'
                    : 'border-dynasty-border bg-dynasty-elevated'
                } ${selectedAchievement?.id === achievement.id ? 'ring-1 ring-accent-primary' : ''}`}
                onClick={() => setSelectedAchievementId(achievement.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">{achievement.name}</div>
                  <div className="font-data text-[10px] uppercase text-dynasty-muted">{achievement.category}</div>
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-muted">{achievement.description}</div>
                <div className="mt-3 font-data text-xs text-dynasty-muted">
                  {achievement.progress.current} / {achievement.progress.target}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-accent-info" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Award Ledger</h2>
          </div>
          <div className="space-y-3">
            {awardHistory.length > 0 ? awardHistory.map((entry) => (
              <div key={`${entry.season}-${entry.award}-${entry.playerId}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-text">
                    Season {entry.season} {entry.league} {formatAwardLabel(entry.award)}
                  </div>
                  <div className="font-data text-xs text-dynasty-muted">
                    {teamName(entry.teamId)}
                  </div>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-text">
                  {playerName(entry.playerId)}
                </div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">
                  {entry.summary}
                </div>
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
                No awards recorded yet. Complete a season to start building the ledger.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-accent-success" />
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Season Timeline</h2>
          </div>
          <div className="space-y-4">
            {seasonHistory.length > 0 ? seasonHistory.map((entry) => (
              <div key={entry.season} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-base text-dynasty-text">
                    Season {entry.season} Recap
                  </div>
                  <div className="font-data text-xs text-dynasty-muted">
                    {entry.championTeamId && entry.runnerUpTeamId && entry.worldSeriesRecord
                      ? `${teamName(entry.championTeamId)} def. ${teamName(entry.runnerUpTeamId)} (${entry.worldSeriesRecord})`
                      : entry.championTeamId
                        ? `${teamName(entry.championTeamId)} won it all`
                        : 'Champion pending'}
                  </div>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-text">
                  {entry.summary}
                </div>
                {entry.userSeason && (
                  <div className="mt-3 rounded border border-dynasty-border/70 bg-dynasty-surface/50 p-3">
                    <div className="font-heading text-xs uppercase text-dynasty-muted">User Club</div>
                    <div className="mt-1 font-heading text-sm text-dynasty-text">
                      {teamName(entry.userSeason.teamId)} finished {entry.userSeason.record}
                    </div>
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {entry.userSeason.playoffResult}
                    </div>
                    {entry.userSeason.storylines.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.userSeason.storylines.map((storyline) => (
                          <div key={storyline} className="font-heading text-xs text-dynasty-muted">
                            {storyline}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {entry.awards.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.awards.map((award) => (
                      <span key={`${entry.season}-${award.league}-${award.award}-${award.playerId}`} className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase text-dynasty-muted">
                        {award.league} {formatAwardLabel(award.award)}: {playerName(award.playerId)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <LeaderList title="HR Leaders" leaders={entry.statLeaders.hr} playerName={playerName} teamName={teamName} />
                  <LeaderList title="RBI Leaders" leaders={entry.statLeaders.rbi} playerName={playerName} teamName={teamName} />
                  <LeaderList title="AVG Leaders" leaders={entry.statLeaders.avg} playerName={playerName} teamName={teamName} />
                  <LeaderList title="ERA Leaders" leaders={entry.statLeaders.era} playerName={playerName} teamName={teamName} />
                  <LeaderList title="Strikeout Leaders" leaders={entry.statLeaders.k} playerName={playerName} teamName={teamName} />
                  <LeaderList title="Win Leaders" leaders={entry.statLeaders.w} playerName={playerName} teamName={teamName} />
                </div>
                {entry.notableRetirements.length > 0 && (
                  <div className="mt-4">
                    <div className="font-heading text-xs uppercase text-dynasty-muted">Notable Retirements</div>
                    <div className="mt-2 space-y-2">
                      {entry.notableRetirements.map((retirement) => (
                        <div key={retirement.playerId} className="rounded border border-dynasty-border/70 px-3 py-2">
                          <div className="font-heading text-sm text-dynasty-text">
                            {playerName(retirement.playerId)} • {teamName(retirement.teamId)}
                          </div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">
                            {retirement.summary}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {entry.blockbusterTrades.length > 0 && (
                  <div className="mt-4">
                    <div className="font-heading text-xs uppercase text-dynasty-muted">Blockbuster Trades</div>
                    <div className="mt-2 space-y-2">
                      {entry.blockbusterTrades.map((trade) => (
                        <div key={trade.headline} className="rounded border border-dynasty-border/70 px-3 py-2">
                          <div className="font-heading text-sm text-dynasty-text">{trade.headline}</div>
                          <div className="mt-1 font-heading text-xs text-dynasty-muted">{trade.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {entry.keyMoments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {entry.keyMoments.map((moment) => (
                      <div key={moment} className="font-heading text-xs text-dynasty-muted">
                        {moment}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )) : (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-8">
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                  <History className="h-12 w-12 text-dynasty-muted" />
                  <h2 className="font-heading text-lg font-semibold text-dynasty-text">
                    No completed seasons yet
                  </h2>
                  <p className="max-w-md font-heading text-sm text-dynasty-muted">
                    The timeline will fill in once a season reaches October and the story closes with a champion.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-accent-success" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">Franchise Timeline</h2>
        </div>
        <div className="space-y-3">
          {franchiseTimeline.length > 0 ? franchiseTimeline.map((entry) => (
            <div key={entry.season} className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="font-heading text-sm text-dynasty-text">Season {entry.season}</div>
                <div className="font-data text-xs text-dynasty-muted">Dynasty score {entry.dynastyScore}</div>
              </div>
              <div className="mt-1 font-heading text-sm text-dynasty-muted">
                {entry.record} · {entry.playoffResult} {entry.championship ? '· Title' : ''}
              </div>
              {entry.keyAcquisitions.length > 0 && (
                <div className="mt-3 font-heading text-xs text-dynasty-muted">
                  Added: {entry.keyAcquisitions.join(' | ')}
                </div>
              )}
              {entry.keyDepartures.length > 0 && (
                <div className="mt-2 font-heading text-xs text-dynasty-muted">
                  Lost: {entry.keyDepartures.join(' | ')}
                </div>
              )}
            </div>
          )) : (
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
              The franchise timeline starts once the first season closes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AwardRaceCard({
  title,
  entries,
  playerName,
  teamName,
}: {
  title: string;
  entries: AwardRaceEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-3">
        {entries.length > 0 ? entries.slice(0, 3).map((entry, index) => (
          <div key={`${title}-${entry.playerId}`} className="border-b border-dynasty-border/50 pb-3 last:border-b-0 last:pb-0">
            <div className="flex items-center justify-between gap-3">
              <div className="font-data text-xs text-dynasty-muted">#{index + 1}</div>
              <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{playerName(entry.playerId)}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.summary}</div>
          </div>
        )) : (
          <div className="font-heading text-sm text-dynasty-muted">
            No race data yet.
          </div>
        )}
      </div>
    </div>
  );
}

function LeaderList({
  title,
  leaders,
  playerName,
  teamName,
}: {
  title: string;
  leaders: SeasonStatLeader[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  if (leaders.length === 0) return null;

  return (
    <div className="rounded border border-dynasty-border/70 p-3">
      <div className="font-heading text-xs uppercase text-dynasty-muted">{title}</div>
      <div className="mt-2 space-y-2">
        {leaders.map((leader) => (
          <div key={`${title}-${leader.playerId}`} className="flex items-start justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-text">{playerName(leader.playerId)}</div>
              <div className="font-heading text-[11px] text-dynasty-muted">{teamName(leader.teamId)}</div>
            </div>
            <div className="font-data text-sm text-dynasty-textBright">{leader.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
