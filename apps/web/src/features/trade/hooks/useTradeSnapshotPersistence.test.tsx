import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { useTradeSnapshotPersistence } from './useTradeSnapshotPersistence';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import { logger } from '@/shared/lib/logger';

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  persistActiveSaveSnapshot: vi.fn().mockResolvedValue({ saved: true, saveName: 'Saved game' }),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockedPersistActiveSaveSnapshot = vi.mocked(persistActiveSaveSnapshot);
const mockedLogger = vi.mocked(logger);

type HookOptions = Parameters<typeof useTradeSnapshotPersistence>[0];
type PersistTradeSnapshot = ReturnType<typeof useTradeSnapshotPersistence>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (persistTradeSnapshot: PersistTradeSnapshot) => void;
}) {
  onRender(useTradeSnapshotPersistence(options));
  return null;
}

describe('useTradeSnapshotPersistence', () => {
  let container: HTMLDivElement;
  let root: Root;
  let persistTradeSnapshot: PersistTradeSnapshot | null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    persistTradeSnapshot = null;
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
      root.render(<HookHarness options={options} onRender={(nextPersistTradeSnapshot) => {
        persistTradeSnapshot = nextPersistTradeSnapshot;
      }} />);
    });
    expect(persistTradeSnapshot).toBeTruthy();
    return persistTradeSnapshot as PersistTradeSnapshot;
  }

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: 'save-1',
      activeSaveSlot: 1,
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: 34,
        season: 6,
        day: 101,
        phase: 'regular',
      }),
      gmName: 'Taylor Bennett',
      season: 6,
      teamName: 'Tycoons',
      ...overrides,
    };
  }

  it('rejects before snapshot export when there is no active save', async () => {
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34 });
    const persist = await renderHook(baseOptions({
      activeSaveId: null,
      exportSnapshot,
    }));

    await expect(persist()).rejects.toThrow('requires an active save');

    expect(mockedPersistActiveSaveSnapshot).not.toHaveBeenCalled();
  });

  it('persists through the active-save coordinator with root slot metadata', async () => {
    const exportSnapshot = vi.fn().mockResolvedValue({
      schemaVersion: 34,
      season: 6,
      day: 101,
      phase: 'regular',
    });
    const persist = await renderHook(baseOptions({ exportSnapshot }));

    await persist();

    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledWith({
      activeSaveId: 'save-1',
      activeSaveSlot: 1,
      exportSnapshot,
      gmName: 'Taylor Bennett',
      season: 6,
      teamName: 'Tycoons',
    });
    expect(exportSnapshot).not.toHaveBeenCalled();
  });

  it('passes non-slot save ownership to the active-save coordinator', async () => {
    const exportSnapshot = vi.fn();
    const persist = await renderHook(baseOptions({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
      exportSnapshot,
      gmName: '',
      season: 8,
      teamName: '',
    }));

    await persist();

    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledWith({
      activeSaveId: 'branch-1',
      activeSaveSlot: null,
      exportSnapshot,
      gmName: '',
      season: 8,
      teamName: '',
    });
    expect(exportSnapshot).not.toHaveBeenCalled();
  });

  it('logs and rethrows autosave errors so trade actions cannot refresh unsaved state', async () => {
    const error = new Error('export failed');
    mockedPersistActiveSaveSnapshot.mockRejectedValueOnce(error);
    const persist = await renderHook(baseOptions({
      exportSnapshot: vi.fn(),
    }));

    await expect(persist()).rejects.toBe(error);

    expect(mockedLogger.error).toHaveBeenCalledWith('Failed to autosave trade negotiation state:', error);
  });

  it('rejects a resolved unsaved coordinator result', async () => {
    mockedPersistActiveSaveSnapshot.mockResolvedValueOnce({ saved: false, saveName: null });
    const persist = await renderHook(baseOptions());

    await expect(persist()).rejects.toThrow('did not become durable');

    expect(mockedLogger.error).toHaveBeenCalledWith(
      'Failed to autosave trade negotiation state:',
      expect.objectContaining({ message: 'Trade snapshot persistence did not become durable.' }),
    );
  });
});
