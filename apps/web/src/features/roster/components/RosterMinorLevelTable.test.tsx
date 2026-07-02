import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { RosterMinorLevelTable } from './RosterMinorLevelTable';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makeMinorPlayer(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'minor-1',
    firstName: 'Marco',
    lastName: 'Ready',
    age: 22,
    position: 'SS',
    overallRating: 62,
    displayRating: 58,
    letterGrade: 'B',
    rosterStatus: 'MINORS',
    teamId: 'nym',
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AAA',
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
    developmentTrajectory: 'rising',
    extensionHistory: [],
    stats: null,
    advanced: null,
    ...overrides,
  };
}

describe('RosterMinorLevelTable', () => {
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

  it('renders minor player details and delegates mobile-safe promotion actions', async () => {
    const player = makeMinorPlayer();
    const onPromotePlayer = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterMinorLevelTable
            levelKey="AAA"
            levelLabel="AAA"
            players={[player]}
            busyAction={null}
            onPromotePlayer={onPromotePlayer}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('AAA (1)');
    expect(container.textContent).toContain('Marco Ready');
    expect(container.textContent).toContain('SS');
    expect(container.textContent).toContain('58');
    expect(container.textContent).toContain('B');
    expect(container.querySelector('a[href="/players/minor-1"]')).not.toBeNull();

    const promoteButton = container.querySelector(
      '[data-mobile-critical-control="roster-promote"]',
    ) as HTMLButtonElement | null;
    expect(promoteButton).not.toBeNull();
    expect(promoteButton?.className).toContain('mobile-critical-control');

    await act(async () => {
      promoteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPromotePlayer).toHaveBeenCalledWith(player, 'AAA');
  });

  it('disables busy promotions and renders international players as intake-only', async () => {
    const onPromotePlayer = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterMinorLevelTable
            levelKey="AA"
            levelLabel="AA"
            players={[makeMinorPlayer({ id: 'busy-minor', minorLeagueLevel: 'AA' })]}
            busyAction="promote-busy-minor"
            onPromotePlayer={onPromotePlayer}
          />
        </MemoryRouter>,
      );
    });

    const busyButton = container.querySelector(
      '[data-mobile-critical-control="roster-promote"]',
    ) as HTMLButtonElement | null;
    expect(busyButton?.disabled).toBe(true);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RosterMinorLevelTable
            levelKey="INTERNATIONAL"
            levelLabel="International"
            players={[makeMinorPlayer({
              id: 'intake-1',
              firstName: 'Intake',
              lastName: 'Prospect',
              minorLeagueLevel: 'INTERNATIONAL',
            })]}
            busyAction={null}
            onPromotePlayer={onPromotePlayer}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('International (1)');
    expect(container.textContent).toContain('Intake only');
    expect(container.querySelector('[data-mobile-critical-control="roster-promote"]')).toBeNull();
  });
});
