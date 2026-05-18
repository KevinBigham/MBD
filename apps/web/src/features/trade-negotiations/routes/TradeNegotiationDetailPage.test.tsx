import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TradeNegotiationDetailPage from './TradeNegotiationDetailPage';
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

const sampleNegotiation = {
  id: 'neg-1',
  teamId: 'bos',
  teamName: 'Boston Noreasters',
  teamAbbreviation: 'BOS',
  phase: 'counter_2',
  roundsCompleted: 3,
  expiresAtDay: 112,
  dialogue: [
    { speaker: 'rival_gm', text: 'Boston kicked back a firmer counter.', tone: 'firm' },
    { speaker: 'agm_advisor', text: 'The value gap is narrow enough to keep working.', tone: 'measured' },
  ],
  proposal: {
    offeringAssets: [
      { type: 'player', playerId: 'nym-1' },
      { type: 'draft_pick', season: 5, round: 2, originalTeamId: 'nym' },
    ],
    requestingAssets: [
      { type: 'player', playerId: 'bos-1' },
      { type: 'ifa_pool_space', amount: 1.25 },
    ],
  },
  counterOffer: {
    offeringAssets: [{ type: 'player', playerId: 'nym-1' }],
    requestingAssets: [
      { type: 'player', playerId: 'bos-1' },
      { type: 'player', playerId: 'bos-2' },
    ],
  },
  isComplete: false,
  canAccept: true,
  canCounter: true,
  canReject: true,
};

const playersById = new Map([
  ['nym-1', { id: 'nym-1', firstName: 'Carlos', lastName: 'Core', position: 'SS' }],
  ['bos-1', { id: 'bos-1', firstName: 'Roman', lastName: 'Anthony', position: 'CF' }],
  ['bos-2', { id: 'bos-2', firstName: 'Ben', lastName: 'Arm', position: 'SP' }],
]);

describe('TradeNegotiationDetailPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let getNegotiation: ReturnType<typeof vi.fn>;
  let getPlayer: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    getNegotiation = vi.fn().mockResolvedValue(sampleNegotiation);
    getPlayer = vi.fn().mockImplementation(async (playerId: string) => playersById.get(playerId) ?? null);

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getNegotiation,
      getPlayer,
    } as unknown as ReturnType<typeof useWorker>);

    mockedUseGameStore.mockReturnValue({
      isInitialized: true,
      day: 109,
      season: 4,
      phase: 'regular',
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 108,
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

  async function renderPage(path = '/trade-negotiations/neg-1') {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/trade-negotiations/:negotiationId" element={<TradeNegotiationDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders proposal, counter-offer, dialogue, and trade-builder deep link', async () => {
    await renderPage();

    const content = container.textContent ?? '';
    expect(content).toContain('Boston Noreasters');
    expect(content).toContain('counter 2');
    expect(content).toContain('Round 3');
    expect(content).toContain('Expires Day 112');
    expect(content).toContain('Proposal');
    expect(content).toContain('Counter-Offer');
    expect(content).toContain('Carlos Core');
    expect(content).toContain('Roman Anthony');
    expect(content).toContain('Ben Arm');
    expect(content).toContain('R2 5');
    expect(content).toContain('IFA Pool $1.25M');
    expect(content).toContain('Boston kicked back a firmer counter.');
    expect(content).toContain('The value gap is narrow enough to keep working.');

    expect(container.querySelector('a[href="/players/nym-1"]')?.textContent).toContain('Carlos Core');
    expect(container.querySelector('a[href="/players/bos-1"]')?.textContent).toContain('Roman Anthony');
    expect(container.querySelector('a[href="/trade?negotiationId=neg-1"]')?.textContent).toContain('Open in Trade Builder');
    expect(getNegotiation).toHaveBeenCalledWith('neg-1');
    expect(getPlayer).toHaveBeenCalledWith('nym-1');
  });

  it('renders the awaiting-counter path', async () => {
    getNegotiation.mockResolvedValueOnce({
      ...sampleNegotiation,
      counterOffer: null,
    });

    await renderPage();

    expect(container.textContent).toContain('Awaiting counter');
  });

  it('renders not found when the worker returns null', async () => {
    getNegotiation.mockResolvedValueOnce(null);

    await renderPage('/trade-negotiations/missing-id');

    expect(container.textContent).toContain('Trade negotiation not found');
    expect(container.querySelector('a[href="/trade-negotiations"]')?.textContent).toContain('Back to Inbox');
  });
});
