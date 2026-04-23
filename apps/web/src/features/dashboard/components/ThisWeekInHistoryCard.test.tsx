import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ThisWeekInHistoryCard from './ThisWeekInHistoryCard';

const mockWorker = {
  isReady: true,
  getThisWeekInHistory: vi.fn(),
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

describe('ThisWeekInHistoryCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getThisWeekInHistory.mockReset();
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
          <ThisWeekInHistoryCard />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty-state copy when no prior-season matches exist', async () => {
    mockWorker.getThisWeekInHistory.mockResolvedValue({
      season: 7,
      day: 120,
      dayWindow: 3,
      playerMoments: [],
      teamMoments: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('This Week in History');
    expect(text).toContain('No franchise history matches this week yet.');
  });

  it('labels each entry with "N years ago today" and surfaces player + team moments', async () => {
    mockWorker.getThisWeekInHistory.mockResolvedValue({
      season: 7,
      day: 120,
      dayWindow: 3,
      playerMoments: [
        {
          playerId: 'p1',
          playerName: 'Vince Hollister',
          teamId: 'nym',
          yearsAgo: 2,
          moment: {
            season: 5,
            day: 121,
            description: 'Threw a no-hitter at Fenway.',
            type: 'no_hitter',
            isPlayoff: false,
            relevance: 0.9,
          },
        },
      ],
      teamMoments: [
        {
          teamId: 'bos',
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

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Vince Hollister');
    expect(text).toContain('Threw a no-hitter at Fenway.');
    expect(text).toContain('2 years ago today');
    expect(text).toContain('Boston Noreasters');
    expect(text).toContain('Boston clinched the division on the final swing.');
    expect(text).toContain('3 years ago today');
    // More recent season-ago entries render above older ones:
    expect(text.indexOf('Threw a no-hitter at Fenway.'))
      .toBeLessThan(text.indexOf('Boston clinched the division on the final swing.'));
  });

  it('renders "1 year ago today" (singular) for yearsAgo === 1', async () => {
    mockWorker.getThisWeekInHistory.mockResolvedValue({
      season: 7,
      day: 120,
      dayWindow: 3,
      playerMoments: [
        {
          playerId: 'p2',
          playerName: 'Theo Castellanos',
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
      ],
      teamMoments: [],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('1 year ago today');
    expect(text).not.toContain('1 years ago today');
  });

  it('caps visible entries at six when more matches exist', async () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      teamId: 'nym',
      yearsAgo: i + 1,
      moment: {
        season: 7 - (i + 1),
        day: 120,
        description: `Team identity beat ${i}.`,
        type: 'contention_window_opens',
        isPlayoff: false,
        relevance: 0.5 + (i * 0.01),
      },
    }));
    mockWorker.getThisWeekInHistory.mockResolvedValue({
      season: 7,
      day: 120,
      dayWindow: 3,
      playerMoments: [],
      teamMoments: many,
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Team identity beat 0.');
    expect(text).toContain('Team identity beat 5.');
    expect(text).not.toContain('Team identity beat 6.');
  });
});
