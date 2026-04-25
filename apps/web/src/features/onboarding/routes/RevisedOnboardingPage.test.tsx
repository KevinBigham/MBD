import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { CURRENT_GAME_SNAPSHOT_VERSION } from '@mbd/contracts';
import type { AGMCandidate } from '@mbd/sim-core';
import type { DayOneSession } from '@/workers/sim.worker.onboarding';
import RevisedOnboardingPage from './RevisedOnboardingPage';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import {
  readGuidedStartNudgeRecord,
  registerGuidedStartSave,
} from '../nudges';

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
  loadGameById: vi.fn(),
  saveGame: vi.fn(),
  saveGameById: vi.fn(),
}));

const mockedUseGameStore = vi.mocked(useGameStore);
const mockedUseWorker = vi.mocked(useWorker);
const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGame = vi.mocked(saveGame);
const mockedSaveGameById = vi.mocked(saveGameById);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

const AGMS: AGMCandidate[] = [
  {
    id: 'marcus_chen',
    name: 'Marcus Chen',
    nickname: 'Marcus',
    gender: 'male',
    age: 34,
    background: 'analytics_pioneer',
    personality: 'analytical_mind',
    philosophy: {
      pitchingOrHitting: 'balanced',
      developmentVsFA: 'hybrid',
      riskTolerance: 'calculated',
    },
    strengths: ['Player valuation to the dollar', 'Financial modeling', 'Market inefficiency detection'],
    weaknesses: ['Over-indexes on numbers', 'Can feel cold'],
    catchphrases: ['The numbers say...', 'Small sample size...', 'Expected value is...', 'Updating priors.', 'My model hates this.'],
    bio: 'Marcus bio',
    selectionScreenBio: 'Marcus pitch',
    voiceStyle: {
      sentenceLength: 'short',
      usesAnalogy: false,
      usesStats: true,
      humor: 'dry',
      formality: 'professional',
      emotionalRange: 'reserved',
    },
  },
  {
    id: 'walt_kowalski',
    name: 'Walter Kowalski',
    nickname: 'Walt',
    gender: 'male',
    age: 58,
    background: 'former_player',
    personality: 'grizzled_veteran',
    philosophy: {
      pitchingOrHitting: 'pitching_wins',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'conservative',
    },
    strengths: ['Clubhouse reads', 'Player evaluation by eye', 'Managing personalities'],
    weaknesses: ['Hates over-modeling', 'Old-school bias'],
    catchphrases: ['Kid has...', 'Back in...', 'Funny game', 'Seen this before', 'Plays it right'],
    bio: 'Walt bio',
    selectionScreenBio: 'Walt pitch',
    voiceStyle: {
      sentenceLength: 'short',
      usesAnalogy: false,
      usesStats: false,
      humor: 'gruff',
      formality: 'folksy',
      emotionalRange: 'moderate',
    },
  },
  {
    id: 'elena_vargas',
    name: 'Elena Vargas',
    nickname: 'Vargs',
    gender: 'female',
    age: 47,
    background: 'career_scout',
    personality: 'enthusiastic_mentor',
    philosophy: {
      pitchingOrHitting: 'balanced',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'calculated',
    },
    strengths: ['Player development', 'International network', 'Communication'],
    weaknesses: ['Gets attached', 'Tolerates budgets'],
    catchphrases: ['Let me tell you...', 'Trust me...', 'I have seen this...', 'Kid has...', 'Tiene fuego'],
    bio: 'Elena bio',
    selectionScreenBio: 'Elena pitch',
    voiceStyle: {
      sentenceLength: 'varied',
      usesAnalogy: true,
      usesStats: false,
      humor: 'warm',
      formality: 'casual',
      emotionalRange: 'expressive',
    },
  },
];

