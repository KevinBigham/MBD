import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { HistorySeasonView } from '@/workers/sim.worker.narrative';
import SeasonBrowserPanel from './SeasonBrowserPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const seasonView = {
  season: 2,
  standings: [
    { teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
    { teamId: 'bos', wins: 92, losses: 70, divisionRank: 2, gamesBack: 5 },
  ],
  playoffSeries: [],
  awards: [],
  statLeaders: {
    hr: [],
    rbi: [],
    avg: [],
    era: [],
    k: [],
    w: [],
  },
  transactions: [],
  draftClass: [],
  financials: [],
  userSummary: {
    teamId: 'nym',
    record: '97-65',
    playoffResult: 'Champion',
    storylines: [],
  },
  timelineEvents: ['Raised another banner'],
} as unknown as HistorySeasonView;

describe('SeasonBrowserPanel', () => {
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
  });

  it('renders the empty archive state with season comparison controls', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SeasonBrowserPanel
            availableSeasons={[3, 2]}
            comparisonSeason={2}
            divisionLabelForTeam={() => 'AL East'}
            formatAwardLabel={(award) => award}
            formatMoney={(value) => value == null ? '--' : `$${value.toFixed(1)}M`}
            groupedStandings={[]}
            onOpenYearInReview={vi.fn()}
            onSelectComparisonSeason={vi.fn()}
            onSelectSeason={vi.fn()}
            onSelectSeasonTab={vi.fn()}
            onSelectTeam={vi.fn()}
            playerName={(playerId) => playerId}
            seasonComparison={null}
            selectedArchive={null}
            selectedSeason={3}
            selectedSeasonTab="standings"
            selectedTeamAwards={[]}
            selectedTeamDraftPicks={[]}
            selectedTeamFinancial={null}
            selectedTeamId={null}
            selectedTeamSeries={[]}
            selectedTeamStanding={null}
            selectedTeamTransactions={[]}
            teamName={(teamId) => teamId ?? 'Unknown team'}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Season Browser');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('No archived seasons yet');
    expect(container.querySelector('[data-mobile-critical-control="history-season-select"]')).not.toBeNull();
    expect(container.querySelector('[data-mobile-critical-control="history-compare-select"]')).not.toBeNull();
  });

  it('delegates season selection and year-in-review actions to the route', async () => {
    const onSelectSeason = vi.fn();
    const onOpenYearInReview = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <SeasonBrowserPanel
            availableSeasons={[3, 2]}
            comparisonSeason={3}
            divisionLabelForTeam={() => 'AL East'}
            formatAwardLabel={(award) => award}
            formatMoney={(value) => value == null ? '--' : `$${value.toFixed(1)}M`}
            groupedStandings={[
              {
                division: 'AL_EAST',
                label: 'AL EAST',
                entries: [
                  { teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 },
                ],
              },
            ]}
            onOpenYearInReview={onOpenYearInReview}
            onSelectComparisonSeason={vi.fn()}
            onSelectSeason={onSelectSeason}
            onSelectSeasonTab={vi.fn()}
            onSelectTeam={vi.fn()}
            playerName={(playerId) => playerId}
            seasonComparison={null}
            selectedArchive={seasonView}
            selectedSeason={2}
            selectedSeasonTab="standings"
            selectedTeamAwards={[]}
            selectedTeamDraftPicks={[]}
            selectedTeamFinancial={null}
            selectedTeamId="nym"
            selectedTeamSeries={[]}
            selectedTeamStanding={{ teamId: 'nym', wins: 97, losses: 65, divisionRank: 1, gamesBack: 0 }}
            selectedTeamTransactions={[]}
            teamName={(teamId) => teamId === 'nym' ? 'New York Tycoons' : (teamId ?? 'Unknown team')}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const seasonSelect = container.querySelector('[data-mobile-critical-control="history-season-select"]') as HTMLSelectElement;
    await act(async () => {
      seasonSelect.value = '3';
      seasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(onSelectSeason).toHaveBeenCalledWith(3);

    const yearInReviewButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Year in Review'));
    expect(yearInReviewButton).toBeDefined();

    await act(async () => {
      yearInReviewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenYearInReview).toHaveBeenCalledWith(2);
  });
});
