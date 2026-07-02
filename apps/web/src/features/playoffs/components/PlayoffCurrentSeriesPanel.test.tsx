import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayoffSeriesState } from '@mbd/sim-core';
import PlayoffCurrentSeriesPanel from './PlayoffCurrentSeriesPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const activeSeries: PlayoffSeriesState = {
  id: 'AL-DS-1',
  round: 'DIVISION_SERIES',
  league: 'AL',
  bestOf: 5,
  higherSeed: {
    teamId: 'nym',
    seed: 1,
    wins: 101,
    losses: 61,
    league: 'AL',
    divisionWinner: true,
  },
  lowerSeed: {
    teamId: 'cle',
    seed: 3,
    wins: 94,
    losses: 68,
    league: 'AL',
    divisionWinner: true,
  },
  games: [
    {
      gameNumber: 1,
      winnerId: 'nym',
      loserId: 'cle',
      homeTeamId: 'nym',
      awayTeamId: 'cle',
      homeScore: 5,
      awayScore: 2,
      innings: 9,
      keyPerformers: [
        {
          playerId: 'p1',
          playerName: 'Aaron Judge',
          teamId: 'nym',
          statLine: '3-4, 1 HR, 3 RBI',
        },
      ],
      boxScore: {
        homeTeamId: 'nym',
        awayTeamId: 'cle',
        homeScore: 5,
        awayScore: 2,
        innings: 9,
        homeHits: 8,
        awayHits: 5,
        paResults: [],
        date: '2026-10-03',
        isPlayoff: true,
      },
    },
  ],
  higherSeedWins: 1,
  lowerSeedWins: 0,
  leaderSummary: 'NYY leads 1-0',
  status: 'in_progress',
  winnerId: null,
  loserId: null,
  deficitReached: null,
  deficitTeamId: null,
};

describe('PlayoffCurrentSeriesPanel', () => {
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
    vi.clearAllMocks();
  });

  function renderPanel(
    overrides: Partial<{
      activeSeries: PlayoffSeriesState | null;
      busyAction: string | null;
      champion: string | null;
      onSimNextGame: () => void;
      onSimSeries: () => void;
      onSimRound: () => void;
      onSimRemainingPlayoffs: () => void;
    }> = {},
  ) {
    const callbacks = {
      onSimNextGame: overrides.onSimNextGame ?? vi.fn(),
      onSimSeries: overrides.onSimSeries ?? vi.fn(),
      onSimRound: overrides.onSimRound ?? vi.fn(),
      onSimRemainingPlayoffs: overrides.onSimRemainingPlayoffs ?? vi.fn(),
    };

    act(() => {
      root.render(
        <PlayoffCurrentSeriesPanel
          activeSeries={Object.prototype.hasOwnProperty.call(overrides, 'activeSeries')
            ? overrides.activeSeries ?? null
            : activeSeries}
          busyAction={overrides.busyAction ?? null}
          champion={Object.prototype.hasOwnProperty.call(overrides, 'champion')
            ? overrides.champion ?? null
            : null}
          dynastyScore={{ score: 215, grade: 'B' }}
          onSimNextGame={callbacks.onSimNextGame}
          onSimRemainingPlayoffs={callbacks.onSimRemainingPlayoffs}
          onSimRound={callbacks.onSimRound}
          onSimSeries={callbacks.onSimSeries}
        />,
      );
    });

    return callbacks;
  }

  it('renders the active series controls and game log', () => {
    const callbacks = renderPanel();

    expect(container.textContent).toContain('Current Series');
    expect(container.textContent).toContain('NYY leads 1-0');
    expect(container.textContent).toContain('NYM vs CLE');
    expect(container.textContent).toContain('Sim Next Game');
    expect(container.textContent).toContain('Sim Series');
    expect(container.textContent).toContain('Sim Round');
    expect(container.textContent).toContain('Sim All');
    expect(container.textContent).toContain('Game 1: CLE 2, NYM 5');
    expect(container.textContent).toContain('Aaron Judge');

    const nextGameButton = container.querySelector('[data-mobile-critical-control="playoffs-sim-next-game"]');
    const simAllButton = container.querySelector('[data-mobile-critical-control="playoffs-sim-all"]');

    expect(nextGameButton).toBeInstanceOf(HTMLButtonElement);
    expect(nextGameButton?.className).toContain('mobile-critical-control');
    expect(nextGameButton?.className).toContain('focus-ring');
    expect(simAllButton).toBeInstanceOf(HTMLButtonElement);

    act(() => {
      nextGameButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      simAllButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(callbacks.onSimNextGame).toHaveBeenCalledTimes(1);
    expect(callbacks.onSimRemainingPlayoffs).toHaveBeenCalledTimes(1);
  });

  it('disables active series controls while a sim action is busy', () => {
    renderPanel({ busyAction: 'round' });

    const nextGameButton = container.querySelector('[data-mobile-critical-control="playoffs-sim-next-game"]');

    expect(nextGameButton).toBeInstanceOf(HTMLButtonElement);
    expect((nextGameButton as HTMLButtonElement | null)?.disabled).toBe(true);
  });

  it('renders champion and waiting states without worker calls', () => {
    renderPanel({ activeSeries: null, champion: 'nym' });

    expect(container.textContent).toContain('Champion');
    expect(container.textContent).toContain('NYM won the World Series');
    expect(container.textContent).toContain('Dynasty grade B with 215 points');

    renderPanel({ activeSeries: null, champion: null });

    expect(container.textContent).toContain('Bracket not initialized');
    expect(container.textContent).toContain('Playoff bracket is waiting');
    expect(container.querySelector('[data-mobile-critical-control="playoffs-start-bracket"]')).toBeInstanceOf(
      HTMLButtonElement,
    );
  });
});
