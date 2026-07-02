import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_GUIDANCE,
  REQUIRED_ASSISTANT_ROUTE_KEYS,
  buildAssistantNextAction,
  buildStoryCallback,
  resolveAssistantRouteKey,
  selectRouteGuidance,
} from './assistantGuidance';

describe('assistantGuidance', () => {
  it('normalizes aliases and dynamic routes to stable guidance keys', () => {
    expect(resolveAssistantRouteKey('/')).toBe('setup');
    expect(resolveAssistantRouteKey('/league/standings')).toBe('standings');
    expect(resolveAssistantRouteKey('/standings')).toBe('standings');
    expect(resolveAssistantRouteKey('/league/leaders')).toBe('leaders');
    expect(resolveAssistantRouteKey('/players/abc-123')).toBe('player-profile');
    expect(resolveAssistantRouteKey('/games/42')).toBe('box-score');
    expect(resolveAssistantRouteKey('/news')).toBe('news');
    expect(resolveAssistantRouteKey('/unknown')).toBe('dashboard');
  });

  it('covers every required MBD route with route-aware guidance', () => {
    for (const key of REQUIRED_ASSISTANT_ROUTE_KEYS) {
      const guidance = ASSISTANT_GUIDANCE[key];
      expect(guidance, `${key} guidance`).toBeTruthy();
      expect(guidance.title.length, `${key} title`).toBeGreaterThan(0);
      expect(guidance.pagePurpose.length, `${key} purpose`).toBeGreaterThan(0);
      expect(guidance.suggestedAction.label.length, `${key} action`).toBeGreaterThan(0);
    }
  });

  it('includes ratings focus on decision-critical player movement pages', () => {
    for (const path of ['/roster', '/players', '/players/compare', '/players/example', '/scouting', '/draft', '/trade', '/free-agency', '/minors']) {
      expect(selectRouteGuidance(path).ratingsFocus, `${path} ratingsFocus`).toMatch(/OVR|rating|ceiling|grade|confidence/i);
    }
  });

  it('selects next best action from phase and route context', () => {
    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'offseason',
      day: 1,
      season: 2,
      mode: 'newcomer',
    })).toMatchObject({ route: '/offseason', label: 'Open offseason checklist' });

    expect(buildAssistantNextAction({
      routeKey: 'trade',
      phase: 'regular',
      day: 95,
      season: 1,
      mode: 'hardcore',
    })).toMatchObject({ route: '/trade', label: 'Audit deadline value' });
  });

  it('prioritizes active monthly pulse work over route fallbacks', () => {
    expect(buildAssistantNextAction({
      routeKey: 'trade',
      phase: 'regular',
      day: 95,
      season: 3,
      mode: 'hardcore',
      pendingMonthlyReport: true,
      decisionQueue: [{
        id: 'spotlight-roster',
        urgency: 'red',
        title: 'Roster is over the active limit',
        body: 'You need to clear a roster spot before the next series starts.',
        route: '/roster',
        actionLabel: 'Open Roster',
      }],
    })).toMatchObject({
      route: '/pulse',
      label: 'Review monthly report',
    });
  });

  it('turns pulse decisions into contextual operator actions', () => {
    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'regular',
      day: 92,
      season: 4,
      mode: 'newcomer',
      decisionQueue: [
        {
          id: 'spotlight-trade',
          urgency: 'yellow',
          title: 'Trade offer is waiting on your board',
          body: 'One active offer still needs a decision.',
          route: '/trade',
          actionLabel: 'Open Trade Center',
        },
        {
          id: 'spotlight-roster',
          urgency: 'red',
          title: 'Roster is over the active limit',
          body: 'You need to clear a roster spot before the next series starts.',
          route: '/roster',
          actionLabel: 'Open Roster',
        },
      ],
    })).toMatchObject({
      route: '/roster',
      label: 'Fix roster compliance',
      reason: 'You need to clear a roster spot before the next series starts.',
    });

    expect(buildAssistantNextAction({
      routeKey: 'free-agency',
      phase: 'offseason',
      day: 1,
      season: 4,
      mode: 'hardcore',
      decisionQueue: [{
        id: 'spotlight-budget',
        urgency: 'yellow',
        title: 'Free-agent budget is tight',
        body: 'Inspect payroll room before making the next offer.',
        route: '/free-agency',
        actionLabel: 'Open Free Agency',
      }],
    })).toMatchObject({
      route: '/free-agency',
      label: 'Inspect FA budget',
    });

    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'regular',
      day: 92,
      season: 4,
      mode: 'hardcore',
      decisionQueue: [{
        id: 'spotlight-owner',
        urgency: 'red',
        title: 'Owner ultimatum is on your desk',
        body: 'Ownership needs immediate improvement in results and budget discipline.',
        route: '/dashboard',
        actionLabel: 'Open Dashboard',
      }],
    })).toMatchObject({
      route: '/front-office',
      label: 'Review owner pressure',
    });
  });

  it('routes owner pressure and playoff-race pulse decisions to operator pages', () => {
    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'regular',
      day: 112,
      season: 5,
      mode: 'hardcore',
      decisionQueue: [{
        id: 'spotlight-owner-pressure',
        urgency: 'red',
        title: 'Owner patience is slipping',
        body: 'Ownership wants a visible plan before the next monthly checkpoint.',
        route: '/dashboard',
        actionLabel: 'Open Dashboard',
      }],
    })).toMatchObject({
      route: '/front-office',
      label: 'Review owner pressure',
      reason: 'Ownership wants a visible plan before the next monthly checkpoint.',
    });

    expect(buildAssistantNextAction({
      routeKey: 'pulse',
      phase: 'regular',
      day: 128,
      season: 5,
      mode: 'newcomer',
      decisionQueue: [{
        id: 'spotlight-playoff-race',
        urgency: 'yellow',
        title: 'Wild card race tightened overnight',
        body: 'The next series can swing your playoff odds.',
        route: '/standings',
        actionLabel: 'Open Standings',
      }],
    })).toMatchObject({
      route: '/standings',
      label: 'Check playoff race',
      reason: 'The next series can swing your playoff odds.',
    });

    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'playoffs',
      day: 1,
      season: 5,
      mode: 'hardcore',
      decisionQueue: [{
        id: 'spotlight-playoff-series',
        urgency: 'red',
        title: 'Postseason matchup is live',
        body: 'Set rotation and bullpen context before advancing the series.',
        route: '/playoffs',
        actionLabel: 'Open Playoffs',
      }],
    })).toMatchObject({
      route: '/playoffs',
      label: 'Review playoff matchup',
      reason: 'Set rotation and bullpen context before advancing the series.',
    });
  });

  it('creates deterministic story callbacks from phase and ticker context', () => {
    expect(buildStoryCallback({
      phase: 'playoffs',
      day: 1,
      season: 4,
      routeKey: 'dashboard',
      seenStoryCallbacks: {},
      tickerFeed: [],
    })).toMatchObject({
      id: 'phase-playoffs-s4',
      tone: 'excited',
    });

    expect(buildStoryCallback({
      phase: 'regular',
      day: 87,
      season: 2,
      routeKey: 'dashboard',
      seenStoryCallbacks: {},
      tickerFeed: [
        {
          id: 'ticker-trade-1',
          category: 'trade',
          text: 'League rivals are calling about late-inning relief.',
        },
      ],
    })).toMatchObject({
      id: 'ticker-trade-1',
      tone: 'warning',
    });

    expect(buildStoryCallback({
      phase: 'regular',
      day: 87,
      season: 2,
      routeKey: 'dashboard',
      seenStoryCallbacks: { 'ticker-trade-1': true },
      tickerFeed: [
        {
          id: 'ticker-trade-1',
          category: 'trade',
          text: 'League rivals are calling about late-inning relief.',
        },
      ],
    })).toBeNull();
  });
});
