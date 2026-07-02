import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import RosterTabs, { type RosterTab } from './RosterTabs';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RosterTabs', () => {
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

  async function renderTabs(activeTab: RosterTab = 'mlb', onChangeTab = vi.fn()) {
    await act(async () => {
      root.render(
        <RosterTabs
          activeTab={activeTab}
          onChangeTab={onChangeTab}
        />,
      );
    });
    return onChangeTab;
  }

  it('renders roster workflow tabs with lineup icon affordance', async () => {
    await renderTabs('lineup');

    const triggers = Array.from(container.querySelectorAll('[role="tab"]'));
    expect(triggers.map((trigger) => trigger.textContent)).toEqual([
      'MLB Control Room',
      'Minor Leagues',
      'Contracts',
      'Lineup Builder',
    ]);
    expect(triggers[3]?.querySelector('svg')).not.toBeNull();
    expect(triggers[3]?.getAttribute('data-state')).toBe('active');
  });

  it('delegates tab changes to the route owner', async () => {
    const onChangeTab = await renderTabs('mlb');
    const contractsTab = Array.from(container.querySelectorAll('[role="tab"]'))
      .find((trigger) => trigger.textContent === 'Contracts');

    await act(async () => {
      contractsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onChangeTab).toHaveBeenCalledWith('contracts');
  });
});
