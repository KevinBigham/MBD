import { Link } from 'react-router-dom';
import type { DynastyTimelineMemoryBeat } from '../lib/buildDynastyTimelineChapters';

interface DynastyTimelineMemoryBeatRowProps {
  beat: DynastyTimelineMemoryBeat;
  playerNames?: Record<string, string>;
  teamNames?: Record<string, string>;
}

function memoryBeatTone(kind: string): string {
  switch (kind) {
    case 'playoff':
      return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
    case 'trade':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    case 'draft':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    case 'award':
      return 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary';
    case 'stat':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    case 'retirement':
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
    case 'rivalry':
      return 'border-accent-danger/30 bg-accent-danger/10 text-accent-danger';
    case 'breakout':
      return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
    case 'injury':
      return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
    case 'identity':
      return 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

export default function DynastyTimelineMemoryBeatRow({
  beat,
  playerNames = {},
  teamNames = {},
}: DynastyTimelineMemoryBeatRowProps) {
  const boxScoreRef = beat.archivedGameId ?? beat.gameIndex;

  return (
    <div className="flex flex-wrap items-center gap-2 font-data text-xs text-dynasty-muted">
      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] ${memoryBeatTone(beat.kind)}`}>
        {beat.label}
      </span>
      <span className="min-w-0 flex-1 truncate">{beat.summary}</span>
      {beat.playerIds.slice(0, 2).map((playerId) => (
        <Link
          key={playerId}
          to={`/players/${playerId}`}
          className="focus-ring rounded-sm text-accent-primary underline-offset-2 hover:underline"
        >
          {playerNames[playerId] ?? beat.playerNameFallbacks?.[playerId] ?? playerId}
        </Link>
      ))}
      {beat.teamIds.slice(0, 2).map((teamId) => (
        <span
          key={teamId}
          data-testid="timeline-memory-team"
          className="rounded-sm border border-dynasty-border bg-dynasty-elevated px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-dynasty-muted"
        >
          {teamNames[teamId] ?? teamId.toUpperCase()}
        </span>
      ))}
      {boxScoreRef != null && (
        <Link
          to={`/games/${boxScoreRef}`}
          className="focus-ring rounded-sm text-accent-primary underline-offset-2 hover:underline"
        >
          Box Score
        </Link>
      )}
    </div>
  );
}
