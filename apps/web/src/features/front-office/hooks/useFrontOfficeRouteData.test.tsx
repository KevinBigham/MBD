import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { TeamChemistry } from '@mbd/contracts';
import type { FrontOfficeMentorshipView } from '../components/FrontOfficeClubhouseWebCard';
import type { FrontOfficeReputationView } from '../components/FrontOfficeHealthCards';
import type { FrontOfficeIdentityView } from '../components/FrontOfficeIdentityCard';
import type { FrontOfficeRelationshipView } from '../components/FrontOfficeLeagueStandingCard';
import type { FrontOfficeOwnerView } from '../components/FrontOfficeOwnerCards';
import { useFrontOfficeRouteData } from './useFrontOfficeRouteData';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type HookOptions = Parameters<typeof useFrontOfficeRouteData>[0];
type HookResult = ReturnType<typeof useFrontOfficeRouteData>;

const owner: FrontOfficeOwnerView = {
  archetype: 'win_now',
  patience: 35,
  confidence: 72,
  hotSeat: true,
  summary: 'The owner demands results immediately.',
  expectations: { winsTarget: 95, playoffTarget: true, payrollTarget: 180_000_000 },
  satisfaction: 45,
  spendingWillingness: 80,
  winNowPressure: 90,
  meddlingLevel: 60,
  annualBudget: 200_000_000,
  payrollCap: 180_000_000,
  draftBonusPool: 8_000_000,
  ifaBonusPool: 5_000_000,
  staffBudget: 12_000_000,
};

const frontOffice: FrontOfficeReputationView = {
  reputation: 68,
  draftScore: 15,
  tradeScore: -5,
  freeAgencyScore: 22,
  playoffScore: 30,
  summary: 'A respected front office with strong draft acumen.',
};

const chemistry: TeamChemistry = {
  teamId: 'nym',
  score: 72,
  tier: 'connected',
  trend: 'rising',
  summary: 'Good vibes in the clubhouse.',
  reasons: ['Strong veteran leadership'],
};

const identity: FrontOfficeIdentityView = {
  assistantGM: {
    id: 'elena_vargas',
    name: 'Elena Vargas',
    focus: 'Elena improves development and international looks.',
    upside: 'Player development, international scouting, prospect trust',
    watchout: 'Homegrown prospect selloffs carry extra heat.',
  },
  scoutingDirector: {
    name: 'Avery Solis',
    focus: 'International',
    draftAccuracy: 0.71,
    internationalAccuracy: 0.82,
    proAccuracy: 0.7,
  },
  philosophy: {
    seasonGoal: 'Rebuild',
    developmentStyle: 'Patient',
    scoutingFocus: 'International',
    spendingStyle: 'Penny Pincher',
    tradeApproach: 'Seller',
    mediaTone: 'Measured',
  },
  alignment: {
    overall: { score: 72, impact: 3, label: 'strong', summary: 'Overall identity alignment is 72.' },
    mandate: { score: 76, impact: 3, label: 'strong', summary: 'Rebuild mandate is aligned.' },
    spending: { score: 68, impact: 2, label: 'steady', summary: 'Spending is coherent.' },
    trade: { score: 71, impact: 3, label: 'strong', summary: 'Trade posture is coherent.' },
    development: { score: 74, impact: 3, label: 'strong', summary: 'Development posture is coherent.' },
    media: { score: 69, impact: 2, label: 'steady', summary: 'Media posture is steady.' },
  },
  visibleEffects: [],
  recentConsequence: {
    headline: 'Day One identity is now on the ledger.',
    body: 'The scouting and development lanes are visible to the room.',
    timestamp: 'S1D1',
  },
};

const relationships: FrontOfficeRelationshipView[] = [
  {
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    score: 38,
    tier: 'friendly',
    tooltip: 'Boston Noreasters view you as a friendly trade partner.',
    lastInteractionSeason: 5,
    lastEventLabel: 'S5',
    latestMemoryDescription: 'a trade both sides could justify',
  },
];

const mentorship: FrontOfficeMentorshipView = {
  mentorCount: 2,
  protegeeCount: 3,
  leaders: [
    {
      playerId: 'leader-1',
      playerName: 'Elias Anchor',
      position: 'SS',
      role: 'Clubhouse captain',
      leadership: 96,
      score: 98,
      summary: 'Elias Anchor sets the room with 96 leadership.',
      traits: ['Leader', 'Mentor'],
    },
  ],
  conflictRisks: [],
  pairings: [
    {
      mentorId: 'mentor-1',
      protegeeId: 'protegee-1',
      mentorName: 'Elias Anchor',
      protegeeName: 'Milo Spark',
      quality: 88,
      compatibilityFactors: ['Shared traits: Leader.'],
      developmentBonus: 0.13,
    },
  ],
};

