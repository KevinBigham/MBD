import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { TimelineComparison } from '@mbd/contracts';
import type { DynastyTimelineChapter } from '../lib/buildDynastyTimelineChapters';
import TimelinePanel from './TimelinePanel';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const comparison: TimelineComparison = {
  branchMeta: {
    id: 'branch-1',
    saveId: 'branch-1',
    branchedAtSeason: 4,
    branchedAtDay: 62,
    description: 'Aggressive deadline push',
    createdAt: '2026-04-04T00:00:00.000Z',
  },
  recordDelta: {
    parent: { wins: 85, losses: 77, pct: 0.525 },
    branch: { wins: 91, losses: 71, pct: 0.562 },
    delta: 6,
  },
  standingsDelta: {
    parent: { divisionRank: 2, gamesBack: 4 },
    branch: { divisionRank: 1, gamesBack: 0 },
    delta: 1,
  },
  rosterDelta: {
    parent: ['Aaron Judge'],
    branch: ['Aaron Judge', 'Spencer Jones'],
    added: ['Spencer Jones'],
    lost: [],
    delta: 1,
  },
  championshipsDelta: { parent: 0, branch: 1, delta: 1 },
  tradesDelta: { parent: 1, branch: 3, delta: 2 },
};

const chapter: DynastyTimelineChapter = {
  id: 'chapter-1',
  title: 'Peak Years',
  startSeason: 2,
  endSeason: 2,
  dominantState: 'peak',
  championshipCount: 1,
  playoffSeasonCount: 1,
  bestWinTotal: 97,
  averageWins: 97,
  dynastyScoreDelta: 25,
  keyStoryline: 'Won the World Series in six games.',
  notableAdds: ['Deadline blockbuster reshaped the race'],
  notableLosses: ['Anthony Rizzo retired'],
  seasons: [
    {
      id: 'season-2',
      season: 2,
      record: '97-65',
      wins: 97,
      losses: 65,
      playoffResult: 'Champion',
      championship: true,
      playoffAppearance: true,
      dynastyScore: 215,
      keyAcquisitions: ['Deadline blockbuster reshaped the race'],
      keyDepartures: ['Anthony Rizzo retired'],
      storylineHook: 'Won the World Series',
      state: 'peak',
      memoryBeats: [
        {
          id: 'trade-2',
          kind: 'trade',
          label: 'Defining Trade',
          summary: 'Mike Trout changed the lineup ceiling.',
          playerIds: ['player-mvp'],
          playerNameFallbacks: { 'player-mvp': 'Archived Mike Trout' },
          teamIds: ['nym'],
          gameIndex: 42,
        },
        {
          id: 'identity-2',
          kind: 'identity',
          label: 'Lineup of Era',
          summary: 'The lineup became the club identity.',
          playerIds: [],
          teamIds: ['nym'],
        },
      ],
    },
  ],
};

describe('TimelinePanel', () => {
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

  it('renders branch comparisons and expanded dynasty timeline chapters', async () => {
    const onToggleChapter = vi.fn();
    const onOpenRecap = vi.fn();

    await act(async () => {
      root.render(
        <MemoryRouter>
          <TimelinePanel
            canOpenRecap={() => true}
            dynastyTimelineChapters={[chapter]}
            expandedTimelineChapterId="chapter-1"
            onOpenRecap={onOpenRecap}
            onToggleChapter={onToggleChapter}
            playerNames={{ 'player-mvp': 'Mike Trout' }}
            teamNames={{ nym: 'New York Tycoons' }}
            timelineComparisons={[comparison]}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('What-If Timeline Branches');
    expect(container.textContent).toContain('Aggressive deadline push');
    expect(container.textContent).toContain('91-71');
    expect(container.textContent).toContain('Spencer Jones');
    expect(container.textContent).toContain('Franchise Timeline');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
    expect(container.textContent).toContain('Peak Years');
    expect(container.textContent).toContain('Timeline Memory');
    expect(container.textContent).toContain('Defining Trade');
    const identityBadge = Array.from(container.querySelectorAll('span')).find((span) =>
      span.textContent === 'Lineup of Era',
    );
    expect(identityBadge?.className).toContain('text-accent-primary');
    expect(container.querySelector('a[href="/players/player-mvp"]')?.textContent).toContain('Mike Trout');
    const boxScoreLink = container.querySelector('a[href="/games/42"]');
    expect(boxScoreLink).toBeTruthy();
    expect(boxScoreLink?.textContent).toContain('Box Score');
    expect(container.querySelector('[data-testid="timeline-memory-team"]')?.textContent).toContain('New York Tycoons');

    const chapterToggle = container.querySelector<HTMLButtonElement>('[data-testid="dynasty-chapter-toggle"]');
    expect(chapterToggle).toBeTruthy();
    await act(async () => {
      chapterToggle?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onToggleChapter).toHaveBeenCalledWith('chapter-1');

    const recapButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Open Recap'),
    );
    expect(recapButton).toBeTruthy();
    await act(async () => {
      recapButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenRecap).toHaveBeenCalledWith(2);
  });

  it('renders empty states before branches or timeline chapters exist', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TimelinePanel
            canOpenRecap={() => false}
            dynastyTimelineChapters={[]}
            expandedTimelineChapterId={null}
            onOpenRecap={vi.fn()}
            onToggleChapter={vi.fn()}
            playerNames={{}}
            teamNames={{}}
            timelineComparisons={[]}
          />
        </MemoryRouter>,
      );
    });

    expect(container.textContent).toContain('No what-if branches are available for this save.');
    expect(container.textContent).toContain('The franchise timeline starts once the first season closes.');
  });

  it('uses archived fallback names for timeline memory links when live resolver names are missing', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <TimelinePanel
            canOpenRecap={() => true}
            dynastyTimelineChapters={[chapter]}
            expandedTimelineChapterId="chapter-1"
            onOpenRecap={vi.fn()}
            onToggleChapter={vi.fn()}
            playerNames={{}}
            teamNames={{ nym: 'New York Tycoons' }}
            timelineComparisons={[]}
          />
        </MemoryRouter>,
      );
    });

    expect(container.querySelector('a[href="/players/player-mvp"]')?.textContent).toContain('Archived Mike Trout');
    expect(container.textContent).not.toContain('player-mvp');
  });
});
