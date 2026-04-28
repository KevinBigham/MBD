import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SeasonStoryReelModal, { type SeasonStoryReelView } from './SeasonStoryReelModal';

const mockWorker = {
  isReady: true,
  getSeasonStoryReel: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

// useGameStore selector form: mock returns `state.season` value regardless
// of which selector the component passes. Default current season is 2028.
let currentSeason = 2028;
vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: (selector: (state: { season: number }) => unknown) =>
    selector({ season: currentSeason }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseView: SeasonStoryReelView = {
  season: 2028,
  userTeamId: 'nym',
  userTeamName: 'New York Mets',
  userTeamAbbreviation: 'NYM',
  record: { wins: 98, losses: 64 },
  divisionRank: 1,
  playoffResult: 'World Series Champion',
  storylines: ['A dominant run from wire to wire.', 'Ace staff powered the chase.'],
  timelineEvents: [
    { headline: 'Opening Day Walkoff', summary: 'Tenth-inning heroics in the Bronx.', day: 1 },
    { headline: 'All-Star Sweep', summary: 'Three Mets start in the Midsummer Classic.', day: 92 },
  ],
  signatureBeats: [
    {
      type: 'championship_run',
      description: 'Finished a season for the ages with a World Series title.',
      day: 172,
      impact: 90,
      relevance: 95,
    },
    {
      type: 'contention_collapse',
      description: 'Lost three straight to divisional rivals in August.',
      day: 134,
      impact: -40,
      relevance: 72,
    },
  ],
  keyTransactions: [
    { headline: 'Acquired Ace at the Deadline', summary: 'Traded for Cy Young contender to anchor rotation.', impactScore: 88 },
  ],
  playoffPath: [
    { round: 'division_series', result: '3-1', opponentTeamId: 'atl', opponentTeamName: 'Atlanta Braves', didWin: true },
    { round: 'championship_series', result: '4-2', opponentTeamId: 'phi', opponentTeamName: 'Philadelphia Phillies', didWin: true },
    { round: 'world_series', result: '4-3', opponentTeamId: 'hou', opponentTeamName: 'Houston Astros', didWin: true },
  ],
  awards: [
    { award: 'mvp', playerId: 'p1', playerName: 'Juan Soto', league: 'NL', summary: 'Slash line of .312/.430/.610.' },
  ],
  statLeaderHighlights: [
    { category: 'HR', playerId: 'p2', playerName: 'Pete Alonso', teamId: 'nym', teamAbbreviation: 'NYM', value: '46' },
    { category: 'ERA', playerId: 'p3', playerName: 'Kodai Senga', teamId: 'nym', teamAbbreviation: 'NYM', value: '2.51' },
  ],
  playerArcs: [],
};

describe('SeasonStoryReelModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getSeasonStoryReel.mockReset();
    onDismiss = vi.fn();
    currentSeason = 2028;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderModal(seasonYear = 2028) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SeasonStoryReelModal seasonYear={seasonYear} onDismiss={onDismiss} />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty state when worker returns null for the season', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(null);

    await renderModal(2019);

    const text = container.textContent ?? '';
    expect(text).toContain('Season Story Reel');
    expect(text).toContain('Season 2019');
    expect(text).toContain('No archive exists for Season 2019 yet.');
    expect(mockWorker.getSeasonStoryReel).toHaveBeenCalledWith(2019);
  });

  it('renders every section when the archive is rich', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const text = container.textContent ?? '';
    expect(text).toContain('Season 2028 — New York Mets');
    expect(text).toContain('98-64');
    expect(text).toContain('1st in division');
    expect(text).toContain('World Series Champion');
    expect(text).toContain('Storylines');
    expect(text).toContain('A dominant run from wire to wire.');
    expect(text).toContain('Timeline');
    expect(text).toContain('Opening Day Walkoff');
    expect(text).toContain('Signature Beats');
    expect(text).toContain('Championship Run');
    expect(text).toContain('Contention Collapse');
    expect(text).toContain('Key Transactions');
    expect(text).toContain('Acquired Ace at the Deadline');
    expect(text).toContain('Playoff Path');
    expect(text).toContain('Division Series');
    expect(text).toContain('vs Atlanta Braves');
    expect(text).toContain('Awards');
    expect(text).toContain('Mvp');
    expect(text).toContain('Juan Soto');
    expect(text).toContain('Stat Leaders');
    expect(text).toContain('Pete Alonso');
    expect(text).toContain('Kodai Senga');
  });

  it('renders Notable Player Arcs section when playerArcs are present', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue({
      ...baseView,
      playerArcs: [
        {
          playerId: 'p-redeem',
          playerName: 'Marcus Rivera',
          arcType: 'redemption_arc',
          description: 'Roared back with a 5.1 WAR season after a lost year.',
          relevance: 0.93,
        },
        {
          playerId: 'p-veteran',
          playerName: 'Henry Ishikawa',
          arcType: 'late_career_peak',
          description: 'Posted a career-best season at age 38.',
          relevance: 0.91,
        },
        {
          playerId: 'p-rookie',
          playerName: 'Tito Delgado',
          arcType: 'rookie_breakout',
          description: 'Debut season 4.0 WAR and ROY vote share.',
          relevance: 0.88,
        },
      ],
    });

    await renderModal(2028);

    const text = container.textContent ?? '';
    expect(text).toContain('Notable Player Arcs');
    expect(text).toContain('Marcus Rivera');
    expect(text).toContain('Redemption');
    expect(text).toContain('Henry Ishikawa');
    expect(text).toContain('Late-Career Peak');
    expect(text).toContain('Tito Delgado');
    expect(text).toContain('Rookie Breakout');
    expect(text).toContain('5.1 WAR season');

    const playerLink = container.querySelector('a[href="/players/p-redeem?tab=moments"]');
    expect(playerLink).not.toBeNull();
  });

  it('does not render Notable Player Arcs when playerArcs is empty', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const text = container.textContent ?? '';
    expect(text).not.toContain('Notable Player Arcs');
  });

  it('dismisses on Escape key', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on backdrop click and suppresses click inside the dialog', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const backdrop = container.querySelector('[role="dialog"]') as HTMLElement;
    const dialog = backdrop.querySelector('div') as HTMLElement;

    await act(async () => {
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the close button is clicked', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const closeBtn = container.querySelector('button[aria-label="Close season story reel"]') as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses 44px header controls for touch devices', async () => {
    currentSeason = 2029;
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const closeButton = container.querySelector(
      'button[aria-label="Close season story reel"]',
    ) as HTMLButtonElement;
    const previousButton = container.querySelector(
      'button[aria-label="Previous season"]',
    ) as HTMLButtonElement;
    const nextButton = container.querySelector(
      'button[aria-label="Next season"]',
    ) as HTMLButtonElement;

    for (const button of [closeButton, previousButton, nextButton]) {
      expect(button.className).toContain('min-h-11');
      expect(button.className).toContain('min-w-11');
    }
  });

  it('falls back to quiet-season prompt when all sections are empty', async () => {
    mockWorker.getSeasonStoryReel.mockResolvedValue({
      ...baseView,
      playoffResult: null,
      storylines: [],
      timelineEvents: [],
      signatureBeats: [],
      keyTransactions: [],
      playoffPath: [],
      awards: [],
      statLeaderHighlights: [],
    });

    await renderModal(2028);

    const text = container.textContent ?? '';
    expect(text).toContain('Season 2028 wrapped with a quiet record');
  });

  it('navigates to the prior season when the previous-season button is clicked', async () => {
    currentSeason = 2028;
    mockWorker.getSeasonStoryReel.mockImplementation(async (year: number) => ({
      ...baseView,
      season: year,
    }));

    await renderModal(2028);
    expect(mockWorker.getSeasonStoryReel).toHaveBeenLastCalledWith(2028);

    const prevBtn = container.querySelector('button[aria-label="Previous season"]') as HTMLButtonElement;
    expect(prevBtn).not.toBeNull();
    expect(prevBtn.disabled).toBe(false);

    await act(async () => {
      prevBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockWorker.getSeasonStoryReel).toHaveBeenLastCalledWith(2027);
    expect(container.textContent ?? '').toContain('Season 2027');
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('disables the next-season button when already at the current season', async () => {
    currentSeason = 2028;
    mockWorker.getSeasonStoryReel.mockResolvedValue(baseView);

    await renderModal(2028);

    const nextBtn = container.querySelector('button[aria-label="Next season"]') as HTMLButtonElement;
    expect(nextBtn).not.toBeNull();
    expect(nextBtn.disabled).toBe(true);
  });

  it('disables the previous-season button at season 1', async () => {
    currentSeason = 5;
    mockWorker.getSeasonStoryReel.mockImplementation(async (year: number) => ({
      ...baseView,
      season: year,
    }));

    await renderModal(1);

    const prevBtn = container.querySelector('button[aria-label="Previous season"]') as HTMLButtonElement;
    expect(prevBtn).not.toBeNull();
    expect(prevBtn.disabled).toBe(true);
  });

  it('supports ArrowLeft / ArrowRight keys for season navigation', async () => {
    currentSeason = 2028;
    mockWorker.getSeasonStoryReel.mockImplementation(async (year: number) => ({
      ...baseView,
      season: year,
    }));

    await renderModal(2027);
    expect(mockWorker.getSeasonStoryReel).toHaveBeenLastCalledWith(2027);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWorker.getSeasonStoryReel).toHaveBeenLastCalledWith(2028);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(mockWorker.getSeasonStoryReel).toHaveBeenLastCalledWith(2027);

    // Escape still dismisses — arrow key handling must not have stolen it
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
