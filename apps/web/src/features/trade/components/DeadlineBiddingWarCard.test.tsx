import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DeadlineBiddingWarCard from './DeadlineBiddingWarCard';
import type { ActiveBiddingWar } from './DeadlineDramaPanelBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeadlineBiddingWarCard', () => {
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
  });

  async function renderCard(war: ActiveBiddingWar) {
    await act(async () => {
      root.render(<DeadlineBiddingWarCard war={war} />);
    });
  }

  it('sorts bidding rounds and highlights the settled winner', async () => {
    await renderCard({
      targetPlayerId: 'target-1',
      targetPlayerName: 'Roman Anthony',
      winnerId: 'bos',
      settled: true,
      rounds: [
        {
          teamId: 'bos',
          offerDescription: 'Boston added a controllable starter.',
          round: 2,
        },
        {
          teamId: 'nym',
          offerDescription: 'New York offered a top-100 infielder.',
          round: 1,
        },
      ],
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Active Bidding War');
    expect(text).toContain('Settled');
    expect(text).toContain('Roman Anthony');
    expect(text.indexOf('New York offered')).toBeLessThan(text.indexOf('Boston added'));

    const winningOffer = Array.from(container.querySelectorAll('div')).find((element) =>
      element.textContent?.includes('Boston added a controllable starter.')
      && element.className.includes('rounded-lg border px-3 py-2'),
    );
    expect(winningOffer?.className).toContain('border-accent-success');
  });

  it('omits settled treatment while a bidding war is still active', async () => {
    await renderCard({
      targetPlayerId: 'target-2',
      targetPlayerName: 'Sandy Alcantara',
      winnerId: null,
      settled: false,
      rounds: [
        {
          teamId: 'lad',
          offerDescription: 'Los Angeles framed a rental-heavy offer.',
          round: 1,
        },
      ],
    });

    expect(container.textContent).toContain('Sandy Alcantara');
    expect(container.textContent).not.toContain('Settled');
    expect(container.innerHTML).not.toContain('border-accent-success/40');
  });
});
