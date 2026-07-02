import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonUnavailablePanel } from './OffseasonUnavailablePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('OffseasonUnavailablePanel', () => {
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

  it('renders the season-in-progress empty state for non-offseason routes', async () => {
    await act(async () => {
      root.render(<OffseasonUnavailablePanel />);
    });

    expect(container.textContent).toContain('Offseason');
    expect(container.textContent).toContain('The offseason begins after the playoffs conclude.');
    expect(container.textContent).toContain('Season In Progress');
    expect(container.textContent).toContain('arbitration, free agency');
    expect(container.textContent).toContain('roster decisions after the season ends');
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
