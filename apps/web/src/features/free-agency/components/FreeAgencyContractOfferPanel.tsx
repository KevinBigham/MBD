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
  decisionPreview?: {
    careerStage: 'rising' | 'prime' | 'veteran';
    priorityOrder: Array<
      | 'term_security'
      | 'projected_opportunity'
      | 'contender_status'
      | 'loyalty'
      | 'clubhouse'
    >;
    projectedOpportunity: 'featured' | 'regular' | 'depth';
    contenderStatus: 'champion' | 'playoff' | 'contender' | 'competitive' | 'developing' | 'unknown';
    loyaltySource: 'homegrown_and_tenure' | 'homegrown' | 'tenure' | 'none';
    tenureSeasons: number;
    homegrownBond: number;
    clubhouseScore: number;
  };
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

function priorityLabel(value: NonNullable<FreeAgentOfferPlayer['decisionPreview']>['priorityOrder'][number]): string {
  switch (value) {
    case 'term_security': return 'contract security';
    case 'projected_opportunity': return 'projected opportunity';
    case 'contender_status': return 'contender status';
    case 'loyalty': return 'loyalty';
    case 'clubhouse': return 'clubhouse reputation';
  }
}

function contenderLabel(value: NonNullable<FreeAgentOfferPlayer['decisionPreview']>['contenderStatus']): string {
  switch (value) {
    case 'champion': return 'defending champion';
    case 'playoff': return 'recent playoff club';
    case 'contender': return '90-win contender';
    case 'competitive': return 'winning club';
    case 'developing': return 'developing club';
    case 'unknown': return 'no complete prior-season facts';
  }
}

function loyaltyLabel(preview: NonNullable<FreeAgentOfferPlayer['decisionPreview']>): string {
  if (preview.loyaltySource === 'homegrown_and_tenure') {
    return `homegrown connection + ${preview.tenureSeasons} prior seasons`;
  }
  if (preview.loyaltySource === 'homegrown') return 'homegrown connection';
  if (preview.loyaltySource === 'tenure') return `${preview.tenureSeasons} prior seasons`;
  return 'no persisted tie';
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

          {selectedPlayer.decisionPreview ? (
            <div
              role="note"
              data-testid="free-agency-decision-preview"
              className="rounded border border-accent-info/40 bg-accent-info/10 p-3 font-data text-xs text-dynasty-text"
            >
              <div className="font-heading font-semibold text-accent-info">How he weighs offers</div>
              <div className="mt-1 text-dynasty-muted">
                Age curve: {selectedPlayer.decisionPreview.careerStage}. Top priorities:{' '}
                {selectedPlayer.decisionPreview.priorityOrder.slice(0, 2).map(priorityLabel).join(' and ')}.
              </div>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <div><dt className="inline text-dynasty-muted">Your projected opportunity: </dt><dd className="inline capitalize">{selectedPlayer.decisionPreview.projectedOpportunity} MLB</dd></div>
                <div><dt className="inline text-dynasty-muted">Your contender status: </dt><dd className="inline">{contenderLabel(selectedPlayer.decisionPreview.contenderStatus)}</dd></div>
                <div><dt className="inline text-dynasty-muted">Loyalty: </dt><dd className="inline">{loyaltyLabel(selectedPlayer.decisionPreview)}</dd></div>
                <div><dt className="inline text-dynasty-muted">Clubhouse appeal: </dt><dd className="inline">{selectedPlayer.decisionPreview.clubhouseScore}/100</dd></div>
              </dl>
              <div className="mt-2 text-dynasty-muted">
                Opportunity is projected from today&apos;s MLB depth; future playing time is not guaranteed.
              </div>
            </div>
          ) : null}

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
