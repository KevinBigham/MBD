import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { buildHitterColumns, buildPitcherColumns } from './rosterMlbColumns';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makePlayer(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'bat-1',
    firstName: 'Aaron',
    lastName: 'Everyday',
    age: 28,
    position: 'CF',
    overallRating: 70,
    displayRating: 68,
    letterGrade: 'B+',
    rosterStatus: 'MLB',
    teamId: 'nym',
    serviceTimeDays: 401,
    optionYearsUsed: 2,
    isOutOfOptions: true,
    minorLeagueLevel: null,
    contract: {
      years: 1,
      annualSalary: 0.8,
      totalValue: 0.8,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: 72,
    floor: 45,
    developmentProgram: null,
    developmentTrajectory: 'steady',
    extensionHistory: [],
    stats: {
      pa: 420,
      ab: 380,
      hits: 102,
      doubles: 24,
      triples: 3,
      hr: 12,
      rbi: 58,
      bb: 42,
      k: 96,
      runs: 61,
      hbp: 2,
      sacFlies: 4,
      avg: '.268',
      ip: 0,
      earnedRuns: 0,
      strikeouts: 0,
      walks: 0,
      hitsAllowed: 0,
      homeRunsAllowed: 0,
      hitBatters: 0,
      flyBallsAllowed: 0,
      wins: 0,
      losses: 0,
      era: '-',
    },
    advanced: {
      war: 1.84,
      avg: 0.268,
      obp: 0.341,
      slg: 0.442,
      ops: 0.783,
      iso: 0.16,
      woba: 0.337,
      wrcPlus: 105,
      opsPlus: 104,
      fip: null,
      xfip: null,
      whip: null,
      kPer9: null,
      bbPer9: null,
      kBb: null,
    },
    ...overrides,
  };
}

describe('rosterMlbColumns', () => {
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

  it('builds hitter columns with player links, service time, stats, and demote delegation', async () => {
    const onDemotePlayer = vi.fn();
    const columns = buildHitterColumns({ busyAction: null, onDemotePlayer });
    const player = makePlayer();

    expect(columns.map((column) => column.key)).toEqual([
      'player',
      'position',
      'overall',
      'grade',
      'age',
      'service',
      'options',
      'plate-appearances',
      'average',
      'home-runs',
      'rbi',
      'war',
      'action',
    ]);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <div>
            {columns.map((column) => (
              <div key={column.key} data-column-key={column.key}>
                {column.render(player, 0)}
              </div>
            ))}
          </div>
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('a')?.getAttribute('href')).toBe('/players/bat-1');
    expect(container.textContent).toContain('Aaron Everyday');
    expect(container.textContent).toContain('2y 57d');
    expect(container.textContent).toContain('2 / OOO');
    expect(container.textContent).toContain('.268');
    expect(container.textContent).toContain('12');
    expect(container.textContent).toContain('58');
    expect(container.textContent).toContain('1.8');

    const demoteButton = container.querySelector('[data-mobile-critical-control="roster-demote"]') as HTMLButtonElement | null;
    expect(demoteButton?.textContent).toContain('Demote');

    await act(async () => {
      demoteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDemotePlayer).toHaveBeenCalledWith(player);
  });

  it('builds pitcher columns with pitching stats and disables the active demote action', async () => {
    const onDemotePlayer = vi.fn();
    const columns = buildPitcherColumns({ busyAction: 'demote-arm-1', onDemotePlayer });
    const player = makePlayer({
      id: 'arm-1',
      firstName: 'Milo',
      lastName: 'Starter',
      position: 'SP',
      stats: {
        ...makePlayer().stats!,
        era: '3.42',
        strikeouts: 133,
        walks: 41,
      },
      advanced: {
        ...makePlayer().advanced!,
        war: 3.16,
      },
    });

    expect(columns.map((column) => column.key)).toEqual([
      'player',
      'position',
      'overall',
      'grade',
      'age',
      'service',
      'options',
      'era',
      'strikeouts',
      'walks',
      'war',
      'action',
    ]);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <div>
            {columns.map((column) => (
              <div key={column.key} data-column-key={column.key}>
                {column.render(player, 0)}
              </div>
            ))}
          </div>
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('Milo Starter');
    expect(container.textContent).toContain('3.42');
    expect(container.textContent).toContain('133');
    expect(container.textContent).toContain('41');
    expect(container.textContent).toContain('3.2');
    expect((container.querySelector('button') as HTMLButtonElement | null)?.disabled).toBe(true);
  });
});
