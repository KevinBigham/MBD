import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FranchiseLegacyCard from './FranchiseLegacyCard';

const mockWorker = {
  isReady: true,
  getTeamMoments: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: () => ({ season: 7, userTeamId: 'nym' }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FranchiseLegacyCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getTeamMoments.mockReset();
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
          <FranchiseLegacyCard />
        </MemoryRouter>,
      );
    });
    // flush the async fetch
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty state when the user team has no team moments yet', async () => {
    mockWorker.getTeamMoments.mockResolvedValue([]);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Franchise Legacy');
    expect(text).toContain('Team identity beats will appear here after your first trade deadline.');
    expect(text).toContain('Full timeline');
    expect(mockWorker.getTeamMoments).toHaveBeenCalledWith('nym');
  });

  it('summarizes moment counts and highlights the latest moment', async () => {
    mockWorker.getTeamMoments.mockResolvedValue([
      {
        season: 7,
        day: 120,
        timestamp: 'S7D120',
        type: 'deadline_buyer',
        description: 'The front office doubled down on contention.',
        impact: 18,
        relevance: 0.9,
        isPlayoff: false,
        round: null,
        worldSeriesClincher: false,
        isEliminationGame: false,
      },
      {
        season: 6,
        day: 118,
        timestamp: 'S6D118',
        type: 'deadline_seller',
        description: 'Sold off veterans at the deadline.',
        impact: -14,
        relevance: 0.75,
        isPlayoff: false,
        round: null,
        worldSeriesClincher: false,
        isEliminationGame: false,
      },
      {
        season: 5,
        day: 118,
        timestamp: 'S5D118',
        type: 'deadline_buyer',
        description: 'Acquired a frontline starter.',
        impact: 16,
        relevance: 0.7,
        isPlayoff: false,
        round: null,
        worldSeriesClincher: false,
        isEliminationGame: false,
      },
    ]);

    await renderCard();

    const text = container.textContent ?? '';
    // summary counts
    expect(text).toContain('Moments');
    expect(text).toContain('Positive');
    expect(text).toContain('Setbacks');
    // totals: 3 moments, 2 positive (impact +18, +16), 1 negative (impact -14)
    // latest moment (first in the list) is the season 7 deadline_buyer
    expect(text).toContain('Latest');
    expect(text).toContain('Deadline Buyer');
    expect(text).toContain('The front office doubled down on contention.');
    expect(text).toContain('Season 7 · Day 120');
  });

  it('renders negative latest moment with the warning tone', async () => {
    mockWorker.getTeamMoments.mockResolvedValue([
      {
        season: 8,
        day: 182,
        timestamp: 'S8D182',
        type: 'deadline_seller',
        description: 'Rebuild begun at the deadline.',
        impact: -20,
        relevance: 0.8,
        isPlayoff: false,
        round: null,
        worldSeriesClincher: false,
        isEliminationGame: false,
      },
    ]);

    await renderCard();

    const html = container.innerHTML;
    expect(html).toContain('text-accent-danger');
    expect(container.textContent).toContain('Deadline Seller');
    expect(container.textContent).toContain('Rebuild begun at the deadline.');
  });
});
