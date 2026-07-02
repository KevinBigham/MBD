import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { Rivalry } from '@mbd/contracts';
import RivalryWatchPanel from './RivalryWatchPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const rivalries: Rivalry[] = [
  {
    id: 'nym-bos',
    teamA: 'nym',
    teamB: 'bos',
    intensity: 78,
    summary: 'A heated October rematch has carried into the current pennant race.',
    reasons: ['Playoff rematch', 'Close division race'],
    origin: 'playoff',
    currentSeasonWinsA: 4,
    currentSeasonWinsB: 2,
    historicalWinsA: 23,
    historicalWinsB: 19,
  },
];

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  if (teamId === 'bos') return 'Boston Pilgrims';
  return 'Unknown Club';
}

function teamAbbreviation(teamId: string): string {
  if (teamId === 'nym') return 'NYT';
  if (teamId === 'bos') return 'BOS';
  return teamId.toUpperCase();
}

describe('RivalryWatchPanel', () => {
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

  it('renders rivalry cards with origin, records, intensity, and reasons', async () => {
    await act(async () => {
      root.render(
        <RivalryWatchPanel
          rivalries={rivalries}
          teamAbbreviation={teamAbbreviation}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('New York Tycoons vs Boston Pilgrims');
    expect(container.textContent).toContain('78');
    expect(container.textContent).toContain('A heated October rematch has carried into the current pennant race.');
    expect(container.textContent).toContain('Origin');
    expect(container.textContent).toContain('Playoff');
    expect(container.textContent).toContain('Current season');
    expect(container.textContent).toContain('NYT 4-2 BOS');
    expect(container.textContent).toContain('Historical record');
    expect(container.textContent).toContain('NYT 23-19 BOS');
    expect(container.textContent).toContain('Playoff rematch');
    expect(container.textContent).toContain('Close division race');
  });

  it('renders empty rivalry copy before rivalry pressure exists', async () => {
    await act(async () => {
      root.render(
        <RivalryWatchPanel
          rivalries={[]}
          teamAbbreviation={teamAbbreviation}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Rivalry Watch');
    expect(container.textContent).toContain('Rivalries will appear once the standings tighten or postseason history starts to repeat.');
  });
});
