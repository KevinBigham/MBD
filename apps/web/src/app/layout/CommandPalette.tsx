import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  User,
  Search,
  FileText,
  ArrowLeftRight,
  Trophy,
  CalendarRange,
  Newspaper,
  History,
  Settings,
  Save,
  PlusCircle,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { loadMostRecentSnapshot, saveGame } from '@/shared/lib/saveSystem';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: 'navigation' | 'actions';
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const worker = useWorker();
  const { season, day, phase, userTeamId, initializeGame } = useGameStore();

  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const items: CommandItem[] = [
    // Navigation
    { id: 'nav-office', label: 'Front Office', icon: <Briefcase className="h-4 w-4" />, action: () => navigate('/'), group: 'navigation' },
    { id: 'nav-roster', label: 'Roster', icon: <Users className="h-4 w-4" />, action: () => navigate('/roster'), group: 'navigation' },
    { id: 'nav-minors', label: 'Minor League Hub', icon: <Users className="h-4 w-4" />, action: () => navigate('/minors'), group: 'navigation' },
    { id: 'nav-players', label: 'Players', icon: <User className="h-4 w-4" />, action: () => navigate('/players'), group: 'navigation' },
    { id: 'nav-scouting', label: 'Scouting', icon: <Search className="h-4 w-4" />, action: () => navigate('/scouting'), group: 'navigation' },
    { id: 'nav-draft', label: 'Draft Room', icon: <FileText className="h-4 w-4" />, action: () => navigate('/draft'), group: 'navigation' },
    { id: 'nav-trade', label: 'Trade Center', icon: <ArrowLeftRight className="h-4 w-4" />, action: () => navigate('/trade'), group: 'navigation' },
    { id: 'nav-standings', label: 'League Standings', icon: <Trophy className="h-4 w-4" />, action: () => navigate('/league/standings'), group: 'navigation' },
    { id: 'nav-leaders', label: 'Stat Leaders', icon: <Trophy className="h-4 w-4" />, action: () => navigate('/league/leaders'), group: 'navigation' },
    { id: 'nav-playoffs', label: 'Playoffs', icon: <CalendarRange className="h-4 w-4" />, action: () => navigate('/playoffs'), group: 'navigation' },
    { id: 'nav-press-room', label: 'Press Room', icon: <Newspaper className="h-4 w-4" />, action: () => navigate('/press-room'), group: 'navigation' },
    { id: 'nav-history', label: 'Franchise History', icon: <History className="h-4 w-4" />, action: () => navigate('/history'), group: 'navigation' },
    { id: 'nav-settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, action: () => navigate('/settings'), group: 'navigation' },
    // Actions
    {
      id: 'act-save',
      label: 'Quick Save',
      icon: <Save className="h-4 w-4" />,
      action: async () => {
        if (!worker.isReady) return;
        const snapshot = await worker.exportSnapshot();
        await saveGame(1, `Season ${season} Day ${day}`, snapshot);
      },
      group: 'actions',
    },
    {
      id: 'act-load',
      label: 'Load Latest Save',
      icon: <Save className="h-4 w-4" />,
      action: async () => {
        if (!worker.isReady) return;
        const latestSave = await loadMostRecentSnapshot();
        if (!latestSave?.snapshot) return;
        const result = await worker.importSnapshot(latestSave.snapshot);
        initializeGame({
          season: result.season,
          day: result.day,
          phase: result.phase,
          playerCount: result.playerCount,
          userTeamId: result.userTeamId,
        });
      },
      group: 'actions',
    },
    {
      id: 'act-new',
      label: 'New Game',
      icon: <PlusCircle className="h-4 w-4" />,
      action: async () => {
        if (!worker.isReady) return;
        const result = await worker.newGame(Date.now(), userTeamId);
        initializeGame({
          season: result.season,
          day: result.day,
          phase: result.phase,
          playerCount: result.playerCount,
          userTeamId,
        });
      },
      group: 'actions',
    },
  ];

  const navItems = items.filter((i) => i.group === 'navigation');
  const actionItems = items.filter((i) => i.group === 'actions');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <Command
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
          className="w-full border-b border-dynasty-border bg-transparent px-4 py-3 font-heading text-sm text-dynasty-text outline-none placeholder:text-dynasty-muted"
          autoFocus
        />

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-4 py-8 text-center font-heading text-sm text-dynasty-muted">
            No results found.
          </Command.Empty>

          <Command.Group
            heading="Navigation"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-heading [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dynasty-muted"
          >
            {navItems.map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                onSelect={() => {
                  item.action();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dynasty-text aria-selected:bg-dynasty-elevated aria-selected:text-accent-primary"
              >
                <span className="text-dynasty-muted">{item.icon}</span>
                <span className="font-heading">{item.label}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-dynasty-border" />

          <Command.Group
            heading="Actions"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-heading [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-dynasty-muted"
          >
            {actionItems.map((item) => (
              <Command.Item
                key={item.id}
                value={item.label}
                onSelect={() => {
                  item.action();
                  onOpenChange(false);
                }}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm text-dynasty-text aria-selected:bg-dynasty-elevated aria-selected:text-accent-primary"
              >
                <span className="text-dynasty-muted">{item.icon}</span>
                <span className="font-heading">{item.label}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
