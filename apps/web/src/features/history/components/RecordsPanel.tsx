import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RecordBookEntry, RecordWatchEntry } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';
import { ProgressFill } from '@/shared/components/ProgressFill';

export interface RecordBookView {
  franchise: RecordBookEntry[];
  league: RecordBookEntry[];
}

interface RecordsPanelProps {
  playerName: (playerId: string) => string;
  recordBook: RecordBookView;
  recordWatch: RecordWatchEntry[];
  teamName: (teamId: string | null) => string;
}

export default function RecordsPanel({
  playerName,
  recordBook,
  recordWatch,
  teamName,
}: RecordsPanelProps) {
  return (
    <DensePanel
      title="Records"
      icon={<Trophy className="h-4 w-4 text-accent-info" />}
      titleClassName="text-dynasty-textBright"
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr_0.8fr]">
        <RecordBookColumn
          entries={recordBook.franchise}
          playerName={playerName}
          teamName={teamName}
          title="Franchise Record Book"
        />
        <RecordBookColumn
          entries={recordBook.league}
          playerName={playerName}
          teamName={teamName}
          title="League Record Book"
        />
        <RecordWatchPanel
          entries={recordWatch}
          playerName={playerName}
          teamName={teamName}
        />
      </div>
    </DensePanel>
  );
}

function RecordBookColumn({
  title,
  entries,
  playerName,
  teamName,
}: {
  title: string;
  entries: RecordBookEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        {title}
      </div>
      <div className="space-y-3">
        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-heading text-sm text-dynasty-textBright">{entry.label}</div>
            {entry.qualifier && (
              <div className="mt-1 font-heading text-[11px] uppercase text-dynasty-muted">
                {entry.qualifier}
              </div>
            )}
            <div className="mt-2 space-y-2">
              {entry.holders.length > 0 ? entry.holders.map((holder, index) => (
                <div key={`${entry.id}-${holder.playerId ?? 'team'}-${index}`} className="flex items-start justify-between gap-3">
                  <div>
                    {holder.playerId ? (
                      <Link className="font-heading text-sm text-accent-primary hover:text-accent-primary/80" to={`/players/${holder.playerId}`}>
                        {playerName(holder.playerId)}
                      </Link>
                    ) : (
                      <div className="font-heading text-sm text-dynasty-text">
                        {teamName(holder.teamId)}
                      </div>
                    )}
                    <div className="mt-1 font-heading text-xs text-dynasty-muted">
                      {holder.teamId ? teamName(holder.teamId) : 'Team record'}
                      {holder.season ? ` · Season ${holder.season}` : ''}
                    </div>
                  </div>
                  <div className="font-data text-sm text-dynasty-textBright">{holder.displayValue}</div>
                </div>
              )) : (
                <div className="font-heading text-xs text-dynasty-muted">
                  {entry.trackingFromSeason
                    ? `Tracking from Season ${entry.trackingFromSeason}.`
                    : 'No official holder recorded yet.'}
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            No records tracked yet.
          </div>
        )}
      </div>
    </div>
  );
}

function RecordWatchPanel({
  entries,
  playerName,
  teamName,
}: {
  entries: RecordWatchEntry[];
  playerName: (playerId: string) => string;
  teamName: (teamId: string | null) => string;
}) {
  return (
    <div>
      <div className="mb-3 font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
        Active Record Watch
      </div>
      <div className="space-y-3">
        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="flex items-center justify-between gap-3">
              <Link className="font-heading text-sm text-accent-primary hover:text-accent-primary/80" to={`/players/${entry.playerId}`}>
                {playerName(entry.playerId)}
              </Link>
              <div className="font-data text-xs text-dynasty-muted">{teamName(entry.teamId)}</div>
            </div>
            <div className="mt-2 font-heading text-xs uppercase text-dynasty-muted">
              {entry.recordLabel}
            </div>
            <div className="mt-2">
              <ProgressFill
                toneClassName="bg-accent-info"
                trackClassName="bg-dynasty-surface"
                value={Math.max(6, Math.min(100, entry.progressRatio * 100))}
              />
            </div>
            <div className="mt-2 font-data text-xs text-dynasty-textBright">
              {entry.currentValue} now · {entry.projectedValue} projected
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {entry.summary}
            </div>
          </div>
        )) : (
          <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4 font-heading text-sm text-dynasty-muted">
            No one is within record range right now.
          </div>
        )}
      </div>
    </div>
  );
}
