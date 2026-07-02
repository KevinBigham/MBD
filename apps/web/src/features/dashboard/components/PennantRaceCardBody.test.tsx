import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import PennantRaceCardBody, {
  type DivisionRace,
  type WildcardRace,
} from './PennantRaceCardBody';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => (
    <span data-testid={`logo-${teamId}`}>{teamId}</span>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('PennantRaceCardBody', () => {
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

  async function renderBody({
    loading = false,
    divisionRaces = [],
    wildcardRaces = [],
  }: {
    loading?: boolean;
    divisionRaces?: DivisionRace[];
    wildcardRaces?: WildcardRace[];
  }) {
    await act(async () => {
      root.render(
        <PennantRaceCardBody
          loading={loading}
          divisionRaces={divisionRaces}
          wildcardRaces={wildcardRaces}
        />,
      );
    });
  }

  it('renders loading and empty states without route data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('No tight races yet');
  });

  it('renders division and wildcard race details with badges, logos, and games-back copy', async () => {
    await renderBody({
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
          gamesBack: 2.5,
          magicNumber: 11,
          heat: 'tight',
        },
      ],
      wildcardRaces: [
        {
          league: 'AL',
          leagueLabel: 'American',
          teams: [
            {
              teamId: 'sea',
              abbreviation: 'SEA',
              name: 'Seattle Pilots',
              wins: 88,
              losses: 62,
              streak: 'W2',
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

    const text = container.textContent ?? '';
    expect(text).toContain('Division Races');
    expect(text).toContain('AL East');
    expect(text).toContain('NYT');
    expect(text).toContain('BOS');
    expect(text).toContain('95-55');
    expect(text).toContain('93-57');
    expect(text).toContain('W3');
    expect(text).toContain('L1');
    expect(text).toContain('M11');
    expect(text).toContain('Tight');
    expect(text).toContain('2.5 GB');
    expect(text).toContain('Wildcard Bubble');
    expect(text).toContain('American League');
    expect(text).toContain('SEA');
    expect(text).toContain('BAL');
    expect(text).toContain('In');
    expect(text).toContain('2 GB');
    expect(container.querySelector('[data-testid="logo-nym"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="logo-sea"]')).not.toBeNull();
  });
});
