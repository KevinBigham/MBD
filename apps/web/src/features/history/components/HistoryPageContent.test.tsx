import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DynastyCard } from '@mbd/contracts';
import { HISTORY_TABS, type HistoryTab } from '../lib/historyPageTransforms';
import HistoryPageContent, { type HistoryPageContentProps } from './HistoryPageContent';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function dynastyCard(overrides: Partial<DynastyCard> = {}): DynastyCard {
  return {
    id: 'card-1',
    title: 'Season 4 Dynasty Card',
    subtitle: 'Ninety wins and a division crown',
    generatedAt: 'S4D180',
    textSummary: 'The Tycoons turned Season 4 into a legacy checkpoint.',
    stats: [{ label: 'Wins', value: '92' }],
    highlights: ['Division crown'],
    ...overrides,
  } as DynastyCard;
}

function baseProps(overrides: Partial<HistoryPageContentProps> = {}): HistoryPageContentProps {
  return {
    achievements: [],
    allTimeLeaders: null,
    availableSeasons: [],
    awardHistory: [],
    awardRaces: null,
    comparisonSeason: null,
    divisionLabelForTeam: (teamId) => teamId,
    dynastyCards: [],
    dynastyScore: null,
    dynastyTimelineChapters: [],
    expandedTimelineChapterId: null,
    formatAwardLabel: (award) => award,
    formatMoney: (value) => value == null ? '--' : `$${value.toFixed(1)}M`,
    groupedStandings: [],
    hallOfFame: [],
    leaderboardEntries: [],
    onCopyLatestSummary: vi.fn(),
    onOpenTimelineSeasonRecap: vi.fn(),
    onSelectAchievement: vi.fn(),
    onSelectComparisonSeason: vi.fn(),
    onSelectHistoryTab: vi.fn(),
    onSelectSeason: vi.fn(),
    onSelectSeasonTab: vi.fn(),
    onSelectTeam: vi.fn(),
    onToggleTimelineChapter: vi.fn(),
    playerName: (playerId) => playerId,
    recordBook: { franchise: [], league: [] },
    recordWatch: [],
    rivalries: [],
    seasonComparison: null,
    selectedAchievement: null,
    selectedArchive: null,
    selectedHistoryTab: 'seasons' as HistoryTab,
    selectedSeason: null,
    selectedSeasonTab: 'standings',
    selectedTeamAwards: [],
    selectedTeamDraftPicks: [],
    selectedTeamFinancial: null,
    selectedTeamId: null,
    selectedTeamSeries: [],
    selectedTeamStanding: null,
    selectedTeamTransactions: [],
    teamAbbreviation: (teamId) => teamId.toUpperCase(),
    teamName: (teamId) => teamId ?? 'Unknown team',
    timelineCanOpenRecap: () => false,
    timelineComparisons: [],
    timelinePlayerNames: {},
    timelineTeamNames: {},
    visibleHistoryTabs: HISTORY_TABS,
    ...overrides,
  } as HistoryPageContentProps;
}

describe('HistoryPageContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the route chrome and delegates legacy summary copy', async () => {
    const onCopyLatestSummary = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <HistoryPageContent
            {...baseProps({
              dynastyCards: [dynastyCard()],
              onCopyLatestSummary,
              selectedHistoryTab: 'legacy',
            })}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Franchise History');
    expect(container.textContent).toContain('Season 4 Dynasty Card');

    const copyButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Copy Latest Summary'));
    expect(copyButton).toBeTruthy();

    await act(async () => {
      copyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onCopyLatestSummary).toHaveBeenCalledWith('The Tycoons turned Season 4 into a legacy checkpoint.');
  });
});
