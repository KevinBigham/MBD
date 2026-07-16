import { Badge, GradeBar } from '@mbd/ui';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';
import { Building2, Clock, Coins, TrendingUp } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface FrontOfficeOwnerView {
  archetype: string;
  patience: number;
  confidence: number;
  hotSeat: boolean;
  summary: string;
  expectations: { winsTarget: number; playoffTarget: boolean; payrollTarget: number };
  satisfaction: number;
  spendingWillingness: 'cheap' | 'moderate' | 'lavish';
  winNowPressure: number;
  meddlingLevel: number;
  annualBudget: number;
  payrollCap: number;
  draftBonusPool: number;
  ifaBonusPool: number;
  staffBudget: number;
}

function archetypeIcon(archetype: string) {
  switch (archetype) {
    case 'win_now': return <TrendingUp className="h-4 w-4" />;
    case 'patient_builder': return <Clock className="h-4 w-4" />;
    case 'penny_pincher': return <Coins className="h-4 w-4" />;
    default: return <Building2 className="h-4 w-4" />;
  }
}

function archetypeLabel(archetype: string): string {
  return archetype.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMoney(n: number): string {
  if (n <= 1_000) return `$${n.toFixed(1)}M`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export function FrontOfficeOwnerProfileCard({ owner }: { owner: FrontOfficeOwnerView }) {
  return (
    <DensePanel
      title="Owner Profile"
      icon={archetypeIcon(owner.archetype)}
      meta={owner.hotSeat ? (
        <Badge className="border-accent-danger/40 bg-accent-danger/10 text-accent-danger motion-safe:animate-pulse">
          HOT SEAT
        </Badge>
      ) : null}
      bodyClassName="space-y-4"
    >
        <Badge className="border-dynasty-border bg-dynasty-elevated text-dynasty-text">
          {archetypeLabel(owner.archetype)}
        </Badge>

        <div className="space-y-3">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Patience</span><span>{owner.patience}</span>
            </div>
            <GradeBar grade={owner.patience} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Confidence</span><span>{owner.confidence}</span>
            </div>
            <GradeBar grade={owner.confidence} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Satisfaction</span><span>{owner.satisfaction}</span>
            </div>
            <GradeBar grade={owner.satisfaction} />
          </div>
        </div>

        <div className="rounded-md border border-dynasty-border bg-dynasty-base p-3">
          <div className="font-heading text-xs text-dynasty-muted">Expectations</div>
          <div className="mt-1.5 space-y-1 font-data text-xs text-dynasty-text">
            <div>Win target: <span className="text-accent-primary">{owner.expectations.winsTarget}+</span> wins</div>
            <div>Playoffs: <span className={owner.expectations.playoffTarget ? 'text-accent-success' : 'text-dynasty-muted'}>{owner.expectations.playoffTarget ? 'Expected' : 'Optional'}</span></div>
            <div>Payroll cap: <span className="text-accent-warning">{formatMoney(owner.expectations.payrollTarget)}</span></div>
          </div>
        </div>

        <p className="font-data text-xs italic text-dynasty-muted">{owner.summary}</p>
    </DensePanel>
  );
}

export function FrontOfficeBudgetCard({
  owner,
  ownerPayrollPolicy,
}: {
  owner: FrontOfficeOwnerView;
  ownerPayrollPolicy?: OwnerPayrollPolicy | null;
}) {
  return (
    <DensePanel
      title="Budget Overview"
      icon={<Coins className="h-4 w-4" />}
    >
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Annual Budget', value: formatMoney(owner.annualBudget) },
            { label: 'Payroll Cap', value: formatMoney(owner.payrollCap) },
            { label: 'Draft Bonus Pool', value: formatMoney(owner.draftBonusPool) },
            { label: 'IFA Bonus Pool', value: formatMoney(owner.ifaBonusPool) },
            { label: 'Staff Budget', value: formatMoney(owner.staffBudget) },
            { label: 'Spending Will', value: `${owner.spendingWillingness}` },
          ].map((item) => (
            <div key={item.label} className="rounded-md border border-dynasty-border bg-dynasty-base p-2.5">
              <div className="font-data text-[10px] text-dynasty-muted">{item.label}</div>
              <div className="mt-0.5 font-data text-sm text-dynasty-textBright">{item.value}</div>
            </div>
          ))}
        </div>

        {ownerPayrollPolicy ? (
          <div className="mt-3 rounded-md border border-accent-primary/30 bg-accent-primary/5 p-3">
            <div className="font-heading text-xs uppercase tracking-[0.14em] text-accent-primary">Owner payroll plan</div>
            <div className="mt-2 grid grid-cols-2 gap-2 font-data text-xs text-dynasty-text sm:grid-cols-4">
              <div>Current <span className="text-dynasty-textBright">{formatMoney(ownerPayrollPolicy.totalPayroll)}</span></div>
              <div>Floor <span className="text-dynasty-textBright">{formatMoney(ownerPayrollPolicy.floor)}</span></div>
              <div>Soft ceiling <span className="text-dynasty-textBright">{formatMoney(ownerPayrollPolicy.softCeiling)}</span></div>
              <div>Tax line <span className="text-dynasty-textBright">{formatMoney(ownerPayrollPolicy.taxThreshold)}</span></div>
            </div>
            <p className="mt-2 font-data text-xs text-dynasty-muted">
              Advisory lines only. Final owner payroll pressure is reconciled once when the offseason completes.
            </p>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Win-Now Pressure</span><span>{owner.winNowPressure}</span>
            </div>
            <GradeBar grade={owner.winNowPressure} />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-data text-xs text-dynasty-muted">
              <span>Meddling Level</span><span>{owner.meddlingLevel}</span>
            </div>
            <GradeBar grade={owner.meddlingLevel} />
          </div>
        </div>
    </DensePanel>
  );
}
