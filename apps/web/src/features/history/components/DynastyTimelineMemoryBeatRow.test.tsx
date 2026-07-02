import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import DynastyTimelineMemoryBeatRow from './DynastyTimelineMemoryBeatRow';
import type { DynastyTimelineMemoryBeat } from '../lib/buildDynastyTimelineChapters';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeBeat(overrides: Partial<DynastyTimelineMemoryBeat> = {}): DynastyTimelineMemoryBeat {
  return {
    id: 'beat-1',
    kind: 'identity',
    label: 'Lineup of Era',
    summary: 'The lineup became the club identity.',
    playerIds: ['player-mvp'],
    playerNameFallbacks: { 'player-mvp': 'Archived Mike Trout' },
    teamIds: ['nym'],
    gameIndex: 42,
    ...overrides,
  };
}

describe('DynastyTimelineMemoryBeatRow', () => {
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

  it('renders identity memories with player links, team chips, and box-score links', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DynastyTimelineMemoryBeatRow
            beat={makeBeat()}
            playerNames={{ 'player-mvp': 'Mike Trout' }}
            teamNames={{ nym: 'New York Tycoons' }}
          />
        </MemoryRouter>,
      );
    });

    const label = Array.from(container.querySelectorAll('span')).find((span) =>
      span.textContent === 'Lineup of Era',
    );
    expect(label?.className).toContain('text-accent-primary');
    expect(container.textContent).toContain('The lineup became the club identity.');
    expect(container.querySelector('a[href="/players/player-mvp"]')?.textContent).toContain('Mike Trout');
    expect(container.querySelector('[data-testid="timeline-memory-team"]')?.textContent).toContain('New York Tycoons');
    expect(container.querySelector('a[href="/games/42"]')?.textContent).toContain('Box Score');
  });

  it('uses archived player fallback names when live resolver names are unavailable', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DynastyTimelineMemoryBeatRow
            beat={makeBeat({ kind: 'trade', label: 'Defining Trade' })}
            playerNames={{}}
            teamNames={{}}
          />
        </MemoryRouter>,
      );
    });

    const label = Array.from(container.querySelectorAll('span')).find((span) =>
      span.textContent === 'Defining Trade',
    );
    expect(label?.className).toContain('text-accent-warning');
    expect(container.querySelector('a[href="/players/player-mvp"]')?.textContent).toContain('Archived Mike Trout');
    expect(container.textContent).toContain('NYM');
    expect(container.textContent).not.toContain('player-mvp');
  });

  it('links archived box scores by stable archived game id', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DynastyTimelineMemoryBeatRow
            beat={makeBeat({ gameIndex: undefined, archivedGameId: 'archived-game-s6-d120-nym-bos-rivalry' })}
            playerNames={{}}
            teamNames={{}}
          />
        </MemoryRouter>,
      );
    });

    expect(
      container.querySelector('a[href="/games/archived-game-s6-d120-nym-bos-rivalry"]')?.textContent,
    ).toContain('Box Score');
  });
});
