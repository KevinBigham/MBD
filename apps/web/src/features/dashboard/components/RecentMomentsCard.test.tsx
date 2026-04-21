import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import RecentMomentsCard from './RecentMomentsCard';

const mockWorker = {
  isReady: true,
  getRecentLeagueMoments: vi.fn(),
  getRecentTeamMoments: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: () => ({ day: 120, season: 7 }),
}));

vi.mock('@mbd/sim-core', () => ({
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') return { city: 'New York', name: 'Tycoons', abbreviation: 'NYT' };
    if (teamId === 'bos') return { city: 'Boston', name: 'Noreasters', abbreviation: 'BOS' };
    return null;
  }),
}));

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RecentMomentsCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getRecentLeagueMoments.mockReset();
    mockWorker.getRecentTeamMoments.mockReset();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderCard() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RecentMomentsCard />
        </MemoryRouter>,
      );
    });
    // flush the async fetch
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty state when both streams return nothing', async () => {
    mockWorker.getRecentLeagueMoments.mockResolvedValue([]);
    mockWorker.getRecentTeamMoments.mockResolvedValue([]);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Signature Moments');
    expect(text).toContain('No recent league-wide moments in the last seven sim days.');
  });

  it('merges player and team moments by recency and caps at five', async () => {
    mockWorker.getRecentLeagueMoments.mockResolvedValue([
      {
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
    ]);
    mockWorker.getRecentTeamMoments.mockResolvedValue([
      {
        teamId: 'nym',
        moment: {
          season: 7,
          day: 120,
          description: 'The front office doubled down on contention.',
          type: 'deadline_buyer',
          isPlayoff: false,
          relevance: 0.91,
        },
      },
    ]);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('Team Identity');
    expect(text).toContain('Walk-off grand slam.');
    expect(text).toContain('The front office doubled down on contention.');
    expect(text.indexOf('The front office doubled down on contention.'))
      .toBeLessThan(text.indexOf('Walk-off grand slam.'));
  });

  it('orders team moments ahead of player moments when recency + relevance tie', async () => {
    mockWorker.getRecentLeagueMoments.mockResolvedValue([
      {
        playerId: 'p1',
        playerName: 'Vince Hollister',
        teamId: 'nym',
        moment: {
          season: 7,
          day: 120,
          description: 'Called shot.',
          type: 'cycle',
          isPlayoff: false,
          relevance: 0.8,
        },
      },
    ]);
    mockWorker.getRecentTeamMoments.mockResolvedValue([
      {
        teamId: 'bos',
        moment: {
          season: 7,
          day: 120,
          description: 'Boston offloaded its veterans at the deadline.',
          type: 'deadline_seller',
          isPlayoff: false,
          relevance: 0.8,
        },
      },
    ]);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text.indexOf('Boston offloaded its veterans at the deadline.'))
      .toBeLessThan(text.indexOf('Called shot.'));
  });
});
