import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Users,
  DollarSign,
  Search,
  ArrowLeftRight,
  BarChart3,
  HandCoins,
  Snowflake,
  History,
  Save,
  PlusCircle,
  Keyboard,
} from 'lucide-react';
import { useActiveSaveAutosave } from '@/shared/hooks/useActiveSaveAutosave';
import {
  NAVIGATION_GROUPS,
  getNavigationSearchValue,
} from './navigationRegistry';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenShortcuts?: () => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  value: string;
}

interface NavigationCommandGroup {
  id: string;
  label: string;
  items: CommandItem[];
}

function getActionSearchValue(label: string, aliases: readonly string[] = []): string {
  return [label, ...aliases].join(' ');
}

export function CommandPalette({ open, onOpenChange, onOpenShortcuts }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const autosaveActiveGame = useActiveSaveAutosave();

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const navigationGroups: NavigationCommandGroup[] = NAVIGATION_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    items: group.items.map((item) => {
      const Icon = item.icon;
      return {
        id: `nav-${item.id}`,
        label: item.commandLabel ?? item.label,
        icon: <Icon className="h-4 w-4" />,
        action: () => navigate(item.to),
        value: getNavigationSearchValue(item, group.label),
      };
    }),
  }));

  const actionItems: CommandItem[] = [
    {
      id: 'act-save',
      label: 'Quick Save',
      icon: <Save className="h-4 w-4" />,
      action: async () => {
        await autosaveActiveGame();
      },
      value: getActionSearchValue('Quick Save', ['save game', 'write save']),
    },
    {
      id: 'act-load',
      label: 'Open Save Hub',
      icon: <Save className="h-4 w-4" />,
      action: () => navigate('/'),
      value: getActionSearchValue('Open Save Hub', ['load save', 'save hub', 'continue dynasty']),
    },
    {
      id: 'act-start-negotiation',
      label: 'Start Negotiation',
      icon: <ArrowLeftRight className="h-4 w-4" />,
      action: () => navigate('/trade?mode=quick'),
      value: getActionSearchValue('Start Negotiation', ['trade', 'quick trade', 'shop player', 'propose trade']),
    },
    {
      id: 'act-roster-needs',
      label: 'Review Roster Needs',
      icon: <Users className="h-4 w-4" />,
      action: () => navigate('/roster'),
      value: getActionSearchValue('Review Roster Needs', ['fix roster', 'roster compliance', 'lineup']),
    },
    {
      id: 'act-trade-market',
      label: 'Review Trade Market',
      icon: <ArrowLeftRight className="h-4 w-4" />,
      action: () => navigate('/trade?mode=market'),
      value: getActionSearchValue('Review Trade Market', ['trade', 'market', 'shop player', 'deadline market']),
    },
    {
      id: 'act-scout-draft-class',
      label: 'Scout Draft Class',
      icon: <Search className="h-4 w-4" />,
      action: () => navigate('/draft'),
      value: getActionSearchValue('Scout Draft Class', ['draft', 'big board', 'prospects']),
    },
    {
      id: 'act-free-agent-market',
      label: 'Review Free Agent Market',
      icon: <HandCoins className="h-4 w-4" />,
      action: () => navigate('/free-agency'),
      value: getActionSearchValue('Review Free Agent Market', ['free agents', 'sign player', 'market']),
    },
    {
      id: 'act-offseason-plan',
      label: 'Review Offseason Plan',
      icon: <Snowflake className="h-4 w-4" />,
      action: () => navigate('/offseason'),
      value: getActionSearchValue('Review Offseason Plan', ['offseason', 'winter', 'rule 5', 'arbitration']),
    },
    {
      id: 'act-franchise-history',
      label: 'Study Franchise History',
      icon: <History className="h-4 w-4" />,
      action: () => navigate('/history'),
      value: getActionSearchValue('Study Franchise History', ['history', 'reports', 'dynasty recap']),
    },
    {
      id: 'act-keyboard-shortcuts',
      label: 'Open Keyboard Shortcuts',
      icon: <Keyboard className="h-4 w-4" />,
      action: () => onOpenShortcuts?.(),
      value: getActionSearchValue('Open Keyboard Shortcuts', ['shortcuts', 'hotkeys', 'keyboard help']),
    },
    {
      id: 'act-view-signature-moments',
      label: 'View Signature Moments',
      icon: <Award className="h-4 w-4" />,
      action: () => navigate('/players'),
      value: getActionSearchValue('View Signature Moments', ['player stories', 'moments', 'ratings']),
    },
    {
      id: 'act-what-now',
      label: 'What Now: Review Front Office',
      icon: <Briefcase className="h-4 w-4" />,
      action: () => navigate('/dashboard'),
      value: getActionSearchValue('What Now: Review Front Office', ['what now', 'next action', 'gm office']),
    },
    {
      id: 'act-budget',
      label: 'Review Budget',
      icon: <DollarSign className="h-4 w-4" />,
      action: () => navigate('/finance'),
      value: getActionSearchValue('Review Budget', ['budget', 'payroll', 'finance', 'money']),
    },
    {
      id: 'act-reports',
      label: 'Open Reports',
      icon: <BarChart3 className="h-4 w-4" />,
      action: () => navigate('/history'),
      value: getActionSearchValue('Open Reports', ['reports', 'history', 'records', 'stats']),
    },
    {
      id: 'act-new',
      label: 'New Dynasty Setup',
      icon: <PlusCircle className="h-4 w-4" />,
      action: () => navigate('/'),
      value: getActionSearchValue('New Dynasty Setup', ['new game', 'setup', 'quickstart']),
    },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Command
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-dynasty-border bg-dynasty-surface shadow-2xl"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') {
            onOpenChange(false);
          }
        }}
      >
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="min-h-11 w-full border-b border-dynasty-border bg-transparent px-4 py-3 font-heading text-base text-dynasty-text outline-none placeholder:text-dynasty-muted"
          autoFocus
        />

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center font-heading text-sm text-dynasty-muted">
            No results found.
          </Command.Empty>

          {navigationGroups.map((group) => (
            <Command.Group
              key={group.id}
              heading={group.label}
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-heading [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dynasty-muted"
            >
              {group.items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.value}
                  onSelect={() => {
                    item.action();
                    onOpenChange(false);
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dynasty-text aria-selected:bg-dynasty-elevated aria-selected:text-accent-primary"
                >
                  <span className="text-dynasty-muted">{item.icon}</span>
                  <span className="font-heading">{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          ))}

          <Command.Separator className="my-1 h-px bg-dynasty-border" />

          <Command.Group
            heading="Actions"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-heading [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dynasty-muted"
          >
            {actionItems.map((item) => (
              <Command.Item
                key={item.id}
                value={item.value}
                onSelect={() => {
                  item.action();
                  onOpenChange(false);
                }}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dynasty-text aria-selected:bg-dynasty-elevated aria-selected:text-accent-primary"
              >
                <span className="text-dynasty-muted">{item.icon}</span>
                <span className="font-heading">{item.label}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dynasty-border" />

          <Command.Group
            heading="Keyboard Shortcuts"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-heading [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dynasty-muted"
          >
            {KEYBOARD_SHORTCUTS.map((shortcut) => (
              <div
                key={shortcut.label}
                className="flex min-h-11 items-center justify-between px-3 py-2"
              >
                <span className="flex items-center gap-3 text-sm text-dynasty-text">
                  <Keyboard className="h-4 w-4 text-dynasty-muted" />
                  <span className="font-heading">{shortcut.label}</span>
                </span>
                <kbd className="rounded border border-dynasty-border bg-dynasty-base px-2 py-0.5 font-data text-[10px] text-dynasty-muted">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

const KEYBOARD_SHORTCUTS = [
  { label: 'Sim One Day', keys: 'Space' },
  { label: 'Sim One Week', keys: 'Shift + Space' },
  { label: 'Sim One Month', keys: 'Cmd + Space' },
  { label: 'Command Palette', keys: 'Cmd + K' },
] as const;
