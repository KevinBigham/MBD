import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { CURRENT_GAME_SNAPSHOT_VERSION } from '@mbd/contracts';
import {
  AGM_CANDIDATES,
  type AGMCandidate,
  type RevisedOnboardingScript,
  type ScoutingHiringSlate,
  type StaffHiringSlate,
} from '@mbd/sim-core';
import RevisedOnboardingPage from './RevisedOnboardingPage';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById } from '@/shared/lib/saveSystem';
import { persistActiveSaveSnapshot } from '@/shared/lib/activeSavePersistence';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
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
}));

vi.mock('@/shared/lib/activeSavePersistence', () => ({
  persistActiveSaveSnapshot: vi.fn(),
}));

const mockedUseGameStore = vi.mocked(useGameStore);
const mockedUseWorker = vi.mocked(useWorker);
const mockedLoadGameById = vi.mocked(loadGameById);
const mockedPersistActiveSaveSnapshot = vi.mocked(persistActiveSaveSnapshot);

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

const AGMS = AGM_CANDIDATES as unknown as AGMCandidate[];

const STAFF_SLATE = {
  managerCandidates: [
    {
      id: 'manager-analytics',
      role: 'manager',
      name: 'Iris Hale',
      age: 49,
      experience: 15,
      style: 'analytics',
      teachingGrade: 72,
      specialty: 'Run prevention',
      personality: 'detail-driven',
      strengths: ['Bullpen leverage'],
      weaknesses: ['Dry with media'],
      coach: {},
    },
    {
      id: 'manager-traditional',
      role: 'manager',
      name: 'Ralph Nunez',
      age: 56,
      experience: 22,
      style: 'traditional',
      teachingGrade: 68,
      specialty: 'Clubhouse routine',
      personality: 'steady',
      strengths: ['Player trust'],
      weaknesses: ['Slow changes'],
      coach: {},
    },
    {
      id: 'manager-players',
      role: 'manager',
      name: 'Maya Rowe',
      age: 44,
      experience: 12,
      style: 'players_manager',
      teachingGrade: 74,
      specialty: 'Communication',
      personality: 'warm',
      strengths: ['Young players'],
      weaknesses: ['Needs structure'],
      coach: {},
    },
  ],
  pitchingCoachCandidates: [
    {
      id: 'pitching-development',
      role: 'pitching_coach',
      name: 'Cole Mercer',
      age: 42,
      experience: 10,
      style: 'development',
      teachingGrade: 76,
      specialty: 'Pitch design',
      personality: 'teacher',
      strengths: ['Delivery cleanup'],
      weaknesses: ['Patient with veterans'],
      coach: {},
    },
    {
      id: 'pitching-planning',
      role: 'pitching_coach',
      name: 'Evan Price',
      age: 47,
      experience: 14,
      style: 'game_planning',
      teachingGrade: 70,
      specialty: 'Advance reports',
      personality: 'strategist',
      strengths: ['Series plans'],
      weaknesses: ['Less hands-on'],
      coach: {},
    },
  ],
  hittingCoachCandidates: [
    {
      id: 'hitting-approach',
      role: 'hitting_coach',
      name: 'Luis Vega',
      age: 41,
      experience: 9,
      style: 'approach',
      teachingGrade: 73,
      specialty: 'Plate discipline',
      personality: 'teacher',
      strengths: ['Two-strike plans'],
      weaknesses: ['Less power focus'],
      coach: {},
    },
    {
      id: 'hitting-power',
      role: 'hitting_coach',
      name: 'Troy Hale',
      age: 45,
      experience: 13,
      style: 'power',
      teachingGrade: 71,
      specialty: 'Damage contact',
      personality: 'direct',
      strengths: ['Launch decisions'],
      weaknesses: ['Can chase slug'],
      coach: {},
    },
  ],
} as unknown as StaffHiringSlate;

const SCOUTING_SLATE = {
  candidates: [
    {
      id: 'scout-draft',
      name: 'Nate Shaw',
      age: 50,
      experience: 21,
      specialty: 'draft',
      networkStrength: 70,
      evaluationAccuracy: 75,
      strengths: ['Amateur looks'],
      weaknesses: ['Less pro coverage'],
      scout: {},
    },
    {
      id: 'scout-international',
      name: 'Ana Morales',
      age: 46,
      experience: 18,
      specialty: 'international',
      networkStrength: 79,
      evaluationAccuracy: 72,
      strengths: ['Latin America'],
      weaknesses: ['Small pro staff'],
      scout: {},
    },
    {
      id: 'scout-pro',
      name: 'Victor Stone',
      age: 54,
      experience: 25,
      specialty: 'pro_scouting',
      networkStrength: 74,
      evaluationAccuracy: 78,
      strengths: ['Trade targets'],
      weaknesses: ['Older-school lens'],
      scout: {},
    },
  ],
} as unknown as ScoutingHiringSlate;

