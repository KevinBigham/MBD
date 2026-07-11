import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { NewsItem } from '@mbd/contracts';
import { TopBar } from './TopBar';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSavePersistenceStatus } from '@/shared/hooks/useActiveSavePersistenceStatus';
import { retryActiveSavePersistence } from '@/shared/lib/activeSavePersistence';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/hooks/useActiveSavePersistenceStatus', () => ({
  useActiveSavePersistenceStatus: vi.fn(),
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  retryActiveSavePersistence: vi.fn().mockResolvedValue({ saved: true, saveName: 'Dynasty' }),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedUseActiveSavePersistenceStatus = vi.mocked(useActiveSavePersistenceStatus);
const mockedRetryActiveSavePersistence = vi.mocked(retryActiveSavePersistence);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const unreadNews: NewsItem[] = [
  {
    id: 'news-1',
    headline: 'Trade market opens',
    body: 'Rival clubs are asking about relief help.',
    priority: 2,
    category: 'trade',
    timestamp: 'S2D80',
    relatedPlayerIds: [],
    relatedTeamIds: ['nym'],
    read: false,
  },
  {
    id: 'news-2',
    headline: 'Prospect climbs the board',
    body: 'The scouting room moved a Double-A bat up another tier.',
    priority: 3,
    category: 'development',
    timestamp: 'S2D81',
    relatedPlayerIds: ['prospect-2'],
    relatedTeamIds: [],
    read: false,
  },
];

