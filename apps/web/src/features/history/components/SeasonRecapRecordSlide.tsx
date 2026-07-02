import type { SeasonRecapData } from './SeasonRecapModalBody';

interface SeasonRecapRecordSlideProps {
  data: SeasonRecapData;
}

function formatDivisionRank(rank: number): string {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

export default function SeasonRecapRecordSlide({ data }: SeasonRecapRecordSlideProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="font-data text-[11px] uppercase tracking-[0.2em] text-dynasty-muted">Final Record</div>
        <div className="mt-2 font-brand text-6xl tracking-wide text-dynasty-textBright">{data.record}</div>
        <div className="mt-1 font-data text-lg text-accent-primary">{data.winPct} WIN%</div>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-4">
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 text-center">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Division</div>
          <div className="mt-1 font-data text-2xl text-dynasty-textBright">
            {formatDivisionRank(data.divisionRank)}
          </div>
          {data.gamesBack > 0 && (
            <div className="mt-0.5 font-data text-xs text-dynasty-muted">{data.gamesBack} GB</div>
          )}
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-4 text-center">
          <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Postseason</div>
          <div className="mt-1 font-heading text-sm text-dynasty-textBright">
            {data.playoffResult ?? 'Did Not Qualify'}
          </div>
        </div>
      </div>

      {data.payroll && (
        <div className="text-center">
          <span className="font-data text-xs text-dynasty-muted">Payroll: </span>
          <span className="font-data text-xs text-dynasty-text">{data.payroll}</span>
        </div>
      )}
    </div>
  );
}
