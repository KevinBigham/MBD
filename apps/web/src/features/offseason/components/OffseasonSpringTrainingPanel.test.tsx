import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OffseasonSpringTrainingPanel, type SpringTrainingView } from './OffseasonSpringTrainingPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeSpringTraining(overrides: Partial<SpringTrainingView> = {}): SpringTrainingView {
  return {
    rosterIssues: [
      { code: 'active_roster_over_limit', severity: 'error', message: 'MLB roster has 28 players (limit 26).' },
    ],
    promotionCandidates: [
      {
        playerId: 'prospect-1',
        playerName: 'Marco Callup',
        position: 'SS',
        overallRating: 340,
        currentLevel: 'AAA',
        score: 88,
        reason: 'Strong spring performance',
      },
    ],
    currentRosterSize: 28,
    rosterLimit: 26,
    ...overrides,
  };
}

describe('OffseasonSpringTrainingPanel', () => {
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

  it('renders roster issues and call-up candidates', async () => {
    await act(async () => {
      root.render(<OffseasonSpringTrainingPanel springTraining={makeSpringTraining()} />);
    });

    expect(container.textContent).toContain('Spring Training');
    expect(container.textContent).toContain('Finalize your 26-man roster');
    expect(container.textContent).toContain('28/26');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('Roster Compliance Issues');
    expect(container.textContent).toContain('MLB roster has 28 players (limit 26).');
    expect(container.textContent).toContain('Top Call-Up Candidates');
    expect(container.textContent).toContain('Marco Callup');
    expect(container.textContent).toContain('Strong spring performance');
  });

  it('renders the no-candidates state', async () => {
    await act(async () => {
      root.render(
        <OffseasonSpringTrainingPanel
          springTraining={makeSpringTraining({ rosterIssues: [], promotionCandidates: [] })}
        />,
      );
    });

    expect(container.textContent).toContain('No minor league players are ready for promotion.');
  });
});
