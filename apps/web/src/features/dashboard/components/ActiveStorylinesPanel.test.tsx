import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ActiveStorylinesPanel, { type DashboardStoryline } from './ActiveStorylinesPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const storylines: DashboardStoryline[] = [
  {
    playerId: 'player-arc-1',
    playerName: 'Jonah Vale',
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    arcType: 'rookie_breakout',
    phase: 'climax',
    latestMilestone: 'Three late-inning home runs in the last week.',
  },
  {
    playerId: 'player-arc-2',
    playerName: 'Mason Reed',
    teamId: 'nym',
    teamName: 'New York Tycoons',
    arcType: 'trade_saga',
    phase: 'setup',
    latestMilestone: null,
  },
];

describe('ActiveStorylinesPanel', () => {
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

  it('renders active story arc links with phase, type, team, progress, and latest milestone', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ActiveStorylinesPanel storylines={storylines} />
        </MemoryRouter>,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Active Storylines');
    expect(text).toContain('Press Room');
    expect(text).toContain('Jonah Vale');
    expect(text).toContain('Climax');
    expect(text).toContain('Rookie Breakout');
    expect(text).toContain('BOS');
    expect(text).toContain('Three late-inning home runs in the last week.');
    expect(text).toContain('Mason Reed');
    expect(text).toContain('Setup');
    expect(text).toContain('Trade Saga');
    expect(text).toContain('Mason Reed is building a new arc.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);

    const links = Array.from(container.querySelectorAll('a')).map((link) => link.getAttribute('href'));
    expect(links).toContain('/press-room');
    expect(links).toContain('/players/player-arc-1');
    expect(links).toContain('/players/player-arc-2');
    expect(container.innerHTML).toContain('width: 80%');
    expect(container.innerHTML).toContain('width: 25%');
  });

  it('renders the empty state when no storylines are active', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <ActiveStorylinesPanel storylines={[]} />
        </MemoryRouter>,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('No active story arcs yet');
    expect(text).toContain('Advance a few checkpoints and the dynasty will start generating real narrative momentum.');
  });
});
