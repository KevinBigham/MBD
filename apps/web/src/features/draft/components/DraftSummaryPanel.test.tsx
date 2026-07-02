import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { DraftSummaryPanel } from './DraftSummaryPanel';
import type { DraftRoomView } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeDraft(overrides: Partial<DraftRoomView> = {}): DraftRoomView {
  return {
    status: 'complete',
    availableProspects: [],
    udfaProspects: [],
    completedPicks: [],
    currentPick: null,
    board: { teams: [], rounds: [] },
    counts: { totalRounds: 20, totalPicks: 600, picksMade: 600, picksRemaining: 0 },
    userDraftClass: {
      overallGrade: 'B+',
      averageScoutingGrade: 58,
      picks: [
        {
          playerId: 'pick-1',
          playerName: 'Eli Prospect',
          position: 'SS',
          scoutingGrade: 61,
          origin: 'HS',
          slotValue: 2.4,
          askBonus: 2.8,
          signed: null,
          agreedBonus: null,
          assessment: 'Strong value with a realistic path to contributing.',
        },
        {
          playerId: 'pick-2',
          playerName: 'Maya College',
          position: 'SP',
          scoutingGrade: 54,
          origin: 'College',
          slotValue: 1.1,
          askBonus: 1.2,
          signed: true,
          agreedBonus: 1.15,
          assessment: 'Strike-thrower with a stable starter floor.',
        },
        {
          playerId: 'pick-3',
          playerName: 'Noah Prep',
          position: 'CF',
          scoutingGrade: 47,
          origin: 'HS',
          slotValue: 0.8,
          askBonus: 1,
          signed: false,
          agreedBonus: null,
          assessment: 'Toolsy but expensive relative to the slot.',
        },
      ],
    },
    userBigBoard: [],
    ...overrides,
  };
}

describe('DraftSummaryPanel', () => {
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

  it('renders nothing until the draft is complete with a user draft class', async () => {
    await act(async () => {
      root.render(
        <DraftSummaryPanel
          draft={makeDraft({ status: 'in_progress', userDraftClass: null })}
          bonusOffers={{}}
          onBonusChange={vi.fn()}
          onSign={vi.fn()}
          signingPlayerId={null}
        />,
      );
    });

    expect(container.textContent).toBe('');
  });

  it('renders draft class picks and delegates bonus edits and signing actions', async () => {
    const onBonusChange = vi.fn();
    const onSign = vi.fn();

    await act(async () => {
      root.render(
        <DraftSummaryPanel
          draft={makeDraft()}
          bonusOffers={{ 'pick-1': '2.95' }}
          onBonusChange={onBonusChange}
          onSign={onSign}
          signingPlayerId={null}
        />,
      );
    });

    expect(container.textContent).toContain('Your Draft Class');
    expect(container.textContent).toContain('Overall Grade B+');
    expect(container.textContent).toContain('Average scouting grade 58');
    expect(container.textContent).toContain('Draft Complete');
    expect(container.textContent).toContain('Eli Prospect');
    expect(container.textContent).toContain('Slot $2.40M · Ask $2.80M');
    expect(container.textContent).toContain('Strong value with a realistic path');
    expect(container.textContent).toContain('Maya College');
    expect(container.textContent).toContain('Agreed $1.15M');
    expect(container.textContent).toContain('Noah Prep');
    expect(container.textContent).toContain('Declined');

    const firstInput = container.querySelector('input') as HTMLInputElement;
    expect(firstInput.value).toBe('2.95');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(firstInput, '3.05');
      firstInput.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(onBonusChange).toHaveBeenCalledWith('pick-1', '3.05');

    const buttons = Array.from(container.querySelectorAll('button'));
    const firstButton = buttons.find((button) => button.textContent === 'Offer Bonus');
    expect(firstButton?.getAttribute('data-mobile-critical-control')).toBe('draft-bonus-offer');
    expect(firstButton?.className).toContain('mobile-critical-control');
    expect(firstButton?.hasAttribute('disabled')).toBe(false);

    await act(async () => {
      firstButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onSign).toHaveBeenCalledWith('pick-1');
  });
});
