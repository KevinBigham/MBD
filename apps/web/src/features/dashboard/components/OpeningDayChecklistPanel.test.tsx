import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OpeningDayChecklistPanel from './OpeningDayChecklistPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('OpeningDayChecklistPanel', () => {
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

  it('renders six first-day checks with destination links and live counts', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <OpeningDayChecklistPanel
            activeTradeOffers={2}
            pressUnreadCount={3}
            topProspectName="Rafa Vega"
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Opening Day Checklist');
    expect(container.textContent).toContain('Six checks before first pitch');
    expect(container.textContent).toContain('Demo desk ready');
    expect(container.textContent).toContain('Roster compliance');
    expect(container.textContent).toContain('Lineup and rotation');
    expect(container.textContent).toContain('Staff, scouting, finance');
    expect(container.textContent).toContain('Rafa Vega is the first pipeline name to keep on your radar.');
    expect(container.textContent).toContain('2 live offers need a verdict.');
    expect(container.textContent).toContain('3 unread items before the first pitch.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const links = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/roster', '/roster', '/staff', '/trade', '/press-room', '/dashboard']);
  });

  it('renders quiet fallback copy when there is no live prospect, trade, or press pressure', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <OpeningDayChecklistPanel
            activeTradeOffers={0}
            pressUnreadCount={0}
            topProspectName={null}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Check staff fit and budget posture before the calendar starts moving.');
    expect(container.textContent).toContain('Set the tone before the market starts calling.');
    expect(container.textContent).toContain('Scan the public narrative before the first pitch.');
    expect(container.textContent).toContain('When the desk is clean, run Sim Day from the dashboard controls.');
  });
});
