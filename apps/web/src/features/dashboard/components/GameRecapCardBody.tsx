import { Radio } from 'lucide-react';
import { formatInningsLabel, teamAbbreviation, teamName, type GameRecapView } from './gameDayBroadcast';

export interface GameRecapCardBodyProps {
  recap: GameRecapView;
  selected: boolean;
}

export default function GameRecapCardBody({ recap, selected }: GameRecapCardBodyProps) {
  const awayAbbreviation = teamAbbreviation(recap.boxScore.awayTeamId);
  const homeAbbreviation = teamAbbreviation(recap.boxScore.homeTeamId);

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {awayAbbreviation} at {homeAbbreviation}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-textBright">{recap.recap}</div>
        </div>
        <Radio className={`mt-0.5 h-4 w-4 ${selected ? 'text-accent-primary' : 'text-dynasty-muted'}`} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 font-data text-xs uppercase tracking-[0.14em] text-dynasty-muted">
        <span>{teamName(recap.boxScore.awayTeamId)}</span>
        <span>{recap.boxScore.awayScore}</span>
        <span>-</span>
        <span>{recap.boxScore.homeScore}</span>
        <span>{teamName(recap.boxScore.homeTeamId)}</span>
        <span>{formatInningsLabel(recap.boxScore.innings)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-dynasty-border px-2 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          {recap.highlights.length} highlight{recap.highlights.length === 1 ? '' : 's'}
        </span>
        {recap.highlights[0] ? (
          <span className="font-heading text-xs text-dynasty-muted">{recap.highlights[0].text}</span>
        ) : null}
      </div>
    </>
  );
}
