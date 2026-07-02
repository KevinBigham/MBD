import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { SeasonStoryReelBody, type SeasonStoryReelView } from './SeasonStoryReelBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const richView: SeasonStoryReelView = {
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

describe('SeasonStoryReelBody', () => {
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
    view?: SeasonStoryReelView | null;
    displayedSeason?: number;
  }) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <SeasonStoryReelBody
            loading={props.loading ?? false}
            errored={props.errored ?? false}
            view={props.view ?? null}
            displayedSeason={props.displayedSeason ?? 2028}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders all rich story reel sections without worker or modal state', async () => {
    await renderBody({ view: richView });

    const text = container.textContent ?? '';
    expect(text).toContain('Storylines');
    expect(text).toContain('Opening Day Walkoff');
    expect(text).toContain('Signature Beats');
    expect(text).toContain('Championship Run');
    expect(text).toContain('Notable Player Arcs');
    expect(text).toContain('Redemption');
    expect(text).toContain('Key Transactions');
    expect(text).toContain('Playoff Path');
    expect(text).toContain('Awards');
    expect(text).toContain('Stat Leaders');
    expect(container.querySelector('a[href="/players/p-redeem?tab=moments"]')).not.toBeNull();
  });

  it('renders loading, error, and missing archive states', async () => {
    await renderBody({ loading: true, displayedSeason: 2027 });
    expect(container.textContent ?? '').toContain('Loading season story...');

    await renderBody({ errored: true, displayedSeason: 2027 });
    expect(container.textContent ?? '').toContain("Could not load this season's story.");

    await renderBody({ view: null, displayedSeason: 2027 });
    expect(container.textContent ?? '').toContain('No archive exists for Season 2027 yet.');
  });

  it('renders the quiet-season prompt for archived seasons without story sections', async () => {
    await renderBody({
      displayedSeason: 2026,
      view: {
        ...richView,
        storylines: [],
        timelineEvents: [],
        signatureBeats: [],
        keyTransactions: [],
        playoffPath: [],
        awards: [],
        statLeaderHighlights: [],
        playerArcs: [],
      },
    });

    expect(container.textContent ?? '').toContain('Season 2026 wrapped with a quiet record');
  });
});
