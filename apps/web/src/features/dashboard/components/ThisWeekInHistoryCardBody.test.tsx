import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ThisWeekInHistoryCardBody, { type HistoricalEntry } from './ThisWeekInHistoryCardBody';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ThisWeekInHistoryCardBody', () => {
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

  async function renderBody({
    loading = false,
    entries = [],
  }: {
    loading?: boolean;
    entries?: HistoricalEntry[];
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ThisWeekInHistoryCardBody loading={loading} entries={entries} />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading and empty states without worker data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('No franchise history matches this week yet.');
  });

  it('renders player and team history entries with links, badges, and date context', async () => {
    await renderBody({
      entries: [
        {
          kind: 'player',
          playerId: 'p1',
          playerName: 'Vince Hollister',
          teamId: 'nym',
          yearsAgo: 1,
          moment: {
            season: 6,
            day: 120,
            description: 'Walk-off grand slam on a day like today.',
            type: 'walk_off_hr',
            isPlayoff: false,
            relevance: 0.8,
          },
        },
        {
          kind: 'team',
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          yearsAgo: 3,
          moment: {
            season: 4,
            day: 119,
            description: 'Boston clinched the division on the final swing.',
            type: 'championship_run',
            isPlayoff: true,
            relevance: 0.95,
          },
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('Walk-off grand slam on a day like today.');
    expect(text).toContain('1 year ago today');
    expect(text).not.toContain('1 years ago today');
    expect(text).toContain('Season 6');
    expect(text).toContain('Day 120');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('Franchise');
    expect(text).toContain('Boston clinched the division on the final swing.');
    expect(text).toContain('3 years ago today');
    expect(text).toContain('Season 4');
    expect(text).toContain('Day 119');
    expect(text).toContain('Playoffs');
    expect(container.querySelector('a[href="/players/p1?tab=moments"]')).not.toBeNull();
  });
});
