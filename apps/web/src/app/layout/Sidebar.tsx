import { NavLink } from 'react-router-dom';
import {
  Briefcase,
  Users,
  User,
  BriefcaseBusiness,
  Search,
  FileText,
  ArrowLeftRight,
  Trophy,
  CalendarRange,
  Newspaper,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
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
  { to: '/roster', label: 'Roster', icon: <Users className="h-5 w-5" /> },
  { to: '/minors', label: 'Minors', icon: <Users className="h-5 w-5" /> },
  { to: '/players', label: 'Players', icon: <User className="h-5 w-5" /> },
  { to: '/scouting', label: 'Scouting', icon: <Search className="h-5 w-5" /> },
  { to: '/staff', label: 'Staff', icon: <BriefcaseBusiness className="h-5 w-5" /> },
  { to: '/draft', label: 'Draft', icon: <FileText className="h-5 w-5" /> },
  { to: '/trade', label: 'Trades', icon: <ArrowLeftRight className="h-5 w-5" /> },
  { to: '/league/standings', label: 'League', icon: <Trophy className="h-5 w-5" /> },
  { to: '/playoffs', label: 'Playoffs', icon: <CalendarRange className="h-5 w-5" /> },
  { to: '/press-room', label: 'Press Room', icon: <Newspaper className="h-5 w-5" /> },
  { to: '/history', label: 'History', icon: <History className="h-5 w-5" /> },
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

  const mainNavItems = baseMainNavItems.map((item) => {
    if (item.to === '/press-room') {
      return { ...item, badge: pressRoomCount };
    }
    if (item.to === '/history') {
      return { ...item, badge: achievementCount };
    }
    return item;
  });

  return (
    <aside
      className={[
        'flex flex-col border-r border-dynasty-border bg-dynasty-surface transition-all duration-200',
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
      <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Main navigation">
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
  );
}
