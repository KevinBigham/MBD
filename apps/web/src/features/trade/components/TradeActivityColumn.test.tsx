import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeActivityColumn, { type HotTradeOfferView } from './TradeActivityColumn';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeNegotiationView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeActivityColumn', () => {
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

  it('renders trade activity sections and routes user actions through callbacks', async () => {
    const onAcceptOffer = vi.fn();
    const onCounterOffer = vi.fn();
    const onDeclineOffer = vi.fn();
    const onResumeNegotiation = vi.fn();
    const playerById = (id: string): PlayerDTO | undefined => ({
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
    });

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

    await act(async () => {
      root.render(
        <TradeActivityColumn
          activeNegotiationId="neg-open"
          incomingOffers={[offer]}
          onAcceptOffer={onAcceptOffer}
          onCounterOffer={onCounterOffer}
          onDeclineOffer={onDeclineOffer}
          onResumeNegotiation={onResumeNegotiation}
          openNegotiations={[negotiation]}
          openNegotiationsLoading={false}
          playerById={playerById}
          season={4}
          ticker={[
            {
              id: 'ticker-1',
              summary: 'Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.',
              timestamp: 'S4D117',
            },
          ]}
          tradeHistory={[
            {
              id: 'history-1',
              fromTeamId: 'orl',
              fromTeamName: 'Orlando Sunbursts',
              fromTeamAbbreviation: 'ORL',
              toTeamId: 'cha',
              toTeamName: 'Charlotte Weavers',
              toTeamAbbreviation: 'CHA',
              fairnessScore: 9,
              summary: 'Orlando Sunbursts sent Drew Example to Charlotte Weavers for Chris Sample.',
              timestamp: 'S4D90',
              offeringAssets: [],
              requestingAssets: [],
            },
          ]}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Hot Offers');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('EXPIRING SOON');
    expect(container.textContent).toContain('GM Dialogue');
    expect(container.textContent).toContain('Right now the offer is light');
    expect(container.textContent).toContain('Active Talks');
    expect(container.textContent).toContain('BOS · Round 2');
    expect(container.textContent).toContain('A. Volpe · SS');
    expect(container.textContent).toContain('R. Anthony · CF');
    expect(container.textContent).toContain('League Trade Ticker');
    expect(container.textContent).toContain('Seattle Drizzle sent Drew Example');
    expect(container.textContent).toContain('Trade History');
    expect(container.textContent).toContain('Orlando Sunbursts sent Drew Example');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(4);

    await act(async () => {
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Accept')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Counter')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Decline')) as HTMLButtonElement).click();
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Resume Talk')) as HTMLButtonElement).click();
    });

    expect(onAcceptOffer).toHaveBeenCalledWith('offer-1');
    expect(onCounterOffer).toHaveBeenCalledWith(offer);
    expect(onDeclineOffer).toHaveBeenCalledWith('offer-1');
    expect(onResumeNegotiation).toHaveBeenCalledWith(negotiation);
  });
});
