import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RecentMomentsCardBody, { type MergedMomentView } from './RecentMomentsCardBody';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RecentMomentsCardBody', () => {
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
    moments = [],
  }: {
    loading?: boolean;
    moments?: MergedMomentView[];
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecentMomentsCardBody loading={loading} moments={moments} />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading and empty states without worker data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('No recent league-wide moments in the last seven sim days.');
  });

  it('renders player and team signature moments with links, badges, and date context', async () => {
    await renderBody({
      moments: [
        {
          kind: 'player',
          playerId: 'p1',
          playerName: 'Vince Hollister',
          teamId: 'nym',
          moment: {
            season: 7,
            day: 118,
            description: 'Walk-off grand slam.',
            type: 'walk_off_hr',
            isPlayoff: false,
            relevance: 0.7,
          },
        },
        {
          kind: 'team',
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          moment: {
            season: 7,
            day: 120,
            description: 'Boston doubled down on contention.',
            type: 'deadline_buyer',
            isPlayoff: true,
            relevance: 0.91,
          },
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('Walk-off grand slam.');
    expect(text).toContain('Season 7');
    expect(text).toContain('Day 118');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('Team Identity');
    expect(text).toContain('Boston doubled down on contention.');
    expect(text).toContain('Day 120');
    expect(text).toContain('Playoffs');
    expect(container.querySelector('a[href="/players/p1?tab=moments"]')).not.toBeNull();
  });
});
