import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayoffBracket } from '@mbd/sim-core';
import type { SeasonFlowPreviewSeries } from '@/app/layout/seasonFlow';
import { PlayoffsContentPanel } from './PlayoffsContentPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const playoffPreview: SeasonFlowPreviewSeries[] = [
  {
    id: 'AL-DS-1',
    round: 'Division Series',
    bestOf: 5,
    home: {
      teamId: 'nym',
      teamName: 'New York Tycoons',
      abbreviation: 'NYT',
      seed: 1,
      placeholder: null,
    },
    away: {
      teamId: 'cle',
      teamName: 'Cleveland Forge',
      abbreviation: 'CLE',
      seed: 3,
      placeholder: null,
    },
  },
  {
    id: 'WS-1',
    round: 'World Series',
    bestOf: 7,
    home: {
      teamId: null,
      teamName: 'AL Champion',
      abbreviation: 'TBD',
      seed: null,
      placeholder: 'AL Champion',
    },
    away: {
      teamId: null,
      teamName: 'NL Champion',
      abbreviation: 'TBD',
      seed: null,
      placeholder: 'NL Champion',
    },
  },
];

const activeBracket = {
  seeds: [
    { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
    { teamId: 'cle', seed: 3, wins: 94, losses: 68, league: 'AL', divisionWinner: true },
  ],
  currentRound: 'DIVISION_SERIES',
  currentRoundSeries: [
    {
      id: 'AL-DS-1',
      round: 'DIVISION_SERIES',
      league: 'AL',
      bestOf: 5,
      higherSeed: { teamId: 'nym', seed: 1, wins: 101, losses: 61, league: 'AL', divisionWinner: true },
      lowerSeed: { teamId: 'cle', seed: 3, wins: 94, losses: 68, league: 'AL', divisionWinner: true },
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
            { playerId: 'p1', playerName: 'Aaron Judge', teamId: 'nym', statLine: '3-4, 1 HR, 3 RBI' },
          ],
          boxScore: {
            gameId: 'g1',
            homeTeamId: 'nym',
            awayTeamId: 'cle',
            homeScore: 5,
            awayScore: 2,
            innings: 9,
            events: [],
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
    },
  ],
  completedRounds: [],
  series: [],
  champion: null,
  runnerUp: null,
} as unknown as PlayoffBracket;

const championBracket = {
  ...activeBracket,
  currentRoundSeries: [],
  champion: 'nym',
  runnerUp: 'lax',
} as unknown as PlayoffBracket;

describe('PlayoffsContentPanel', () => {
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
      bracket: PlayoffBracket | null;
      busyAction: string | null;
      onSimNextGame: () => void;
      onSimSeries: () => void;
      onSimRound: () => void;
      onSimRemainingPlayoffs: () => void;
    }> = {},
  ) {
    const onSimNextGame = overrides.onSimNextGame ?? vi.fn();
    const onSimSeries = overrides.onSimSeries ?? vi.fn();
    const onSimRound = overrides.onSimRound ?? vi.fn();
    const onSimRemainingPlayoffs = overrides.onSimRemainingPlayoffs ?? vi.fn();
    const bracket = Object.prototype.hasOwnProperty.call(overrides, 'bracket')
      ? overrides.bracket ?? null
      : activeBracket;

    act(() => {
      root.render(
        <PlayoffsContentPanel
          bracket={bracket}
          busyAction={overrides.busyAction ?? null}
          dynastyScore={{ score: 215, grade: 'B' }}
          momentumSlot={<div>Momentum Stub</div>}
          onSimNextGame={onSimNextGame}
          onSimRemainingPlayoffs={onSimRemainingPlayoffs}
          onSimRound={onSimRound}
          onSimSeries={onSimSeries}
          playoffPreview={playoffPreview}
        />,
      );
    });

    return { onSimNextGame, onSimSeries, onSimRound, onSimRemainingPlayoffs };
  }

  it('renders bracket preview, dynasty score, active controls, game log, and momentum slot', () => {
    renderPanel();

    expect(container.textContent).toContain('Playoffs');
    expect(container.textContent).toContain('Dynasty Score');
    expect(container.textContent).toContain('B');
    expect(container.textContent).toContain('215 points');
    expect(container.textContent).toContain('Momentum Stub');
    expect(container.textContent).toContain('Division Series');
    expect(container.textContent).toContain('NYY leads 1-0');
    expect(container.textContent).toContain('Sim Next Game');
    expect(container.textContent).toContain('Sim Series');
    expect(container.textContent).toContain('Sim Round');
    expect(container.textContent).toContain('Sim All');
    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Completed matchups will stack here');
  });

  it('delegates sim controls and suppresses them while another action is busy', () => {
    const callbacks = renderPanel();
    const nextGameButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sim Next Game'),
    );
    const simAllButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sim All'),
    );

    act(() => {
      nextGameButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      simAllButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(callbacks.onSimNextGame).toHaveBeenCalledTimes(1);
    expect(callbacks.onSimRemainingPlayoffs).toHaveBeenCalledTimes(1);

    renderPanel({ busyAction: 'game', onSimNextGame: callbacks.onSimNextGame });
    const busyNextGameButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Sim Next Game'),
    );

    expect(busyNextGameButton).toBeInstanceOf(HTMLButtonElement);
    expect((busyNextGameButton as HTMLButtonElement | undefined)?.disabled).toBe(true);

    act(() => {
      busyNextGameButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(callbacks.onSimNextGame).toHaveBeenCalledTimes(1);
  });

  it('marks playoff sim controls as route-critical mobile targets', () => {
    renderPanel();

    const controls = [
      'playoffs-sim-next-game',
      'playoffs-sim-series',
      'playoffs-sim-round',
      'playoffs-sim-all',
    ];

    for (const controlId of controls) {
      const button = container.querySelector(`[data-mobile-critical-control="${controlId}"]`);

      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button?.className).toContain('mobile-critical-control');
      expect(button?.className).toContain('focus-ring');
    }

    renderPanel({ bracket: null });
    const startButton = container.querySelector('[data-mobile-critical-control="playoffs-start-bracket"]');

    expect(startButton).toBeInstanceOf(HTMLButtonElement);
    expect(startButton?.className).toContain('mobile-critical-control');
    expect(startButton?.className).toContain('focus-ring');
  });

  it('renders the champion state without route data or worker calls', () => {
    renderPanel({ bracket: championBracket });

    expect(container.textContent).toContain('Champion');
    expect(container.textContent).toContain('NYM won the World Series');
    expect(container.textContent).toContain('Dynasty grade B with 215 points');
  });
});
