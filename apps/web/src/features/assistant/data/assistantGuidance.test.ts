import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_GUIDANCE,
  REQUIRED_ASSISTANT_ROUTE_KEYS,
  buildAssistantNextAction,
  buildStorySoFar,
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

    expect(buildAssistantNextAction({
      routeKey: 'dashboard',
      phase: 'regular',
      day: 92,
      season: 2,
      mode: 'newcomer',
      seasonSnapshot: {
        teamName: 'Tycoons',
        standing: { wins: 42, losses: 40, division: 'East' },
        daysUntilTradeDeadline: 10,
        phaseLabel: 'Regular Season',
        detailLabel: 'Deadline approaching',
        seasonSummary: null,
      },
    })).toMatchObject({ route: '/trade', label: 'Check trade and budget fit' });

    expect(buildAssistantNextAction({
      routeKey: 'draft',
      phase: 'regular',
      day: 8,
      season: 1,
      mode: 'newcomer',
    })).toMatchObject({ route: '/scouting', label: 'Scout before draft season' });

    expect(buildAssistantNextAction({
      routeKey: 'free-agency',
      phase: 'regular',
      day: 8,
      season: 1,
      mode: 'newcomer',
    })).toMatchObject({ route: '/finance', label: 'Check payroll room' });
  });

  it('keeps first-session guidance short and actionable on core routes', () => {
    for (const path of ['/', '/onboarding', '/dashboard', '/roster', '/players/example', '/scouting', '/draft', '/trade', '/free-agency', '/finance', '/settings']) {
      const cue = selectRouteGuidance(path).firstSessionCue;
      expect(cue, `${path} first-session cue`).toBeTruthy();
      expect(cue!.length, `${path} first-session cue length`).toBeLessThanOrEqual(150);
      expect(cue, `${path} first-session cue action`).toMatch(/Start|Finish|Open|Check|Review|Pick|Scout|Filter|Use|Set/i);
    }
  });

  it('builds deterministic story-so-far lines from safe season context', () => {
    expect(buildStorySoFar({
      phase: 'regular',
      day: 92,
      season: 2,
      gamesPlayed: 82,
      routeKey: 'dashboard',
      seasonSnapshot: {
        teamName: 'Tycoons',
        standing: { wins: 42, losses: 40, division: 'East' },
        daysUntilTradeDeadline: 10,
        phaseLabel: 'Regular Season',
        detailLabel: 'Deadline approaching',
        seasonSummary: null,
      },
    })).toEqual([
      'Tycoons are 42-40 in the East. This is the point where a .500-ish club chooses a lane before the market chooses for it.',
      'The deadline is 10 days away. Check trade value and payroll before simming past the window.',
    ]);

    expect(buildStorySoFar({
      phase: 'preseason',
      day: 1,
      season: 1,
      gamesPlayed: 0,
      routeKey: 'dashboard',
      seasonSnapshot: null,
    })[0]).toContain('Opening checkpoint');
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
