import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AwardRaceCardBody, { type AwardBoard } from './AwardRaceCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AwardRaceCardBody', () => {
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

  async function renderBody({
    loading = false,
    al = emptyBoard,
    nl = emptyBoard,
  }: {
    loading?: boolean;
    al?: AwardBoard;
    nl?: AwardBoard;
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AwardRaceCardBody loading={loading} al={al} nl={nl} />
        </MemoryRouter>,
      );
    });
  }

  const emptyBoard: AwardBoard = { mvp: [], cyYoung: [], roy: [] };

  it('renders loading and empty states without route data side effects', async () => {
    await renderBody({ loading: true });
    expect(container.textContent ?? '').toContain('Loading...');

    await renderBody({});
    expect(container.textContent ?? '').toContain('Award races surface once');
  });

  it('renders award sections, league columns, rankings, links, and empty-league copy', async () => {
    await renderBody({
      al: {
        mvp: [
          {
            playerId: 'al-mvp-1',
            playerName: 'Marcus Greene',
            teamId: 'nym',
            teamAbbreviation: 'NYM',
            teamName: 'Mets',
            score: 142.3,
            statCallout: '.312 / 34 HR / 102 RBI',
          },
          {
            playerId: 'al-mvp-2',
            playerName: 'Second Place',
            teamId: 'bos',
            teamAbbreviation: 'BOS',
            teamName: 'Red Sox',
            score: 135.5,
            statCallout: '.305 / 31 HR / 94 RBI',
          },
        ],
        cyYoung: [
          {
            playerId: 'al-cy-1',
            playerName: 'Evan Walsh',
            teamId: 'bos',
            teamAbbreviation: 'BOS',
            teamName: 'Red Sox',
            score: 210.5,
            statCallout: '2.41 ERA / 194 K / 14-3',
          },
        ],
        roy: [],
      },
      nl: {
        mvp: [],
        cyYoung: [],
        roy: [
          {
            playerId: 'nl-roy-1',
            playerName: 'Kai Sato',
            teamId: 'sea',
            teamAbbreviation: 'SEA',
            teamName: 'Mariners',
            score: 92.4,
            statCallout: '.288 / 22 HR / 68 RBI',
          },
        ],
      },
    });

    const text = container.textContent ?? '';
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('Rookie of the Year');
    expect(text).toContain('AL');
    expect(text).toContain('NL');
    expect(text).toContain('Marcus Greene');
    expect(text).toContain('1.');
    expect(text).toContain('Second Place');
    expect(text).toContain('2.');
    expect(text).toContain('.312 / 34 HR / 102 RBI');
    expect(text).toContain('Evan Walsh');
    expect(text).toContain('2.41 ERA / 194 K / 14-3');
    expect(text).toContain('Kai Sato');
    expect(text).toContain('SEA');
    expect(text).toContain('No qualified candidates');

    const playerLinks = Array.from(container.querySelectorAll('a')).map((link) =>
      link.getAttribute('href'),
    );
    expect(playerLinks).toContain('/players/al-mvp-1');
    expect(playerLinks).toContain('/players/al-cy-1');
    expect(playerLinks).toContain('/players/nl-roy-1');
  });
});
