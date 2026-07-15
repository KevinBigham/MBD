import { Button, StatLine } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';

export interface QualifyingOfferEligibleView {
  playerId: string;
  playerName: string;
  projectedMarketValue: number;
  qualifyingOfferSalary: number;
  serviceYears: number;
}

export interface QualifyingOfferResultView {
  playerId: string;
  playerName?: string;
  teamId: string;
  amount: number;
  status: 'offered' | 'accepted' | 'rejected' | 'compensated' | 'expired';
  signingTeamId: string | null;
  compensationPickId: string | null;
  compensationTier: 'premium' | 'standard' | null;
  forfeitedPick: {
    season: number;
    round: number;
    originalTeamId: string;
  } | null;
}

function moneyLabel(value: number, digits: number = 1): string {
  return `$${value.toFixed(digits)}M`;
}

export function OffseasonQualifyingOffersPanel({
  eligible,
  qualifyingOfferSalary,
  results,
  active,
  advancing,
  onIssue,
  onResolve,
}: {
  eligible: QualifyingOfferEligibleView[];
  qualifyingOfferSalary: number | null;
  results: QualifyingOfferResultView[];
  active: boolean;
  advancing: boolean;
  onIssue: (playerId: string) => void;
  onResolve: () => void;
}) {
  const latestResultByPlayer = new Map<string, QualifyingOfferResultView>();
  for (const result of results) {
    latestResultByPlayer.set(result.playerId, result);
  }
  const pendingCount = [...latestResultByPlayer.values()].filter((result) => result.status === 'offered').length;
  const eligiblePlayerIds = new Set(eligible.map((candidate) => candidate.playerId));
  const resultOnly = [...latestResultByPlayer.values()].filter((result) => !eligiblePlayerIds.has(result.playerId));

  return (
    <DensePanel
      title="Qualifying Offers"
      subtitle={`Salary line ${qualifyingOfferSalary != null ? moneyLabel(qualifyingOfferSalary, 2) : '--'}`}
      meta={(
        <Button
          type="button"
          size="sm"
          data-mobile-critical-control="offseason-resolve-qos"
          className="mobile-critical-control"
          disabled={!active || advancing || pendingCount === 0}
          onClick={onResolve}
        >
          Resolve Offers
        </Button>
      )}
      bodyClassName="space-y-3"
    >
        {eligible.length > 0 ? eligible.map((candidate) => {
          const result = latestResultByPlayer.get(candidate.playerId);
          return (
          <div key={candidate.playerId} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="font-heading text-sm text-dynasty-text">{candidate.playerName}</div>
                <StatLine
                  className="mt-2"
                  stats={[
                    { label: 'QO', value: moneyLabel(candidate.qualifyingOfferSalary, 2) },
                    { label: 'Market', value: moneyLabel(candidate.projectedMarketValue, 1) },
                    { label: 'Service', value: `${candidate.serviceYears}` },
                  ]}
                />
                {result ? (
                  <div className="mt-2 font-heading text-xs font-semibold uppercase tracking-wide text-accent-info">
                    {result.status === 'compensated' && result.forfeitedPick
                      ? `Compensated — ${result.compensationTier ?? 'standard'} award; Round ${result.forfeitedPick.round} forfeited by signing club`
                      : result.status}
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                size="sm"
                data-mobile-critical-control="offseason-issue-qo"
                className="mobile-critical-control"
                disabled={!active || advancing || Boolean(result)}
                onClick={() => onIssue(candidate.playerId)}
              >
                {result ? 'QO Recorded' : 'Issue QO'}
              </Button>
            </div>
          </div>
          );
        }) : latestResultByPlayer.size === 0 ? (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
            No qualifying-offer files are eligible this offseason.
          </div>
        ) : null}
        {resultOnly.length > 0 ? (
          <div className="space-y-2">
            {resultOnly.map((result) => (
              <div key={result.playerId} className="rounded border border-dynasty-border bg-dynasty-elevated/60 px-4 py-3 font-heading text-xs text-dynasty-muted">
                {result.playerName ?? result.playerId}: <span className="font-semibold uppercase text-dynasty-text">{result.status}</span>
                {result.forfeitedPick ? ` — Round ${result.forfeitedPick.round} (${result.forfeitedPick.originalTeamId.toUpperCase()} origin) forfeited` : ''}
              </div>
            ))}
          </div>
        ) : null}
    </DensePanel>
  );
}
