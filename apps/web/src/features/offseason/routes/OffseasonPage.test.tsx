import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import OffseasonPage from './OffseasonPage';
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

function buildOffseasonState(overrides: Record<string, unknown> = {}) {
  return {
    currentPhase: 'free_agency',
    phaseDay: 8,
    totalDay: 18,
    completed: false,
    phaseResults: {
      arbitrationResolved: [{ id: 'arb-1' }],
      tenderedPlayers: ['player-2'],
      nonTenderedPlayers: ['player-3'],
      freeAgentSignings: [{ id: 'fa-1' }],
      draftPicks: [{ id: 'pick-1' }],
      ifaSignings: [{ id: 'ifa-1' }],
      retiredPlayers: [{ id: 'retire-1' }],
    },
    transactionGroups: [
      {
        phase: 'arbitration',
        label: 'Arbitration',
        rows: [
          {
            id: 'arb-1',
            tone: 'user',
            summary: 'Juan Soto signed for $12.4M/yr (1 year)',
          },
        ],
      },
      {
        phase: 'free_agency',
        label: 'Free Agency',
        rows: [
          {
            id: 'fa-1',
            tone: 'division_rival',
            summary: 'Corbin Burnes signed with Boston Red Sox for $28.5M/yr (5 years)',
          },
        ],
      },
    ],
    ...overrides,
  };
}

function buildWorkerMock(overrides: Record<string, unknown> = {}) {
  return {
    isReady: true,
    getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState()),
    advanceOffseason: vi.fn(),
    skipOffseasonPhase: vi.fn(),
    toggleRule5Protection: vi.fn().mockResolvedValue({ success: true }),
    lockRule5Protection: vi.fn(),
    makeRule5Pick: vi.fn().mockResolvedValue({ success: true }),
    passRule5Pick: vi.fn().mockResolvedValue({ success: true }),
    resolveRule5OfferBack: vi.fn().mockResolvedValue({ success: true }),
    ...overrides,
  };
}

