import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import FrontOfficePage from './FrontOfficePage';
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

const MOCK_OWNER = {
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

const MOCK_FO = {
  reputation: 68,
  draftScore: 15,
  tradeScore: -5,
  freeAgencyScore: 22,
  playoffScore: 30,
  summary: 'A respected front office with strong draft acumen.',
};

const MOCK_CHEMISTRY = {
  score: 72,
  tier: 'connected',
  trend: 'improving',
  summary: 'Good vibes in the clubhouse.',
  reasons: ['Strong veteran leadership', 'Winning streak boosts morale'],
};

const MOCK_RELATIONSHIPS = [
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
  {
    teamId: 'sea',
    teamName: 'Seattle Drizzle',
    teamAbbreviation: 'SEA',
    score: -22,
    tier: 'neutral',
    tooltip: 'Seattle Drizzle hold a neutral stance toward your front office.',
    lastInteractionSeason: 4,
    lastEventLabel: 'S4',
    latestMemoryDescription: 'a trade you clearly won',
  },
];

const MOCK_MENTORSHIP = {
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
  conflictRisks: [
    {
      playerId: 'risk-1',
      playerName: 'Rico Flash',
      position: 'CF',
      severity: 'high',
      riskScore: 84,
      reason: 'Rico Flash brings elite competitiveness with low leadership support.',
      mitigation: 'Pair with a veteran leader before role changes.',
    },
  ],
  pairings: [
    {
      mentorId: 'mentor-1',
      protegeeId: 'protegee-1',
      mentorName: 'Elias Anchor',
      protegeeName: 'Milo Spark',
      quality: 88,
      compatibilityFactors: ['Shared traits: Leader.', 'Same team context.'],
      developmentBonus: 0.13,
    },
  ],
};

const MOCK_IDENTITY = {
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

describe('FrontOfficePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 1,
      phase: 'regular_season',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Kevin Bigham',
      playerCount: 780,
      gamesPlayed: 0,
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
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders owner profile, reputation, chemistry, and budget', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getOwnerState: vi.fn().mockResolvedValue(MOCK_OWNER),
      getFrontOfficeState: vi.fn().mockResolvedValue(MOCK_FO),
      getTeamChemistry: vi.fn().mockResolvedValue(MOCK_CHEMISTRY),
      getFrontOfficeIdentity: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      getRelationships: vi.fn().mockResolvedValue(MOCK_RELATIONSHIPS),
      getMentorships: vi.fn().mockResolvedValue(MOCK_MENTORSHIP),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FrontOfficePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Owner Intel');

    // Owner
    expect(container.textContent).toContain('HOT SEAT');
    expect(container.textContent).toContain('Win Now');
    expect(container.textContent).toContain('95+');
    expect(container.textContent).toContain('demands results');

    // Reputation
    expect(container.textContent).toContain('68');
    expect(container.textContent).toContain('Front Office Reputation');
    expect(container.textContent).toContain('+15');
    expect(container.textContent).toContain('-5');

    // Chemistry
    expect(container.textContent).toContain('Clubhouse Chemistry');
    expect(container.textContent).toContain('connected');
    expect(container.textContent).toContain('Strong veteran leadership');

    // Identity
    expect(container.textContent).toContain('Front Office Identity');
    expect(container.textContent).toContain('Elena Vargas');
    expect(container.textContent).toContain('Overall Alignment');
    expect(container.textContent).toContain('Rebuild');
    expect(container.textContent).toContain('International');
    expect(container.textContent).toContain('Day One identity is now on the ledger.');

    // Budget
    expect(container.textContent).toContain('$200.0M');
    expect(container.textContent).toContain('$180.0M');
    expect(container.textContent).toContain('League Standing');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Friendly');
  });

  it('renders a front-office clubhouse web summary from mentorship intelligence', async () => {
    const getMentorships = vi.fn().mockResolvedValue(MOCK_MENTORSHIP);
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getOwnerState: vi.fn().mockResolvedValue(MOCK_OWNER),
      getFrontOfficeState: vi.fn().mockResolvedValue(MOCK_FO),
      getTeamChemistry: vi.fn().mockResolvedValue(MOCK_CHEMISTRY),
      getFrontOfficeIdentity: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      getRelationships: vi.fn().mockResolvedValue(MOCK_RELATIONSHIPS),
      getMentorships,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FrontOfficePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(getMentorships).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Clubhouse Web');
    expect(container.textContent).toContain('Mentor Lane');
    expect(container.textContent).toContain('Elias Anchor');
    expect(container.textContent).toContain('mentoring Milo Spark');
    expect(container.textContent).toContain('13% lift');
    expect(container.textContent).toContain('Room Captain');
    expect(container.textContent).toContain('Conflict Watch');
    expect(container.textContent).toContain('Rico Flash');
    expect(container.textContent).toContain('Pair with a veteran leader before role changes.');
  });

  it('renders without hot seat when not on hot seat', async () => {
    const calmOwner = { ...MOCK_OWNER, hotSeat: false };

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getOwnerState: vi.fn().mockResolvedValue(calmOwner),
      getFrontOfficeState: vi.fn().mockResolvedValue(MOCK_FO),
      getTeamChemistry: vi.fn().mockResolvedValue(MOCK_CHEMISTRY),
      getFrontOfficeIdentity: vi.fn().mockResolvedValue(MOCK_IDENTITY),
      getRelationships: vi.fn().mockResolvedValue(MOCK_RELATIONSHIPS),
      getMentorships: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <FrontOfficePage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain('HOT SEAT');
  });
});
