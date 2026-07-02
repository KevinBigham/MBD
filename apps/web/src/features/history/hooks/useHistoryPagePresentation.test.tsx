import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';
import { useHistoryPagePresentation } from './useHistoryPagePresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useHistoryPagePresentation>[0];
type HookResult = ReturnType<typeof useHistoryPagePresentation>;

const emptyLeaders = {
  hr: [],
  rbi: [],
  avg: [],
  era: [],
  k: [],
  w: [],
};

const seasonArchive = {
  season: 10,
  standings: [
    { teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
    { teamId: 'bos', wins: 91, losses: 71, divisionRank: 2, gamesBack: 6 },
  ],
  playoffSeries: [
    {
      round: 'World Series',
      winnerTeamId: 'nym',
      loserTeamId: 'bos',
      result: '4-2',
    },
  ],
  awards: [
    { award: 'MVP', playerId: 'player-mvp', teamId: 'nym' },
  ],
  statLeaders: {
    ...emptyLeaders,
    hr: [{ playerId: 'player-mvp', teamId: 'nym', value: '44', summary: '44 HR' }],
  },
  transactions: [
    {
      headline: 'Added a deadline starter',
      impactScore: 5,
      playerIds: ['player-acquired'],
      summary: 'New York added a deadline starter.',
      teamIds: ['nym'],
    },
  ],
  draftClass: [
    {
      currentStatus: 'High-A',
      pickNumber: 24,
      playerId: 'prospect-1',
      playerName: 'Casey Future',
      teamId: 'nym',
    },
  ],
  financials: [
    { teamId: 'nym', payroll: 245, budget: 255 },
  ],
  userSummary: {
    teamId: 'nym',
    record: '97-65',
    playoffResult: 'Champion',
    storylines: ['Won the World Series in six games.'],
  },
  timelineEvents: ['The city has a new October standard.'],
} as unknown as SeasonArchiveEntry;

const seasonHistory = [
  {
    season: 10,
    championTeamId: 'nym',
    runnerUpTeamId: 'bos',
    worldSeriesRecord: '4-2',
    summary: 'New York finished the climb.',
    awards: [],
    keyMoments: ['Closed out the pennant race.'],
    statLeaders: emptyLeaders,
    notableRetirements: [],
    blockbusterTrades: [],
    userSeason: {
      teamId: 'nym',
      record: '97-65',
      playoffResult: 'Champion',
      storylines: ['Won the World Series in six games.'],
    },
  },
] as unknown as SeasonHistoryEntry[];

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useHistoryPagePresentation(options));
  return null;
}

describe('useHistoryPagePresentation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseRouteData(overrides: Partial<HookOptions['routeData']> = {}): HookOptions['routeData'] {
    return {
      achievements: [{ id: 'champion', name: 'Champion', unlocked: true }],
      allTimeLeaders: null,
      awardHistory: [],
      awardRaces: null,
      branches: [],
      comparisonSeason: null,
      displayNames: {
        players: {
          'player-mvp': 'Mike Trout',
        },
        teams: {
          bos: 'Boston Noreasters',
          nym: 'New York Tycoons',
        },
      },
      dynastyCards: [],
      dynastyScore: null,
      franchiseTimeline: [
        {
          season: 10,
          record: '97-65',
          playoffResult: 'Champion',
          championship: true,
          dynastyScore: 215,
          keyAcquisitions: ['Deadline starter'],
          keyDepartures: [],
          playoffAppearance: true,
        },
      ],
      hallOfFame: [],
      leaderboardEntries: [],
      onCopyLatestSummary: vi.fn(),
      recordBook: { franchise: [], league: [] },
      recordWatch: [],
      rivalries: [],
      seasonComparison: null,
      seasonHistory,
      seasonViews: { 10: seasonArchive },
      selectedAchievementId: 'champion',
      selectedSeason: 10,
      setComparisonSeason: vi.fn(),
      setSelectedAchievementId: vi.fn(),
      setSelectedSeason: vi.fn(),
      timelineComparisons: [],
      ...overrides,
    } as HookOptions['routeData'];
  }

  function baseOptions(routeDataOverrides: Partial<HookOptions['routeData']> = {}): HookOptions {
    return {
      onCopyLatestSummary: vi.fn(),
      routeData: baseRouteData(routeDataOverrides),
      userTeamId: 'nym',
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    await act(async () => {});
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
    throw lastError;
  }

  it('derives selected archive team details and season recap modal data', async () => {
    await renderHook(baseOptions());

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.availableSeasons).toEqual([10]);
      expect(latestResult?.contentProps.selectedTeamId).toBe('nym');
      expect(latestResult?.contentProps.selectedTeamStanding?.wins).toBe(97);
      expect(latestResult?.contentProps.selectedTeamFinancial?.payroll).toBe(245);
      expect(latestResult?.contentProps.selectedTeamAwards).toHaveLength(1);
      expect(latestResult?.contentProps.selectedTeamDraftPicks).toHaveLength(1);
      expect(latestResult?.contentProps.visibleHistoryTabs).not.toContain('timeline');
    });

    await act(async () => {
      latestResult?.contentProps.onOpenTimelineSeasonRecap(10);
    });

    expect(latestResult?.recapData).toMatchObject({
      season: 10,
      teamId: 'nym',
      record: '97-65',
      isChampion: true,
      payroll: '$245.0M',
    });

    await act(async () => {
      latestResult?.onDismissSeasonRecap();
    });

    expect(latestResult?.recapData).toBeNull();
  });

  it('falls back from timeline to seasons when branches disappear', async () => {
    const branch = {
      id: 'branch-1',
      season: 10,
      day: 90,
      phase: 'regular',
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: null,
    };
    const optionsWithBranch = baseOptions({
      branches: [branch],
    });
    await renderHook(optionsWithBranch);

    await act(async () => {
      latestResult?.contentProps.onSelectHistoryTab('timeline');
    });
    expect(latestResult?.contentProps.selectedHistoryTab).toBe('timeline');
    expect(latestResult?.contentProps.visibleHistoryTabs).toContain('timeline');

    await renderHook(baseOptions({ branches: [] }));

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.selectedHistoryTab).toBe('seasons');
      expect(latestResult?.contentProps.visibleHistoryTabs).not.toContain('timeline');
    });
  });

  it('defaults and toggles the expanded dynasty timeline chapter', async () => {
    await renderHook(baseOptions());

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.expandedTimelineChapterId).toBe('dynasty-chapter-10-10');
    });

    await act(async () => {
      latestResult?.contentProps.onToggleTimelineChapter('dynasty-chapter-10-10');
    });
    expect(latestResult?.contentProps.expandedTimelineChapterId).toBeNull();

    await act(async () => {
      latestResult?.contentProps.onToggleTimelineChapter('dynasty-chapter-10-10');
    });
    expect(latestResult?.contentProps.expandedTimelineChapterId).toBe('dynasty-chapter-10-10');
  });
});
