import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BoxScoreContentPanel, { type GamePlayByPlayView } from './BoxScoreContentPanel';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => <span data-testid={`team-logo-${teamId}`} />,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const boxScoreView: GamePlayByPlayView = {
  gameIndex: 12,
  recap: 'Jones delivers a late rally for NYM.',
  highlights: [],
  plays: [
    { inning: 1, halfInning: 'top', text: 'Smith scores on a double.', isHighlight: false },
    { inning: 1, halfInning: 'top', text: 'Jones homers to left.', isHighlight: true },
    { inning: 9, halfInning: 'bottom', text: 'Rivera scores the winner.', isHighlight: true },
  ],
  boxScore: {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 5,
    awayScore: 3,
    innings: 9,
    homeHits: 10,
    awayHits: 7,
  },
};

describe('BoxScoreContentPanel', () => {
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

  it('renders the score header, line score, recap, and grouped play-by-play', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <BoxScoreContentPanel
            data={boxScoreView}
            enhancedPlayByPlaySlot={<div>Enhanced broadcast slot</div>}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Back to Schedule');
    expect(container.textContent).toContain('FINAL');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('NYM');
    expect(container.textContent).toContain('Jones delivers a late rally for NYM.');
    expect(container.textContent).toContain('Enhanced broadcast slot');
    expect(container.textContent).toContain('Top of the 1st');
    expect(container.textContent).toContain('Bottom of the 9th');
    expect(container.textContent).toContain('Smith scores on a double.');
    expect(container.textContent).toContain('Jones homers to left.');
    expect(container.textContent).toContain('Rivera scores the winner.');

    const rows = Array.from(container.querySelectorAll('tbody tr'));
    expect(rows[0]?.textContent).toContain('BOS');
    expect(rows[0]?.textContent).toContain('2');
    expect(rows[0]?.textContent).toContain('3');
    expect(rows[0]?.textContent).toContain('7');
    expect(rows[1]?.textContent).toContain('NYM');
    expect(rows[1]?.textContent).toContain('1');
    expect(rows[1]?.textContent).toContain('5');
    expect(rows[1]?.textContent).toContain('10');
  });

  it('renders the empty play-by-play state when no classic plays are available', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <BoxScoreContentPanel
            data={{
              ...boxScoreView,
              recap: '',
              plays: [],
            }}
            enhancedPlayByPlaySlot={null}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).not.toContain('Game Recap');
    expect(container.textContent).toContain('No play-by-play available.');
  });
});
