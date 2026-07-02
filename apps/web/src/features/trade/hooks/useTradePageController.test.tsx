import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradePageController } from './useTradePageController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradePageController>[0];
type HookResult = ReturnType<typeof useTradePageController>;

function createWorkerMock(overrides: Partial<HookOptions['worker']> = {}): HookOptions['worker'] {
  return {
    isReady: true,
    getTeamRoster: vi.fn().mockImplementation(async (teamId: string) => [
      { id: `${teamId}-player`, firstName: 'Test', lastName: 'Player', teamId, position: 'SS' },
    ]),
    getTradeHistory: vi.fn().mockResolvedValue([{ id: 'history-1', summary: 'Deadline swap' }]),
    getTradeDeadlineState: vi.fn().mockResolvedValue({
      currentPhase: 'regular',
      daysUntilDeadline: 6,
      deadlineMode: true,
      hotOffers: [],
      ticker: [],
      countdownLabel: '6 days',
    }),
    getTradeDialogue: vi.fn().mockResolvedValue({
      mode: 'buyer',
      urgency: 'medium',
      headline: 'Live trade room',
      lines: ['We are listening.'],
    }),
    getTradeAssetInventory: vi.fn().mockImplementation(async (teamId: string) => ({
      draftPicks: [{ key: `${teamId}-pick`, label: 'Round 1', asset: { type: 'draft_pick', season: 4, round: 1, originalTeamId: teamId } }],
      ifaRemaining: 2.5,
    })),
    getRelationships: vi.fn().mockResolvedValue([
      {
        teamId: 'bos',
        teamName: 'Boston Noreasters',
        teamAbbreviation: 'BOS',
        score: 70,
        tier: 'trusted',
        tooltip: 'Recent front-office history',
      },
    ]),
    getOpenNegotiations: vi.fn().mockResolvedValue([]),
    evaluateMultiTeamFairness: vi.fn().mockResolvedValue(null),
    generateConditionalClause: vi.fn().mockResolvedValue(null),
    startNegotiation: vi.fn().mockResolvedValue(null),
    advanceNegotiation: vi.fn().mockResolvedValue(null),
    resolveNegotiation: vi.fn().mockResolvedValue(null),
    proposeMultiTeam: vi.fn().mockResolvedValue(null),
    executeMultiTeamTrade: vi.fn().mockResolvedValue(null),
    respondToTradeOffer: vi.fn().mockResolvedValue(null),
    exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
    getSeasonFlowState: vi.fn().mockResolvedValue({ status: 'regular' }),
    ...overrides,
  } as HookOptions['worker'];
}

function createGameState(overrides: Partial<HookOptions['game']> = {}): HookOptions['game'] {
  return {
    userTeamId: 'nym',
    isInitialized: true,
    day: 95,
    season: 4,
    phase: 'regular',
    activeSaveId: 'save-root',
    activeSaveSlot: null,
    gmName: 'Casey',
    teamName: 'New York Tycoons',
    ...overrides,
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradePageController(options));
  return null;
}

describe('useTradePageController', () => {
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

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <HookHarness options={options} onRender={(result) => {
            latestResult = result;
          }} />
        </MemoryRouter>,
      );
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

  it('builds trade page shell and content props while preserving target-team refresh behavior', async () => {
    const worker = createWorkerMock();
    const deadlineDramaSlot = <div data-testid="deadline-drama-slot" />;

    await renderHook({
      deadlineDramaSlot,
      game: createGameState(),
      worker,
    });

    await waitForAssertion(() => {
      expect(latestResult?.pageShellLoading).toBe(false);
      expect(latestResult?.contentProps.deadlineDramaSlot).toBe(deadlineDramaSlot);
      expect(latestResult?.contentProps.deadlineDashboardProps.deadlineState?.countdownLabel).toBe('6 days');
      expect(latestResult?.contentProps.builderStackProps.builderProps.contextProps.selectedTeam).toBe('');
    });

    await act(async () => {
      latestResult?.contentProps.builderStackProps.builderProps.contextProps.onSelectTeam('bos');
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.builderStackProps.builderProps.contextProps.selectedTeam).toBe('bos');
      expect(worker.getTeamRoster).toHaveBeenCalledWith('bos');
      expect(worker.getTradeAssetInventory).toHaveBeenCalledWith('bos');
    });
  });
});
