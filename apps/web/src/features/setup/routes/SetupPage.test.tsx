import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import SetupPage from './SetupPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import {
  deleteSave,
  deleteSaveById,
  inspectSaveById,
  listSaveTree,
  listSaves,
  loadGameSafe,
  loadSaveSafely,
  repairSave,
  saveGame,
} from '@/shared/lib/saveSystem';
import { registerGuidedStartSave } from '@/features/onboarding/nudges';

const mockedNavigate = vi.fn();
const recoveryMockState = vi.hoisted(() => ({
  showFailure: vi.fn(),
}));

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

vi.mock('@/features/save-recovery', () => ({
  useSaveRecovery: () => ({
    showFailure: recoveryMockState.showFailure,
  }),
}));

vi.mock('@/features/onboarding/nudges', () => ({
  registerGuidedStartSave: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  SAVE_SLOTS: [1, 2, 3, 4, 5],
  deleteSave: vi.fn(),
  deleteSaveById: vi.fn(),
  inspectSaveById: vi.fn(),
  listBranches: vi.fn().mockResolvedValue([]),
  listSaveTreeChildIds: vi.fn().mockResolvedValue([]),
  listSaveTree: vi.fn(),
  listSaves: vi.fn(),
  loadGame: vi.fn(),
  loadGameSafe: vi.fn(),
  loadSaveSafely: vi.fn(),
  repairSave: vi.fn(),
  saveGame: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedListSaves = vi.mocked(listSaves);
const mockedListSaveTree = vi.mocked(listSaveTree);
const mockedLoadGameSafe = vi.mocked(loadGameSafe);
const mockedLoadSaveSafely = vi.mocked(loadSaveSafely);
const mockedRepairSave = vi.mocked(repairSave);
const mockedSaveGame = vi.mocked(saveGame);
const mockedDeleteSave = vi.mocked(deleteSave);
const mockedDeleteSaveById = vi.mocked(deleteSaveById);
const mockedInspectSaveById = vi.mocked(inspectSaveById);
const mockedRegisterGuidedStartSave = vi.mocked(registerGuidedStartSave);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SetupPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let workerMock: ReturnType<typeof useWorker>;
  let storeMock: {
    activeSaveId: string | null;
    activeSaveSlot: number | null;
    isInitialized: boolean;
    initializeGame: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedNavigate.mockReset();
    recoveryMockState.showFailure.mockReset();
    storeMock = {
      activeSaveId: null,
      activeSaveSlot: null,
      isInitialized: false,
      initializeGame: vi.fn(),
    };
    mockedUseGameStore.mockReturnValue(storeMock as ReturnType<typeof useGameStore>);
    workerMock = {
      isReady: true,
      getScenarioCatalog: vi.fn().mockResolvedValue([]),
      getSetupPreview: vi.fn().mockResolvedValue({
        teamId: 'nym',
        teamName: 'New York Tycoons',
        division: 'AL_EAST',
        archetype: 'Empire Under Pressure',
        franchiseHook: 'The sport’s loudest market wants October immediately.',
        whyNow: 'The roster can win now if the room is aligned.',
        marketSize: 'large',
        timeline: 'Win now',
        payrollTier: 'Premier',
        farmSystemRating: 'B+',
        strengths: ['middle-of-order thump', 'rotation depth'],
        weaknesses: ['bullpen stability', 'prospect pipeline'],
        teamIdentityBlurb: 'Big-market expectations with enough prospects to support a push.',
        projectedRecord: '88-74',
        topPlayers: [
          { playerId: 'p-judge', name: 'Aaron Judge', position: 'RF', overall: 78 },
        ],
        divisionRivals: [
          { teamId: 'bos', teamName: 'Boston Noreasters' },
        ],
      }),
      newGame: vi.fn().mockResolvedValue({
        season: 1,
        day: 1,
        phase: 'preseason',
        playerCount: 780,
        userTeamId: 'nym',
        teamName: 'New York Tycoons',
        gmName: 'Alex Rivera',
        difficulty: 'hard',
      }),
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: 13,
        season: 1,
        day: 1,
        phase: 'preseason',
      }),
      importSnapshot: vi.fn().mockResolvedValue({
        success: true,
        season: 4,
        day: 88,
        phase: 'regular',
        playerCount: 780,
        userTeamId: 'nym',
        teamName: 'New York Tycoons',
        gmName: 'General Manager',
        difficulty: 'standard',
      }),
    } as unknown as ReturnType<typeof useWorker>;
    mockedUseWorker.mockReturnValue(workerMock);
    mockedSaveGame.mockResolvedValue({
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Alex Rivera • New York Tycoons',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 34,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-02T13:00:00.000Z',
      updatedAt: '2026-04-02T13:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });

    mockedListSaves.mockResolvedValue([
      {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Tycoons Year 4',
        season: 4,
        day: 88,
        phase: 'regular',
        schemaVersion: 11,
        playMode: 'standard',
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 11,
          season: 4,
          day: 88,
          phase: 'regular',
          userTeamId: 'nym',
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            playMode: 'standard',
            createdAt: 'S1D1',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            teamAbbreviation: 'NYT',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
          achievements: {
            unlocked: [
              { id: 'champion', unlockedAt: 'S3D180', season: 3, teamId: 'nym', summary: 'Won the World Series.' },
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
    mockedListSaveTree.mockResolvedValue([
      {
        save: {
          id: 'save-slot-1',
          slotNumber: 1,
          name: 'Tycoons Year 4',
          season: 4,
          day: 88,
          phase: 'regular',
          schemaVersion: 15,
          hasSnapshot: true,
          snapshot: {
            schemaVersion: 15,
            season: 4,
            day: 88,
            phase: 'regular',
            userTeamId: 'nym',
            franchise: {
              gmName: 'General Manager',
              difficulty: 'standard',
              playMode: 'standard',
              createdAt: 'S1D1',
              teamId: 'nym',
              teamName: 'New York Tycoons',
              teamAbbreviation: 'NYT',
              teamDivision: 'AL_EAST',
              onboarding: {
                welcomeBriefingSeen: true,
                firstMonthlyPulseSeen: true,
              },
            },
            achievements: {
              unlocked: [
                { id: 'champion', unlockedAt: 'S3D180', season: 3, teamId: 'nym', summary: 'Won the World Series.' },
              ],
              progress: [],
              counters: [],
              ledgers: [],
            },
            narrative: {
              whatIfBranches: [
                {
                  id: 'branch-1',
                  saveId: 'branch-1',
                  branchedAtSeason: 4,
                  branchedAtDay: 62,
                  description: 'Aggressive deadline push',
                  createdAt: '2026-04-02T12:00:00.000Z',
                },
              ],
            },
          },
          legacyState: null,
          createdAt: '2026-04-02T00:00:00.000Z',
          updatedAt: '2026-04-02T12:00:00.000Z',
          parentSaveId: null,
          isRootSave: true,
          branchMeta: null,
        },
        branches: [
          {
            id: 'branch-1',
            slotNumber: null,
            name: 'Aggressive deadline push',
            season: 4,
            day: 88,
            phase: 'regular',
            schemaVersion: 15,
            hasSnapshot: true,
            snapshot: {
              schemaVersion: 15,
              season: 4,
              day: 88,
              phase: 'regular',
              franchise: {
                gmName: 'General Manager',
                difficulty: 'standard',
                playMode: 'standard',
                createdAt: 'S1D1',
                teamId: 'nym',
                teamName: 'New York Tycoons',
                teamAbbreviation: 'NYT',
                teamDivision: 'AL_EAST',
                onboarding: {
                  welcomeBriefingSeen: true,
                  firstMonthlyPulseSeen: true,
                },
              },
            },
            legacyState: null,
            createdAt: '2026-04-02T12:00:00.000Z',
            updatedAt: '2026-04-02T12:30:00.000Z',
            parentSaveId: 'save-slot-1',
            isRootSave: false,
            branchMeta: {
              id: 'branch-1',
              saveId: 'branch-1',
              branchedAtSeason: 4,
              branchedAtDay: 62,
              description: 'Aggressive deadline push',
              createdAt: '2026-04-02T12:00:00.000Z',
            },
          },
        ],
      },
    ] as never);
    mockedLoadGameSafe.mockResolvedValue({
      status: 'ok',
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Tycoons Year 4',
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
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            playMode: 'standard',
            createdAt: 'S1D1',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            teamAbbreviation: 'NYT',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    } as never);
    mockedLoadSaveSafely.mockResolvedValue({
      ok: true,
      snapshot: {
        schemaVersion: 11,
        season: 4,
        day: 88,
        phase: 'regular',
        franchise: {
          gmName: 'General Manager',
          difficulty: 'standard',
          playMode: 'standard',
          createdAt: 'S1D1',
          teamId: 'nym',
          teamName: 'New York Tycoons',
          teamAbbreviation: 'NYT',
          teamDivision: 'AL_EAST',
          onboarding: {
            welcomeBriefingSeen: true,
            firstMonthlyPulseSeen: true,
          },
        },
      },
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Tycoons Year 4',
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
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            playMode: 'standard',
            createdAt: 'S1D1',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            teamAbbreviation: 'NYT',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      },
      rawJson: '{"id":"save-slot-1"}',
    } as never);
    mockedRepairSave.mockResolvedValue({
      status: 'ok',
      save: {
        id: 'save-slot-1',
        slotNumber: 1,
        name: 'Recovered Tycoons Year 4',
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
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            playMode: 'standard',
            createdAt: 'S1D1',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            teamAbbreviation: 'NYT',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
        },
        legacyState: null,
        createdAt: '2026-04-02T00:00:00.000Z',
        updatedAt: '2026-04-02T12:00:00.000Z',
      },
    } as never);
    mockedInspectSaveById.mockResolvedValue({
      status: 'ok',
      slot: null,
      save: {
        id: 'branch-1',
        slotNumber: null,
        name: 'Aggressive deadline push',
        season: 4,
        day: 88,
        phase: 'regular',
        schemaVersion: 15,
        hasSnapshot: true,
        snapshot: {
          schemaVersion: 15,
          season: 4,
          day: 88,
          phase: 'regular',
          franchise: {
            gmName: 'General Manager',
            difficulty: 'standard',
            playMode: 'standard',
            createdAt: 'S1D1',
            teamId: 'nym',
            teamName: 'New York Tycoons',
            teamAbbreviation: 'NYT',
            teamDivision: 'AL_EAST',
            onboarding: {
              welcomeBriefingSeen: true,
              firstMonthlyPulseSeen: true,
            },
          },
        },
        legacyState: null,
        createdAt: '2026-04-02T12:00:00.000Z',
        updatedAt: '2026-04-02T12:30:00.000Z',
        parentSaveId: 'save-slot-1',
        isRootSave: false,
        branchMeta: {
          id: 'branch-1',
          saveId: 'branch-1',
          branchedAtSeason: 4,
          branchedAtDay: 62,
          description: 'Aggressive deadline push',
          createdAt: '2026-04-02T12:00:00.000Z',
        },
      },
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

    expect(container.textContent).toContain('A browser-based baseball franchise dynasty sim');
    expect(container.textContent).toContain('What it is');
    expect(container.textContent).toContain('What it is not');
    expect(container.textContent).toContain('Start with New Dynasty');
    expect(container.textContent).toContain('New York Tycoons');

    const newDynastyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New Dynasty'),
    );
    await act(async () => {
      newDynastyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const gmNameInput = container.querySelector('#setup-gm-name') as HTMLInputElement | null;
    const difficultySelect = container.querySelector('#setup-difficulty') as HTMLSelectElement | null;

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(gmNameInput, 'Alex Rivera');
      gmNameInput?.dispatchEvent(new Event('input', { bubbles: true }));
      difficultySelect!.value = 'hard';
      difficultySelect?.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Aaron Judge');
    expect(container.textContent).toContain('Boston Noreasters');

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
      userTeamId: 'nym',
      gmName: 'Alex Rivera',
      difficulty: 'hard',
      saveSlot: 2,
      dayOneExperience: 'full',
    });
    expect(mockedSaveGame).toHaveBeenCalledWith(
      2,
      expect.stringContaining('Alex Rivera'),
      expect.any(Object),
      { replaceExistingRootBranchMetadata: true },
    );
    expect(mockedRegisterGuidedStartSave).toHaveBeenCalledWith('save-slot-2');
    expect(storeMock.initializeGame).toHaveBeenCalled();
    expect(mockedNavigate).toHaveBeenCalledWith('/onboarding');
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

    expect(mockedLoadSaveSafely).toHaveBeenCalledWith('save-slot-1');
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
    expect(mockedDeleteSaveById).not.toHaveBeenCalled();
  });

  it('passes career mode into new dynasty creation when the GM Career option is selected', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    const newDynastyButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('New Dynasty'),
    );
    await act(async () => {
      newDynastyButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const careerButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('GM Career'),
    );
    await act(async () => {
      careerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const beginButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Begin Season 1'),
    );
    await act(async () => {
      beginButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(vi.mocked(workerMock.newGame).mock.calls[0]?.[0]).toMatchObject({
      playMode: 'career',
    });
  });

  it('hands corrupt root saves to the recovery flow with retry and delete callbacks', async () => {
    const failure = {
      ok: false,
      reason: 'zod',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Snapshot payload is invalid.',
        rawJson: '{"id":"save-slot-1"}',
      },
    } as const;
    mockedLoadSaveSafely.mockResolvedValueOnce(failure as never);

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

    expect(recoveryMockState.showFailure).toHaveBeenCalledWith(expect.objectContaining({
      failure,
      onDelete: expect.any(Function),
      onRetry: expect.any(Function),
    }));

    const options = recoveryMockState.showFailure.mock.calls[0]?.[0] as {
      onDelete: () => Promise<void>;
      onRetry: () => Promise<boolean | void>;
    };

    await act(async () => {
      await options.onDelete();
    });
    expect(mockedDeleteSaveById).toHaveBeenCalledWith('save-slot-1');
    expect(mockedDeleteSave).not.toHaveBeenCalled();

    mockedLoadSaveSafely.mockResolvedValueOnce({
      ok: false,
      reason: 'parse',
      detail: {
        slotId: 'save-slot-1',
        slotNumber: 1,
        message: 'Still broken.',
        rawJson: '{"id":"save-slot-1"}',
      },
    } as never);

    let retryResult: boolean | void = undefined;
    await act(async () => {
      retryResult = await options.onRetry();
    });
    expect(retryResult).toBe(false);
  });

  it('loads branch saves through the verified safe-load path', async () => {
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

    const branchInspection = await mockedInspectSaveById('branch-1');
    if (branchInspection.status !== 'ok') {
      throw new Error('Expected the branch fixture to be loadable.');
    }
    mockedInspectSaveById.mockClear();
    mockedLoadSaveSafely.mockResolvedValueOnce({
      ok: true,
      save: branchInspection.save,
      snapshot: branchInspection.save.snapshot!,
      rawJson: '{"id":"branch-1"}',
    });

    const branchButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Branch'),
    );

    await act(async () => {
      branchButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedInspectSaveById).not.toHaveBeenCalled();
    expect(mockedLoadSaveSafely).toHaveBeenCalledWith('branch-1');
    expect(vi.mocked(workerMock.importSnapshot)).toHaveBeenCalled();
  });

  it('renders branch list under the parent save and shows the branch cap indicator', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('1/3 branches');
  });
});
