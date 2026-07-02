import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { usePressRoomRouteData } from './usePressRoomRouteData';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof usePressRoomRouteData>[0];
type HookResult = ReturnType<typeof usePressRoomRouteData>;

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(usePressRoomRouteData(options));
  return null;
}

function createStorageMock(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear() {
      storage.clear();
    },
    getItem(key: string) {
      return storage.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null;
    },
    removeItem(key: string) {
      storage.delete(key);
    },
    setItem(key: string, value: string) {
      storage.set(key, value);
    },
  };
}

function buildFeed(): PressRoomEntry[] {
  return [
    {
      id: 'brief-owner-heat',
      source: 'briefing',
      category: 'owner',
      tag: 'BREAKING',
      priority: 1,
      headline: 'Owner pressure is rising.',
      body: 'Ownership wants a stronger response this month.',
      timestamp: 'S3D44',
      relatedTeamIds: ['nym'],
      relatedPlayerIds: [],
    },
    {
      id: 'brief-scouting-1',
      source: 'briefing',
      category: 'development',
      tag: 'WATCH',
      priority: 2,
      headline: 'Scouting report: Double-A slugger is forcing the issue',
      body: 'Internal evaluators want the next promotion discussion on the table.',
      timestamp: 'S3D44',
      relatedTeamIds: ['nym'],
      relatedPlayerIds: ['prospect-1'],
    },
    {
      id: 'news-trade-1',
      source: 'league_wire',
      category: 'trade',
      tag: 'RUMOR',
      priority: 2,
      headline: 'Breaking trade headline',
      body: 'New York added a bullpen arm in a deadline swing.',
      timestamp: 'S3D43',
      relatedTeamIds: ['nym', 'bos'],
      relatedPlayerIds: [],
    },
    {
      id: 'press-conference-1',
      source: 'press_conference',
      category: 'press_conference',
      tag: 'DEBATE',
      priority: 3,
      headline: 'Press Conference: New York Tycoons',
      body: 'A calmer room framed the question this way.',
      timestamp: 'S3D44',
      relatedTeamIds: ['nym'],
      relatedPlayerIds: [],
    },
  ];
}

describe('usePressRoomRouteData', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latestResult: HookResult | null;

  beforeEach(() => {
    const storage = createStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: storage,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: storage,
      configurable: true,
    });
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
      day: 44,
      getPressRoomFeed: vi.fn().mockResolvedValue(buildFeed()),
      isInitialized: true,
      lastVisitedPressRoomAt: 'S3D43',
      phase: 'regular',
      season: 3,
      setLastVisitedPressRoomAt: vi.fn(),
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

  it('loads feed data and derives source sections, filters, counts, and visit baseline', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.feed).toHaveLength(4);
      expect(latestResult?.briefingCount).toBe(1);
      expect(latestResult?.scoutingCount).toBe(1);
      expect(latestResult?.unreadCount).toBe(3);
      expect(latestResult?.teamOptions).toEqual(['bos', 'nym']);
      expect(latestResult?.categoryOptions).toEqual(['development', 'owner', 'press_conference', 'trade']);
      expect(latestResult?.groupedFeed.map((section) => section.key)).toEqual([
        'briefings',
        'league_wire',
        'press_conferences',
        'scouting',
      ]);
      expect(latestResult?.transactionFeed.map((entry) => entry.id)).toEqual(['news-trade-1']);
    });

    expect(options.getPressRoomFeed).toHaveBeenCalledWith(100);
    expect(options.setLastVisitedPressRoomAt).toHaveBeenCalledWith('S3D44');
  });

  it('filters the grouped source board without losing summary counts', async () => {
    const options = baseOptions();
    const hook = await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.feed).toHaveLength(4);
    });

    await act(async () => {
      hook.setSelectedTag('WATCH');
    });

    expect(latestResult?.briefingCount).toBe(1);
    expect(latestResult?.scoutingCount).toBe(1);
    expect(latestResult?.groupedFeed.map((section) => section.key)).toEqual(['scouting']);
    expect(latestResult?.transactionFeed).toEqual([]);
  });

  it('marks the filtered feed as read and persists read ids', async () => {
    const setLastVisitedPressRoomAt = vi.fn();
    const options = baseOptions({ setLastVisitedPressRoomAt });
    const hook = await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.feed).toHaveLength(4);
    });

    await act(async () => {
      hook.setSelectedTag('WATCH');
    });

    await act(async () => {
      latestResult?.markAllRead();
    });

    expect(latestResult?.unreadCount).toBe(0);
    expect(setLastVisitedPressRoomAt).toHaveBeenLastCalledWith('S3D44');
    expect(window.localStorage.getItem('mbd-press-room-read-ids')).toContain('briefing:brief-scouting-1:S3D44');
  });

  it('toggles pinned entries and persists the pinned set', async () => {
    const options = baseOptions();
    await renderHook(options);

    await waitForAssertion(() => {
      expect(latestResult?.feed).toHaveLength(4);
    });

    const entry = latestResult!.feed[0]!;

    await act(async () => {
      latestResult?.togglePinned(entry);
    });

    expect(latestResult?.pinnedFeed.map((pinnedEntry) => pinnedEntry.id)).toEqual(['brief-owner-heat']);
    expect(latestResult?.isEntryPinned(entry)).toBe(true);
    expect(window.localStorage.getItem('mbd-press-room-pinned-ids')).toContain('briefing:brief-owner-heat:S3D44');
  });
});
