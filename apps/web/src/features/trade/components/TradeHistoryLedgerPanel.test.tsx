import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TradeHistoryLedgerPanel from './TradeHistoryLedgerPanel';
import type { TradeHistoryView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TradeHistoryLedgerPanel', () => {
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

  async function renderPanel(tradeHistory: TradeHistoryView[]) {
    await act(async () => {
      root.render(<TradeHistoryLedgerPanel season={4} tradeHistory={tradeHistory} />);
    });
  }

  it('renders season ledger copy and completed trade rows', async () => {
    await renderPanel([
      {
        id: 'history-1',
        fromTeamId: 'bos',
        fromTeamName: 'Boston Noreasters',
        fromTeamAbbreviation: 'BOS',
        toTeamId: 'sd',
        toTeamName: 'San Diego Surf Hounds',
        toTeamAbbreviation: 'SD',
        fairnessScore: 8,
        summary: 'Boston Noreasters sent a prospect package to San Diego Surf Hounds.',
        timestamp: 'S4D101',
        offeringAssets: [
          {
            key: 'player:bos-1',
            type: 'player',
            label: 'Top Prospect',
            detail: 'CF',
            asset: { type: 'player', playerId: 'bos-1' },
            playerId: 'bos-1',
          },
          {
            key: 'draft:2030:2:bos',
            type: 'draft_pick',
            label: '2030 Round 2',
            detail: 'BOS original pick',
            asset: {
              type: 'draft_pick',
              season: 2030,
              round: 2,
              originalTeamId: 'bos',
            },
          },
        ],
        requestingAssets: [
          {
            key: 'player:sd-1',
            type: 'player',
            label: 'Deadline Starter',
            detail: 'SP',
            asset: { type: 'player', playerId: 'sd-1' },
            playerId: 'sd-1',
          },
        ],
      },
    ]);

    expect(container.textContent).toContain('Trade History');
    expect(container.textContent).toContain('Season 4 ledger');
    expect(container.textContent).toContain('BOS ↔ SD');
    expect(container.textContent).toContain('S4D101');
    expect(container.textContent).toContain('3 assets');
    expect(container.textContent).toContain('Boston Noreasters sent a prospect package');
  });

  it('renders the empty state without completed trades', async () => {
    await renderPanel([]);

    expect(container.textContent).toContain('Trade History');
    expect(container.textContent).toContain('Season 4 ledger');
    expect(container.textContent).toContain('No trades completed yet this season.');
  });
});
