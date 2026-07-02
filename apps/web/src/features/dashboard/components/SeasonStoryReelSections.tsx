import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BookOpen,
  CalendarDays,
  Crown,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { humanizeLabel } from '@/shared/lib/labels';

const SIGNATURE_ARC_LABELS: Readonly<Record<string, string>> = {
  redemption_arc: 'Redemption',
  late_career_peak: 'Late-Career Peak',
  rookie_breakout: 'Rookie Breakout',
};

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
  playerArcs: Array<{
    playerId: string;
    playerName: string;
    arcType: string;
    description: string;
    relevance: number;
  }>;
}

function signatureArcLabel(arcType: string): string {
  return SIGNATURE_ARC_LABELS[arcType] ?? humanizeLabel(arcType);
}

export function isSeasonStoryReelEmpty(view: SeasonStoryReelView): boolean {
  return (
    view.storylines.length === 0
    && view.timelineEvents.length === 0
    && view.signatureBeats.length === 0
    && view.keyTransactions.length === 0
    && view.playoffPath.length === 0
    && view.awards.length === 0
    && view.statLeaderHighlights.length === 0
    && (view.playerArcs?.length ?? 0) === 0
  );
}

function SectionCard({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
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

function PlayerArcsSection({ arcs }: { arcs: SeasonStoryReelView['playerArcs'] }) {
  return (
    <SectionCard icon={<TrendingUp className="h-3.5 w-3.5 text-accent-info" />} label="Notable Player Arcs">
      <ul className="space-y-2">
        {arcs.map((arc) => (
          <li key={`player-arc-${arc.playerId}-${arc.arcType}`} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <Link
                to={`/players/${arc.playerId}?tab=moments`}
                className="truncate font-heading text-xs text-dynasty-textBright hover:text-accent-primary"
              >
                {arc.playerName}
              </Link>
              <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                {signatureArcLabel(arc.arcType)}
              </span>
            </div>
            {arc.description ? (
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">{arc.description}</div>
            ) : null}
          </li>
        ))}
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

export function SeasonStoryReelSections({ view }: { view: SeasonStoryReelView }) {
  return (
    <>
      {view.storylines.length > 0 ? <StorylinesSection storylines={view.storylines} /> : null}
      {view.timelineEvents.length > 0 ? <TimelineSection events={view.timelineEvents} /> : null}
      {view.signatureBeats.length > 0 ? <BeatsSection beats={view.signatureBeats} /> : null}
      {(view.playerArcs?.length ?? 0) > 0 ? <PlayerArcsSection arcs={view.playerArcs} /> : null}
      {view.keyTransactions.length > 0 ? <TransactionsSection entries={view.keyTransactions} /> : null}
      {view.playoffPath.length > 0 ? <PlayoffPathSection path={view.playoffPath} /> : null}
      {view.awards.length > 0 ? <AwardsSection awards={view.awards} /> : null}
      {view.statLeaderHighlights.length > 0 ? <StatLeadersSection leaders={view.statLeaderHighlights} /> : null}
    </>
  );
}
