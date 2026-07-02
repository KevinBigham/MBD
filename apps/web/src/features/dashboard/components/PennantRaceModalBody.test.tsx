import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import {
  hasPennantRaceEntries,
  PennantRaceModalBody,
  type PennantRaceDetailView,
} from './PennantRaceModalBody';

vi.mock('@/shared/components/TeamLogo', () => ({
  TeamLogo: ({ teamId }: { teamId: string }) => (
    <span data-testid={`logo-${teamId}`}>{teamId}</span>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyView: PennantRaceDetailView = {
  season: 4,
  day: 5,
  gamesRemaining: 157,
  divisions: [],
  wildcards: [],
};

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
          teamId: 'bal',
          abbreviation: 'BAL',
          name: 'Baltimore Seabirds',
          wins: 85,
          losses: 65,
          pct: 0.567,
          gamesBack: 2.5,
          streak: 'W2',
          projectedWins: 92,
          inWildcard: false,
        },
      ],
    },
  ],
};

describe('PennantRaceModalBody', () => {
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
  });

  async function renderBody(props: {
    loading?: boolean;
    errored?: boolean;
    view?: PennantRaceDetailView | null;
  }) {
    await act(async () => {
      root.render(
        <PennantRaceModalBody
          loading={props.loading ?? false}
          errored={props.errored ?? false}
          view={props.view ?? null}
        />,
      );
    });
  }

  it('renders division and wildcard boards without worker or modal state', async () => {
    await renderBody({ view: richView });

    const text = container.textContent ?? '';
    expect(text).toContain('Divisions');
    expect(text).toContain('AL East');
    expect(text).toContain('NYT');
    expect(text).toContain('95-55');
    expect(text).toContain('.633');
    expect(text).toContain('BOS');
    expect(text).toContain('2 GB');
    expect(text).toContain('proj');
    expect(text).toContain('103');
    expect(text).toContain('Wildcard Picture');
    expect(text).toContain('American League');
    expect(text).toContain('In');
    expect(text).toContain('2.5 GB');
    expect(container.querySelector('[data-testid="logo-nym"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="logo-bal"]')).not.toBeNull();
  });

  it('renders loading, error, missing, and quiet-season states', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading pennant race board...');

    await renderBody({ errored: true });
    expect(container.textContent ?? '').toContain('Could not load pennant race data.');

    await renderBody({ view: null });
    expect(container.textContent ?? '').toContain('No pennant race data available yet.');

    await renderBody({ view: emptyView });
    expect(container.textContent ?? '').toContain('Races will unfold once teams have played enough games');
  });

  it('keeps race detection derived from division and wildcard boards', () => {
    expect(hasPennantRaceEntries(emptyView)).toBe(false);
    expect(hasPennantRaceEntries(richView)).toBe(true);
    expect(
      hasPennantRaceEntries({
        ...emptyView,
        wildcards: richView.wildcards,
      }),
    ).toBe(true);
  });
});
