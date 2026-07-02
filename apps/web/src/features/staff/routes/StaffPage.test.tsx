import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import StaffPage from './StaffPage';
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

describe('StaffPage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 1,
      phase: 'offseason',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 162,
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

  it('renders staff overview and lets the user hire and fire coaches', async () => {
    const hireCoach = vi.fn().mockResolvedValue({ success: true });
    const fireCoach = vi.fn().mockResolvedValue({ success: true });

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getCoachingStaff: vi.fn().mockResolvedValue([
        {
          id: 'coach-1',
          firstName: 'Ruben',
          lastName: 'Serrano',
          role: 'hitting_coach',
          specialty: 'contact',
          teachingAbility: 0.83,
          developmentBonus: 0.14,
          personalityFit: 0.75,
          annualSalary: 2.3,
        },
      ]),
      getCoachMarket: vi.fn().mockResolvedValue([
        {
          id: 'coach-2',
          firstName: 'Nate',
          lastName: 'Braddock',
          role: 'hitting_coach',
          specialty: 'power',
          teachingAbility: 0.79,
          developmentBonus: 0.18,
          personalityFit: 0.71,
          annualSalary: 2.6,
        },
      ]),
      getCoachingImpact: vi.fn().mockResolvedValue([
        {
          id: 'coach-1',
          role: 'hitting_coach',
          name: 'Ruben Serrano',
          specialty: 'contact',
          teachingAbility: 0.83,
          developmentBonus: 0.14,
          personalityFit: 0.75,
        },
      ]),
      getStaffBudget: vi.fn().mockResolvedValue({
        payroll: 11.2,
        budget: 13.4,
        remaining: 2.2,
      }),
      hireCoach,
      fireCoach,
      getCoachingChemistry: vi.fn().mockResolvedValue({
        harmony: { overallScore: 72, synergies: [], weakestLink: null, strongestBond: null },
        issues: [],
        playerAffinities: [],
        coaches: [],
      }),
      getMentorships: vi.fn().mockResolvedValue({
        mentorCount: 0,
        protegeeCount: 0,
        pairings: [],
      }),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Staff Overview');
    expect(container.textContent).toContain('Ruben Serrano');
    expect(container.textContent).toContain('Budget');

    const marketTab = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Market'),
    );

    await act(async () => {
      marketTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Nate Braddock');

    const hireButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Hire'),
    );
    const fireButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Fire'),
    );

    await act(async () => {
      fireButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      hireButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(fireCoach).toHaveBeenCalledWith('coach-1');
    expect(hireCoach).toHaveBeenCalledWith('coach-2');
  });

  it('renders clubhouse mentorship pairings from the staff route worker query', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getCoachingStaff: vi.fn().mockResolvedValue([]),
      getCoachMarket: vi.fn().mockResolvedValue([]),
      getCoachingImpact: vi.fn().mockResolvedValue([]),
      getStaffBudget: vi.fn().mockResolvedValue({
        payroll: 9.1,
        budget: 12.4,
        remaining: 3.3,
      }),
      getCoachingChemistry: vi.fn().mockResolvedValue({
        harmony: { overallScore: 76, synergies: [], weakestLink: null, strongestBond: null },
        issues: [],
        playerAffinities: [],
        coaches: [],
      }),
      getMentorships: vi.fn().mockResolvedValue({
        mentorCount: 2,
        protegeeCount: 3,
        pairings: [
          {
            mentorId: 'mentor-1',
            protegeeId: 'protegee-1',
            mentorName: 'Elias Anchor',
            protegeeName: 'Milo Spark',
            quality: 88,
            developmentBonus: 0.13,
            compatibilityFactors: ['Shared traits: Leader.', 'Same team context.'],
          },
        ],
      }),
      hireCoach: vi.fn(),
      fireCoach: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Clubhouse Mentorship');
    expect(container.textContent).toContain('Elias Anchor');
    expect(container.textContent).toContain('Milo Spark');
    expect(container.textContent).toContain('88 quality');
    expect(container.textContent).toContain('13% lift');
    expect(container.textContent).toContain('Same team context.');
  });

  it('renders clubhouse leaders and conflict risks from mentorship intelligence', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getCoachingStaff: vi.fn().mockResolvedValue([]),
      getCoachMarket: vi.fn().mockResolvedValue([]),
      getCoachingImpact: vi.fn().mockResolvedValue([]),
      getStaffBudget: vi.fn().mockResolvedValue({
        payroll: 9.1,
        budget: 12.4,
        remaining: 3.3,
      }),
      getCoachingChemistry: vi.fn().mockResolvedValue({
        harmony: { overallScore: 61, synergies: [], weakestLink: null, strongestBond: null },
        issues: [],
        playerAffinities: [],
        coaches: [],
      }),
      getMentorships: vi.fn().mockResolvedValue({
        mentorCount: 2,
        protegeeCount: 3,
        pairings: [],
        leaders: [
          {
            playerId: 'leader-1',
            playerName: 'Elias Anchor',
            position: 'SS',
            role: 'Clubhouse captain',
            leadership: 96,
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
            reason: 'Rico Flash brings 97 competitiveness with low leadership support.',
            mitigation: 'Pair with a veteran leader before role changes.',
          },
        ],
      }),
      hireCoach: vi.fn(),
      fireCoach: vi.fn(),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <StaffPage />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Clubhouse Leaders');
    expect(container.textContent).toContain('Elias Anchor');
    expect(container.textContent).toContain('Clubhouse captain');
    expect(container.textContent).toContain('96 leadership');
    expect(container.textContent).toContain('Conflict Watch');
    expect(container.textContent).toContain('Rico Flash');
    expect(container.textContent).toContain('high');
    expect(container.textContent).toContain('Pair with a veteran leader before role changes.');
  });
});
