import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CareerRetrospectiveCardBody, { type CareerRetrospectiveView } from './CareerRetrospectiveCardBody';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const emptyShelf = {
  mvp: 0,
  cyYoung: 0,
  rookieOfTheYear: 0,
  goldGlove: 0,
  silverSlugger: 0,
  allStar: 0,
  other: 0,
  total: 0,
};

function createView(overrides: Partial<CareerRetrospectiveView> = {}): CareerRetrospectiveView {
  return {
    franchise: {
      gmName: 'Sam Riley',
      teamId: 'nym',
      teamName: 'New York Mets',
      abbreviation: 'NYM',
      hiredSeason: 2024,
      currentSeason: 2030,
    },
    tenure: {
      yearsServed: 7,
      overallRecord: { wins: 623, losses: 509 },
      winPct: 0.55,
      reputation: 78,
    },
    titles: {
      worldSeries: 1,
      pennants: 2,
      divisionTitles: 3,
      playoffAppearances: 4,
    },
    seasonHistory: [],
    teamMoments: [],
    legendArcs: [],
    signatureArcs: [],
    awardsShelf: emptyShelf,
    topRivalry: null,
    ...overrides,
  };
}

describe('CareerRetrospectiveCardBody', () => {
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

  async function renderBody(
    props: Partial<Parameters<typeof CareerRetrospectiveCardBody>[0]> = {},
  ) {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CareerRetrospectiveCardBody
            loading={props.loading ?? false}
            view={props.view === undefined ? createView() : props.view}
            onSelectSeason={props.onSelectSeason ?? vi.fn()}
          />
        </MemoryRouter>,
      );
    });
  }

  it('renders loading, unavailable, and early-career empty states', async () => {
    await renderBody({ loading: true, view: null });
    expect(container.textContent).toContain('Loading...');

    await renderBody({ loading: false, view: null });
    expect(container.textContent).toContain('Career retrospective is unavailable right now.');

    await renderBody({
      view: createView({
        titles: { worldSeries: 0, pennants: 0, divisionTitles: 0, playoffAppearances: 0 },
      }),
    });
    expect(container.textContent).toContain('Your career story is still being written');
  });

  it('renders title content and delegates story-reel season selection', async () => {
    const onSelectSeason = vi.fn();
    await renderBody({
      onSelectSeason,
      view: createView({
        teamMoments: [
          {
            type: 'championship_run',
            description: 'Finished a season for the ages with a World Series title.',
            season: 2028,
            day: 172,
            impact: 90,
            relevance: 95,
          },
        ],
      }),
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Sam Riley');
    expect(text).toContain('World Series');
    expect(text).toContain('Signature Beats');
    expect(text).toContain('Season 2028');

    const button = container.querySelector('button[aria-label="Open season 2028 story reel"]');
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectSeason).toHaveBeenCalledWith(2028);
  });
});
