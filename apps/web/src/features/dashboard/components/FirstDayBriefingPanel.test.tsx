import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FirstDayBriefingPanel from './FirstDayBriefingPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FirstDayBriefingPanel', () => {
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

  it('renders briefing copy and front-office starter links', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <FirstDayBriefingPanel gmName="Casey" onDismiss={vi.fn()} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('First Day Briefing');
    expect(container.textContent).toContain('Welcome, GM Casey');
    expect(container.textContent).toContain('The dashboard is your live intelligence grid.');
    expect(container.textContent).toContain('Check Your Roster');
    expect(container.textContent).toContain('Explore Trades');

    const links = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/roster', '/trade']);
  });

  it('delegates dismissal to the route callback', async () => {
    const onDismiss = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FirstDayBriefingPanel gmName="Casey" onDismiss={onDismiss} />
        </MemoryRouter>,
      );
    });

    const dismissButton = Array.from(container.querySelectorAll('button')).find((button) => (
      button.textContent?.includes('Dismiss')
    ));
    expect(dismissButton).toBeDefined();

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
