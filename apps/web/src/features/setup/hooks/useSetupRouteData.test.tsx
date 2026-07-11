import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useSetupRouteData } from './useSetupRouteData';
import { logger } from '@/shared/lib/logger';
import type { SetupPreview, SetupTeamOption } from '../components/SetupTeamPickerPanel';
import type { LocalStorageEstimate, SaveTreeEntry } from '@/shared/lib/saveSystem';
import type { OriginStorageEstimate } from '@/shared/lib/storagePressure';

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useSetupRouteData>[0];
type HookResult = ReturnType<typeof useSetupRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useSetupRouteData(options));
  return null;
}

const teamOptions = [
  { id: 'nym', label: 'New York Tycoons' },
  { id: 'bos', label: 'Boston Noreasters' },
  { id: 'kc', label: 'Kansas City BBQ Fountains' },
] as const satisfies readonly SetupTeamOption[];

const scenarioCatalog = [
  {
    id: 'win-now',
    name: 'Win Now',
    description: 'A short-window title chase.',
    difficulty: 'hard',
    maxSeasons: 3,
    requiresCareerMode: false,
    startingTeamId: 'bos',
  },
  {
    id: 'rebuild',
    name: 'Rebuild',
    description: 'A patient prospect-heavy climb.',
    difficulty: 'standard',
    maxSeasons: 5,
    requiresCareerMode: true,
    startingTeamId: 'kc',
  },
] as const;

function previewFor(teamId: string): SetupPreview {
  const label = teamOptions.find((team) => team.id === teamId)?.label ?? teamId;
  return {
    teamId,
    teamName: label,
    division: 'AL_EAST',
    archetype: teamId === 'bos' ? 'October Pressure' : 'Balanced Contender',
    franchiseHook: `${label} dossier`,
    whyNow: 'The front office needs a clean read before opening day.',
    marketSize: teamId === 'kc' ? 'small' : 'large',
    timeline: teamId === 'bos' ? 'Win now' : 'Balanced',
    payrollTier: teamId === 'kc' ? 'Lean' : 'Premier',
    farmSystemRating: teamId === 'kc' ? 'A-' : 'B',
    strengths: ['rotation depth'],
    weaknesses: ['bullpen volatility'],
    teamIdentityBlurb: `${label} identity`,
    projectedRecord: teamId === 'bos' ? '91-71' : '86-76',
    topPlayers: [
      { playerId: `${teamId}-star`, name: 'Anchor Star', position: 'CF', overall: 78 },
    ],
    divisionRivals: [
      { teamId: 'nym', teamName: 'New York Tycoons' },
    ],
  };
}

