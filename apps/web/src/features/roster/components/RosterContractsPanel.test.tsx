import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { RosterContractsPanel } from './RosterContractsPanel';
import type { ExtensionCandidateView } from './ExtensionCommandCenter';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RosterContractsPanel', () => {
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

  it('renders extension command-center and candidate files while delegating negotiation opens', async () => {
    const onOpenNegotiation = vi.fn();
    const candidates: ExtensionCandidateView[] = [
      {
        playerId: 'ext-1',
        playerName: 'Diego Future',
        position: 'SS',
        yearsRemaining: 1,
        currentSalary: 6.8,
        willingness: 0.78,
        demandMultiplier: 1.12,
        walkAwayThreshold: 0.1,
      },
      {
        playerId: 'ext-2',
        playerName: 'Max Leverage',
        position: 'SP',
        yearsRemaining: 2,
        currentSalary: 19.4,
        willingness: 0.48,
        demandMultiplier: 1.36,
        walkAwayThreshold: 0.22,
      },
    ];

    await act(async () => {
      root.render(
        <RosterContractsPanel
          candidates={candidates}
          onOpenNegotiation={onOpenNegotiation}
        />,
      );
    });

    expect(container.textContent).toContain('Extension Command Center');
    expect(container.textContent).toContain('Extension Candidates');
    expect(container.textContent).toContain('2 active files');
    expect(container.textContent).toContain('Diego Future');
    expect(container.textContent).toContain('Current');
    expect(container.textContent).toContain('$6.8M');
    expect(container.textContent).toContain('Demand');
    expect(container.textContent).toContain('1.36x');
    expect(container.textContent).toContain('Willingness');
    expect(container.textContent).toContain('Risk');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Diego Future'),
    );
    const negotiateButton = Array.from(container.querySelectorAll('button'))
      .filter((button) => button.textContent === 'Negotiate')
      .at(-1);

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      negotiateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenNegotiation).toHaveBeenCalledWith(candidates[0]);
    expect(onOpenNegotiation).toHaveBeenCalledWith(candidates[1]);
  });

  it('renders the empty extension-file state without a command center', async () => {
    await act(async () => {
      root.render(
        <RosterContractsPanel
          candidates={[]}
          onOpenNegotiation={vi.fn()}
        />,
      );
    });

    expect(container.textContent).not.toContain('Extension Command Center');
    expect(container.textContent).toContain('0 active files');
    expect(container.textContent).toContain('No extension files are open for this roster right now.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
