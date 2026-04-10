import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlayerProfilePage from './PlayerProfilePage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { PlayerProfileView } from '../components/playerProfileShared';

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

function createProfileView(overrides: Partial<PlayerProfileView> = {}): PlayerProfileView {
  return {
    player: {
      id: 'player-1',
      firstName: 'Marco',
      lastName: 'Ascension',
      age: 23,
      position: 'SS',
      overallRating: 67,
      displayRating: 58,
      letterGrade: 'B',
      rosterStatus: 'AA',
      teamId: 'nym',
      serviceTimeDays: 86,
      optionYearsUsed: 0,
      isOutOfOptions: false,
      minorLeagueLevel: 'AA',
      ceiling: 72,
      floor: 55,
      developmentProgram: 'mlb_prep',
      developmentTrajectory: 'ahead_of_curve',
      personalityTraits: ['Leader', 'Fan Favorite'],
      contract: {
        years: 1,
        annualSalary: 2.4,
        totalValue: 2.4,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
      extensionHistory: [{
        season: 4,
        teamId: 'nym',
        years: 6,
        annualSalary: 18.2,
        totalValue: 109.2,
        outcome: 'accepted',
      }],
      stats: {
        pa: 255,
        ab: 221,
        hits: 82,
        doubles: 21,
        triples: 3,
        hr: 14,
        rbi: 48,
        bb: 31,
        k: 57,
        runs: 44,
        hbp: 2,
        sacFlies: 4,
        avg: '.322',
        ip: 0,
        earnedRuns: 0,
        strikeouts: 0,
        walks: 0,
        hitsAllowed: 0,
        homeRunsAllowed: 0,
        hitBatters: 0,
        flyBallsAllowed: 0,
        wins: 0,
        losses: 0,
        era: '0.00',
      },
      advanced: {
        war: 4.8,
        woba: 0.378,
        wrcPlus: 142,
        opsPlus: 137,
        iso: 0.224,
        fip: null,
        xfip: null,
        whip: null,
        kPer9: null,
        bbPer9: null,
        kBb: null,
      },
      historical: false,
      historicalSummary: null,
      activeStory: {
        arcType: 'prospect_rise',
        phase: 'rising',
        startSeason: 5,
        startDay: 62,
        latestMilestone: 'Marco Ascension is climbing fast through the system.',
      },
      storyHistory: [{
        arcType: 'rookie_sensation',
        phase: 'resolution',
        startSeason: 4,
        startDay: 33,
        resolvedSeason: 4,
        milestones: ['Marco Ascension finished a rookie_sensation with a defining turn.'],
      }],
    },
    personalityProfile: {
      playerId: 'player-1',
      archetype: 'clubhouse_engine',
      morale: {
        score: 66,
        trend: 'rising',
        summary: 'Responding well to the current program.',
        lastUpdated: 'S5D92',
      },
      personality: {
        workEthic: 71,
        mentalToughness: 64,
        leadership: 57,
        competitiveness: 69,
      },
      summary: 'High-motor infielder with strong internal drive.',
    },
    developmentReports: {
      playerId: 'player-1',
      history: [{
        season: 5,
        month: 4,
        trajectory: 'ahead_of_curve',
        summary: 'Improved first-step reads and contact quality.',
        overallRating: 345,
      }],
      recommendations: [{
        playerId: 'player-1',
        teamId: 'nym',
        fromPosition: 'SS',
        toPosition: '2B',
        confidence: 0.72,
        reason: 'Double-play turns project as a plus fit.',
      }],
      minorLeagueProgression: [{
        season: 4,
        level: 'AA',
        gamesPlayed: 61,
        pa: 255,
        hits: 82,
        hr: 14,
        rbi: 48,
        avg: 0.322,
        ip: 0,
        era: 0,
        k: 0,
        bb: 31,
      }],
      prospectBond: {
        prospectId: 'player-1',
        draftedSeason: 3,
        debutSeason: null,
        currentLevel: 'AA',
        bondStrength: 34,
        milestones: ['Drafted Round 1, 3', 'Promoted to AA, 5'],
        loyaltyModifier: 0.34,
      },
      activeSetback: {
        type: 'hot_streak',
        overallModifier: 6,
        startSeason: 5,
        startMonth: 4,
        endSeason: 5,
        endMonth: 5,
        summary: 'Marco Ascension is tearing through upper-level pitching.',
        active: true,
      },
      debutFlashback: {
        playerId: 'player-1',
        playerName: 'Marco Ascension',
        draftSeason: 3,
        draftRound: 1,
        originalGrade: 64,
        debutSeason: 5,
        debutOverall: 58,
        journeyHighlights: ['Drafted Round 1, 3', 'Promoted to AAA, 5'],
      },
    },
    careerStats: {
      playerId: 'player-1',
      playerName: 'Marco Ascension',
      position: 'SS',
      seasonsPlayed: 3,
      teamIds: ['nym'],
      peakOverall: 63,
      championshipRings: 0,
      allStarSelections: 0,
      gamesPlayed: 190,
      saves: 0,
      war: 6.2,
      batting: {
        hits: 205,
        hr: 32,
        rbi: 121,
      },
      pitching: null,
    },
    scoutConflict: {
      prospectId: 'player-1',
      teamId: 'nym',
      prospectType: 'draft',
      createdSeason: 5,
      resolutionSeason: 7,
      resolved: false,
      headline: 'Director and analytics disagree on Marco Ascension.',
      opinions: [
        {
          source: 'scout_director',
          overallGrade: 63,
          ceiling: 71,
          floor: 55,
          confidence: 13,
          summary: 'Director believes the bat is ahead of schedule.',
        },
        {
          source: 'analytics_head',
          overallGrade: 57,
          ceiling: 64,
          floor: 51,
          confidence: 12,
          summary: 'Analytical models are less convinced by the contact quality.',
        },
        {
          source: 'manager',
          overallGrade: 60,
          ceiling: 68,
          floor: 54,
          confidence: 11,
          summary: 'Manager sees a player who is still learning situational pacing.',
        },
      ],
      divergence: 6,
      debateGenerated: true,
      resolution: null,
      winningSource: null,
      outcomeSummary: null,
    },
    scoutingReport: null,
    scoutingHistoryNote: 'Scouting report history is not tracked in v15.',
    ...overrides,
  };
}

describe('PlayerProfilePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

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
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      setSeason: vi.fn(),
      setDay: vi.fn(),
      setPhase: vi.fn(),
      setSimulating: vi.fn(),
      setInitialized: vi.fn(),
      setUserTeamId: vi.fn(),
      setActiveSave: vi.fn(),
      setActiveSaveSlot: vi.fn(),
      updateFromSim: vi.fn(),
      initializeGame: vi.fn(),
      gmName: 'Alex Rivera',
      difficulty: 'standard',
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPage(initialEntry: string, profileView: PlayerProfileView) {
    mockedUseWorker.mockReturnValue({
      isReady: true,
      getPlayerProfileView: vi.fn().mockResolvedValue(profileView),
      getExtensionOffer: vi.fn().mockResolvedValue({
        years: 5,
        annualSalary: 18.2,
        totalValue: 91,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      }),
      negotiateExtension: vi.fn().mockResolvedValue({
        status: 'accepted',
        rounds: [],
      }),
      promotePlayer: vi.fn().mockResolvedValue({ success: true }),
      demotePlayer: vi.fn().mockResolvedValue({ success: true }),
      designateForAssignment: vi.fn().mockResolvedValue({ success: true }),
      getSeasonProjections: vi.fn().mockResolvedValue(null),
      getPlayerSimilarity: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter key={initialEntry} initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/players/:playerId" element={<PlayerProfilePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await settleUi();
  }

  async function settleUi() {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });
  }

  it('renders the search-param-driven tabbed player dossier', async () => {
    await renderPage('/players/player-1', createProfileView());

    expect(container.textContent).toContain('Season Stats');
    expect(container.textContent).toContain('Career Totals');
    expect(container.textContent).toContain('Split data is not tracked in v15.');
    expect(container.textContent).toContain('Trade Player');

    await renderPage('/players/player-1?tab=development', createProfileView());

    expect(container.textContent).toContain('Checkpoint History');
    expect(container.textContent).toContain('Improved first-step reads and contact quality.');
    expect(container.textContent).toContain('Debut Flashback');
    expect(container.textContent).toContain('Original grade 64 to debut overall 58.');

    await renderPage('/players/player-1?tab=scouting', createProfileView());

    expect(container.textContent).toContain('Scout Conflict');
    expect(container.textContent).toContain('Director and analytics disagree on Marco Ascension.');
    expect(container.textContent).toContain('Director believes the bat is ahead of schedule.');

    await renderPage('/players/player-1?tab=history', createProfileView());

    expect(container.textContent).toContain('Story Arc');
    expect(container.textContent).toContain('Extension History');
    expect(container.textContent).toContain('$18.2M');

    await renderPage('/players/player-1?tab=personality', createProfileView());

    expect(container.textContent).toContain('Personality Profile');
    expect(container.textContent).toContain('Leader');
    expect(container.textContent).toContain('Fan Favorite');
  });

  it('renders a read-only historical fallback and scouting availability note for retired players', async () => {
    const historicalView = createProfileView({
      player: {
        ...createProfileView().player!,
        id: 'historic-1',
        firstName: 'Derek',
        lastName: 'Legacy',
        rosterStatus: 'RETIRED',
        historical: true,
        activeStory: null,
        storyHistory: [],
        historicalSummary: {
          playerId: 'historic-1',
          fullName: 'Derek Legacy',
          position: 'SS',
          lastKnownTeamId: 'nym',
          active: false,
          retiredSeason: 4,
          seasonsPlayed: 16,
          personalityTraits: ['Leader', 'Fan Favorite'],
        },
      },
      personalityProfile: null,
      developmentReports: null,
      scoutConflict: null,
      scoutingReport: null,
    });

    await renderPage('/players/historic-1?tab=history', historicalView);

    expect(container.textContent).toContain('Historical Profile');
    expect(container.textContent).toContain('Retired after Season 4');
    expect(container.textContent).toContain('Leader');

    await renderPage('/players/historic-1?tab=scouting', historicalView);

    expect(container.textContent).toContain('Historical scouting snapshots are not tracked in v15.');
  });

  it('runs the five-year extension quick action from the sidebar', async () => {
    const worker = {
      isReady: true,
      getPlayerProfileView: vi.fn().mockResolvedValue(createProfileView({
        player: {
          ...createProfileView().player!,
          rosterStatus: 'MLB',
          minorLeagueLevel: null,
        },
      })),
      getExtensionOffer: vi.fn().mockResolvedValue({
        years: 5,
        annualSalary: 18.2,
        totalValue: 91,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      }),
      negotiateExtension: vi.fn().mockResolvedValue({
        status: 'accepted',
        rounds: [],
      }),
      promotePlayer: vi.fn().mockResolvedValue({ success: true }),
      demotePlayer: vi.fn().mockResolvedValue({ success: true }),
      designateForAssignment: vi.fn().mockResolvedValue({ success: true }),
    };

    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/players/player-1']}>
          <Routes>
            <Route path="/players/:playerId" element={<PlayerProfilePage />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    await settleUi();

    const extendButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Extend Contract'));
    expect(extendButton).toBeTruthy();

    await act(async () => {
      extendButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.getExtensionOffer).toHaveBeenCalledWith('player-1', 5);
    expect(worker.negotiateExtension).toHaveBeenCalled();
    expect(container.textContent).toContain('Extension accepted');
    expect(container.querySelector('a[href="/trade?playerId=player-1"]')).toBeTruthy();
  });
});
