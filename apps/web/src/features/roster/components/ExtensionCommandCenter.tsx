import { Badge, Button, StatLine } from '@mbd/ui';
import { DollarSign, FileSignature, ShieldCheck } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface ExtensionCandidateView {
  playerId: string;
  playerName: string;
  position: string;
  yearsRemaining: number;
  currentSalary: number;
  willingness: number;
  demandMultiplier?: number;
  walkAwayThreshold?: number;
}

interface ExtensionCommandCenterProps {
  candidates: ExtensionCandidateView[];
  onOpenNegotiation: (candidate: ExtensionCandidateView) => void;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function demandMultiplier(candidate: ExtensionCandidateView): number {
  return candidate.demandMultiplier ?? 1;
}

function walkAwayThreshold(candidate: ExtensionCandidateView): number {
  return candidate.walkAwayThreshold ?? 0.12;
}

function rankNextCall(candidate: ExtensionCandidateView): number {
  const controlUrgency = Math.max(0, 4 - candidate.yearsRemaining) * 24;
  const willingnessScore = candidate.willingness * 50;
  const pricePressure = Math.max(0, demandMultiplier(candidate) - 1) * 18;
  const walkAwayPressure = walkAwayThreshold(candidate) * 30;
  return controlUrgency + willingnessScore + pricePressure + walkAwayPressure;
}

function rankPressure(candidate: ExtensionCandidateView): number {
  return (demandMultiplier(candidate) * 100) + (walkAwayThreshold(candidate) * 160);
}

export function ExtensionCommandCenter({
  candidates,
  onOpenNegotiation,
}: ExtensionCommandCenterProps) {
  if (candidates.length === 0) {
    return null;
  }

  const actNowCount = candidates.filter((candidate) =>
    candidate.yearsRemaining <= 1 && candidate.willingness >= 0.6,
  ).length;
  const playerLeverageCount = candidates.filter((candidate) =>
    demandMultiplier(candidate) >= 1.25,
  ).length;
  const walkAwayRiskCount = candidates.filter((candidate) =>
    walkAwayThreshold(candidate) >= 0.18,
  ).length;
  const bestNextCall = [...candidates].sort((left, right) => rankNextCall(right) - rankNextCall(left))[0]!;
  const pressureWatch = [...candidates].sort((left, right) => rankPressure(right) - rankPressure(left))[0]!;

  return (
    <DensePanel
      title="Extension Command Center"
      icon={<FileSignature className="h-4 w-4 text-accent-primary" />}
      subtitle="Prioritize expiring control windows before leverage and walk-away risk harden."
      subtitleClassName="font-heading text-sm normal-case tracking-normal text-dynasty-text"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <StatLine
            stats={[
              { label: 'Act Now', value: actNowCount },
              { label: 'Player Leverage', value: playerLeverageCount },
              { label: 'Walk-Away Risk', value: walkAwayRiskCount },
            ]}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:min-w-[44rem]">
          <div className="rounded border border-accent-success/30 bg-accent-success/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-[10px] uppercase tracking-wide text-accent-success">
                  Best next call
                </div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">{bestNextCall.playerName}</div>
                <div className="mt-1 font-data text-xs text-dynasty-muted">
                  {bestNextCall.position} | {bestNextCall.yearsRemaining} year control | {Math.round(bestNextCall.willingness * 100)}% willing
                </div>
              </div>
              <Badge variant="success">Ready</Badge>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 font-heading text-xs text-dynasty-muted">
                <DollarSign className="h-4 w-4 text-accent-success" />
                Current {moneyLabel(bestNextCall.currentSalary)}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenNegotiation(bestNextCall)}
              >
                Start {bestNextCall.playerName}
              </Button>
            </div>
          </div>

          <div className="rounded border border-accent-warning/30 bg-accent-warning/10 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-[10px] uppercase tracking-wide text-accent-warning">
                  Pressure watch
                </div>
                <div className="mt-1 font-heading text-sm text-dynasty-text">{pressureWatch.playerName}</div>
                <div className="mt-1 font-data text-xs text-dynasty-muted">
                  Demand {demandMultiplier(pressureWatch).toFixed(2)}x | Walk-away {Math.round(walkAwayThreshold(pressureWatch) * 100)}%
                </div>
              </div>
              <ShieldCheck className="h-4 w-4 text-accent-warning" />
            </div>
            <div className="mt-3 text-sm text-dynasty-muted">
              Keep the walk-away line firm before the file turns into a market-setting negotiation.
            </div>
          </div>
        </div>
      </div>
    </DensePanel>
  );
}
