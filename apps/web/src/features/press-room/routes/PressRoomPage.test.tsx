import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PressRoomPage from './PressRoomPage';
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

describe('PressRoomPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
          id: 'news-trade-1',
          source: 'news',
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
          tag: 'ANALYSIS',
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
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders a grouped press room feed with tags and filters', async () => {
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
    expect(container.textContent).toContain('briefing');
    expect(container.textContent).toContain('press_conference');
    expect(container.textContent).toContain('owner');
    expect(container.textContent).toContain('trade');
    expect(container.textContent).toContain('BREAKING');
    expect(container.textContent).toContain('RUMOR');
    expect(container.textContent).toContain('Season 3 • Day 44');
    expect(container.textContent).toContain('Transaction Log');
    expect(container.textContent).toContain('Free-agent ace lands in Boston');

    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    const tagFilter = selects[2]!;

    await act(async () => {
      tagFilter.value = 'BREAKING';
      tagFilter.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Owner pressure is rising.');
    expect(container.textContent).not.toContain('Breaking trade headline');
  });
});
