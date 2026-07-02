import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@mbd/ui';
import { getTeamById } from '@mbd/sim-core';
import type { NewsItem } from '@mbd/contracts';

const BODY_EXCERPT_LENGTH = 180;

interface NewsItemCardProps {
  item: NewsItem;
  expanded: boolean;
  marking: boolean;
  onOpen: (item: NewsItem) => void;
}

function formatTimestamp(timestamp: string): string {
  if (timestamp === 'NOW') return 'Now';
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) return timestamp;
  return `Season ${match[1]} · Day ${match[2]}`;
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function bodyExcerpt(body: string): string {
  if (body.length <= BODY_EXCERPT_LENGTH) return body;
  return `${body.slice(0, BODY_EXCERPT_LENGTH - 3).trim()}...`;
}

function priorityVariant(priority: NewsItem['priority']): 'danger' | 'warning' | 'info' | 'outline' {
  if (priority <= 1) return 'danger';
  if (priority === 2) return 'warning';
  if (priority === 3) return 'info';
  return 'outline';
}

function tagVariant(tag: NewsItem['tag']): 'danger' | 'warning' | 'success' | 'info' | 'default' | 'outline' {
  switch (tag) {
    case 'BREAKING':
      return 'danger';
    case 'RUMOR':
      return 'warning';
    case 'WATCH':
      return 'success';
    case 'ANALYSIS':
      return 'info';
    case 'DEBATE':
      return 'default';
    default:
      return 'outline';
  }
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team?.abbreviation ?? teamId.toUpperCase();
}

export function newsCategoryLabel(category: string): string {
  return formatCategory(category);
}

export default function NewsItemCard({
  item,
  expanded,
  marking,
  onOpen,
}: NewsItemCardProps): JSX.Element {
  const isUnread = !item.read;

  return (
    <article
      data-news-id={item.id}
      className={[
        'rounded-lg border bg-dynasty-surface transition-colors',
        isUnread ? 'border-accent-info/50 shadow-[inset_3px_0_0_rgba(20,184,166,0.55)]' : 'border-dynasty-border/80 opacity-80',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-expanded={expanded}
        className="focus-ring flex w-full flex-col gap-3 rounded-lg px-4 py-4 text-left sm:px-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-heading text-[10px] uppercase tracking-[0.14em]">
            {formatCategory(item.category)}
          </Badge>
          <Badge variant={priorityVariant(item.priority)} className="font-data text-[10px] uppercase tracking-[0.14em]">
            Priority {item.priority}
          </Badge>
          {item.tag ? (
            <Badge variant={tagVariant(item.tag)} className="font-heading text-[10px] uppercase tracking-[0.14em]">
              {item.tag}
            </Badge>
          ) : null}
          <Badge variant={isUnread ? 'info' : 'outline'} className="font-heading text-[10px] uppercase tracking-[0.14em]">
            {isUnread ? 'Unread' : 'Read'}
          </Badge>
          <span className="ml-auto font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {formatTimestamp(item.timestamp)}
          </span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold leading-6 text-dynasty-textBright">
              {item.headline}
            </h2>
            <p className="mt-2 max-w-4xl font-heading text-sm leading-6 text-dynasty-text">
              {expanded ? item.body : bodyExcerpt(item.body)}
            </p>
          </div>
          <span className="mt-1 shrink-0 text-dynasty-muted">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        </div>

        {(item.relatedTeamIds.length > 0 || item.relatedPlayerIds.length > 0) ? (
          <div className="flex flex-wrap gap-2">
            {item.relatedTeamIds.map((teamId) => (
              <span
                key={`team-${item.id}-${teamId}`}
                className="rounded border border-accent-primary/30 bg-accent-primary/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-primary"
              >
                {teamLabel(teamId)}
              </span>
            ))}
            {item.relatedPlayerIds.map((playerId) => (
              <span
                key={`player-${item.id}-${playerId}`}
                className="max-w-full truncate rounded border border-dynasty-border px-2 py-1 font-data text-[10px] text-dynasty-muted"
              >
                {playerId}
              </span>
            ))}
          </div>
        ) : null}

        {marking ? (
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            Saving read state...
          </div>
        ) : null}
      </button>
    </article>
  );
}
