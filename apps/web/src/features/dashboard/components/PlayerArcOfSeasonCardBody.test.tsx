import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayerArcOfSeasonCardBody, { type PlayerArcEntryView } from './PlayerArcOfSeasonCardBody';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PlayerArcOfSeasonCardBody', () => {
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
    entries = [],
    loading = false,
  }: {
    entries?: PlayerArcEntryView[];
    loading?: boolean;
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayerArcOfSeasonCardBody
            entries={entries}
            loading={loading}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading and empty states without worker data', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    const text = container.textContent ?? '';
    expect(text).toContain('No player arcs from this season yet.');
  });

  it('renders player arc rows with links, team context, labels, and date context', async () => {
    await renderBody({
      entries: [
        {
          playerId: 'p1',
          playerName: 'Vince Hollister',
          teamId: 'nym',
          teamName: 'New York Tycoons',
          moment: {
            season: 6,
            day: 162,
            description: 'Hollister rewrote the comeback story after a lost year.',
            type: 'redemption_arc',
            isPlayoff: false,
            relevance: 0.95,
          },
        },
        {
          playerId: 'p2',
          playerName: 'Theo Castellanos',
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          moment: {
            season: 6,
            day: 162,
            description: 'At 37, Castellanos put together the best season of his career.',
            type: 'late_career_peak',
            isPlayoff: true,
            relevance: 0.88,
          },
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('Hollister rewrote the comeback story after a lost year.');
    expect(text).toContain('Redemption');
    expect(text).toContain('Theo Castellanos');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('Late-Career Peak');
    expect(text).toContain('Day 162');
    expect(text).toContain('Playoffs');
    expect(container.querySelector('a[href="/players/p1?tab=moments"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="logo-nym"]')).not.toBeNull();
  });
});
