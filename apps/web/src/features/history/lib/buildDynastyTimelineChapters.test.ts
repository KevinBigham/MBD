import { describe, expect, it } from 'vitest';
import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';
import {
  buildDynastyTimelineChapters,
  buildDynastyTimelineSeasonSummaries,
} from './buildDynastyTimelineChapters';

function makeTimelineEntry(overrides: Partial<{
  season: number;
  record: string;
  playoffResult: string;
  championship: boolean;
  keyAcquisitions: string[];
  keyDepartures: string[];
  dynastyScore: number;
}> = {}) {
  return {
    season: overrides.season ?? 1,
    record: overrides.record ?? '81-81',
    playoffResult: overrides.playoffResult ?? 'Missed playoffs',
    championship: overrides.championship ?? false,
    keyAcquisitions: overrides.keyAcquisitions ?? [],
    keyDepartures: overrides.keyDepartures ?? [],
    dynastyScore: overrides.dynastyScore ?? 100,
  };
}

function makeSeasonArchive(overrides: Partial<SeasonArchiveEntry> & { season: number; wins: number; losses: number }): SeasonArchiveEntry {
  return {
    season: overrides.season,
    standings: [{
      teamId: 'nym',
      wins: overrides.wins,
      losses: overrides.losses,
      divisionRank: overrides.wins >= 90 ? 1 : 3,
      gamesBack: overrides.wins >= 90 ? 0 : 8,
    }],
    playoffSeries: overrides.playoffSeries ?? [],
    awards: overrides.awards ?? [],
    statLeaders: overrides.statLeaders ?? {
      hr: [],
      rbi: [],
      avg: [],
      era: [],
      k: [],
      w: [],
    },
    transactions: overrides.transactions ?? [],
    draftClass: overrides.draftClass ?? [],
    financials: overrides.financials ?? [],
    userSummary: overrides.userSummary ?? {
      teamId: 'nym',
      record: `${overrides.wins}-${overrides.losses}`,
      playoffResult: overrides.wins >= 95 ? 'Division Series exit' : 'Missed playoffs',
      storylines: [],
    },
    timelineEvents: overrides.timelineEvents ?? [],
  } as SeasonArchiveEntry;
}

function makeSeasonHistory(overrides: Partial<SeasonHistoryEntry> & { season: number }): SeasonHistoryEntry {
  return {
    season: overrides.season,
    championTeamId: overrides.championTeamId ?? null,
    runnerUpTeamId: overrides.runnerUpTeamId ?? null,
    worldSeriesRecord: overrides.worldSeriesRecord ?? null,
    summary: overrides.summary ?? '',
    awards: overrides.awards ?? [],
    keyMoments: overrides.keyMoments ?? [],
    statLeaders: overrides.statLeaders ?? {
      hr: [],
      rbi: [],
      avg: [],
      era: [],
      k: [],
      w: [],
    },
    notableRetirements: overrides.notableRetirements ?? [],
    blockbusterTrades: overrides.blockbusterTrades ?? [],
    userSeason: overrides.userSeason ?? null,
  };
}

describe('buildDynastyTimelineSeasonSummaries', () => {
  it('classifies seasons deterministically and prefers story summary fallbacks in order', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({ season: 1, record: '70-92', dynastyScore: 40 }),
        makeTimelineEntry({ season: 2, record: '84-78', dynastyScore: 82, keyAcquisitions: ['Jackson Wolfe arrives'] }),
        makeTimelineEntry({ season: 3, record: '94-68', playoffResult: 'Division Series exit', dynastyScore: 140 }),
        makeTimelineEntry({ season: 4, record: '101-61', playoffResult: 'Champion', championship: true, dynastyScore: 221 }),
      ],
      seasonViews: {
        1: makeSeasonArchive({ season: 1, wins: 70, losses: 92 }),
        2: makeSeasonArchive({
          season: 2,
          wins: 84,
          losses: 78,
          userSummary: {
            teamId: 'nym',
            record: '84-78',
            playoffResult: 'Missed playoffs',
            storylines: ['The first winning season changed expectations.'],
          },
        }),
        3: makeSeasonArchive({ season: 3, wins: 94, losses: 68 }),
        4: makeSeasonArchive({ season: 4, wins: 101, losses: 61 }),
      },
      seasonHistory: [
        makeSeasonHistory({ season: 3, summary: 'October baseball returned to Queens.' }),
        makeSeasonHistory({ season: 4, summary: 'The franchise broke through and won it all.', championTeamId: 'nym' }),
      ],
    });

    expect(summaries.map((summary) => summary.state)).toEqual([
      'rebuild',
      'ascent',
      'contention',
      'peak',
    ]);
    expect(summaries[1]?.storylineHook).toBe('The first winning season changed expectations.');
    expect(summaries[2]?.storylineHook).toBe('October baseball returned to Queens.');
    expect(summaries[3]?.storylineHook).toBe('The franchise broke through and won it all.');
  });

  it('falls back to parsed record data and acquisition or departure notes when archive details are missing', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 7,
          record: '79-83',
          dynastyScore: 91,
          keyAcquisitions: ['Rafael Taveras promoted'],
        }),
      ],
      seasonViews: {},
      seasonHistory: [],
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      season: 7,
      wins: 79,
      losses: 83,
      storylineHook: 'Rafael Taveras promoted',
      state: 'rebuild',
    });
  });
});

