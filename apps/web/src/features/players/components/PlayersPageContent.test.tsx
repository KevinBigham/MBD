import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayersPageContent from './PlayersPageContent';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const player = {
  id: 'player-1',
  firstName: 'Ada',
  lastName: 'Ace',
  age: 27,
  position: 'CF',
  overallRating: 73,
  displayRating: 69,
  letterGrade: 'B',
  rosterStatus: 'MLB',
  teamId: 'nym',
  serviceTimeDays: 734,
  optionYearsUsed: 0,
  isOutOfOptions: false,
  minorLeagueLevel: null,
  contract: {
    years: 2,
    annualSalary: 8.5,
    totalValue: 17,
    noTradeClause: false,
    noTradeClauseType: 'none',
    playerOption: false,
    teamOption: false,
    optOutYears: [],
    signingBonus: 0,
    buyoutAmount: 0,
    deferredMoney: [],
  },
  ceiling: 78,
  floor: 61,
  developmentProgram: null,
  developmentTrajectory: 'steady',
  personalityTraits: ['Captain'],
  extensionHistory: [],
  stats: {
    pa: 280,
    ab: 250,
    hits: 78,
    doubles: 18,
    triples: 3,
    hr: 14,
    rbi: 47,
    bb: 25,
    k: 46,
    runs: 52,
    hbp: 2,
    sacFlies: 3,
    avg: '.312',
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    losses: 0,
    era: '0.00',
  },
  advanced: null,
} satisfies PlayerDTO;

describe('PlayersPageContent', () => {
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

  async function renderContent(props: {
    query?: string;
    players?: PlayerDTO[];
    onPlayerOpen?: (playerId: string) => void;
    onQueryChange?: (query: string) => void;
  } = {}) {
    const onPlayerOpen = props.onPlayerOpen ?? vi.fn();
    const onQueryChange = props.onQueryChange ?? vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayersPageContent
            onPlayerOpen={onPlayerOpen}
            onQueryChange={onQueryChange}
            players={props.players ?? []}
            query={props.query ?? ''}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    return { onPlayerOpen, onQueryChange };
  }

  it('renders the player table and delegates search and row opening', async () => {
    const { onPlayerOpen, onQueryChange } = await renderContent({ players: [player] });

    expect(container.textContent).toContain('Players');
    expect(container.textContent).toContain('Search and browse all players');
    expect(container.textContent).toContain('Ada Ace');
    expect(container.textContent).toContain('CF');
    expect(container.textContent).toContain('.312');

    const input = container.querySelector('input[placeholder="Search players or nicknames..."]') as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Ada');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(onQueryChange).toHaveBeenCalledWith('Ada');

    await act(async () => {
      container.querySelector('tbody tr')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onPlayerOpen).toHaveBeenCalledWith('player-1');
  });

  it('uses route query state to choose the empty table message', async () => {
    await renderContent();
    expect(container.textContent).toContain('Sim games to see player stats');

    await renderContent({ query: 'missing' });
    expect(container.textContent).toContain('No players found');
  });

  it('marks player search as a route-critical mobile control', async () => {
    await renderContent();

    const input = container.querySelector('input[placeholder="Search players or nicknames..."]') as HTMLInputElement;

    expect(input.getAttribute('data-mobile-critical-control')).toBe('players-search-input');
    expect(input.className).toContain('mobile-critical-control');
    expect(input.className).toContain('focus-ring');
  });
});
