import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonStoryReelModal, { type SeasonStoryReelView } from './SeasonStoryReelModal';

const mockWorker = {
  isReady: true,
  getSeasonStoryReel: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
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
      root.render(<SeasonStoryReelModal seasonYear={seasonYear} onDismiss={onDismiss} />);
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
});
