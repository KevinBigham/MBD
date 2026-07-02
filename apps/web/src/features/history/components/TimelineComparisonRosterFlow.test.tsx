import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import TimelineComparisonRosterFlow from './TimelineComparisonRosterFlow';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('TimelineComparisonRosterFlow', () => {
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

  it('renders the quiet state when timelines keep the same roster', async () => {
    await act(async () => {
      root.render(<TimelineComparisonRosterFlow rosterDelta={{ added: [], lost: [] }} />);
    });

    expect(container.textContent).toContain('Roster Changes');
    expect(container.textContent).toContain('No roster divergence between timelines.');
  });

  it('renders acquired and lost branch players with directional counts', async () => {
    await act(async () => {
      root.render(
        <TimelineComparisonRosterFlow
          rosterDelta={{
            added: ['Ava Cruz', 'Nolan Fox'],
            lost: ['Mason Reed'],
          }}
        />,
      );
    });

    expect(container.textContent).toContain('+2 Acquired in Branch');
    expect(container.textContent).toContain('Ava Cruz');
    expect(container.textContent).toContain('Nolan Fox');
    expect(container.textContent).toContain('-1 Lost in Branch');
    expect(container.textContent).toContain('Mason Reed');
  });
});
