import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Mic,
  Newspaper,
  Radio,
  Search,
  ShieldAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { usePreferencesStore } from '@/shared/hooks/usePreferencesStore';
import { categoryLabel, sourceLabel } from '@/shared/lib/labels';
import { logger } from '@/shared/lib/logger';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

type SectionKey = 'briefings' | 'league_wire' | 'press_conferences' | 'scouting';

interface FeedSection {
  key: SectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  groups: Array<{ label: string; items: PressRoomEntry[] }>;
  unreadCount: number;
}

const SECTION_DEFINITIONS: Array<{
  key: SectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  matches: (entry: PressRoomEntry) => boolean;
}> = [
  {
    key: 'briefings',
    label: 'Team Briefings',
    description: 'Internal pulses from ownership, chemistry, and the front office desk.',
    icon: ShieldAlert,
    matches: (entry) => entry.source === 'briefing' && entry.category !== 'development',
  },
  {
    key: 'league_wire',
    label: 'League Wire',
    description: 'League movement, rumor circulation, and broader narrative spillover.',
    icon: Radio,
    matches: (entry) => entry.source === 'league_wire' || entry.source === 'news',
  },
  {
    key: 'press_conferences',
    label: 'Press Conferences',
    description: 'Media-room framing, sharper questions, and public-facing tension points.',
    icon: Mic,
    matches: (entry) => entry.source === 'press_conference',
  },
  {
    key: 'scouting',
    label: 'Scouting Reports',
    description: 'Prospect momentum, development notes, and promotion pressure from the farm.',
    icon: Search,
    matches: (entry) => entry.category === 'development',
  },
];

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  briefings: true,
  league_wire: true,
  press_conferences: true,
  scouting: true,
};

const PRESS_READ_STORAGE_KEY = 'mbd-press-room-read-ids';
const PRESS_PINNED_STORAGE_KEY = 'mbd-press-room-pinned-ids';

function entryKey(entry: PressRoomEntry): string {
  return `${entry.source}:${entry.id}:${entry.timestamp}`;
}

function readStoredIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    const parsed = rawValue ? JSON.parse(rawValue) as unknown : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeStoredIdSet(key: string, values: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(Array.from(values).slice(-300)));
}

