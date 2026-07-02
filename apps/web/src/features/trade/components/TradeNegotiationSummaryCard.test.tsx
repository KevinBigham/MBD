import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeNegotiationSummaryCard from './TradeNegotiationSummaryCard';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const negotiation: TradeNegotiationView = {
  id: 'neg-open',
  teamId: 'bos',
  teamName: 'Boston Noreasters',
  teamAbbreviation: 'BOS',
  phase: 'counter_1',
  roundsCompleted: 2,
  expiresAtDay: 101,
  gmPersonality: 'aggressive',
  personalityLabel: 'Aggressive',
  negotiationPosture: 'Aggressive counter pressure',
  counterOfferSummary: 'Add value now or Boston will move to another call.',
  dialogue: [
    { speaker: 'rival_gm', text: 'Boston left the counter on the table overnight.', tone: 'firm' },
  ],
  proposal: {
    offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
    requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
  },
  counterOffer: {
    offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
    requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
  },
  isComplete: false,
  canAccept: true,
  canCounter: true,
  canReject: true,
};

function playerById(id: string): PlayerDTO | undefined {
  return {
    id,
    firstName: id === 'nyy-1' ? 'Anthony' : 'Roman',
    lastName: id === 'nyy-1' ? 'Volpe' : 'Anthony',
    age: id === 'nyy-1' ? 24 : 22,
    position: id === 'nyy-1' ? 'SS' : 'CF',
    displayRating: id === 'nyy-1' ? 72 : 74,
    overallRating: id === 'nyy-1' ? 72 : 74,
    letterGrade: id === 'nyy-1' ? 'B' : 'A',
    rosterStatus: 'MLB',
    teamId: id === 'nyy-1' ? 'nym' : 'bos',
    serviceTimeDays: 365,
    optionYearsUsed: 1,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 1,
      annualSalary: 2.5,
      totalValue: 2.5,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: id === 'nyy-1' ? 84 : 90,
    floor: id === 'nyy-1' ? 62 : 66,
    developmentProgram: null,
    developmentTrajectory: 'stable',
    extensionHistory: [],
    stats: null,
    advanced: null,
  };
}

describe('TradeNegotiationSummaryCard', () => {
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

  it('renders active negotiation context and delegates resume', async () => {
    const onResume = vi.fn();

    await act(async () => {
      root.render(
        <TradeNegotiationSummaryCard
          active
          negotiation={negotiation}
          onResume={onResume}
          playerById={playerById}
        />,
      );
    });

    expect(container.textContent).toContain('BOS · Round 2');
    expect(container.textContent).toContain('Loaded');
    expect(container.textContent).toContain('Boston left the counter on the table overnight.');
    expect(container.textContent).toContain('A. Volpe · SS');
    expect(container.textContent).toContain('R. Anthony · CF');

    await act(async () => {
      (container.querySelector('button') as HTMLButtonElement).click();
    });

    expect(onResume).toHaveBeenCalledTimes(1);
  });
});
