import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TradePage from './TradePage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { loadGameById, saveGameById, scheduleAutoSave } from '@/shared/lib/saveSystem';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('@/shared/lib/saveSystem', () => ({
  loadGameById: vi.fn().mockResolvedValue(undefined),
  saveGameById: vi.fn().mockResolvedValue(undefined),
  scheduleAutoSave: vi.fn().mockResolvedValue(undefined),
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);
const mockedLoadGameById = vi.mocked(loadGameById);
const mockedSaveGameById = vi.mocked(saveGameById);
const mockedScheduleAutoSave = vi.mocked(scheduleAutoSave);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createNegotiationView() {
  return {
    id: 'neg-open',
    teamId: 'bos',
    teamName: 'Boston Noreasters',
    teamAbbreviation: 'BOS',
    phase: 'counter_1',
    roundsCompleted: 2,
    expiresAtDay: 101,
    dialogue: [
      { speaker: 'rival_gm', text: 'Boston left the counter on the table overnight.', tone: 'firm' },
      { speaker: 'agm_advisor', text: 'This is still close enough to keep alive if the package stays focused.', tone: 'firm' },
    ],
    proposal: {
      offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
      requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
    },
    counterOffer: {
      offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
      requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
    },
    isComplete: false,
    canAccept: true,
    canCounter: true,
    canReject: true,
  };
}