function parseTimestamp(timestamp: string): number {
  if (timestamp === 'NOW') return Number.MAX_SAFE_INTEGER;
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return 0;
  return Number(match[1]) * 1000 + Number(match[2]);
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

function groupFeedByTimestamp(feed: PressRoomEntry[]): Array<{ label: string; items: PressRoomEntry[] }> {
  const groups = new Map<string, PressRoomEntry[]>();
  for (const entry of feed) {
    const current = groups.get(entry.timestamp) ?? [];
    current.push(entry);
    groups.set(entry.timestamp, current);
  }

  return Array.from(groups.entries()).map(([timestamp, items]) => ({
    label: formatTimestampLabel(timestamp),
    items,
  }));
}

function isTransactionEntry(entry: PressRoomEntry): boolean {
  return ['trade', 'signing', 'extension', 'qualifying_offer', 'coaching', 'roster_move'].includes(entry.category);
}

export default function PressRoomPage() {
  const worker = useWorker();
  const workerReady = worker.isReady;
  const { isInitialized, day, season, phase } = useGameStore();
  const lastVisitedPressRoomAt = usePreferencesStore((state) => state.lastVisitedPressRoomAt);
  const setLastVisitedPressRoomAt = usePreferencesStore((state) => state.setLastVisitedPressRoomAt);
  const visitBaselineRef = useRef(lastVisitedPressRoomAt);
  const [feed, setFeed] = useState<PressRoomEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<'all' | PressRoomEntry['tag']>('all');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN_SECTIONS);
  const [readIds, setReadIds] = useState<Set<string>>(() => readStoredIdSet(PRESS_READ_STORAGE_KEY));
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => readStoredIdSet(PRESS_PINNED_STORAGE_KEY));

  const fetchFeed = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const nextFeed = await worker.getPressRoomFeed(100);
      setFeed((nextFeed ?? []) as PressRoomEntry[]);
    } catch (err) {
      logger.error('Failed to fetch press room feed:', err);
    }
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, day, season, phase]);

  useEffect(() => {
    writeStoredIdSet(PRESS_READ_STORAGE_KEY, readIds);
  }, [readIds]);

  useEffect(() => {
    writeStoredIdSet(PRESS_PINNED_STORAGE_KEY, pinnedIds);
  }, [pinnedIds]);

  useEffect(() => {
    if (feed.length === 0) {
      return;
    }

    const latestTimestamp = feed.reduce(
      (latest, entry) => (parseTimestamp(entry.timestamp) > parseTimestamp(latest) ? entry.timestamp : latest),
      feed[0]!.timestamp,
    );
    if (latestTimestamp !== lastVisitedPressRoomAt) {
      setLastVisitedPressRoomAt(latestTimestamp);
    }
  }, [feed, lastVisitedPressRoomAt, setLastVisitedPressRoomAt]);

  const isUnread = useCallback((entry: PressRoomEntry) => {
    if (readIds.has(entryKey(entry))) {
      return false;
    }
    const visitBaseline = visitBaselineRef.current;
    if (!visitBaseline) {
      return true;
    }
    return parseTimestamp(entry.timestamp) > parseTimestamp(visitBaseline);
  }, [readIds]);

  const briefingCount = feed.filter((entry) => entry.source === 'briefing' && entry.category !== 'development').length;
  const scoutingCount = feed.filter((entry) => entry.category === 'development').length;
  const unreadCount = feed.filter(isUnread).length;
  const teamOptions = useMemo(() => {
    const ids = new Set(feed.flatMap((entry) => entry.relatedTeamIds));
    return Array.from(ids).sort();
  }, [feed]);
  const categoryOptions = useMemo(() => Array.from(new Set(feed.map((entry) => entry.category))).sort(), [feed]);

  const filteredFeed = feed.filter((entry) => {
    const teamMatch = selectedTeam === 'all' || entry.relatedTeamIds.includes(selectedTeam);
    const categoryMatch = selectedCategory === 'all' || entry.category === selectedCategory;
    const tagMatch = selectedTag === 'all' || entry.tag === selectedTag;
    return teamMatch && categoryMatch && tagMatch;
  });
  const pinnedFeed = useMemo(
    () => feed.filter((entry) => pinnedIds.has(entryKey(entry))).slice(0, 8),
    [feed, pinnedIds],
  );

  const groupedFeed = useMemo<FeedSection[]>(() => SECTION_DEFINITIONS
    .map((section) => {
      const entries = filteredFeed.filter(section.matches);
      return {
        key: section.key,
        label: section.label,
        description: section.description,
        icon: section.icon,
        groups: groupFeedByTimestamp(entries),
        unreadCount: entries.filter(isUnread).length,
      };
    })
    .filter((section) => section.groups.length > 0), [filteredFeed, isUnread]);

  const transactionFeed = filteredFeed.filter(isTransactionEntry).slice(0, 12);

  const markAllRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current);
      for (const entry of filteredFeed) {
        next.add(entryKey(entry));
      }
      return next;
    });

    if (filteredFeed.length > 0) {
      const latestTimestamp = filteredFeed.reduce(
        (latest, entry) => (parseTimestamp(entry.timestamp) > parseTimestamp(latest) ? entry.timestamp : latest),
        filteredFeed[0]!.timestamp,
      );
      visitBaselineRef.current = latestTimestamp;
      setLastVisitedPressRoomAt(latestTimestamp);
    }
  }, [filteredFeed, setLastVisitedPressRoomAt]);

  const togglePinned = useCallback((entry: PressRoomEntry) => {
    const key = entryKey(entry);
    setPinnedIds((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  function toggleSection(section: SectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Press Room
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          An expanded archive of front-office signals, league analysis, rumors, and breaking headlines.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
            <Newspaper className="h-4 w-4" />
            Archive Size
          </div>
          <div className="mt-2 font-data text-3xl text-dynasty-textBright">{feed.length}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            tagged stories on file
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
            <ShieldAlert className="h-4 w-4" />
            Unread Queue
          </div>
          <div className="mt-2 font-data text-3xl text-accent-info">{unreadCount}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            items newer than your last visit
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
            <Search className="h-4 w-4" />
            Scouting Desk
          </div>
          <div className="mt-2 font-data text-3xl text-accent-success">{scoutingCount}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            player development items
          </div>
        </div>
      </div>

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
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={markAllRead}
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
                onChange={(event) => setSelectedTeam(event.target.value)}
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
                onChange={(event) => setSelectedCategory(event.target.value)}
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
                onChange={(event) => setSelectedTag(event.target.value as 'all' | PressRoomEntry['tag'])}
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
                      onClick={() => togglePinned(entry)}
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
                  onClick={() => toggleSection(section.key)}
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
                          const unread = isUnread(entry);
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
                                  onClick={() => togglePinned(entry)}
                                  className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${
                                    pinnedIds.has(entryKey(entry))
                                      ? 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning'
                                      : 'border-dynasty-border text-dynasty-muted hover:text-accent-warning'
                                  }`}
                                >
                                  {pinnedIds.has(entryKey(entry)) ? 'Pinned' : 'Read Later'}
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

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-4 flex items-center justify-between border-b border-dynasty-border pb-4">
          <div>
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
              Transaction Log
            </h2>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">
              League moves pulled from trade, signing, extension, qualifying-offer, coaching, and roster activity.
            </p>
          </div>
          <div className="rounded border border-dynasty-border px-3 py-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            {transactionFeed.length} entries
          </div>
        </div>

        <div className="space-y-3">
          {transactionFeed.length > 0 ? transactionFeed.map((entry) => (
            <div
              key={`transaction-${entry.source}-${entry.id}`}
              className="flex flex-col gap-2 rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${tagTone(entry.tag)}`}>
                    {entry.tag}
                  </span>
                  <span className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                    {formatCategory(entry.category)}
                  </span>
                </div>
                <div className="mt-2 font-heading text-sm text-dynasty-textBright">{entry.headline}</div>
                <div className="mt-1 font-heading text-xs text-dynasty-muted">{entry.body}</div>
              </div>
              <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                {formatTimestampLabel(entry.timestamp)}
              </div>
            </div>
          )) : (
            <div className="rounded border border-dynasty-border bg-dynasty-elevated p-6 text-center">
              <div className="font-heading text-sm text-dynasty-text">No league transactions match the current filters.</div>
            </div>
          )}
        </div>
      </section>

      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="font-heading text-sm text-dynasty-textBright">
          Briefings on file
        </div>
        <div className="mt-2 font-data text-xs uppercase tracking-[0.18em] text-dynasty-muted">
          {briefingCount} team briefings tracked for this visit window
        </div>
      </div>
    </div>
  );
}
