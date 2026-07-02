import { TrendingUp } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { useWorker } from '@/shared/hooks/useWorker';
import { useFreeAgencyMarketIntelData } from '../hooks/useFreeAgencyMarketIntelData';
import MarketIntelPlayerReportCard, {
  formatMarketMoney,
} from './MarketIntelPlayerReportCard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE_REPORTS = 8;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarketIntelPanel() {
  const { getFreeAgencyMarketIntelligence } = useWorker();
  const { data, loading } = useFreeAgencyMarketIntelData({
    getFreeAgencyMarketIntelligence,
  });

  // Loading skeleton
  if (loading) {
    return (
      <DensePanel
        title="Market Intelligence"
        icon={<TrendingUp className="h-4 w-4 text-accent-primary" />}
        titleClassName="text-dynasty-textBright"
      >
        <div className="space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
        </div>
      </DensePanel>
    );
  }

  // Empty state
  if (!data) {
    return (
      <DensePanel
        title="Market Intelligence"
        icon={<TrendingUp className="h-4 w-4 text-accent-primary" />}
        titleClassName="text-dynasty-textBright"
      >
        <div className="py-2 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-dynasty-muted/50" />
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            Market intelligence available during free agency
          </p>
        </div>
      </DensePanel>
    );
  }

  const { summary, reports, totalFreeAgents } = data;
  const visibleReports = reports.slice(0, MAX_VISIBLE_REPORTS);
  const topAgents = summary.topFreeAgents.slice(0, 3);

  return (
    <DensePanel
      title="Market Intelligence"
      icon={<TrendingUp className="h-4 w-4 text-accent-primary" />}
      titleClassName="text-dynasty-textBright"
      meta={
        <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
          {totalFreeAgents} free agent{totalFreeAgents !== 1 ? 's' : ''}
        </span>
      }
    >

      {/* Market Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Total projected spending */}
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Projected spending
          </div>
          <div className="mt-1 font-data text-2xl text-dynasty-textBright">
            {formatMarketMoney(summary.totalProjectedSpending)}
          </div>
        </div>

        {/* Hottest position */}
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Hottest position
          </div>
          <div className="mt-1">
            <span className="inline-flex rounded-full bg-accent-primary/20 px-2 py-0.5 font-data text-sm text-accent-primary">
              {summary.hottestPosition}
            </span>
          </div>
        </div>

        {/* Top free agents */}
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Top free agents
          </div>
          <div className="mt-1 space-y-1">
            {topAgents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between font-data text-xs"
              >
                <span className="truncate text-dynasty-text">{agent.name}</span>
                <span className="ml-2 whitespace-nowrap text-dynasty-muted">
                  {formatMarketMoney(agent.projectedAAV)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Player reports */}
      {visibleReports.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Player reports
          </div>
          {visibleReports.map((report) => (
            <MarketIntelPlayerReportCard key={report.playerId} report={report} />
          ))}
        </div>
      )}
    </DensePanel>
  );
}
