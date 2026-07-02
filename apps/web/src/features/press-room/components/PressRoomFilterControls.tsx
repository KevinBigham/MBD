import { CheckCheck } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { categoryLabel } from '@/shared/lib/labels';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

interface PressRoomFilterControlsProps {
  categoryOptions: string[];
  onMarkAllRead: () => void;
  onSelectCategory: (category: string) => void;
  onSelectTag: (tag: 'all' | PressRoomEntry['tag']) => void;
  onSelectTeam: (teamId: string) => void;
  selectedCategory: string;
  selectedTag: 'all' | PressRoomEntry['tag'];
  selectedTeam: string;
  teamOptions: string[];
}

export default function PressRoomFilterControls({
  categoryOptions,
  onMarkAllRead,
  onSelectCategory,
  onSelectTag,
  onSelectTeam,
  selectedCategory,
  selectedTag,
  selectedTeam,
  teamOptions,
}: PressRoomFilterControlsProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onMarkAllRead}
          className="inline-flex items-center gap-2 rounded border border-accent-info/40 bg-accent-info/10 px-3 py-2 font-heading text-xs uppercase tracking-wide text-accent-info hover:bg-accent-info/20"
        >
          <CheckCheck className="h-3.5 w-3.5" />
          Mark All Read
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1">
          <span className="font-heading text-[10px] uppercase text-dynasty-muted">Team</span>
          <select
            value={selectedTeam}
            onChange={(event) => onSelectTeam(event.target.value)}
            className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text outline-none focus:border-accent-primary"
          >
            <option value="all">All teams</option>
            {teamOptions.map((teamId) => (
              <option key={teamId} value={teamId}>
                {getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-heading text-[10px] uppercase text-dynasty-muted">Type</span>
          <select
            value={selectedCategory}
            onChange={(event) => onSelectCategory(event.target.value)}
            className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text outline-none focus:border-accent-primary"
          >
            <option value="all">All types</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className="font-heading text-[10px] uppercase text-dynasty-muted">Tag</span>
          <select
            value={selectedTag}
            onChange={(event) => onSelectTag(event.target.value as 'all' | PressRoomEntry['tag'])}
            className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text outline-none focus:border-accent-primary"
          >
            <option value="all">All tags</option>
            <option value="BREAKING">BREAKING</option>
            <option value="ANALYSIS">ANALYSIS</option>
            <option value="WATCH">WATCH</option>
            <option value="DEBATE">DEBATE</option>
            <option value="RECAP">RECAP</option>
            <option value="RUMOR">RUMOR</option>
          </select>
        </label>
      </div>
    </div>
  );
}
