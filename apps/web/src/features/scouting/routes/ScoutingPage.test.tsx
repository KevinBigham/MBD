import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ScoutingPage from './ScoutingPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const MOCK_IFA_POOL = {
  season: 1,
  currentPhase: 'opening_window',
  signingWindowOpen: true,
  budget: {
    baseAllocation: 5,
    tradedIn: 0,
    tradedOut: 0,
    committed: 0,
    remaining: 5,
  },
  staffAccuracy: 0.72,
  prospects: [
    {
      id: 'ifa-1',
      playerName: 'Luis Mercado',
      age: 17,
      position: 'SS',
      region: 'dominican_republic',
      country: 'Dominican Republic',
      expectedBonus: 2.35,
      status: 'available',
      signedTeamId: null,
      signedBonus: null,
      looks: 1,
      overall: 55,
      confidence: 4,
      ceiling: 66,
      floor: 43,
      notes: 'Projectable bat with twitchy defense.',
      scoutConflict: null,
    },
  ],
};

const MOCK_PRO_PLAYER = {
  id: 'pro-1',
  firstName: 'Anthony',
  lastName: 'Volpe',
  age: 24,
  position: 'SS',
  overallRating: 78,
  displayRating: 78,
  letterGrade: 'B+',
  rosterStatus: 'active',
  teamId: 'nyy',
  serviceTimeDays: 400,
  optionYearsUsed: 1,
  isOutOfOptions: false,
  minorLeagueLevel: null,
  contract: {
    years: 3,
    annualSalary: 7.5,
    totalValue: 22.5,
    noTradeClause: false,
    noTradeClauseType: 'none',
    playerOption: false,
    teamOption: false,
    optOutYears: [],
    signingBonus: 0,
    buyoutAmount: 0,
    deferredMoney: [],
  },
  ceiling: 82,
  floor: 68,
  developmentProgram: null,
  developmentTrajectory: 'steady',
  personalityTraits: [],
  extensionHistory: [],
  stats: null,
  advanced: null,
};

const MOCK_PRO_REPORT = {
  playerId: 'pro-1',
  playerName: 'Anthony Volpe',
  position: 'SS',
  age: 24,
  teamName: 'New York Empires',
  isPitcher: false,
  grades: {
    contact: 57,
    power: 50,
    eye: 54,
    speed: 62,
    defense: 65,
    durability: 60,
  },
  confidence: 4,
  overall: 60,
  ceiling: 68,
  floor: 48,
  notes: 'Reliable glove with enough contact to profile as a regular.',
  scoutName: 'Pat Evaluator',
  date: 'Season 1 Day 1',
  reliability: 4,
};

function createWorkerMock() {
  return {
    isReady: true,
    getScoutingStaff: vi.fn().mockResolvedValue([
      { id: 'scout-1', name: 'Pat Evaluator', quality: 72, specialty: 'Infield', bias: 'tools' },
    ]),
    getTeamChemistry: vi.fn().mockResolvedValue({
      score: 74,
      tier: 'connected',
      summary: 'The room trusts the front office.',
    }),
    getOwnerState: vi.fn().mockResolvedValue({
      hotSeat: false,
      patience: 70,
      confidence: 65,
      summary: 'Ownership is steady.',
    }),
    getIFAPool: vi.fn().mockResolvedValue(MOCK_IFA_POOL),
    searchPlayers: vi.fn().mockResolvedValue([MOCK_PRO_PLAYER]),
    scoutPlayerReport: vi.fn().mockResolvedValue(MOCK_PRO_REPORT),
    scoutIFAPlayer: vi.fn().mockResolvedValue({
      success: true,
      report: {
        playerId: 'ifa-1',
        playerName: 'Luis Mercado',
        position: 'SS',
        age: 17,
        region: 'dominican_republic',
        country: 'Dominican Republic',
        expectedBonus: 2.35,
        looks: 2,
        grades: {
          contact: 56,
          power: 48,
          eye: 50,
          speed: 61,
          defense: 60,
          durability: 58,
        },
        overall: 55,
        confidence: 4,
        ceiling: 66,
        floor: 43,
        notes: 'Projectable bat with twitchy defense.',
        reliability: 4,
        scoutConflict: null,
      },
    }),
    signIFAPlayer: vi.fn().mockResolvedValue({ success: true, remainingBudget: 2.65 }),
    tradeIFAPoolSpace: vi.fn().mockResolvedValue({ success: true, remainingBudget: 4.5 }),
    getScoutConflicts: vi.fn().mockResolvedValue([]),
  } as unknown as ReturnType<typeof useWorker>;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('ScoutingPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 1,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 0,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders scouting heading', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock());

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScoutingPage />
        </MemoryRouter>,
      );
      await flushPromises();
    });

    expect(container.textContent).toContain('Scout');
  });

  it('links scouting player names to player profiles', async () => {
    mockedUseWorker.mockReturnValue(createWorkerMock());

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScoutingPage />
        </MemoryRouter>,
      );
      await flushPromises();
    });

    const ifaLink = container.querySelector<HTMLAnchorElement>('a[href="/players/ifa-1"]');
    expect(ifaLink).not.toBeNull();
    expect(ifaLink!.textContent).toContain('Luis Mercado');

    const proReportsTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Pro Reports'),
    );

    await act(async () => {
      proReportsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const searchInput = container.querySelector<HTMLInputElement>('input[placeholder="Search player by name..."]');
    expect(searchInput).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(searchInput, 'Volpe');
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const searchButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.trim() === 'Search',
    );

    await act(async () => {
      searchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    const scoutButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.trim() === 'Scout',
    );

    await act(async () => {
      scoutButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushPromises();
    });

    const proLink = container.querySelector<HTMLAnchorElement>('a[href="/players/pro-1"]');
    expect(proLink?.textContent).toContain('Anthony Volpe');
  });
});
