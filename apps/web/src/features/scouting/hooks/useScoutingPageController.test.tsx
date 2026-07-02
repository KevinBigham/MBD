import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScoutingPageController } from './useScoutingPageController';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useScoutingPageController>[0];
type HookResult = ReturnType<typeof useScoutingPageController>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useScoutingPageController(options));
  return null;
}

describe('useScoutingPageController', () => {
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
      autosaveActiveGame: vi.fn().mockResolvedValue(undefined),
      isInitialized: true,
      season: 7,
      userTeamId: 'nym',
      worker: {
        getIFAPool: vi.fn().mockResolvedValue({
          season: 7,
          currentPhase: 'dominican_republic',
          signingWindowOpen: true,
          budget: {
            baseAllocation: 5,
            tradedIn: 0,
            tradedOut: 0,
            committed: 1,
            remaining: 4,
          },
          staffAccuracy: 0.72,
          prospects: [],
        }),
        getOwnerState: vi.fn().mockResolvedValue({
          hotSeat: false,
          patience: 62,
          confidence: 70,
          summary: 'Ownership trusts the current scouting plan.',
        }),
        getScoutingStaff: vi.fn().mockResolvedValue([
          {
            id: 'scout-1',
            name: 'Marta Vega',
            quality: 72,
            specialty: 'international',
            bias: 'tools_lover',
          },
        ]),
        getTeamChemistry: vi.fn().mockResolvedValue({
          score: 68,
          tier: 'steady',
          summary: 'The clubhouse is stable.',
        }),
        isReady: true,
        scoutIFAPlayer: vi.fn().mockResolvedValue({
          success: true,
          report: {
            playerId: 'ifa-1',
            playerName: 'Rafael Cruz',
            position: 'SS',
            age: 17,
            region: 'dominican_republic',
            country: 'Dominican Republic',
            overall: 54,
            ceiling: 68,
            floor: 41,
            grades: { contact: 55, power: 45, eye: 50, speed: 60, defense: 57, durability: 52 },
            confidence: 6,
            looks: 1,
            expectedBonus: 1.75,
          },
        }),
        scoutPlayerReport: vi.fn().mockResolvedValue({
          playerId: 'player-1',
          playerName: 'Cole Hart',
          position: 'CF',
          age: 25,
          teamName: 'Boston Noreasters',
          isPitcher: false,
          grades: { contact: 58, power: 52, eye: 49, speed: 61, defense: 57, durability: 54 },
          confidence: 5,
          overall: 56,
          ceiling: 64,
          floor: 47,
          notes: 'Plus range with playable bat.',
          scoutName: 'Marta Vega',
          date: 'Season 7 Day 10',
          reliability: 4,
        }),
        searchPlayers: vi.fn().mockResolvedValue([
          {
            id: 'player-1',
            firstName: 'Cole',
            lastName: 'Hart',
            age: 25,
            position: 'CF',
          },
        ]),
        signIFAPlayer: vi.fn().mockResolvedValue({ success: true, remainingBudget: 2.25 }),
        tradeIFAPoolSpace: vi.fn().mockResolvedValue({ success: true, remainingBudget: 3.5 }),
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

  it('builds scouting content props from existing worker data and local route state', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.scouts[0]?.name).toBe('Marta Vega');
      expect(latestResult?.contentProps.chemistry?.summary).toContain('stable');
      expect(latestResult?.contentProps.ownerState?.summary).toContain('scouting plan');
      expect(latestResult?.contentProps.ifaPool?.budget.remaining).toBe(4);
      expect(latestResult?.contentProps.tradeTargets.some((team) => team.id === 'nym')).toBe(false);
    });

    act(() => {
      latestResult?.contentProps.onChangeView('pro');
      latestResult?.contentProps.onChangeSearchQuery('Cole');
    });

    expect(latestResult?.contentProps.activeView).toBe('pro');
    expect(latestResult?.contentProps.searchQuery).toBe('Cole');

    await act(async () => {
      await latestResult?.contentProps.onSearch();
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.searchResults[0]?.firstName).toBe('Cole');
    });

    await act(async () => {
      await latestResult?.contentProps.onScoutPlayer(latestResult!.contentProps.searchResults[0]!);
    });

    await waitForAssertion(() => {
      expect(latestResult?.contentProps.scoutReport?.playerName).toBe('Cole Hart');
      expect(latestResult?.contentProps.searchResults).toEqual([]);
    });
    expect(options.worker.scoutPlayerReport).toHaveBeenCalledWith('player-1');
    expect(options.autosaveActiveGame).toHaveBeenCalledWith({ season: 7 });
  });
});
