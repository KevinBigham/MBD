import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DeadlineTheatreCard from './DeadlineTheatreCard';
import type { TradeDeadlineStateView } from '@/workers/sim.worker.trade';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('DeadlineTheatreCard', () => {
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

  it('renders deadline war-room and market intelligence from the deadline DTO', async () => {
    const deadlineState: TradeDeadlineStateView = {
      currentPhase: 'regular',
      deadlineDay: 122,
      daysUntilDeadline: 4,
      deadlineMode: true,
      teamMode: 'buyer',
      modeSummary: 'The room expects you to push for MLB impact before the deadline shuts.',
      countdownLabel: '4 days to deadline',
      hotOffers: [],
      ticker: [],
      chatter: [
        {
          id: 'buyer-mode',
          headline: 'New York Tycoons are flagged as buyers',
          detail: 'The room is reading urgency around upgrades that move the playoff needle.',
          mode: 'buyer',
          teamId: null,
        },
      ],
      marketIntel: [
        {
          teamId: 'bos',
          teamName: 'Boston Noreasters',
          teamAbbreviation: 'BOS',
          mode: 'buyer',
          gmPersonality: 'aggressive',
          personalityLabel: 'Aggressive',
          posture: 'Aggressive buyer',
          pressureScore: 86,
          pressureLabel: 'Heat rising',
          budgetPressure: 'high',
          needs: ['CF', 'SP'],
          surplus: ['SS', 'RP'],
          activeOfferCount: 3,
          relationshipTier: 'friendly',
          relationshipSummary: 'a trade both sides could justify',
        },
      ],
      warRoom: {
        headline: 'Final sprint war room',
        detail: 'Keep the board narrow and pressure-test every ask.',
        currentCheckpointDay: 118,
        nextCheckpointDay: 120,
        completedCheckpoints: 6,
        totalCheckpoints: 8,
        callsToAction: [
          'Prioritize the hottest incoming offers.',
          'Call one seller before the market closes.',
        ],
      },
      recap: null,
    };

    await act(async () => {
      root.render(<DeadlineTheatreCard deadlineState={deadlineState} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Trade Deadline Theatre');
    expect(container.textContent).toContain('4 days to deadline');
    expect(container.textContent).toContain('Buyer');
    expect(container.textContent).toContain('Final sprint war room');
    expect(container.textContent).toContain('6/8 checkpoints');
    expect(container.textContent).toContain('Prioritize the hottest incoming offers.');
    expect(container.textContent).toContain('Market Intelligence');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Aggressive buyer');
    expect(container.textContent).toContain('Needs: CF, SP');
    expect(container.textContent).toContain('Surplus: SS, RP');
    expect(container.textContent).toContain('Budget heat: High');
    expect(container.textContent).toContain('3 active calls');
    expect(container.textContent).toContain('Friendly memory: a trade both sides could justify');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
