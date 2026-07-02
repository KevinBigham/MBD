import type {
  MultiTeamTradeExecutionResult,
  MultiTeamTradeProposalResult,
} from '@/workers/sim.worker.trade';

interface MultiTeamResultStackProps {
  message: string | null;
  proposalResult: MultiTeamTradeProposalResult | null;
  executionResult: MultiTeamTradeExecutionResult | null;
}

function proposalTone(result: MultiTeamTradeProposalResult): string {
  return result.accepted
    ? 'border-accent-success/40 bg-accent-success/10'
    : 'border-accent-warning/40 bg-accent-warning/10';
}

function executionTone(result: MultiTeamTradeExecutionResult): string {
  return result.accepted
    ? 'border-accent-success/40 bg-accent-success/10'
    : 'border-accent-danger/40 bg-accent-danger/10';
}

export default function MultiTeamResultStack({
  message,
  proposalResult,
  executionResult,
}: MultiTeamResultStackProps) {
  if (!message && !proposalResult && !executionResult) {
    return null;
  }

  return (
    <>
      {message ? (
        <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated px-4 py-3 font-heading text-sm text-dynasty-text">
          {message}
        </div>
      ) : null}

      {proposalResult ? (
        <div className={`mt-4 rounded-lg border px-4 py-3 ${proposalTone(proposalResult)}`}>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">Proposal Response</div>
          <p className="mt-2 font-heading text-sm text-dynasty-text">{proposalResult.narrative}</p>
          {proposalResult.blockReason ? (
            <p className="mt-2 font-heading text-xs text-dynasty-muted">
              {proposalResult.blockReason}
            </p>
          ) : null}
        </div>
      ) : null}

      {executionResult ? (
        <div className={`mt-4 rounded-lg border px-4 py-3 ${executionTone(executionResult)}`}>
          <div className="font-heading text-sm font-semibold text-dynasty-textBright">Execution Result</div>
          <p className="mt-2 font-heading text-sm text-dynasty-text">{executionResult.narrative}</p>
          {executionResult.cascadeEvents.length > 0 ? (
            <div className="mt-3 space-y-2">
              {executionResult.cascadeEvents.map((event) => (
                <div key={event.triggeredTradeId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-xs text-dynasty-text">
                  {event.reason}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
