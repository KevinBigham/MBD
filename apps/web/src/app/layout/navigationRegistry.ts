import {
  Activity,
  ArrowLeftRight,
  Award,
  BarChart3,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CalendarRange,
  DollarSign,
  FileText,
  Flame,
  HandCoins,
  History,
  Inbox,
  Newspaper,
  Scale,
  Search,
  Settings,
  Snowflake,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getRouteGuidanceAliases } from '@/shared/lib/routeGuidanceRegistry';

export type NavigationGroupId =
  | 'home'
  | 'team'
  | 'players'
  | 'transactions'
  | 'league'
  | 'story'
  | 'system';

export interface NavigationItem {
  id: string;
  to: string;
  label: string;
  commandLabel?: string;
  icon: LucideIcon;
  aliases: readonly string[];
}

export interface NavigationGroup {
  id: NavigationGroupId;
  label: string;
  items: readonly NavigationItem[];
}

export const NAVIGATION_GROUPS: readonly NavigationGroup[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      {
        id: 'front-office-home',
        to: '/dashboard',
        label: 'Front Office',
        icon: Briefcase,
        aliases: ['home', 'dashboard', 'gm office', 'manager home', 'what now', 'next action'],
      },
      {
        id: 'pulse',
        to: '/pulse',
        label: 'Pulse',
        icon: Activity,
        aliases: ['monthly pulse', 'league events', 'what changed', 'what now'],
      },
      {
        id: 'news',
        to: '/news',
        label: 'News',
        icon: Inbox,
        aliases: ['inbox', 'updates', 'messages', 'story feed'],
      },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    items: [
      {
        id: 'roster',
        to: '/roster',
        label: 'Roster',
        icon: Users,
        aliases: ['lineup', 'depth chart', 'fix roster', 'roster compliance', 'promote player'],
      },
      {
        id: 'minors',
        to: '/minors',
        label: 'Minors',
        commandLabel: 'Minor League Hub',
        icon: Users,
        aliases: ['farm', 'prospects', 'affiliates', 'development'],
      },
      {
        id: 'staff',
        to: '/staff',
        label: 'Staff',
        icon: BriefcaseBusiness,
        aliases: ['coaches', 'coach market', 'mentor', 'clubhouse'],
      },
      {
        id: 'finance',
        to: '/finance',
        label: 'Finance',
        icon: DollarSign,
        aliases: ['budget', 'payroll', 'money', 'contracts', 'owner budget'],
      },
      {
        id: 'owner-intel',
        to: '/front-office',
        label: 'Owner Intel',
        icon: Building2,
        aliases: ['owner', 'front office', 'relationships', 'pressure'],
      },
    ],
  },
  {
    id: 'players',
    label: 'Players',
    items: [
      {
        id: 'players',
        to: '/players',
        label: 'Players',
        icon: User,
        aliases: ['player search', 'player list', 'ratings', 'signature moments'],
      },
      {
        id: 'compare',
        to: '/players/compare',
        label: 'Compare',
        commandLabel: 'Compare Players',
        icon: Scale,
        aliases: ['compare players', 'ratings compare', 'player decision'],
      },
      {
        id: 'scouting',
        to: '/scouting',
        label: 'Scouting',
        icon: Search,
        aliases: ['scout', 'reports', 'international', 'discover players'],
      },
      {
        id: 'draft',
        to: '/draft',
        label: 'Draft',
        commandLabel: 'Draft Room',
        icon: FileText,
        aliases: ['draft room', 'amateur draft', 'scout draft class', 'big board'],
      },
    ],
  },
  {
    id: 'transactions',
    label: 'Transactions',
    items: [
      {
        id: 'trade',
        to: '/trade',
        label: 'Trades',
        commandLabel: 'Trade Center',
        icon: ArrowLeftRight,
        aliases: ['trade', 'shop player', 'start negotiation', 'trade market', 'quick trade'],
      },
      {
        id: 'free-agency',
        to: '/free-agency',
        label: 'Free Agency',
        icon: HandCoins,
        aliases: ['free agents', 'sign player', 'market', 'ifa'],
      },
      {
        id: 'offseason',
        to: '/offseason',
        label: 'Offseason',
        icon: Snowflake,
        aliases: ['winter', 'arbitration', 'rule 5', 'qualifying offers'],
      },
    ],
  },
  {
    id: 'league',
    label: 'League',
    items: [
      {
        id: 'standings',
        to: '/league/standings',
        label: 'League',
        commandLabel: 'League Standings',
        icon: Trophy,
        aliases: ['standings', 'division race', 'wild card', 'league table'],
      },
      {
        id: 'leaders',
        to: '/league/leaders',
        label: 'Leaders',
        commandLabel: 'Stat Leaders',
        icon: Trophy,
        aliases: ['leaders', 'leaderboards', 'stats leaders', 'reports'],
      },
      {
        id: 'schedule',
        to: '/schedule',
        label: 'Schedule',
        commandLabel: 'Season Schedule',
        icon: CalendarDays,
        aliases: ['games', 'calendar', 'box scores', 'upcoming games'],
      },
      {
        id: 'playoffs',
        to: '/playoffs',
        label: 'Playoffs',
        icon: CalendarRange,
        aliases: ['postseason', 'bracket', 'playoff race'],
      },
      {
        id: 'stats',
        to: '/stats',
        label: 'Stats',
        icon: BarChart3,
        aliases: ['stats encyclopedia', 'definitions', 'reports', 'metrics'],
      },
      {
        id: 'records',
        to: '/records',
        label: 'Records',
        icon: TrendingUp,
        aliases: ['record watch', 'milestones', 'reports', 'history reports'],
      },
    ],
  },
  {
    id: 'story',
    label: 'Story',
    items: [
      {
        id: 'press-room',
        to: '/press-room',
        label: 'Press Room',
        icon: Newspaper,
        aliases: ['press', 'briefings', 'transaction log', 'stories'],
      },
      {
        id: 'history',
        to: '/history',
        label: 'History',
        commandLabel: 'Franchise History',
        icon: History,
        aliases: ['franchise history', 'reports', 'recap', 'ledger', 'dynasty'],
      },
      {
        id: 'rivalries',
        to: '/rivalries',
        label: 'Rivalries',
        icon: Flame,
        aliases: ['rivals', 'storylines', 'head to head'],
      },
      {
        id: 'career',
        to: '/career',
        label: 'GM Career',
        icon: Award,
        aliases: ['career', 'gm profile', 'jobs', 'reputation'],
      },
      {
        id: 'achievements',
        to: '/achievements',
        label: 'Trophies',
        commandLabel: 'Achievements',
        icon: Trophy,
        aliases: ['achievements', 'awards', 'trophy room'],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    items: [
      {
        id: 'scenarios',
        to: '/scenarios',
        label: 'Challenges',
        commandLabel: 'Scenarios',
        icon: Target,
        aliases: ['scenarios', 'challenges', 'objectives'],
      },
      {
        id: 'settings',
        to: '/settings',
        label: 'Settings',
        icon: Settings,
        aliases: ['settings', 'preferences', 'help replay', 'guidance'],
      },
    ],
  },
] as const;

export const MOBILE_PRIMARY_ROUTES = [
  '/dashboard',
  '/roster',
  '/draft',
  '/trade',
  '/league/standings',
] as const;

export function getNavigationSearchValue(item: NavigationItem, groupLabel: string): string {
  return [
    groupLabel,
    item.label,
    item.commandLabel,
    item.to,
    ...item.aliases,
    ...getRouteGuidanceAliases(item.to),
  ]
    .filter(Boolean)
    .join(' ');
}
