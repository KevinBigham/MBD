import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BookOpen,
  CalendarDays,
  Crown,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

export interface SeasonStoryReelView {
  season: number;
  userTeamId: string;
  userTeamName: string;
  userTeamAbbreviation: string;
  record: { wins: number; losses: number } | null;
  divisionRank: number | null;
  playoffResult: string | null;
  storylines: string[];
  timelineEvents: Array<{
    headline: string;
    summary?: string | null;
    day?: number | null;
  }>;
  signatureBeats: Array<{
    type: string;
    description: string;
    day: number | null;
    impact: number;
    relevance: number;
  }>;
  keyTransactions: Array<{
    headline: string;
    summary: string;
    impactScore: number;
  }>;
  playoffPath: Array<{
    round: string;
    result: string;
    opponentTeamId: string | null;
    opponentTeamName: string | null;
    didWin: boolean;
  }>;
  awards: Array<{
    award: string;
    playerId: string;
    playerName: string;
    league: string | null;
    summary?: string | null;
  }>;
  statLeaderHighlights: Array<{
    category: string;
    playerId: string;
    playerName: string;
    teamId: string;
    teamAbbreviation: string;
    value: string;
  }>;
}

interface SeasonStoryReelModalProps {
  seasonYear: number;
  onDismiss: () => void;
}

