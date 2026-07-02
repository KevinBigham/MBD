import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import PlayerProfilePageContent from './PlayerProfilePageContent';
import type { PlayerProfileView } from './playerProfileShared';
import type { PlayerProfilePageActions } from './PlayerProfilePageContent';

vi.mock('./ProfileHeader', () => ({
  default: ({ player }: { player: { firstName: string; lastName: string } }) => (
    <div data-testid="profile-header">{player.firstName} {player.lastName}</div>
  ),
}));

vi.mock('./PlayerProfileTabsPanel', () => ({
  default: ({ activeTab, view, onTabChange }: {
    activeTab: string;
    view: PlayerProfileView;
    onTabChange: (nextValue: string) => void;
  }) => (
    <div data-testid="profile-tabs">
      <span>{activeTab}</span>
      <span>{view.player?.id}</span>
      <button type="button" onClick={() => onTabChange('history')}>History Tab</button>
    </div>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const player = {
  id: 'player-1',
  firstName: 'Marco',
  lastName: 'Ascension',
  age: 23,
  position: 'SS',
  overallRating: 67,
  displayRating: 58,
  letterGrade: 'B',
  rosterStatus: 'AA',
  teamId: 'nym',
  serviceTimeDays: 86,
  optionYearsUsed: 1,
  isOutOfOptions: false,
  minorLeagueLevel: 'AA',
  ceiling: 72,
  floor: 55,
  developmentProgram: 'mlb_prep',
  developmentTrajectory: 'ahead_of_curve',
  personalityTraits: ['Leader'],
  contract: {
    years: 1,
    annualSalary: 2.4,
    totalValue: 2.4,
    noTradeClause: false,
    noTradeClauseType: 'none',
    playerOption: false,
    teamOption: false,
    optOutYears: [],
    signingBonus: 0,
    buyoutAmount: 0,
    deferredMoney: [],
  },
  extensionHistory: [],
  stats: null,
  advanced: null,
  historical: false,
  historicalSummary: null,
  activeStory: null,
  storyHistory: [],
} satisfies NonNullable<PlayerProfileView['player']>;

const view = {
  player,
  personalityProfile: null,
  developmentReports: null,
  careerStats: null,
  moments: [],
  nicknames: null,
  storyArcs: [],
  milestoneAlerts: [],
  scoutConflict: null,
  scoutingReport: null,
  scoutingHistoryNote: 'No scouting history yet.',
} satisfies PlayerProfileView;

function buildActions(overrides: Partial<PlayerProfilePageActions> = {}): PlayerProfilePageActions {
  return {
    actionState: null,
    busyAction: null,
    cancelRosterAction: vi.fn(),
    confirmPendingRosterAction: vi.fn(),
    handleExtend: vi.fn(),
    pendingRosterAction: null,
    requestRosterAction: vi.fn(),
    ...overrides,
  };
}

describe('PlayerProfilePageContent', () => {
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

  async function renderContent(
    props: Partial<Parameters<typeof PlayerProfilePageContent>[0]> = {},
  ) {
    const onTabChange = vi.fn();
    const profileActions = buildActions();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <PlayerProfilePageContent
            activeTab="stats"
            canDemote={false}
            canDfa
            canPromote
            isUserTeamPlayer
            onTabChange={onTabChange}
            player={player}
            profileActions={profileActions}
            view={view}
            {...props}
          />
        </MemoryRouter>,
      );
      await vi.dynamicImportSettled();
      await Promise.resolve();
    });

    return { onTabChange, profileActions };
  }

  it('renders the profile shell and delegates tab/action callbacks', async () => {
    const { onTabChange, profileActions } = await renderContent();

    expect(container.querySelector('a[href="/players"]')?.textContent).toContain('Back to Players');
    expect(container.querySelector('[data-testid="profile-header"]')?.textContent).toContain('Marco Ascension');
    expect(container.querySelector('[data-testid="profile-tabs"]')?.textContent).toContain('player-1');
    expect(container.querySelector('a[href="/players/compare?a=player-1"]')).toBeTruthy();
    const shopPlayerLink = Array.from(container.querySelectorAll('a')).find((link) =>
      link.textContent?.includes('Shop Player'),
    );
    expect(shopPlayerLink?.getAttribute('href')).toContain('/trade?playerId=player-1');
    expect(shopPlayerLink?.getAttribute('href')).toContain('mode=quick');
    expect(container.textContent).toContain('Contract Snapshot');

    await act(async () => {
      container.querySelector('[data-testid="profile-tabs"] button')?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      );
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('Extend Contract'))
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onTabChange).toHaveBeenCalledWith('history');
    expect(profileActions.handleExtend).toHaveBeenCalledTimes(1);
  });

  it('renders the not-found state without player controls', async () => {
    await renderContent({
      canDemote: false,
      canDfa: false,
      canPromote: false,
      isUserTeamPlayer: false,
      player: null,
      view: null,
    });

    expect(container.textContent).toContain('Player Not Found');
    expect(container.textContent).toContain('The requested player profile is unavailable');
    expect(container.querySelector('[data-testid="profile-header"]')).toBeFalsy();
    expect(container.querySelector('a[href="/players/compare?a=player-1"]')).toBeFalsy();
  });
});
