import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeOfferCard from './TradeOfferCard';
import type { HotTradeOfferView } from './tradePresentation';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const offer: HotTradeOfferView = {
  id: 'offer-1',
  fromTeamId: 'bos',
  fromTeamName: 'Boston Noreasters',
  fromTeamAbbreviation: 'BOS',
  toTeamId: 'nym',
  toTeamName: 'New York Tycoons',
  toTeamAbbreviation: 'NYT',
  fairnessScore: -6,
  message: 'The Boston Noreasters want to discuss a trade.',
  createdAt: 'S4D118',
  urgencyTag: 'EXPIRING SOON',
  bidderCount: 3,
  biddingSummary: '3 clubs are in on Anthony Volpe.',
  dialogue: {
    mode: 'buyer',
    urgency: 'high',
    headline: 'Boston Noreasters bring a live deadline call',
    lines: ['Right now the offer is light for what you are asking us to surrender.'],
  },
  offeringAssets: [
    {
      key: 'player:bos-1',
      type: 'player',
      label: 'Roman Anthony',
      detail: 'CF',
      asset: { type: 'player', playerId: 'bos-1' },
      playerId: 'bos-1',
    },
  ],
  requestingAssets: [
    {
      key: 'player:nyy-1',
      type: 'player',
      label: 'Anthony Volpe',
      detail: 'SS',
      asset: { type: 'player', playerId: 'nyy-1' },
      playerId: 'nyy-1',
    },
  ],
};

describe('TradeOfferCard', () => {
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

  it('renders offer context and delegates accept, counter, and decline actions', async () => {
    const onAccept = vi.fn();
    const onCounter = vi.fn();
    const onDecline = vi.fn();

    await act(async () => {
      root.render(
        <TradeOfferCard
          offer={offer}
          onAccept={onAccept}
          onCounter={onCounter}
          onDecline={onDecline}
        />,
      );
    });

    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('EXPIRING SOON');
    expect(container.textContent).toContain('GM Dialogue');
    expect(container.textContent).toContain('Right now the offer is light');
    expect(container.textContent).toContain('Roman Anthony · CF');
    expect(container.textContent).toContain('Anthony Volpe · SS');
    expect(container.textContent).toContain('Why they called');
    expect(container.textContent).toContain('Value');
    expect(container.textContent).toContain('Team need');
    expect(container.textContent).toContain('GM personality');
    expect(container.textContent).toContain('Market phase');
    const offerCard = container.querySelector('[data-testid="trade-offer-card"]');
    expect(offerCard?.tagName).toBe('ARTICLE');
    expect(offerCard?.getAttribute('aria-label')).toBe('Trade offer from Boston Noreasters');
    expect(offerCard?.getAttribute('data-from-team-abbreviation')).toBe('BOS');
    const offeringAsset = container.querySelector('[data-testid="trade-offering-asset"]');
    expect(offeringAsset?.getAttribute('data-asset-type')).toBe('player');
    expect(offeringAsset?.getAttribute('data-player-id')).toBe('bos-1');
    const requestingAsset = container.querySelector('[data-testid="trade-requesting-asset"]');
    expect(requestingAsset?.getAttribute('data-asset-type')).toBe('player');
    expect(requestingAsset?.getAttribute('data-player-id')).toBe('nyy-1');

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Accept')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Counter')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Decline')) as HTMLButtonElement).click();
    });

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onCounter).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
