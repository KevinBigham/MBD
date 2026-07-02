import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  OffseasonExtensionCandidatesPanel,
  type ExtensionCandidateView,
} from './OffseasonExtensionCandidatesPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const candidates: ExtensionCandidateView[] = [
  {
    playerId: 'ext-1',
    playerName: 'Juan Cornerstone',
    yearsRemaining: 1,
    currentSalary: 9.2,
    willingness: 0.72,
    demandMultiplier: 1.22,
  },
];

describe('OffseasonExtensionCandidatesPanel', () => {
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

  it('renders extension candidate leverage and willingness details', async () => {
    await act(async () => {
      root.render(<OffseasonExtensionCandidatesPanel candidates={candidates} />);
    });

    expect(container.textContent).toContain('Extensions');
    expect(container.textContent).toContain('1 candidates');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Juan Cornerstone');
    expect(container.textContent).toContain('Control');
    expect(container.textContent).toContain('1 yr');
    expect(container.textContent).toContain('$9.2M');
    expect(container.textContent).toContain('72%');
    expect(container.textContent).toContain('Leverage');
  });

  it('renders an empty state when no extension candidates are active', async () => {
    await act(async () => {
      root.render(<OffseasonExtensionCandidatesPanel candidates={[]} />);
    });

    expect(container.textContent).toContain('0 candidates');
    expect(container.textContent).toContain('No extension candidates are active right now.');
  });
});
