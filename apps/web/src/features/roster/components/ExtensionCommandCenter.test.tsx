import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { ExtensionCommandCenter, type ExtensionCandidateView } from './ExtensionCommandCenter';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ExtensionCommandCenter', () => {
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

  it('prioritizes the best next extension call and pressure watch from existing candidate data', async () => {
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
      {
        playerId: 'ext-3',
        playerName: 'Calm Core',
        position: 'LF',
        yearsRemaining: 3,
        currentSalary: 4.1,
        willingness: 0.72,
        demandMultiplier: 1.05,
        walkAwayThreshold: 0.08,
      },
    ];

    await act(async () => {
      root.render(
        <ExtensionCommandCenter
          candidates={candidates}
          onOpenNegotiation={onOpenNegotiation}
        />,
      );
    });

    expect(container.textContent).toContain('Extension Command Center');
    expect(container.textContent).toContain('Act Now');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('Player Leverage');
    expect(container.textContent).toContain('Walk-Away Risk');
    expect(container.textContent).toContain('Best next call');
    expect(container.textContent).toContain('Diego Future');
    expect(container.textContent).toContain('Pressure watch');
    expect(container.textContent).toContain('Max Leverage');
    expect(container.textContent).toContain('Demand 1.36x');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Diego Future'),
    );

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onOpenNegotiation).toHaveBeenCalledWith(candidates[0]);
  });

  it('does not render an empty command center when there are no extension files', async () => {
    await act(async () => {
      root.render(
        <ExtensionCommandCenter
          candidates={[]}
          onOpenNegotiation={vi.fn()}
        />,
      );
    });

    expect(container.textContent).toBe('');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(0);
  });
});
