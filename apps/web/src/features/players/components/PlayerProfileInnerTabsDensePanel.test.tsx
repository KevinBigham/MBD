import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import MomentsTab from './MomentsTab';
import PersonalityTab from './PersonalityTab';
import StatsTab from './StatsTab';
import StoryArcsTab from './StoryArcsTab';
import type { PlayerProfileView } from './playerProfileShared';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const basePlayer = {
  id: 'player-1',
  firstName: 'Marco',
  lastName: 'Ascension',
  position: 'SS',
  historical: true,
  stats: {
    pa: 255,
    ab: 221,
    hits: 82,
    doubles: 21,
    triples: 3,
    hr: 14,
    rbi: 48,
    bb: 31,
    k: 57,
    runs: 44,
    hbp: 2,
    sacFlies: 4,
    avg: '.322',
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
  advanced: {
    war: 4.8,
    avg: 0.322,
    obp: 0.388,
    slg: 0.546,
    ops: 0.934,
    iso: 0.224,
    woba: 0.378,
    wrcPlus: 142,
    opsPlus: 137,
    fip: null,
    xfip: null,
    whip: null,
    kPer9: null,
    bbPer9: null,
    kBb: null,
  },
  personalityTraits: ['Leader', 'Fan Favorite'],
};

const view = {
  player: basePlayer,
  moments: [{
    type: 'walk_off_hr',
    season: 5,
    day: 92,
    impact: 4,
    relevance: 0.87,
    description: 'Walk-off double turned the series.',
  }],
  storyArcs: [{
    playerId: 'player-1',
    arcType: 'prospect_rise',
    phase: 'rising',
    startSeason: 5,
    startDay: 62,
    resolvedSeason: null,
    milestones: ['Marco Ascension is climbing fast through the system.'],
  }],
  personalityProfile: {
    playerId: 'player-1',
    archetype: 'clubhouse_engine',
    morale: {
      playerId: 'player-1',
      score: 66,
      trend: 'rising',
      summary: 'Responding well to the current program.',
      lastUpdated: 'S5D92',
    },
    personality: {
      workEthic: 71,
      mentalToughness: 64,
      leadership: 57,
      competitiveness: 69,
    },
    summary: 'High-motor infielder with strong internal drive.',
  },
  careerStats: {
    seasonsPlayed: 4,
    peakOverall: 72,
    allStarSelections: 1,
    championshipRings: 0,
    war: 11.4,
    gamesPlayed: 418,
    teamIds: ['nym'],
    batting: {
      hits: 482,
      hr: 58,
      rbi: 231,
    },
    pitching: null,
    saves: null,
  },
} as unknown as PlayerProfileView;

describe('PlayerProfile inner tab dense panels', () => {
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

  async function renderTab(element: React.ReactElement) {
    await act(async () => {
      root.render(element);
      await Promise.resolve();
    });
  }

  it('renders stats sections through shared dense panels', async () => {
    await renderTab(<StatsTab view={view} />);

    expect(container.textContent).toContain('Season Stats');
    expect(container.textContent).toContain('Advanced Stats');
    expect(container.textContent).toContain('Career Totals');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(3);
  });

  it('renders signature moments through the shared dense panel', async () => {
    await renderTab(<MomentsTab view={view} />);

    expect(container.textContent).toContain('Signature Moments');
    expect(container.textContent).toContain('Walk-off double turned the series.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders story arcs through the shared dense panel', async () => {
    await renderTab(<StoryArcsTab view={view} />);

    expect(container.textContent).toContain('Story Arcs');
    expect(container.textContent).toContain('Marco Ascension is climbing fast through the system.');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(1);
  });

  it('renders personality sections through shared dense panels', async () => {
    await renderTab(<PersonalityTab view={view} />);

    expect(container.textContent).toContain('Personality Profile');
    expect(container.textContent).toContain('Traits');
    expect(container.querySelectorAll('[data-testid="dense-panel-body"]')).toHaveLength(2);
  });
});
