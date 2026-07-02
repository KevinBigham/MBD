import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SeasonStoryReelSections, type SeasonStoryReelView } from './SeasonStoryReelSections';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const completeStoryReel: SeasonStoryReelView = {
  season: 2028,
  userTeamId: 'nym',
  userTeamName: 'New York Mets',
  userTeamAbbreviation: 'NYM',
  record: { wins: 98, losses: 64 },
  divisionRank: 1,
  playoffResult: 'World Series Champion',
  storylines: ['A dominant run from wire to wire.'],
  timelineEvents: [
    { headline: 'Opening Day Walkoff', summary: 'Tenth-inning heroics in Queens.', day: 1 },
  ],
  signatureBeats: [
    {
      type: 'championship_run',
      description: 'Finished a season for the ages with a World Series title.',
      day: 172,
      impact: 90,
      relevance: 95,
    },
  ],
  keyTransactions: [
    { headline: 'Acquired Ace at the Deadline', summary: 'Traded for a rotation anchor.', impactScore: 88 },
  ],
  playoffPath: [
    { round: 'division_series', result: '3-1', opponentTeamId: 'atl', opponentTeamName: 'Atlanta Braves', didWin: true },
  ],
  awards: [
    { award: 'mvp', playerId: 'p1', playerName: 'Juan Soto', league: 'NL', summary: 'Carried the lineup.' },
  ],
  statLeaderHighlights: [
    { category: 'HR', playerId: 'p2', playerName: 'Pete Alonso', teamId: 'nym', teamAbbreviation: 'NYM', value: '46' },
  ],
  playerArcs: [
    {
      playerId: 'p-redeem',
      playerName: 'Marcus Rivera',
      arcType: 'redemption_arc',
      description: 'Roared back with a 5.1 WAR season after a lost year.',
      relevance: 0.93,
    },
  ],
};

describe('SeasonStoryReelSections', () => {
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

  it('renders the rich story-reel sections and keeps player arc links route-owned', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SeasonStoryReelSections view={completeStoryReel} />
        </MemoryRouter>,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Storylines');
    expect(text).toContain('Timeline');
    expect(text).toContain('Signature Beats');
    expect(text).toContain('Notable Player Arcs');
    expect(text).toContain('Key Transactions');
    expect(text).toContain('Playoff Path');
    expect(text).toContain('Awards');
    expect(text).toContain('Stat Leaders');
    expect(text).toContain('Championship Run');
    expect(text).toContain('Redemption');
    expect(container.querySelector('a[href="/players/p-redeem?tab=moments"]')).not.toBeNull();
  });
});
