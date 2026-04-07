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
      userTeamId: 'nyy',
      teamName: 'Yankees',
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

    // Budget
    expect(container.textContent).toContain('$200.0M');
    expect(container.textContent).toContain('$180.0M');
  });

  it('renders without hot seat when not on hot seat', async () => {
    const calmOwner = { ...MOCK_OWNER, hotSeat: false };

    mockedUseWorker.mockReturnValue({
      isReady: true,
      getOwnerState: vi.fn().mockResolvedValue(calmOwner),
      getFrontOfficeState: vi.fn().mockResolvedValue(MOCK_FO),
      getTeamChemistry: vi.fn().mockResolvedValue(MOCK_CHEMISTRY),
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
