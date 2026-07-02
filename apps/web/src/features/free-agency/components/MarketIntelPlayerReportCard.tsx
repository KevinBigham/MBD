import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Flame,
  Thermometer,
} from 'lucide-react';

export interface ComparableContract {
  playerName: string;
  position: string;
  ageAtSigning: number;
  annualValue: number;
  years: number;
  season: number;
}

export interface SigningPrediction {
  likelyTeamId: string | null;
  projectedYears: number;
  projectedAAV: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface MarketReport {
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

const MAX_VISIBLE_COMPS = 3;

/** Salaries in sim-core are already in millions (e.g., 18.5 = $18.5M). */
export function formatMarketMoney(value: number): string {
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
            {comp.years}yr / {formatMarketMoney(comp.annualValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MarketIntelPlayerReportCard({ report }: { report: MarketReport }) {
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
            {formatMarketMoney(report.projectedValue)}
          </div>
          <div className="font-data text-[10px] text-dynasty-muted">proj. value</div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <DollarSign className="h-3 w-3 text-accent-success" />
        <span className="font-data text-xs text-dynasty-text">
          {report.signingPrediction.projectedYears}yr / {formatMarketMoney(report.signingPrediction.projectedAAV)} AAV
        </span>
        <ConfidenceBadge confidence={report.signingPrediction.confidence} />
      </div>

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
