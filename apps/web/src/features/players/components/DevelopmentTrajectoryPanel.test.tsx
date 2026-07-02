import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import DevelopmentTrajectoryPanel from './DevelopmentTrajectoryPanel';
import type { DevelopmentReportsView, PlayerProfilePlayerView } from './playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/shared/components/charts/DevCurveChart', () => ({
  default: () => <div data-testid="mock-dev-curve-chart">Dev curve chart</div>,
}));

const basePlayer = {
  id: 'player-1',
  firstName: 'Marco',
  lastName: 'Ascension',
  position: 'SS',
  displayRating: 58,
  floor: 55,
  ceiling: 72,
  developmentProgram: 'mlb_prep',
  developmentTrajectory: 'ahead_of_curve',
} as PlayerProfilePlayerView;

const history = [{
  season: 5,
  month: 4,
  trajectory: 'ahead_of_curve',
  summary: 'Improved first-step reads and contact quality.',
  overallRating: 345,
}] satisfies DevelopmentReportsView['history'];

describe('DevelopmentTrajectoryPanel', () => {
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

  async function renderPanel({
    player = basePlayer,
    panelHistory = [],
  }: {
    player?: PlayerProfilePlayerView;
    panelHistory?: DevelopmentReportsView['history'];
  } = {}) {
    await act(async () => {
      root.render(<DevelopmentTrajectoryPanel player={player} history={panelHistory} />);
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
  }

  it('renders current development program and projected WAR context', async () => {
    await renderPanel();

    expect(container.textContent).toContain('Development Trajectory');
    expect(container.textContent).toContain('Current Program');
    expect(container.textContent).toContain('Mlb Prep');
    expect(container.textContent).toContain('Ahead Of Curve');
    expect(container.textContent).toContain('Floor');
    expect(container.textContent).toContain('Current');
    expect(container.textContent).toContain('Ceiling');
    expect(container.textContent).toContain('WAR Floor');
    expect(container.textContent).toContain('WAR Now');
    expect(container.textContent).toContain('WAR Ceiling');
  });

  it('renders the dev curve chart slot when checkpoint history exists', async () => {
    await renderPanel({ panelHistory: history });

    expect(container.querySelector('[data-testid="dev-curve-chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mock-dev-curve-chart"]')).not.toBeNull();
  });

  it('uses stable fallbacks when the player has no assigned program', async () => {
    await renderPanel({
      player: {
        ...basePlayer,
        developmentProgram: null,
        floor: null,
        ceiling: null,
      },
    });

    expect(container.textContent).toContain('No assignment');
    expect(container.textContent).toContain('WAR Floor');
    expect(container.textContent).toContain('WAR Ceiling');
  });
});