function saveTreeForSlots(slots: number[]): SaveTreeEntry[] {
  return slots.map((slot) => ({
    save: {
      id: `save-slot-${slot}`,
      slotNumber: slot,
      name: `Slot ${slot}`,
      season: 2,
      day: 42,
      phase: 'regular',
      schemaVersion: 34,
      hasSnapshot: false,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T12:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    },
    branches: [],
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, reject, resolve };
}

function localEstimate(bytes: number): LocalStorageEstimate {
  return {
    status: 'available',
    allMbdBytes: bytes,
    allMbdBytesKnown: true,
    unattributedBytes: 0,
    trees: [],
    message: null,
  };
}

function originEstimate(percentage: number): OriginStorageEstimate {
  return {
    status: 'available',
    usage: percentage,
    quota: 100,
    percentage,
    pressure: percentage >= 90 ? 'critical' : percentage >= 80 ? 'warning' : 'normal',
  };
}

describe('useSetupRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;
  let rootUnmounted: boolean;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;
    rootUnmounted = false;
  });

  afterEach(async () => {
    if (!rootUnmounted) {
      await act(async () => {
        root.unmount();
      });
    }
    container.remove();
    vi.clearAllMocks();
  });

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      difficulty: 'standard',
      getScenarioCatalog: vi.fn().mockResolvedValue(scenarioCatalog),
      getSetupPreview: vi.fn().mockImplementation(async ({ userTeamId }: { userTeamId: string }) => previewFor(userTeamId)),
      isWorkerReady: true,
      listSaveTree: vi.fn().mockResolvedValue(saveTreeForSlots([1, 2])),
      readLocalStorageEstimate: vi.fn().mockResolvedValue(localEstimate(1000)),
      readOriginStorageEstimate: vi.fn().mockResolvedValue(originEstimate(50)),
      seed: 42,
      teamId: 'nym',
      teamOptions,
      wizardMode: 'dynasty',
      wizardOpen: true,
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

  it('loads save-tree data and dynasty previews for every selectable team', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.saveTree).toHaveLength(2);
      expect(latestResult?.selectedSlot).toBe(3);
      expect(latestResult?.scenarioCatalog).toEqual(scenarioCatalog);
      expect(latestResult?.selectedScenarioId).toBe('win-now');
      expect(Object.keys(latestResult?.previewMap ?? {}).sort()).toEqual(['bos', 'kc', 'nym']);
      expect(latestResult?.activePreview?.teamId).toBe('nym');
    });

    expect(options.listSaveTree).toHaveBeenCalledTimes(1);
    expect(options.getScenarioCatalog).toHaveBeenCalledTimes(1);
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'nym',
      difficulty: 'standard',
    });
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'bos',
      difficulty: 'standard',
    });
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'kc',
      difficulty: 'standard',
    });
  });

  it('loads only the selected scenario starter preview in scenario mode', async () => {
    const options = baseOptions({ wizardMode: 'scenario' });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.selectedScenarioId).toBe('win-now');
      expect(latestResult?.selectedScenario?.startingTeamId).toBe('bos');
      expect(latestResult?.activePreview?.teamId).toBe('bos');
      expect(Object.keys(latestResult?.previewMap ?? {})).toEqual(['bos']);
    });

    expect(options.getSetupPreview).toHaveBeenCalledTimes(1);
    expect(options.getSetupPreview).toHaveBeenCalledWith({
      seed: 42,
      userTeamId: 'bos',
      difficulty: 'standard',
    });
  });

  it('skips worker preview calls until the wizard and worker are ready', async () => {
    const options = baseOptions({ isWorkerReady: false, wizardOpen: false });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.saveTree).toHaveLength(2);
      expect(latestResult?.selectedSlot).toBe(3);
    });

    expect(options.getScenarioCatalog).not.toHaveBeenCalled();
    expect(options.getSetupPreview).not.toHaveBeenCalled();
  });

  it('surfaces a status message when preview loading fails', async () => {
    const options = baseOptions({
      getSetupPreview: vi.fn().mockRejectedValue(new Error('preview failed')),
    });
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.status).toBe('Failed to build the dynasty previews.');
    });
  });

  it('installs only the newest coherent save-tree and storage bundle', async () => {
    const firstTree = deferred<SaveTreeEntry[]>();
    const firstLocal = deferred<LocalStorageEstimate>();
    const firstOrigin = deferred<OriginStorageEstimate>();
    const secondTree = deferred<SaveTreeEntry[]>();
    const secondLocal = deferred<LocalStorageEstimate>();
    const secondOrigin = deferred<OriginStorageEstimate>();
    const options = baseOptions({
      listSaveTree: vi.fn()
        .mockReturnValueOnce(firstTree.promise)
        .mockReturnValueOnce(secondTree.promise),
      readLocalStorageEstimate: vi.fn()
        .mockReturnValueOnce(firstLocal.promise)
        .mockReturnValueOnce(secondLocal.promise),
      readOriginStorageEstimate: vi.fn()
        .mockReturnValueOnce(firstOrigin.promise)
        .mockReturnValueOnce(secondOrigin.promise),
    });
    await renderHook(options);
    let newest!: Promise<void>;
    await act(async () => {
      newest = latestResult!.refreshSaves();
      secondTree.resolve(saveTreeForSlots([1, 2, 3]));
      secondLocal.resolve(localEstimate(2000));
      secondOrigin.resolve(originEstimate(85));
      await newest;
    });
    expect(latestResult?.saveTree).toHaveLength(3);
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(2000);
    expect(latestResult?.originEstimate?.percentage).toBe(85);
    expect(latestResult?.selectedSlot).toBe(4);

    await act(async () => {
      firstTree.resolve(saveTreeForSlots([1]));
      firstLocal.resolve(localEstimate(1000));
      firstOrigin.resolve(originEstimate(20));
      await Promise.all([firstTree.promise, firstLocal.promise, firstOrigin.promise]);
    });
    expect(latestResult?.saveTree).toHaveLength(3);
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(2000);
    expect(latestResult?.originEstimate?.percentage).toBe(85);
  });

  it('preserves the prior coherent bundle when the latest refresh rejects', async () => {
    const options = baseOptions({
      listSaveTree: vi.fn()
        .mockResolvedValueOnce(saveTreeForSlots([1, 2]))
        .mockResolvedValueOnce(saveTreeForSlots([1, 2, 3])),
      readLocalStorageEstimate: vi.fn()
        .mockResolvedValueOnce(localEstimate(1000))
        .mockRejectedValueOnce(new Error('local read failed')),
      readOriginStorageEstimate: vi.fn()
        .mockResolvedValueOnce(originEstimate(50))
        .mockResolvedValueOnce(originEstimate(90)),
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.storageEstimate?.allMbdBytes).toBe(1000));
    await act(async () => { await latestResult!.refreshSaves(); });
    expect(latestResult?.saveTree).toHaveLength(2);
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(1000);
    expect(latestResult?.originEstimate?.percentage).toBe(50);
    expect(latestResult?.status).toBe('Failed to refresh save and storage evidence. Prior values are unchanged.');
    expect(logger.error).toHaveBeenCalledWith('Failed to refresh save and storage evidence:', expect.any(Error));
  });

  it('clears only its refresh-failure status after a later coherent refresh succeeds', async () => {
    const options = baseOptions({
      listSaveTree: vi.fn()
        .mockResolvedValueOnce(saveTreeForSlots([1]))
        .mockResolvedValueOnce(saveTreeForSlots([1, 2]))
        .mockResolvedValueOnce(saveTreeForSlots([1, 2, 3])),
      readLocalStorageEstimate: vi.fn()
        .mockResolvedValueOnce(localEstimate(1000))
        .mockRejectedValueOnce(new Error('temporary local read failure'))
        .mockResolvedValueOnce(localEstimate(3000)),
      readOriginStorageEstimate: vi.fn()
        .mockResolvedValueOnce(originEstimate(50))
        .mockResolvedValueOnce(originEstimate(90))
        .mockResolvedValueOnce(originEstimate(85)),
    });
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.storageEstimate?.allMbdBytes).toBe(1000));

    await act(async () => { await latestResult!.refreshSaves(); });
    expect(latestResult?.status).toBe('Failed to refresh save and storage evidence. Prior values are unchanged.');
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(1000);

    await act(async () => { await latestResult!.refreshSaves(); });
    expect(latestResult?.status).toBe('');
    expect(latestResult?.saveTree).toHaveLength(3);
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(3000);
    expect(latestResult?.originEstimate?.percentage).toBe(85);
  });

  it('preserves unrelated setup status when save and storage refresh succeeds', async () => {
    const options = baseOptions();
    await renderHook(options);
    await waitForAssertion(() => expect(latestResult?.storageEstimate?.allMbdBytes).toBe(1000));
    await act(async () => { latestResult?.setStatus('Failed to build the dynasty previews.'); });

    await act(async () => { await latestResult!.refreshSaves(); });

    expect(latestResult?.status).toBe('Failed to build the dynasty previews.');
  });

  it('ignores a stale rejection after a newer refresh succeeds', async () => {
    const firstTree = deferred<SaveTreeEntry[]>();
    const firstLocal = deferred<LocalStorageEstimate>();
    const firstOrigin = deferred<OriginStorageEstimate>();
    const options = baseOptions({
      listSaveTree: vi.fn()
        .mockReturnValueOnce(firstTree.promise)
        .mockResolvedValueOnce(saveTreeForSlots([1, 2, 3])),
      readLocalStorageEstimate: vi.fn()
        .mockReturnValueOnce(firstLocal.promise)
        .mockResolvedValueOnce(localEstimate(3000)),
      readOriginStorageEstimate: vi.fn()
        .mockReturnValueOnce(firstOrigin.promise)
        .mockResolvedValueOnce(originEstimate(90)),
    });
    await renderHook(options);
    await act(async () => { await latestResult!.refreshSaves(); });
    await act(async () => {
      firstTree.resolve(saveTreeForSlots([1]));
      firstLocal.reject(new Error('stale local failure'));
      firstOrigin.resolve(originEstimate(10));
      await Promise.allSettled([firstTree.promise, firstLocal.promise, firstOrigin.promise]);
    });
    expect(latestResult?.storageEstimate?.allMbdBytes).toBe(3000);
    expect(latestResult?.originEstimate?.percentage).toBe(90);
    expect(latestResult?.status).not.toContain('Failed to refresh');
    expect(logger.error).not.toHaveBeenCalledWith('Failed to refresh save and storage evidence:', expect.any(Error));
  });

  it('invalidates a pending storage refresh when the hook unmounts', async () => {
    const pendingTree = deferred<SaveTreeEntry[]>();
    const pendingLocal = deferred<LocalStorageEstimate>();
    const pendingOrigin = deferred<OriginStorageEstimate>();
    let renderCount = 0;
    const options = baseOptions({
      listSaveTree: vi.fn().mockReturnValue(pendingTree.promise),
      readLocalStorageEstimate: vi.fn().mockReturnValue(pendingLocal.promise),
      readOriginStorageEstimate: vi.fn().mockReturnValue(pendingOrigin.promise),
    });
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        renderCount += 1;
        latestResult = result;
      }} />);
    });
    const rendersBeforeUnmount = renderCount;
    await act(async () => { root.unmount(); });
    rootUnmounted = true;
    await act(async () => {
      pendingTree.resolve(saveTreeForSlots([1, 2, 3]));
      pendingLocal.resolve(localEstimate(3000));
      pendingOrigin.resolve(originEstimate(90));
      await Promise.all([pendingTree.promise, pendingLocal.promise, pendingOrigin.promise]);
    });
    expect(renderCount).toBe(rendersBeforeUnmount);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
