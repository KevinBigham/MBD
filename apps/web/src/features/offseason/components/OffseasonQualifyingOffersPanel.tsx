import { Button, StatLine } from '@mbd/ui';
import { DensePanel } from '@/shared/components/DensePanel';

export interface QualifyingOfferEligibleView {
  playerId: string;
  playerName: string;
  projectedMarketValue: number;
  qualifyingOfferSalary: number;
  serviceYears: number;
}

function moneyLabel(value: number, digits: number = 1): string {
  return `$${value.toFixed(digits)}M`;
}

export function OffseasonQualifyingOffersPanel({
  eligible,
  qualifyingOfferSalary,
  advancing,
  onIssue,
  onResolve,
}: {
  eligible: QualifyingOfferEligibleView[];
  qualifyingOfferSalary: number | null;
  advancing: boolean;
  onIssue: (playerId: string) => void;
  onResolve: () => void;
}) {
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
          disabled={advancing}
          onClick={onResolve}
        >
          Resolve Offers
        </Button>
      )}
      bodyClassName="space-y-3"
    >
        {eligible.length > 0 ? eligible.map((candidate) => (
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
              </div>
              <Button
                type="button"
                size="sm"
                data-mobile-critical-control="offseason-issue-qo"
                className="mobile-critical-control"
                disabled={advancing}
                onClick={() => onIssue(candidate.playerId)}
              >
                Issue QO
              </Button>
            </div>
          </div>
        )) : (
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 px-4 py-6 text-sm text-dynasty-muted">
            No qualifying-offer files are eligible this offseason.
          </div>
        )}
    </DensePanel>
  );
}