function createWorkerMock() {
  const gmDialogue = {
    mode: 'buyer' as const,
    urgency: 'high' as const,
    headline: 'Boston Noreasters bring a live deadline call',
    lines: [
      'We are buying wins, not moving bodies for the sake of motion.',
      'The model is simple: match the surplus value and we can keep talking.',
      'Right now the offer is light for what you are asking us to surrender.',
    ],
  };
  const userPlayer = {
    id: 'nyy-1',
    firstName: 'Anthony',
    lastName: 'Volpe',
    age: 24,
    position: 'SS',
    overallRating: 72,
    displayRating: 72,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'nym',
    stats: null,
  };
  const partnerPlayer = {
    id: 'bos-1',
    firstName: 'Roman',
    lastName: 'Anthony',
    age: 22,
    position: 'CF',
    overallRating: 74,
    displayRating: 74,
    letterGrade: 'A',
    rosterStatus: 'MLB',
    teamId: 'bos',
    stats: null,
  };
  const thirdTeamPlayer = {
    id: 'sea-1',
    firstName: 'Cole',
    lastName: 'Young',
    age: 23,
    position: '2B',
    overallRating: 69,
    displayRating: 69,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId: 'sea',
    stats: null,
  };

  return {
    isReady: true,
    getTeamRoster: vi.fn().mockImplementation(async (teamId: string) => {
      if (teamId === 'nym') {
        return [userPlayer];
      }
      if (teamId === 'sea') {
        return [thirdTeamPlayer];
      }
      return [partnerPlayer];
    }),
    getTradeOffers: vi.fn().mockResolvedValue([
      {
        id: 'offer-1',
        fromTeamId: 'bos',
        fromTeamName: 'Boston Noreasters',
        fromTeamAbbreviation: 'BOS',
        toTeamId: 'nym',
        toTeamName: 'New York Tycoons',
        toTeamAbbreviation: 'NYT',
        fairnessScore: -6,
        message: 'The Boston Noreasters want to discuss a trade.',
        createdAt: 'S4D95',
        offeringAssets: [
          {
            key: 'player:bos-1',
            type: 'player',
            label: 'Roman Anthony',
            detail: 'CF',
            asset: { type: 'player', playerId: 'bos-1' },
            playerId: 'bos-1',
          },
        ],
        requestingAssets: [
          {
            key: 'player:nyy-1',
            type: 'player',
            label: 'Anthony Volpe',
            detail: 'SS',
            asset: { type: 'player', playerId: 'nyy-1' },
            playerId: 'nyy-1',
          },
        ],
      },
    ]),
    getTradeHistory: vi.fn().mockResolvedValue([
      {
        id: 'history-1',
        fromTeamId: 'orl',
        fromTeamName: 'Orlando Thunder',
        fromTeamAbbreviation: 'ORL',
        toTeamId: 'cha',
        toTeamName: 'Charlotte Hornets',
        toTeamAbbreviation: 'CHA',
        fairnessScore: 9,
        summary: 'Orlando Thunder sent Drew Example to Charlotte Hornets for Chris Sample.',
        timestamp: 'S4D90',
        offeringAssets: [
          {
            key: 'player:tb-1',
            type: 'player',
            label: 'Drew Example',
            detail: 'SP',
            asset: { type: 'player', playerId: 'tb-1' },
            playerId: 'tb-1',
          },
        ],
        requestingAssets: [
          {
            key: 'player:tor-1',
            type: 'player',
            label: 'Chris Sample',
            detail: 'C',
            asset: { type: 'player', playerId: 'tor-1' },
            playerId: 'tor-1',
          },
        ],
      },
    ]),
    getOpenNegotiations: vi.fn().mockResolvedValue([]),
    getTradeAssetInventory: vi.fn().mockImplementation(async (teamId: string) => (
      teamId === 'nym'
        ? {
          draftPicks: [
            {
              key: 'draft:4:1:nyy',
              label: 'R1 4',
              detail: 'NYY original',
              asset: { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' },
            },
          ],
          ifaRemaining: 3.5,
        }
        : {
          draftPicks: [
            {
              key: 'draft:4:2:bos',
              label: 'R2 4',
              detail: 'BOS original',
              asset: { type: 'draft_pick', season: 4, round: 2, originalTeamId: 'bos' },
            },
          ],
          ifaRemaining: 2.25,
        }
    )),
    getTradeDeadlineState: vi.fn().mockResolvedValue({
      deadlineDay: 122,
      daysUntilDeadline: 4,
      deadlineMode: true,
      teamMode: 'buyer',
      modeSummary: 'The room expects you to push for MLB impact before the deadline shuts.',
      countdownLabel: '4 days to deadline',
      hotOffers: [
        {
          id: 'offer-1',
          fromTeamId: 'bos',
          fromTeamName: 'Boston Noreasters',
          fromTeamAbbreviation: 'BOS',
          toTeamId: 'nym',
          toTeamName: 'New York Tycoons',
          toTeamAbbreviation: 'NYT',
          fairnessScore: -6,
          message: 'The Boston Noreasters want to discuss a trade.',
          createdAt: 'S4D118',
          offeringAssets: [
            {
              key: 'player:bos-1',
              type: 'player',
              label: 'Roman Anthony',
              detail: 'CF',
              asset: { type: 'player', playerId: 'bos-1' },
              playerId: 'bos-1',
            },
          ],
          requestingAssets: [
            {
              key: 'player:nyy-1',
              type: 'player',
              label: 'Anthony Volpe',
              detail: 'SS',
              asset: { type: 'player', playerId: 'nyy-1' },
              playerId: 'nyy-1',
            },
          ],
          urgencyTag: 'EXPIRING SOON',
          bidderCount: 3,
          biddingSummary: '3 clubs are in on Anthony Volpe.',
          dialogue: gmDialogue,
        },
      ],
      ticker: [
        {
          id: 'ticker-1',
          summary: 'Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.',
          timestamp: 'S4D117',
        },
      ],
      chatter: [
        {
          id: 'user-mode-buyer',
          headline: 'New York Tycoons are flagged as buyers',
          detail: 'The room is reading urgency around upgrades that move the playoff needle.',
          mode: 'buyer',
          teamId: null,
        },
      ],
      recap: {
        analysisHeadline: 'Deadline winners and losers',
        yourTrades: [
          {
            id: 'recap-trade-1',
            summary: 'New York Tycoons sent Anthony Volpe to Boston Noreasters for Roman Anthony.',
            outcome: 'completed',
          },
          {
            id: 'recap-trade-2',
            summary: 'Boston Noreasters offer for Anthony Volpe expired at the deadline.',
            outcome: 'missed',
          },
        ],
        majorMoves: [
          {
            id: 'ticker-1',
            summary: 'Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.',
            timestamp: 'S4D117',
          },
        ],
        winners: ['Seattle Drizzle', 'New York Tycoons'],
        losers: ['Boston Noreasters'],
      },
    }),
    getTradeDialogue: vi.fn().mockResolvedValue(gmDialogue),
    getRelationships: vi.fn().mockResolvedValue([
      {
        teamId: 'bos',
        teamName: 'Boston Noreasters',
        teamAbbreviation: 'BOS',
        score: 32,
        tier: 'friendly',
        tooltip: 'Boston Noreasters view you as a friendly trade partner.',
        lastInteractionSeason: 4,
        lastEventLabel: 'S4',
        latestMemoryDescription: 'a trade both sides could justify',
      },
      {
        teamId: 'sea',
        teamName: 'Seattle Drizzle',
        teamAbbreviation: 'SEA',
        score: -28,
        tier: 'strained',
        tooltip: 'Seattle Drizzle are carrying a strained read on your front office.',
        lastInteractionSeason: 3,
        lastEventLabel: 'S3',
        latestMemoryDescription: 'a trade you clearly won',
      },
    ]),
    evaluateMultiTeamFairness: vi.fn().mockResolvedValue({
      success: true,
      message: 'The three-team framework stays inside the current balance thresholds.',
      fairness: {
        isBalanced: true,
        maxImbalance: 7.5,
        mostDisadvantagedTeam: 'sea',
        fairnessScore: 82,
        netValueByTeam: [
          { teamId: 'nym', teamName: 'New York Tycoons', teamAbbreviation: 'NYT', netValue: 2.5 },
          { teamId: 'bos', teamName: 'Boston Noreasters', teamAbbreviation: 'BOS', netValue: 1.5 },
          { teamId: 'sea', teamName: 'Seattle Drizzle', teamAbbreviation: 'SEA', netValue: -4.0 },
        ],
      },
    }),
    generateConditionalClause: vi.fn().mockResolvedValue({
      success: true,
      message: 'Conditional clause added to the framework.',
      condition: {
        type: 'performance',
        threshold: 4,
        playerId: 'nyy-1',
        deadline: 2,
        description: 'nyy-1 must hit the agreed performance bar before the deadline.',
      },
    }),
    startNegotiation: vi.fn().mockResolvedValue({
      success: true,
      decision: 'countered',
      message: 'Boston kicked back a firmer counter and asked for a cleaner fit.',
      tradeExecuted: false,
      negotiation: {
        id: 'neg-1',
        teamId: 'bos',
        teamName: 'Boston Noreasters',
        teamAbbreviation: 'BOS',
        phase: 'counter_1',
        roundsCompleted: 1,
        expiresAtDay: 97,
        dialogue: [
          { speaker: 'rival_gm', text: 'Boston kicked back a firmer counter and asked for a cleaner fit.', tone: 'firm' },
          { speaker: 'agm_advisor', text: 'Our AGM thinks the friendly relationship bought us a little patience, but not real leverage.', tone: 'firm' },
        ],
        proposal: {
          offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
          requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
        },
        counterOffer: {
          offeringAssets: [{ type: 'player', playerId: 'nyy-1' }],
          requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
        },
        isComplete: false,
        canAccept: true,
        canCounter: true,
        canReject: true,
      },
    }),
    advanceNegotiation: vi.fn().mockResolvedValue({
      success: true,
      decision: 'countered',
      message: 'Boston kicked back a firmer counter and asked for a cleaner fit.',
      tradeExecuted: false,
      negotiation: null,
    }),
    resolveNegotiation: vi.fn().mockResolvedValue({
      success: true,
      decision: 'accepted',
      message: 'Boston accepted the final trade framework.',
      tradeExecuted: true,
      negotiation: null,
    }),
    proposeMultiTeam: vi.fn().mockResolvedValue({
      success: true,
      accepted: true,
      message: 'All clubs signed off on the current framework.',
      narrative: 'Three front offices finally found common ground. BOS via Roman Anthony, NYT via Anthony Volpe, SEA via Cole Young.',
      fairness: {
        isBalanced: true,
        maxImbalance: 7.5,
        mostDisadvantagedTeam: 'sea',
        fairnessScore: 82,
        netValueByTeam: [
          { teamId: 'nym', teamName: 'New York Tycoons', teamAbbreviation: 'NYT', netValue: 2.5 },
          { teamId: 'bos', teamName: 'Boston Noreasters', teamAbbreviation: 'BOS', netValue: 1.5 },
          { teamId: 'sea', teamName: 'Seattle Drizzle', teamAbbreviation: 'SEA', netValue: -4.0 },
        ],
      },
    }),
    executeMultiTeamTrade: vi.fn().mockResolvedValue({
      success: true,
      accepted: true,
      message: 'Three-team framework executed.',
      narrative: 'Three front offices finally found common ground. BOS via Roman Anthony, NYT via Anthony Volpe, SEA via Cole Young.',
      fairness: {
        isBalanced: true,
        maxImbalance: 7.5,
        mostDisadvantagedTeam: 'sea',
        fairnessScore: 82,
        netValueByTeam: [
          { teamId: 'nym', teamName: 'New York Tycoons', teamAbbreviation: 'NYT', netValue: 2.5 },
          { teamId: 'bos', teamName: 'Boston Noreasters', teamAbbreviation: 'BOS', netValue: 1.5 },
          { teamId: 'sea', teamName: 'Seattle Drizzle', teamAbbreviation: 'SEA', netValue: -4.0 },
        ],
      },
      cascadeEvents: [],
      pendingTrades: [
        {
          id: 'multi-team-4-95-nym-bos-sea:condition:1',
          requiredPlayerId: 'nyy-1',
          triggerCondition: 'nyy-1 must hit the agreed performance bar before the deadline.',
        },
      ],
    }),
    exportSnapshot: vi.fn().mockResolvedValue({ schemaVersion: 33, season: 4, day: 95, phase: 'regular' }),
    proposeTrade: vi.fn().mockResolvedValue({ decision: 'accepted', reason: 'Deal works.' }),
    respondToTradeOffer: vi.fn().mockResolvedValue({ decision: 'accepted', message: 'Accepted.' }),
  };
}

describe('TradePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderPage(initialEntry: string = '/trade') {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <TradePage />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders the active deadline countdown, inbox, and trade history', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Taylor Bennett',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      playerCount: 780,
      gamesPlayed: 95,
      isSimulating: false,
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
    });

    mockedUseWorker.mockReturnValue(createWorkerMock() as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('4 days until trade deadline');
    expect(container.textContent).toContain('Trade Deadline Theatre');
    expect(container.textContent).toContain('4 days to deadline');
    expect(container.textContent).toContain('Buyer');
    expect(container.textContent).toContain('Hot Offers');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Friendly');
    expect(container.textContent).toContain('a trade both sides could justify');
    expect(container.textContent).toContain('Roman Anthony');
    expect(container.textContent).toContain('EXPIRING SOON');
    expect(container.textContent).toContain('3 clubs are in on Anthony Volpe.');
    expect(container.textContent).toContain('Active Talks');
    expect(container.textContent).toContain('No active talks');
    expect(container.textContent).toContain('GM Dialogue');
    expect(container.textContent).toContain('Right now the offer is light for what you are asking us to surrender.');
    expect(container.textContent).toContain('League Trade Ticker');
    expect(container.textContent).toContain('Seattle Drizzle sent Drew Example to San Diego Surf Hounds for Chris Sample.');
    expect(container.textContent).toContain('Trade History');
    expect(container.textContent).toContain('Orlando Thunder sent Drew Example to Charlotte Hornets for Chris Sample.');
  });

  it('renders the closed-state banner after the trade deadline', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 121,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 121,
      isSimulating: false,
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
    });

    const worker = createWorkerMock();
    worker.getTradeOffers.mockResolvedValue([]);
    worker.getTradeHistory.mockResolvedValue([]);
    worker.getTradeDeadlineState.mockResolvedValue({
      deadlineDay: 122,
      daysUntilDeadline: 0,
      deadlineMode: false,
      teamMode: 'standing_pat',
      modeSummary: 'The market reads you as flexible, but not urgent enough to blink first.',
      countdownLabel: 'Deadline Day',
      hotOffers: [],
      ticker: [],
      chatter: [],
      recap: {
        analysisHeadline: 'Deadline winners and losers',
        yourTrades: [
          {
            id: 'missed-trade',
            summary: 'Boston Noreasters offer for Anthony Volpe expired at the deadline.',
            outcome: 'missed',
          },
        ],
        majorMoves: [],
        winners: ['Seattle Drizzle'],
        losers: ['Boston Noreasters'],
      },
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('Deadline has passed');
    expect(container.textContent).toContain('No trade offers right now');
    expect(container.textContent).toContain('No trades completed yet this season.');
    expect(container.textContent).toContain('Deadline winners and losers');
    expect(container.textContent).toContain('offer for Anthony Volpe expired');
  });

  it('renders quiet-market empty states once the deadline has passed', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 124,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 124,
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

    const worker = createWorkerMock();
    worker.getTradeOffers.mockResolvedValue([]);
    worker.getTradeHistory.mockResolvedValue([]);
    worker.getTradeDeadlineState.mockResolvedValue({
      deadlineDay: 122,
      daysUntilDeadline: null,
      deadlineMode: false,
      teamMode: 'standing_pat',
      modeSummary: 'The market reads you as flexible, but not urgent enough to blink first.',
      countdownLabel: 'Market Closed',
      hotOffers: [],
      ticker: [],
      chatter: [],
      recap: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('Deadline has passed');
    expect(container.textContent).toContain('No trade offers right now');
    expect(container.textContent).toContain('No ticker moves are active right now');
  });

  it('uses phase-aware Spring Training copy instead of deadline-passed language', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 1,
      day: 18,
      phase: 'spring_training',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Taylor Bennett',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
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

    const worker = createWorkerMock();
    worker.getTradeDeadlineState.mockResolvedValue({
      deadlineDay: 122,
      daysUntilDeadline: null,
      deadlineMode: false,
      teamMode: 'standing_pat',
      modeSummary: 'Camp calls are posture checks, not formal deadline pressure.',
      countdownLabel: 'Spring Training',
      hotOffers: [],
      ticker: [],
      chatter: [],
      recap: null,
    });
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('Spring Training trade desk');
    expect(container.textContent).toContain('Formal trade proposals unlock on Opening Day');
    expect(container.textContent).not.toContain('Regular-season deadline has passed');
  });

  it('opens the negotiation response pane after starting a trade negotiation', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      gmName: 'Taylor Bennett',
      difficulty: 'standard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      playerCount: 780,
      gamesPlayed: 95,
      isSimulating: false,
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
    });

    const worker = createWorkerMock();
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    const teamSelect = container.querySelector('select');
    expect(teamSelect).toBeTruthy();

    await act(async () => {
      if (teamSelect instanceof HTMLSelectElement) {
        teamSelect.value = 'bos';
        teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await Promise.resolve();
      await Promise.resolve();
    });

    const playerRows = Array.from(container.querySelectorAll('tbody tr'));
    const userRow = playerRows.find((row) => row.textContent?.includes('Anthony Volpe'));
    const partnerRow = playerRows.find((row) => row.textContent?.includes('Roman Anthony'));
    expect(userRow).toBeTruthy();
    expect(partnerRow).toBeTruthy();

    await act(async () => {
      userRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      partnerRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const startButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Start Negotiation'));
    expect(startButton).toBeTruthy();

    await act(async () => {
      startButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Negotiation Round');
    expect(container.textContent).toContain('Boston kicked back a firmer counter and asked for a cleaner fit.');
    expect(worker.startNegotiation).toHaveBeenCalled();
    expect(worker.getOpenNegotiations).toHaveBeenCalledTimes(2);
    expect(worker.exportSnapshot).toHaveBeenCalled();
    expect(mockedScheduleAutoSave).toHaveBeenCalledWith(1, 'Taylor Bennett • Tycoons • Season 4', {
      schemaVersion: 33,
      season: 4,
      day: 95,
      phase: 'regular',
    });
    expect(mockedLoadGameById).not.toHaveBeenCalled();
    expect(mockedSaveGameById).not.toHaveBeenCalled();
  });

  it('discovers persisted open negotiations and resumes them into the builder', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 95,
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

    const worker = createWorkerMock();
    worker.getOpenNegotiations.mockResolvedValue([createNegotiationView()]);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('Active Talks');
    expect(container.textContent).toContain('1 open negotiation');
    expect(container.textContent).toContain('This is still close enough to keep alive');

    const resumeButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Resume Talk'));
    expect(resumeButton).toBeTruthy();

    await act(async () => {
      resumeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const teamSelect = container.querySelector('select');
    expect(teamSelect instanceof HTMLSelectElement ? teamSelect.value : '').toBe('bos');
    expect(container.textContent).toContain('Negotiation Round');
    expect(container.textContent).toContain('Resumed active talks with Boston Noreasters');
    expect(container.textContent).toContain('Anthony Volpe');
    expect(container.textContent).toContain('Roman Anthony');
  });

  it('auto-resumes an open negotiation from a negotiationId deep link', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 95,
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

    const worker = createWorkerMock();
    worker.getOpenNegotiations.mockResolvedValue([createNegotiationView()]);
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage('/trade?negotiationId=neg-open');

    expect(container.textContent).toContain('Negotiation Round');
    expect(container.textContent).toContain('This is still close enough to keep alive');
    expect(container.textContent).toContain('Loaded');
  });

  it('includes draft picks and IFA pool space when proposing an asset-based trade', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 95,
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

    const worker = createWorkerMock();
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    const teamSelect = container.querySelector('select');
    expect(teamSelect).toBeTruthy();

    await act(async () => {
      teamSelect?.dispatchEvent(new Event('change', { bubbles: true }));
      if (teamSelect instanceof HTMLSelectElement) {
        teamSelect.value = 'bos';
        teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await Promise.resolve();
      await Promise.resolve();
    });

    const playerRows = Array.from(container.querySelectorAll('tbody tr'));
    const userRow = playerRows.find((row) => row.textContent?.includes('Anthony Volpe'));
    const partnerRow = playerRows.find((row) => row.textContent?.includes('Roman Anthony'));

    await act(async () => {
      userRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      partnerRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const assetButtons = Array.from(container.querySelectorAll('button'));
    const userPickButton = assetButtons.find((button) => button.textContent?.includes('R1 4'));
    const partnerPickButton = assetButtons.find((button) => button.textContent?.includes('R2 4'));

    await act(async () => {
      userPickButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      partnerPickButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const offeringPoolInput = container.querySelector('input[name="offering-ifa-pool"]');
    const requestingPoolInput = container.querySelector('input[name="requesting-ifa-pool"]');
    expect(offeringPoolInput).toBeTruthy();
    expect(requestingPoolInput).toBeTruthy();

    await act(async () => {
      if (offeringPoolInput instanceof HTMLInputElement) {
        offeringPoolInput.value = '1.5';
        offeringPoolInput.dispatchEvent(new Event('input', { bubbles: true }));
        offeringPoolInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (requestingPoolInput instanceof HTMLInputElement) {
        requestingPoolInput.value = '0.5';
        requestingPoolInput.dispatchEvent(new Event('input', { bubbles: true }));
        requestingPoolInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await Promise.resolve();
    });

    const proposeButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Start Negotiation'),
    );
    expect(proposeButton).toBeTruthy();

    await act(async () => {
      proposeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.startNegotiation).toHaveBeenCalledWith(
      [
        { type: 'player', playerId: 'nyy-1' },
        { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' },
        { type: 'ifa_pool_space', amount: 1.5 },
      ],
      [
        { type: 'player', playerId: 'bos-1' },
        { type: 'draft_pick', season: 4, round: 2, originalTeamId: 'bos' },
        { type: 'ifa_pool_space', amount: 0.5 },
      ],
      'bos',
    );
  });

  it('opens the multi-team trade modal, adds a condition, and routes the proposal through the worker', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 95,
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

    const worker = createWorkerMock();
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    const openMultiTeamButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('3+ Team Trade'));
    expect(openMultiTeamButton).toBeTruthy();

    await act(async () => {
      openMultiTeamButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('3+ Team Trade');
    expect(container.textContent).toContain('Conditional Clauses');

    const laneCards = Array.from(container.querySelectorAll('button')).filter((button) =>
      button.textContent?.includes('Anthony Volpe')
      || button.textContent?.includes('Roman Anthony')
      || button.textContent?.includes('Cole Young'));

    expect(laneCards.length).toBeGreaterThanOrEqual(3);

    await act(async () => {
      laneCards[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      laneCards[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      laneCards[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    const playerSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => option.textContent?.includes('Anthony Volpe')));
    expect(playerSelect).toBeTruthy();

    await act(async () => {
      if (playerSelect instanceof HTMLSelectElement) {
        playerSelect.value = 'nyy-1';
        playerSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await Promise.resolve();
    });

    const addConditionButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add Condition'));
    expect(addConditionButton).toBeTruthy();

    await act(async () => {
      addConditionButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.generateConditionalClause).toHaveBeenCalledWith('nyy-1');
    expect(container.textContent).toContain('must hit the agreed performance bar');

    const proposeFrameworkButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Propose Framework'));
    expect(proposeFrameworkButton).toBeTruthy();

    await act(async () => {
      proposeFrameworkButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.proposeMultiTeam).toHaveBeenCalled();
    expect(container.textContent).toContain('Proposal Response');
    expect(container.textContent).toContain('Three front offices finally found common ground.');
  });

  it('preselects a player from the query string into the outgoing package', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 95,
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

    const worker = createWorkerMock();
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage('/trade?playerId=nyy-1');

    const teamSelect = container.querySelector('select');
    expect(teamSelect).toBeTruthy();

    await act(async () => {
      if (teamSelect instanceof HTMLSelectElement) {
        teamSelect.value = 'bos';
        teamSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await Promise.resolve();
      await Promise.resolve();
    });

    const playerRows = Array.from(container.querySelectorAll('tbody tr'));
    expect(playerRows.some((row) => row.textContent?.includes('Roman Anthony'))).toBe(true);
    expect(container.textContent).toContain('Anthony Volpe · SS');
    expect(worker.proposeTrade).not.toHaveBeenCalled();
  });
});