function scriptLine(text: string) {
  return {
    speaker: 'agm',
    text,
    tone: 'confident',
  };
}

function buildScript(agm = AGMS[0]!): RevisedOnboardingScript {
  const chapter = (id: string, label: string, assessmentData: unknown, candidateIds: string[] = []) => ({
    chapter: { id, label, hasChoice: true, isHiring: false, order: 1 },
    intro: [scriptLine(`${label} intro`)],
    assessmentData,
    reaction: [scriptLine(`${label} reaction`)],
    transition: null,
    choiceReactions: {},
    candidateIds,
  });

  return {
    agm,
    greeting: [scriptLine('Marcus is ready to work.')],
    chapters: {
      agm_selection: chapter('agm_selection', 'Choose Your Assistant', null),
      owners_office: chapter('owners_office', "The Owner's Office", { owner: CHAPTER_DATA.owner }),
      roster_review: chapter('roster_review', 'Know Your Roster', { roster: CHAPTER_DATA.roster }),
      hire_coaches: chapter('hire_coaches', 'Hire Your Staff', null, [
        'manager-analytics',
        'pitching-development',
        'hitting-approach',
      ]),
      farm_system: chapter('farm_system', 'The Farm', { farm: CHAPTER_DATA.farm }),
      hire_scouts: chapter('hire_scouts', 'Hire Your Scout', null, ['scout-draft']),
      financial_plan: chapter('financial_plan', 'The Books', { financial: CHAPTER_DATA.financial }),
      season_strategy: chapter('season_strategy', 'The Game Plan', { strategy: CHAPTER_DATA.strategy }),
      press_conference: chapter('press_conference', 'Face the Press', { press: CHAPTER_DATA.press }),
    },
    farewell: [scriptLine('The office is staffed and the plan is live.')],
    staffOpinions: {
      'manager-analytics': {
        candidateId: 'manager-analytics',
        agreementLevel: 'recommend',
        lines: [scriptLine('I like this manager for the room.')],
      },
      'pitching-development': {
        candidateId: 'pitching-development',
        agreementLevel: 'recommend',
        lines: [scriptLine('The arms need this teacher.')],
      },
      'hitting-approach': {
        candidateId: 'hitting-approach',
        agreementLevel: 'recommend',
        lines: [scriptLine('The lineup needs this approach.')],
      },
    },
    scoutOpinions: {
      'scout-draft': {
        candidateId: 'scout-draft',
        agreementLevel: 'recommend',
        lines: [scriptLine('Draft coverage fits the plan.')],
      },
    },
  } as unknown as RevisedOnboardingScript;
}

