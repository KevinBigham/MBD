import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PennantRaceCard from './PennantRaceCard';
import { useWorker } from '@/shared/hooks/useWorker';

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: vi.fn(),
}));

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => (
    <span data-testid={`logo-${teamId}`}>{teamId}</span>
  ),
}));

const mockedUseWorker = vi.mocked(useWorker);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function mockWorker(view: unknown, overrides: { isReady?: boolean } = {}): void {
  mockedUseWorker.mockReturnValue({
    getPennantRaces: vi.fn().mockResolvedValue(view),
    isReady: overrides.isReady ?? true,
  } as unknown as ReturnType<typeof useWorker>);
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('PennantRaceCard', () => {
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

  it('renders an empty-state hint when no races are active', async () => {
    mockWorker({
      season: 4,
      day: 12,
      gamesRemaining: 150,
      divisionRaces: [],
      wildcardRaces: [],
    });

    await act(async () => {
      root.render(<PennantRaceCard />);
    });
    await flush();

    expect(container.textContent).toContain('Pennant Race Heat');
    expect(container.textContent).toContain('No tight races yet');
  });

  it('renders a division race with leader, chaser, heat badge, and magic number', async () => {
    mockWorker({
      season: 4,
      day: 150,
      gamesRemaining: 12,
      divisionRaces: [
        {
          division: 'AL_EAST',
          divisionLabel: 'AL East',
          leader: {
            teamId: 'nym',
            abbreviation: 'NYT',
            name: 'New York Tycoons',
            wins: 95,
            losses: 55,
            streak: 'W3',
          },
          chaser: {
            teamId: 'bos',
            abbreviation: 'BOS',
            name: 'Boston Noreasters',
            wins: 93,
            losses: 57,
            streak: 'L1',
          },
          gamesBack: 2,
          magicNumber: 11,
          heat: 'tight',
        },
      ],
      wildcardRaces: [],
    });

    await act(async () => {
      root.render(<PennantRaceCard />);
    });
    await flush();

    expect(container.textContent).toContain('Division Races');
    expect(container.textContent).toContain('AL East');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BOS');
    expect(container.textContent).toContain('95-55');
    expect(container.textContent).toContain('93-57');
    expect(container.textContent).toContain('M11');
    expect(container.textContent).toContain('Tight');
    expect(container.textContent).toContain('2 GB');
  });

  it('renders wildcard bubble with in-playoff vs chasing teams', async () => {
    mockWorker({
      season: 4,
      day: 150,
      gamesRemaining: 12,
      divisionRaces: [],
      wildcardRaces: [
        {
          league: 'AL',
          leagueLabel: 'American',
          teams: [
            {
              teamId: 'nym',
              abbreviation: 'NYT',
              name: 'New York Tycoons',
              wins: 88,
              losses: 62,
              streak: 'W2',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'bos',
              abbreviation: 'BOS',
              name: 'Boston Noreasters',
              wins: 86,
              losses: 64,
              streak: 'L1',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'cha',
              abbreviation: 'CHI',
              name: 'Chicago Southsiders',
              wins: 85,
              losses: 65,
              streak: 'W1',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'bal',
              abbreviation: 'BAL',
              name: 'Baltimore Seabirds',
              wins: 83,
              losses: 67,
              streak: 'L2',
              gamesBack: 2,
              inWildcard: false,
            },
          ],
        },
      ],
    });

    await act(async () => {
      root.render(<PennantRaceCard />);
    });
    await flush();

    expect(container.textContent).toContain('Wildcard Bubble');
    expect(container.textContent).toContain('American League');
    expect(container.textContent).toContain('NYT');
    expect(container.textContent).toContain('BAL');
    expect(container.textContent).toContain('In');
    expect(container.textContent).toContain('2 GB');
  });

  it('shows the total race count badge in the header', async () => {
    mockWorker({
      season: 4,
      day: 150,
      gamesRemaining: 12,
      divisionRaces: [
        {
          division: 'AL_EAST',
          divisionLabel: 'AL East',
          leader: {
            teamId: 'nym',
            abbreviation: 'NYT',
            name: 'New York Tycoons',
            wins: 90,
            losses: 60,
            streak: 'W1',
          },
          chaser: {
            teamId: 'bos',
            abbreviation: 'BOS',
            name: 'Boston Noreasters',
            wins: 88,
            losses: 62,
            streak: '-',
          },
          gamesBack: 2,
          magicNumber: 13,
          heat: 'tight',
        },
      ],
      wildcardRaces: [
        {
          league: 'NL',
          leagueLabel: 'National',
          teams: [
            {
              teamId: 'lax',
              abbreviation: 'LAX',
              name: 'Los Angeles Stars',
              wins: 86,
              losses: 64,
              streak: 'W4',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'sfb',
              abbreviation: 'SFB',
              name: 'San Francisco Bayside',
              wins: 85,
              losses: 65,
              streak: 'L1',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'sdp',
              abbreviation: 'SDP',
              name: 'San Diego Sunrise',
              wins: 84,
              losses: 66,
              streak: 'W2',
              gamesBack: 0,
              inWildcard: true,
            },
            {
              teamId: 'arz',
              abbreviation: 'ARZ',
              name: 'Arizona Dustdevils',
              wins: 83,
              losses: 67,
              streak: 'L2',
              gamesBack: 1,
              inWildcard: false,
            },
          ],
        },
      ],
    });

    await act(async () => {
      root.render(<PennantRaceCard />);
    });
    await flush();

    // 1 division race + 1 wildcard race = 2
    const header = container.querySelector('h2')?.parentElement;
    expect(header?.textContent).toContain('2');
  });

  it('suppresses content while the worker is not ready', async () => {
    mockWorker(
      {
        season: 4,
        day: 12,
        gamesRemaining: 150,
        divisionRaces: [],
        wildcardRaces: [],
      },
      { isReady: false },
    );

    await act(async () => {
      root.render(<PennantRaceCard />);
    });
    await flush();

    expect(container.textContent).toContain('Loading');
  });
});
