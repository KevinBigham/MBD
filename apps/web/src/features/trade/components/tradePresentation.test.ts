import { describe, expect, it } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradePlayerFinancialProjectionView } from '@/workers/sim.worker.trade';
import { buildTradeAssetLabel } from './tradePresentation';

describe('tradePresentation salary support', () => {
  it('shows gross, retained, cash, and current/future buyer responsibility', () => {
    const player = {
      id: 'player-1',
      firstName: 'Mookie',
      lastName: 'Betts',
      position: 'RF',
      contract: { annualSalary: 24 },
    } as PlayerDTO;

    const projection: TradePlayerFinancialProjectionView = {
      playerId: player.id,
      grossAnnualSalary: 24,
      guaranteedEndSeasonExclusive: 7,
      contractEndSeasonExclusive: 8,
      optionSeason: 7,
      existingRetainedSalary: 4,
      existingCashConsideration: 1,
      remainingRetentionHeadroom: 8,
      remainingCurrentSupportHeadroom: 7,
      currentPayerOffsets: [{
        teamId: 'bos',
        retainedSalary: 4,
        cashConsideration: 1,
        total: 5,
      }],
      guaranteedFutureSeason: 5,
      guaranteedFuturePayerOffsets: [{
        teamId: 'bos',
        retainedSalary: 4,
        cashConsideration: 0,
        total: 4,
      }],
    };
    const asset = {
      type: 'player',
      playerId: player.id,
      contractReference: { annualSalary: 24, contractEndSeasonExclusive: 8 },
      retainedSalary: { annualAmount: 5, startSeason: 4, endSeasonExclusive: 7 },
      cashConsideration: { amount: 2, season: 4 },
    } as const;

    expect(buildTradeAssetLabel(asset, () => player, () => projection, 'nym')).toBe(
      'M. Betts · RF · $24.00M gross · $5.00M prior support · $5.00M/yr retained · $2.00M cash now · $12.00M buyer now · $15.00M buyer S5 · $24.00M option S7 uncovered',
    );
    expect(buildTradeAssetLabel(asset, () => player, () => projection, 'bos')).toBe(
      'M. Betts · RF · $24.00M gross · $5.00M prior support · $5.00M/yr retained · $2.00M cash now · $17.00M buyer now · $19.00M buyer S5 · $24.00M option S7 uncovered',
    );
  });
});