const CHAPTER_DATA = {
  owner: {
    ownerGreeting: 'Welcome to the New York Tycoons.',
    ownerPersonality: {
      archetype: 'win_now_mogul',
      expectationLevel: 'championship',
      personalityDescription: 'The owner wants October noise immediately.',
    },
    expectations: 'Reach October without mortgaging every prospect.',
    budgetOverview: {
      totalBudget: 220,
      currentPayroll: 180,
      availableSpace: 40,
      luxuryTaxDistance: 25,
      spendingGrade: 'B',
      narrativeSummary: 'There is room to support the roster.',
    },
    marketContext: 'Big market, bigger expectations.',
    divisionOutlook: 'The division is tight enough to punish hesitation.',
    seasonGoalOptions: [
      { id: 'playoff', label: 'Playoff Berth', description: 'Reach October with flexibility.' },
      { id: 'compete', label: 'Compete', description: 'Stay relevant deep into the season.' },
    ],
  },
  roster: {
    rosterNarrative: 'The lineup can carry a contender if the bullpen holds.',
    lineup: {
      overallGrade: 'B',
      hittersGrade: 'A',
      pitchingGrade: 'C',
      topStrength: 'middle-order thump',
      biggestWeakness: 'late innings',
    },
    stars: [
      {
        playerId: 'star-1',
        name: 'Jace Cannon',
        position: 'CF',
        age: 28,
        letterGrade: 'A',
        contractYears: 3,
        annualSalary: 24,
      },
    ],
    needs: [
      { position: 'RP', urgency: 'moderate', explanation: 'One more leverage arm changes the room.' },
    ],
  },
  farm: {
    farmNarrative: 'The farm has one near-ready bat and enough depth to matter.',
    pipeline: {
      grade: 'B',
      readyCount: 1,
      developingCount: 4,
      rawCount: 3,
      positionBalance: 'balanced',
      depthDescription: 'Balanced depth.',
    },
    topProspects: [
      {
        playerId: 'prospect-1',
        name: 'Rafael Reyes',
        position: 'SS',
        age: 21,
        level: 'AAA',
        overallRating: 62,
        ceiling: 82,
        ceilingGrade: 'A',
        archetype: 'Two-way infielder',
        readiness: 'one_year',
        breakoutProbability: 0.2,
        spotlight: 'Close enough to become a summer question.',
      },
    ],
    developmentOptions: [
      { id: 'balanced', label: 'Balanced Development', description: 'Promote when tools and production agree.' },
      { id: 'patient', label: 'Patient Development', description: 'Let prospects dominate first.' },
    ],
    closestToMLB: null,
    highestCeiling: null,
  },
  financial: {
    payroll: {
      totalPayroll: 180,
      hitterPayroll: 105,
      pitcherPayroll: 75,
      topPaidPlayer: { name: 'Jace Cannon', salary: 24 },
      averageSalary: 8,
      medianSalary: 6,
    },
    extensions: [],
    flexibility: {
      grade: 'B',
      availableSpace: 40,
      luxuryTaxRoom: 25,
      canAddStar: true,
      canAddRole: true,
      narrativeSummary: 'The books can support a targeted move.',
    },
    spendingOptions: [
      { id: 'balanced', label: 'Balanced', description: 'Spend with intent and protect flexibility.' },
      { id: 'big_spender', label: 'Big Spender', description: 'Use available room now.' },
    ],
  },
  staff: {},
  scouting: {},
  strategy: {
    competitiveWindow: 'stable_contender',
    recommendedSeasonGoal: 'playoff',
    recommendedTradeApproach: 'buyer',
    priorityList: [
      {
        id: 'push_current_window',
        title: 'Push the current window',
        description: 'Reinforce the roster without losing the next core.',
        score: 84,
      },
    ],
    strategyOptions: [
      { id: 'buyer', label: 'Buyer', description: 'Convert flexibility into help.' },
      { id: 'opportunistic', label: 'Opportunistic', description: 'Let market value decide.' },
    ],
    summaryNarrative: 'The Tycoons are a stable contender with a buyer lean.',
  },
  press: {
    openingStatementOptions: [
      { id: 'confident', label: 'Confident', statement: 'We expect this club to play in October.' },
      { id: 'measured', label: 'Measured', statement: 'We will earn trust with disciplined decisions.' },
    ],
    likelyQuestions: ['How quickly will this roster be reinforced?'],
    recommendedTone: 'confident',
    finalNarrative: 'The market will parse every word from the first press conference.',
  },
};

function buildOnboardingData(agm = AGMS[0]!): RevisedOnboardingData {
  return {
    script: buildScript(agm),
    chapterData: CHAPTER_DATA,
    staffSlate: STAFF_SLATE,
    scoutingSlate: SCOUTING_SLATE,
  } as unknown as RevisedOnboardingData;
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

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) =>
    candidate.textContent?.includes(text),
  );
  expect(button, `Expected button containing "${text}"`).toBeTruthy();
  return button as HTMLButtonElement;
}

