import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import AffiliateStandingsPanel, { type AffiliateStandingView } from './AffiliateStandingsPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const affiliates: AffiliateStandingView[] = [
  {
    teamId: 'nym',
    level: 'AAA',
    label: 'Newark Market Makers',
    shortName: 'Market Makers',
    identityNote: 'Near-ready bats with polished plate plans.',
    wins: 48,
    losses: 32,
    gamesPlayed: 80,
    runDifferential: 37,
    topPerformer: {
      playerId: 'prospect-1',
      playerName: 'Marco Ascension',
      statLine: '.322 AVG | 14 HR',
    },
  },
  {
    teamId: 'nym',
    level: 'AA',
    label: 'Albany Blue Chips',
    shortName: 'Blue Chips',
    wins: 35,
    losses: 42,
    gamesPlayed: 77,
    runDifferential: -12,
    topPerformer: null,
  },
];

describe('AffiliateStandingsPanel', () => {
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

  it('renders affiliate records, run differential signs, and top performer copy', async () => {
    await act(async () => {
      root.render(<AffiliateStandingsPanel affiliates={affiliates} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Affiliate standings');
    expect(content).toContain('Newark Market Makers');
    expect(content).toContain('Near-ready bats with polished plate plans.');
    expect(content).toContain('48-32 in 80 G');
    expect(content).toContain('+37');
    expect(content).toContain('Marco Ascension');
    expect(content).toContain('.322 AVG | 14 HR');
    expect(content).toContain('35-42 in 77 G');
    expect(content).toContain('-12');
    expect(container.querySelector('[data-testid="affiliate-mark-nym-AAA"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="affiliate-mark-nym-AA"]')).not.toBeNull();
  });

  it('renders only the panel heading when no affiliates are available', async () => {
    await act(async () => {
      root.render(<AffiliateStandingsPanel affiliates={[]} />);
      await Promise.resolve();
    });

    const content = container.textContent ?? '';
    expect(content).toContain('Affiliate standings');
    expect(content).not.toContain(' in ');
  });
});
