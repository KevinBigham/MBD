import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SetupPage from './SetupPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  deleteSave,
  listSaves,
  loadGame,
  saveGame,
} from '@/shared/lib/saveSystem';

const mockedNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  deleteSave: vi.fn(),
  listSaves: vi.fn(),
  loadGame: vi.fn(),
  saveGame: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedListSaves = vi.mocked(listSaves);
const mockedLoadGame = vi.mocked(loadGame);
const mockedSaveGame = vi.mocked(saveGame);
const mockedDeleteSave = vi.mocked(deleteSave);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SetupPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let workerMock: ReturnType<typeof useWorker>;
  let storeMock: {
    isInitialized: boolean;
    initializeGame: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedNavigate.mockReset();
    storeMock = {
      isInitialized: false,
      initializeGame: vi.fn(),
    };
    mockedUseGameStore.mockReturnValue(storeMock as ReturnType<typeof useGameStore>);
    workerMock = {
      isReady: true,
      getSetupPreview: vi.fn().mockResolvedValue({
        teamId: 'nyy',
        teamName: 'New York Yankees',
        division: 'AL_EAST',
        payrollTier: 'Premier',
        farmSystemRating: 'B+',
        teamIdentityBlurb: 'Big-market expectations with enough prospects to support a push.',
        projectedRecord: '88-74',
        topPlayers: [
          { playerId: 'p-judge', name: 'Aaron Judge', position: 'RF', overall: 78 },
        ],
        divisionRivals: [
          { teamId: 'bos', teamName: 'Boston Red Sox' },
        ],
      }),
      newGame: vi.fn().mockResolvedValue({
        season: 1,
        day: 1,
        phase: 'preseason',
        playerCount: 780,
        userTeamId: 'nyy',
        teamName: 'New York Yankees',
        gmName: 'Alex Rivera',
        difficulty: 'hard',
      }),
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: 11,
        season: 1,
        day: 1,
        phase: 'preseason',
      }),
      importSnapshot: vi.fn().mockResolvedValue({
        season: 4,
        day: 88,
        phase: 'regular',
        playerCount: 780,
        userTeamId: 'nyy',
        teamName: 'New York Yankees',
        gmName: 'General Manager',
        difficulty: 'standard',
      }),
    } as unknown as ReturnType<typeof useWorker>;
    mockedUseWorker.mockReturnValue(workerMock);

    mockedListSaves.mockResolvedValue([
      {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Yankees Year 4',
        season: 4,
        day: 88,
        phase: 'regular',
        schemaVersion: 11,
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 11,
          season: 4,
          day: 88,
          phase: 'regular',
          userTeamId: 'nyy',
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            createdAt: 'S1D1',
            teamId: 'nyy',
            teamName: 'New York Yankees',
            teamAbbreviation: 'NYY',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
          achievements: {
            unlocked: [
              { id: 'champion', unlockedAt: 'S3D180', season: 3, teamId: 'nyy', summary: 'Won the World Series.' },
            ],
            progress: [],
            counters: [],
            ledgers: [],
          },
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    ] as never);
    mockedLoadGame.mockResolvedValue({
      id: 'save-slot-1',
      slotNumber: 1,
      name: 'Yankees Year 4',
      season: 4,
      day: 88,
      phase: 'regular',
      schemaVersion: 11,
      hasSnapshot: true,
      snapshot: {
        schemaVersion: 11,
        season: 4,
        day: 88,
        phase: 'regular',
      },
      legacyState: null,
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T12:00:00.000Z',
    } as never);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders save slots, previews a new dynasty, and launches into dashboard using the same seeded options', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Welcome to Mr. Baseball Dynasty');
    expect(container.textContent).toContain('New York Yankees');

    const newDynastyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New Dynasty'),
    );
    await act(async () => {
      newDynastyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const gmNameInput = container.querySelector('#setup-gm-name') as HTMLInputElement | null;
    const teamSelect = container.querySelector('#setup-team') as HTMLSelectElement | null;
    const difficultySelect = container.querySelector('#setup-difficulty') as HTMLSelectElement | null;

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(gmNameInput, 'Alex Rivera');
      gmNameInput?.dispatchEvent(new Event('input', { bubbles: true }));
      teamSelect!.value = 'nyy';
      teamSelect?.dispatchEvent(new Event('change', { bubbles: true }));
      difficultySelect!.value = 'hard';
      difficultySelect?.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Boston Red Sox');

    const previewCall = vi.mocked(workerMock.getSetupPreview).mock.calls.at(-1)?.[0];

    const beginButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Begin Season 1'),
    );
    await act(async () => {
      beginButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const newGameCall = vi.mocked(workerMock.newGame).mock.calls[0]?.[0];
    expect(previewCall?.seed).toBe(newGameCall?.seed);
    expect(newGameCall).toMatchObject({
      userTeamId: 'nyy',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      saveSlot: 2,
    });
    expect(mockedSaveGame).toHaveBeenCalledWith(2, expect.stringContaining('Alex Rivera'), expect.any(Object));
    expect(storeMock.initializeGame).toHaveBeenCalled();
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('continues and deletes existing saves from the save hub', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const continueButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Continue'),
    );
    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedLoadGame).toHaveBeenCalledWith(1);
    expect(vi.mocked(workerMock.importSnapshot)).toHaveBeenCalled();
    expect(storeMock.initializeGame).toHaveBeenCalled();
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');

    const deleteButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Delete'),
    );
    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedDeleteSave).toHaveBeenCalledWith(1);
  });
});