async function clickButton(container: HTMLElement, text: string) {
  await act(async () => {
    findButton(container, text).dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
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
    mockedPersistActiveSaveSnapshot.mockResolvedValue({
      saved: true,
      saveName: 'General Manager • New York Tycoons',
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

  it('loads AGM candidates from the revised worker API and renders all three choices', async () => {
    const worker = {
      isReady: true,
      getAGMCandidates: vi.fn().mockResolvedValue(AGMS),
      getRevisedOnboardingData: vi.fn().mockResolvedValue(buildOnboardingData()),
    } as unknown as ReturnType<typeof useWorker>;

    mockedUseWorker.mockReturnValue(worker);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await flush();

    expect(worker.getAGMCandidates).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Marcus Chen');
    expect(container.textContent).toContain('Walter Kowalski');
    expect(container.textContent).toContain('Elena Vargas');
    expect(container.textContent).toContain('Day One. First Decision.');
  });

  it('runs the revised AGM flow through staff, scout, completion, and save persistence', async () => {
    const worker = {
      isReady: true,
      getAGMCandidates: vi.fn().mockResolvedValue(AGMS),
      getRevisedOnboardingData: vi.fn().mockResolvedValue(buildOnboardingData()),
      applyStaffHires: vi.fn().mockResolvedValue({ success: true, flowStateChanged: false }),
      applyScoutingHire: vi.fn().mockResolvedValue({ success: true, flowStateChanged: false }),
      completeRevisedOnboarding: vi.fn().mockResolvedValue({ success: true, flowStateChanged: true }),
      exportSnapshot: vi.fn().mockResolvedValue({
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        season: 1,
        day: 1,
        phase: 'preseason',
        franchise: {
          assistantGMId: 'marcus_chen',
          scoutingDirector: { id: 'scout-draft', specialty: 'draft' },
          gmPhilosophy: {
            seasonGoal: 'playoff',
            developmentStyle: 'balanced',
            spendingStyle: 'balanced',
            tradeApproach: 'buyer',
            scoutingFocus: 'draft',
            mediaTone: 'confident',
          },
          onboarding: { welcomeBriefingSeen: true },
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
    await flush();

    await clickButton(container, 'Hire Marcus');
    expect(worker.getRevisedOnboardingData).toHaveBeenCalledWith('marcus_chen');

    await clickButton(container, 'Playoff Berth');
    await clickButton(container, 'Continue Roster Review');

    await clickButton(container, 'Iris Hale');
    await clickButton(container, 'Cole Mercer');
    await clickButton(container, 'Luis Vega');
    await clickButton(container, 'Confirm Hires');
    expect(worker.applyStaffHires).toHaveBeenCalledWith({
      managerId: 'manager-analytics',
      pitchingCoachId: 'pitching-development',
      hittingCoachId: 'hitting-approach',
    });

    await clickButton(container, 'Balanced Development');

    await clickButton(container, 'Nate Shaw');
    await clickButton(container, 'Confirm Hire');
    expect(worker.applyScoutingHire).toHaveBeenCalledWith('scout-draft');

    await clickButton(container, 'Balanced');
    await clickButton(container, 'Buyer');
    await clickButton(container, 'Confident');
    await clickButton(container, 'Enter the Front Office');

    expect(worker.completeRevisedOnboarding).toHaveBeenCalledWith(expect.objectContaining({
      selectedAGMId: 'marcus_chen',
      staffHires: {
        managerId: 'manager-analytics',
        pitchingCoachId: 'pitching-development',
        hittingCoachId: 'hitting-approach',
      },
      scoutingHire: 'scout-draft',
      gmPhilosophy: expect.objectContaining({
        seasonGoal: 'playoff',
        developmentStyle: 'balanced',
        spendingStyle: 'balanced',
        tradeApproach: 'buyer',
        scoutingFocus: 'draft',
        mediaTone: 'confident',
      }),
    }));
    expect(worker.exportSnapshot).toHaveBeenCalledTimes(1);
    expect(mockedLoadGameById).toHaveBeenCalledWith('save-slot-1');
    expect(mockedPersistActiveSaveSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      saveName: 'General Manager • New York Tycoons',
      season: 1,
    }));
    const capturedSnapshot = await mockedPersistActiveSaveSnapshot.mock.calls[0]![0].exportSnapshot();
    expect(capturedSnapshot).toEqual(expect.objectContaining({
      schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
      franchise: expect.objectContaining({
        assistantGMId: 'marcus_chen',
        onboarding: expect.objectContaining({ welcomeBriefingSeen: true }),
      }),
    }));
    expect(mockedNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('preserves the intro-scroll guided start nudge on the revised route', async () => {
    registerGuidedStartSave('save-slot-1');
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAGMCandidates: vi.fn().mockResolvedValue(AGMS),
      getRevisedOnboardingData: vi.fn().mockResolvedValue(buildOnboardingData()),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await flush();

    expect(container.textContent).toContain('The owner handed you the keys');
    await clickButton(container, "Let's go.");

    expect(readGuidedStartNudgeRecord('save-slot-1')?.seen.intro_scroll).toBe(true);
    expect(container.textContent).not.toContain('The owner handed you the keys');
  });

  it('surfaces revised worker load errors', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getAGMCandidates: vi.fn().mockRejectedValue(new Error('AGM API unavailable')),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <RevisedOnboardingPage />
        </MemoryRouter>,
      );
    });
    await flush();

    expect(container.textContent).toContain('AGM API unavailable');
  });
});
