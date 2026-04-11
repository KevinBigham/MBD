import { NavLink } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  Briefcase,
  Building2,
  Users,
  User,
  BriefcaseBusiness,
  DollarSign,
  Search,
  FileText,
  ArrowLeftRight,
  HandCoins,
  Flame,
  MoreHorizontal,
  Scale,
  Snowflake,
  Trophy,
  Target,
  TrendingUp,
  CalendarDays,
  CalendarRange,
  Newspaper,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number | null;
}

const baseMainNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Front Office', icon: <Briefcase className="h-5 w-5" /> },
  { to: '/front-office', label: 'Owner Intel', icon: <Building2 className="h-5 w-5" /> },
  { to: '/roster', label: 'Roster', icon: <Users className="h-5 w-5" /> },
  { to: '/minors', label: 'Minors', icon: <Users className="h-5 w-5" /> },
  { to: '/players', label: 'Players', icon: <User className="h-5 w-5" /> },
  { to: '/scouting', label: 'Scouting', icon: <Search className="h-5 w-5" /> },
  { to: '/staff', label: 'Staff', icon: <BriefcaseBusiness className="h-5 w-5" /> },
  { to: '/finance', label: 'Finance', icon: <DollarSign className="h-5 w-5" /> },
  { to: '/draft', label: 'Draft', icon: <FileText className="h-5 w-5" /> },
  { to: '/free-agency', label: 'Free Agency', icon: <HandCoins className="h-5 w-5" /> },
  { to: '/offseason', label: 'Offseason', icon: <Snowflake className="h-5 w-5" /> },
  { to: '/players/compare', label: 'Compare', icon: <Scale className="h-5 w-5" /> },
  { to: '/trade', label: 'Trades', icon: <ArrowLeftRight className="h-5 w-5" /> },
  { to: '/league/standings', label: 'League', icon: <Trophy className="h-5 w-5" /> },
  { to: '/stats', label: 'Stats', icon: <BarChart3 className="h-5 w-5" /> },
  { to: '/records', label: 'Records', icon: <TrendingUp className="h-5 w-5" /> },
  { to: '/rivalries', label: 'Rivalries', icon: <Flame className="h-5 w-5" /> },
  { to: '/schedule', label: 'Schedule', icon: <CalendarDays className="h-5 w-5" /> },
  { to: '/pulse', label: 'Pulse', icon: <Activity className="h-5 w-5" /> },
  { to: '/playoffs', label: 'Playoffs', icon: <CalendarRange className="h-5 w-5" /> },
  { to: '/press-room', label: 'Press Room', icon: <Newspaper className="h-5 w-5" /> },
  { to: '/history', label: 'History', icon: <History className="h-5 w-5" /> },
  { to: '/career', label: 'GM Career', icon: <Award className="h-5 w-5" /> },
  { to: '/achievements', label: 'Trophies', icon: <Trophy className="h-5 w-5" /> },
  { to: '/scenarios', label: 'Challenges', icon: <Target className="h-5 w-5" /> },
];

