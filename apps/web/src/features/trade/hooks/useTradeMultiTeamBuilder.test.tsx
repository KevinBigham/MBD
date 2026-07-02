import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import { useTradeMultiTeamBuilder } from './useTradeMultiTeamBuilder';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useTradeMultiTeamBuilder>[0];
type HookResult = ReturnType<typeof useTradeMultiTeamBuilder>;

function player(id: string, teamId: string, rating = 70): PlayerDTO {
  return {
    id,
    firstName: 'Test',
    lastName: id,
    age: 25,
    position: 'SS',
    overallRating: rating,
    displayRating: rating,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId,
    stats: null,
  } as unknown as PlayerDTO;
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useTradeMultiTeamBuilder(options));
  return null;
}

describe('useTradeMultiTeamBuilder', () => {
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
      evaluateMultiTeamFairness: vi.fn().mockResolvedValue({
        success: true,
        message: 'Room read updated.',
        fairness: { score: 71, summary: 'Balanced room' },
      }),
      executeMultiTeamTrade: vi.fn().mockResolvedValue({
        success: true,
        accepted: true,
        message: 'Three-team framework accepted.',
        narrative: '',
        fairness: { score: 79, summary: 'Executable room' },
        cascadeEvents: [],
        pendingTrades: [],
      }),
      generateConditionalClause: vi.fn().mockResolvedValue({
        success: true,
        message: 'Condition added.',
        condition: {
          type: 'performance',
          playerId: 'u-high',
          threshold: 2,
          deadline: 120,
          description: 'u-high reaches 2 WAR',
        },
      }),
      getTeamRoster: vi.fn().mockImplementation(async (teamId: string) => [
        player(`${teamId}-1`, teamId, 68),
        player(`${teamId}-2`, teamId, 74),
      ]),
      isInitialized: true,
      onTradeResultChange: vi.fn(),
      persistTradeSnapshot: vi.fn().mockResolvedValue(undefined),
      proposeMultiTeam: vi.fn().mockResolvedValue({
        accepted: false,
        message: 'Framework needs one more piece.',
        fairness: { score: 65, summary: 'Close room' },
      }),
      refreshAfterExecution: vi.fn().mockResolvedValue(undefined),
      selectedTeam: 'bos',
      targetRoster: [
        player('t-low', 'bos', 63),
        player('t-high', 'bos', 77),
      ],
      userTeamId: 'nym',
      workerReady: true,
      yourRoster: [
        player('u-low', 'nym', 61),
        player('u-high', 'nym', 82),
      ],
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

  it('opens the builder with current user and target rosters, then clears stale feedback on lane edits', async () => {
    await renderHook(baseOptions());

    await act(async () => {
      latestResult?.openMultiTeamBuilder();
    });

    expect(latestResult?.multiTeamOpen).toBe(true);
    expect(latestResult?.multiTeamLanes).toHaveLength(3);
    expect(latestResult?.multiTeamRosters.nym?.map((candidate) => candidate.id)).toEqual(['u-high', 'u-low']);
    expect(latestResult?.multiTeamRosters.bos?.map((candidate) => candidate.id)).toEqual(['t-high', 't-low']);

    await act(async () => {
      await latestResult?.handleEvaluateMultiTeamFramework();
    });

    expect(latestResult?.multiTeamFairness).toEqual({ score: 71, summary: 'Balanced room' });
    expect(latestResult?.multiTeamMessage).toBe('Room read updated.');

    await act(async () => {
      latestResult?.setMultiTeamLaneTeam('lane-3', 'sea');
    });

    expect(latestResult?.multiTeamFairness).toBeNull();
    expect(latestResult?.multiTeamMessage).toBeNull();
    expect(latestResult?.multiTeamLanes.find((lane) => lane.laneId === 'lane-3')?.teamId).toBe('sea');

    await waitForAssertion(() => {
      expect(latestResult?.multiTeamRosters.sea?.map((candidate) => candidate.id)).toEqual(['sea-2', 'sea-1']);
    });
  });

  it('adds conditional clauses and executes accepted frameworks through existing worker callbacks', async () => {
    const options = baseOptions();
    await renderHook(options);

    await act(async () => {
      latestResult?.openMultiTeamBuilder();
      latestResult?.toggleMultiTeamPlayer('lane-1', 'u-high');
    });

    await act(async () => {
      await latestResult?.handleAddConditionalClause();
    });

    expect(options.generateConditionalClause).toHaveBeenCalledWith('u-high');
    expect(latestResult?.multiTeamConditions).toHaveLength(1);
    expect(latestResult?.multiTeamConditionPlayerId).toBe('u-high');

    await act(async () => {
      await latestResult?.handleProposeMultiTeamFramework();
    });

    expect(options.proposeMultiTeam).toHaveBeenCalledWith(expect.objectContaining({
      teams: expect.arrayContaining([
        expect.objectContaining({ teamId: 'nym', sendingPlayerIds: ['u-high'] }),
      ]),
    }));
    expect(latestResult?.multiTeamProposalResult?.message).toBe('Framework needs one more piece.');

    await act(async () => {
      await latestResult?.handleExecuteMultiTeamFramework();
    });

    expect(options.executeMultiTeamTrade).toHaveBeenCalledTimes(1);
    expect(options.refreshAfterExecution).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(options.onTradeResultChange).toHaveBeenCalledWith({
      status: 'accepted',
      message: 'Three-team framework accepted.',
    });
    expect(latestResult?.multiTeamOpen).toBe(false);
  });

  it('persists an accepted framework before the refresh, even when the refresh rejects', async () => {
    const order: string[] = [];
    const persistTradeSnapshot = vi.fn().mockImplementation(async () => {
      order.push('persist');
    });
    const refreshAfterExecution = vi.fn().mockImplementation(async () => {
      order.push('refresh');
      throw new Error('refresh offline');
    });
    const options = baseOptions({ persistTradeSnapshot, refreshAfterExecution });
    await renderHook(options);

    await act(async () => {
      latestResult?.openMultiTeamBuilder();
      latestResult?.toggleMultiTeamPlayer('lane-1', 'u-high');
    });

    await act(async () => {
      await latestResult?.handleExecuteMultiTeamFramework();
    });

    // The executed framework was persisted before the refresh that later rejected.
    expect(persistTradeSnapshot).toHaveBeenCalledTimes(1);
    expect(refreshAfterExecution).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['persist', 'refresh']);
    expect(latestResult?.multiTeamOpen).toBe(false);
    expect(latestResult?.multiTeamSubmitting).toBe(false);
  });

  it('does not persist rejected multi-team executions', async () => {
    const options = baseOptions({
      executeMultiTeamTrade: vi.fn().mockResolvedValue({
        success: false,
        accepted: false,
        message: 'Framework rejected.',
        narrative: '',
        fairness: { score: 44, summary: 'Too light' },
        cascadeEvents: [],
        pendingTrades: [],
      }),
    });
    await renderHook(options);

    await act(async () => {
      latestResult?.openMultiTeamBuilder();
      latestResult?.toggleMultiTeamPlayer('lane-1', 'u-high');
    });

    await act(async () => {
      await latestResult?.handleExecuteMultiTeamFramework();
    });

    expect(options.refreshAfterExecution).toHaveBeenCalledTimes(1);
    expect(options.persistTradeSnapshot).not.toHaveBeenCalled();
    expect(latestResult?.multiTeamOpen).toBe(true);
  });
});
