import { normalizeProspectReadinessGrade } from '../lib/prospectReadiness';

export interface ProspectView {
  playerId: string;
  name: string;
  position: string;
  level: string;
  readiness: number;
  trend: 'up' | 'steady' | 'down';
  latestLineSummary: string | null;
}

export interface FarmMoveView {
  id: string;
  headline: string;
  timestamp: string;
}

interface FarmReportCardBodyProps {
  prospects: ProspectView[];
  recentMoves: FarmMoveView[];
}

function trendGlyph(trend: ProspectView['trend']): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
}

function trendTone(trend: ProspectView['trend']): string {
  switch (trend) {
    case 'up':
      return 'text-accent-success';
    case 'down':
      return 'text-accent-danger';
    default:
      return 'text-dynasty-muted';
  }
}

export default function FarmReportCardBody({ prospects, recentMoves }: FarmReportCardBodyProps) {
  return (
    <>
      <div className="mt-4 max-h-48 space-y-2 overflow-y-auto">
        {prospects.length > 0 ? prospects.map((prospect) => (
          <div key={prospect.playerId} className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-heading text-sm text-dynasty-textBright">{prospect.name}</div>
              <div className={`font-data text-sm ${trendTone(prospect.trend)}`}>
                {trendGlyph(prospect.trend)}
              </div>
            </div>
            <div className="mt-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
              {prospect.level} · {prospect.position} · {normalizeProspectReadinessGrade(prospect.readiness)} OVR
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">
              {prospect.latestLineSummary ?? 'No recent line summary available.'}
            </div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3 font-heading text-sm text-dynasty-muted">
            No prospect pulse is available yet.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
        <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">Recent farm moves</div>
        <div className="mt-3 max-h-28 space-y-2 overflow-y-auto">
          {recentMoves.length > 0 ? recentMoves.map((move) => (
            <div key={move.id} className="font-heading text-xs text-dynasty-muted">
              {move.timestamp} · {move.headline}
            </div>
          )) : (
            <div className="font-heading text-xs text-dynasty-muted">
              No farm moves have hit the narrative feed recently.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
