import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import TradePage from './TradePage';
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

function createWorkerMock() {
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
    teamId: 'nyy',
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

  return {
    isReady: true,
    getTeamRoster: vi.fn().mockImplementation(async (teamId: string) => (teamId === 'nyy' ? [userPlayer] : [partnerPlayer])),
    getTradeOffers: vi.fn().mockResolvedValue([
      {
        id: 'offer-1',
        fromTeamId: 'bos',
        fromTeamName: 'Boston Red Sox',
        fromTeamAbbreviation: 'BOS',
        toTeamId: 'nyy',
        toTeamName: 'New York Yankees',
        toTeamAbbreviation: 'NYY',
        fairnessScore: -6,
        message: 'The Boston Red Sox want to discuss a trade.',
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
        fromTeamId: 'tb',
        fromTeamName: 'Tampa Bay Rays',
        fromTeamAbbreviation: 'TBR',
        toTeamId: 'tor',
        toTeamName: 'Toronto Blue Jays',
        toTeamAbbreviation: 'TOR',
        fairnessScore: 9,
        summary: 'Tampa Bay Rays sent Drew Example to Toronto Blue Jays for Chris Sample.',
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
    getTradeAssetInventory: vi.fn().mockImplementation(async (teamId: string) => (
      teamId === 'nyy'
        ? {
          draftPicks: [
            {
              key: 'draft:4:1:nyy',
              label: 'R1 4',
              detail: 'NYY original',
              asset: { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nyy' },
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

  async function renderPage() {
    await act(async () => {
      root.render(
        <MemoryRouter>
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
      userTeamId: 'nyy',
      teamName: 'Yankees',
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

    mockedUseWorker.mockReturnValue(createWorkerMock() as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('25 days until trade deadline');
    expect(container.textContent).toContain('Trade Inbox');
    expect(container.textContent).toContain('Boston Red Sox');
    expect(container.textContent).toContain('Roman Anthony');
    expect(container.textContent).toContain('Trade History');
    expect(container.textContent).toContain('Tampa Bay Rays sent Drew Example to Toronto Blue Jays for Chris Sample.');
  });

  it('renders the closed-state banner after the trade deadline', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 121,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
      playerCount: 780,
      gamesPlayed: 121,
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
    mockedUseWorker.mockReturnValue(worker as unknown as ReturnType<typeof useWorker>);

    await renderPage();

    expect(container.textContent).toContain('Trade market closed — reopens in offseason');
    expect(container.textContent).toContain('No active trade offers.');
    expect(container.textContent).toContain('No trades completed yet this season.');
  });

  it('includes draft picks and IFA pool space when proposing an asset-based trade', async () => {
    mockedUseGameStore.mockReturnValue({
      season: 4,
      day: 95,
      phase: 'regular',
      isInitialized: true,
      userTeamId: 'nyy',
      teamName: 'Yankees',
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
      (button) => button.textContent?.includes('Propose Trade'),
    );
    expect(proposeButton).toBeTruthy();

    await act(async () => {
      proposeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(worker.proposeTrade).toHaveBeenCalledWith(
      [
        { type: 'player', playerId: 'nyy-1' },
        { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nyy' },
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
});
