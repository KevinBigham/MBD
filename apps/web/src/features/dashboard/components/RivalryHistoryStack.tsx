import { Flame, History } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { ProgressFill } from '@/shared/components/ProgressFill';

export interface DashboardRivalrySummary {
  id: string;
  opponentTeamId: string;
  intensity: number;
  summary: string;
  currentSeasonRecord: string;
  historicalRecord: string;
}

export interface DashboardThisDayInHistory {
  season: number;
  headline: string;
  summary: string;
}

interface RivalryHistoryStackProps {
  franchiseAbbreviation: string | undefined;
  rivalry: DashboardRivalrySummary | null;
  thisDayInHistory: DashboardThisDayInHistory | null;
}

export default function RivalryHistoryStack({
  franchiseAbbreviation,
  rivalry,
  thisDayInHistory,
}: RivalryHistoryStackProps): JSX.Element {
  return (
    <div className="space-y-4">
      <DensePanel
        title="Rivalry Watch"
        icon={<Flame className="h-4 w-4 text-accent-danger" />}
        titleClassName="text-dynasty-textBright"
      >
        {rivalry ? (
          <div className="space-y-3">
            <div>
              <div className="font-heading text-base text-dynasty-textBright">
                {franchiseAbbreviation} vs {rivalry.opponentTeamId.toUpperCase()}
              </div>
              <div className="mt-1 font-heading text-sm text-dynasty-muted">{rivalry.summary}</div>
            </div>
            <ProgressFill toneClassName="bg-accent-warning" value={rivalry.intensity} />
            <div className="font-heading text-xs text-dynasty-muted">{rivalry.currentSeasonRecord}</div>
            <div className="font-heading text-xs text-dynasty-muted">{rivalry.historicalRecord}</div>
          </div>
        ) : (
          <div className="font-heading text-sm text-dynasty-muted">
            No rivalry has reached the front-burner tier yet.
          </div>
        )}
      </DensePanel>

      <DensePanel
        title="This Day in History"
        icon={<History className="h-4 w-4 text-accent-info" />}
        titleClassName="text-dynasty-textBright"
      >
        {thisDayInHistory ? (
          <div>
            <div className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
              Season {thisDayInHistory.season}
            </div>
            <div className="mt-2 font-heading text-base text-dynasty-textBright">{thisDayInHistory.headline}</div>
            <div className="mt-2 font-heading text-sm text-dynasty-muted">{thisDayInHistory.summary}</div>
          </div>
        ) : (
          <div className="font-heading text-sm text-dynasty-muted">
            Archived season history will appear here once the dynasty has real mileage.
          </div>
        )}
      </DensePanel>
    </div>
  );
}