function humanizeLabel(value: string): string {
  return value
    .split('_')
    .map((word) => (word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
    .join(' ');
}

function formatRank(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  const mod10 = rank % 10;
  if (mod10 === 1) return `${rank}st`;
  if (mod10 === 2) return `${rank}nd`;
  if (mod10 === 3) return `${rank}rd`;
  return `${rank}th`;
}

export default function SeasonStoryReelModal({ seasonYear, onDismiss }: SeasonStoryReelModalProps) {
  const { getSeasonStoryReel, isReady } = useWorker();
  const [view, setView] = useState<SeasonStoryReelView | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const fetchReel = useCallback(async () => {
    if (!isReady || typeof getSeasonStoryReel !== 'function') {
      setView(null);
      setLoading(false);
      return;
    }
    try {
      const data = await getSeasonStoryReel(seasonYear);
      setView((data as SeasonStoryReelView | null) ?? null);
      setErrored(false);
    } catch {
      setView(null);
      setErrored(true);
    } finally {
      setLoading(false);
    }
  }, [getSeasonStoryReel, isReady, seasonYear]);

  useEffect(() => {
    void fetchReel();
  }, [fetchReel]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const header = useMemo(() => {
    if (!view) return null;
    const recordText = view.record ? `${view.record.wins}-${view.record.losses}` : null;
    const rankText = view.divisionRank ? `${formatRank(view.divisionRank)} in division` : null;
    return { recordText, rankText };
  }, [view]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="season-story-reel-title"
      onClick={onDismiss}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-dynasty-border bg-dynasty-elevated shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-dynasty-border/70 px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-accent-info" />
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">
                Season Story Reel
              </div>
            </div>
            <h2
              id="season-story-reel-title"
              className="mt-1 font-heading text-lg font-semibold text-dynasty-textBright"
            >
              Season {seasonYear}
              {view ? ` — ${view.userTeamName}` : ''}
            </h2>
            {view ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-data text-[11px] text-dynasty-text">
                {header?.recordText ? (
                  <span>
                    <span className="text-dynasty-muted">Record </span>
                    <span className="text-dynasty-textBright">{header.recordText}</span>
                  </span>
                ) : null}
                {header?.rankText ? <span className="text-dynasty-muted">{header.rankText}</span> : null}
                {view.playoffResult ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.14em] text-accent-warning">
                    <Trophy className="h-3 w-3" />
                    {view.playoffResult}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border border-dynasty-border/70 bg-dynasty-surface/70 p-1.5 text-dynasty-muted transition hover:bg-dynasty-surface hover:text-dynasty-textBright"
            aria-label="Close season story reel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="font-heading text-sm text-dynasty-muted">Loading season story...</div>
          ) : errored ? (
            <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/5 p-3 font-heading text-sm text-accent-danger">
              Could not load this season's story. Try again from the dashboard.
            </div>
          ) : !view ? (
            <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
              No archive exists for Season {seasonYear} yet.
            </div>
          ) : (
            <div className="space-y-3">
              {view.storylines.length > 0 ? <StorylinesSection storylines={view.storylines} /> : null}
              {view.timelineEvents.length > 0 ? <TimelineSection events={view.timelineEvents} /> : null}
              {view.signatureBeats.length > 0 ? <BeatsSection beats={view.signatureBeats} /> : null}
              {view.keyTransactions.length > 0 ? <TransactionsSection entries={view.keyTransactions} /> : null}
              {view.playoffPath.length > 0 ? <PlayoffPathSection path={view.playoffPath} /> : null}
              {view.awards.length > 0 ? <AwardsSection awards={view.awards} /> : null}
              {view.statLeaderHighlights.length > 0 ? (
                <StatLeadersSection leaders={view.statLeaderHighlights} />
              ) : null}
              {isEmptySeason(view) ? (
                <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
                  Season {seasonYear} wrapped with a quiet record — no signature beats filed yet.
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isEmptySeason(view: SeasonStoryReelView): boolean {
  return (
    view.storylines.length === 0
    && view.timelineEvents.length === 0
    && view.signatureBeats.length === 0
    && view.keyTransactions.length === 0
    && view.playoffPath.length === 0
    && view.awards.length === 0
    && view.statLeaderHighlights.length === 0
  );
}

function SectionCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">{label}</div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StorylinesSection({ storylines }: { storylines: string[] }) {
  return (
    <SectionCard icon={<BookOpen className="h-3.5 w-3.5 text-accent-info" />} label="Storylines">
      <ul className="space-y-1.5">
        {storylines.map((line, idx) => (
          <li key={`storyline-${idx}`} className="font-heading text-xs text-dynasty-text">
            {line}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function TimelineSection({ events }: { events: SeasonStoryReelView['timelineEvents'] }) {
  return (
    <SectionCard icon={<CalendarDays className="h-3.5 w-3.5 text-accent-info" />} label="Timeline">
      <ul className="space-y-2">
        {events.map((event, idx) => (
          <li key={`timeline-${idx}`} className="flex items-start gap-2">
            <span className="mt-0.5 inline-flex h-4 w-auto shrink-0 items-center rounded-full border border-dynasty-border/60 bg-dynasty-elevated/70 px-1.5 font-data text-[9px] uppercase tracking-[0.12em] text-dynasty-muted">
              {event.day != null ? `D${event.day}` : '—'}
            </span>
            <div className="min-w-0">
              <div className="font-heading text-xs text-dynasty-textBright">{event.headline}</div>
              {event.summary ? (
                <div className="mt-0.5 font-heading text-xs text-dynasty-text">{event.summary}</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function BeatsSection({ beats }: { beats: SeasonStoryReelView['signatureBeats'] }) {
  return (
    <SectionCard icon={<Sparkles className="h-3.5 w-3.5 text-accent-info" />} label="Signature Beats">
      <ul className="space-y-2">
        {beats.map((beat, idx) => {
          const positive = beat.impact >= 0;
          const Icon = positive ? Sparkles : AlertTriangle;
          const iconClass = positive ? 'text-accent-success' : 'text-accent-danger';
          return (
            <li key={`beat-${beat.type}-${beat.day ?? idx}`} className="flex items-start gap-2">
              <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${iconClass}`} />
              <div className="min-w-0">
                <div className="font-heading text-xs text-dynasty-textBright">{humanizeLabel(beat.type)}</div>
                <div className="mt-0.5 font-heading text-xs text-dynasty-text">{beat.description}</div>
                <div className="mt-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                  {beat.day != null ? `Day ${beat.day} · ` : ''}Impact {beat.impact >= 0 ? '+' : ''}
                  {Math.round(beat.impact)}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function TransactionsSection({ entries }: { entries: SeasonStoryReelView['keyTransactions'] }) {
  return (
    <SectionCard icon={<ArrowLeftRight className="h-3.5 w-3.5 text-accent-info" />} label="Key Transactions">
      <ul className="space-y-2">
        {entries.map((entry, idx) => (
          <li key={`txn-${idx}`} className="min-w-0">
            <div className="font-heading text-xs font-semibold text-dynasty-textBright">{entry.headline}</div>
            <div className="mt-0.5 font-heading text-xs text-dynasty-text">{entry.summary}</div>
            <div className="mt-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Impact <span className="text-dynasty-textBright">{Math.round(entry.impactScore)}</span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function PlayoffPathSection({ path }: { path: SeasonStoryReelView['playoffPath'] }) {
  return (
    <SectionCard icon={<Crown className="h-3.5 w-3.5 text-accent-warning" />} label="Playoff Path">
      <ol className="space-y-2">
        {path.map((series, idx) => (
          <li key={`series-${idx}`} className="flex items-start gap-2">
            <span
              className={`mt-0.5 inline-flex h-5 shrink-0 items-center rounded-full px-2 font-data text-[10px] uppercase tracking-[0.12em] ${
                series.didWin
                  ? 'border border-accent-success/40 bg-accent-success/10 text-accent-success'
                  : 'border border-accent-danger/40 bg-accent-danger/10 text-accent-danger'
              }`}
            >
              {series.didWin ? 'Won' : 'Lost'}
            </span>
            <div className="min-w-0">
              <div className="font-heading text-xs text-dynasty-textBright">{humanizeLabel(series.round)}</div>
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">
                {series.opponentTeamName ? `vs ${series.opponentTeamName}` : 'Opponent TBD'} · {series.result}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

function AwardsSection({ awards }: { awards: SeasonStoryReelView['awards'] }) {
  return (
    <SectionCard icon={<Award className="h-3.5 w-3.5 text-accent-warning" />} label="Awards">
      <ul className="space-y-2">
        {awards.map((entry, idx) => (
          <li key={`award-${entry.award}-${entry.playerId}-${idx}`} className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-heading text-xs font-semibold text-dynasty-textBright">
                {humanizeLabel(entry.award)}
              </span>
              <span className="font-heading text-xs text-dynasty-text">{entry.playerName}</span>
              {entry.league ? (
                <span className="font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                  {entry.league}
                </span>
              ) : null}
            </div>
            {entry.summary ? (
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">{entry.summary}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function StatLeadersSection({ leaders }: { leaders: SeasonStoryReelView['statLeaderHighlights'] }) {
  return (
    <SectionCard icon={<Star className="h-3.5 w-3.5 text-accent-info" />} label="Stat Leaders">
      <ul className="grid gap-2 sm:grid-cols-2">
        {leaders.map((leader) => (
          <li
            key={`leader-${leader.category}-${leader.playerId}`}
            className="rounded border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-data text-[10px] uppercase tracking-[0.14em] text-dynasty-muted">
                {leader.category}
              </span>
              <span className="font-heading text-xs font-semibold text-dynasty-textBright">{leader.value}</span>
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="truncate font-heading text-xs text-dynasty-textBright">{leader.playerName}</span>
              <span className="ml-auto shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                {leader.teamAbbreviation}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
