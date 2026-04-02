import { useCallback, useEffect, useMemo, useState } from 'react';
import { Newspaper, Radio, ShieldAlert } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { useGameStore } from '@/shared/hooks/useGameStore';
import type { PressRoomEntry } from '@/shared/types/pressRoom';

function priorityTone(priority: number): string {
  if (priority <= 1) return 'border-accent-danger/50 text-accent-danger';
  if (priority === 2) return 'border-accent-warning/50 text-accent-warning';
  if (priority === 3) return 'border-accent-info/50 text-accent-info';
  return 'border-dynasty-border text-dynasty-muted';
}

function sourceTone(source: PressRoomEntry['source']): string {
  return source === 'briefing'
    ? 'border-accent-info/40 bg-accent-info/10 text-accent-info'
    : 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
}

function tagTone(tag: PressRoomEntry['tag']): string {
  switch (tag) {
    case 'BREAKING':
      return 'border-accent-danger/50 bg-accent-danger/10 text-accent-danger';
    case 'RUMOR':
      return 'border-accent-warning/50 bg-accent-warning/10 text-accent-warning';
    case 'ANALYSIS':
      return 'border-accent-info/40 bg-accent-info/10 text-accent-info';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function formatCategory(category: string): string {
  return category.replace(/_/g, ' ');
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
  const [feed, setFeed] = useState<PressRoomEntry[]>([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTag, setSelectedTag] = useState<'all' | PressRoomEntry['tag']>('all');

  const fetchFeed = useCallback(async () => {
    if (!isInitialized || !workerReady) return;
    try {
      const nextFeed = await worker.getPressRoomFeed(100);
      setFeed((nextFeed ?? []) as PressRoomEntry[]);
    } catch (err) {
      console.error('Failed to fetch press room feed:', err);
    }
  }, [isInitialized, workerReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void fetchFeed();
  }, [fetchFeed, day, season, phase]);

  const briefingCount = feed.filter((entry) => entry.source === 'briefing').length;
  const newsCount = feed.length - briefingCount;
  const teamOptions = useMemo(() => {
    const ids = new Set(feed.flatMap((entry) => entry.relatedTeamIds));
    return Array.from(ids).sort();
  }, [feed]);
  const categoryOptions = useMemo(() => {
    return Array.from(new Set(feed.map((entry) => entry.category))).sort();
  }, [feed]);

  const filteredFeed = feed.filter((entry) => {
    const teamMatch = selectedTeam === 'all' || entry.relatedTeamIds.includes(selectedTeam);
    const categoryMatch = selectedCategory === 'all' || entry.category === selectedCategory;
    const tagMatch = selectedTag === 'all' || entry.tag === selectedTag;
    return teamMatch && categoryMatch && tagMatch;
  });
  const groupedFeed = groupFeedByTimestamp(filteredFeed);
  const transactionFeed = filteredFeed.filter(isTransactionEntry).slice(0, 12);

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
            Briefing Desk
          </div>
          <div className="mt-2 font-data text-3xl text-accent-info">{briefingCount}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            front-office items
          </div>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
          <div className="flex items-center gap-2 font-heading text-xs uppercase text-dynasty-muted">
            <Radio className="h-4 w-4" />
            News Wire
          </div>
          <div className="mt-2 font-data text-3xl text-accent-warning">{newsCount}</div>
          <div className="mt-1 font-heading text-xs text-dynasty-muted">
            archived headlines
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-4 flex flex-col gap-4 border-b border-dynasty-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
              Unified Feed
            </h2>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">
              Grouped by sim date, filterable by club, story type, and urgency.
            </p>
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
                    {formatCategory(category)}
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
                <option value="RECAP">RECAP</option>
                <option value="RUMOR">RUMOR</option>
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-6">
          {groupedFeed.length > 0 ? groupedFeed.map((group) => (
            <section key={group.label} className="space-y-3">
              <div className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                {group.label}
              </div>
              {group.items.map((entry) => (
                <article
                  key={`${entry.source}-${entry.id}`}
                  className={`rounded-lg border p-4 ${
                    entry.tag === 'BREAKING'
                      ? 'border-accent-danger/40 bg-[radial-gradient(circle_at_top,rgba(196,62,62,0.12),transparent_45%),linear-gradient(180deg,rgba(20,24,28,0.98),rgba(13,16,19,0.98))]'
                      : 'border-dynasty-border bg-[radial-gradient(circle_at_top,rgba(181,166,114,0.08),transparent_48%),linear-gradient(180deg,rgba(20,24,28,0.98),rgba(13,16,19,0.98))]'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${tagTone(entry.tag)}`}>
                      {entry.tag}
                    </span>
                    <span className={`rounded border px-2 py-1 font-heading text-[10px] uppercase tracking-wide ${sourceTone(entry.source)}`}>
                      {entry.source}
                    </span>
                    <span className="rounded border border-dynasty-border px-2 py-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                      {formatCategory(entry.category)}
                    </span>
                    <span className={`rounded border px-2 py-1 font-data text-[10px] uppercase tracking-wide ${priorityTone(entry.priority)}`}>
                      Priority {entry.priority}
                    </span>
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
              ))}
            </section>
          )) : (
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
    </div>
  );
}
