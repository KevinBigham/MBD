import type { DynastyCard, DynastyCardType, GameSnapshot } from '@mbd/contracts';
import { getTeamById } from '../league/teams.js';
import { generateOffseasonHeadline } from '../narrative/offseasonRecap.js';

function fallbackGMCareer(snapshot: GameSnapshot): NonNullable<GameSnapshot['narrative']['gmCareer']> {
  return snapshot.narrative.gmCareer ?? {
    careerHistory: [],
    currentTeamId: snapshot.franchise.teamId,
    reputation: 50,
    overallRecord: { wins: 0, losses: 0 },
    championships: 0,
    hiredSeason: snapshot.season,
    firedSeasons: [],
    careerAchievements: [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

function timestamp(snapshot: GameSnapshot): string {
  return `S${snapshot.season}D${snapshot.day}`;
}

function teamLabel(teamId: string | null | undefined): string {
  if (!teamId) {
    return 'Unknown Club';
  }
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function currentRecord(snapshot: GameSnapshot): string {
  const serialized = snapshot.seasonState.standings as Array<{ teamId: string; wins: number; losses: number }> | Array<[string, { wins: number; losses: number }]>;
  for (const entry of serialized) {
    if (Array.isArray(entry)) {
      if (entry[0] === snapshot.userTeamId) {
        return `${entry[1].wins}-${entry[1].losses}`;
      }
      continue;
    }

    if (entry.teamId === snapshot.userTeamId) {
      return `${entry.wins}-${entry.losses}`;
    }
  }
  return '0-0';
}

function seasonRecapHeadline(snapshot: GameSnapshot, season: number): string | null {
  const seasonHistory = snapshot.narrative.seasonHistory.find((entry) => entry.season === season);
  if (!seasonHistory) {
    return null;
  }

  const seasonArchive = snapshot.narrative.seasonArchive.find((entry) => entry.season === season) ?? null;
  return generateOffseasonHeadline(seasonHistory, seasonArchive);
}

function buildTextSummary(
  card: Omit<DynastyCard, 'textSummary'>,
  summaryLead?: string | null,
): string {
  return [
    summaryLead,
    `${card.title} — ${card.subtitle}`,
    ...card.stats.map((entry) => `${entry.label}: ${entry.value}`),
    ...card.highlights.map((highlight) => `- ${highlight}`),
  ]
    .filter((entry): entry is string => Boolean(entry))
    .join('\n');
}

function buildCard(
  snapshot: GameSnapshot,
  type: DynastyCardType,
  title: string,
  subtitle: string,
  stats: DynastyCard['stats'],
  highlights: string[],
  teamId: string | null = snapshot.userTeamId,
  season: number | null = snapshot.season,
  summaryLead?: string | null,
): DynastyCard {
  const base = {
    id: `${type}-${snapshot.franchise.teamId}-${snapshot.season}`,
    type,
    title,
    subtitle,
    stats,
    highlights,
    generatedAt: timestamp(snapshot),
    teamId,
    season,
  } satisfies Omit<DynastyCard, 'textSummary'>;

  return {
    ...base,
    textSummary: buildTextSummary(base, summaryLead),
  };
}

export function generateSeasonRecapCard(snapshot: GameSnapshot, season: number = snapshot.season): DynastyCard {
  return buildCard(
    snapshot,
    'season_recap',
    `${teamLabel(snapshot.userTeamId)} Season ${season}`,
    `Regular-season recap for ${snapshot.franchise.gmName}`,
    [
      { label: 'Record', value: currentRecord(snapshot) },
      { label: 'Play Mode', value: snapshot.franchise.playMode ?? 'standard' },
      { label: 'Fan Mood', value: snapshot.narrative.fanSentiment.summary },
    ],
    [
      snapshot.narrative.fanSentiment.summary,
      `Dynasty pulse: ${snapshot.narrative.franchiseTimeline.at(-1)?.dynastyScore ?? 0}`,
    ],
    snapshot.userTeamId,
    season,
    seasonRecapHeadline(snapshot, season),
  );
}

export function generateChampionshipCard(snapshot: GameSnapshot, season: number = snapshot.season): DynastyCard {
  return buildCard(
    snapshot,
    'championship_run',
    `${teamLabel(snapshot.userTeamId)} Championship Run`,
    `Season ${season}`,
    [
      { label: 'Record', value: currentRecord(snapshot) },
      { label: 'GM', value: snapshot.franchise.gmName },
      { label: 'Team', value: teamLabel(snapshot.userTeamId) },
    ],
    [
      'Finished the climb on top.',
      `Legacy pulse: ${snapshot.narrative.fanSentiment.summary}`,
    ],
  );
}

export function generateDynastyCard(snapshot: GameSnapshot, cardType: DynastyCardType): DynastyCard {
  if (cardType === 'season_recap') {
    return generateSeasonRecapCard(snapshot, snapshot.season);
  }
  if (cardType === 'championship_run') {
    return generateChampionshipCard(snapshot, snapshot.season);
  }
  if (cardType === 'career_overview') {
    const gmCareer = fallbackGMCareer(snapshot);
    const teamsManaged = new Set(gmCareer.careerHistory.map((entry) => entry.teamId)).size;
    return buildCard(
      snapshot,
      'career_overview',
      `${snapshot.franchise.gmName} Career Overview`,
      `${teamsManaged} team${teamsManaged === 1 ? '' : 's'} managed`,
      [
        { label: 'Teams Managed', value: String(teamsManaged) },
        { label: 'Record', value: `${gmCareer.overallRecord.wins}-${gmCareer.overallRecord.losses}` },
        { label: 'Championships', value: String(gmCareer.championships) },
        { label: 'Reputation', value: String(gmCareer.reputation) },
      ],
      gmCareer.careerHistory.map((entry) =>
        `${teamLabel(entry.teamId)}: ${entry.record.wins}-${entry.record.losses}${entry.championships > 0 ? `, ${entry.championships} title${entry.championships === 1 ? '' : 's'}` : ''}.`,
      ),
      gmCareer.currentTeamId,
      snapshot.season,
    );
  }

  return buildCard(
    snapshot,
    cardType,
    `${teamLabel(snapshot.userTeamId)} Legacy Snapshot`,
    `Season ${snapshot.season}`,
    [
      { label: 'GM', value: snapshot.franchise.gmName },
      { label: 'Record', value: currentRecord(snapshot) },
    ],
    [snapshot.narrative.fanSentiment.summary],
  );
}
