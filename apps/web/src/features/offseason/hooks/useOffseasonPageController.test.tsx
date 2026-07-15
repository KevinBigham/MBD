import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OffseasonData } from './useOffseasonRouteData';
import { useOffseasonPageController } from './useOffseasonPageController';

vi.mock('@/shared/hooks/useExactOffseasonMutationExecutor', () => ({
  didExactSaveGameplayResultChange: (result: { flowStateChanged?: boolean }) => result.flowStateChanged !== false,
  useExactOffseasonMutationExecutor: (worker: { execute: (session: object, operation: string) => Promise<unknown> }) =>
    (operation: string) => worker.execute({}, operation),
  useExactSaveMutationExecutor: (worker: { execute: (session: object, operation: unknown) => Promise<unknown> }) =>
    (operation: unknown) => worker.execute({}, operation),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useOffseasonPageController>[0];
type HookResult = ReturnType<typeof useOffseasonPageController>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useOffseasonPageController(options));
  return null;
}

function buildOffseasonState(overrides: Partial<OffseasonData> = {}): OffseasonData {
  return {
    currentPhase: 'free_agency',
    phaseDay: 8,
    totalDay: 18,
    completed: false,
    phaseResults: {
      arbitrationResolved: [{ id: 'arb-1' }],
      tenderedPlayers: [],
      nonTenderedPlayers: [],
      extensions: [],
      qualifyingOffers: [],
      coachChanges: [],
      freeAgentSignings: [{ id: 'fa-1' }],
      draftPicks: [],
      ifaSignings: [],
      retiredPlayers: [],
    },
    transactionGroups: [
      {
        phase: 'free_agency',
        label: 'Free Agency',
        rows: [
          {
            id: 'fa-1',
            tone: 'user',
            summary: 'New York Tycoons signed a middle-order bat.',
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
        detail: 'A six-year deal gives the roster a middle-order anchor.',
        teamIds: ['nym'],
        playerIds: ['slugger-1'],
        valueLabel: '$186.0M',
      },
    ],
    ...overrides,
  };
}

describe('useOffseasonPageController', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      autosaveActiveGame: vi.fn().mockResolvedValue({ saved: true }),
      isInitialized: true,
      phase: 'offseason',
      playEffect: vi.fn(),
      season: 5,
      userTeamId: 'nym',
      worker: {
        advanceOffseason: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'draft' })),
        getExtensionCandidates: vi.fn().mockResolvedValue([]),
        getOffseasonHeadline: vi.fn().mockResolvedValue({
          season: 5,
          headline: 'October left New York with leverage',
        }),
        getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState()),
        getQualifyingOfferEligible: vi.fn().mockResolvedValue([]),
        getQualifyingOfferSalary: vi.fn().mockResolvedValue(21.4),
        getSeasonRecap: vi.fn().mockResolvedValue({
          season: 5,
          recap: 'A 94-win season kept the title window live.',
          storylines: ['The lineup stayed elite.'],
        }),
        getSpringTrainingView: vi.fn().mockResolvedValue(null),
        isReady: true,
        issueQualifyingOffer: vi.fn().mockResolvedValue({ success: true }),
        lockRule5Protection: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'rule5_draft' })),
        makeRule5Pick: vi.fn().mockResolvedValue({ success: true }),
        passRule5Pick: vi.fn().mockResolvedValue({ success: true }),
        exactSaveMutation: {
          exportSnapshot: vi.fn(),
          execute: vi.fn().mockImplementation((_session, operation) => (
            operation === 'advanceOffseason'
              ? Promise.resolve(buildOffseasonState({ currentPhase: 'draft' }))
              : Promise.resolve(buildOffseasonState({ currentPhase: 'arbitration' }))
          )),
          restoreBaseline: vi.fn(),
          publishFlow: vi.fn(),
          discardFlow: vi.fn(),
        },
        resolveQualifyingOffers: vi.fn().mockResolvedValue({ resolved: [] }),
        resolveRule5OfferBack: vi.fn().mockResolvedValue({ success: true }),
        skipOffseasonPhase: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'arbitration' })),
        toggleRule5Protection: vi.fn().mockResolvedValue({ success: true }),
      },
      ...overrides,
    } as HookOptions;
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  async function waitForAssertion(assertion: () => void) {
    let lastError: unknown;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        assertion();
        return;
      } catch (error) {
        lastError = error;
      }
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
    throw lastError;
  }

  it('builds offseason content props from route data and existing action handlers', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.contentProps?.currentPhaseConfig.label).toBe('Free Agency');
      expect(latestResult?.contentProps?.currentPhaseIndex).toBe(5);
      expect(latestResult?.contentProps?.phaseSteps.map((step) => step.label)).toContain('Spring Training');
      expect(latestResult?.contentProps?.marketDaySummaries[0]?.headline).toContain('commit $186.0M');
      expect(latestResult?.contentProps?.expandedPhases.free_agency).toBe(true);
      expect(latestResult?.contentProps?.seasonRecap?.recap).toContain('94-win');
    });

    await act(async () => {
      latestResult?.contentProps?.onToggleGroup('free_agency');
    });

    expect(latestResult?.contentProps?.expandedPhases.free_agency).toBe(false);

    await act(async () => {
      await latestResult?.contentProps?.onAdvance();
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps?.currentPhaseConfig.label).toBe('Amateur Draft');
    });
    expect(options.worker.exactSaveMutation.execute).toHaveBeenCalledTimes(1);
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });

  it('passes the selected player through the argument-bearing exact-save QO operation', async () => {
    const options = baseOptions({
      worker: {
        ...baseOptions().worker,
        getOffseasonState: vi.fn().mockResolvedValue(buildOffseasonState({ currentPhase: 'qualifying_offers' })),
        exactSaveMutation: {
          ...baseOptions().worker.exactSaveMutation,
          execute: vi.fn().mockResolvedValue({ success: true, flowStateChanged: true }),
        },
      },
    });
    await renderHook(options);
    await waitForAssertion(() => {
      expect(latestResult?.contentProps?.currentPhaseConfig.label).toBe('Qualifying Offers');
    });
    await act(async () => {
      await latestResult?.contentProps?.onIssueQualifyingOffer('player-qo-1');
    });
    expect(options.worker.exactSaveMutation.execute).toHaveBeenCalledWith(
      {},
      { kind: 'issueQualifyingOffer', playerId: 'player-qo-1' },
    );
    expect(options.autosaveActiveGame).not.toHaveBeenCalled();
  });
});
