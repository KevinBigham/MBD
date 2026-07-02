import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import ScoutingViewTabs, { type ScoutingView } from './ScoutingViewTabs';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ScoutingViewTabs', () => {
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

  it('renders the three scouting views and delegates tab changes', async () => {
    const onChangeView = vi.fn<(view: ScoutingView) => void>();

    await act(async () => {
      root.render(<ScoutingViewTabs activeView="international" onChangeView={onChangeView} />);
    });

    expect(container.textContent).toContain('International');
    expect(container.textContent).toContain('Pro Reports');
    expect(container.textContent).toContain('Scout Conflicts');

    const buttons = Array.from(container.querySelectorAll('button'));
    const internationalButton = buttons.find((button) => button.textContent?.includes('International'));
    const proButton = buttons.find((button) => button.textContent?.includes('Pro Reports'));
    const conflictsButton = buttons.find((button) => button.textContent?.includes('Scout Conflicts'));

    expect(internationalButton?.className).toContain('bg-dynasty-elevated');
    expect(proButton?.className).toContain('text-dynasty-muted');
    expect(conflictsButton?.className).toContain('text-dynasty-muted');

    await act(async () => {
      proButton?.click();
      conflictsButton?.click();
    });

    expect(onChangeView).toHaveBeenNthCalledWith(1, 'pro');
    expect(onChangeView).toHaveBeenNthCalledWith(2, 'conflicts');
  });
});
