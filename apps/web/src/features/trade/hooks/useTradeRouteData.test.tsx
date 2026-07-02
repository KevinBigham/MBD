import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradeRouteData } from './useTradeRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeRouteData>[0];
type HookResult = ReturnType<typeof useTradeRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeRouteData(options));
  return null;
}

describe('useTradeRouteData', () => {
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
      day: 95,
      getOpenNegotiations: vi.fn().mockResolvedValue([
        { id: 'neg-1', teamId: 'bos', teamName: 'Boston Noreasters' },
      ]),
      getRelationships: vi.fn().mockResolvedValue([
        { teamId: 'bos', teamName: 'Boston Noreasters', relationshipScore: 62 },
      ]),
      getSeasonFlowState: vi.fn().mockResolvedValue({ status: 'regular' }),
      getTeamRoster: vi.fn().mockImplementation(async (teamId: string) => (
        teamId === 'nym'
          ? [{ id: 'user-1', lastName: 'Volpe', teamId }]
          : [{ id: 'target-1', lastName: 'Anthony', teamId }]
      )),
      getTradeAssetInventory: vi.fn().mockImplementation(async (teamId: string) => (
        teamId === 'nym'
          ? { draftPicks: [{ key: 'draft-user' }], ifaRemaining: 3.5 }
          : { draftPicks: [{ key: 'draft-target' }], ifaRemaining: 2.25 }
      )),
      getTradeDeadlineState: vi.fn().mockResolvedValue({
        currentPhase: 'regular',
        daysUntilDeadline: 4,
        deadlineMode: true,
        hotOffers: [{ id: 'offer-1', fromTeamId: 'bos' }],
      }),
      getTradeHistory: vi.fn().mockResolvedValue([
        { id: 'history-1', summary: 'Deadline move' },
      ]),
      isInitialized: true,
      phase: 'regular',
      season: 4,
      selectedTeam: 'bos',
      userTeamId: 'nym',
      workerReady: true,
      ...overrides,
    };
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

  it('loads trade route data when the route and worker are ready', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.yourRoster).toEqual([{ id: 'user-1', lastName: 'Volpe', teamId: 'nym' }]);
      expect(latestResult?.targetRoster).toEqual([{ id: 'target-1', lastName: 'Anthony', teamId: 'bos' }]);
      expect(latestResult?.yourInventory.ifaRemaining).toBe(3.5);
      expect(latestResult?.targetInventory.ifaRemaining).toBe(2.25);
      expect(latestResult?.tradeHistory).toEqual([{ id: 'history-1', summary: 'Deadline move' }]);
      expect(latestResult?.incomingOffers).toEqual([{ id: 'offer-1', fromTeamId: 'bos' }]);
      expect(latestResult?.deadlineState?.daysUntilDeadline).toBe(4);
      expect(latestResult?.seasonFlowStatus).toBe('regular');
      expect(latestResult?.relationships).toEqual([
        { teamId: 'bos', teamName: 'Boston Noreasters', relationshipScore: 62 },
      ]);
      expect(latestResult?.openNegotiations).toEqual([
        { id: 'neg-1', teamId: 'bos', teamName: 'Boston Noreasters' },
      ]);
      expect(latestResult?.openNegotiationsLoading).toBe(false);
    });

    expect(options.getTeamRoster).toHaveBeenCalledWith('nym');
    expect(options.getTeamRoster).toHaveBeenCalledWith('bos');
    expect(options.getTradeAssetInventory).toHaveBeenCalledWith('nym');
    expect(options.getTradeAssetInventory).toHaveBeenCalledWith('bos');
    expect(options.getTradeHistory).toHaveBeenCalledTimes(1);
    expect(options.getTradeDeadlineState).toHaveBeenCalledTimes(1);
    expect(options.getRelationships).toHaveBeenCalledTimes(1);
    expect(options.getOpenNegotiations).toHaveBeenCalledTimes(1);
  });

  it('clears target roster and inventory when no trade partner is selected', async () => {
    const options = baseOptions({ selectedTeam: '' });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.loading).toBe(false);
      expect(latestResult?.targetRoster).toEqual([]);
      expect(latestResult?.targetInventory).toEqual({ draftPicks: [], ifaRemaining: 0 });
    });

    expect(options.getTeamRoster).toHaveBeenCalledWith('nym');
    expect(options.getTeamRoster).not.toHaveBeenCalledWith('');
    expect(options.getTradeAssetInventory).toHaveBeenCalledWith('nym');
    expect(options.getTradeAssetInventory).not.toHaveBeenCalledWith('');
  });

  it('clears open negotiations when the route is no longer initialized', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.openNegotiations).toEqual([
        { id: 'neg-1', teamId: 'bos', teamName: 'Boston Noreasters' },
      ]);
    });

    await renderHook(baseOptions({
      getOpenNegotiations: options.getOpenNegotiations,
      isInitialized: false,
    }));

    await waitForAssertion(() => {
      expect(latestResult?.openNegotiations).toEqual([]);
    });

    expect(options.getOpenNegotiations).toHaveBeenCalledTimes(1);
  });
});