const bottomNavItems: NavItem[] = [
  { to: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={() => {
        getAudioEngine().playEffect('tab_switch');
      }}
      className={({ isActive }) =>
        [
          'focus-ring group flex items-center gap-3 rounded-r-md border-l-2 px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'border-accent-primary bg-dynasty-elevated/50 text-accent-primary'
            : 'border-transparent text-dynasty-muted hover:border-dynasty-muted hover:bg-dynasty-elevated/30 hover:text-dynasty-text',
          collapsed ? 'justify-center px-2' : '',
        ].join(' ')
      }
      title={collapsed ? item.label : undefined}
    >
      {item.icon}
      {!collapsed && (
        <>
          <span>{item.label}</span>
          {item.badge != null && item.badge > 0 ? (
            <span className="ml-auto rounded border border-accent-warning/40 bg-accent-warning/10 px-1.5 py-0.5 font-data text-[10px] text-accent-warning">
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

/** Mobile bottom tab indices: Dashboard, Roster, Draft, Trade, League, More */
const MOBILE_TAB_INDICES = [0, 2, 8, 9, 10];

function MobileTabLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/dashboard'}
      onClick={() => getAudioEngine().playEffect('tab_switch')}
      className={({ isActive }) =>
        [
          'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
          isActive ? 'text-accent-primary' : 'text-dynasty-muted',
        ].join(' ')
      }
    >
      {item.icon}
      <span>{item.label.length > 8 ? item.label.slice(0, 7) + '.' : item.label}</span>
    </NavLink>
  );
}

function MobileMoreDrawer({
  items,
  open,
  onClose,
}: {
  items: NavItem[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1" onClick={onClose} aria-hidden />
      <div className="max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-dynasty-border bg-dynasty-surface pb-safe">
        <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
          <span className="font-heading text-sm font-semibold text-dynasty-textBright">Navigation</span>
          <button onClick={onClose} className="rounded p-1 text-dynasty-muted hover:text-dynasty-text" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="grid grid-cols-4 gap-1 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                getAudioEngine().playEffect('tab_switch');
                onClose();
              }}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 rounded-lg p-3 text-center transition-colors',
                  isActive
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-dynasty-muted hover:bg-dynasty-elevated hover:text-dynasty-text',
                ].join(' ')
              }
            >
              {item.icon}
              <span className="font-heading text-[10px]">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function MobileTabBar({ items }: { items: NavItem[] }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const tabItems = MOBILE_TAB_INDICES.map((i) => items[i]).filter((item): item is NavItem => item != null);

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-dynasty-border bg-dynasty-surface md:hidden" aria-label="Mobile navigation">
        {tabItems.map((item) => (
          <MobileTabLink key={item.to} item={item} />
        ))}
        <button
          onClick={() => {
            getAudioEngine().playEffect('button_click');
            setMoreOpen(true);
          }}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-dynasty-muted"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
      <MobileMoreDrawer items={items} open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const worker = useWorker();
  const { isInitialized, day, season, phase } = useGameStore();
  const [pressRoomCount, setPressRoomCount] = useState<number>(0);
  const [achievementCount, setAchievementCount] = useState<number>(0);

  useEffect(() => {
    if (!isInitialized || !worker.isReady) return;
    void (async () => {
      const summary = await worker.getDashboardSummary();
      const total = ((summary as { pressRoom?: { briefingCount?: number; newsCount?: number } } | null)?.pressRoom?.briefingCount ?? 0)
        + ((summary as { pressRoom?: { briefingCount?: number; newsCount?: number } } | null)?.pressRoom?.newsCount ?? 0);
      const achievements = ((summary as { franchise?: { achievementCount?: number } } | null)?.franchise?.achievementCount ?? 0);
      setPressRoomCount(total);
      setAchievementCount(achievements);
    })();
  }, [day, isInitialized, phase, season, worker]);

  const mainNavItems: NavItem[] = baseMainNavItems.map((item) => {
    if (item.to === '/press-room') {
      return { ...item, badge: pressRoomCount };
    }
    if (item.to === '/history') {
      return { ...item, badge: achievementCount };
    }
    return item;
  });

  return (
    <>
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        data-tour="sidebar"
        className={[
          'hidden flex-col border-r border-dynasty-border bg-dynasty-surface transition-all duration-200 md:flex',
          collapsed ? 'w-14' : 'w-52',
        ].join(' ')}
      >
        {/* Collapse toggle */}
        <div className="flex items-center justify-end border-b border-dynasty-border p-2">
          <button
            onClick={() => {
              getAudioEngine().playEffect('button_click');
              setCollapsed(!collapsed);
            }}
            className="focus-ring rounded p-1 text-dynasty-muted transition-colors hover:text-dynasty-text"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Main navigation */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Main navigation">
          {mainNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Bottom navigation */}
        <nav className="border-t border-dynasty-border p-2" aria-label="Settings">
          {bottomNavItems.map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar — visible only on small screens */}
      <MobileTabBar items={[...mainNavItems, ...bottomNavItems]} />
    </>
  );
}
