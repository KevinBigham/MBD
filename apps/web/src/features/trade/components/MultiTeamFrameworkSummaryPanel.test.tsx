import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MultiTeamFrameworkSummaryPanel, {
  type MultiTeamFrameworkTeamView,
  type MultiTeamMovedPlayerView,
} from './MultiTeamFrameworkSummaryPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function player(overrides: Partial<PlayerDTO> & Pick<PlayerDTO, 'id' | 'firstName' | 'lastName' | 'teamId'>): PlayerDTO {
  return {
    id: overrides.id,
    firstName: overrides.firstName,
    lastName: overrides.lastName,
    age: overrides.age ?? 24,
    position: overrides.position ?? 'SS',
    overallRating: overrides.overallRating ?? 70,
    displayRating: overrides.displayRating ?? 70,
    letterGrade: overrides.letterGrade ?? 'B',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    teamId: overrides.teamId,
    serviceTimeDays: overrides.serviceTimeDays ?? 365,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    contract: overrides.contract ?? {
      years: 1,
      annualSalary: 1,
      totalValue: 1,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: overrides.ceiling ?? 80,
    floor: overrides.floor ?? 55,
    developmentProgram: overrides.developmentProgram ?? null,
    developmentTrajectory: overrides.developmentTrajectory ?? 'stable',
    personalityTraits: overrides.personalityTraits,
    extensionHistory: overrides.extensionHistory ?? [],
    stats: overrides.stats ?? null,
    advanced: overrides.advanced ?? null,
    historical: overrides.historical,
    historicalSummary: overrides.historicalSummary,
  };
}

describe('MultiTeamFrameworkSummaryPanel', () => {
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

  it('renders team roles, outbound players, and inbound moved-player labels', async () => {
    const teams: MultiTeamFrameworkTeamView[] = [
      {
        teamId: 'nym',
        role: 'initiator',
        sendingPlayerIds: ['nym-1'],
        receivingPlayerIds: ['bos-1'],
      },
      {
        teamId: 'bos',
        role: 'partner',
        sendingPlayerIds: ['bos-1'],
        receivingPlayerIds: ['nym-1'],
      },
      {
        teamId: 'sea',
        role: 'facilitator',
        sendingPlayerIds: [],
        receivingPlayerIds: [],
      },
    ];
    const movedPlayers: MultiTeamMovedPlayerView[] = [
      { playerId: 'nym-1', label: 'Anthony Volpe (NYM - New York Metros)' },
      { playerId: 'bos-1', label: 'Roman Anthony (BOS - Boston Noreasters)' },
    ];

    await act(async () => {
      root.render(
        <MultiTeamFrameworkSummaryPanel
          movedPlayers={movedPlayers}
          multiTeamRosters={{
            nym: [player({ id: 'nym-1', firstName: 'Anthony', lastName: 'Volpe', teamId: 'nym' })],
            bos: [player({ id: 'bos-1', firstName: 'Roman', lastName: 'Anthony', teamId: 'bos' })],
          }}
          teamDisplayName={(teamId) => ({
            nym: 'NYM - New York Metros',
            bos: 'BOS - Boston Noreasters',
            sea: 'SEA - Seattle Drizzle',
          }[teamId] ?? teamId.toUpperCase())}
          teams={teams}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Framework Summary');
    expect(container.textContent).toContain('NYM - New York Metros');
    expect(container.textContent).toContain('Initiator');
    expect(container.textContent).toContain('Anthony Volpe');
    expect(container.textContent).toContain('Roman Anthony (BOS - Boston Noreasters)');
    expect(container.textContent).toContain('BOS - Boston Noreasters');
    expect(container.textContent).toContain('Partner');
    expect(container.textContent).toContain('SEA - Seattle Drizzle');
    expect(container.textContent).toContain('Facilitator');
    expect(container.textContent).toContain('No players assigned.');
    expect(container.textContent).toContain('No inbound players yet.');
  });

  it('falls back to player ids when roster and moved-player labels are missing', async () => {
    await act(async () => {
      root.render(
        <MultiTeamFrameworkSummaryPanel
          movedPlayers={[]}
          multiTeamRosters={{}}
          teamDisplayName={(teamId) => teamId.toUpperCase()}
          teams={[
            {
              teamId: 'bos',
              role: 'partner',
              sendingPlayerIds: ['missing-send'],
              receivingPlayerIds: ['missing-receive'],
            },
          ]}
        />,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('Partner');
    expect(container.textContent).toContain('missing-send');
    expect(container.textContent).toContain('missing-receive');
  });
});
