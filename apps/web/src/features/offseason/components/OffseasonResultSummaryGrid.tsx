import {
  Award,
  Calendar,
  Check,
  DollarSign,
  FileText,
  ShieldCheck,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';

export interface OffseasonPhaseResultsView {
  arbitrationResolved: unknown[];
  tenderedPlayers: string[];
  nonTenderedPlayers: string[];
  extensions: unknown[];
  qualifyingOffers: unknown[];
  coachChanges: unknown[];
  freeAgentSignings: unknown[];
  draftPicks: unknown[];
  ifaSignings: unknown[];
  retiredPlayers: unknown[];
}

function ResultCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-3">
      <div className="flex items-center gap-1.5 text-dynasty-muted">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-heading text-xs">{label}</span>
      </div>
      <div className="mt-1 font-data text-2xl font-bold text-dynasty-text">{value}</div>
    </div>
  );
}

export function OffseasonResultSummaryGrid({ phaseResults }: { phaseResults: OffseasonPhaseResultsView }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-9">
      <ResultCard label="Arbitrations" value={phaseResults.arbitrationResolved.length} icon={DollarSign} />
      <ResultCard label="Tendered" value={phaseResults.tenderedPlayers.length} icon={Check} />
      <ResultCard label="Non-Tendered" value={phaseResults.nonTenderedPlayers.length} icon={UserMinus} />
      <ResultCard label="Extensions" value={phaseResults.extensions.length} icon={FileText} />
      <ResultCard label="QOs" value={phaseResults.qualifyingOffers.length} icon={FileText} />
      <ResultCard label="FA Signings" value={phaseResults.freeAgentSignings.length} icon={FileText} />
      <ResultCard label="Draft Picks" value={phaseResults.draftPicks.length} icon={Award} />
      <ResultCard label="Staff Moves" value={phaseResults.coachChanges.length} icon={ShieldCheck} />
      <ResultCard label="Retirements" value={phaseResults.retiredPlayers.length} icon={Calendar} />
    </div>
  );
}
