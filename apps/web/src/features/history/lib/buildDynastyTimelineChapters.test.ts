import { describe, expect, it } from 'vitest';
import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';
import {
  buildDynastyTimelineChapters,
  buildDynastyTimelineSeasonSummaries,
  type DynastyTimelineEntryLike,
  type DynastyTimelinePlayerMomentBeat,
  type DynastyTimelineTeamMomentBeat,
} from './buildDynastyTimelineChapters';

function makeTimelineEntry(overrides: Partial<{
  season: number;
  record: string;
  playoffResult: string;
  championship: boolean;
  keyAcquisitions: string[];
  keyDepartures: string[];
  dynastyScore: number;
  playerMomentBeats: DynastyTimelinePlayerMomentBeat[];
  teamMomentBeats: DynastyTimelineTeamMomentBeat[];
}> = {}): DynastyTimelineEntryLike {
  return {
    season: overrides.season ?? 1,
    record: overrides.record ?? '81-81',
    playoffResult: overrides.playoffResult ?? 'Missed playoffs',
    championship: overrides.championship ?? false,
    keyAcquisitions: overrides.keyAcquisitions ?? [],
    keyDepartures: overrides.keyDepartures ?? [],
    dynastyScore: overrides.dynastyScore ?? 100,
    ...(overrides.playerMomentBeats ? { playerMomentBeats: overrides.playerMomentBeats } : {}),
    ...(overrides.teamMomentBeats ? { teamMomentBeats: overrides.teamMomentBeats } : {}),
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
          keyDepartures: ['Veteran cleanup bat traded'],
        }),
      ],
      seasonViews: {},
      seasonHistory: [
        makeSeasonHistory({
          season: 7,
          userSeason: {
            teamId: 'nym',
            record: '79-83',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      ],
    });

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      season: 7,
      wins: 79,
      losses: 83,
      storylineHook: 'Rafael Taveras promoted',
      state: 'rebuild',
    });
    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-7-1',
        kind: 'story',
        label: 'Key Addition',
        summary: 'Rafael Taveras promoted',
        playerIds: [],
        teamIds: ['nym'],
      },
      {
        id: 'memory-7-2',
        kind: 'trade',
        label: 'Key Departure',
        summary: 'Veteran cleanup bat traded',
        playerIds: [],
        teamIds: ['nym'],
      },
    ]);
  });

  it('classifies compact roster move trade notes when archive transactions are missing', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 9,
          record: '87-75',
          dynastyScore: 132,
          keyAcquisitions: ['Deadline deal brought in Celia Reyes'],
          keyDepartures: ['Veteran starter traded for prospects'],
        }),
      ],
      seasonViews: {},
      seasonHistory: [
        makeSeasonHistory({
          season: 9,
          userSeason: {
            teamId: 'nym',
            record: '87-75',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      ],
    });

    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-9-1',
        kind: 'trade',
        label: 'Key Addition',
        summary: 'Deadline deal brought in Celia Reyes',
        playerIds: [],
        teamIds: ['nym'],
      },
      {
        id: 'memory-9-2',
        kind: 'trade',
        label: 'Key Departure',
        summary: 'Veteran starter traded for prospects',
        playerIds: [],
        teamIds: ['nym'],
      },
    ]);
  });

  it('derives deterministic memory beats from archive and season history detail', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 6,
          record: '91-71',
          playoffResult: 'Championship Series exit',
          dynastyScore: 164,
        }),
      ],
      seasonViews: {
        6: makeSeasonArchive({
          season: 6,
          wins: 91,
          losses: 71,
          playoffSeries: [{
            round: 'ALCS',
            winnerTeamId: 'bos',
            loserTeamId: 'nym',
            result: '4-2',
          }],
          awards: [{
            season: 6,
            award: 'MVP',
            league: 'AL',
            playerId: 'player-mvp',
            teamId: 'nym',
            summary: 'Mike Trout carried the offense all summer.',
          }],
          transactions: [{
            headline: 'Deadline blockbuster reshaped the race',
            summary: 'The Tycoons bought aggressively at the deadline.',
            playerIds: ['player-mvp'],
            teamIds: ['nym', 'bos'],
            impactScore: 92,
          }],
          draftClass: [{
            pickNumber: 8,
            playerId: 'pick-2',
            playerName: 'Calvin Velez',
            teamId: 'nym',
            currentStatus: 'AA',
          }],
          timelineEvents: [
            'NYM-BOS: rivalry boiled over again',
            'Breakout season changed the lineup',
          ],
          userSummary: {
            teamId: 'nym',
            record: '91-71',
            playoffResult: 'Championship Series exit',
            storylines: [],
          },
        }),
      },
      seasonHistory: [
        makeSeasonHistory({
          season: 6,
          notableRetirements: [{
            playerId: 'player-retire',
            teamId: 'nym',
            seasonsPlayed: 14,
            overallRating: 78,
            summary: 'A franchise fixture walked away after 14 seasons.',
          }],
          blockbusterTrades: [{
            headline: 'Deadline blockbuster reshaped the race',
            summary: 'The Tycoons bought aggressively at the deadline.',
            playerIds: ['player-mvp'],
            teamIds: ['nym', 'bos'],
          }],
        }),
      ],
    });

    expect(summaries[0]?.memoryBeats.map((beat) => beat.kind)).toEqual([
      'playoff',
      'trade',
      'draft',
      'award',
      'retirement',
      'rivalry',
      'breakout',
    ]);
    expect(summaries[0]?.memoryBeats[0]).toMatchObject({
      label: 'Playoff Collapse',
      summary: 'ALCS ended 4-2',
      teamIds: ['bos', 'nym'],
    });
    expect(summaries[0]?.memoryBeats[1]).toMatchObject({
      label: 'Defining Trade',
      summary: 'The Tycoons bought aggressively at the deadline.',
      playerIds: ['player-mvp'],
    });
    expect(summaries[0]?.memoryBeats[2]).toMatchObject({
      label: 'Draft Pick #8',
      summary: 'Calvin Velez joined the system and is now AA.',
      playerIds: ['pick-2'],
    });
    expect(summaries[0]?.memoryBeats.at(-2)).toMatchObject({
      kind: 'rivalry',
      label: 'Rivalry Turn',
      summary: 'NYM-BOS: rivalry boiled over again',
    });
  });

  it('builds a World Series runner-up memory from season history when archive series is sparse', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 13,
          record: '99-63',
          playoffResult: 'World Series loss',
          dynastyScore: 205,
        }),
      ],
      seasonViews: {
        13: makeSeasonArchive({
          season: 13,
          wins: 99,
          losses: 63,
          playoffSeries: [],
          userSummary: {
            teamId: 'nym',
            record: '99-63',
            playoffResult: 'World Series loss',
            storylines: [],
          },
        }),
      },
      seasonHistory: [
        makeSeasonHistory({
          season: 13,
          championTeamId: 'bos',
          runnerUpTeamId: 'nym',
          worldSeriesRecord: '4-3',
        }),
      ],
    });

    expect(summaries[0]?.state).toBe('peak');
    expect(summaries[0]?.memoryBeats[0]).toMatchObject({
      kind: 'playoff',
      label: 'World Series Run',
      summary: 'World Series ended 4-3',
      teamIds: ['bos', 'nym'],
    });
  });

  it('carries playoff box-score links from current timeline entries into playoff memory beats', () => {
    const timelineEntry: DynastyTimelineEntryLike & { playoffGameIndex: number } = {
      ...makeTimelineEntry({
        season: 19,
        record: '97-65',
        playoffResult: 'Championship Series exit',
        dynastyScore: 194,
      }),
      playoffGameIndex: 733,
    };
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [timelineEntry],
      seasonViews: {
        19: makeSeasonArchive({
          season: 19,
          wins: 97,
          losses: 65,
          playoffSeries: [{
            round: 'NLCS',
            winnerTeamId: 'bos',
            loserTeamId: 'nym',
            result: '4-3',
          }],
          userSummary: {
            teamId: 'nym',
            record: '97-65',
            playoffResult: 'Championship Series exit',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats[0]).toMatchObject({
      kind: 'playoff',
      label: 'Playoff Collapse',
      summary: 'NLCS ended 4-3',
      gameIndex: 733,
    });
  });

  it('derives story memory beats from saved user-season storylines', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 14,
          record: '88-74',
          playoffResult: 'Missed playoffs',
          dynastyScore: 128,
        }),
      ],
      seasonViews: {
        14: makeSeasonArchive({
          season: 14,
          wins: 88,
          losses: 74,
          userSummary: {
            teamId: 'nym',
            record: '88-74',
            playoffResult: 'Missed playoffs',
            storylines: ['The clubhouse found a new identity during a winning summer.'],
          },
        }),
      },
      seasonHistory: [
        makeSeasonHistory({
          season: 14,
          userSeason: {
            teamId: 'nym',
            record: '88-74',
            playoffResult: 'Missed playoffs',
            storylines: [
              'A young core changed the clubhouse timeline.',
              'The clubhouse found a new identity during a winning summer.',
            ],
          },
        }),
      ],
    });

    expect(summaries[0]?.storylineHook).toBe('A young core changed the clubhouse timeline.');
    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-14-1',
        kind: 'story',
        label: 'Season Memory',
        summary: 'A young core changed the clubhouse timeline.',
        playerIds: [],
        teamIds: ['nym'],
      },
      {
        id: 'memory-14-2',
        kind: 'story',
        label: 'Season Memory',
        summary: 'The clubhouse found a new identity during a winning summer.',
        playerIds: [],
        teamIds: ['nym'],
      },
    ]);
  });

  it('derives a season memory beat from saved season-history summary text', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 15,
          record: '86-76',
          playoffResult: 'Missed playoffs',
          dynastyScore: 136,
        }),
      ],
      seasonViews: {},
      seasonHistory: [
        makeSeasonHistory({
          season: 15,
          summary: 'A stubborn September surge kept the contention window alive.',
          userSeason: {
            teamId: 'nym',
            record: '86-76',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      ],
    });

    expect(summaries[0]?.storylineHook).toBe('A stubborn September surge kept the contention window alive.');
    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-15-1',
        kind: 'story',
        label: 'Season Memory',
        summary: 'A stubborn September surge kept the contention window alive.',
        playerIds: [],
        teamIds: ['nym'],
      },
    ]);
  });

  it('adds player-backed breakout and injury memory beats from timeline moment detail', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 8,
          record: '89-73',
          playoffResult: 'Wild Card exit',
          dynastyScore: 158,
          playerMomentBeats: [
            {
              playerId: 'player-injury',
              teamId: 'nym',
              type: 'injury_return_hero',
              label: 'Injury Return',
              summary: 'Mina Stone came back from a long absence and carried September.',
              relevance: 0.94,
              day: 152,
            },
            {
              playerId: 'player-breakout',
              teamId: 'nym',
              type: 'rookie_breakout',
              label: 'Breakout Season',
              summary: 'Rafael Diaz forced his way into the core with a loud rookie season.',
              relevance: 0.97,
              day: 162,
              gameIndex: 411,
            },
          ],
        }),
      ],
      seasonViews: {
        8: makeSeasonArchive({
          season: 8,
          wins: 89,
          losses: 73,
          userSummary: {
            teamId: 'nym',
            record: '89-73',
            playoffResult: 'Wild Card exit',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    const momentBeats = summaries[0]?.memoryBeats ?? [];
    expect(momentBeats.map((beat) => beat.kind)).toEqual(['playoff', 'breakout', 'injury']);
    expect(momentBeats[1]).toMatchObject({
      kind: 'breakout',
      label: 'Breakout Season',
      summary: 'Rafael Diaz forced his way into the core with a loud rookie season.',
      playerIds: ['player-breakout'],
      teamIds: ['nym'],
      gameIndex: 411,
    });
    expect(momentBeats[2]).toMatchObject({
      kind: 'injury',
      label: 'Injury Return',
      summary: 'Mina Stone came back from a long absence and carried September.',
      playerIds: ['player-injury'],
      teamIds: ['nym'],
    });
  });

  it('classifies player-backed signature achievement moments as stat memories', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 18,
          record: '92-70',
          playoffResult: 'Missed playoffs',
          dynastyScore: 166,
          playerMomentBeats: [
            {
              playerId: 'player-no-hit',
              teamId: 'nym',
              type: 'no_hitter',
              label: 'No-Hitter',
              summary: 'Mina Stone finished a no-hitter that became a franchise marker.',
              relevance: 0.99,
              day: 91,
              playerNameFallback: 'Mina Stone',
              gameIndex: 512,
            },
          ],
        }),
      ],
      seasonViews: {
        18: makeSeasonArchive({
          season: 18,
          wins: 92,
          losses: 70,
          userSummary: {
            teamId: 'nym',
            record: '92-70',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats[0]).toMatchObject({
      kind: 'stat',
      label: 'No-Hitter',
      summary: 'Mina Stone finished a no-hitter that became a franchise marker.',
      playerIds: ['player-no-hit'],
      playerNameFallbacks: { 'player-no-hit': 'Mina Stone' },
      teamIds: ['nym'],
      gameIndex: 512,
    });
  });

  it('derives team-backed memory beats from timeline team moment detail', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 16,
          record: '93-69',
          playoffResult: 'Missed playoffs',
          dynastyScore: 166,
          teamMomentBeats: [
            {
              teamId: 'nym',
              type: 'dominant_rotation',
              label: 'Dominant Rotation',
              summary: 'The rotation gave the club a real October identity.',
              relevance: 0.84,
              day: 161,
            },
            {
              teamId: 'nym',
              type: 'rivalry_renewed',
              label: 'Rivalry Renewed',
              summary: 'The Boston rivalry became central to the season again.',
              relevance: 0.91,
              day: 120,
            },
          ],
        }),
      ],
      seasonViews: {
        16: makeSeasonArchive({
          season: 16,
          wins: 93,
          losses: 69,
          userSummary: {
            teamId: 'nym',
            record: '93-69',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-16-1',
        kind: 'rivalry',
        label: 'Rivalry Renewed',
        summary: 'The Boston rivalry became central to the season again.',
        playerIds: [],
        teamIds: ['nym'],
      },
      {
        id: 'memory-16-2',
        kind: 'identity',
        label: 'Dominant Rotation',
        summary: 'The rotation gave the club a real October identity.',
        playerIds: [],
        teamIds: ['nym'],
      },
    ]);
  });

  it('classifies mentorship timeline beats as identity memories with player links', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 19,
          record: '88-74',
          playoffResult: 'Missed playoffs',
          dynastyScore: 151,
          teamMomentBeats: [
            {
              teamId: 'nym',
              type: 'clubhouse_mentorship',
              label: 'Mentorship Lane',
              summary: 'Elias Anchor made Milo Spark the next player-development bet.',
              relevance: 0.82,
              day: null,
              playerIds: ['mentor-1', 'protege-1'],
              playerNameFallbacks: {
                'mentor-1': 'Elias Anchor',
                'protege-1': 'Milo Spark',
              },
            } as DynastyTimelineTeamMomentBeat & {
              playerIds: string[];
              playerNameFallbacks: Record<string, string>;
            },
          ],
        }),
      ],
      seasonViews: {
        19: makeSeasonArchive({
          season: 19,
          wins: 88,
          losses: 74,
          userSummary: {
            teamId: 'nym',
            record: '88-74',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toEqual([
      {
        id: 'memory-19-1',
        kind: 'identity',
        label: 'Mentorship Lane',
        summary: 'Elias Anchor made Milo Spark the next player-development bet.',
        playerIds: ['mentor-1', 'protege-1'],
        playerNameFallbacks: {
          'mentor-1': 'Elias Anchor',
          'protege-1': 'Milo Spark',
        },
        teamIds: ['nym'],
      },
    ]);
  });

  it('carries current-season team moment box-score links into timeline memory beats', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 18,
          record: '94-68',
          playoffResult: 'Won Division Series',
          dynastyScore: 178,
          teamMomentBeats: [
            {
              teamId: 'nym',
              type: 'lineup_of_era',
              label: 'Lineup of Era',
              summary: 'The lineup put together a defining late-summer win.',
              relevance: 0.93,
              day: 139,
              gameIndex: 512,
            } as DynastyTimelineTeamMomentBeat & { gameIndex: number },
          ],
        }),
      ],
      seasonViews: {
        18: makeSeasonArchive({
          season: 18,
          wins: 94,
          losses: 68,
          userSummary: {
            teamId: 'nym',
            record: '94-68',
            playoffResult: 'Won Division Series',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toContainEqual(expect.objectContaining({
      kind: 'identity',
      label: 'Lineup of Era',
      summary: 'The lineup put together a defining late-summer win.',
      teamIds: ['nym'],
      gameIndex: 512,
    }));
  });

  it('keeps multi-team rivalry event chips on derived timeline memory beats', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 17,
          record: '96-66',
          playoffResult: 'Won Division Series',
          dynastyScore: 189,
          teamMomentBeats: [
            {
              teamId: 'nym',
              teamIds: ['bos', 'nym'],
              type: 'rivalry_playoff',
              label: 'Rivalry October',
              summary: 'NYM finally took a playoff series from BOS.',
              relevance: 0.94,
              day: null,
            },
          ],
        }),
      ],
      seasonViews: {
        17: makeSeasonArchive({
          season: 17,
          wins: 96,
          losses: 66,
          userSummary: {
            teamId: 'nym',
            record: '96-66',
            playoffResult: 'Won Division Series',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toContainEqual(expect.objectContaining({
      kind: 'rivalry',
      label: 'Rivalry October',
      summary: 'NYM finally took a playoff series from BOS.',
      playerIds: [],
      teamIds: ['bos', 'nym'],
    }));
  });

  it('classifies playoff-series history team beats as playoff timeline memories', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 21,
          record: '98-64',
          playoffResult: 'Won Division Series',
          dynastyScore: 193,
          teamMomentBeats: [
            {
              teamId: 'nym',
              teamIds: ['nym', 'bos'],
              type: 'playoff_series_comeback',
              label: 'Playoff Comeback',
              summary: 'New York Tycoons survived down 3-1 in the CS against Boston Pilgrims.',
              relevance: 0.96,
              day: null,
            },
          ],
        }),
      ],
      seasonViews: {
        21: makeSeasonArchive({
          season: 21,
          wins: 98,
          losses: 64,
          userSummary: {
            teamId: 'nym',
            record: '98-64',
            playoffResult: 'Won Division Series',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toContainEqual(expect.objectContaining({
      kind: 'playoff',
      label: 'Playoff Comeback',
      summary: 'New York Tycoons survived down 3-1 in the CS against Boston Pilgrims.',
      playerIds: [],
      teamIds: ['nym', 'bos'],
    }));
  });

  it('carries player-moment names as fallback labels for old timeline memory links', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 11,
          record: '92-70',
          playoffResult: 'Division Series exit',
          dynastyScore: 171,
          playerMomentBeats: [
            {
              playerId: 'historical-breakout',
              teamId: 'nym',
              type: 'rookie_breakout',
              label: 'Breakout Season',
              summary: 'A buried prospect became part of the next core.',
              relevance: 0.93,
              day: 151,
              playerNameFallback: 'Sammy Archive',
            } as DynastyTimelinePlayerMomentBeat & { playerNameFallback: string },
          ],
        }),
      ],
      seasonViews: {
        11: makeSeasonArchive({
          season: 11,
          wins: 92,
          losses: 70,
          userSummary: {
            teamId: 'nym',
            record: '92-70',
            playoffResult: 'Division Series exit',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats[1]).toMatchObject({
      kind: 'breakout',
      playerIds: ['historical-breakout'],
      playerNameFallbacks: { 'historical-breakout': 'Sammy Archive' },
    });
  });

  it('carries archived player names as fallback labels for draft and retirement memory links', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 9,
          record: '86-76',
          playoffResult: 'Missed playoffs',
          dynastyScore: 132,
        }),
      ],
      seasonViews: {
        9: makeSeasonArchive({
          season: 9,
          wins: 86,
          losses: 76,
          draftClass: [{
            pickNumber: 3,
            playerId: 'pick-future-ace',
            playerName: 'Noah Velasquez',
            teamId: 'nym',
            currentStatus: 'A',
          }],
        }),
      },
      seasonHistory: [
        makeSeasonHistory({
          season: 9,
          notableRetirements: [{
            playerId: 'retired-captain',
            teamId: 'nym',
            seasonsPlayed: 13,
            overallRating: 71,
            summary: 'Derek Captain retired after 13 seasons with 71 overall talent.',
          }],
        }),
      ],
    });

    expect(summaries[0]?.memoryBeats).toEqual([
      expect.objectContaining({
        kind: 'draft',
        playerIds: ['pick-future-ace'],
        playerNameFallbacks: { 'pick-future-ace': 'Noah Velasquez' },
      }),
      expect.objectContaining({
        kind: 'retirement',
        playerIds: ['retired-captain'],
        playerNameFallbacks: { 'retired-captain': 'Derek Captain' },
      }),
    ]);
  });

  it('carries award-summary names as fallback labels for old award memory links', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 10,
          record: '95-67',
          playoffResult: 'Division Series exit',
          dynastyScore: 188,
        }),
      ],
      seasonViews: {
        10: makeSeasonArchive({
          season: 10,
          wins: 95,
          losses: 67,
          awards: [{
            season: 10,
            award: 'CY_YOUNG',
            league: 'NL',
            playerId: 'award-ace',
            teamId: 'nym',
            summary: 'Lucia Alvarez is dominating the Cy Young race.',
          }],
          userSummary: {
            teamId: 'nym',
            record: '95-67',
            playoffResult: 'Division Series exit',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats[1]).toMatchObject({
      kind: 'award',
      playerIds: ['award-ace'],
      playerNameFallbacks: { 'award-ace': 'Lucia Alvarez' },
    });
  });

  it('derives player-backed stat leader memory beats from archived user-team leaders', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 20,
          record: '89-73',
          playoffResult: 'Missed playoffs',
          dynastyScore: 151,
        }),
      ],
      seasonViews: {
        20: makeSeasonArchive({
          season: 20,
          wins: 89,
          losses: 73,
          statLeaders: {
            hr: [{
              playerId: 'slugger-20',
              teamId: 'nym',
              value: '48',
              summary: 'Rafael Diaz launched 48 home runs.',
            }],
            rbi: [{
              playerId: 'opponent-rbi',
              teamId: 'bos',
              value: '122',
              summary: 'Boston cleanup bat drove in 122 runs.',
            }],
            avg: [],
            era: [{
              playerId: 'ace-20',
              teamId: 'nym',
              value: '2.41',
              summary: 'Mina Stone posted a 2.41 ERA.',
            }],
            k: [],
            w: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats).toEqual([
      expect.objectContaining({
        kind: 'stat',
        label: 'Home Run Leader',
        summary: 'Rafael Diaz launched 48 home runs.',
        playerIds: ['slugger-20'],
        playerNameFallbacks: { 'slugger-20': 'Rafael Diaz' },
        teamIds: ['nym'],
      }),
      expect.objectContaining({
        kind: 'stat',
        label: 'ERA Leader',
        summary: 'Mina Stone posted a 2.41 ERA.',
        playerIds: ['ace-20'],
        playerNameFallbacks: { 'ace-20': 'Mina Stone' },
        teamIds: ['nym'],
      }),
    ]);
  });

  it('does not infer award fallback labels from missing award summaries', () => {
    const summaries = buildDynastyTimelineSeasonSummaries({
      franchiseTimeline: [
        makeTimelineEntry({
          season: 12,
          record: '90-72',
          playoffResult: 'Missed playoffs',
          dynastyScore: 170,
        }),
      ],
      seasonViews: {
        12: makeSeasonArchive({
          season: 12,
          wins: 90,
          losses: 72,
          awards: [{
            season: 12,
            award: 'MVP',
            league: 'NL',
            playerId: 'legacy-award',
            teamId: 'nym',
          } as unknown as SeasonArchiveEntry['awards'][number]],
          userSummary: {
            teamId: 'nym',
            record: '90-72',
            playoffResult: 'Missed playoffs',
            storylines: [],
          },
        }),
      },
      seasonHistory: [],
    });

    expect(summaries[0]?.memoryBeats[0]).toMatchObject({
      kind: 'award',
      playerIds: ['legacy-award'],
      summary: 'legacy-award won NL MVP.',
    });
    expect(summaries[0]?.memoryBeats[0]?.playerNameFallbacks).toEqual({});
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
