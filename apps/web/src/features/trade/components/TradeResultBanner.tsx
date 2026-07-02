import { AlertTriangle, Check } from 'lucide-react';
import type { TradeNegotiationReviewView } from '@/workers/sim.worker.trade';
import TradeExplanationFactors from './TradeExplanationFactors';

export interface TradeResultView {
  status: 'accepted' | 'rejected' | 'counter' | 'declined';
  message: string;
  review?: TradeNegotiationReviewView | null;
}

function resultTone(status: TradeResultView['status']): string {
  if (status === 'accepted') {
    return 'border-accent-success/40 bg-accent-success/10';
  }
  if (status === 'counter') {
    return 'border-accent-warning/40 bg-accent-warning/10';
  }
  return 'border-accent-danger/40 bg-accent-danger/10';
}

function resultHeadline(status: TradeResultView['status']): string {
  if (status === 'accepted') {
    return 'Deal Completed';
  }
  if (status === 'counter') {
    return 'Trade Talks Continue';
  }
  return 'Talks Broke Down';
}

export default function TradeResultBanner({ result }: { result: TradeResultView }) {
  return (
    <div className={`rounded-lg border p-4 ${resultTone(result.status)}`}>
      <div className="flex items-center gap-2">
        {result.status === 'accepted' ? (
          <Check className="h-5 w-5 text-accent-success" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-accent-warning" />
        )}
        <h3 className="font-heading text-sm font-semibold text-dynasty-text">
          {resultHeadline(result.status)}
        </h3>
      </div>
      <p className="mt-2 font-heading text-sm text-dynasty-text">{result.message}</p>
      {result.review ? (
        <div className="mt-3 border-t border-dynasty-border/70 pt-3 font-heading text-xs text-dynasty-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-semibold text-dynasty-text">Negotiation Review</span>
            <span>
              Fairness {result.review.fairnessScore === null
                ? 'Pending'
                : result.review.fairnessScore.toFixed(1)}
            </span>
            <span>Roster check: {result.review.rosterValid ? 'Valid' : 'Needs attention'}</span>
          </div>
          {result.review.rosterIssues.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {result.review.rosterIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : null}
          <p className="mt-2">{result.review.narrative}</p>
          <TradeExplanationFactors
            title="Why the GM reacted this way"
            fairnessScore={result.review.fairnessScore}
            rosterIssues={result.review.rosterIssues}
            rosterValid={result.review.rosterValid}
          />
        </div>
      ) : null}
    </div>
  );
}
