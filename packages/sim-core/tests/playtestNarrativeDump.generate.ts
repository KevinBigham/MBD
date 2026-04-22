// @vitest-environment node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { TEAMS } from '../src/index.js';

const USER_TEAM_ID = 'nym';
const USER_TEAM = TEAMS.find((team) => team.id === USER_TEAM_ID);
const DEFAULT_SEED = 2_601;
const DEFAULT_YEARS = 10;
const DEFAULT_OUT = 'playtest-output/sample-dynasty.md';
const PRESS_ROOM_LIMIT = 6;
const SIGNATURE_MOMENT_LIMIT = 6;
const TEAM_MOMENT_LIMIT = 5;
const MILESTONE_LIMIT = 5;
const RIVALRY_LIMIT = 3;

const TEAM_BY_ID = new Map(TEAMS.map((team) => [team.id, team] as const));
const DIVISION_ORDER = Array.from(new Set(TEAMS.map((team) => team.division)));
const PLAYOFF_ROUND_ORDER = new Map([
  ['WILD_CARD', 0],
  ['DIVISION_SERIES', 1],
  ['CHAMPIONSHIP_SERIES', 2],
  ['WORLD_SERIES', 3],
]);
const MILESTONE_MOMENT_TYPES = new Set([
  'milestone_500hr',
  'milestone_3000h',
  'milestone_300w',
]);

type WorkerHarness = Awaited<ReturnType<typeof loadWorkerHarness>>;

interface SeasonNarrative {
  awards: string[];
  dynastyPulse: string[];
  milestones: string[];
  postseason: string[];
  pressRoom: string[];
  rivalries: string[];
  season: number;
  signatureMoments: string[];
  standings: string[];
  teamMoments: string[];
}

interface PlaytestReport {
  championshipSeasons: number[];
  dynastyScoreLine: string;
  hallOfFameCount: number;
  seasons: SeasonNarrative[];
  seasonsWithPlayoffs: number;
  seed: number;
  years: number;
}

function readPositiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer. Received "${raw}".`);
  }

  return parsed;
}

async function loadWorkerHarness() {
  const [{ actionApi }, { queryApi }, helpers] = await Promise.all([
    import('../../../apps/web/src/workers/sim.worker.actions.ts'),
    import('../../../apps/web/src/workers/sim.worker.queries.ts'),
    import('../../../apps/web/src/workers/sim.worker.helpers.ts'),
  ]);

  return {
    actionApi,
    queryApi,
    requireState: helpers.requireState,
    setState: helpers.setState,
  };
}

function resetHarness(harness: WorkerHarness) {
  vi.restoreAllMocks();
  harness.setState(null);
}

function advanceEntireOffseason(harness: WorkerHarness) {
  harness.actionApi.proceedToOffseason();
  let guard = 0;

  while (!harness.requireState().offseasonState?.completed) {
    const progressed = harness.actionApi.skipOffseasonPhase() ?? harness.actionApi.advanceOffseason();
    expect(progressed, 'playtest offseason progression must keep moving').not.toBeNull();
    guard += 1;
    if (guard > 20) {
      throw new Error('Playtest offseason progression exceeded the expected number of phases.');
    }
  }
}

function divisionLabel(division: string): string {
  const [league, ...parts] = division.split('_');
  return `${league} ${parts.map((part) => `${part[0]}${part.slice(1).toLowerCase()}`).join(' ')}`;
}

function teamAbbreviation(teamId: string | null | undefined): string {
  if (!teamId) {
    return 'TBD';
  }
  return TEAM_BY_ID.get(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function teamLabel(teamId: string | null | undefined): string {
  if (!teamId) {
    return 'TBD';
  }
  const team = TEAM_BY_ID.get(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function roundLabel(round: string): string {
  return round
    .toLowerCase()
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function seasonFromTimestamp(timestamp: string, currentSeason: number): number | null {
  if (timestamp === 'NOW') {
    return currentSeason;
  }

  const match = /^S(\d+)D\d+$/.exec(timestamp);
  return match ? Number(match[1]) : null;
}

function formatGamesBack(gamesBack: number): string {
  if (gamesBack === 0) {
    return 'GB 0';
  }

  return `GB ${Number.isInteger(gamesBack) ? gamesBack : gamesBack.toFixed(1)}`;
}

function formatAwardLabel(award: string): string {
  return award
    .toLowerCase()
    .split('_')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function fallbackLines(lines: string[], fallback: string): string[] {
  return lines.length > 0 ? lines : [fallback];
}

function captureSeasonNarrative(
  harness: WorkerHarness,
  season: number,
  milestoneAlerts: Array<{
    currentValue: number;
    milestoneLabel: string;
    playerId: string;
    playerName: string;
    remaining: number;
    threshold: number;
  }>,
): SeasonNarrative {
  const state = harness.requireState();
  const standingsView = harness.queryApi.getStandings();
  const seasonHistory = state.seasonHistory.find((entry) => entry.season === season) ?? null;
  const seasonArchive = state.seasonArchive.find((entry) => entry.season === season) ?? null;
  const seasonRecap = harness.queryApi.getSeasonRecap(season);
  const offseasonHeadline = harness.queryApi.getOffseasonHeadline(season);
  const dynastyScore = harness.queryApi.getDynastyScore();
  const franchiseTimeline = harness.queryApi.getFranchiseTimeline().find((entry) => entry.season === season) ?? null;
  const hallOfFameClass = harness.queryApi.getHallOfFame().filter((entry) => entry.inductionSeason === season + 1);

  expect(standingsView, `season ${season} playtest capture must expose standings`).not.toBeNull();
  expect(seasonHistory, `season ${season} playtest capture must record season history`).not.toBeNull();
  expect(seasonArchive, `season ${season} playtest capture must record season archive`).not.toBeNull();

  const standings = DIVISION_ORDER
    .map((division) => {
      const entries = standingsView?.divisions[division] ?? [];
      if (entries.length === 0) {
        return null;
      }

      const formattedEntries = entries.map((entry, index) =>
        `${index + 1}. ${entry.abbreviation} ${entry.wins}-${entry.losses} (${entry.pct}, ${formatGamesBack(entry.gamesBack)})`,
      );
      return `${divisionLabel(division)}: ${formattedEntries.join('; ')}`;
    })
    .filter((entry): entry is string => entry != null);

  const postseason = fallbackLines([
    `Champion: ${teamLabel(seasonHistory?.championTeamId)}${seasonHistory?.worldSeriesRecord ? ` (${seasonHistory.worldSeriesRecord})` : ''}`,
    ...[...(seasonArchive?.playoffSeries ?? [])]
      .sort((left, right) =>
        (PLAYOFF_ROUND_ORDER.get(left.round) ?? Number.MAX_SAFE_INTEGER)
        - (PLAYOFF_ROUND_ORDER.get(right.round) ?? Number.MAX_SAFE_INTEGER),
      )
      .map((series) => {
        if (!series.winnerTeamId || !series.loserTeamId) {
          return `${roundLabel(series.round)}: incomplete`;
        }

        const result = series.result ? ` (${series.result})` : '';
        return `${roundLabel(series.round)}: ${teamAbbreviation(series.winnerTeamId)} over ${teamAbbreviation(series.loserTeamId)}${result}`;
      }),
  ], 'No postseason data recorded.');

  const awards = fallbackLines(
    [...(seasonHistory?.awards ?? [])]
      .sort((left, right) =>
        left.league.localeCompare(right.league)
        || left.award.localeCompare(right.award)
        || left.playerId.localeCompare(right.playerId),
      )
      .map((award) => `${award.league} ${formatAwardLabel(award.award)}: ${award.summary}`),
    'No awards recorded.',
  );

  const recentLeagueMoments = harness.queryApi.getRecentLeagueMoments(1)
    .filter(({ moment }) => moment.season === season);

  const signatureMoments = fallbackLines(
    recentLeagueMoments
      .slice(0, SIGNATURE_MOMENT_LIMIT)
      .map(({ playerName, teamId, moment }) => {
        const playoffTag = moment.isPlayoff ? ` [${moment.round ?? 'PLAYOFFS'}]` : '';
        return `${playerName} (${teamAbbreviation(teamId)}): ${moment.description}${playoffTag}`;
      }),
    'No signature moments surfaced.',
  );

  const pressRoom = fallbackLines(
    harness.queryApi.getPressRoomFeed(200)
      .filter((entry) => seasonFromTimestamp(entry.timestamp, season) === season)
      .slice(0, PRESS_ROOM_LIMIT)
      .map((entry) => `[${entry.source}/${entry.tag}] ${entry.headline}`),
    'No press room items surfaced.',
  );

  const milestoneMomentLines = recentLeagueMoments
    .filter(({ moment }) => MILESTONE_MOMENT_TYPES.has(moment.type))
    .slice(0, MILESTONE_LIMIT)
    .map(({ playerName, teamId, moment }) => `${playerName} (${teamAbbreviation(teamId)}): ${moment.description}`);
  const milestoneAlertLines = milestoneAlerts
    .slice(0, MILESTONE_LIMIT)
    .map((alert) =>
      `${alert.playerName}: ${alert.remaining} away from ${alert.milestoneLabel} (${alert.currentValue}/${alert.threshold})`,
    );
  const milestones = fallbackLines(
    [...milestoneMomentLines, ...milestoneAlertLines]
      .filter((line, index, collection) => collection.indexOf(line) === index)
      .slice(0, MILESTONE_LIMIT),
    'No milestone beats surfaced.',
  );

  const teamMoments = fallbackLines(
    harness.queryApi.getTeamMoments(USER_TEAM_ID)
      .filter((moment) => moment.season === season)
      .slice(0, TEAM_MOMENT_LIMIT)
      .map((moment) => `${moment.description}${moment.isPlayoff ? ` [${moment.round ?? 'PLAYOFFS'}]` : ''}`),
    'No team moments surfaced.',
  );

  const rivalries = fallbackLines(
    harness.queryApi.getRivalries(USER_TEAM_ID)
      .slice(0, RIVALRY_LIMIT)
      .map((rivalry) => {
        const opponentTeamId = rivalry.teamA === USER_TEAM_ID ? rivalry.teamB : rivalry.teamA;
        const seasonEvent = rivalry.eventHistory?.find((entry) => entry.season === season) ?? null;
        const seasonRecord = rivalry.teamA === USER_TEAM_ID
          ? `${rivalry.currentSeasonWinsA ?? 0}-${rivalry.currentSeasonWinsB ?? 0}`
          : `${rivalry.currentSeasonWinsB ?? 0}-${rivalry.currentSeasonWinsA ?? 0}`;
        const eventSuffix = seasonEvent ? ` Latest beat: ${seasonEvent.summary}` : '';
        return `vs ${teamLabel(opponentTeamId)} (${rivalry.intensity}): ${rivalry.summary} Current season: ${seasonRecord}.${eventSuffix}`;
      }),
    'No active rivalry beats surfaced.',
  );

  const dynastyPulse = fallbackLines([
    seasonRecap ? `Recap: ${seasonRecap.recap}` : seasonHistory?.summary ?? 'No recap available.',
    seasonRecap && seasonRecap.storylines.length > 0
      ? `Storylines: ${seasonRecap.storylines.join(' | ')}`
      : seasonHistory?.keyMoments?.length
        ? `Storylines: ${seasonHistory.keyMoments.slice(0, 4).join(' | ')}`
        : 'Storylines: none recorded.',
    offseasonHeadline ? `Offseason headline: ${offseasonHeadline.headline}` : 'Offseason headline: not available.',
    dynastyScore ? `Dynasty score: ${dynastyScore.score} (${dynastyScore.grade})` : 'Dynasty score: unavailable.',
    franchiseTimeline
      ? `Franchise line: ${franchiseTimeline.record}, ${franchiseTimeline.playoffResult}, division title ${franchiseTimeline.divisionTitle ? 'yes' : 'no'}, awards ${franchiseTimeline.awardWinnerCount}.`
      : 'Franchise line: unavailable.',
    franchiseTimeline && franchiseTimeline.keyAcquisitions.length > 0
      ? `Key acquisitions: ${franchiseTimeline.keyAcquisitions.join(' | ')}`
      : 'Key acquisitions: none logged.',
    franchiseTimeline && franchiseTimeline.keyDepartures.length > 0
      ? `Key departures: ${franchiseTimeline.keyDepartures.join(' | ')}`
      : 'Key departures: none logged.',
    hallOfFameClass.length > 0
      ? `Hall of Fame ahead of Season ${season + 1}: ${hallOfFameClass.map((entry) => `${entry.playerName} (${entry.inductionType})`).join(' | ')}`
      : `Hall of Fame ahead of Season ${season + 1}: none.`,
  ], 'No dynasty pulse available.');

  return {
    season,
    standings,
    postseason,
    awards,
    signatureMoments,
    pressRoom,
    milestones,
    teamMoments,
    rivalries,
    dynastyPulse,
  };
}

async function simulateDynastyPlaytest(seed: number, years: number): Promise<PlaytestReport> {
  vi.resetModules();
  const harness = await loadWorkerHarness();

  try {
    resetHarness(harness);

    harness.actionApi.newGame({
      seed,
      userTeamId: USER_TEAM_ID,
      gmName: 'General Manager',
      difficulty: 'standard',
      saveSlot: 1,
    });

    const seasons: SeasonNarrative[] = [];

    for (let yearIndex = 0; yearIndex < years; yearIndex += 1) {
      const season = harness.requireState().season;

      const regularSeason = harness.actionApi.simToPlayoffs();
      expect(regularSeason.phase, `season ${season} playtest must advance into playoffs`).toBe('playoffs');

      const playoffs = harness.actionApi.simRemainingPlayoffs();
      expect(playoffs.phase, `season ${season} playtest must remain in playoffs after postseason sim`).toBe('playoffs');

      const milestoneAlerts = harness.queryApi.getMilestoneAlerts();
      advanceEntireOffseason(harness);
      seasons.push(captureSeasonNarrative(harness, season, milestoneAlerts));

      if (yearIndex < years - 1) {
        const nextSeason = harness.actionApi.startNextSeason();
        expect(nextSeason.season, `season ${season} playtest rollover must increment`).toBe(season + 1);
        expect(nextSeason.phase, `season ${season} playtest rollover must land in preseason`).toBe('preseason');
      }
    }

    const finalHallOfFame = harness.queryApi.getHallOfFame();
    const finalTimeline = harness.queryApi.getFranchiseTimeline();
    const finalDynastyScore = harness.queryApi.getDynastyScore();
    const championshipSeasons = finalTimeline.filter((entry) => entry.championship).map((entry) => entry.season);
    const seasonsWithPlayoffs = finalTimeline.filter((entry) => entry.playoffAppearance).length;

    return {
      seed,
      years,
      seasons,
      championshipSeasons,
      seasonsWithPlayoffs,
      hallOfFameCount: finalHallOfFame.length,
      dynastyScoreLine: finalDynastyScore
        ? `${finalDynastyScore.score} (${finalDynastyScore.grade})`
        : 'unavailable',
    };
  } finally {
    resetHarness(harness);
  }
}

function renderDynastyNarrative(report: PlaytestReport): string {
  const lines: string[] = [
    '# Sample Dynasty Narrative Dump',
    '',
    `- Team: ${USER_TEAM ? `${USER_TEAM.city} ${USER_TEAM.name} (${USER_TEAM.abbreviation})` : USER_TEAM_ID.toUpperCase()}`,
    `- Seed: ${report.seed}`,
    `- Years Simulated: ${report.years}`,
    '- Output Generated By: `MBD_PLAYTEST_DUMP=1 pnpm --filter @mbd/sim-core playtest`',
    '',
    '## Franchise Snapshot',
    `- Dynasty score after ${report.years} seasons: ${report.dynastyScoreLine}`,
    `- Playoff appearances: ${report.seasonsWithPlayoffs}/${report.years}`,
    `- Championships: ${report.championshipSeasons.length > 0 ? report.championshipSeasons.join(', ') : 'none'}`,
    `- Hall of Fame inductees tracked: ${report.hallOfFameCount}`,
    '',
  ];

  for (const season of report.seasons) {
    lines.push(`## Season ${season.season}`);
    lines.push('');
    lines.push('### Standings');
    season.standings.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Postseason');
    season.postseason.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Awards');
    season.awards.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Signature Moments');
    season.signatureMoments.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Press Room');
    season.pressRoom.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Milestones');
    season.milestones.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Team Moments');
    season.teamMoments.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Rivalries');
    season.rivalries.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
    lines.push('### Dynasty Pulse');
    season.dynastyPulse.forEach((line) => lines.push(`- ${line}`));
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

describe.runIf(process.env.MBD_PLAYTEST_DUMP === '1')('playtest narrative dump', () => {
  it('generates a deterministic dynasty markdown transcript', async () => {
    const seed = readPositiveIntegerEnv('PLAYTEST_SEED', DEFAULT_SEED);
    const years = readPositiveIntegerEnv('PLAYTEST_YEARS', DEFAULT_YEARS);
    const outPath = resolve(process.cwd(), process.env.PLAYTEST_OUT ?? DEFAULT_OUT);

    const report = await simulateDynastyPlaytest(seed, years);
    const first = renderDynastyNarrative(report);
    const second = renderDynastyNarrative(report);

    expect(second).toBe(first);

    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, first, 'utf8');
  }, 480_000);
});
