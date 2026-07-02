import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { AwardHistoryEntry } from '@mbd/contracts';
import HistoryAwardsTabPanel from './HistoryAwardsTabPanel';
import type { HallOfFameEntryView } from './HallOfFamePanel';
import type { AchievementSummary } from './TrophyRoomPanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const hallOfFame: HallOfFameEntryView[] = [
  {
    playerId: 'hof-1',
    playerName: 'Maya Torres',
    position: 'CF',
    seasonsPlayed: 18,
    teamIds: ['nym'],
    inductionSeason: 12,
    score: 98,
    inductionType: 'first_ballot',
    careerStats: {
      batting: { hits: 3012, hr: 412, rbi: 1530 },
      pitching: null,
    },
  },
];

const achievements: AchievementSummary[] = [
  {
    id: 'champion',
    category: 'dynasty',
    name: 'Champion',
    description: 'Win the World Series.',
    unlocked: true,
    unlockedAt: 'S2D180',
    unlockSummary: 'Won the World Series.',
    progress: {
      current: 1,
      target: 1,
      summary: 'World Series titles',
    },
  },
  {
    id: 'decade',
    category: 'longevity',
    name: 'Decade',
    description: 'Stay with one club for 10 seasons.',
    unlocked: false,
    unlockedAt: null,
    unlockSummary: null,
    progress: {
      current: 2,
      target: 10,
      summary: 'Seasons managed',
    },
  },
];

const awardHistory: AwardHistoryEntry[] = [
  {
    season: 9,
    award: 'CY_YOUNG',
    league: 'NL',
    playerId: 'pitcher-1',
    teamId: 'nym',
    summary: 'A 2.18 ERA and 231 strikeouts anchored the staff.',
  },
];

function formatAwardLabel(value: string): string {
  return value === 'CY_YOUNG' ? 'Cy Young' : 'MVP';
}

function playerName(playerId: string): string {
  if (playerId === 'pitcher-1') return 'Elena Vargas';
  return 'Unknown Player';
}

function teamName(teamId: string | null): string {
  if (teamId === 'nym') return 'New York Tycoons';
  return 'Unknown Club';
}

describe('HistoryAwardsTabPanel', () => {
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

  it('composes Hall of Fame, trophy room, and award ledger panels for the awards tab', async () => {
    const onSelectAchievement = vi.fn();

    await act(async () => {
      root.render(
        <HistoryAwardsTabPanel
          achievements={achievements}
          awardHistory={awardHistory}
          formatAwardLabel={formatAwardLabel}
          hallOfFame={hallOfFame}
          onSelectAchievement={onSelectAchievement}
          playerName={playerName}
          selectedAchievement={achievements[0]!}
          teamName={teamName}
        />,
      );
    });

    expect(container.textContent).toContain('Hall of Fame');
    expect(container.textContent).toContain('Maya Torres');
    expect(container.textContent).toContain('Trophy Room');
    expect(container.textContent).toContain('Champion');
    expect(container.textContent).toContain('Award Ledger');
    expect(container.textContent).toContain('Season 9 NL Cy Young');
    expect(container.textContent).toContain('Elena Vargas');

    const decadeButton = Array.from(container.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Decade'));

    await act(async () => {
      decadeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectAchievement).toHaveBeenCalledWith('decade');
  });
});
