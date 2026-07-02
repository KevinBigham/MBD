import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import type { GMCareer, JobMarket, SignatureMoment } from '@mbd/contracts';
import { GMCareerContentPanel } from './GMCareerContentPanel';

vi.mock('@mbd/sim-core', () => ({
  GameRNG: class GameRNG {
    constructor(_seed: number) {}
  },
  formatMomentDescription: vi.fn((moment: SignatureMoment, teamName: string) => `${teamName} ${moment.type}`),
  getTeamById: vi.fn((teamId: string) => {
    if (teamId === 'nym') return { city: 'New York', name: 'Tycoons', abbreviation: 'NYT' };
    if (teamId === 'bos') return { city: 'Boston', name: "Noreasters", abbreviation: 'BOS' };
    return null;
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const career: GMCareer = {
  careerHistory: [
    {
      teamId: 'bos',
      seasons: 3,
      record: { wins: 250, losses: 236 },
      championships: 0,
      hiredSeason: 1,
      firedSeason: 3,
      firedReason: 'Missed playoffs three consecutive seasons.',
      reputation: 42,
    },
    {
      teamId: 'nym',
      seasons: 2,
      record: { wins: 190, losses: 134 },
      championships: 1,
      hiredSeason: 4,
      firedSeason: null,
      firedReason: null,
      reputation: 78,
    },
  ],
  currentTeamId: 'nym',
  reputation: 78,
  overallRecord: { wins: 440, losses: 370 },
  championships: 1,
  hiredSeason: 4,
  firedSeasons: [3],
  careerAchievements: ['Won 1 championship.'],
  jobSearchActive: false,
  lastFiredReason: null,
};

const activeJobMarket: JobMarket = {
  availableJobs: [
    {
      teamId: 'bos',
      ownerArchetype: 'Hands-Off',
      budget: 'High',
      expectations: 'Win now',
      difficulty: 'Medium',
      attractiveness: 0.75,
    },
  ],
  applicationDeadlineSeason: 6,
};

const teamMoment: SignatureMoment = {
  season: 5,
  day: 120,
  timestamp: 'S5D120',
  type: 'deadline_buyer',
  description: 'The room doubled down on contention.',
  impact: 21,
  relevance: 0.91,
  isPlayoff: false,
  isEliminationGame: false,
  worldSeriesClincher: false,
  round: null,
};

describe('GMCareerContentPanel', () => {
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

  it('renders GM profile, career record, timeline, and team identity moments', async () => {
    await act(async () => {
      root.render(
        <GMCareerContentPanel
          career={career}
          gmName="Kevin Bigham"
          jobMarket={{ availableJobs: [], applicationDeadlineSeason: null }}
          teamMoments={[teamMoment]}
        />,
      );
    });

    expect(container.textContent).toContain('Kevin Bigham');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(4);
    expect(container.textContent).toContain('New York Tycoons');
    expect(container.textContent).toContain('440');
    expect(container.textContent).toContain('370');
    expect(container.textContent).toContain('.543');
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Fired');
    expect(container.textContent).toContain('Missed playoffs three consecutive seasons.');
    expect(container.textContent).toContain('Active');
    expect(container.textContent).toContain('Team Identity');
    expect(container.textContent).toContain('The room doubled down on contention.');
  });

  it('renders active job search state and available jobs', async () => {
    await act(async () => {
      root.render(
        <GMCareerContentPanel
          career={{ ...career, jobSearchActive: true }}
          gmName="Kevin Bigham"
          jobMarket={activeJobMarket}
          teamMoments={[]}
        />,
      );
    });

    expect(container.textContent).toContain('Job Search Active');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(5);
    expect(container.textContent).toContain('Job Market');
    expect(container.textContent).toContain('Boston Noreasters');
    expect(container.textContent).toContain('Medium');
    expect(container.textContent).toContain('Win now');
    expect(container.textContent).toContain('Application deadline: Season 6');
  });
});
