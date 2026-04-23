import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import CareerRetrospectiveCard from './CareerRetrospectiveCard';

const mockWorker = {
  isReady: true,
  getCareerRetrospective: vi.fn(),
};

vi.mock('@/shared/hooks/useWorker', () => ({
  useWorker: () => mockWorker,
}));

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

const baseView = {
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
  seasonHistory: [] as Array<{ season: number; winPct: number }>,
  teamMoments: [] as Array<{
    type: string;
    description: string;
    season: number;
    day: number | null;
    impact: number;
    relevance: number;
  }>,
  legendArcs: [] as Array<{
    playerId: string;
    playerName: string;
    arcType: string;
    resolvedSeason: number;
    milestoneHeadline: string | null;
  }>,
  signatureArcs: [] as Array<{
    playerId: string;
    playerName: string;
    arcType: string;
    season: number;
    description: string;
    relevance: number;
  }>,
  awardsShelf: emptyShelf,
  topRivalry: null as null | {
    opponentTeamId: string;
    opponentTeamName: string;
    opponentAbbreviation: string;
    intensity: number;
    summary: string;
    currentSeasonRecord: string;
    historicalRecord: string;
  },
};

describe('CareerRetrospectiveCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    mockWorker.getCareerRetrospective.mockReset();
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
          <CareerRetrospectiveCard />
        </MemoryRouter>,
      );
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it('renders header and early-career empty state when no history has accrued', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      titles: { worldSeries: 0, pennants: 0, divisionTitles: 0, playoffAppearances: 0 },
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Career Retrospective');
    expect(text).toContain('GM dossier');
    expect(text).toContain('Your career story is still being written');
    expect(mockWorker.getCareerRetrospective).toHaveBeenCalledTimes(1);
  });

  it('renders tenure strip and title tiles when titles have been won', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue(baseView);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Sam Riley');
    expect(text).toContain('NYM');
    expect(text).toContain('S2024-S2030');
    expect(text).toContain('623-509');
    expect(text).toContain('.550');
    expect(text).toContain('World Series');
    expect(text).toContain('Pennants');
    expect(text).toContain('Division Titles');
    expect(text).toContain('Playoff Appearances:');
  });

  it('renders awards shelf counts when awards exist', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      awardsShelf: {
        mvp: 2,
        cyYoung: 1,
        rookieOfTheYear: 1,
        goldGlove: 4,
        silverSlugger: 3,
        allStar: 11,
        other: 0,
        total: 22,
      },
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Awards Shelf');
    expect(text).toContain('MVP');
    expect(text).toContain('Cy Young');
    expect(text).toContain('ROY');
    expect(text).toContain('Gold Glove');
    expect(text).toContain('Silver Slugger');
    expect(text).toContain('All-Star');
    expect(text).toContain('22');
  });

  it('renders signature beats with season context', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      teamMoments: [
        {
          type: 'championship_run',
          description: 'Finished a season for the ages with a World Series title.',
          season: 2028,
          day: 172,
          impact: 90,
          relevance: 95,
        },
        {
          type: 'contention_collapse',
          description: 'Blew a 7-game lead in the final stretch.',
          season: 2026,
          day: 150,
          impact: -60,
          relevance: 75,
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Signature Beats');
    expect(text).toContain('Championship Run');
    expect(text).toContain('World Series title');
    expect(text).toContain('Season 2028');
    expect(text).toContain('Day 172');
    expect(text).toContain('Contention Collapse');
  });

  it('renders legend arcs with resolved season', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      legendArcs: [
        {
          playerId: 'p-leg-1',
          playerName: 'Darnell Hawkins',
          arcType: 'hall_of_fame_track',
          resolvedSeason: 2029,
          milestoneHeadline: 'Cleared 3000 career hits.',
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Legend Arcs');
    expect(text).toContain('Darnell Hawkins');
    expect(text).toContain('Hall Of Fame Track');
    expect(text).toContain('S2029');
    expect(text).toContain('3000 career hits');
  });

  it('renders Notable Player Arcs section with player-arc signature moments', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      signatureArcs: [
        {
          playerId: 'p-redeem',
          playerName: 'Marcus Rivera',
          arcType: 'redemption_arc',
          season: 2027,
          description: 'Roared back with a 5.1 WAR season after a lost year.',
          relevance: 0.93,
        },
        {
          playerId: 'p-veteran',
          playerName: 'Henry Ishikawa',
          arcType: 'late_career_peak',
          season: 2029,
          description: 'Posted a career-best season at age 38.',
          relevance: 0.91,
        },
        {
          playerId: 'p-rookie',
          playerName: 'Tito Delgado',
          arcType: 'rookie_breakout',
          season: 2026,
          description: 'Debut season 4.0 WAR and ROY vote share.',
          relevance: 0.88,
        },
      ],
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Notable Player Arcs');
    expect(text).toContain('Marcus Rivera');
    expect(text).toContain('Redemption');
    expect(text).toContain('S2027');
    expect(text).toContain('Henry Ishikawa');
    expect(text).toContain('Late-Career Peak');
    expect(text).toContain('Tito Delgado');
    expect(text).toContain('Rookie Breakout');
  });

  it('does not render Notable Player Arcs when signatureArcs is empty', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue(baseView);

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).not.toContain('Notable Player Arcs');
  });

  it('renders season arc sparkline strip when two or more seasons are logged', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      seasonHistory: [
        { season: 2024, winPct: 0.48 },
        { season: 2025, winPct: 0.52 },
        { season: 2026, winPct: 0.61 },
        { season: 2027, winPct: 0.55 },
      ],
    });

    await renderCard();

    const strip = container.querySelector('[data-testid="season-winpct-strip"]');
    expect(strip).not.toBeNull();
    const text = strip?.textContent ?? '';
    expect(text).toContain('Season Arc');
    expect(text).toContain('4 seasons');
    expect(text).toContain('S2024');
    expect(text).toContain('S2027');
    expect(text).toContain('Peak');
    expect(text).toContain('Low');
    expect(text).toContain('.610');
    expect(text).toContain('.480');
  });

  it('does not render season arc strip for a single-season career', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      seasonHistory: [{ season: 2024, winPct: 0.55 }],
    });

    await renderCard();

    const strip = container.querySelector('[data-testid="season-winpct-strip"]');
    expect(strip).toBeNull();
  });

  it('renders top rivalry block with intensity and head-to-head records', async () => {
    mockWorker.getCareerRetrospective.mockResolvedValue({
      ...baseView,
      topRivalry: {
        opponentTeamId: 'phi',
        opponentTeamName: 'Philadelphia Phillies',
        opponentAbbreviation: 'PHI',
        intensity: 82,
        summary: 'Back-to-back NLCS showdowns and a blockbuster trade.',
        currentSeasonRecord: '11-8',
        historicalRecord: '58-42',
      },
    });

    await renderCard();

    const text = container.textContent ?? '';
    expect(text).toContain('Top Rivalry');
    expect(text).toContain('Philadelphia Phillies');
    expect(text).toContain('NLCS showdowns');
    expect(text).toContain('82');
    expect(text).toContain('11-8');
    expect(text).toContain('58-42');
  });
});
