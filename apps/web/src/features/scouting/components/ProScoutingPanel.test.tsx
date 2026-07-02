import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import ProScoutingPanel, { type ScoutReportView } from './ProScoutingPanel';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const baseStats: NonNullable<PlayerDTO['stats']> = {
  pa: 0,
  ab: 0,
  hits: 0,
  doubles: 0,
  triples: 0,
  hr: 0,
  rbi: 0,
  bb: 0,
  k: 0,
  runs: 0,
  hbp: 0,
  sacFlies: 0,
  avg: '.000',
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
  era: '0.00',
};

function makePlayer(overrides: Partial<PlayerDTO> = {}): PlayerDTO {
  return {
    id: 'player-1',
    firstName: 'Julio',
    lastName: 'Vega',
    age: 26,
    position: 'CF',
    overallRating: 62,
    displayRating: 62,
    letterGrade: 'B',
    rosterStatus: 'mlb',
    teamId: 'kc',
    serviceTimeDays: 720,
    optionYearsUsed: 1,
    isOutOfOptions: false,
    minorLeagueLevel: null,
    contract: {
      years: 2,
      annualSalary: 8,
      totalValue: 16,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    ceiling: 74,
    floor: 48,
    developmentProgram: null,
    developmentTrajectory: 'steady',
    personalityTraits: [],
    extensionHistory: [],
    stats: baseStats,
    advanced: null,
    ...overrides,
  };
}

function makeReport(overrides: Partial<ScoutReportView> = {}): ScoutReportView {
  return {
    playerId: 'player-1',
    playerName: 'Julio Vega',
    position: 'CF',
    age: 26,
    teamName: 'Kansas City Fountains',
    isPitcher: false,
    grades: {
      contact: 64,
      power: 58,
      eye: 54,
      speed: 62,
      defense: 60,
      durability: 55,
    },
    confidence: 4,
    overall: 62,
    ceiling: 74,
    floor: 48,
    notes: 'Plus runner with enough center-field instincts to start now.',
    scoutName: 'Marta Vega',
    date: 'Season 2 Day 14',
    reliability: 4,
    ...overrides,
  };
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('ProScoutingPanel', () => {
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

  it('renders search controls, loading state, and delegates pro scouting actions', async () => {
    const player = makePlayer();
    const onChangeSearchQuery = vi.fn();
    const onSearch = vi.fn();
    const onScoutPlayer = vi.fn();

    await act(async () => {
      root.render(
        <ProScoutingPanel
          loading
          onChangeSearchQuery={onChangeSearchQuery}
          onScoutPlayer={onScoutPlayer}
          onSearch={onSearch}
          recentReports={[]}
          scoutReport={null}
          searchQuery=""
          searchResults={[player]}
        />,
      );
    });

    expect(container.textContent).toContain('Scout a Player');
    expect(container.textContent).toContain('Julio Vega');
    expect(container.textContent).toContain('CF / Age 26');
    expect(container.querySelector('.animate-spin')).not.toBeNull();

    const input = container.querySelector('input') as HTMLInputElement;
    await act(async () => {
      setInputValue(input, 'Julio');
    });
    expect(onChangeSearchQuery).toHaveBeenCalledWith('Julio');

    const searchButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Search',
    ) as HTMLButtonElement;
    await act(async () => {
      searchButton.click();
    });
    expect(onSearch).toHaveBeenCalledTimes(1);

    const playerButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Julio Vega'),
    ) as HTMLButtonElement;
    await act(async () => {
      playerButton.click();
    });
    expect(onScoutPlayer).toHaveBeenCalledWith(player);
  });

  it('renders the active report and recent report ledger', async () => {
    const report = makeReport();
    const pitcherReport = makeReport({
      playerId: 'player-2',
      playerName: 'Avery Stone',
      position: 'SP',
      isPitcher: true,
      grades: {
        stuff: 67,
        control: 61,
        stamina: 58,
        velocity: 64,
        movement: 62,
      },
      scoutName: 'Eli Stone',
      date: 'Season 2 Day 15',
    });

    await act(async () => {
      root.render(
        <ProScoutingPanel
          loading={false}
          onChangeSearchQuery={vi.fn()}
          onScoutPlayer={vi.fn()}
          onSearch={vi.fn()}
          recentReports={[report, pitcherReport]}
          scoutReport={report}
          searchQuery="Julio"
          searchResults={[]}
        />,
      );
    });

    expect(container.textContent).toContain('Julio Vega');
    expect(container.textContent).toContain('CF | Age 26 | Kansas City Fountains');
    expect(container.textContent).toContain('Overall Grade');
    expect(container.textContent).toContain('Contact');
    expect(container.textContent).toContain('64');
    expect(container.textContent).toContain('Ceiling');
    expect(container.textContent).toContain('Reliability');
    expect(container.textContent).toContain('WAR Floor');
    expect(container.textContent).toContain('WAR Now');
    expect(container.textContent).toContain('WAR Ceiling');
    expect(container.textContent).toContain('Scout Notes (Marta Vega)');
    expect(container.textContent).toContain('Plus runner with enough center-field instincts');
    expect(container.textContent).toContain('Recent Reports');
    expect(container.textContent).toContain('Avery Stone');
    expect(container.textContent).toContain('Season 2 Day 15');
  });

  it('renders the empty recent-report state', async () => {
    await act(async () => {
      root.render(
        <ProScoutingPanel
          loading={false}
          onChangeSearchQuery={vi.fn()}
          onScoutPlayer={vi.fn()}
          onSearch={vi.fn()}
          recentReports={[]}
          scoutReport={null}
          searchQuery=""
          searchResults={[]}
        />,
      );
    });

    expect(container.textContent).toContain('No reports yet. Search for a player above to generate a scouting report.');
  });
});