function buildSession(overrides: Partial<DayOneSession> = {}): DayOneSession {
  return {
    mode: 'full',
    currentStep: 'recap',
    teamCard: {
      teamId: 'nym',
      teamName: 'New York Tycoons',
      division: 'AL_EAST',
      archetype: 'Empire Under Pressure',
      franchiseHook: 'The loudest market wants October now.',
      whyNow: 'The roster can win if the room is aligned.',
      marketSize: 'large',
      timeline: 'Win now',
      payrollTier: 'Premier',
      farmSystemRating: 'B+',
      strengths: ['middle-of-order thump', 'rotation depth'],
      weaknesses: ['bullpen stability', 'prospect pipeline'],
      teamIdentityBlurb: 'Big pressure, real upside.',
      projectedRecord: '90-72',
      topPlayers: [
        { playerId: 'h1', name: 'Jace Cannon', position: 'CF', overall: 78 },
      ],
      divisionRivals: [
        { teamId: 'bos', teamName: 'Boston Noreasters' },
      ],
    },
    ownerScene: {
      title: 'Welcome To New York Tycoons',
      summary: 'Owner summary',
      expectation: 'Owner expectation',
      stakes: 'Owner stakes',
    },
    stepCopy: {
      eyebrow: 'April Watch',
      headline: 'The room is already reacting.',
      body: 'This is what the AGM thinks comes next.',
    },
    agmCandidates: AGMS,
    selectedAGM: AGMS[0]!,
    orgReview: {
      mlbRank: 5,
      farmRank: 12,
      mlbTier: 'strong',
      farmTier: 'average',
      strengths: ['middle-of-order thump', 'rotation depth'],
      weaknesses: ['bullpen stability', 'prospect pipeline'],
      inheritedStory: 'A strong MLB room with a middle-tier pipeline.',
      topProspectName: 'Rafael Reyes',
      projectedWins: 90,
    },
    projectedImpacts: [],
    crisis: null,
    recap: {
      title: 'The Tycoons Are Yours',
      summary: 'The market already has a read on your first day.',
      bullets: ['Marcus Chen is now beside you.', 'Budget posture: Balanced.'],
    },
    teaser: {
      headline: 'New York already sounds different after your first day.',
      agmReaction: 'Marcus thinks the first ten games will tell the room if your posture is real.',
      localPressNote: 'The local read is simple: you invited scrutiny on purpose.',
      aprilWatchItems: [
        'Every late-inning wobble becomes a referendum.',
        'Rafael Reyes is already a promotion headline.',
        'The owner expects urgency without chaos.',
      ],
      openingDayPrompt: 'Opening Day is waiting with the volume already turned up.',
    },
    openingPlanView: null,
    choices: {
      seasonGoal: 'playoff',
      budgetAllocation: 'balanced',
      developmentStyle: 'balanced',
      promotionStance: 'measured',
      openingDayPlan: null,
    },
    ...overrides,
  };
}

function mockGameStore(overrides: Partial<{
  activeSaveId: string | null;
  activeSaveSlot: number | null;
  gmName: string;
}> = {}) {
  const state = {
    activeSaveId: 'save-slot-1',
    activeSaveSlot: 1,
    gmName: 'General Manager',
    ...overrides,
  };

  mockedUseGameStore.mockImplementation(((selector: (value: typeof state) => unknown) => selector(state)) as typeof useGameStore);
}

