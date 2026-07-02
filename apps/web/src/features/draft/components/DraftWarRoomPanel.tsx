import { useEffect, useRef } from 'react';
import { Radio } from 'lucide-react';
import type { WorkerApi } from '@/workers/sim.worker';
import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

type DraftCommentaryView = Awaited<ReturnType<WorkerApi['getDraftCommentary']>>;
type DraftProspectReactionView = Awaited<ReturnType<WorkerApi['getDraftProspectReaction']>>;

function commentaryTagLabel(tag: NonNullable<DraftCommentaryView>['entries'][number]['tag']): string {
  switch (tag) {
    case 'commissioner':
      return 'Commissioner';
    case 'scouting-director':
      return 'Scouting Director';
    default:
      return 'Analyst Desk';
  }
}

function commentaryToneClasses(tone: NonNullable<DraftCommentaryView>['entries'][number]['tone']): string {
  switch (tone) {
    case 'user':
      return 'border-accent-success/30 bg-accent-success/10';
    case 'division_rival':
      return 'border-accent-warning/30 bg-accent-warning/10';
    default:
      return 'border-dynasty-border bg-dynasty-elevated/70';
  }
}

function buzzTrendClasses(trend: NonNullable<DraftCommentaryView>['buzz'][number]['trend']): string {
  switch (trend) {
    case 'up':
      return 'text-accent-success';
    case 'down':
      return 'text-accent-danger';
    default:
      return 'text-accent-info';
  }
}

function recommendationChipClass(recommendation: NonNullable<DraftProspectReactionView>['recommendation']): string {
  switch (recommendation) {
    case 'sprint':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'hover':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    default:
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
  }
}

interface DraftWarRoomPanelProps {
  commentary: DraftCommentaryView | null;
  reaction: DraftProspectReactionView | null;
  selectedProspect: DraftRoomProspect | null;
}

export function DraftWarRoomPanel({
  commentary,
  reaction,
  selectedProspect,
}: DraftWarRoomPanelProps) {
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!feedRef.current) {
      return;
    }

    if (typeof feedRef.current.scrollTo === 'function') {
      feedRef.current.scrollTo({
        top: feedRef.current.scrollHeight,
        behavior: 'smooth',
      });
      return;
    }

    feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [commentary?.entries.length]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
        <div className="border-b border-dynasty-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-accent-info" />
            <div>
              <h2 className="font-heading text-sm font-semibold text-dynasty-text">War Room</h2>
              <p className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                Live commentary, market buzz, and room pressure
              </p>
            </div>
          </div>
          {commentary?.heartbeat ? (
            <p className="mt-3 font-heading text-sm text-dynasty-textBright">{commentary.heartbeat}</p>
          ) : null}
        </div>

        <div className="border-b border-dynasty-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Buzz Tracker</p>
            <span className="font-data text-[11px] text-dynasty-muted">{commentary?.buzz.length ?? 0} signals</span>
          </div>
          <div className="mt-3 space-y-2">
            {commentary?.buzz.length ? commentary.buzz.map((item) => (
              <div key={item.id} className="rounded border border-dynasty-border bg-dynasty-elevated/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading text-xs font-semibold text-dynasty-textBright">{item.label}</p>
                  <span className={`font-data text-[11px] uppercase tracking-[0.18em] ${buzzTrendClasses(item.trend)}`}>
                    {item.urgency}
                  </span>
                </div>
                <p className="mt-1 font-heading text-xs text-dynasty-muted">{item.summary}</p>
              </div>
            )) : (
              <p className="font-heading text-xs text-dynasty-muted">The room is still gathering signals.</p>
            )}
          </div>
        </div>

        <div className="border-b border-dynasty-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Pick Preview</p>
            {reaction ? (
              <span className={`rounded border px-2 py-1 font-data text-[11px] uppercase tracking-[0.18em] ${recommendationChipClass(reaction.recommendation)}`}>
                {reaction.recommendation}
              </span>
            ) : null}
          </div>
          {reaction ? (
            <div className="mt-3 space-y-2">
              <p className="font-heading text-sm font-semibold text-dynasty-textBright">{reaction.headline}</p>
              <p className="font-heading text-xs text-dynasty-text">{reaction.summary}</p>
              <p className="font-heading text-xs text-dynasty-muted">{reaction.fit}</p>
              <p className="font-heading text-xs text-dynasty-muted">{reaction.risk}</p>
              <p className="font-heading text-xs text-dynasty-muted">{reaction.signability}</p>
            </div>
          ) : (
            <p className="mt-3 font-heading text-xs text-dynasty-muted">
              {selectedProspect
                ? 'Loading preview...'
                : 'Select a prospect to see the war-room read.'}
            </p>
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">Commentary Feed</p>
            <span className="font-data text-[11px] text-dynasty-muted">{commentary?.entries.length ?? 0} notes</span>
          </div>
          <div ref={feedRef} className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            {commentary?.entries.length ? commentary.entries.map((entry) => (
              <div key={entry.id} className={`rounded border px-3 py-2 ${commentaryToneClasses(entry.tone)}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    {commentaryTagLabel(entry.tag)}
                  </p>
                  {entry.pickNumber ? (
                    <span className="font-data text-[11px] text-dynasty-muted">Pick {entry.pickNumber}</span>
                  ) : null}
                </div>
                <p className="mt-1 font-heading text-sm font-semibold text-dynasty-textBright">{entry.headline}</p>
                <p className="mt-1 font-heading text-xs text-dynasty-muted">{entry.detail}</p>
              </div>
            )) : (
              <p className="font-heading text-xs text-dynasty-muted">
                Start the draft to bring the war-room feed online.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
