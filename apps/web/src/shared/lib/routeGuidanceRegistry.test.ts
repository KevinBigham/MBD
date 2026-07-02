import { describe, expect, it } from 'vitest';
import {
  PLAYABLE_ROUTE_HELP_PATHS,
  getContextualHelpForPath,
  getPageHelpForPath,
  resolveRouteGuidanceKey,
  selectRouteGuidanceForPath,
} from './routeGuidanceRegistry';

describe('routeGuidanceRegistry', () => {
  it('matches aliases and dynamic playable routes to one route guidance key', () => {
    expect(resolveRouteGuidanceKey('/standings')).toBe('standings');
    expect(resolveRouteGuidanceKey('/league/standings')).toBe('standings');
    expect(resolveRouteGuidanceKey('/players/player-42')).toBe('player-profile');
    expect(resolveRouteGuidanceKey('/games/77')).toBe('box-score');
    expect(resolveRouteGuidanceKey('/news')).toBe('news');
  });

  it('feeds Assistant, TopBar contextual help, and PageHelp from the same route guidance', () => {
    const guidance = selectRouteGuidanceForPath('/games/77');
    const contextualHelp = getContextualHelpForPath('/games/77');
    const pageHelp = getPageHelpForPath('/games/77');

    expect(contextualHelp?.title).toBe(guidance.title);
    expect(contextualHelp?.description).toBe(guidance.pagePurpose);
    expect(contextualHelp?.actions).toContain(guidance.suggestedAction.label);
    expect(pageHelp?.title).toBe(guidance.title);
    expect(pageHelp?.description).toBe(guidance.pagePurpose);
    expect(pageHelp?.tips).toContain(guidance.whenToUse);
  });

  it('keeps route help coverage for all playable routes and documented aliases', () => {
    const missing = PLAYABLE_ROUTE_HELP_PATHS.filter((path) => getPageHelpForPath(path) == null);

    expect(missing).toEqual([]);
    expect(getPageHelpForPath('/news')?.title).toBe(selectRouteGuidanceForPath('/news').title);
    expect(getPageHelpForPath('/players/player-42')?.title).toBe(
      selectRouteGuidanceForPath('/players/player-42').title,
    );
  });
});
