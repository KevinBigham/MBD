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
      extensions: [],
      qualifyingOffers: [],
      coachChanges: [],
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
            summary: 'Corbin Burnes signed with Boston Noreasters for $28.5M/yr (5 years)',
          },
        ],
      },
    ],
    marketDaySummaries: [
      {
        id: 'market-fa-1',
        day: 18,
        category: 'signing',
        tone: 'user',
        headline: 'New York Tycoons commit $186.0M',
        detail: 'Juan Soto signed a 6-year deal at $31.0M/yr, giving the roster a middle-order anchor.',
        teamIds: ['nym'],
        playerIds: ['soto-1'],
        valueLabel: '$186.0M',
      },
      {
        id: 'market-trade-1',
        day: 17,
        category: 'trade',
        tone: 'division_rival',
        headline: 'Boston Noreasters and New York Tycoons reshaped the market',
        detail: 'Boston Noreasters sent Rafael Devers to New York Tycoons for Juan Soto.',
        teamIds: ['bos', 'nym'],
        playerIds: ['devers-1', 'soto-1'],
        valueLabel: 'Trade value +22',
      },
    ],
    commandCenter: {
      checklist: [
        {
          id: 'arbitration',
          label: 'Arbitration',
          status: 'complete',
          detail: 'No active arbitration files.',
        },
        {
          id: 'qualifying_offers',
          label: 'Qualifying Offers',
          status: 'complete',
          detail: 'No qualifying-offer decisions remain.',
        },
        {
          id: 'rule5',
          label: 'Rule 5',
          status: 'upcoming',
          detail: 'Protection audit opens after the draft.',
        },
        {
          id: 'free_agency',
          label: 'Free Agency',
          status: 'attention',
          detail: 'Market is open; fill the projected roster holes.',
        },
        {
          id: 'staff',
          label: 'Staff',
          status: 'upcoming',
          detail: 'Coaching changes open later in the offseason.',
        },
        {
          id: 'roster',
          label: 'Roster',
          status: 'attention',
          detail: 'Projected Opening Day roster has 2 open spots.',
        },
        {
          id: 'budget',
          label: 'Budget',
          status: 'blocked',
          detail: 'Payroll projects $6.0M above the owner budget.',
        },
      ],
      warnings: [
        {
          id: 'roster-active_roster_under_limit',
          severity: 'warning',
          title: 'Roster hole',
          detail: 'Active roster has 24 players (target 26).',
        },
        {
          id: 'budget-over-cap',
          severity: 'danger',
          title: 'Budget overage',
          detail: 'Projected payroll is above the owner budget.',
        },
      ],
      projectedOpeningDay: {
        activeRosterCount: 24,
        activeRosterLimit: 26,
        fortyManCount: 39,
        fortyManLimit: 40,
        payroll: 186,
        budget: 180,
        payrollSpace: -6,
        rosterHoleCount: 2,
      },
    },
    ...overrides,
  };
}