function HookHarness({
  options,
  onRender,
}: {
  options: HookOptions;
  onRender: (result: HookResult) => void;
}) {
  onRender(useFrontOfficeRouteData(options));
  return null;
}

describe('useFrontOfficeRouteData', () => {
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
    const getOwnerState = vi.fn().mockResolvedValue(owner);
    const getFrontOfficeState = vi.fn().mockResolvedValue(frontOffice);
    const getTeamChemistry = vi.fn().mockResolvedValue(chemistry);
    const getFrontOfficeIdentity = vi.fn().mockResolvedValue(identity);
    const getRelationships = vi.fn().mockResolvedValue(relationships);
    const getMentorships = vi.fn().mockResolvedValue(mentorship);

    return {
      getFrontOfficeIdentity,
      getFrontOfficeState,
      getMentorships,
      getOwnerState,
      getRelationships,
      getTeamChemistry,
      options: {
        day: 1,
        getFrontOfficeIdentity,
        getFrontOfficeState,
        getMentorships,
        getOwnerState,
        getRelationships,
        getTeamChemistry,
        isInitialized: true,
        phase: 'regular_season',
        season: 5,
        workerReady: true,
        ...overrides,
      } satisfies HookOptions,
    };
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

  it('waits without querying until game state and worker are ready', async () => {
    const {
      getFrontOfficeIdentity,
      getFrontOfficeState,
      getMentorships,
      getOwnerState,
      getRelationships,
      getTeamChemistry,
      options,
    } = makeOptions({ workerReady: false });

    const result = await renderHook(options);

    expect(getOwnerState).not.toHaveBeenCalled();
    expect(getFrontOfficeState).not.toHaveBeenCalled();
    expect(getTeamChemistry).not.toHaveBeenCalled();
    expect(getFrontOfficeIdentity).not.toHaveBeenCalled();
    expect(getRelationships).not.toHaveBeenCalled();
    expect(getMentorships).not.toHaveBeenCalled();
    expect(result.loading).toBe(true);
    expect(result.owner).toBeNull();
    expect(result.frontOffice).toBeNull();
    expect(result.chemistry).toBeNull();
    expect(result.identity).toBeNull();
    expect(result.relationships).toEqual([]);
    expect(result.mentorship).toBeNull();
  });

  it('loads all front-office route DTOs from existing worker queries', async () => {
    const {
      getFrontOfficeIdentity,
      getFrontOfficeState,
      getMentorships,
      getOwnerState,
      getRelationships,
      getTeamChemistry,
      options,
    } = makeOptions();

    const result = await renderHook(options);

    expect(getOwnerState).toHaveBeenCalledTimes(1);
    expect(getFrontOfficeState).toHaveBeenCalledTimes(1);
    expect(getTeamChemistry).toHaveBeenCalledTimes(1);
    expect(getFrontOfficeIdentity).toHaveBeenCalledTimes(1);
    expect(getRelationships).toHaveBeenCalledTimes(1);
    expect(getMentorships).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.owner).toBe(owner);
    expect(result.frontOffice).toBe(frontOffice);
    expect(result.chemistry).toBe(chemistry);
    expect(result.identity).toBe(identity);
    expect(result.relationships).toEqual(relationships);
    expect(result.mentorship).toBe(mentorship);
  });

  it('keeps safe empty values when optional worker payloads are unavailable', async () => {
    const { getRelationships, options } = makeOptions({
      getFrontOfficeState: vi.fn().mockResolvedValue(null),
      getMentorships: vi.fn().mockResolvedValue(null),
      getRelationships: vi.fn().mockResolvedValue(null),
    });

    const result = await renderHook(options);

    expect(getRelationships).not.toHaveBeenCalled();
    expect(options.getRelationships).toHaveBeenCalledTimes(1);
    expect(result.loading).toBe(false);
    expect(result.frontOffice).toBeNull();
    expect(result.relationships).toEqual([]);
    expect(result.mentorship).toBeNull();
  });

  it('refetches front-office route data when the game calendar changes', async () => {
    const {
      getFrontOfficeIdentity,
      getFrontOfficeState,
      getMentorships,
      getOwnerState,
      getRelationships,
      getTeamChemistry,
      options,
    } = makeOptions();

    await renderHook(options);
    await renderHook({ ...options, day: 2 });
    await renderHook({ ...options, day: 1, phase: 'offseason', season: 6 });

    expect(getOwnerState).toHaveBeenCalledTimes(3);
    expect(getFrontOfficeState).toHaveBeenCalledTimes(3);
    expect(getTeamChemistry).toHaveBeenCalledTimes(3);
    expect(getFrontOfficeIdentity).toHaveBeenCalledTimes(3);
    expect(getRelationships).toHaveBeenCalledTimes(3);
    expect(getMentorships).toHaveBeenCalledTimes(3);
  });
});
