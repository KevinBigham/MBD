import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonRule5Panel, type Rule5View } from './OffseasonRule5Panel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeRule5(overrides: Partial<Rule5View> = {}): Rule5View {
  return {
    phase: 'protection_audit',
    currentTeamId: null,
    draftOrder: ['ath', 'bos', 'nym'],
    consecutivePasses: 0,
    protectedCount: 4,
    protectedLimit: 40,
    protectedPlayers: [
      {
        playerId: 'keep-1',
        teamId: 'nym',
        playerName: 'Ricky Protect',
        position: 'SS',
        age: 22,
        overallRating: 315,
        rosterStatus: 'AA',
        rule5EligibleAfterSeason: 4,
      },
    ],
    eligiblePlayers: [
      {
        playerId: 'risk-1',
        teamId: 'nym',
        playerName: 'Evan Exposed',
        position: 'SP',
        age: 23,
        overallRating: 328,
        rosterStatus: 'AA',
        rule5EligibleAfterSeason: 4,
      },
      {
        playerId: 'pool-1',
        teamId: 'bos',
        playerName: 'Danny Stash',
        position: 'CF',
        age: 24,
        overallRating: 321,
        rosterStatus: 'AAA',
        rule5EligibleAfterSeason: 4,
      },
    ],
    selections: [],
    obligations: [],
    offerBackStates: [],
    ...overrides,
  };
}

function findButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes(label),
  );
}

describe('OffseasonRule5Panel', () => {
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

  it('renders protection audit lists and delegates protect/lock actions', async () => {
    const onToggleProtection = vi.fn();
    const onLockProtection = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonRule5Panel
          rule5={makeRule5()}
          userTeamId="nym"
          advancing={false}
          onToggleProtection={onToggleProtection}
          onLockProtection={onLockProtection}
          onRule5Pick={vi.fn()}
          onPassRule5Pick={vi.fn()}
          onResolveOfferBack={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('Protection Audit');
    expect(container.textContent).toContain('40-Man 4/40');
    expect(container.textContent).toContain('Ricky Protect');
    expect(container.textContent).toContain('Evan Exposed');
    expect(container.textContent).toContain('Danny Stash');

    await act(async () => {
      findButton(container, 'Protect')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton(container, 'Lock Audit')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onToggleProtection).toHaveBeenCalledWith('risk-1');
    expect(onLockProtection).toHaveBeenCalledTimes(1);
  });

  it('renders the draft board, obligations, and offer-back queue with action delegation', async () => {
    const onRule5Pick = vi.fn();
    const onPassRule5Pick = vi.fn();
    const onResolveOfferBack = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonRule5Panel
          rule5={makeRule5({
            phase: 'rule5_draft',
            currentTeamId: 'nym',
            draftOrder: ['nym', 'bos', 'ath'],
            consecutivePasses: 1,
            protectedPlayers: [],
            eligiblePlayers: [
              {
                playerId: 'pool-2',
                teamId: 'bos',
                playerName: 'Theo Reserve',
                position: 'RP',
                age: 25,
                overallRating: 319,
                rosterStatus: 'AAA',
                rule5EligibleAfterSeason: 4,
              },
            ],
            selections: [
              {
                playerId: 'pick-1',
                playerName: 'Danny Stash',
                originalTeamId: 'ath',
                draftingTeamId: 'bos',
                overallPick: 1,
                round: 1,
              },
            ],
            obligations: [
              {
                playerId: 'offer-1',
                originalTeamId: 'bos',
                draftingTeamId: 'nym',
                draftedAfterSeason: 4,
                status: 'active',
              },
            ],
            offerBackStates: [
              {
                playerId: 'offer-1',
                originalTeamId: 'bos',
                draftingTeamId: 'nym',
                status: 'pending',
              },
            ],
          })}
          userTeamId="nym"
          advancing={false}
          onToggleProtection={vi.fn()}
          onLockProtection={vi.fn()}
          onRule5Pick={onRule5Pick}
          onPassRule5Pick={onPassRule5Pick}
          onResolveOfferBack={onResolveOfferBack}
        />,
      );
    });

    expect(container.textContent).toContain('On Clock: New York Tycoons');
    expect(container.textContent).toContain('Consecutive Passes 1/3');
    expect(container.textContent).toContain('Theo Reserve');
    expect(container.textContent).toContain('Pick 1: Danny Stash');
    expect(container.textContent).toContain('Offer-Back Queue');
    expect(container.textContent).toContain('Offer back offer-1 to Boston Noreasters');

    await act(async () => {
      findButton(container, 'Pass Pick')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton(container, 'Draft')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton(container, 'Return Player')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton(container, 'Original Club Declines')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPassRule5Pick).toHaveBeenCalledTimes(1);
    expect(onRule5Pick).toHaveBeenCalledWith('pool-2');
    expect(onResolveOfferBack).toHaveBeenCalledWith('offer-1', true);
    expect(onResolveOfferBack).toHaveBeenCalledWith('offer-1', false);
  });
});
