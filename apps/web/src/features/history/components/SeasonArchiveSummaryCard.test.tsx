import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ArchivedSeason, SeasonArchiveEntry } from '@mbd/contracts';
import SeasonArchiveSummaryCard from './SeasonArchiveSummaryCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyLeaders = {
  hr: [],
  rbi: [],
  avg: [],
  era: [],
  k: [],
  w: [],
};

const fullArchive: SeasonArchiveEntry = {
  season: 3,
  standings: [
    { teamId: 'team-user', wins: 97, losses: 65, gamesBack: 0, divisionRank: 1 },
  ],
  playoffSeries: [],
  awards: [],
  transactions: [],
  draftClass: [],
  financials: [],
  timelineEvents: ['Clinched the division', 'Won the pennant'],
  userSummary: {
    teamId: 'team-user',
    record: '97-65',
    playoffResult: 'Lost World Series',
    storylines: ['A deep October run ended one step short.'],
  },
  statLeaders: emptyLeaders,
};

const archivedSeason: ArchivedSeason = {
  season: 1,
  standings: [
    { teamId: 'team-user', wins: 88, losses: 74, divisionRank: 2 },
  ],
  userRecord: { wins: 88, losses: 74 },
  playoffResult: null,
  championshipWon: true,
  championTeamId: 'team-user',
  mvpName: 'Slugger Star',
  cyYoungName: 'Ace Righty',
  statLeaders: emptyLeaders,
  dynastyScore: 125,
};

describe('SeasonArchiveSummaryCard', () => {
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

  it('renders a full archive summary and delegates year-in-review opening', async () => {
    const onOpenYearInReview = vi.fn();

    await act(async () => {
      root.render(
        <SeasonArchiveSummaryCard
          seasonView={fullArchive}
          onOpenYearInReview={onOpenYearInReview}
        />,
      );
    });

    expect(container.textContent).toContain('Season 3 Archive');
    expect(container.textContent).toContain('97-65');
    expect(container.textContent).toContain('Lost World Series');
    expect(container.textContent).toContain('Clinched the division');
    expect(container.textContent).toContain('Won the pennant');

    const reviewButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Year in Review'),
    );
    expect(reviewButton).toBeTruthy();

    await act(async () => {
      reviewButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenYearInReview).toHaveBeenCalledTimes(1);
  });

  it('renders compact archived-season copy without a recap button', async () => {
    await act(async () => {
      root.render(
        <SeasonArchiveSummaryCard
          seasonView={archivedSeason}
          onOpenYearInReview={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Season 1 Archive');
    expect(container.textContent).toContain('88-74');
    expect(container.textContent).toContain('Won World Series');
    expect(container.textContent).toContain('Detailed transaction, draft, and payroll logs were archived to keep long dynasties fast.');
    expect(container.textContent).not.toContain('Year in Review');
  });
});
