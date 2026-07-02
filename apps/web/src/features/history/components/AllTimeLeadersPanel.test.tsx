import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AllTimeLeadersPanel, { type AllTimeLeadersView } from './AllTimeLeadersPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const leaders: AllTimeLeadersView = {
  batting: {
    hits: [
      { playerId: 'p-hit-1', playerName: 'Maya Torres', value: 2801, display: '2,801' },
      { playerId: 'p-hit-2', playerName: 'Sam Ortega', value: 2570, display: '2,570' },
    ],
    hr: [
      { playerId: 'p-hr-1', playerName: 'Riley Stone', value: 612, display: '612' },
    ],
    rbi: [],
  },
  pitching: {
    wins: [
      { playerId: 'p-win-1', playerName: 'Nolan Cruz', value: 241, display: '241' },
    ],
    strikeouts: [
      { playerId: 'p-k-1', playerName: 'Elena Vargas', value: 3099, display: '3,099' },
    ],
    era: [
      { playerId: 'p-era-1', playerName: 'Jon Bell', value: 2.91, display: '2.91' },
    ],
    saves: [],
  },
};

describe('AllTimeLeadersPanel', () => {
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

  it('renders batting and pitching career leaderboards', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AllTimeLeadersPanel allTimeLeaders={leaders} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Career Batting Leaders');
    expect(container.textContent).toContain('Career Pitching Leaders');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.textContent).toContain('Hits');
    expect(container.textContent).toContain('Maya Torres');
    expect(container.textContent).toContain('2,801');
    expect(container.textContent).toContain('Home Runs');
    expect(container.textContent).toContain('Riley Stone');
    expect(container.textContent).toContain('ERA (min 200 IP)');
    expect(container.textContent).toContain('Jon Bell');
    expect(container.textContent).toContain('No leaders recorded yet.');
  });

  it('renders an empty state before career leaderboards are available', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AllTimeLeadersPanel allTimeLeaders={null} />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('No career stats recorded yet');
    expect(container.textContent).toContain('Complete a full season to start building the all-time leaderboards.');
    expect(container.textContent).not.toContain('Career Batting Leaders');
  });
});
