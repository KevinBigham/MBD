import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PressRoomPage from './PressRoomPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';

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

describe('PressRoomPage', () => {
  let container: HTMLDivElement;
  let root: Root;

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
    usePreferencesStore.getState().reset();
    usePreferencesStore.getState().setLastVisitedPressRoomAt('S3D43');
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 3,
      day: 44,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 43,
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
      getPressRoomFeed: vi.fn().mockResolvedValue([
        {
          id: 'brief-owner-heat',
          source: 'briefing',
          category: 'owner',
          tag: 'BREAKING',
          priority: 1,
          headline: 'Owner pressure is rising.',
          body: 'Ownership wants a stronger response this month.',
          timestamp: 'S3D44',
          relatedTeamIds: ['nyy'],
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
          relatedTeamIds: ['nyy'],
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
          relatedTeamIds: ['nyy', 'bos'],
          relatedPlayerIds: [],
        },
        {
          id: 'news-signing-1',
          source: 'league_wire',
          category: 'signing',
          tag: 'BREAKING',
          priority: 1,
          headline: 'Free-agent ace lands in Boston',
          body: 'Boston closed a five-year deal for a frontline starter.',
          timestamp: 'S3D42',
          relatedTeamIds: ['bos'],
          relatedPlayerIds: ['player-ace'],
        },
        {
          id: 'press-conference-1',
          source: 'press_conference',
          category: 'press_conference',
          tag: 'DEBATE',
          priority: 3,
          headline: 'Press Conference: New York Yankees',
          body: 'A calmer room framed the question this way: Your prospect pipeline is drawing real attention.',
          timestamp: 'S3D44',
          relatedTeamIds: ['nyy'],
          relatedPlayerIds: [],
        },
      ]),
    } as unknown as ReturnType<typeof useWorker>);
  });

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount();
      });
    }
    container?.remove();
    vi.clearAllMocks();
  });

  it('renders collapsible source sections, scouting grouping, and unread state', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <PressRoomPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Press Room');
    expect(container.textContent).toContain('Owner pressure is rising.');
    expect(container.textContent).toContain('Breaking trade headline');
    expect(container.textContent).toContain('Press Conference: New York Yankees');
    expect(container.textContent).toContain('Team Briefings');
    expect(container.textContent).toContain('Press Conferences');
    expect(container.textContent).toContain('League Wire');
    expect(container.textContent).toContain('Scouting Reports');
    expect(container.textContent).toContain('BREAKING');
    expect(container.textContent).toContain('RUMOR');
    expect(container.textContent).toContain('WATCH');
    expect(container.textContent).toContain('DEBATE');
    expect(container.textContent).toContain('Unread');
    expect(usePreferencesStore.getState().lastVisitedPressRoomAt).toBe('S3D44');

    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    const tagFilter = selects[2]!;

    await act(async () => {
      tagFilter.value = 'WATCH';
      tagFilter.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Scouting report: Double-A slugger is forcing the issue');
    expect(container.textContent).not.toContain('Breaking trade headline');

    const sectionToggle = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Team Briefings'),
    );

    await act(async () => {
      sectionToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).not.toContain('Owner pressure is rising.');
  });
});
