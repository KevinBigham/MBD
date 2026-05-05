import type { AssistantMode } from './assistantState';

export type ViewportCategory = 'phone' | 'tablet' | 'desktop';

export interface AssistantFeedbackReportInput {
  appVersion: string;
  route: string;
  routeKey: string;
  phase: string;
  day: number;
  season: number;
  assistantMode: AssistantMode;
  completedRoutes: readonly string[];
  viewportCategory: ViewportCategory;
  helpfulScore: number;
  clarityScore: number;
  confusion: string;
}

export function resolveViewportCategory(width: number): ViewportCategory {
  if (width < 640) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function completedRouteSummary(routes: readonly string[]): string {
  return routes.length > 0 ? routes.join(', ') : 'none yet';
}

export function buildAssistantFeedbackReport(input: AssistantFeedbackReportInput): string {
  return [
    'MBD Assistant Feedback',
    `App version: ${input.appVersion}`,
    `Route: ${input.route} (${input.routeKey})`,
    `Game phase: ${input.phase}, Season ${input.season}, Day ${input.day}`,
    `Assistant mode: ${input.assistantMode}`,
    `Tutorial completed routes: ${completedRouteSummary(input.completedRoutes)}`,
    `Viewport: ${input.viewportCategory}`,
    `Mack helpful: ${input.helpfulScore}/5`,
    `Knew next move: ${input.clarityScore}/5`,
    `Confusion: ${input.confusion.trim() || 'None provided.'}`,
  ].join('\n');
}
