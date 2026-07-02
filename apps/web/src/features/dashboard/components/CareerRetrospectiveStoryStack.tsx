import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  ScrollText,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { humanizeLabel, momentTypeLabel } from '@/shared/lib/labels';

export interface TeamMomentEntry {
  type: string;
  description: string;
  season: number;
  day: number | null;
  impact: number;
  relevance: number;
}

export interface LegendArcEntry {
  playerId: string;
  playerName: string;
  arcType: string;
  resolvedSeason: number;
  milestoneHeadline: string | null;
}

export interface SignatureArcEntry {
  playerId: string;
  playerName: string;
  arcType: string;
  season: number;
  description: string;
  relevance: number;
}

interface CareerRetrospectiveStoryStackProps {
  moments: TeamMomentEntry[];
  legendArcs: LegendArcEntry[];
  signatureArcs: SignatureArcEntry[];
  onSelectSeason: (season: number) => void;
}

const SIGNATURE_ARC_LABELS: Readonly<Record<string, string>> = {
  redemption_arc: 'Redemption',
  late_career_peak: 'Late-Career Peak',
  rookie_breakout: 'Rookie Breakout',
};

function signatureArcLabel(arcType: string): string {
  return SIGNATURE_ARC_LABELS[arcType] ?? humanizeLabel(arcType);
}

export default function CareerRetrospectiveStoryStack({
  moments,
  legendArcs,
  signatureArcs,
  onSelectSeason,
}: CareerRetrospectiveStoryStackProps) {
  return (
    <>
      {moments.length > 0 ? (
        <SignatureBeats moments={moments} onSelectSeason={onSelectSeason} />
      ) : null}
      {legendArcs.length > 0 ? (
        <LegendArcs arcs={legendArcs} onSelectSeason={onSelectSeason} />
      ) : null}
      {signatureArcs.length > 0 ? (
        <SignatureArcs arcs={signatureArcs} onSelectSeason={onSelectSeason} />
      ) : null}
    </>
  );
}

function SignatureBeats({
  moments,
  onSelectSeason,
}: {
  moments: TeamMomentEntry[];
  onSelectSeason: (season: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-accent-info" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Signature Beats</div>
      </div>
      <ul className="mt-2 space-y-2">
        {moments.map((moment, idx) => {
          const positive = moment.impact >= 0;
          const Icon = positive ? Sparkles : AlertTriangle;
          const iconClass = positive ? 'text-accent-success' : 'text-accent-danger';
          return (
            <li key={`${moment.type}-${moment.season}-${moment.day ?? idx}`}>
              <button
                type="button"
                onClick={() => onSelectSeason(moment.season)}
                aria-label={`Open season ${moment.season} story reel`}
                className="flex w-full items-start gap-2 rounded-md px-1 py-1 text-left transition hover:bg-dynasty-elevated/70 focus:bg-dynasty-elevated/70 focus:outline-none focus:ring-1 focus:ring-accent-info/60"
              >
                <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${iconClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-xs text-dynasty-textBright">{momentTypeLabel(moment.type)}</div>
                  <div className="mt-0.5 font-heading text-xs text-dynasty-text">{moment.description}</div>
                  <div className="mt-0.5 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                    Season {moment.season}
                    {moment.day != null ? ` · Day ${moment.day}` : ''}
                  </div>
                </div>
                <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-dynasty-muted" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LegendArcs({
  arcs,
  onSelectSeason,
}: {
  arcs: LegendArcEntry[];
  onSelectSeason: (season: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <ScrollText className="h-3.5 w-3.5 text-accent-info" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">Legend Arcs</div>
      </div>
      <ul className="mt-2 space-y-2">
        {arcs.map((arc) => (
          <li key={`${arc.playerId}-${arc.arcType}-${arc.resolvedSeason}`} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <Link
                to={`/players/${arc.playerId}`}
                className="truncate font-heading text-xs text-dynasty-textBright hover:text-accent-primary"
              >
                {arc.playerName}
              </Link>
              <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                {humanizeLabel(arc.arcType)}
              </span>
              <button
                type="button"
                onClick={() => onSelectSeason(arc.resolvedSeason)}
                aria-label={`Open season ${arc.resolvedSeason} story reel`}
                className="ml-auto shrink-0 rounded-full border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted transition hover:border-accent-info/60 hover:text-accent-info focus:outline-none focus:ring-1 focus:ring-accent-info/60"
              >
                S{arc.resolvedSeason}
              </button>
            </div>
            {arc.milestoneHeadline ? (
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">{arc.milestoneHeadline}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SignatureArcs({
  arcs,
  onSelectSeason,
}: {
  arcs: SignatureArcEntry[];
  onSelectSeason: (season: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border/70 bg-dynasty-surface/70 p-3">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-accent-info" />
        <div className="font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
          Notable Player Arcs
        </div>
      </div>
      <ul className="mt-2 space-y-2">
        {arcs.map((arc) => (
          <li key={`${arc.playerId}-${arc.arcType}-${arc.season}`} className="min-w-0">
            <div className="flex items-baseline gap-2">
              <Link
                to={`/players/${arc.playerId}?tab=moments`}
                className="truncate font-heading text-xs text-dynasty-textBright hover:text-accent-primary"
              >
                {arc.playerName}
              </Link>
              <span className="shrink-0 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted">
                {signatureArcLabel(arc.arcType)}
              </span>
              <button
                type="button"
                onClick={() => onSelectSeason(arc.season)}
                aria-label={`Open season ${arc.season} story reel`}
                className="ml-auto shrink-0 rounded-full border border-dynasty-border/60 bg-dynasty-elevated/70 px-2 py-0.5 font-data text-[10px] uppercase tracking-[0.12em] text-dynasty-muted transition hover:border-accent-info/60 hover:text-accent-info focus:outline-none focus:ring-1 focus:ring-accent-info/60"
              >
                S{arc.season}
              </button>
            </div>
            {arc.description ? (
              <div className="mt-0.5 font-heading text-xs text-dynasty-text">{arc.description}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
