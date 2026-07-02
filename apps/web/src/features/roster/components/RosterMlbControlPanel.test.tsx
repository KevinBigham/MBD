import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { ColumnDef } from '@/shared/components/ResponsiveTable';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { RosterMlbControlPanel } from './RosterMlbControlPanel';
import type { DFACandidateView, RosterComplianceView } from './RosterCompliancePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const playerColumns: ColumnDef<PlayerDTO>[] = [
  {
    key: 'name',
    label: 'Player',
    primary: true,
    render: (player) => `${player.firstName} ${player.lastName}`,
  },
  {
    key: 'grade',
    label: 'GRD',
    render: (player) => player.letterGrade,
  },
];

function makePlayer(id: string, firstName: string, lastName: string, position: string): PlayerDTO {
  return {
    id,
    firstName,
    lastName,
    age: 28,
    position,
    overallRating: 70,
    displayRating: 60,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'nym',
    serviceTimeDays: 401,
    optionYearsUsed: 0,
    isOutOfOptions: false,
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
    stats: null,
    advanced: null,
  };
}

describe('RosterMlbControlPanel', () => {
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

  it('renders compliance pressure and active roster tables while delegating DFA requests', async () => {
    const onRequestDfa = vi.fn();
    const dfaCandidate: DFACandidateView = {
      playerId: 'dfa-1',
      playerName: 'Logan Depth',
      position: '1B',
      age: 29,
      salary: 2.2,
      score: 83,
      reason: 'Low-value 40-man bat relative to age and salary.',
    };
    const compliance: RosterComplianceView = {
      activeRosterCount: 28,
      activeRosterLimit: 26,
      fortyManCount: 42,
      issues: [{
        code: 'forty_man_over_limit',
        severity: 'error',
        message: '40-man roster has 42 players (limit 40).',
      }],
      dfaRecommendations: [dfaCandidate],
    };

    await act(async () => {
      root.render(
        <RosterMlbControlPanel
          compliance={compliance}
          busyAction={null}
          hitters={[makePlayer('bat-1', 'Aaron', 'Everyday', 'CF')]}
          pitchers={[makePlayer('arm-1', 'Milo', 'Starter', 'SP')]}
          hitterColumns={playerColumns}
          pitcherColumns={playerColumns}
          onRequestDfa={onRequestDfa}
        />,
      );
    });

    expect(container.textContent).toContain('40-man roster has 42 players');
    expect(container.textContent).toContain('Logan Depth');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(3);
    expect(container.textContent).toContain('Position Players (1)');
    expect(container.textContent).toContain('Aaron Everyday');
    expect(container.textContent).toContain('Pitchers (1)');
    expect(container.textContent).toContain('Milo Starter');

    const dfaButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('DFA Logan Depth'),
    );

    await act(async () => {
      dfaButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onRequestDfa).toHaveBeenCalledWith(dfaCandidate);
  });

  it('renders active roster empty states without compliance data', async () => {
    await act(async () => {
      root.render(
        <RosterMlbControlPanel
          compliance={null}
          busyAction={null}
          hitters={[]}
          pitchers={[]}
          hitterColumns={playerColumns}
          pitcherColumns={playerColumns}
          onRequestDfa={vi.fn()}
        />,
      );
    });

    expect(container.textContent).not.toContain('Roster Compliance');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.textContent).toContain('Position Players (0)');
    expect(container.textContent).toContain('No position players on the active roster.');
    expect(container.textContent).toContain('Pitchers (0)');
    expect(container.textContent).toContain('No pitchers on the active roster.');
  });
});
