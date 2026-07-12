import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSimAdvanceExecutor } from './useSimAdvanceExecutor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const runtime = vi.hoisted(() => ({
  status: { kind: 'idle' } as { kind: string },
  execute: vi.fn(),
  release: vi.fn(),
  store: {
    activeSaveId: 'save-slot-1' as string | null,
    isInitialized: true,
    phase: 'regular',
    updateFromSim: vi.fn(),
    setInitialized: vi.fn(),
  },
}));

vi.mock('@/shared/lib/simAdvanceCoordinator', () => ({
  executeSimAdvance: runtime.execute,
  getSimAdvanceCoordinatorStatus: () => runtime.status,
  subscribeToSimAdvanceCoordinator: () => () => {},
}));
vi.mock('@/shared/lib/saveSessionOwnership', () => ({
  releaseActiveSaveSessionOwnership: runtime.release,
}));
vi.mock('./useGameStore', () => {
  const hook = ((selector: (state: typeof runtime.store) => unknown) => selector(runtime.store)) as typeof import('./useGameStore').useGameStore;
  hook.getState = (() => runtime.store) as unknown as typeof hook.getState;
  return { useGameStore: hook };
});

type Executor = ReturnType<typeof useSimAdvanceExecutor>;

describe('useSimAdvanceExecutor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: Executor | null;

  beforeEach(() => {
    runtime.status = { kind: 'idle' };
    runtime.execute.mockReset();
    runtime.release.mockReset();
    runtime.store.activeSaveId = 'save-slot-1';
    runtime.store.isInitialized = true;
    runtime.store.phase = 'regular';
    runtime.store.updateFromSim.mockReset();
    runtime.store.setInitialized.mockReset();
    latest = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  async function render(refreshAfterDurable = vi.fn().mockResolvedValue(undefined)) {
    function Probe() {
      latest = useSimAdvanceExecutor({ worker: {} as never, workerReady: true, refreshAfterDurable });
      return null;
    }
    await act(async () => { root.render(<Probe />); await Promise.resolve(); });
    return { executor: latest!, refreshAfterDurable };
  }

  it('blocks a stale captured save A after live state changes to B before any coordinator side effect', async () => {
    const { executor } = await render();
    runtime.store.activeSaveId = 'save-slot-2';
    await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'blocked' });
    expect(runtime.execute).not.toHaveBeenCalled();
    expect(runtime.release).not.toHaveBeenCalled();
  });

  it.each(['playoffs', 'offseason', 'unknown'])(
    'blocks journal admission from %s without calling the core coordinator',
    async (phase) => {
      runtime.store.phase = phase;
      const { executor } = await render();
      await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'blocked' });
      expect(runtime.execute).not.toHaveBeenCalled();
    },
  );

  it('blocks when rendered regular phase becomes playoffs before admission', async () => {
    const { executor } = await render();
    runtime.store.phase = 'playoffs';
    await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'blocked' });
    expect(runtime.execute).not.toHaveBeenCalled();
  });

  it('mirrors the durable worker result synchronously before strict surface refresh', async () => {
    const events: string[] = [];
    runtime.store.updateFromSim.mockImplementation(() => events.push('mirror'));
    const refresh = vi.fn(async () => { events.push('refresh'); });
    runtime.execute.mockImplementation(async (options) => {
      await options.publishDurable({ season: 4, day: 12, phase: 'regular', gamesPlayed: 1 });
      return { kind: 'durable' };
    });
    const { executor } = await render(refresh);
    await expect(executor.execute('sim_day')).resolves.toEqual({ kind: 'durable' });
    expect(events).toEqual(['mirror', 'refresh']);
  });

  it('normalizes only a same-tick duplicate coordinator rejection to blocked', async () => {
    runtime.execute.mockImplementation(async () => {
      runtime.status = { kind: 'running' };
      throw new Error('A simulation advance command is already active.');
    });
    const { executor } = await render();
    await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'blocked' });
    expect(runtime.execute).toHaveBeenCalledTimes(1);
  });

  it('releases before exact uninitialization on fail-closed and retains activeSaveId even if release rejects', async () => {
    const events: string[] = [];
    runtime.release.mockImplementation(async () => { events.push('release'); throw new Error('release lost'); });
    runtime.store.setInitialized.mockImplementation(() => events.push('uninitialize'));
    runtime.execute.mockImplementation(async (options) => {
      await options.failClosed(new Error('post publication failed'));
      return { kind: 'reload_required', error: new Error('post publication failed') };
    });
    const { executor } = await render();
    await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'reload_required' });
    expect(events).toEqual(['release', 'uninitialize']);
    expect(runtime.store.activeSaveId).toBe('save-slot-1');
  });

  it('does not release or uninitialize a successor when fail-closed callback belongs to stale save A', async () => {
    runtime.execute.mockImplementation(async (options) => {
      runtime.store.activeSaveId = 'save-slot-2';
      await options.failClosed(new Error('stale A failed'));
      return { kind: 'reload_required', error: new Error('stale A failed') };
    });
    const { executor } = await render();
    await expect(executor.execute('sim_day')).resolves.toMatchObject({ kind: 'reload_required' });
    expect(runtime.release).not.toHaveBeenCalled();
    expect(runtime.store.setInitialized).not.toHaveBeenCalled();
  });
});
