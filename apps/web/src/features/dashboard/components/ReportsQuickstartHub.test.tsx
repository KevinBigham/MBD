import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ReportsQuickstartHub from './ReportsQuickstartHub';

describe('ReportsQuickstartHub', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('links every core report to an existing playable route', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ReportsQuickstartHub />
        </MemoryRouter>,
      );
    });

    const expectedReports = new Map([
      ['Trade Ledger', '/trade?mode=history'],
      ['Tx Log', '/press-room'],
      ['Season Recap', '/history'],
      ['Draft Log', '/history'],
      ['FA Market', '/free-agency'],
      ['Budget Report', '/finance'],
      ['Player Dev', '/minors'],
      ['History', '/history'],
      ['Records', '/records'],
      ['Pulse', '/pulse'],
      ['News', '/news'],
    ]);

    expect(container.textContent).toContain('Reports Hub');
    expectedReports.forEach((href, label) => {
      const link = Array.from(container.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes(label));
      expect(link?.getAttribute('href')).toBe(href);
    });
  });

  it('offers guided quickstarts for common GM arcs', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ReportsQuickstartHub />
        </MemoryRouter>,
      );
    });

    const quickstarts = new Map([
      ['Contender', '/trade?mode=market'],
      ['Rebuild', '/scenarios'],
      ['Small Market', '/finance'],
      ['Tutorial Day One', '/onboarding'],
    ]);

    expect(container.textContent).toContain('Quickstarts');
    quickstarts.forEach((href, label) => {
      const link = Array.from(container.querySelectorAll('a')).find((anchor) => anchor.textContent?.includes(label));
      expect(link?.getAttribute('href')).toBe(href);
    });
  });
});