function buildWorkerMock(overrides: Record<string, unknown> = {}) {
  return {
    isReady: true,
    getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState()),
    getSeasonRecap: vi.fn().mockResolvedValue({
      season: 4,
      recap: 'A 94-68 run and a deep October push kept the contention window open.',
      storylines: [
        'Juan Soto anchored the lineup',
        'Deadline pitching depth changed the staff mix',
      ],
    }),
    getOffseasonHeadline: vi.fn().mockResolvedValue({
      season: 4,
      headline: 'October left New York with a live title window',
    }),
    advanceOffseason: vi.fn(),
    skipOffseasonPhase: vi.fn(),
    toggleRule5Protection: vi.fn().mockResolvedValue({ success: true }),
    lockRule5Protection: vi.fn(),
    makeRule5Pick: vi.fn().mockResolvedValue({ success: true }),
    passRule5Pick: vi.fn().mockResolvedValue({ success: true }),
    resolveRule5OfferBack: vi.fn().mockResolvedValue({ success: true }),
    getExtensionCandidates: vi.fn().mockResolvedValue([]),
    getQualifyingOfferEligible: vi.fn().mockResolvedValue([]),
    getQualifyingOfferSalary: vi.fn().mockResolvedValue(20.4),
    issueQualifyingOffer: vi.fn().mockResolvedValue({ success: true }),
    resolveQualifyingOffers: vi.fn().mockResolvedValue({ resolved: [] }),
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
      userTeamId: 'nym',
      teamName: 'Tycoons',
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
    expect(container.textContent).toContain('Corbin Burnes signed with Boston Noreasters for $28.5M/yr (5 years)');
    expect(container.textContent).toContain('October left New York with a live title window');
    expect(container.textContent).toContain('A 94-68 run and a deep October push kept the contention window open.');
    expect(container.innerHTML).toContain('accent-success');
    expect(container.innerHTML).toContain('accent-warning');
  });

  it('renders the offseason command center checklist, projection, and warnings', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock() as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Offseason Command Center');
    expect(container.textContent).toContain('Opening Day Projection');
    expect(container.textContent).toContain('24/26');
    expect(container.textContent).toContain('Payroll Space');
    expect(container.textContent).toContain('-$6.0M');
    expect(container.textContent).toContain('Arbitration');
    expect(container.textContent).toContain('Qualifying Offers');
    expect(container.textContent).toContain('Rule 5');
    expect(container.textContent).toContain('Free Agency');
    expect(container.textContent).toContain('Staff');
    expect(container.textContent).toContain('Roster');
    expect(container.textContent).toContain('Budget');
    expect(container.textContent).toContain('Roster hole');
    expect(container.textContent).toContain('Budget overage');
  });

  it('renders market day summaries for major offseason signings and trades', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock() as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Market Day Briefing');
    expect(container.textContent).toContain('New York Tycoons commit $186.0M');
    expect(container.textContent).toContain('Juan Soto signed a 6-year deal at $31.0M/yr');
    expect(container.textContent).toContain('Boston Noreasters and New York Tycoons reshaped the market');
    expect(container.textContent).toContain('Trade value +22');
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
                    summary: 'New York Tycoons extended a qualifying offer to Juan Slugger.',
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

  it('renders extension candidates during the extensions phase', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock({
        getOffseasonState: vi.fn().mockResolvedValue(
          buildOffseasonState({
            currentPhase: 'extensions',
            transactionGroups: [
              {
                phase: 'extensions',
                label: 'Extensions',
                rows: [
                  {
                    id: 'extension-1',
                    tone: 'user',
                    summary: 'Juan Cornerstone signed an extension with New York Tycoons for $22.4M/yr (6 years)',
                  },
                ],
              },
            ],
          }),
        ),
        getExtensionCandidates: vi.fn().mockResolvedValue([
          {
            playerId: 'ext-1',
            playerName: 'Juan Cornerstone',
            willingness: 0.72,
            yearsRemaining: 1,
            currentSalary: 9.2,
          },
        ]),
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Extensions');
    expect(container.textContent).toContain('Juan Cornerstone');
    expect(container.textContent).toContain('Willingness');
  });

  it('issues and resolves qualifying offers from the offseason control surface', async () => {
    const issueQualifyingOffer = vi.fn().mockResolvedValue({ success: true });
    const resolveQualifyingOffers = vi.fn().mockResolvedValue({ resolved: [{ playerId: 'qo-1', status: 'rejected' }] });

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
                    id: 'qo-issued-1',
                    tone: 'user',
                    summary: 'New York Tycoons issued a qualifying offer to Victor Veteran for $21.40M/yr.',
                  },
                ],
              },
            ],
          }),
        ),
        getQualifyingOfferEligible: vi.fn().mockResolvedValue([
          {
            playerId: 'qo-1',
            playerName: 'Victor Veteran',
            projectedMarketValue: 24.8,
            qualifyingOfferSalary: 21.4,
            serviceYears: 6,
          },
        ]),
        getQualifyingOfferSalary: vi.fn().mockResolvedValue(21.4),
        issueQualifyingOffer,
        resolveQualifyingOffers,
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Victor Veteran');
    expect(container.textContent).toContain('$21.40M');

    const issueButton = findButton('Issue QO');
    const resolveButton = findButton('Resolve Offers');

    await act(async () => {
      issueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      resolveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(issueQualifyingOffer).toHaveBeenCalledWith('qo-1');
    expect(resolveQualifyingOffers).toHaveBeenCalled();
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
                summary: 'New York Tycoons protected Ricky Protect on the 40-man roster',
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
                summary: 'Rule 5 Pick 1: Boston Noreasters selected Danny Stash from Portland Sasquatch',
              },
            ],
          },
        ],
        rule5: {
          phase: 'protection_audit',
          currentTeamId: null,
          draftOrder: ['ath', 'bos', 'nym'],
          consecutivePasses: 0,
          protectedCount: 4,
          protectedLimit: 40,
          protectedPlayers: [
            {
              playerId: 'keep-1',
              teamId: 'nym',
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
              teamId: 'nym',
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
    expect(container.textContent).toContain('Rule 5 Pick 1: Boston Noreasters selected Danny Stash from Portland Sasquatch');

    await act(async () => {
      findButton('Protect')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toggleRule5Protection).toHaveBeenCalledWith('risk-1');
  });

  it('renders the spring training panel with roster data and call-up candidates', async () => {
    mockedUseWorker.mockReturnValue(
      buildWorkerMock({
        getOffseasonState: vi.fn().mockResolvedValue(
          buildOffseasonState({
            currentPhase: 'spring_training',
            phaseDay: 3,
            totalDay: 80,
            transactionGroups: [],
          }),
        ),
        getSpringTrainingView: vi.fn().mockResolvedValue({
          rosterIssues: [
            { code: 'active_roster_over_limit', message: 'MLB roster has 28 players (limit 26).', severity: 'error' },
          ],
          promotionCandidates: [
            {
              playerId: 'prospect-1',
              playerName: 'Marco Callup',
              position: 'SS',
              overallRating: 340,
              currentLevel: 'AAA',
              score: 88,
              reason: 'Strong spring performance',
            },
            {
              playerId: 'prospect-2',
              playerName: 'Jake Farmhand',
              position: 'SP',
              overallRating: 295,
              currentLevel: 'AA',
              score: 72,
              reason: 'Ready for next level',
            },
          ],
          currentRosterSize: 28,
          rosterLimit: 26,
        }),
      }) as unknown as ReturnType<typeof useWorker>,
    );

    await renderPage();

    expect(container.textContent).toContain('Spring Training');
    expect(container.textContent).toContain('Finalize your 26-man roster');
    expect(container.textContent).toContain('28/26');
    expect(container.textContent).toContain('Roster Compliance Issues');
    expect(container.textContent).toContain('MLB roster has 28 players (limit 26).');
    expect(container.textContent).toContain('Top Call-Up Candidates');
    expect(container.textContent).toContain('Marco Callup');
    expect(container.textContent).toContain('Jake Farmhand');
    expect(container.textContent).toContain('Strong spring performance');
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
                    summary: 'New York Tycoons must offer offer-1 back to Boston Noreasters',
                  },
                ],
              },
            ],
            rule5: {
              phase: 'rule5_draft',
              currentTeamId: 'nym',
              draftOrder: ['nym', 'bos', 'ath'],
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
                  draftingTeamId: 'nym',
                  draftedAfterSeason: 4,
                  status: 'active',
                },
              ],
              offerBackStates: [
                {
                  playerId: 'offer-1',
                  originalTeamId: 'bos',
                  draftingTeamId: 'nym',
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

    expect(container.textContent).toContain('On Clock: New York Tycoons');
    expect(container.textContent).toContain('Consecutive Passes 1/3');
    expect(container.textContent).toContain('Theo Reserve');
    expect(container.textContent).toContain('Offer-Back Queue');
    expect(container.textContent).toContain('New York Tycoons must offer offer-1 back to Boston Noreasters');

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