describe('TopBar', () => {
  let container: HTMLDivElement;
  let root: Root;
  let unsubscribe: ReturnType<typeof vi.fn>;
  let gameStoreValue: Record<string, unknown>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    unsubscribe = vi.fn();

    gameStoreValue = {
      season: 2,
      day: 81,
      phase: 'regular',
      isInitialized: true,
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 80,
      isSimulating: false,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
    };
    mockedUseGameStore.mockReturnValue(gameStoreValue);
    mockedUseActiveSavePersistenceStatus.mockReturnValue({
      state: 'idle',
      saveId: 'save-slot-2',
      saveName: null,
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: null,
      errorMessage: null,
      failureKind: null,
    });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getNews: vi.fn().mockResolvedValue(unreadNews),
      subscribeToFlowUpdates: vi.fn().mockReturnValue(unsubscribe),
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('shows the unread news badge and decrements after a news-read event', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const badge = container.querySelector('[aria-label="News inbox unread count"]');
    expect(badge?.textContent).toContain('News');
    expect(badge?.textContent).toContain('2');

    await act(async () => {
      window.dispatchEvent(new CustomEvent('mbd:news-read', { detail: { newsId: 'news-1' } }));
    });

    expect(container.querySelector('[aria-label="News inbox unread count"]')?.textContent).toContain('1');
  });

  it('shows contextual help for dynamic player profile routes', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/players/player-42']}>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.querySelector('button[aria-label="Help: Read the full player file"]')).not.toBeNull();
  });

  it('surfaces save progress from the active-save coordinator', async () => {
    mockedUseActiveSavePersistenceStatus.mockReturnValue({
      state: 'saving',
      saveId: 'save-slot-2',
      saveName: 'Alex Rivera • Tycoons • Season 2',
      desiredGeneration: 2,
      durableGeneration: 1,
      pendingWrites: 1,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
      errorMessage: null,
      failureKind: null,
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const status = container.querySelector('[data-testid="save-persistence-status"]');
    const summary = container.querySelector('[data-testid="save-persistence-summary"]');
    expect(status?.textContent).toContain('Saving...');
    expect(status?.getAttribute('aria-live')).toBe('polite');
    expect(summary?.textContent).toMatch(/^Last saved .+ · 1 pending write$/);
    expect(summary?.getAttribute('data-last-saved-at')).toBe('2026-04-02T19:42:03.000Z');
    expect(summary?.getAttribute('data-pending-writes')).toBe('1');
    expect(summary?.className).toContain('order-3');
    expect(summary?.className).toContain('lg:order-2');
  });

  it('surfaces failed save status with retry for the active save', async () => {
    mockedUseActiveSavePersistenceStatus.mockReturnValue({
      state: 'failed',
      saveId: 'save-slot-2',
      saveName: 'Alex Rivera • Tycoons • Season 2',
      desiredGeneration: 2,
      durableGeneration: 1,
      pendingWrites: 1,
      canRetry: true,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
      errorMessage: 'QuotaExceededError',
      failureKind: 'storage',
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const status = container.querySelector('[data-testid="save-persistence-status"]');
    expect(status?.textContent).toContain('Save failed');
    expect(status?.textContent).toContain('Retry');
    expect(status?.getAttribute('aria-live')).toBe('assertive');
    expect(status?.className).toContain('z-[80]');
    expect(container.querySelector('[data-testid="save-persistence-summary"]')?.textContent)
      .toMatch(/^Last saved .+ · 1 pending write$/);

    await act(async () => {
      container.querySelector('button[aria-label="Retry failed save"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(mockedRetryActiveSavePersistence).toHaveBeenCalledWith('save-slot-2');
  });

  it('keeps durable recency visible while the transient coordinator state is idle', async () => {
    mockedUseActiveSavePersistenceStatus.mockReturnValue({
      state: 'idle',
      saveId: 'save-slot-2',
      saveName: 'Alex Rivera • Tycoons • Season 2',
      desiredGeneration: 0,
      durableGeneration: 0,
      pendingWrites: 0,
      canRetry: false,
      lastSavedAt: '2026-04-02T19:42:03.000Z',
      errorMessage: null,
      failureKind: null,
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    const summary = container.querySelector('[data-testid="save-persistence-summary"]');
    expect(summary?.textContent).toMatch(/^Last saved .+ · 0 pending writes$/);
    expect(summary?.getAttribute('aria-label')).toBe(summary?.textContent);
    expect(container.querySelector('[data-testid="save-persistence-status"]')).toBeNull();
  });

  it('shows an honest fallback for an active save without trustworthy metadata', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="save-persistence-summary"]')?.textContent)
      .toBe('Not saved yet · 0 pending writes');
  });

  it('does not render persistence metadata when there is no active save', async () => {
    mockedUseGameStore.mockReturnValue({
      ...gameStoreValue,
      activeSaveId: null,
      activeSaveSlot: null,
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="save-persistence-summary"]')).toBeNull();
  });

  it('maps each storage failure kind to distinct, accessible copy with retry', async () => {
    const cases: Array<{ failureKind: 'quota' | 'indexeddb' | 'storage' | 'export'; copy: string; errorMessage: string }> = [
      { failureKind: 'quota', copy: 'Save failed — storage full', errorMessage: 'QuotaExceededError' },
      { failureKind: 'indexeddb', copy: 'Save failed — browser database error', errorMessage: 'TransactionInactiveError' },
      { failureKind: 'storage', copy: 'Save failed — storage error', errorMessage: 'Persistent storage unavailable' },
      { failureKind: 'export', copy: 'Save failed — could not read game', errorMessage: 'Worker export failed' },
    ];
    const seen = new Set<string>();

    for (const testCase of cases) {
      mockedUseActiveSavePersistenceStatus.mockReturnValue({
        state: 'failed',
        saveId: 'save-slot-2',
        saveName: 'Alex Rivera • Tycoons • Season 2',
        desiredGeneration: 2,
        durableGeneration: 1,
        pendingWrites: 1,
        canRetry: true,
        lastSavedAt: null,
        errorMessage: testCase.errorMessage,
        failureKind: testCase.failureKind,
      });

      const caseContainer = document.createElement('div');
      document.body.appendChild(caseContainer);
      const caseRoot = createRoot(caseContainer);
      await act(async () => {
        caseRoot.render(
          <MemoryRouter>
            <TopBar onOpenCommandPalette={vi.fn()} flow={null} />
          </MemoryRouter>,
        );
        await Promise.resolve();
      });

      const status = caseContainer.querySelector('[data-testid="save-persistence-status"]');
      expect(status?.textContent).toContain(testCase.copy);
      expect(status?.getAttribute('aria-live')).toBe('assertive');
      expect(status?.getAttribute('data-failure-kind')).toBe(testCase.failureKind);
      expect(status?.getAttribute('title')).toBe(testCase.errorMessage);
      expect(caseContainer.querySelector('button[aria-label="Retry failed save"]')).not.toBeNull();

      // Each kind must produce a distinct player-facing label.
      const label = status?.textContent?.replace('Retry', '').trim() ?? '';
      expect(seen.has(label)).toBe(false);
      seen.add(label);

      await act(async () => {
        caseRoot.unmount();
      });
      caseContainer.remove();
    }

    expect(seen.size).toBe(cases.length);
  });
});
