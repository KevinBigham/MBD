import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  markGuidedStartNudgeSeen,
  readGuidedStartNudgeRecord,
  registerGuidedStartSave,
} from '@/features/onboarding/nudges';
import { exportSnapshotToJson } from '@/shared/lib/saveSystem';
import { useDashboardGuidedStart } from './useDashboardGuidedStart';

vi.mock('@/shared/lib/saveSystem', () => ({
  exportSnapshotToJson: vi.fn().mockReturnValue('{"kind":"mbd-save-export"}'),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useDashboardGuidedStart>[0];
type HookResult = ReturnType<typeof useDashboardGuidedStart>;

function createStorageMock(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    }),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useDashboardGuidedStart(options));
  return null;
}

describe('useDashboardGuidedStart', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;
  let linkClickSpy: ReturnType<typeof vi.spyOn>;
  let createObjectUrlSpy: ReturnType<typeof vi.fn>;
  let revokeObjectUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    latestResult = null;

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    });
    createObjectUrlSpy = vi.fn(() => 'blob:guided-start-backup');
    revokeObjectUrlSpy = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrlSpy,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrlSpy,
    });
    linkClickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.mocked(exportSnapshotToJson).mockReturnValue('{"kind":"mbd-save-export"}');
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latestResult = result;
      }} />);
    });
    await act(async () => {});
    expect(latestResult).toBeTruthy();
    return latestResult as HookResult;
  }

  function baseOptions(overrides: Partial<HookOptions> = {}): HookOptions {
    return {
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      completedUserGames: 0,
      day: 1,
      exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 34 }),
      gmName: 'Alex Rivera',
      hasCurrentDayGame: true,
      hasFutureScheduledGame: true,
      hasPriorScheduledGame: false,
      isInitialized: true,
      phase: 'regular',
      scheduleLoaded: true,
      season: 1,
      teamName: 'Tycoons',
      ...overrides,
    };
  }

  it('surfaces the first eligible guided-start nudge for the active save slot', async () => {
    registerGuidedStartSave('save-slot-1');
    markGuidedStartNudgeSeen('save-slot-1', 'intro_scroll');
    markGuidedStartNudgeSeen('save-slot-1', 'first_draft_nudge');

    await renderHook(baseOptions());

    expect(latestResult?.currentDashboardNudge).toBe('first_series_pointer');
  });

  it('auto-skips the first-series pointer once the save has already played user games', async () => {
    registerGuidedStartSave('save-slot-1');
    markGuidedStartNudgeSeen('save-slot-1', 'intro_scroll');
    markGuidedStartNudgeSeen('save-slot-1', 'first_draft_nudge');

    await renderHook(baseOptions({ completedUserGames: 2, hasPriorScheduledGame: true }));

    expect(readGuidedStartNudgeRecord('save-slot-1')?.seen.first_series_pointer).toBe(true);
    expect(latestResult?.currentDashboardNudge).not.toBe('first_series_pointer');
  });

  it('exports a guided-start backup from the route snapshot', async () => {
    const exportSnapshot = vi.fn().mockResolvedValue({ schemaVersion: 34 });
    await renderHook(baseOptions({
      day: 88,
      exportSnapshot,
      season: 4,
    }));

    await act(async () => {
      await latestResult?.handleExportGuidedStartBackup();
    });

    expect(exportSnapshot).toHaveBeenCalledTimes(1);
    expect(exportSnapshotToJson).toHaveBeenCalledWith(
      'Alex Rivera • Tycoons • Season 4 Day 88',
      { schemaVersion: 34 },
    );
    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(linkClickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:guided-start-backup');
  });
});
