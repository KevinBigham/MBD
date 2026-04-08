import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Flame,
  Thermometer,
} from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComparableContract {
  playerName: string;
  position: string;
  ageAtSigning: number;
  annualValue: number;
  years: number;
  season: number;
}

interface SigningPrediction {
  likelyTeamId: string | null;
  projectedYears: number;
  projectedAAV: number;
  confidence: 'low' | 'medium' | 'high';
}

interface MarketReport {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  projectedValue: number;
  demandLevel: 'cold' | 'warm' | 'hot' | 'bidding_war';
  interestedTeamCount: number;
  comparableContracts: ComparableContract[];
  signingPrediction: SigningPrediction;
}

interface MarketSummary {
  totalProjectedSpending: number;
  hottestPosition: string;
  topFreeAgents: Array<{ name: string; projectedAAV: number }>;
  positionDemand: Record<string, number>;
}

interface MarketIntelligenceData {
  reports: MarketReport[];
  summary: MarketSummary;
  totalFreeAgents: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE_REPORTS = 8;
const MAX_VISIBLE_COMPS = 3;
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Salaries in sim-core are already in millions (e.g., 18.5 = $18.5M). */
function formatMoney(value: number): string {
  return `$${value.toFixed(1)}M`;
}

const DEMAND_CONFIG: Record<
  MarketReport['demandLevel'],
  { label: string; className: string; pulse: boolean }
> = {
  cold: {
    label: 'Cold',
    className: 'bg-accent-info/20 text-accent-info',
    pulse: false,
  },
  warm: {
    label: 'Warm',
    className: 'bg-accent-warning/20 text-accent-warning',
    pulse: false,
  },
  hot: {
    label: 'Hot',
    className: 'bg-accent-danger/20 text-accent-danger',
    pulse: false,
  },
  bidding_war: {
    label: 'Bidding War',
    className: 'bg-accent-primary/20 text-accent-primary',
    pulse: true,
  },
};

const CONFIDENCE_CONFIG: Record<
  SigningPrediction['confidence'],
  { label: string; className: string }
> = {
  low: { label: 'Low', className: 'bg-dynasty-muted/20 text-dynasty-muted' },
  medium: { label: 'Med', className: 'bg-accent-warning/20 text-accent-warning' },
  high: { label: 'High', className: 'bg-accent-success/20 text-accent-success' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DemandBadge({ level }: { level: MarketReport['demandLevel'] }) {
  const config = DEMAND_CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-data text-[10px] uppercase tracking-wider ${config.className} ${config.pulse ? 'animate-pulse' : ''}`}
    >
      {level === 'hot' || level === 'bidding_war' ? (
        <Flame className="h-3 w-3" />
      ) : (
        <Thermometer className="h-3 w-3" />
      )}
      {config.label}
    </span>
  );
}

function ConfidenceBadge({ confidence }: { confidence: SigningPrediction['confidence'] }) {
  const config = CONFIDENCE_CONFIG[confidence];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 font-data text-[10px] uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function ComparableContractsSection({ contracts }: { contracts: ComparableContract[] }) {
  if (contracts.length === 0) return null;

  const visible = contracts.slice(0, MAX_VISIBLE_COMPS);

  return (
    <div className="mt-2 space-y-1">
      <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
        Comparable contracts
      </div>
      {visible.map((comp, idx) => (
        <div
          key={`${comp.playerName}-${comp.season}-${idx}`}
          className="flex items-center justify-between font-data text-xs text-dynasty-text"
        >
          <span>
            {comp.playerName} ({comp.position}, age {comp.ageAtSigning})
          </span>
          <span className="text-dynasty-muted">
            {comp.years}yr / {formatMoney(comp.annualValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function PlayerReportCard({ report }: { report: MarketReport }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/players/${report.playerId}`}
              className="font-heading text-sm text-dynasty-textBright hover:text-accent-primary"
            >
              {report.playerName}
            </Link>
            <DemandBadge level={report.demandLevel} />
          </div>
          <div className="mt-1 font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
            {report.position} · Age {report.age} · {report.interestedTeamCount} team{report.interestedTeamCount !== 1 ? 's' : ''} interested
          </div>
        </div>
        <div className="text-right">
          <div className="font-data text-sm text-dynasty-textBright">
            {formatMoney(report.projectedValue)}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">proj. value</div>
        </div>
      </div>

      {/* Signing prediction */}
      <div className="mt-2 flex items-center gap-2">
        <DollarSign className="h-3 w-3 text-accent-success" />
        <span className="font-data text-xs text-dynasty-text">
          {report.signingPrediction.projectedYears}yr / {formatMoney(report.signingPrediction.projectedAAV)} AAV
        </span>
        <ConfidenceBadge confidence={report.signingPrediction.confidence} />
      </div>

      {/* Expandable comps */}
      {report.comparableContracts.length > 0 && (
        <>
          <button
            type="button"
            onClick={toggle}
            className="mt-2 flex items-center gap-1 font-heading text-[11px] text-dynasty-muted hover:text-dynasty-text"
          >
            {expanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {expanded ? 'Hide' : 'Show'} comps ({report.comparableContracts.length})
          </button>
          {expanded && (
            <ComparableContractsSection contracts={report.comparableContracts} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MarketIntelPanel() {
  const { getFreeAgencyMarketIntelligence } = useWorker();
  const [data, setData] = useState<MarketIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await getFreeAgencyMarketIntelligence();
        if (!cancelled) {
          setData(result ?? null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [getFreeAgencyMarketIntelligence]);

  // Loading skeleton
  if (loading) {
    return (
      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Market Intelligence
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
          <div className="h-16 animate-pulse rounded-lg bg-dynasty-border/30" />
        </div>
      </section>
    );
  }

  // Empty state
  if (!data) {
    return (
      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Market Intelligence
          </h2>
        </div>
        <div className="mt-6 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-dynasty-muted/50" />
          <p className="mt-2 font-heading text-sm text-dynasty-muted">
            Market intelligence available during free agency
          </p>
        </div>
      </section>
    );
  }

  const { summary, reports, totalFreeAgents } = data;
  const visibleReports = reports.slice(0, MAX_VISIBLE_REPORTS);
  const topAgents = summary.topFreeAgents.slice(0, 3);

  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-accent-primary" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">
            Market Intelligence
          </h2>
        </div>
        <span className="font-data text-[11px] uppercase tracking-[0.16em] text-dynasty-muted">
          {totalFreeAgents} free agent{totalFreeAgents !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Market Summary */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {/* Total projected spending */}
        <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
          <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
            Projected spending
          </div>
          <div className="mt-1 font-data text-2xl text-dynasty-textBright">
            {formatMoney(summary.totalProjectedSpending)}
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
                  {formatMoney(agent.projectedAAV)}
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
            <PlayerReportCard key={report.playerId} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}
