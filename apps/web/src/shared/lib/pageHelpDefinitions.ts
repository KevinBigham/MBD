import {
  ROUTE_HELP_BY_KEY,
  getPageHelpForPath,
  type PageHelpEntry,
} from './routeGuidanceRegistry';

export type { PageHelpEntry };
export { getPageHelpForPath };

export const PAGE_HELP: Record<string, PageHelpEntry> = ROUTE_HELP_BY_KEY;
