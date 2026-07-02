import { Badge, Button, GradeBar, StatLine } from '@mbd/ui';
import { FileSignature } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { ExtensionCommandCenter, type ExtensionCandidateView } from './ExtensionCommandCenter';

interface RosterContractsPanelProps {
  candidates: ExtensionCandidateView[];
  onOpenNegotiation: (candidate: ExtensionCandidateView) => void;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function willingnessLabel(value: number): { label: string; variant: 'success' | 'info' | 'outline' } {
  if (value >= 0.7) return { label: 'High', variant: 'success' };
  if (value >= 0.5) return { label: 'Medium', variant: 'info' };
  return { label: 'Low', variant: 'outline' };
}

function gradeFromValue(value: number, floor: number, ceiling: number): number {
  const normalized = (value - floor) / Math.max(0.0001, ceiling - floor);
  const clamped = Math.max(0, Math.min(1, normalized));
  return Math.round(20 + (clamped * 60));
}

export function RosterContractsPanel({
  candidates,
  onOpenNegotiation,
}: RosterContractsPanelProps) {
  return (
    <div className="space-y-6">
      <ExtensionCommandCenter
        candidates={candidates}
        onOpenNegotiation={onOpenNegotiation}
      />

      <DensePanel
        title="Extension Candidates"
        icon={<FileSignature className="h-4 w-4 text-accent-primary" />}
        meta={(
          <Badge variant="outline">
            {candidates.length} active files
          </Badge>
        )}
        bodyClassName="space-y-3"
      >
          {candidates.length > 0 ? candidates.map((candidate) => {
            const willingness = willingnessLabel(candidate.willingness);
            const demandMultiplier = candidate.demandMultiplier ?? 1;
            const walkAwayThreshold = candidate.walkAwayThreshold ?? 0.12;
            return (
              <div key={candidate.playerId} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                    <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                      {candidate.position} | {candidate.yearsRemaining} year control left
                    </div>
                    <StatLine
                      className="mt-3"
                      stats={[
                        { label: 'Current', value: moneyLabel(candidate.currentSalary) },
                        { label: 'Demand', value: `${demandMultiplier.toFixed(2)}x` },
                        { label: 'Willingness', value: `${Math.round(candidate.willingness * 100)}%` },
                      ]}
                    />
                  </div>
                  <div className="w-full max-w-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant={willingness.variant}>{willingness.label}</Badge>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenNegotiation(candidate)}
                      >
                        Negotiate
                      </Button>
                    </div>
                    <GradeBar label="Willingness" grade={gradeFromValue(candidate.willingness, 0, 1)} />
                    <GradeBar label="Leverage" grade={gradeFromValue(demandMultiplier, 1, 1.55)} />
                    <GradeBar label="Risk" grade={gradeFromValue(walkAwayThreshold, 0.04, 0.28)} />
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
              No extension files are open for this roster right now.
            </div>
          )}
      </DensePanel>
    </div>
  );
}
