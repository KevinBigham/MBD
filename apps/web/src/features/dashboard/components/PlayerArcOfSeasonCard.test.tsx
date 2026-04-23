import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayerArcOfSeasonCard from './PlayerArcOfSeasonCard';

const mockWorker = {
  isReady: true,
  getPlayerArcsOfSeason: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: () => ({ day: 180, season: 7 }),
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

describe('PlayerArcOfSeasonCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getPlayerArcsOfSeason.mockReset();
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
          <PlayerArcOfSeasonCard />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty-state copy when no arcs exist', async () => {
    mockWorker.getPlayerArcsOfSeason.mockResolvedValue({
      season: 0,
      arcs: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Player Arcs of the Season');
    expect(text).toContain('No player arcs from this season yet.');
  });

  it('renders arc entries with player name, team context, description, and arc-type badge', async () => {
    mockWorker.getPlayerArcsOfSeason.mockResolvedValue({
      season: 6,
      arcs: [
        {
          playerId: 'p1',
          playerName: 'Vince Hollister',
          teamId: 'nym',
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
          moment: {
            season: 6,
            day: 162,
            description: 'At 37, Castellanos put together the best season of his career.',
            type: 'late_career_peak',
            isPlayoff: false,
            relevance: 0.88,
          },
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('New York Tycoons');
    expect(text).toContain('Hollister rewrote the comeback story after a lost year.');
    expect(text).toContain('Redemption');
    expect(text).toContain('Theo Castellanos');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('Late-Career Peak');
    // Season label present
    expect(text).toContain('Season 6');
  });

  it('labels rookie_breakout arcs as "Rookie Breakout"', async () => {
    mockWorker.getPlayerArcsOfSeason.mockResolvedValue({
      season: 6,
      arcs: [
        {
          playerId: 'p3',
          playerName: 'Miguel Acuna',
          teamId: 'nym',
          moment: {
            season: 6,
            day: 162,
            description: 'Acuna blew the door off his first full season.',
            type: 'rookie_breakout',
            isPlayoff: false,
            relevance: 0.9,
          },
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Rookie Breakout');
    expect(text).toContain('Miguel Acuna');
  });

  it('caps visible entries at five when more arcs are returned', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      playerId: `p${i}`,
      playerName: `Player ${i}`,
      teamId: 'nym',
      moment: {
        season: 6,
        day: 162,
        description: `Arc description ${i}.`,
        type: 'redemption_arc',
        isPlayoff: false,
        relevance: 0.9 - (i * 0.01),
      },
    }));
    mockWorker.getPlayerArcsOfSeason.mockResolvedValue({
      season: 6,
      arcs: many,
    });

    await renderCard();

    const text = container.textContent ?? '';
    // First five are visible, rest are not
    expect(text).toContain('Arc description 0.');
    expect(text).toContain('Arc description 4.');
    expect(text).not.toContain('Arc description 5.');
    expect(text).not.toContain('Arc description 7.');
  });

  it('omits the Season label in empty state', async () => {
    mockWorker.getPlayerArcsOfSeason.mockResolvedValue({
      season: 0,
      arcs: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).not.toContain('Season 0');
  });
});
