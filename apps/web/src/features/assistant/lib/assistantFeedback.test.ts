import { describe, expect, it } from 'vitest';
import { buildAssistantFeedbackReport, resolveViewportCategory } from './assistantFeedback';

describe('assistantFeedback', () => {
  it('classifies the viewport for copyable playtest diagnostics', () => {
    expect(resolveViewportCategory(390)).toBe('phone');
    expect(resolveViewportCategory(768)).toBe('tablet');
    expect(resolveViewportCategory(1280)).toBe('desktop');
  });

  it('builds a copyable report with route, mode, tutorial state, and comments', () => {
    expect(buildAssistantFeedbackReport({
      appVersion: '1.0.0',
      route: '/trade',
      routeKey: 'trade',
      phase: 'regular',
      day: 92,
      season: 2,
      assistantMode: 'hardcore',
      completedRoutes: ['dashboard', 'roster'],
      viewportCategory: 'phone',
      helpfulScore: 4,
      clarityScore: 3,
      confusion: 'The trade offer numbers need more context.',
    })).toContain([
      'MBD Assistant Feedback',
      'App version: 1.0.0',
      'Route: /trade (trade)',
      'Game phase: regular, Season 2, Day 92',
      'Assistant mode: hardcore',
      'Tutorial completed routes: dashboard, roster',
      'Viewport: phone',
      'Mack helpful: 4/5',
      'Knew next move: 3/5',
      'Confusion: The trade offer numbers need more context.',
    ].join('\n'));
  });
});
