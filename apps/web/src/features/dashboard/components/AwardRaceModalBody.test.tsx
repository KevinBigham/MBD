import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import {
  AwardRaceModalBody,
  hasAwardRaceEntries,
  type AwardRaceDetailView,
} from './AwardRaceModalBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyBoard = { mvp: [], cyYoung: [], roy: [] };

const richView: AwardRaceDetailView = {
  season: 6,
  day: 140,
  gamesRemaining: 20,
  al: {
    mvp: [
      {
        playerId: 'al-mvp-1',
        playerName: 'Rafael Cruz',
        teamId: 'nyy',
        teamAbbreviation: 'NYY',
        teamName: 'Yankees',
        score: 154.2,
        statCallout: '.312 / 42 HR / 118 RBI',
      },
    ],
    cyYoung: [
      {
        playerId: 'al-cy-1',
        playerName: 'Mina Stone',
        teamId: 'bos',
        teamAbbreviation: 'BOS',
        teamName: 'Red Sox',
        score: 210.5,
        statCallout: '2.41 ERA / 194 K / 14-3',
      },
    ],
    roy: [
      {
        playerId: 'al-roy-1',
        playerName: 'Kai Sato',
        teamId: 'sea',
        teamAbbreviation: 'SEA',
        teamName: 'Mariners',
        score: 92.4,
        statCallout: '.288 / 22 HR / 68 RBI',
      },
    ],
  },
  nl: {
    mvp: [
      {
        playerId: 'nl-mvp-1',
        playerName: 'Luis Ortega',
        teamId: 'lax',
        teamAbbreviation: 'LAX',
        teamName: 'Dodgers',
        score: 138.7,
        statCallout: '.298 / 30 HR / 95 RBI',
      },
    ],
    cyYoung: [],
    roy: [],
  },
  priorSeasonWinners: [
    {
      award: 'mvp',
      league: 'AL',
      season: 5,
      playerId: 'prior-mvp',
      playerName: 'Marcus Vaughn',
      teamId: 'nyy',
      teamAbbreviation: 'NYY',
      summary: '.312 / 36 HR / 108 RBI',
    },
  ],
};

describe('AwardRaceModalBody', () => {
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
    view?: AwardRaceDetailView | null;
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AwardRaceModalBody
            loading={props.loading ?? false}
            errored={props.errored ?? false}
            view={props.view ?? null}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders rich award boards and prior-season context without modal state', async () => {
    await renderBody({ view: richView });

    const text = container.textContent ?? '';
    expect(text).toContain('Season 5 Winners');
    expect(text).toContain('AL MVP');
    expect(text).toContain('Marcus Vaughn');
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('Rookie of the Year');
    expect(text).toContain('American League');
    expect(text).toContain('National League');
    expect(text).toContain('Rafael Cruz');
    expect(text).toContain('Mina Stone');
    expect(text).toContain('Kai Sato');
    expect(text).toContain('Luis Ortega');
    expect(container.querySelector('a[href="/players/al-mvp-1"]')).not.toBeNull();
    expect(container.querySelector('a[href="/players/prior-mvp"]')).not.toBeNull();
  });

  it('renders loading, error, missing, and sample-size states', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading award race board...');

    await renderBody({ errored: true });
    expect(container.textContent ?? '').toContain('Could not load award race data.');

    await renderBody({ view: null });
    expect(container.textContent ?? '').toContain('No award race data available yet.');

    await renderBody({
      view: {
        season: 4,
        day: 20,
        gamesRemaining: 140,
        al: emptyBoard,
        nl: emptyBoard,
      },
    });
    expect(container.textContent ?? '').toContain('Award races surface once');
  });

  it('keeps entry detection derived from AL and NL award boards', () => {
    expect(
      hasAwardRaceEntries({
        season: 4,
        day: 20,
        gamesRemaining: 140,
        al: emptyBoard,
        nl: emptyBoard,
      }),
    ).toBe(false);
    expect(hasAwardRaceEntries(richView)).toBe(true);
  });
});
