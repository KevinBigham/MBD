import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import HistoryMainTabs from './HistoryMainTabs';
import { HISTORY_TABS, type HistoryTab } from '../lib/historyPageTransforms';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('HistoryMainTabs', () => {
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

  async function renderTabs(options: {
    selectedTab?: HistoryTab;
    tabs?: readonly HistoryTab[];
    onSelectTab?: (tab: HistoryTab) => void;
  } = {}) {
    await act(async () => {
      root.render(
        <HistoryMainTabs
          onSelectTab={options.onSelectTab ?? vi.fn()}
          selectedTab={options.selectedTab ?? 'seasons'}
          tabs={options.tabs ?? HISTORY_TABS}
        />,
      );
    });
  }

  it('renders labeled route tabs with mobile-critical controls', async () => {
    await renderTabs({ selectedTab: 'leaders' });

    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.map((button) => button.textContent)).toEqual([
      'records',
      'seasons',
      'All-Time Leaders',
      'timeline',
      'Legacy',
      'Awards / HOF',
    ]);
    expect(buttons.every((button) =>
      button.getAttribute('data-mobile-critical-control') === 'history-main-tab',
    )).toBe(true);
    expect(buttons.every((button) =>
      button.className.includes('mobile-critical-control'),
    )).toBe(true);
    expect(buttons[2]?.className).toContain('border-accent-primary');
    expect(buttons[0]?.className).toContain('border-dynasty-border');
  });

  it('delegates tab selection and renders the provided visible tab list only', async () => {
    const onSelectTab = vi.fn();
    await renderTabs({
      onSelectTab,
      tabs: HISTORY_TABS.filter((tab) => tab !== 'timeline'),
    });

    const timelineButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'timeline');
    expect(timelineButton).toBeUndefined();

    const awardsButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent === 'Awards / HOF');
    expect(awardsButton).toBeTruthy();

    await act(async () => {
      awardsButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectTab).toHaveBeenCalledWith('awards');
  });
});
