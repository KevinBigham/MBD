import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { SeasonStatLeaders } from '@mbd/contracts';
import SeasonLeadersPanel from './SeasonLeadersPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyLeaders: SeasonStatLeaders = {
  hr: [],
  rbi: [],
  avg: [],
  era: [],
  k: [],
  w: [],
};

const statLeaders: SeasonStatLeaders = {
  ...emptyLeaders,
  hr: [
    {
      playerId: 'slugger-1',
      teamId: 'team-user',
      value: '48 HR',
      summary: 'Led the league in homers.',
    },
  ],
  era: [
    {
      playerId: 'ace-1',
      teamId: 'team-rival',
      value: '2.18 ERA',
      summary: 'Run prevention anchor.',
    },
  ],
};

function playerName(playerId: string): string {
  if (playerId === 'slugger-1') return 'Riley Stone';
  if (playerId === 'ace-1') return 'Elena Vargas';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'team-user') return 'User Club';
  if (teamId === 'team-rival') return 'Rival Club';
  return 'Unknown Club';
}

describe('SeasonLeadersPanel', () => {
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

  it('renders populated season stat leader groups with resolved names', async () => {
    await act(async () => {
      root.render(
        <SeasonLeadersPanel
          statLeaders={statLeaders}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('HR Leaders');
    expect(container.textContent).toContain('Riley Stone');
    expect(container.textContent).toContain('User Club');
    expect(container.textContent).toContain('48 HR');
    expect(container.textContent).toContain('ERA Leaders');
    expect(container.textContent).toContain('Elena Vargas');
    expect(container.textContent).toContain('Rival Club');
    expect(container.textContent).toContain('2.18 ERA');
  });

  it('omits empty leader groups', async () => {
    await act(async () => {
      root.render(
        <SeasonLeadersPanel
          statLeaders={statLeaders}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).not.toContain('RBI Leaders');
    expect(container.textContent).not.toContain('AVG Leaders');
    expect(container.textContent).not.toContain('Strikeout Leaders');
    expect(container.textContent).not.toContain('Win Leaders');
  });
});
