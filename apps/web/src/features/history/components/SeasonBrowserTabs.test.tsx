import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import SeasonBrowserTabs from './SeasonBrowserTabs';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function getButton(container: HTMLElement, label: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

describe('SeasonBrowserTabs', () => {
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

  it('renders every season-browser tab and delegates tab selection', async () => {
    const onSelectTab = vi.fn();

    await act(async () => {
      root.render(
        <SeasonBrowserTabs
          archived={false}
          onSelectTab={onSelectTab}
          selectedTab="standings"
        />,
      );
    });

    expect(container.querySelectorAll('button')).toHaveLength(7);
    expect(getButton(container, 'standings').className).toContain('border-accent-primary');

    await act(async () => {
      getButton(container, 'awards').click();
    });

    expect(onSelectTab).toHaveBeenCalledWith('awards');
  });

  it('disables unavailable detail tabs for compact archived seasons', async () => {
    const onSelectTab = vi.fn();

    await act(async () => {
      root.render(
        <SeasonBrowserTabs
          archived
          onSelectTab={onSelectTab}
          selectedTab="standings"
        />,
      );
    });

    expect(getButton(container, 'transactions').disabled).toBe(true);
    expect(getButton(container, 'draft').disabled).toBe(true);
    expect(getButton(container, 'financials').disabled).toBe(true);
    expect(getButton(container, 'standings').disabled).toBe(false);

    await act(async () => {
      getButton(container, 'transactions').click();
      getButton(container, 'standings').click();
    });

    expect(onSelectTab).toHaveBeenCalledTimes(1);
    expect(onSelectTab).toHaveBeenCalledWith('standings');
  });
});
