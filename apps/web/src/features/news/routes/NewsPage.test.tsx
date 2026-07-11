import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { NewsItem } from '@mbd/contracts';
import NewsPage from './NewsPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { saveGameById } from '@/shared/lib/saveSystem';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  loadGameById: vi.fn(),
  saveGame: vi.fn().mockResolvedValue(undefined),
  saveGameById: vi.fn().mockResolvedValue({
    id: 'save-slot-1',
    updatedAt: '2026-04-02T12:00:00.000Z',
  }),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedSaveGameById = vi.mocked(saveGameById);

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

describe('NewsPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let getNews: ReturnType<typeof vi.fn>;
  let markNewsRead: ReturnType<typeof vi.fn>;
  let exportSnapshot: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    getNews = vi.fn().mockResolvedValue(sampleNews);
    markNewsRead = vi.fn().mockResolvedValue(undefined);
    exportSnapshot = vi.fn().mockResolvedValue({
      schemaVersion: 34,
      season: 3,
      day: 45,
      phase: 'regular',
    });

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 45,
      phase: 'regular',
      gmName: 'Jamie Foster',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 44,
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
      exportSnapshot,
      getNews,
      markNewsRead,
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPage() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <NewsPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders worker-backed headlines newest first with priority tie-breaks', async () => {
    await renderPage();

    const content = container.textContent ?? '';
    expect(content).toContain('News Inbox');
    expect(content).toContain('Playoff watch intensifies');
    expect(content).toContain('Deadline rumor heats up');
    expect(content).toContain('Draft board settles');
    expect(content.indexOf('Deadline rumor heats up')).toBeLessThan(content.indexOf('Playoff watch intensifies'));
    expect(content).toContain('Trade');
    expect(content).toContain('Priority 5');
    expect(content).toContain('WATCH');
    expect(content).toContain('NYT');
    expect(content).toContain('player-ace');
    expect(getNews).toHaveBeenCalledWith(100);
  });

  it('marks an unread item read when opened', async () => {
    await renderPage();

    const item = container.querySelector('[data-news-id="news-new"]');
    expect(item?.textContent).toContain('Unread');

    const openButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Playoff watch intensifies'),
    );
    expect(openButton).toBeTruthy();

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(markNewsRead).toHaveBeenCalledWith('news-new');
    expect(container.querySelector('[data-news-id="news-new"]')?.textContent).toContain('Read');
  });

  it('persists the active save after marking an item read', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 45,
      phase: 'regular',
      gmName: 'Jamie Foster',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
      playerCount: 780,
      gamesPlayed: 44,
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

    await renderPage();

    const openButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Playoff watch intensifies'),
    );

    await act(async () => {
      openButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(exportSnapshot).toHaveBeenCalled();
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-2',
      'Jamie Foster • Tycoons • Season 3',
      {
        schemaVersion: 34,
        season: 3,
        day: 45,
        phase: 'regular',
      },
      expect.objectContaining({
        slotNumber: 2,
        parentSaveId: null,
        isRootSave: true,
      }),
    );
  });

  it('filters the inbox by unread state and category', async () => {
    await renderPage();

    const categoryFilter = container.querySelector('[aria-label="Category filter"]') as HTMLSelectElement | null;
    expect(categoryFilter).toBeTruthy();

    await act(async () => {
      categoryFilter!.value = 'trade';
      categoryFilter!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Deadline rumor heats up');
    expect(container.textContent).not.toContain('Draft board settles');
  });
});
