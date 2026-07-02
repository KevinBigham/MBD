import {
  ASSISTANT_GUIDANCE,
  REQUIRED_ASSISTANT_ROUTE_KEYS,
  resolveAssistantRouteKey,
  selectRouteGuidance,
  type AssistantGuidance,
  type AssistantRouteKey,
} from '@/features/assistant/data/assistantGuidance';

export interface PageHelpEntry {
  readonly title: string;
  readonly description: string;
  readonly tips: readonly string[];
  readonly relatedRoutes: readonly { label: string; path: string }[];
}

export interface ContextualRouteHelp {
  readonly title: string;
  readonly description: string;
  readonly actions: readonly string[];
}

export const PLAYABLE_ROUTE_HELP_PATHS = [
  '/',
  '/onboarding',
  '/dashboard',
  '/roster',
  '/minors',
  '/players',
  '/players/compare',
  '/players/player-42',
  '/scouting',
  '/staff',
  '/draft',
  '/trade',
  '/standings',
  '/leaders',
  '/league/standings',
  '/league/leaders',
  '/schedule',
  '/games/42',
  '/press-room',
  '/news',
  '/playoffs',
  '/free-agency',
  '/offseason',
  '/finance',
  '/career',
  '/history',
  '/achievements',
  '/rivalries',
  '/front-office',
  '/pulse',
  '/scenarios',
  '/stats',
  '/records',
  '/settings',
] as const;

const ROUTE_KEY_EXAMPLE_PATHS: Record<AssistantRouteKey, string> = {
  setup: '/',
  onboarding: '/onboarding',
  dashboard: '/dashboard',
  roster: '/roster',
  minors: '/minors',
  players: '/players',
  'player-compare': '/players/compare',
  'player-profile': '/players/player-42',
  scouting: '/scouting',
  staff: '/staff',
  draft: '/draft',
  trade: '/trade',
  standings: '/league/standings',
  leaders: '/league/leaders',
  schedule: '/schedule',
  'box-score': '/games/42',
  'press-room': '/press-room',
  news: '/news',
  playoffs: '/playoffs',
  'free-agency': '/free-agency',
  offseason: '/offseason',
  finance: '/finance',
  career: '/career',
  history: '/history',
  achievements: '/achievements',
  rivalries: '/rivalries',
  'front-office': '/front-office',
  pulse: '/pulse',
  scenarios: '/scenarios',
  stats: '/stats',
  records: '/records',
  settings: '/settings',
};

const RELATED_ROUTES: Partial<Record<AssistantRouteKey, readonly { label: string; path: string }[]>> = {
  dashboard: [
    { label: 'Roster', path: '/roster' },
    { label: 'Trade', path: '/trade' },
    { label: 'Reports', path: '/history' },
  ],
  trade: [
    { label: 'Roster', path: '/roster' },
    { label: 'Finance', path: '/finance' },
    { label: 'Scouting', path: '/scouting' },
  ],
  roster: [
    { label: 'Minors', path: '/minors' },
    { label: 'Players', path: '/players' },
    { label: 'Trade', path: '/trade' },
    { label: 'Finance', path: '/finance' },
  ],
  settings: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Onboarding', path: '/onboarding' },
  ],
};

function isRouteKey(value: string): value is AssistantRouteKey {
  return value in ASSISTANT_GUIDANCE;
}

function guidanceForLookup(routeOrKey: string): AssistantGuidance | null {
  if (isRouteKey(routeOrKey)) {
    return ASSISTANT_GUIDANCE[routeOrKey];
  }

  const path = routeOrKey.startsWith('/') ? routeOrKey : `/${routeOrKey}`;
  return selectRouteGuidance(path);
}

export function resolveRouteGuidanceKey(pathname: string): AssistantRouteKey {
  return resolveAssistantRouteKey(pathname);
}

export function selectRouteGuidanceForPath(pathname: string): AssistantGuidance {
  return selectRouteGuidance(pathname);
}

export function getRouteGuidanceAliases(pathname: string): readonly string[] {
  const guidance = selectRouteGuidanceForPath(pathname);
  return [
    guidance.title,
    guidance.pagePurpose,
    guidance.whenToUse,
    guidance.decision,
    guidance.suggestedAction.label,
    guidance.suggestedAction.reason,
  ];
}

export function getPageHelpForPath(routeOrKey: string): PageHelpEntry | null {
  const guidance = guidanceForLookup(routeOrKey);
  if (!guidance) return null;

  return {
    title: guidance.title,
    description: guidance.pagePurpose,
    tips: [
      guidance.whenToUse,
      guidance.decision,
      guidance.ratingsFocus,
      guidance.mobileTip,
    ],
    relatedRoutes: [
      { label: guidance.suggestedAction.label, path: guidance.suggestedAction.route },
      ...(RELATED_ROUTES[guidance.routeKey] ?? []),
    ].filter((route, index, routes) =>
      routes.findIndex((candidate) => candidate.path === route.path) === index,
    ),
  };
}

export function getContextualHelpForPath(pathname: string): ContextualRouteHelp | null {
  const guidance = selectRouteGuidanceForPath(pathname);

  return {
    title: guidance.title,
    description: guidance.pagePurpose,
    actions: [
      guidance.suggestedAction.label,
      guidance.decision,
      guidance.whenToUse,
    ],
  };
}

export const ROUTE_HELP_BY_KEY: Readonly<Record<AssistantRouteKey, PageHelpEntry>> =
  Object.fromEntries(
    REQUIRED_ASSISTANT_ROUTE_KEYS.map((key) => [key, getPageHelpForPath(key)]),
  ) as Readonly<Record<AssistantRouteKey, PageHelpEntry>>;

export function getExamplePathForRouteKey(routeKey: AssistantRouteKey): string {
  return ROUTE_KEY_EXAMPLE_PATHS[routeKey];
}
