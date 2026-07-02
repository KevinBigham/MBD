import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonRule5BoardPanel } from './OffseasonRule5BoardPanel';
import type { Rule5PlayerView, Rule5SelectionView, Rule5View } from './OffseasonRule5Panel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const poolPlayer: Rule5PlayerView = {
  playerId: 'pool-1',
  teamId: 'bos',
  playerName: 'Theo Reserve',
  position: 'RP',
  age: 25,
  overallRating: 319,
  rosterStatus: 'AAA',
  rule5EligibleAfterSeason: 4,
};

const selection: Rule5SelectionView = {
  playerId: 'pick-1',
  playerName: 'Danny Stash',
  originalTeamId: 'ath',
  draftingTeamId: 'bos',
  overallPick: 1,
  round: 1,
};

function makeRule5(overrides: Partial<Rule5View> = {}): Rule5View {
  return {
    phase: 'rule5_draft',
    currentTeamId: 'nym',
    draftOrder: ['nym', 'bos', 'ath'],
    consecutivePasses: 1,
    protectedCount: 4,
    protectedLimit: 40,
    protectedPlayers: [],
    eligiblePlayers: [],
    selections: [selection],
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

describe('OffseasonRule5BoardPanel', () => {
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

  it('renders the Rule 5 board and delegates pass and draft actions when the user is on the clock', async () => {
    const onRule5Pick = vi.fn();
    const onPassRule5Pick = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonRule5BoardPanel
          rule5={makeRule5()}
          rule5Pool={[poolPlayer]}
          userOnClock
          advancing={false}
          onRule5Pick={onRule5Pick}
          onPassRule5Pick={onPassRule5Pick}
        />,
      );
    });

    expect(container.textContent).toContain('Rule 5 Board');
    expect(container.textContent).toContain('On Clock: New York Tycoons');
    expect(container.textContent).toContain('Consecutive Passes 1/3');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('Theo Reserve | RP | Age 25 | OVR 319');
    expect(container.textContent).toContain('Boston Noreasters | Eligible after Season 4');
    expect(container.textContent).toContain('Pick 1: Danny Stash');
    expect(container.textContent).toContain('Boston Noreasters from ATH');

    await act(async () => {
      findButton(container, 'Pass Pick')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      findButton(container, 'Draft')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPassRule5Pick).toHaveBeenCalledTimes(1);
    expect(onRule5Pick).toHaveBeenCalledWith('pool-1');
  });

  it('renders empty board states and disables draft actions off the clock', async () => {
    const onRule5Pick = vi.fn();

    await act(async () => {
      root.render(
        <OffseasonRule5BoardPanel
          rule5={makeRule5({
            currentTeamId: null,
            phase: 'complete',
            consecutivePasses: 3,
            selections: [],
          })}
          rule5Pool={[poolPlayer]}
          userOnClock={false}
          advancing={false}
          onRule5Pick={onRule5Pick}
          onPassRule5Pick={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toContain('On Clock: Complete');
    expect(container.textContent).toContain('No Rule 5 picks have been made yet.');
    expect(findButton(container, 'Pass Pick')).toBeUndefined();

    const draftButton = findButton(container, 'Draft');
    expect(draftButton?.disabled).toBe(true);

    await act(async () => {
      draftButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRule5Pick).not.toHaveBeenCalled();
  });
});
