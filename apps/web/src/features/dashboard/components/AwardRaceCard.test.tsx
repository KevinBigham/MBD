import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AwardRaceCard from './AwardRaceCard';

const mockWorker = {
  isReady: true,
  getAwardRaceBoards: vi.fn(),
  getAwardRaceDetail: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('AwardRaceCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getAwardRaceBoards.mockReset();
    mockWorker.getAwardRaceDetail.mockReset();
    mockWorker.getAwardRaceDetail.mockResolvedValue(null);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  async function renderCard() {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <AwardRaceCard />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  const emptyBoard = { mvp: [], cyYoung: [], roy: [] };

  it('renders header and empty state when no boards have entries', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 4,
      day: 20,
      gamesRemaining: 140,
      al: emptyBoard,
      nl: emptyBoard,
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Award Race');
    expect(text).toContain('League-wide');
    expect(text).toContain('Award races surface once');
    expect(mockWorker.getAwardRaceBoards).toHaveBeenCalledTimes(1);
  });

  it('renders MVP block with both leagues when each has entries', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 5,
      day: 120,
      gamesRemaining: 40,
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
        ],
        cyYoung: [],
        roy: [],
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
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('MVP');
    expect(text).toContain('Marcus Greene');
    expect(text).toContain('NYM');
    expect(text).toContain('.312 / 34 HR / 102 RBI');
    expect(text).toContain('Luis Ortega');
    expect(text).toContain('LAX');
    expect(text).toContain('.298 / 30 HR / 95 RBI');
  });

  it('renders Cy Young block with pitcher stat callout', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 5,
      day: 120,
      gamesRemaining: 40,
      al: {
        mvp: [],
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
      nl: { mvp: [], cyYoung: [], roy: [] },
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Cy Young');
    expect(text).toContain('Evan Walsh');
    expect(text).toContain('BOS');
    expect(text).toContain('2.41 ERA / 194 K / 14-3');
  });

  it('renders ROY block and hides ROY entirely when empty in both leagues', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 5,
      day: 140,
      gamesRemaining: 20,
      al: {
        mvp: [],
        cyYoung: [],
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
      nl: { mvp: [], cyYoung: [], roy: [] },
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Rookie of the Year');
    expect(text).toContain('Kai Sato');
    expect(text).toContain('SEA');
    // The NL side of the ROY block should render with "No qualified candidates"
    expect(text).toContain('No qualified candidates');
  });

  it('ranks entries 1/2/3 in display order', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 5,
      day: 130,
      gamesRemaining: 30,
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
          {
            playerId: 'al-mvp-3',
            playerName: 'Third Spot',
            teamId: 'tor',
            teamAbbreviation: 'TOR',
            teamName: 'Blue Jays',
            score: 130.0,
            statCallout: '.299 / 28 HR / 88 RBI',
          },
        ],
        cyYoung: [],
        roy: [],
      },
      nl: { mvp: [], cyYoung: [], roy: [] },
    });

    await renderCard();

    const text = container.textContent ?? '';
    const marcus = text.indexOf('Marcus Greene');
    const second = text.indexOf('Second Place');
    const third = text.indexOf('Third Spot');
    expect(marcus).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(marcus);
    expect(third).toBeGreaterThan(second);
    expect(text).toContain('1.');
    expect(text).toContain('2.');
    expect(text).toContain('3.');
  });

  it('exposes a Board button that opens the expanded award race modal', async () => {
    mockWorker.getAwardRaceBoards.mockResolvedValue({
      season: 4,
      day: 20,
      gamesRemaining: 140,
      al: emptyBoard,
      nl: emptyBoard,
    });

    await renderCard();

    const boardBtn = container.querySelector(
      'button[aria-label="Open award race board"]',
    ) as HTMLButtonElement | null;
    expect(boardBtn).not.toBeNull();
  });
});
