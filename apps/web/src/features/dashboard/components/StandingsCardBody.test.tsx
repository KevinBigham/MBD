import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { TeamStandingsDTO } from '@/workers/sim.worker.helpers';
import StandingsCardBody from './StandingsCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const standings: TeamStandingsDTO[] = [
  {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    city: 'New York',
    abbreviation: 'NYT',
    division: 'AL East',
    wins: 50,
    losses: 38,
    pct: '.568',
    gamesBack: 0,
    streak: 'W3',
    runDifferential: 42,
  },
  {
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    city: 'Boston',
    abbreviation: 'BOS',
    division: 'AL East',
    wins: 48,
    losses: 40,
    pct: '.545',
    gamesBack: 2,
    streak: 'L1',
    runDifferential: 15,
  },
];

describe('StandingsCardBody', () => {
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

  async function renderBody(props: Partial<Parameters<typeof StandingsCardBody>[0]> = {}) {
    await act(async () => {
      root.render(
        <StandingsCardBody
          standings={props.standings ?? standings}
          userTeamId={props.userTeamId ?? 'nym'}
        />,
      );
    });
  }

  it('renders standings rows, games-back formatting, and streak tones', async () => {
    await renderBody();

    const text = container.textContent ?? '';
    expect(text).toContain('Team');
    expect(text).toContain('NYT');
    expect(text).toContain('BOS');
    expect(text).toContain('50');
    expect(text).toContain('38');
    expect(text).toContain('.568');
    expect(text).toContain('-');
    expect(text).toContain('2.0');
    expect(text).toContain('W3');
    expect(text).toContain('L1');
    expect(container.innerHTML).toContain('bg-accent-primary/10');
    expect(container.innerHTML).toContain('text-accent-success');
    expect(container.innerHTML).toContain('text-accent-danger');
  });

  it('does not mark a non-user row as highlighted', async () => {
    await renderBody({ userTeamId: 'lad' });

    expect(container.innerHTML).not.toContain('bg-accent-primary/10');
  });
});