describe('RevisedOnboardingPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    });
    mockedNavigate.mockReset();
    mockGameStore();
    mockedLoadGameById.mockResolvedValue(undefined);
    mockedSaveGame.mockResolvedValue(undefined);
    mockedSaveGameById.mockResolvedValue({
      id: 'save-slot-1',
      slotNumber: 1,
      name: 'General Manager • New York Tycoons',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });
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

  it('renders the recap teaser beat with April watch items', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDayOneSession: vi.fn().mockResolvedValue(buildSession()),
      finishDayOne: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('New York already sounds different after your first day.');
    expect(container.textContent).toContain('The local read is simple: you invited scrutiny on purpose.');
    expect(container.textContent).toContain('Every late-inning wobble becomes a referendum.');
    expect(container.textContent).toContain('Opening Day is waiting with the volume already turned up.');
  });

  it('shows the intro-scroll nudge once for a newly registered save', async () => {
    registerGuidedStartSave('save-slot-1');
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDayOneSession: vi.fn().mockResolvedValue(buildSession()),
      finishDayOne: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain('The owner handed you the keys');
    const dismissButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent === "Let's go.",
    );

    await act(async () => {
      dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(readGuidedStartNudgeRecord('save-slot-1')?.seen.intro_scroll).toBe(true);
    expect(container.textContent).not.toContain('The owner handed you the keys');

    await act(async () => {
      root.unmount();
    });
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('The owner handed you the keys');
  });

  it('shows duplicate opening-day warnings and lets the user reset back to AGM recommendations', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getDayOneSession: vi.fn().mockResolvedValue(buildSession({
        currentStep: 'opening_day_plan',
        stepCopy: {
          eyebrow: 'Opening Day Board',
          headline: 'Set the board like you mean it.',
          body: 'Marcus wants the leverage roles aligned cleanly.',
        },
        recap: null,
        teaser: null,
        openingPlanView: {
          lineup: [],
          rotation: [],
          bullpen: {
            closer: null,
            setup: [],
            longRelief: null,
          },
          lineupOptions: [
            { playerId: 'h1', name: 'Jace Cannon', position: 'CF' },
            { playerId: 'h2', name: 'Luis Vega', position: 'SS' },
          ],
          rotationOptions: [
            { playerId: 'sp1', name: 'Cole Mercer', position: 'SP' },
            { playerId: 'sp2', name: 'Troy Hale', position: 'SP' },
          ],
          bullpenOptions: [
            { playerId: 'rp1', name: 'Nate Shaw', position: 'CL' },
            { playerId: 'rp2', name: 'Evan Price', position: 'RP' },
          ],
        },
        choices: {
          seasonGoal: 'playoff',
          budgetAllocation: 'balanced',
          developmentStyle: 'balanced',
          promotionStance: 'measured',
          openingDayPlan: {
            lineupPlayerIds: ['h1', 'h2'],
            rotationPlayerIds: ['sp1', 'sp2'],
            bullpen: {
              closerId: 'rp1',
              setupIds: ['rp2'],
              longReliefId: null,
            },
          },
        },
      })),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const selects = Array.from(container.querySelectorAll('select')) as HTMLSelectElement[];
    expect(container.textContent).toContain('AGM Recommended');

    await act(async () => {
      selects[1]!.value = 'h1';
      selects[1]!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Jace Cannon is assigned to multiple lineup spots.');
    expect(container.textContent).toContain('Fix the duplicate role warnings before locking the Opening Day plan.');

    const resetLineupButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Reset Lineup'),
    );

    await act(async () => {
      resetLineupButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(selects[1]!.value).toBe('h2');
    expect(container.textContent).not.toContain('Jace Cannon is assigned to multiple lineup spots.');
  });

  it('persists the completed Day One snapshot before entering the dashboard', async () => {
    const session = buildSession();
    const worker = {
      isReady: true,
      getDayOneSession: vi.fn().mockResolvedValue(session),
      finishDayOne: vi.fn().mockResolvedValue(undefined),
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        season: 1,
        day: 1,
        phase: 'preseason',
        franchise: {
          dayOne: {
            status: 'complete',
            currentStep: 'complete',
            selectedAGMId: 'marcus_chen',
          },
        },
      }),
    } as unknown as ReturnType<typeof useWorker>;

    mockedUseWorker.mockReturnValue(worker);
    mockedLoadGameById.mockResolvedValue({
      id: 'save-slot-1',
      slotNumber: 1,
      name: 'General Manager • New York Tycoons',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
      hasSnapshot: true,
      snapshot: null,
      legacyState: null,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z',
      parentSaveId: null,
      isRootSave: true,
      branchMeta: null,
    });

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    const enterFrontOfficeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Enter The Front Office'),
    );

    await act(async () => {
      enterFrontOfficeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(worker.finishDayOne).toHaveBeenCalledTimes(1);
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedLoadGameById).toHaveBeenCalledWith('save-slot-1');
    expect(mockedSaveGameById).toHaveBeenCalledWith(
      'save-slot-1',
      'General Manager • New York Tycoons',
      expect.objectContaining({
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        franchise: expect.objectContaining({
          dayOne: expect.objectContaining({
            status: 'complete',
            currentStep: 'complete',
            selectedAGMId: 'marcus_chen',
          }),
        }),
      }),
      expect.objectContaining({
        slotNumber: 1,
        parentSaveId: null,
        isRootSave: true,
        branchMeta: null,
      }),
    );
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
