import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MinorsPage from './MinorsPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/hooks/useActiveSaveAutosave', () => ({
  useActiveSaveAutosave: vi.fn(),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedUseActiveSaveAutosave = vi.mocked(useActiveSaveAutosave);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('MinorsPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let autosaveActiveGame: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    autosaveActiveGame = vi.fn().mockResolvedValue({ saved: true });
    mockedUseActiveSaveAutosave.mockReturnValue(autosaveActiveGame);

    mockedUseGameStore.mockReturnValue({
      season: 5,
      day: 92,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 91,
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

  it('renders the farm report alongside affiliate results', async () => {
    const applyDevelopmentFocusPlan = vi.fn().mockResolvedValue({ success: true, developmentProgram: 'mlb_prep' });
    const getProspectPipeline = vi.fn().mockResolvedValue({
      health: {
        score: 78,
        label: 'surging',
        readyNow: 1,
        nextWave: 2,
        longTerm: 1,
        organizationalDepth: 0,
      },
      developmentFocus: {
        summary: '1 promotion window, 1 recalibration, and 1 long-runway priority need attention.',
        priorities: [
          {
            playerId: 'prospect-1',
            playerName: 'Marco Ascension',
            level: 'AAA',
            category: 'promotion_window',
            label: 'Promotion Window',
            action: 'Evaluate MLB fit during the next roster checkpoint.',
            reason: 'Ready-now AAA performance is forcing a big-league decision.',
            evidence: ['.322 AVG · 82 H · 14 HR · 48 RBI'],
          },
          {
            playerId: 'prospect-2',
            playerName: 'Jules Caldera',
            level: 'AA',
            category: 'recalibrate_plan',
            label: 'Recalibrate Plan',
            action: 'Reset the current development plan before the next checkpoint.',
            reason: 'Below expectations trend with swing-decision risk.',
            evidence: ['Tighten swing decisions before pushing to AAA.'],
          },
        ],
      },
      prospects: [
        {
          playerId: 'prospect-1',
          playerName: 'Marco Ascension',
          position: 'SS',
          level: 'AAA',
          age: 22,
          overallRating: 61,
          ceiling: 74,
          prospectTier: 'ready_depth',
          bondStrength: 42,
          eta: 'Ready now',
          trend: 'surging',
          latestLineSummary: '.322 AVG · 82 H · 14 HR · 48 RBI',
          activeSetback: null,
          milestones: ['Drafted Round 1, 3'],
        },
      ],
    });
    mockedUseWorker.mockReturnValue({
      isReady: true,
      applyDevelopmentFocusPlan,
      getAffiliateOverview: vi.fn().mockResolvedValue({
        affiliates: [
          {
            level: 'AAA',
            label: 'AAA',
            wins: 48,
            losses: 32,
            gamesPlayed: 80,
            runDifferential: 37,
            topPerformer: {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              statLine: '.322 AVG · 14 HR',
            },
          },
        ],
        recentBoxScores: [
          {
            id: 'box-1',
            day: 92,
            level: 'AAA',
            label: 'AAA',
            result: 'W',
            scoreline: '6-3 vs BOS',
            summary: 'The lineup controlled the zone all night.',
          },
        ],
        waiverClaims: [],
        farmReport: {
          bondedProspects: 4,
          activeSetbackCount: 1,
          breakoutCandidates: [
            {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              summary: 'Dark horse Marco Ascension could be next in line for a callup.',
            },
          ],
          topProspects: [
            {
              playerId: 'prospect-1',
              playerName: 'Marco Ascension',
              position: 'SS',
              level: 'AAA',
              levelLabel: 'AAA',
              overallRating: 61,
              ceiling: 74,
              bondStrength: 42,
              loyaltyModifier: 0.42,
              milestones: ['Drafted Round 1, 3', 'Promoted to AAA, 5'],
              latestLineSummary: '.322 AVG · 82 H · 14 HR · 48 RBI',
              activeSetback: {
                type: 'hot_streak',
                summary: 'Marco Ascension is tearing through upper-level pitching.',
                endMonth: 5,
                endSeason: 5,
              },
            },
          ],
        },
      }),
      getAffiliateBoxScore: vi.fn().mockResolvedValue({
        id: 'box-1',
        season: 5,
        day: 92,
        level: 'AAA',
        label: 'AAA',
        homeTeamName: 'Tycoons',
        awayTeamName: "Noreasters",
        homeScore: 6,
        awayScore: 3,
        summary: 'The lineup controlled the zone all night.',
        notablePlayers: [
          {
            playerId: 'prospect-1',
            playerName: 'Marco Ascension',
            position: 'SS',
          },
        ],
      }),
      getProspectPipeline,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<MinorsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Minor League Hub');
    expect(container.textContent).toContain('Farm report');
    expect(container.textContent).toContain('Pipeline Health');
    expect(container.textContent).toContain('Surging');
    expect(container.textContent).toContain('Ready now');
    expect(container.textContent).toContain('Development Focus');
    expect(container.textContent).toContain('Promotion Window');
    expect(container.textContent).toContain('Evaluate MLB fit');
    expect(container.textContent).toContain('Recalibrate Plan');
    expect(container.textContent).toContain('Tighten swing decisions');
    expect(container.textContent).toContain('bonded prospects');
    expect(container.textContent).toContain('Breakout candidates');
    expect(container.textContent).toContain('could be next in line for a callup');
    expect(container.textContent).toContain('Marco Ascension');
    expect(container.textContent).toContain('Bond 42');
    expect(container.textContent).toContain('tearing through upper-level pitching');
    expect(container.textContent).toContain('Recent affiliate results');
    expect(container.textContent).toContain('Selected box score');

    const applyPlanButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Apply plan');
    expect(applyPlanButton).toBeDefined();

    await act(async () => {
      applyPlanButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(applyDevelopmentFocusPlan).toHaveBeenCalledWith('prospect-1', 'promotion_window');
    expect(getProspectPipeline).toHaveBeenCalledTimes(2);
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(container.textContent).toContain('Marco Ascension: mlb prep plan applied.');
  });

  it('withholds durable success copy when the applied plan remains unsaved', async () => {
    autosaveActiveGame.mockResolvedValue({ saved: false });
    const applyDevelopmentFocusPlan = vi.fn().mockResolvedValue({
      success: true,
      developmentProgram: 'mlb_prep',
    });
    const getProspectPipeline = vi.fn().mockResolvedValue({
      health: {
        score: 78,
        label: 'surging',
        readyNow: 1,
        nextWave: 0,
        longTerm: 0,
        organizationalDepth: 0,
      },
      developmentFocus: {
        summary: '1 promotion window needs attention.',
        priorities: [{
          playerId: 'prospect-1',
          playerName: 'Marco Ascension',
          level: 'AAA',
          category: 'promotion_window',
          label: 'Promotion Window',
          action: 'Evaluate MLB fit.',
          reason: 'Ready-now AAA performance.',
          evidence: ['.322 AVG'],
        }],
      },
      prospects: [],
    });
    mockedUseWorker.mockReturnValue({
      isReady: true,
      applyDevelopmentFocusPlan,
      getAffiliateOverview: vi.fn().mockResolvedValue({
        affiliates: [],
        recentBoxScores: [],
        waiverClaims: [],
        farmReport: {
          bondedProspects: 0,
          activeSetbackCount: 0,
          breakoutCandidates: [],
          topProspects: [],
        },
      }),
      getAffiliateBoxScore: vi.fn().mockResolvedValue(null),
      getProspectPipeline,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<MinorsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const applyPlanButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Apply plan');
    expect(applyPlanButton).toBeDefined();

    await act(async () => {
      applyPlanButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(applyDevelopmentFocusPlan).toHaveBeenCalledWith('prospect-1', 'promotion_window');
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(getProspectPipeline).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain(
      'The development plan changed in memory. Save status is the authority for durability.',
    );
    expect(container.textContent).not.toContain('plan applied.');
    expect(applyPlanButton?.disabled).toBe(false);
  });

  it('persists an applied plan before the overview refresh, even when the refresh rejects', async () => {
    const applyDevelopmentFocusPlan = vi.fn().mockResolvedValue({ success: true, developmentProgram: 'mlb_prep' });
    const order: string[] = [];
    autosaveActiveGame.mockImplementation(async () => {
      order.push('autosave');
      return { saved: true };
    });
    const pipeline = {
      health: { score: 78, label: 'surging', readyNow: 1, nextWave: 0, longTerm: 0, organizationalDepth: 0 },
      developmentFocus: {
        summary: '1 promotion window needs attention.',
        priorities: [
          {
            playerId: 'prospect-1',
            playerName: 'Marco Ascension',
            level: 'AAA',
            category: 'promotion_window',
            label: 'Promotion Window',
            action: 'Evaluate MLB fit.',
            reason: 'Ready-now AAA performance.',
            evidence: ['.322 AVG'],
          },
        ],
      },
      prospects: [],
    };
    const getProspectPipeline = vi.fn()
      .mockResolvedValueOnce(pipeline)
      .mockImplementation(async () => {
        order.push('refresh');
        throw new Error('overview refresh offline');
      });
    mockedUseWorker.mockReturnValue({
      isReady: true,
      applyDevelopmentFocusPlan,
      getAffiliateOverview: vi.fn().mockResolvedValue({
        affiliates: [],
        recentBoxScores: [],
        waiverClaims: [],
        farmReport: { bondedProspects: 0, activeSetbackCount: 0, breakoutCandidates: [], topProspects: [] },
      }),
      getAffiliateBoxScore: vi.fn().mockResolvedValue(null),
      getProspectPipeline,
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(<MinorsPage />);
      await Promise.resolve();
      await Promise.resolve();
    });

    const applyPlanButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent === 'Apply plan');
    expect(applyPlanButton).toBeDefined();

    await act(async () => {
      applyPlanButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    // The applied plan was persisted before the refresh that later rejected.
    expect(autosaveActiveGame).toHaveBeenCalledWith({ season: 5 });
    expect(order).toEqual(['autosave', 'refresh']);
    expect(container.textContent).toContain('Marco Ascension: mlb prep plan applied.');
  });
});
