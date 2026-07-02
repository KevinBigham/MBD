import {
  Bookmark,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { categoryLabel, sourceLabel } from '@/shared/lib/labels';
import type { PressRoomEntry } from '@/shared/types/pressRoom';
import PressRoomFilterControls from './PressRoomFilterControls';

export type PressRoomSectionKey = 'briefings' | 'league_wire' | 'press_conferences' | 'scouting';

export interface PressRoomFeedSection {
  key: PressRoomSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  groups: Array<{ label: string; items: PressRoomEntry[] }>;
  unreadCount: number;
}

interface PressRoomSourceBoardProps {
  categoryOptions: string[];
  groupedFeed: PressRoomFeedSection[];
  isEntryPinned: (entry: PressRoomEntry) => boolean;
  isEntryUnread: (entry: PressRoomEntry) => boolean;
  onMarkAllRead: () => void;
  onSelectCategory: (category: string) => void;
  onSelectTag: (tag: 'all' | PressRoomEntry['tag']) => void;
  onSelectTeam: (teamId: string) => void;
  onTogglePinned: (entry: PressRoomEntry) => void;
  onToggleSection: (section: PressRoomSectionKey) => void;
  openSections: Record<PressRoomSectionKey, boolean>;
  pinnedFeed: PressRoomEntry[];
  selectedCategory: string;
  selectedTag: 'all' | PressRoomEntry['tag'];
  selectedTeam: string;
  teamOptions: string[];
}

function entryKey(entry: PressRoomEntry): string {
  return `${entry.source}:${entry.id}:${entry.timestamp}`;
}

function priorityTone(priority: number): string {
  if (priority <= 1) return 'border-accent-danger/40 bg-accent-danger/5';
  if (priority === 2) return 'border-accent-warning/40 bg-accent-warning/5';
  if (priority === 3) return 'border-accent-info/40 bg-accent-info/5';
  return 'border-dynasty-border bg-dynasty-elevated/70';
}

function sourceTone(source: PressRoomEntry['source']): string {
  switch (source) {
    case 'briefing':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    case 'press_conference':
      return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
    case 'league_wire':
    case 'news':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function tagTone(tag: PressRoomEntry['tag']): string {
  switch (tag) {
    case 'BREAKING':
      return 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger';
    case 'RUMOR':
      return 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning';
    case 'WATCH':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'DEBATE':
      return 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary';
    case 'ANALYSIS':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function formatCategory(category: string): string {
  return categoryLabel(category);
}

function formatTimestampLabel(timestamp: string): string {
  if (timestamp === 'NOW') return 'Now';
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return timestamp;
  return `Season ${match[1]} • Day ${match[2]}`;
}

export default function PressRoomSourceBoard({
  categoryOptions,
  groupedFeed,
  isEntryPinned,
  isEntryUnread,
  onMarkAllRead,
  onSelectCategory,
  onSelectTag,
  onSelectTeam,
  onTogglePinned,
  onToggleSection,
  openSections,
  pinnedFeed,
  selectedCategory,
  selectedTag,
  selectedTeam,
  teamOptions,
}: PressRoomSourceBoardProps): JSX.Element {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="mb-4 flex flex-col gap-4 border-b border-dynasty-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Source Board
          </h2>
          <p className="mt-1 font-heading text-xs text-dynasty-muted">
            Collapsible source desks with unread highlights, urgency framing, and archive filters.
          </p>
        </div>
        <PressRoomFilterControls
          categoryOptions={categoryOptions}
          onMarkAllRead={onMarkAllRead}
          onSelectCategory={onSelectCategory}
          onSelectTag={onSelectTag}
          onSelectTeam={onSelectTeam}
          selectedCategory={selectedCategory}
          selectedTag={selectedTag}
          selectedTeam={selectedTeam}
          teamOptions={teamOptions}
        />
      </div>

      {pinnedFeed.length > 0 ? (
        <section className="mb-4 rounded-lg border border-accent-warning/30 bg-accent-warning/5 p-4">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-accent-warning" />
            <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Read Later</h3>
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {pinnedFeed.map((entry) => (
              <article key={`pinned-${entryKey(entry)}`} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-heading text-sm text-dynasty-textBright">{entry.headline}</div>
                  <button
                    type="button"
                    onClick={() => onTogglePinned(entry)}
                    className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted hover:text-accent-warning"
                  >
                    Unpin
                  </button>
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-muted">
                  {sourceLabel(entry.source)} · {categoryLabel(entry.category)} · {formatTimestampLabel(entry.timestamp)}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-4">
        {groupedFeed.length > 0 ? groupedFeed.map((section) => {
          const Icon = section.icon;
          const isOpen = openSections[section.key];
          return (
            <section key={section.key} className="rounded-lg border border-dynasty-border/70 bg-dynasty-base/20">
              <button
                type="button"
                onClick={() => onToggleSection(section.key)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
              >
                <div className="flex items-start gap-3">
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 text-dynasty-muted" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 text-dynasty-muted" />
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 font-heading text-sm text-dynasty-textBright">
                        <Icon className="h-4 w-4" />
                        {section.label}
                      </span>
                      <span className="rounded border border-dynasty-border px-2 py-1 font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                        {section.groups.reduce((total, group) => total + group.items.length, 0)} stories
                      </span>
                      {section.unreadCount > 0 ? (
                        <span className="rounded border border-accent-info/40 bg-accent-info/10 px-2 py-1 font-heading text-[10px] uppercase tracking-[0.18em] text-accent-info">
                          Unread
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 font-heading text-xs text-dynasty-muted">
                      {section.description}
                    </p>
                  </div>
                </div>
                <span className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  {section.unreadCount} new
                </span>
              </button>

              {isOpen ? (
                <div className="space-y-4 border-t border-dynasty-border/70 px-4 py-4">
                  {section.groups.map((group) => (
                    <section key={`${section.key}-${group.label}`} className="space-y-3">
                      <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                        {group.label}
                      </div>
                      {group.items.map((entry) => {
                        const unread = isEntryUnread(entry);
                        const pinned = isEntryPinned(entry);
                        return (
                          <article
                            key={`${entry.source}-${entry.id}`}
                            className={`rounded-lg border-l-4 border p-4 ${priorityTone(entry.priority)} ${
                              unread ? 'ring-1 ring-accent-info/30' : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${tagTone(entry.tag)}`}>
                                {entry.tag}
                              </span>
                              <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${sourceTone(entry.source)}`}>
                                {sourceLabel(entry.source)}
                              </span>
                              <span className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                                {formatCategory(entry.category)}
                              </span>
                              <span className="rounded border border-dynasty-border px-2 py-1 font-data text-[10px] uppercase tracking-wide text-dynasty-muted">
                                Priority {entry.priority}
                              </span>
                              {unread ? (
                                <span className="rounded border border-accent-info/40 bg-accent-info/10 px-2 py-1 font-heading text-[10px] uppercase tracking-[0.18em] text-accent-info">
                                  Unread
                                </span>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => onTogglePinned(entry)}
                                className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${
                                  pinned
                                    ? 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning'
                                    : 'border-dynasty-border text-dynasty-muted hover:text-accent-warning'
                                }`}
                              >
                                {pinned ? 'Pinned' : 'Read Later'}
                              </button>
                              <span className="ml-auto font-data text-[11px] uppercase text-dynasty-muted">
                                {entry.timestamp}
                              </span>
                            </div>
                            <h3 className="mt-3 font-heading text-lg text-dynasty-textBright">
                              {entry.headline}
                            </h3>
                            <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
                              {entry.body}
                            </p>
                          </article>
                        );
                      })}
                    </section>
                  ))}
                </div>
              ) : null}
            </section>
          );
        }) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-8 text-center">
            <div className="font-heading text-lg text-dynasty-text">The room is quiet.</div>
            <p className="mt-2 font-heading text-sm text-dynasty-muted">
              Sim ahead or clear a filter to surface the next cycle of stories.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
