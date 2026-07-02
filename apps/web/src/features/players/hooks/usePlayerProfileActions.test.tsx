import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { usePlayerProfileActions } from './usePlayerProfileActions';
import type { PlayerProfileView } from '../components/playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePlayerProfileActions>[0];
type HookResult = ReturnType<typeof usePlayerProfileActions>;
type PlayerProfilePlayer = NonNullable<PlayerProfileView['player']>;

const basePlayer = {
  id: 'player-1',
  historical: false,
  position: 'SS',
  rosterStatus: 'AA',
  minorLeagueLevel: 'AA',
  optionYearsUsed: 1,
  isOutOfOptions: false,
} as PlayerProfilePlayer;

const baseOffer = {
  years: 5,
  annualSalary: 18.25,
  totalValue: 91.25,
  noTradeClause: false,
  noTradeClauseType: 'none',
  playerOption: false,
  teamOption: false,
  optOutYears: [],
  signingBonus: 0,
  buyoutAmount: 0,
  deferredMoney: [],
} as const;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  const result = usePlayerProfileActions(options);
  onRender(result);
  return null;
}

describe('usePlayerProfileActions', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: HookResult | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latest = null;
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    const worker = {
      getExtensionOffer: vi.fn().mockResolvedValue(baseOffer),
      negotiateExtension: vi.fn().mockResolvedValue({ status: 'accepted', rounds: [] }),
      promotePlayer: vi.fn().mockResolvedValue({ success: true }),
      demotePlayer: vi.fn().mockResolvedValue({ success: true }),
      designateForAssignment: vi.fn().mockResolvedValue({ success: true }),
    };
    const fetchProfile = vi.fn().mockResolvedValue(undefined);
    const autosaveActiveGame = vi.fn().mockResolvedValue({ saved: true, saveName: 'Test Save' });

    return {
      options: {
        player: basePlayer,
        worker,
        season: 4,
        fetchProfile,
        autosaveActiveGame,
        ...overrides,
      } as HookOptions,
      worker,
      fetchProfile,
      autosaveActiveGame,
    };
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
    });
    return getLatest();
  }

  function getLatest() {
    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('negotiates the quick five-year extension and refreshes the profile', async () => {
    const { options, worker, fetchProfile, autosaveActiveGame } = makeOptions();
    let result = await renderHook(options);

    await act(async () => {
      await result.handleExtend();
    });
    result = getLatest();

    expect(worker.getExtensionOffer).toHaveBeenCalledWith('player-1', 5);
    expect(worker.negotiateExtension).toHaveBeenCalledWith('player-1', baseOffer);
    expect(result.actionState).toMatchObject({
      tone: 'success',
      message: 'Extension accepted at $18.3M AAV for 5 years.',
    });
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 4 });
    expect(result.busyAction).toBeNull();
  });

  it('builds and confirms a pending DFA action with refresh and autosave', async () => {
    const { options, worker, fetchProfile, autosaveActiveGame } = makeOptions();
    let result = await renderHook(options);

    await act(async () => {
      result.requestRosterAction('dfa');
    });
    result = getLatest();

    expect(result.pendingRosterAction).toMatchObject({
      action: 'dfa',
      title: 'Designate for Assignment',
      detail: 'SS | AA | Options used 1',
    });

    await act(async () => {
      await result.confirmPendingRosterAction();
    });
    result = getLatest();

    expect(worker.designateForAssignment).toHaveBeenCalledWith('player-1');
    expect(result.pendingRosterAction).toBeNull();
    expect(result.actionState).toMatchObject({
      tone: 'success',
      message: 'Player designated for assignment and profile refreshed.',
    });
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 4 });
    expect(result.busyAction).toBeNull();
  });

  it('reports roster-action failures without refreshing or autosaving', async () => {
    const { options, worker, fetchProfile, autosaveActiveGame } = makeOptions();
    worker.promotePlayer.mockResolvedValue({ success: false, error: '40-man roster is full.' });
    let result = await renderHook(options);

    await act(async () => {
      result.requestRosterAction('promote');
    });
    result = getLatest();

    await act(async () => {
      await result.confirmPendingRosterAction();
    });
    result = getLatest();

    expect(worker.promotePlayer).toHaveBeenCalledWith('player-1');
    expect(result.actionState).toMatchObject({
      tone: 'error',
      message: '40-man roster is full.',
    });
    expect(fetchProfile).not.toHaveBeenCalled();
    expect(autosaveActiveGame).not.toHaveBeenCalled();
    expect(result.busyAction).toBeNull();
  });
});
