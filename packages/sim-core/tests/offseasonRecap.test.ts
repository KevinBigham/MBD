import { describe, expect, it } from 'vitest';
import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';
import { generateOffseasonHeadline, generateSeasonRecapNarrative } from '../src/index.js';

function buildSeasonHistory(overrides: Partial<SeasonHistoryEntry> = {}): SeasonHistoryEntry {
  return {
    season: 4,
    championTeamId: 'nym',
    runnerUpTeamId: 'lax',
    worldSeriesRecord: '4-2',
    summary: 'The Yankees finished the job and closed the season on top.',
    awards: [],
    keyMoments: [
      'Deadline blockbuster reshaped the bullpen',
      'Aaron Judge carried the lineup through October',
    ],
    statLeaders: {
      battingAverage: [],
      homeRuns: [],
      era: [],
      strikeouts: [],
      war: [],
    },
    notableRetirements: [],
    blockbusterTrades: [],
    userSeason: {
      teamId: 'nym',
      record: '97-65',
      playoffResult: 'Won the World Series',
      storylines: [
        'Deadline blockbuster reshaped the bullpen',
        'Judge delivered in the postseason',
      ],
    },
    ...overrides,
  };
}

function buildSeasonArchive(overrides: Partial<SeasonArchiveEntry> = {}): SeasonArchiveEntry {
  return {
    season: 4,
    standings: [],
    playoffSeries: [],
    awards: [],
    statLeaders: {
      battingAverage: [],
      homeRuns: [],
      era: [],
      strikeouts: [],
      war: [],
    },
    transactions: [
      {
        type: 'trade',
        headline: 'Deadline blockbuster reshaped the bullpen',
        teams: ['New York Tycoons', 'Seattle Drizzle'],
        players: ['Jordan Reliever'],
        impactScore: 88,
      },
    ],
    draftClass: [],
    financials: [],
    userSummary: {
      teamId: 'nym',
      record: '97-65',
      playoffResult: 'Won the World Series',
      storylines: ['Judge delivered in the postseason'],
    },
    timelineEvents: [
      'Judge delivered in the postseason',
    ],
    ...overrides,
  };
}

describe('offseason recap narrative', () => {
  it('builds a deterministic championship headline and recap from history plus archive context', () => {
    const seasonHistory = buildSeasonHistory();
    const seasonArchive = buildSeasonArchive();

    const firstHeadline = generateOffseasonHeadline(seasonHistory, seasonArchive);
    const secondHeadline = generateOffseasonHeadline(seasonHistory, seasonArchive);
    const firstRecap = generateSeasonRecapNarrative(seasonHistory, seasonArchive);
    const secondRecap = generateSeasonRecapNarrative(seasonHistory, seasonArchive);

    expect(secondHeadline).toBe(firstHeadline);
    expect(secondRecap).toBe(firstRecap);
    expect(firstHeadline).toContain('World Series');
    expect(firstRecap).toContain('97-65');
    expect(firstRecap).toContain('Won the World Series');
    expect(firstRecap).toContain('Deadline blockbuster');
  });

  it('falls back to a reset framing when the season ended without a title', () => {
    const seasonHistory = buildSeasonHistory({
      championTeamId: 'hou',
      runnerUpTeamId: 'atl',
      summary: 'The Yankees faded late and missed the bracket.',
      userSeason: {
        teamId: 'nym',
        record: '81-81',
        playoffResult: 'Missed the playoffs',
        storylines: ['A shallow rotation was exposed by August'],
      },
    });
    const seasonArchive = buildSeasonArchive({
      userSummary: {
        teamId: 'nym',
        record: '81-81',
        playoffResult: 'Missed the playoffs',
        storylines: ['A shallow rotation was exposed by August'],
      },
      timelineEvents: ['A shallow rotation was exposed by August'],
    });

    const headline = generateOffseasonHeadline(seasonHistory, seasonArchive);
    const recap = generateSeasonRecapNarrative(seasonHistory, seasonArchive);

    expect(headline).not.toContain('World Series');
    expect(recap).toContain('81-81');
    expect(recap).toContain('Missed the playoffs');
    expect(recap).toContain('rotation');
  });
});
