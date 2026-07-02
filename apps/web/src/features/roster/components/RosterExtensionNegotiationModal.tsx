import { useEffect } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatLine } from '@mbd/ui';
import { Clock3, DollarSign, ShieldCheck } from 'lucide-react';
import { useFocusTrap } from '@/shared/hooks/useFocusTrap';
import { ExtensionOfferGuardrails } from './ExtensionOfferGuardrails';
import type { ExtensionCandidateView } from './ExtensionCommandCenter';

export interface ExtensionOfferView {
  years: number;
  annualSalary: number;
  totalValue: number;
  noTradeClause: boolean;
  noTradeClauseType: string;
  playerOption: boolean;
  teamOption: boolean;
  optOutYears: number[];
  signingBonus: number;
  buyoutAmount: number;
  deferredMoney: Array<{ yearOffset: number; amount: number }>;
}

export interface ExtensionResponseView {
  status: 'accepted' | 'rejected' | 'countered';
  rounds: Array<{ round: number; status: string }>;
  counterOffer?: ExtensionOfferView;
  review?: {
    status: 'accepted' | 'rejected' | 'countered';
    riskLevel: 'low' | 'medium' | 'high';
    offerGapPct: number;
    teamOfferAav: number;
    playerDemandAav: number;
    evidence: string[];
  };
}

interface RosterExtensionNegotiationModalProps {
  candidate: ExtensionCandidateView;
  offer: ExtensionOfferView;
  offerYears: number;
  offerSalary: string;
  offerSigningBonus: string;
  offerNoTrade: boolean;
  offerOptOut: boolean;
  negotiationResponse: ExtensionResponseView | null;
  busyAction: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onOfferYearsChange: (years: number) => void;
  onOfferSalaryChange: (salary: string) => void;
  onOfferSigningBonusChange: (signingBonus: string) => void;
  onOfferNoTradeChange: (enabled: boolean) => void;
  onOfferOptOutChange: (enabled: boolean) => void;
}

function moneyLabel(value: number): string {
  return `$${value.toFixed(1)}M`;
}

function extensionRiskVariant(riskLevel: 'low' | 'medium' | 'high'): 'success' | 'warning' | 'danger' {
  if (riskLevel === 'high') return 'danger';
  if (riskLevel === 'medium') return 'warning';
  return 'success';
}

export function RosterExtensionNegotiationModal({
  candidate,
  offer,
  offerYears,
  offerSalary,
  offerSigningBonus,
  offerNoTrade,
  offerOptOut,
  negotiationResponse,
  busyAction,
  onClose,
  onSubmit,
  onOfferYearsChange,
  onOfferSalaryChange,
  onOfferSigningBonusChange,
  onOfferNoTradeChange,
  onOfferOptOutChange,
}: RosterExtensionNegotiationModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-6">
      <Card
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-extension-negotiation-title"
        tabIndex={-1}
        className="w-full max-w-3xl border-accent-primary/30 shadow-2xl"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle id="roster-extension-negotiation-title" className="font-heading text-dynasty-text">
              Extension Negotiation
            </CardTitle>
            <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {candidate.playerName}
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Clock3 className="h-4 w-4 text-accent-info" />
                  Current Deal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StatLine
                  stats={[
                    { label: 'Years', value: candidate.yearsRemaining },
                    { label: 'Salary', value: moneyLabel(candidate.currentSalary) },
                  ]}
                />
              </CardContent>
            </Card>

            <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-accent-success" />
                  Proposed Extension
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block">
                  <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">Years</div>
                  <input
                    value={offerYears}
                    onChange={(event) => onOfferYearsChange(Number.parseInt(event.target.value, 10) || 1)}
                    className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">AAV</div>
                  <input
                    value={offerSalary}
                    onChange={(event) => onOfferSalaryChange(event.target.value)}
                    className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                  />
                </label>
                <label className="block">
                  <div className="mb-1 text-xs uppercase tracking-[0.18em] text-dynasty-muted">Signing Bonus</div>
                  <input
                    value={offerSigningBonus}
                    onChange={(event) => onOfferSigningBonusChange(event.target.value)}
                    className="w-full rounded-md border border-dynasty-border bg-dynasty-base px-3 py-2 text-sm text-dynasty-text"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 text-sm text-dynasty-text">
                    <input type="checkbox" checked={offerNoTrade} onChange={(event) => onOfferNoTradeChange(event.target.checked)} />
                    <ShieldCheck className="h-4 w-4 text-accent-info" />
                    No-trade clause
                  </label>
                  <label className="flex items-center gap-2 rounded-md border border-dynasty-border px-3 py-2 text-sm text-dynasty-text">
                    <input type="checkbox" checked={offerOptOut} onChange={(event) => onOfferOptOutChange(event.target.checked)} />
                    <Clock3 className="h-4 w-4 text-accent-warning" />
                    Opt-out
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <ExtensionOfferGuardrails
            candidate={candidate}
            years={offerYears}
            annualSalary={Number.parseFloat(offerSalary)}
            signingBonus={Number.parseFloat(offerSigningBonus)}
            noTradeClause={offerNoTrade}
            optOut={offerOptOut}
          />

          {negotiationResponse && (
            <Card className="border-dynasty-border/60 bg-dynasty-elevated/50">
              <CardHeader>
                <CardTitle className="text-sm">Latest Response</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant={negotiationResponse.status === 'accepted' ? 'success' : negotiationResponse.status === 'countered' ? 'info' : 'outline'}>
                  {negotiationResponse.status}
                </Badge>
                {negotiationResponse.counterOffer && (
                  <StatLine
                    stats={[
                      { label: 'Counter Years', value: negotiationResponse.counterOffer.years },
                      { label: 'Counter AAV', value: moneyLabel(negotiationResponse.counterOffer.annualSalary) },
                    ]}
                  />
                )}
                {negotiationResponse.review && (
                  <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">
                          Negotiation Review
                        </div>
                        <div className="mt-1 font-data text-xs text-dynasty-muted">
                          Gap {negotiationResponse.review.offerGapPct.toFixed(1)}% | Team {moneyLabel(negotiationResponse.review.teamOfferAav)} | Ask {moneyLabel(negotiationResponse.review.playerDemandAav)}
                        </div>
                      </div>
                      <Badge variant={extensionRiskVariant(negotiationResponse.review.riskLevel)}>
                        {negotiationResponse.review.riskLevel} risk
                      </Badge>
                    </div>
                    <div className="mt-2 grid gap-2">
                      {negotiationResponse.review.evidence.map((line) => (
                        <div key={line} className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 text-sm text-dynasty-muted">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Walk Away
            </Button>
            <Button
              type="button"
              loading={busyAction === `extension-${candidate.playerId}`}
              onClick={onSubmit}
            >
              Submit Offer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
