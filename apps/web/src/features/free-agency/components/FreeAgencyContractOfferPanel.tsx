import { DollarSign, TrendingUp, User } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FreeAgentOfferPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  age: number;
  displayRating: number;
  marketValue?: number;
  qualifyingOffer?: {
    formerTeamName: string;
    requiresCompensation: boolean;
    forfeitedPick: {
      season: number;
      round: number;
      originalTeamId: string;
    } | null;
    blockedReason: string | null;
  } | null;
}

export interface FreeAgencyOfferBudget {
  projectedPayroll: number;
  budgetRoom: number;
  taxRoom: number;
  ownerFloor?: number;
  ownerSoftCeilingRoom?: number;
  taxLine?: number;
}

interface FreeAgencyContractOfferPanelProps {
  selectedPlayer: FreeAgentOfferPlayer | null;
  offerYears: number;
  offerSalary: number;
  offerBudget: FreeAgencyOfferBudget | null;
  offerResult: string | null;
  onOfferYearsChange: (value: number) => void;
  onOfferSalaryChange: (value: number) => void;
  onSubmitOffer: () => void;
}

function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

export default function FreeAgencyContractOfferPanel({
  selectedPlayer,
  offerYears,
  offerSalary,
  offerBudget,
  offerResult,
  onOfferYearsChange,
  onOfferSalaryChange,
  onSubmitOffer,
}: FreeAgencyContractOfferPanelProps) {
  return (
    <DensePanel
      title="Contract Offer"
      icon={<DollarSign className="h-4 w-4 text-accent-success" />}
    >
      {selectedPlayer ? (
        <div className="space-y-4">
          <div className="rounded border border-dynasty-border/50 bg-dynasty-elevated p-3">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-dynasty-muted" />
              <div>
                <div className="font-heading font-semibold text-dynasty-textBright">
                  {selectedPlayer.firstName} {selectedPlayer.lastName}
                </div>
                <div className="font-data text-xs text-dynasty-muted">
                  {selectedPlayer.position} | Age {selectedPlayer.age} | OVR {selectedPlayer.displayRating}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 font-data text-xs">
              <TrendingUp className="h-3 w-3 text-accent-info" />
              <span className="text-dynasty-muted">Market value:</span>
              <span className="font-bold text-accent-primary">
                ${selectedPlayer.marketValue?.toFixed(1) ?? '?'}M/yr
              </span>
            </div>
          </div>

          <div>
            <label htmlFor={`fa-offer-years-${selectedPlayer.id}`} className="mb-1 block font-heading text-xs text-dynasty-muted">
              Years: {offerYears}
            </label>
            <input
              id={`fa-offer-years-${selectedPlayer.id}`}
              type="range"
              min={1}
              max={8}
              value={offerYears}
              onChange={event => onOfferYearsChange(Number(event.target.value))}
              className="w-full accent-accent-primary"
            />
          </div>

          <div>
            <label htmlFor={`fa-offer-salary-${selectedPlayer.id}`} className="mb-1 block font-heading text-xs text-dynasty-muted">
              Annual Salary: ${offerSalary}M
            </label>
            <input
              id={`fa-offer-salary-${selectedPlayer.id}`}
              type="range"
              min={1}
              max={45}
              step={0.5}
              value={offerSalary}
              onChange={event => onOfferSalaryChange(Number(event.target.value))}
              className="w-full accent-accent-primary"
            />
          </div>

          <div className="rounded border border-dynasty-border/50 bg-dynasty-elevated p-2 font-data text-xs text-dynasty-muted">
            Total: {money(offerYears * offerSalary)} / {offerYears}yr
          </div>

          {selectedPlayer.qualifyingOffer ? (
            <div
              role="note"
              className="rounded border border-accent-warning/50 bg-accent-warning/10 p-3 font-heading text-xs text-accent-warning"
            >
              <div className="font-semibold">Qualifying offer attached by {selectedPlayer.qualifyingOffer.formerTeamName}</div>
              {selectedPlayer.qualifyingOffer.blockedReason ? (
                <div className="mt-1">Signing blocked: {selectedPlayer.qualifyingOffer.blockedReason}</div>
              ) : selectedPlayer.qualifyingOffer.requiresCompensation && selectedPlayer.qualifyingOffer.forfeitedPick ? (
                <div className="mt-1">
                  An accepted signing forfeits your Round {selectedPlayer.qualifyingOffer.forfeitedPick.round} pick
                  {' '}({selectedPlayer.qualifyingOffer.forfeitedPick.originalTeamId.toUpperCase()} origin).
                </div>
              ) : (
                <div className="mt-1">No pick is forfeited when a player re-signs with his former club.</div>
              )}
            </div>
          ) : null}

          {offerBudget && (
            <div className="grid gap-2 rounded border border-dynasty-border/50 bg-dynasty-elevated p-3 font-data text-xs">
              <div className="flex justify-between gap-3 text-dynasty-muted">
                <span>Projected payroll</span>
                <span className="text-dynasty-text">{money(offerBudget.projectedPayroll)}</span>
              </div>
              <div className={`flex justify-between gap-3 ${offerBudget.budgetRoom >= 0 ? 'text-accent-success' : 'text-accent-danger'}`}>
                <span>Budget room</span>
                <span>{offerBudget.budgetRoom >= 0 ? money(offerBudget.budgetRoom) : `${money(Math.abs(offerBudget.budgetRoom))} over`}</span>
              </div>
              {offerBudget.ownerSoftCeilingRoom != null ? (
                <div className={`flex justify-between gap-3 ${offerBudget.ownerSoftCeilingRoom >= 0 ? 'text-accent-info' : 'text-accent-warning'}`}>
                  <span>Owner soft ceiling room</span>
                  <span>{offerBudget.ownerSoftCeilingRoom >= 0 ? money(offerBudget.ownerSoftCeilingRoom) : `${money(Math.abs(offerBudget.ownerSoftCeilingRoom))} over`}</span>
                </div>
              ) : null}
              <div className={`flex justify-between gap-3 ${offerBudget.taxRoom >= 0 ? 'text-accent-info' : 'text-accent-warning'}`}>
                <span>{offerBudget.taxLine != null ? `Tax line room ($${offerBudget.taxLine.toFixed(1)}M)` : 'Tax room after offer'}</span>
                <span>{offerBudget.taxRoom >= 0 ? money(offerBudget.taxRoom) : `${money(Math.abs(offerBudget.taxRoom))} over`}</span>
              </div>
              {offerBudget.ownerFloor != null ? (
                <div className="text-dynasty-muted">Advisory owner floor: {money(offerBudget.ownerFloor)}</div>
              ) : null}
            </div>
          )}

          <button
            type="button"
            data-mobile-critical-control="free-agency-offer-contract"
            onClick={onSubmitOffer}
            disabled={Boolean(selectedPlayer.qualifyingOffer?.blockedReason)}
            className="mobile-critical-control w-full rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white transition-colors hover:bg-accent-primary/80"
          >
            <DollarSign className="mr-1 inline h-4 w-4" />
            Offer Contract
          </button>

        </div>
      ) : (
        <div className="py-8 text-center font-heading text-sm text-dynasty-muted">
          Select a free agent to make an offer
        </div>
      )}
      {offerResult && (
        <div
          role="status"
          aria-live="polite"
          data-testid="free-agency-offer-result"
          className={`mt-4 rounded p-3 font-heading text-sm ${
            offerResult.includes('Signed')
              ? 'bg-accent-success/20 text-accent-success'
              : 'bg-accent-danger/20 text-accent-danger'
          }`}
        >
          {offerResult}
        </div>
      )}
    </DensePanel>
  );
}
