import { act, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import AwardRaceModal, { type AwardRaceDetailView } from './AwardRaceModal';

const mockWorker = {
  isReady: true,
  getAwardRaceDetail: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyBoard = { mvp: [], cyYoung: [], roy: [] };

const richView: AwardRaceDetailView = {
  season: 6,
  day: 140,
  gamesRemaining: 20,
  al: {
    mvp: Array.from({ length: 10 }, (_, i) => ({
      playerId: `al-mvp-${i + 1}`,
      playerName: `AL MVP Candidate ${i + 1}`,
      teamId: `al-team-${i + 1}`,
      teamAbbreviation: `AL${i + 1}`,
      teamName: `AL Team ${i + 1}`,
      score: 150 - i,
      statCallout: `.${300 - i * 2} / ${40 - i} HR / ${120 - i * 3} RBI`,
    })),
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
};

describe('AwardRaceModal', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onDismiss: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getAwardRaceDetail.mockReset();
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
      root.render(
        <MemoryRouter>
          <AwardRaceModal onDismiss={onDismiss} />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  async function flushFocusTrap() {
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 60);
      });
    });
  }

  it('renders empty-state prompt when the worker returns null', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(null);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Award Race Board');
    expect(text).toContain('No award race data available yet.');
  });

  it('renders a sample-size message when no boards have entries', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue({
      season: 4,
      day: 20,
      gamesRemaining: 140,
      al: emptyBoard,
      nl: emptyBoard,
    });

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Season 4 · Day 20');
    expect(text).toContain('Award races surface once');
  });

  it('renders all three award sections with AL/NL columns and top entries', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('Season 6 · Day 140');
    expect(text).toContain('Games remaining');
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('Rookie of the Year');
    expect(text).toContain('American League');
    expect(text).toContain('National League');
    expect(text).toContain('AL MVP Candidate 1');
    expect(text).toContain('Luis Ortega');
    expect(text).toContain('Evan Walsh');
    expect(text).toContain('Kai Sato');
  });

  it('shows 10 AL MVP candidates ranked 1 through 10', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const text = container.textContent ?? '';
    expect(text).toContain('AL MVP Candidate 1');
    expect(text).toContain('AL MVP Candidate 5');
    expect(text).toContain('AL MVP Candidate 10');
    expect(text).toContain('1.');
    expect(text).toContain('10.');
  });

  it('dismisses on Escape key', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on backdrop click and suppresses click inside the dialog', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

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
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const closeBtn = container.querySelector(
      'button[aria-label="Close award race board"]',
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard focus inside the board and restores launcher focus on close', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <MemoryRouter>
          <button type="button" onClick={() => setIsOpen(true)}>
            Open award race
          </button>
          {isOpen ? <AwardRaceModal onDismiss={() => setIsOpen(false)} /> : null}
        </MemoryRouter>
      );
    }

    await act(async () => {
      root.render(<Harness />);
    });

    const launcher = container.querySelector('button') as HTMLButtonElement;
    launcher.focus();

    await act(async () => {
      launcher.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await flushFocusTrap();

    const closeBtn = container.querySelector(
      'button[aria-label="Close award race board"]',
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(closeBtn);

    const focusableLinks = Array.from(container.querySelectorAll('a')) as HTMLAnchorElement[];
    const lastLink = focusableLinks[focusableLinks.length - 1]!;
    lastLink.focus();

    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(tabEvent);
    });
    expect(tabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(closeBtn);

    closeBtn.focus();
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    await act(async () => {
      document.dispatchEvent(shiftTabEvent);
    });
    expect(shiftTabEvent.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(lastLink);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('uses a 44px close target for touch devices', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const closeBtn = container.querySelector(
      'button[aria-label="Close award race board"]',
    ) as HTMLButtonElement;
    expect(closeBtn.className).toContain('min-h-11');
    expect(closeBtn.className).toContain('min-w-11');
  });

  it('renders prior-season winners context tile when history exists', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue({
      ...richView,
      priorSeasonWinners: [
        {
          award: 'mvp',
          league: 'AL',
          season: 5,
          playerId: 'al-mvp-prior',
          playerName: 'Marcus Vaughn',
          teamId: 'nyy',
          teamAbbreviation: 'NYY',
          summary: '.312 / 36 HR / 108 RBI',
        },
        {
          award: 'cyYoung',
          league: 'NL',
          season: 5,
          playerId: 'nl-cy-prior',
          playerName: 'Diego Alvarez',
          teamId: 'atl',
          teamAbbreviation: 'ATL',
          summary: '2.18 ERA / 228 K / 19-6',
        },
      ],
    });

    await renderModal();

    const tile = container.querySelector('[data-testid="prior-season-winners"]');
    expect(tile).not.toBeNull();
    const tileText = tile?.textContent ?? '';
    expect(tileText).toContain('Season 5 Winners');
    expect(tileText).toContain('AL MVP');
    expect(tileText).toContain('Marcus Vaughn');
    expect(tileText).toContain('NYY');
    expect(tileText).toContain('.312 / 36 HR / 108 RBI');
    expect(tileText).toContain('NL Cy Young');
    expect(tileText).toContain('Diego Alvarez');
    expect(tileText).toContain('ATL');
    expect(tileText).toContain('2.18 ERA / 228 K / 19-6');
  });

  it('omits prior-season tile when no history is available (year 1)', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue({
      ...richView,
      priorSeasonWinners: [],
    });

    await renderModal();

    const tile = container.querySelector('[data-testid="prior-season-winners"]');
    expect(tile).toBeNull();
  });

  it('omits prior-season tile when the field is absent from the payload', async () => {
    mockWorker.getAwardRaceDetail.mockResolvedValue(richView);

    await renderModal();

    const tile = container.querySelector('[data-testid="prior-season-winners"]');
    expect(tile).toBeNull();
  });
});
