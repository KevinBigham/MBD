import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeNegotiationPanel from './TradeNegotiationPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createPlayer(id: string): PlayerDTO {
  const isUserPlayer = id === 'nyy-1';
  return {
    id,
    firstName: isUserPlayer ? 'Anthony' : 'Roman',
    lastName: isUserPlayer ? 'Volpe' : 'Anthony',
    age: isUserPlayer ? 24 : 22,
    position: isUserPlayer ? 'SS' : 'CF',
    overallRating: isUserPlayer ? 72 : 74,
    displayRating: isUserPlayer ? 72 : 74,
    letterGrade: isUserPlayer ? 'B' : 'A',
    rosterStatus: 'MLB',
    teamId: isUserPlayer ? 'nym' : 'bos',
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
    ceiling: isUserPlayer ? 84 : 90,
    floor: isUserPlayer ? 62 : 66,
    developmentProgram: null,
    developmentTrajectory: 'stable',
    extensionHistory: [],
    stats: null,
    advanced: null,
  };
}

describe('TradeNegotiationPanel', () => {
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

  it('renders active negotiation context and routes decisions through callbacks', async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const onCounter = vi.fn();
    const playerById = (id: string): PlayerDTO | undefined => createPlayer(id);
    const negotiation: TradeNegotiationView = {
      id: 'neg-open',
      teamId: 'bos',
      teamName: 'Boston Noreasters',
      teamAbbreviation: 'BOS',
      gmPersonality: 'aggressive',
      personalityLabel: 'Aggressive',
      negotiationPosture: 'Aggressive counter pressure',
      counterOfferSummary: 'Add value now or Boston will move to another call.',
      phase: 'counter_1',
      roundsCompleted: 2,
      expiresAtDay: 101,
      dialogue: [
        { speaker: 'rival_gm', text: 'Boston left the counter on the table overnight.', tone: 'firm' },
        { speaker: 'agm_advisor', text: 'This is close enough to keep alive.', tone: 'firm' },
      ],
      proposal: {
        offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
        requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
      },
      counterOffer: null,
      isComplete: false,
      canAccept: true,
      canCounter: true,
      canReject: true,
    };

    await act(async () => {
      root.render(
        <TradeNegotiationPanel
          dialogueMode="buyer"
          negotiation={negotiation}
          onAccept={onAccept}
          onCounter={onCounter}
          onReject={onReject}
          playerById={playerById}
          proposing={false}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Negotiation Round');
    expect(container.textContent).toContain('Counter 1');
    expect(container.textContent).toContain('Aggressive');
    expect(container.textContent).toContain('Aggressive counter pressure');
    expect(container.textContent).toContain('Add value now');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('AGM Advisor');
    expect(container.textContent).toContain('A. Volpe · SS');
    expect(container.textContent).toContain('R. Anthony · CF');

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Accept') as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Reject') as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Counter') as HTMLButtonElement).click();
    });

    expect(onAccept).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    expect(onCounter).toHaveBeenCalledOnce();
  });
});
