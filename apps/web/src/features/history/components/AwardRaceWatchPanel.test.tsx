import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { AwardRaces } from '@mbd/sim-core';
import AwardRaceWatchPanel from './AwardRaceWatchPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const awardRaces: AwardRaces = {
  mvp: [
    { playerId: 'mvp-1', teamId: 'nym', score: 95, summary: 'League-leading OPS and 38 homers.' },
    { playerId: 'mvp-2', teamId: 'bos', score: 91, summary: 'Elite defense with 112 RBI.' },
    { playerId: 'mvp-3', teamId: 'lad', score: 88, summary: 'Carried the lineup in September.' },
    { playerId: 'mvp-4', teamId: 'sea', score: 84, summary: 'Fourth-place watch candidate.' },
  ],
  cyYoung: [
    { playerId: 'cy-1', teamId: 'hou', score: 102, summary: '2.12 ERA with 240 strikeouts.' },
  ],
  roy: [
    { playerId: 'roy-1', teamId: 'mia', score: 72, summary: 'Rookie slugger surged after the break.' },
  ],
};

function playerName(playerId: string): string {
  const names: Record<string, string> = {
    'mvp-1': 'Maya Torres',
    'mvp-2': 'Riley Stone',
    'mvp-3': 'Elena Vargas',
    'mvp-4': 'Fourth Candidate',
    'cy-1': 'Nolan Cruz',
    'roy-1': 'Jordan Lee',
  };
  return names[playerId] ?? 'Unknown Player';
}

function teamName(teamId: string | null): string {
  const names: Record<string, string> = {
    nym: 'New York Tycoons',
    bos: 'Boston Pilgrims',
    lad: 'Los Angeles Stars',
    hou: 'Houston Orbits',
    mia: 'Miami Palms',
  };
  return teamId ? names[teamId] ?? 'Unknown Club' : 'Free Agent';
}

describe('AwardRaceWatchPanel', () => {
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

  it('renders the current award boards with resolved player and team labels', async () => {
    await act(async () => {
      root.render(
        <AwardRaceWatchPanel
          awardRaces={awardRaces}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Current Award Watch');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
    expect(container.textContent).toContain('MVP');
    expect(container.textContent).toContain('Cy Young');
    expect(container.textContent).toContain('Rookie of the Year');
    expect(container.textContent).toContain('#1');
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('Maya Torres');
    expect(container.textContent).toContain('League-leading OPS and 38 homers.');
    expect(container.textContent).toContain('Houston Orbits');
    expect(container.textContent).toContain('Nolan Cruz');
    expect(container.textContent).toContain('Rookie slugger surged after the break.');
    expect(container.textContent).not.toContain('Fourth Candidate');
    expect(container.textContent).not.toContain('Fourth-place watch candidate.');
  });

  it('renders empty race copy when award races are not available', async () => {
    await act(async () => {
      root.render(
        <AwardRaceWatchPanel
          awardRaces={null}
          playerName={playerName}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Current Award Watch');
    expect(container.textContent).toContain('MVP');
    expect(container.textContent).toContain('Cy Young');
    expect(container.textContent).toContain('Rookie of the Year');
    expect(container.textContent?.match(/No race data yet\./g)).toHaveLength(3);
  });
});
