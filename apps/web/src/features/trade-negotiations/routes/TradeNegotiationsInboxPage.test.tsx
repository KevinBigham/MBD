import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';
import TradeNegotiationsInboxPage from './TradeNegotiationsInboxPage';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/hooks/useGameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockedUseWorker = vi.mocked(useWorker);
const mockedUseGameStore = vi.mocked(useGameStore);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const openNegotiation = {
  id: 'neg-open',
  teamId: 'bos',
  teamName: 'Boston Noreasters',
  teamAbbreviation: 'BOS',
  phase: 'counter_1',
  roundsCompleted: 2,
  expiresAtDay: 103,
  dialogue: [
    { speaker: 'rival_gm', text: 'Boston wants one more piece to keep this alive.', tone: 'firm' },
    { speaker: 'agm_advisor', text: 'The counter is close enough to keep talking.', tone: 'measured' },
  ],
  proposal: {
    offeringAssets: [{ type: 'player', playerId: 'nym-1' }],
    requestingAssets: [{ type: 'player', playerId: 'bos-1' }],
  },
  counterOffer: null,
  isComplete: false,
  canAccept: true,
  canCounter: true,
  canReject: true,
};

const closedNegotiation = {
  ...openNegotiation,
  id: 'neg-closed',
  teamName: 'Seattle Drizzle',
  teamAbbreviation: 'SEA',
  phase: 'rejected',
  expiresAtDay: 99,
  isComplete: true,
  canAccept: false,
  canCounter: false,
  canReject: false,
};

describe('TradeNegotiationsInboxPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let getOpenNegotiations: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    getOpenNegotiations = vi.fn().mockResolvedValue([closedNegotiation, openNegotiation]);

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getOpenNegotiations,
    } as unknown as ReturnType<typeof useWorker>);

    mockedUseGameStore.mockReturnValue({
      isInitialized: true,
      day: 100,
      season: 4,
      phase: 'regular',
      userTeamId: 'nym',
      teamName: 'Tycoons',
      playerCount: 780,
      gamesPlayed: 99,
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

  async function renderPage(initialEntry = '/trade-negotiations') {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/trade-negotiations" element={<TradeNegotiationsInboxPage />} />
            <Route path="/trade-negotiations/:negotiationId" element={<div data-testid="detail-route">Detail route</div>} />
          </Routes>
        </MemoryRouter>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders open negotiations before closed negotiations with urgency metadata', async () => {
    await renderPage();

    const content = container.textContent ?? '';
    expect(content).toContain('Trade Negotiations Inbox');
    expect(content).toContain('Boston Noreasters');
    expect(content).toContain('BOS');
    expect(content).toContain('counter 1');
    expect(content).toContain('Round 2');
    expect(content).toContain('Expires in 3 days');
    expect(content).toContain('Accept');
    expect(content).toContain('Counter');
    expect(content).toContain('Reject');
    expect(content).toContain('The counter is close enough to keep talking.');
    expect(content.indexOf('Boston Noreasters')).toBeLessThan(content.indexOf('Seattle Drizzle'));
    expect(getOpenNegotiations).toHaveBeenCalledTimes(1);
  });

  it('renders an empty state linking back to the Trade Hub', async () => {
    getOpenNegotiations.mockResolvedValueOnce([]);

    await renderPage();

    expect(container.textContent).toContain('No open trade negotiations');
    const link = Array.from(container.querySelectorAll('a[href="/trade"]')).find((candidate) =>
      candidate.textContent?.includes('Visit Trade Hub'),
    );
    expect(link?.textContent).toContain('Visit Trade Hub');
  });

  it('navigates to the detail route when a negotiation row is clicked', async () => {
    await renderPage();

    const row = container.querySelector('a[href="/trade-negotiations/neg-open"]') as HTMLAnchorElement | null;
    expect(row).toBeTruthy();

    await act(async () => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="detail-route"]')?.textContent).toContain('Detail route');
  });

  it('shows an inline error and toast when the worker call fails', async () => {
    getOpenNegotiations.mockRejectedValueOnce(new Error('worker unavailable'));

    await renderPage();

    expect(toast.error).toHaveBeenCalledWith('Trade negotiations could not be loaded.');
    expect(container.textContent).toContain('Trade negotiations unavailable');
  });
});
