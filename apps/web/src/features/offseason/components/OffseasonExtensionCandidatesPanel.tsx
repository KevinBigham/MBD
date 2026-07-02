import { Badge, GradeBar, StatLine } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';

export interface ExtensionCandidateView {
  playerId: string;
  playerName: string;
  yearsRemaining: number;
  currentSalary: number;
  willingness: number;
  demandMultiplier?: number;
  walkAwayThreshold?: number;
}

function moneyLabel(value: number, digits: number = 1): string {
  return `$${value.toFixed(digits)}M`;
}

function gradeFromFraction(value: number): number {
  return Math.max(20, Math.min(80, Math.round(20 + (value * 60))));
}

export function OffseasonExtensionCandidatesPanel({ candidates }: { candidates: ExtensionCandidateView[] }) {
  return (
    <DensePanel
      title="Extensions"
      subtitle="Negotiate before the open market shifts leverage."
      meta={<Badge variant="outline">{candidates.length} candidates</Badge>}
      bodyClassName="space-y-3"
    >
        {candidates.length > 0 ? candidates.map((candidate) => (
          <div key={candidate.playerId} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                <StatLine
                  className="mt-2"
                  stats={[
                    { label: 'Control', value: `${candidate.yearsRemaining} yr` },
                    { label: 'Current', value: moneyLabel(candidate.currentSalary) },
                    { label: 'Willingness', value: `${Math.round(candidate.willingness * 100)}%` },
                  ]}
                />
              </div>
              <div className="w-full max-w-sm space-y-2">
                <GradeBar label="Willingness" grade={gradeFromFraction(candidate.willingness)} />
                <GradeBar label="Leverage" grade={gradeFromFraction(((candidate.demandMultiplier ?? 1) - 1) / 0.55)} />
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
            No extension candidates are active right now.
          </div>
        )}
    </DensePanel>
  );
}
