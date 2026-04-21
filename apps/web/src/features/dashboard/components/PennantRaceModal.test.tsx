import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PennantRaceModal, { type PennantRaceDetailView } from './PennantRaceModal';

const mockWorker = {
  isReady: true,
  getPennantRaceDetail: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => (
    <span data-testid={`logo-${teamId}`}>{teamId}</span>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const richView: PennantRaceDetailView = {
  season: 7,
  day: 150,
  gamesRemaining: 12,
  divisions: [
    {
      division: 'AL_EAST',
      divisionLabel: 'AL East',
      teams: [
        {
          teamId: 'nym',
          abbreviation: 'NYT',
          name: 'New York Tycoons',
          wins: 95,
          losses: 55,
          pct: 0.633,
          gamesBack: 0,
          streak: 'W3',
          projectedWins: 103,
        },
        {
          teamId: 'bos',
          abbreviation: 'BOS',
          name: 'Boston Noreasters',
          wins: 93,
          losses: 57,
          pct: 0.62,
          gamesBack: 2,
          streak: 'L1',
          projectedWins: 100,
        },
        {
          teamId: 'tor',
          abbreviation: 'TOR',
          name: 'Toronto Maples',
          wins: 88,
          losses: 62,
          pct: 0.587,
          gamesBack: 7,
          streak: 'W1',
          projectedWins: 95,
        },
        {
          teamId: 'bal',
          abbreviation: 'BAL',
          name: 'Baltimore Seabirds',
          wins: 75,
          losses: 75,
          pct: 0.5,
          gamesBack: 20,
          streak: 'L2',
          projectedWins: 81,
        },
        {
          teamId: 'tbr',
          abbreviation: 'TBR',
          name: 'Tampa Bay Rays',
          wins: 65,
          losses: 85,
          pct: 0.433,
          gamesBack: 30,
          streak: '-',
          projectedWins: 70,
        },
      ],
    },
  ],
  wildcards: [
    {
      league: 'AL',
      leagueLabel: 'American',
      teams: [
        {
          teamId: 'bos',
          abbreviation: 'BOS',
          name: 'Boston Noreasters',
          wins: 93,
          losses: 57,
          pct: 0.62,
          gamesBack: 0,
          streak: 'L1',
          projectedWins: 100,
          inWildcard: true,
        },
        {
          teamId: 'tor',
          abbreviation: 'TOR',
          name: 'Toronto Maples',
          wins: 88,
          losses: 62,
          pct: 0.587,
          gamesBack: 0,
          streak: 'W1',
          projectedWins: 95,
          inWildcard: true,
        },
        {
          teamId: 'cha',
          abbreviation: 'CHI',
          name: 'Chicago Southsiders',
          wins: 87,
          losses: 63,
          pct: 0.58,
          gamesBack: 0,
          streak: 'W2',
          projectedWins: 94,
          inWildcard: true,
        },
        {
          teamId: 'bal',
          abbreviation: 'BAL',
          name: 'Baltimore Seabirds',
          wins: 85,
          losses: 65,
          pct: 0.567,
          gamesBack: 2,
          streak: 'L2',
          projectedWins: 92,
          inWildcard: false,
        },
      ],
    },
  ],
};

describe('PennantRaceModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getPennantRaceDetail.mockReset();
    onDismiss = vi.fn();
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderModal() {
    await act(async () => {
      root.render(<PennantRaceModal onDismiss={onDismiss} />);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders empty-state prompt when the worker returns null', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(null);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Pennant Race Board');
    expect(text).toContain('No pennant race data available yet.');
  });

  it('renders a quiet message when the season has not separated yet', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue({
      season: 4,
      day: 5,
      gamesRemaining: 157,
      divisions: [],
      wildcards: [],
    });

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Season 4 · Day 5');
    expect(text).toContain('Races will unfold');
  });

  it('renders all divisions with full standings, projected pace, and leader highlight', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Season 7 · Day 150');
    expect(text).toContain('Games remaining');
    expect(text).toContain('12');
    expect(text).toContain('Divisions');
    expect(text).toContain('AL East');
    expect(text).toContain('NYT');
    expect(text).toContain('95-55');
    expect(text).toContain('.633');
    expect(text).toContain('BOS');
    expect(text).toContain('TOR');
    expect(text).toContain('BAL');
    expect(text).toContain('TBR');
    expect(text).toContain('2 GB');
    expect(text).toContain('proj');
    expect(text).toContain('103');
  });

  it('renders wildcard picture with in-playoff vs chasing distinction', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Wildcard Picture');
    expect(text).toContain('American League');
    expect(text).toContain('In');
    expect(text).toContain('2 GB');
  });

  it('dismisses on Escape key', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(richView);

    await renderModal();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on backdrop click and suppresses click inside the dialog', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const backdrop = container.querySelector('[role="dialog"]') as HTMLElement;
    const dialog = backdrop.querySelector('div') as HTMLElement;

    await act(async () => {
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the close button is clicked', async () => {
    mockWorker.getPennantRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const closeBtn = container.querySelector(
      'button[aria-label="Close pennant race board"]',
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
