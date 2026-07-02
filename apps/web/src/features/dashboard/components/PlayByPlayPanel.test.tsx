import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GameBoxScore, PAResult } from '@mbd/sim-core';
import PlayByPlayPanel from './PlayByPlayPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createPlayResult(overrides: Partial<PAResult>): PAResult {
  return {
    outcome: 'GB_OUT',
    batterId: 'batter-1',
    pitcherId: 'pitcher-1',
    inning: 1,
    halfInning: 'top',
    outs: 0,
    runnersOn: 0,
    scoreBefore: [0, 0],
    scoreAfter: [0, 0],
    rbiOnPlay: 0,
    isWalkOff: false,
    ...overrides,
  };
}

function createBoxScore(): GameBoxScore {
  return {
    homeTeamId: 'nym',
    awayTeamId: 'bos',
    homeScore: 3,
    awayScore: 2,
    homeHits: 6,
    awayHits: 5,
    innings: 10,
    isPlayoff: false,
    date: 'S4D88',
    winningPitcherId: 'pitcher-home',
    losingPitcherId: 'pitcher-away',
    savePitcherId: null,
    paResults: [
      createPlayResult({
        inning: 1,
        halfInning: 'top',
        outcome: 'HR',
        batterId: 'slugger-away',
        pitcherId: 'pitcher-home',
        scoreBefore: [0, 0],
        scoreAfter: [1, 0],
        rbiOnPlay: 1,
      }),
      createPlayResult({
        inning: 1,
        halfInning: 'bottom',
        batterId: 'leadoff-home',
        pitcherId: 'pitcher-away',
        scoreBefore: [1, 0],
        scoreAfter: [1, 0],
      }),
      createPlayResult({
        inning: 2,
        halfInning: 'bottom',
        outcome: 'DOUBLE',
        batterId: 'gap-home',
        pitcherId: 'pitcher-away',
        scoreBefore: [1, 0],
        scoreAfter: [1, 2],
        rbiOnPlay: 2,
      }),
      createPlayResult({
        inning: 10,
        halfInning: 'top',
        batterId: 'extras-away',
        pitcherId: 'pitcher-home',
        scoreBefore: [1, 2],
        scoreAfter: [2, 2],
        rbiOnPlay: 1,
      }),
      createPlayResult({
        inning: 10,
        halfInning: 'bottom',
        outcome: 'HR',
        batterId: 'walkoff-home',
        pitcherId: 'pitcher-away',
        scoreBefore: [2, 2],
        scoreAfter: [2, 3],
        rbiOnPlay: 1,
        isWalkOff: true,
      }),
    ],
  };
}

describe('PlayByPlayPanel', () => {
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

  it('renders grouped half-innings, highlight markers, and a derived linescore', async () => {
    await act(async () => {
      root.render(
        <PlayByPlayPanel
          detail={{
            gameIndex: 17,
            recap: 'New York walked it off in the 10th.',
            highlights: [
              { type: 'homer', text: 'Bos jumps ahead on a solo shot.' },
              { type: 'walkoff', text: 'Walk-off homer seals it.' },
            ],
            plays: [
              { inning: 1, halfInning: 'top', text: 'Bos jumps ahead on a solo shot.', isHighlight: true },
              { inning: 1, halfInning: 'bottom', text: 'Nyy answerless frame.', isHighlight: false },
              { inning: 2, halfInning: 'bottom', text: 'Gap double puts New York ahead.', isHighlight: true },
              { inning: 10, halfInning: 'top', text: 'Boston ties it in extras.', isHighlight: true },
              { inning: 10, halfInning: 'bottom', text: 'Walk-off homer seals it.', isHighlight: true },
            ],
            boxScore: createBoxScore(),
          }}
        />,
      );
    });

    expect(container.textContent).toContain('Broadcast Booth');
    expect(container.textContent).toContain('New York walked it off in the 10th.');
    expect(container.textContent).toContain('Linescore');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('Top 1st');
    expect(container.textContent).toContain('Bottom 10th');
    expect(container.textContent).toContain('Highlight');
    expect(container.textContent).toContain('Walk-off homer seals it.');
    expect(container.textContent).toContain('R');
    expect(container.textContent).toContain('H');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders the loading booth state inside the shared dense shell', async () => {
    await act(async () => {
      root.render(<PlayByPlayPanel detail={null} loading />);
    });

    expect(container.textContent).toContain('Broadcast Booth');
    expect(container.textContent).toContain('Loading the latest call sheet...');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders the empty booth state inside the shared dense shell', async () => {
    await act(async () => {
      root.render(<PlayByPlayPanel detail={null} />);
    });

    expect(container.textContent).toContain('Broadcast Booth');
    expect(container.textContent).toContain('No game selected');
    expect(container.textContent).toContain('Pick one of the recent recaps to load the booth feed');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });
});
