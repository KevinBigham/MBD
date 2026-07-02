import { DensePanel } from '@/shared/components/DensePanel';

export interface ComplianceIssueView {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface DFACandidateView {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  salary: number;
  score: number;
  reason: string;
}

export interface RosterComplianceView {
  activeRosterCount: number;
  activeRosterLimit: number;
  fortyManCount: number;
  issues: ComplianceIssueView[];
  dfaRecommendations: DFACandidateView[];
}

interface RosterCompliancePanelProps {
  compliance: RosterComplianceView;
  busyAction: string | null;
  onRequestDfa: (candidate: DFACandidateView) => void;
}

function issueTone(severity: 'error' | 'warning'): string {
  return severity === 'error'
    ? 'border-accent-danger/40 bg-accent-danger/10 text-accent-danger'
    : 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
}

function dfaRiskLabel(candidate: DFACandidateView): { label: string; tone: string } {
  if (candidate.score >= 95) {
    return { label: 'Low roster risk', tone: 'text-accent-success' };
  }
  if (candidate.score >= 70) {
    return { label: 'Moderate roster risk', tone: 'text-accent-warning' };
  }
  return { label: 'Review before cutting', tone: 'text-accent-danger' };
}

function dfaSafeAction(candidate: DFACandidateView): string {
  if (candidate.salary >= 8) {
    return 'Shop salary first, then DFA if no market forms.';
  }
  if (candidate.age <= 25) {
    return 'Check options and depth chart before exposing upside.';
  }
  return 'DFA is the cleanest compliance move if the roster stays over the line.';
}

export function RosterCompliancePanel({
  compliance,
  busyAction,
  onRequestDfa,
}: RosterCompliancePanelProps) {
  return (
    <DensePanel
      title="Roster Compliance War Room"
      subtitle="Active limits, 40-man pressure, and the safest next move in one place."
      subtitleClassName="font-heading text-sm normal-case tracking-normal text-dynasty-text"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
            <div className="font-heading text-xs uppercase text-dynasty-muted">Active</div>
            <div className="font-data text-lg text-dynasty-text">
              {compliance.activeRosterCount}/{compliance.activeRosterLimit}
            </div>
            <div className="mt-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
              {Math.max(0, compliance.activeRosterCount - compliance.activeRosterLimit)} over
            </div>
          </div>
          <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2">
            <div className="font-heading text-xs uppercase text-dynasty-muted">40-Man</div>
            <div className="font-data text-lg text-dynasty-text">
              {compliance.fortyManCount}/40
            </div>
            <div className="mt-1 font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
              {Math.max(0, compliance.fortyManCount - 40)} over
            </div>
          </div>
        </div>
        <div className="grid gap-2 lg:min-w-[24rem]">
          {compliance.issues.length > 0 ? compliance.issues.map((issue) => (
            <div
              key={`${issue.code}-${issue.message}`}
              className={`rounded border px-3 py-2 text-sm ${issueTone(issue.severity)}`}
            >
              {issue.message}
            </div>
          )) : (
            <div className="rounded border border-accent-success/40 bg-accent-success/10 px-3 py-2 text-sm text-accent-success">
              Active roster and 40-man roster are compliant today.
            </div>
          )}
        </div>
      </div>

      {compliance.dfaRecommendations.length > 0 && (
        <div className="mt-4 border-t border-dynasty-border pt-4">
          <div className="font-heading text-xs uppercase text-dynasty-muted">Recommended cuts</div>
          <div className="mt-1 font-heading text-sm text-dynasty-muted">
            Showing the three cleanest pressure-release options first. Keep the full roster tables below for deeper review.
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {compliance.dfaRecommendations.slice(0, 3).map((candidate) => {
              const risk = dfaRiskLabel(candidate);
              return (
                <div key={candidate.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                      <div className="font-data text-xs text-dynasty-muted">
                        {candidate.position} | Age {candidate.age} | ${candidate.salary.toFixed(1)}M
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-data text-sm text-accent-warning">Cut score {candidate.score}</div>
                      <div className={`mt-1 font-heading text-[10px] uppercase tracking-wide ${risk.tone}`}>{risk.label}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                      <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Reason</div>
                      <div className="mt-1 text-sm text-dynasty-muted">{candidate.reason}</div>
                    </div>
                    <div className="rounded border border-accent-info/30 bg-accent-info/5 px-3 py-2">
                      <div className="font-heading text-[10px] uppercase tracking-wide text-accent-info">Safe next action</div>
                      <div className="mt-1 text-sm text-dynasty-text">{dfaSafeAction(candidate)}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-mobile-critical-control="roster-dfa"
                    onClick={() => onRequestDfa(candidate)}
                    disabled={busyAction === `dfa-${candidate.playerId}`}
                    className="mobile-critical-control mt-3 rounded border border-accent-danger/50 px-3 py-1.5 font-heading text-xs text-accent-danger transition-colors hover:bg-accent-danger/10 disabled:opacity-50"
                  >
                    DFA {candidate.playerName}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DensePanel>
  );
}
