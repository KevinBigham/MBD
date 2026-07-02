import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MultiTeamLaneCard, { type MultiTeamLaneState } from './MultiTeamLaneCard';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function makePlayer(overrides: Partial<PlayerDTO> & Pick<PlayerDTO, 'id'>): PlayerDTO {
  const { id, ...rest } = overrides;
  return {
    id,
    firstName: overrides.firstName ?? 'Anthony',
    lastName: overrides.lastName ?? 'Volpe',
    teamId: overrides.teamId ?? 'nym',
    position: overrides.position ?? 'SS',
    age: overrides.age ?? 25,
    overallRating: overrides.overallRating ?? 78,
    displayRating: overrides.displayRating ?? 79,
    letterGrade: overrides.letterGrade ?? 'B',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    serviceTimeDays: overrides.serviceTimeDays ?? 720,
    optionYearsUsed: overrides.optionYearsUsed ?? 1,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    contract: overrides.contract ?? {
      years: 2,
      annualSalary: 2.5,
      totalValue: 5,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: overrides.ceiling ?? 86,
    floor: overrides.floor ?? 65,
    developmentProgram: overrides.developmentProgram ?? null,
    developmentTrajectory: overrides.developmentTrajectory ?? 'steady',
    personalityTraits: overrides.personalityTraits ?? [],
    extensionHistory: overrides.extensionHistory ?? [],
    stats: overrides.stats ?? null,
    advanced: overrides.advanced ?? null,
    ...rest,
  };
}

describe('MultiTeamLaneCard', () => {
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

  it('renders lane role, roster rows, and routes lane callbacks', async () => {
    const onChangeTeam = vi.fn();
    const onTogglePlayer = vi.fn();
    const onChangeDestination = vi.fn();
    const lane: MultiTeamLaneState = {
      laneId: 'lane-2',
      teamId: 'bos',
      role: 'partner',
      outgoing: [{ playerId: 'bos-1', destinationTeamId: 'nym' }],
    };
    const roster: PlayerDTO[] = [
      makePlayer({ id: 'bos-1', firstName: 'Roman', lastName: 'Anthony', teamId: 'bos', position: 'RF', displayRating: 81, age: 22 }),
      makePlayer({ id: 'bos-2', firstName: 'Marcelo', lastName: 'Mayer', teamId: 'bos', position: 'SS', displayRating: 76, age: 23 }),
    ];

    await act(async () => {
      root.render(
        <MultiTeamLaneCard
          lane={lane}
          roster={roster}
          teamOptions={[
            { id: 'bos', label: 'BOS - Boston Noreasters', disabled: false },
            { id: 'sea', label: 'SEA - Seattle Drizzle', disabled: false },
          ]}
          destinationOptions={[
            { id: 'nym', label: 'NYM - New York Metros' },
            { id: 'sea', label: 'SEA - Seattle Drizzle' },
          ]}
          teamSelectionLocked={false}
          disabled={false}
          onChangeTeam={onChangeTeam}
          onTogglePlayer={onTogglePlayer}
          onChangeDestination={onChangeDestination}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Partner');
    expect(container.textContent).toContain('Build outgoing assignments for this lane');
    expect(container.textContent).toContain('Roman Anthony');
    expect(container.textContent).toContain('RF · 81 OVR · Age 22');
    expect(container.textContent).toContain('Marcelo Mayer');
    expect(container.textContent).toContain('In Framework');
    expect(container.textContent).toContain('Available');
    expect(container.textContent).toContain('Destination Club');

    await act(async () => {
      const selects = container.querySelectorAll('select');
      const teamSelect = selects[0] as HTMLSelectElement;
      const destinationSelect = selects[1] as HTMLSelectElement;
      teamSelect.value = 'sea';
      teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
      destinationSelect.value = 'sea';
      destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
      (Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Marcelo Mayer')) as HTMLButtonElement).click();
    });

    expect(onChangeTeam).toHaveBeenCalledWith('sea');
    expect(onChangeDestination).toHaveBeenCalledWith('bos-1', 'sea');
    expect(onTogglePlayer).toHaveBeenCalledWith('bos-2');
  });

  it('renders empty and locked lane states without firing disabled callbacks', async () => {
    const onChangeTeam = vi.fn();
    const onTogglePlayer = vi.fn();

    await act(async () => {
      root.render(
        <MultiTeamLaneCard
          lane={{ laneId: 'lane-1', teamId: 'nym', role: 'initiator', outgoing: [] }}
          roster={[]}
          teamOptions={[{ id: 'nym', label: 'NYM - New York Metros', disabled: false }]}
          destinationOptions={[]}
          teamSelectionLocked
          disabled
          onChangeTeam={onChangeTeam}
          onTogglePlayer={onTogglePlayer}
          onChangeDestination={vi.fn()}
        />,
      );
      await Promise.resolve();
    });

    const select = container.querySelector('select') as HTMLSelectElement;
    expect(container.textContent).toContain('Initiator');
    expect(container.textContent).toContain('No roster loaded for this lane yet.');
    expect(select.disabled).toBe(true);

    expect(onChangeTeam).not.toHaveBeenCalled();
    expect(onTogglePlayer).not.toHaveBeenCalled();
  });
});
