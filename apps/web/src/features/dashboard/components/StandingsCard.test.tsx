import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import StandingsCard from './StandingsCard';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('StandingsCard', () => {
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

  it('renders division standings with the user team highlighted', async () => {
    await act(async () => {
      root.render(
        <StandingsCard
          standings={[
            {
              teamId: 'nyy',
              teamName: 'New York Yankees',
              abbreviation: 'NYY',
              wins: 50,
              losses: 38,
              pct: '.568',
              gamesBack: 0,
              streak: 'W3',
            },
            {
              teamId: 'bos',
              teamName: 'Boston Red Sox',
              abbreviation: 'BOS',
              wins: 48,
              losses: 40,
              pct: '.545',
              gamesBack: 2,
              streak: 'L1',
            },
          ]}
          userTeamId="nyy"
        />,
      );
    });

    expect(container.textContent).toContain('Standings');
    expect(container.textContent).toContain('NYY');
    expect(container.textContent).toContain('BOS');
    expect(container.innerHTML).toContain('bg-accent-primary/10');
  });
});