describe('OffseasonPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 1,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 162,
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

  async function renderPage() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <OffseasonPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  function findButton(label: string): HTMLButtonElement | undefined {
    return Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    ) as HTMLButtonElement | undefined;
  }

  it('renders completed transaction groups with detailed offseason rows', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock() as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Arbitration');
    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('Juan Soto signed for $12.4M/yr (1 year)');
    expect(container.textContent).toContain('Corbin Burnes signed with Boston Red Sox for $28.5M/yr (5 years)');
    expect(container.innerHTML).toContain('accent-success');
    expect(container.innerHTML).toContain('accent-warning');
  });

  it('shows the qualifying offers phase in the offseason progress flow', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock({
        getOffseasonState: vi.fn().mockResolvedValue(
          buildOffseasonState({
            currentPhase: 'qualifying_offers',
            transactionGroups: [
              {
                phase: 'qualifying_offers',
                label: 'Qualifying Offers',
                rows: [
                  {
                    id: 'qo-1',
                    tone: 'user',
                    summary: 'New York Yankees extended a qualifying offer to Juan Slugger.',
                  },
                ],
              },
            ],
          }),
        ),
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Qualifying Offers');
    expect(container.textContent).toContain('extended a qualifying offer');
    expect(container.textContent).toContain('Free Agency');
  });

  it('renders the protection audit surface and invokes Rule 5 protection actions', async () => {
    const getOffseasonState = vi.fn().mockResolvedValue(
      buildOffseasonState({
        currentPhase: 'protection_audit',
        phaseDay: 1,
        totalDay: 20,
        transactionGroups: [
          {
            phase: 'protection_audit',
            label: 'Protection Audit',
            rows: [
              {
                id: 'protect-risk-1',
                tone: 'user',
                summary: 'New York Yankees protected Ricky Protect on the 40-man roster',
              },
            ],
          },
          {
            phase: 'rule5_draft',
            label: 'Rule 5 Draft',
            rows: [
              {
                id: 'rule5-pick-1',
                tone: 'division_rival',
                summary: 'Rule 5 Pick 1: Boston Red Sox selected Danny Stash from Oakland Athletics',
              },
            ],
          },
        ],
        rule5: {
          phase: 'protection_audit',
          currentTeamId: null,
          draftOrder: ['ath', 'bos', 'nyy'],
          consecutivePasses: 0,
          protectedCount: 4,
          protectedLimit: 40,
          protectedPlayers: [
            {
              playerId: 'keep-1',
              teamId: 'nyy',
              playerName: 'Ricky Protect',
              position: 'SS',
              age: 22,
              overallRating: 315,
              rosterStatus: 'AA',
              rule5EligibleAfterSeason: 4,
            },
          ],
          eligiblePlayers: [
            {
              playerId: 'risk-1',
              teamId: 'nyy',
              playerName: 'Evan Exposed',
              position: 'SP',
              age: 23,
              overallRating: 328,
              rosterStatus: 'AA',
              rule5EligibleAfterSeason: 4,
            },
            {
              playerId: 'pool-1',
              teamId: 'bos',
              playerName: 'Danny Stash',
              position: 'CF',
              age: 24,
              overallRating: 321,
              rosterStatus: 'AAA',
              rule5EligibleAfterSeason: 4,
            },
          ],
          selections: [],
          obligations: [],
          offerBackStates: [],
        },
      }),
    );
    const toggleRule5Protection = vi.fn().mockResolvedValue({ success: true });

    mockedUseWorker.mockReturnValue(
      buildWorkerMock({
        getOffseasonState,
        toggleRule5Protection,
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Protection Audit');
    expect(container.textContent).toContain('Rule 5 Draft');
    expect(container.textContent).toContain('40-Man 4/40');
    expect(container.textContent).toContain('Ricky Protect');
    expect(container.textContent).toContain('Evan Exposed');
    expect(container.textContent).toContain('Draft Order');
    expect(container.textContent).toContain('Rule 5 Pick 1: Boston Red Sox selected Danny Stash from Oakland Athletics');

    await act(async () => {
      findButton('Protect')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toggleRule5Protection).toHaveBeenCalledWith('risk-1');
  });

  it('renders the Rule 5 board controls and resolves offer-back actions', async () => {
    const passRule5Pick = vi.fn().mockResolvedValue({ success: true });
    const resolveRule5OfferBack = vi.fn().mockResolvedValue({ success: true });

    mockedUseWorker.mockReturnValue(
      buildWorkerMock({
        getOffseasonState: vi.fn().mockResolvedValue(
          buildOffseasonState({
            currentPhase: 'rule5_draft',
            phaseDay: 1,
            totalDay: 21,
            transactionGroups: [
              {
                phase: 'rule5_draft',
                label: 'Rule 5 Draft',
                rows: [
                  {
                    id: 'offer-back-1',
                    tone: 'user',
                    summary: 'New York Yankees must offer offer-1 back to Boston Red Sox',
                  },
                ],
              },
            ],
            rule5: {
              phase: 'rule5_draft',
              currentTeamId: 'nyy',
              draftOrder: ['nyy', 'bos', 'ath'],
              consecutivePasses: 1,
              protectedCount: 5,
              protectedLimit: 40,
              protectedPlayers: [],
              eligiblePlayers: [
                {
                  playerId: 'pool-2',
                  teamId: 'bos',
                  playerName: 'Theo Reserve',
                  position: 'RP',
                  age: 25,
                  overallRating: 319,
                  rosterStatus: 'AAA',
                  rule5EligibleAfterSeason: 4,
                },
              ],
              selections: [
                {
                  playerId: 'pick-1',
                  playerName: 'Danny Stash',
                  originalTeamId: 'ath',
                  draftingTeamId: 'bos',
                  overallPick: 1,
                  round: 1,
                },
              ],
              obligations: [
                {
                  playerId: 'offer-1',
                  originalTeamId: 'bos',
                  draftingTeamId: 'nyy',
                  draftedAfterSeason: 4,
                  status: 'active',
                },
              ],
              offerBackStates: [
                {
                  playerId: 'offer-1',
                  originalTeamId: 'bos',
                  draftingTeamId: 'nyy',
                  status: 'pending',
                },
              ],
            },
          }),
        ),
        passRule5Pick,
        resolveRule5OfferBack,
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('On Clock: New York Yankees');
    expect(container.textContent).toContain('Consecutive Passes 1/3');
    expect(container.textContent).toContain('Theo Reserve');
    expect(container.textContent).toContain('Offer-Back Queue');
    expect(container.textContent).toContain('New York Yankees must offer offer-1 back to Boston Red Sox');

    await act(async () => {
      findButton('Pass Pick')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      findButton('Return Player')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(passRule5Pick).toHaveBeenCalledTimes(1);
    expect(resolveRule5OfferBack).toHaveBeenCalledWith('offer-1', true);
  });
});
