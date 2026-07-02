import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { NewsItem } from '@mbd/contracts';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import { useNewsRouteData } from './useNewsRouteData';

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  persistActiveSaveSnapshot: vi.fn().mockResolvedValue({ saved: true, saveName: 'Saved game' }),
}));

const mockedPersistActiveSaveSnapshot = vi.mocked(persistActiveSaveSnapshot);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const sampleNews: NewsItem[] = [
  {
    id: 'news-new',
    headline: 'Playoff watch intensifies',
    body: 'New York took two of three and pulled within a game of the top seed.',
    priority: 3,
    category: 'playoff',
    tag: 'WATCH',
    timestamp: 'S3D45',
    relatedPlayerIds: ['player-ace'],
    relatedTeamIds: ['nym'],
    read: false,
  },
  {
    id: 'news-tie',
    headline: 'Deadline rumor heats up',
    body: 'The front office is weighing bullpen help before the market closes.',
    priority: 5,
    category: 'trade',
    tag: 'RUMOR',
    timestamp: 'S3D45',
    relatedPlayerIds: [],
    relatedTeamIds: ['bos'],
    read: false,
  },
  {
    id: 'news-old',
    headline: 'Draft board settles',
    body: 'Area scouts believe the top tier has separated from the class.',
    priority: 2,
    category: 'draft',
    timestamp: 'S3D39',
    relatedPlayerIds: ['prospect-1'],
    relatedTeamIds: [],
    read: false,
  },
];

type HookOptions = Parameters<typeof useNewsRouteData>[0];
type HookResult = ReturnType<typeof useNewsRouteData>;

function sampleNewsAt(index: number): NewsItem {
  const item = sampleNews[index];
  if (item == null) {
    throw new Error(`Missing sample news item at index ${index}`);
  }
  return item;
}

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useNewsRouteData(options));
  return null;
}

describe('useNewsRouteData', () => {
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
    vi.clearAllMocks();
  });

  function makeOptions(overrides: Partial<HookOptions> = {}) {
    return {
      activeSaveId: null,
      activeSaveSlot: null,
      day: 45,
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: 34,
        season: 3,
        day: 45,
        phase: 'regular',
      }),
      getNews: vi.fn().mockResolvedValue(sampleNews),
      gmName: 'Jamie Foster',
      isInitialized: true,
      markNewsRead: vi.fn().mockResolvedValue(undefined),
      phase: 'regular',
      season: 3,
      teamName: 'Tycoons',
      workerReady: true,
      ...overrides,
    } satisfies HookOptions;
  }

  async function renderHook(options: HookOptions) {
    await act(async () => {
      root.render(<HookHarness options={options} onRender={(result) => {
        latest = result;
      }} />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest).toBeTruthy();
    return latest as HookResult;
  }

  it('loads worker news newest first with priority tie-breaks and derives inbox filters', async () => {
    const options = makeOptions();

    const result = await renderHook(options);

    expect(options.getNews).toHaveBeenCalledWith(100);
    expect(result.loading).toBe(false);
    expect(result.items.map((item) => item.id)).toEqual(['news-tie', 'news-new', 'news-old']);
    expect(result.unreadCount).toBe(3);
    expect(result.categoryOptions).toEqual(['trade', 'draft', 'playoff']);
    expect(result.filteredItems.map((item) => item.id)).toEqual(['news-tie', 'news-new', 'news-old']);

    await act(async () => {
      result.setCategoryFilter('trade');
    });

    expect(latest?.filteredItems.map((item) => item.id)).toEqual(['news-tie']);
  });

  it('marks an unread item read, persists active slot saves, and dispatches the read event', async () => {
    const options = makeOptions({
      activeSaveId: 'slot-save',
      activeSaveSlot: 2,
    });
    const readEvents: string[] = [];
    window.addEventListener('mbd:news-read', ((event: Event) => {
      readEvents.push((event as CustomEvent<{ newsId: string }>).detail.newsId);
    }) as EventListener);

    const result = await renderHook(options);

    await act(async () => {
      await result.markItemRead(sampleNewsAt(0));
      await Promise.resolve();
    });

    expect(options.markNewsRead).toHaveBeenCalledWith('news-new');
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledWith({
      activeSaveId: 'slot-save',
      activeSaveSlot: 2,
      exportSnapshot: options.exportSnapshot,
      gmName: 'Jamie Foster',
      season: 3,
      teamName: 'Tycoons',
    });
    expect(options.exportSnapshot).not.toHaveBeenCalled();
    expect(latest?.expandedIds.has('news-new')).toBe(true);
    expect(latest?.markingIds.has('news-new')).toBe(false);
    expect(latest?.items.find((item) => item.id === 'news-new')?.read).toBe(true);
    expect(readEvents).toEqual(['news-new']);
  });

  it('passes branch save ownership to the active-save coordinator', async () => {
    const options = makeOptions({
      activeSaveId: 'branch-save',
      activeSaveSlot: null,
    });

    const result = await renderHook(options);

    await act(async () => {
      await result.markItemRead(sampleNewsAt(1));
      await Promise.resolve();
    });

    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledWith({
      activeSaveId: 'branch-save',
      activeSaveSlot: null,
      exportSnapshot: options.exportSnapshot,
      gmName: 'Jamie Foster',
      season: 3,
      teamName: 'Tycoons',
    });
  });
});
