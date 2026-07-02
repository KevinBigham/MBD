import { AlertTriangle, Tent, TrendingUp, Users } from 'lucide-react';
import { Badge, StatLine } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';

export interface SpringTrainingView {
  rosterIssues: Array<{
    code: string;
    severity: 'error' | 'warning';
    message: string;
    playerId?: string;
  }>;
  promotionCandidates: Array<{
    playerId: string;
    playerName: string;
    position: string;
    overallRating: number;
    currentLevel: string;
    score: number;
    reason: string;
  }>;
  currentRosterSize: number;
  rosterLimit: number;
}

export function OffseasonSpringTrainingPanel({ springTraining }: { springTraining: SpringTrainingView }) {
  return (
    <DensePanel
      title="Spring Training"
      icon={<Tent className="h-5 w-5 text-accent-primary" />}
      subtitle="Finalize your 26-man roster before Opening Day"
      meta={(
        <Badge variant="outline">
          <Users className="mr-1 h-3 w-3" />
          {springTraining.currentRosterSize}/{springTraining.rosterLimit}
        </Badge>
      )}
      bodyClassName="space-y-4"
    >
        {springTraining.rosterIssues.length > 0 && (
          <div className="rounded-lg border border-accent-warning/50 bg-accent-warning/10 p-4">
            <div className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-accent-warning">
              <AlertTriangle className="h-4 w-4" />
              Roster Compliance Issues
            </div>
            <div className="space-y-2">
              {springTraining.rosterIssues.map((issue, idx) => (
                <div
                  key={`${issue.code}-${idx}`}
                  className="rounded border border-accent-warning/30 bg-dynasty-elevated px-3 py-2 font-data text-xs text-dynasty-text"
                >
                  {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 flex items-center gap-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            <TrendingUp className="h-3.5 w-3.5" />
            Top Call-Up Candidates
          </div>
          {springTraining.promotionCandidates.length > 0 ? (
            <div className="space-y-2">
              {springTraining.promotionCandidates.map((candidate) => (
                <div
                  key={candidate.playerId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-3"
                >
                  <div>
                    <div className="font-heading text-sm text-dynasty-text">
                      {candidate.playerName}
                    </div>
                    <StatLine
                      className="mt-1"
                      stats={[
                        { label: 'POS', value: candidate.position },
                        { label: 'OVR', value: String(candidate.overallRating) },
                        { label: 'Level', value: candidate.currentLevel },
                      ]}
                    />
                  </div>
                  <div className="text-right">
                    <div className="font-data text-xs text-dynasty-muted">{candidate.reason}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
              No minor league players are ready for promotion.
            </div>
          )}
        </div>
    </DensePanel>
  );
}