describe('buildDynastyTimelineChapters', () => {
  it('creates narrative chapters around a championship peak and a later reset', () => {
    const chapters = buildDynastyTimelineChapters({
      franchiseTimeline: [
        makeTimelineEntry({ season: 1, record: '68-94', dynastyScore: 25 }),
        makeTimelineEntry({ season: 2, record: '79-83', dynastyScore: 58 }),
        makeTimelineEntry({ season: 3, record: '89-73', playoffResult: 'Wild Card exit', dynastyScore: 120 }),
        makeTimelineEntry({ season: 4, record: '101-61', playoffResult: 'Champion', championship: true, dynastyScore: 230 }),
        makeTimelineEntry({ season: 5, record: '77-85', dynastyScore: 135, keyDepartures: ['Ace retired', 'Cleanup bat traded'] }),
        makeTimelineEntry({ season: 6, record: '74-88', dynastyScore: 98 }),
      ],
      seasonViews: {
        1: makeSeasonArchive({ season: 1, wins: 68, losses: 94 }),
        2: makeSeasonArchive({ season: 2, wins: 79, losses: 83 }),
        3: makeSeasonArchive({ season: 3, wins: 89, losses: 73, userSummary: { teamId: 'nym', record: '89-73', playoffResult: 'Wild Card exit', storylines: ['The club finally got back into October.'] } }),
        4: makeSeasonArchive({ season: 4, wins: 101, losses: 61, userSummary: { teamId: 'nym', record: '101-61', playoffResult: 'Champion', storylines: ['Everything clicked at once.'] } }),
        5: makeSeasonArchive({ season: 5, wins: 77, losses: 85 }),
        6: makeSeasonArchive({ season: 6, wins: 74, losses: 88 }),
      },
      seasonHistory: [
        makeSeasonHistory({ season: 4, summary: 'The roster reached its peak form.', championTeamId: 'nym' }),
        makeSeasonHistory({ season: 5, summary: 'The title core fractured one winter later.' }),
      ],
    });

    expect(chapters).toHaveLength(3);
    expect(chapters.map((chapter) => chapter.title)).toEqual([
      'Window Closes',
      'Peak Years',
      'Foundation',
    ]);
    expect(chapters.map((chapter) => [chapter.startSeason, chapter.endSeason])).toEqual([
      [5, 6],
      [4, 4],
      [1, 3],
    ]);
    expect(chapters[0]?.dominantState).toBe('reset');
    expect(chapters[1]?.championshipCount).toBe(1);
    expect(chapters[2]?.playoffSeasonCount).toBe(1);
  });

  it('merges non-meaningful singleton transitions into a medium-size era', () => {
    const chapters = buildDynastyTimelineChapters({
      franchiseTimeline: [
        makeTimelineEntry({ season: 1, record: '72-90', dynastyScore: 35 }),
        makeTimelineEntry({ season: 2, record: '83-79', dynastyScore: 78 }),
        makeTimelineEntry({ season: 3, record: '88-74', dynastyScore: 112 }),
      ],
      seasonViews: {
        1: makeSeasonArchive({ season: 1, wins: 72, losses: 90 }),
        2: makeSeasonArchive({ season: 2, wins: 83, losses: 79, userSummary: { teamId: 'nym', record: '83-79', playoffResult: 'Missed playoffs', storylines: ['The rebuild started to show life.'] } }),
        3: makeSeasonArchive({ season: 3, wins: 88, losses: 74, userSummary: { teamId: 'nym', record: '88-74', playoffResult: 'Division Series exit', storylines: ['October baseball returned.'] } }),
      },
      seasonHistory: [],
    });

    expect(chapters).toHaveLength(1);
    expect(chapters[0]).toMatchObject({
      title: 'Foundation',
      startSeason: 1,
      endSeason: 3,
      dominantState: 'ascent',
    });
    expect(chapters[0]?.seasons).toHaveLength(3);
  });
});
