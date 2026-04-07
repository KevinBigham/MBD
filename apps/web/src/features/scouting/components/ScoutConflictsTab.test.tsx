import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ScoutConflictsTab } from './ScoutConflictsTab';
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

const MOCK_CONFLICTS = [
  {
    prospectId: 'p1',
    headline: 'Is Rodriguez the real deal?',
    opinions: [
      { source: 'scout_director', overallGrade: 65, ceiling: 75, floor: 55, confidence: 80, summary: 'Plus bat speed and power projection.' },
      { source: 'analytics_head', overallGrade: 52, ceiling: 60, floor: 45, confidence: 90, summary: 'Swing metrics below elite threshold.' },
      { source: 'manager', overallGrade: 58, ceiling: 68, floor: 48, confidence: 60, summary: 'Looks the part but needs polish.' },
    ],
    divergence: 13,
    resolved: false,
    resolution: null,
    winningSource: null,
    outcomeSummary: null,
  },
  {
    prospectId: 'p2',
    headline: 'Smith pitching debate settled',
    opinions: [
      { source: 'scout_director', overallGrade: 45, ceiling: 55, floor: 35, confidence: 70, summary: 'Middle reliever ceiling.' },
      { source: 'analytics_head', overallGrade: 60, ceiling: 70, floor: 50, confidence: 85, summary: 'Elite spin rates project to starter role.' },
      { source: 'manager', overallGrade: 50, ceiling: 58, floor: 42, confidence: 65, summary: 'Decent arm, inconsistent command.' },
    ],
    divergence: 15,
    resolved: true,
    resolution: { season: 4, actualGrade: 62, closestSource: 'analytics_head' },
    winningSource: 'analytics_head',
    outcomeSummary: 'Analytics nailed it. Smith became a solid #3 starter.',
  },
];

describe('ScoutConflictsTab', () => {
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

  it('renders conflicts with three-column opinions', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScoutConflicts: vi.fn().mockResolvedValue(MOCK_CONFLICTS),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScoutConflictsTab />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    // Conflict headlines
    expect(container.textContent).toContain('Is Rodriguez the real deal?');
    expect(container.textContent).toContain('Smith pitching debate settled');

    // Opinion sources
    expect(container.textContent).toContain('Scout Director');
    expect(container.textContent).toContain('Analytics');
    expect(container.textContent).toContain('Manager');

    // Grades
    expect(container.textContent).toContain('65');
    expect(container.textContent).toContain('52');
    expect(container.textContent).toContain('58');

    // Divergence
    expect(container.textContent).toContain('DIVIDED');
    expect(container.textContent).toContain('Gap: 13');

    // Resolution
    expect(container.textContent).toContain('VINDICATED');
    expect(container.textContent).toContain('Resolved - Season 4');
    expect(container.textContent).toContain('Actual Grade: 62');
    expect(container.textContent).toContain('Analytics nailed it');
  });

  it('shows empty state when no conflicts', async () => {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getScoutConflicts: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter>
          <ScoutConflictsTab />
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('No scout conflicts');
  });
});
