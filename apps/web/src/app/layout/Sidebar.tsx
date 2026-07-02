import { NavLink } from 'react-router-dom';
import { MoreHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { getAudioEngine } from '@/shared/lib/audio';
import {
  MOBILE_PRIMARY_ROUTES,
  NAVIGATION_GROUPS,
  type NavigationGroup,
  type NavigationItem as RegistryNavigationItem,
} from './navigationRegistry';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number | null;
}

interface NavItemGroup {
  id: NavigationGroup['id'];
  label: string;
  items: NavItem[];
}

function toNavItem(item: RegistryNavigationItem, badge?: number | null): NavItem {
  const Icon = item.icon;
  return {
    to: item.to,
    label: item.label,
    icon: <Icon className="h-5 w-5 shrink-0" />,
    badge,
  };
}

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
  groups,
  open,
  onClose,
}: {
  groups: NavItemGroup[];
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1" onClick={onClose} aria-hidden />
      <div className="max-h-[70vh] overflow-y-auto rounded-t-xl border-t border-dynasty-border bg-dynasty-surface pb-safe">
        <div className="flex items-center justify-between border-b border-dynasty-border px-4 py-3">
          <span className="font-heading text-sm font-semibold text-dynasty-textBright">Navigation</span>
          <button
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded text-dynasty-muted hover:text-dynasty-text"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-4 p-3">
          {groups.map((group) => (
            <section key={group.id} aria-label={`${group.label} navigation`}>
              <h3 className="px-1 pb-1 font-heading text-[10px] font-semibold uppercase tracking-wider text-dynasty-muted">
                {group.label}
              </h3>
              <div className="grid grid-cols-4 gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      getAudioEngine().playEffect('tab_switch');
                      onClose();
                    }}
                    className={({ isActive }) =>
                      [
                        'flex min-h-11 flex-col items-center gap-1 rounded-lg p-3 text-center transition-colors',
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
              </div>
            </section>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function MobileTabBar({ groups }: { groups: NavItemGroup[] }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const items = groups.flatMap((group) => group.items);
  const tabItems = MOBILE_PRIMARY_ROUTES
    .map((route) => items.find((item) => item.to === route))
    .filter((item): item is NavItem => item != null);
  const primaryRoutes = new Set<string>(MOBILE_PRIMARY_ROUTES);
  const moreGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !primaryRoutes.has(item.to)),
    }))
    .filter((group) => group.items.length > 0);

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
          className="flex min-h-11 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-dynasty-muted"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </nav>
      <MobileMoreDrawer groups={moreGroups} open={moreOpen} onClose={() => setMoreOpen(false)} />
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

  const mainNavGroups: NavItemGroup[] = NAVIGATION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => {
      let badge: number | null = null;
      if (item.to === '/press-room') {
        badge = pressRoomCount;
      }
      if (item.to === '/history') {
        badge = achievementCount;
      }
      return toNavItem(item, badge);
    }),
  }));

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
          {mainNavGroups.map((group) => (
            <section key={group.id} aria-label={`${group.label} navigation`} className="py-1">
              {collapsed ? (
                <div className="mx-2 my-1 border-t border-dynasty-border/70" aria-hidden />
              ) : (
                <h2 className="px-3 pb-1 pt-2 font-heading text-[10px] font-semibold uppercase tracking-wider text-dynasty-muted">
                  {group.label}
                </h2>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tab bar — visible only on small screens */}
      <MobileTabBar groups={mainNavGroups} />
    </>
  );
}
