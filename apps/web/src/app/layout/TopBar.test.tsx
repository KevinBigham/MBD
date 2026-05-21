import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { NewsItem } from '@mbd/contracts';
import { TopBar } from './TopBar';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

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

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    unsubscribe = vi.fn();

    mockedUseGameStore.mockReturnValue({
      season: 2,
      day: 81,
      phase: 'regular',
      isInitialized: true,
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
});
