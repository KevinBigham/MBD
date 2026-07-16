import { AlertTriangle } from 'lucide-react';
import type { OwnerPayrollPolicy } from '@mbd/sim-core';

type OffseasonCommandStatus = 'complete' | 'attention' | 'blocked' | 'upcoming';

export interface OffseasonCommandCenterView {
  checklist: Array<{
    id: string;
    label: string;
    status: OffseasonCommandStatus;
    detail: string;
    actionLabel?: string;
  }>;
  warnings: Array<{
    id: string;
    severity: 'warning' | 'danger';
    title: string;
    detail: string;
  }>;
  projectedOpeningDay: {
    activeRosterCount: number;
    activeRosterLimit: number;
    fortyManCount: number;
    fortyManLimit: number;
    payroll: number;
    budget: number;
    payrollCap?: number;
    payrollSpace: number;
    capSpace?: number;
    ownerPayrollPolicy?: OwnerPayrollPolicy;
    rosterHoleCount: number;
  };
}

function moneyLabel(value: number, digits: number = 1): string {
  return `$${value.toFixed(digits)}M`;
}

function signedMoneyLabel(value: number): string {
  return value < 0 ? `-$${Math.abs(value).toFixed(1)}M` : `$${value.toFixed(1)}M`;
}

function commandStatusLabel(status: OffseasonCommandStatus): string {
  switch (status) {
    case 'complete':
      return 'Complete';
    case 'attention':
      return 'Needs attention';
    case 'blocked':
      return 'Blocked';
    case 'upcoming':
      return 'Upcoming';
    default:
      return status;
  }
}

function commandStatusClasses(status: OffseasonCommandStatus): string {
  switch (status) {
    case 'complete':
      return 'border-accent-success/40 bg-accent-success/10 text-accent-success';
    case 'attention':
      return 'border-accent-warning/40 bg-accent-warning/10 text-accent-warning';
    case 'blocked':
      return 'border-red-500/40 bg-red-500/10 text-red-300';
    case 'upcoming':
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
  }
}

function ownerBandLabel(policy: OwnerPayrollPolicy): string {
  if (policy.ownerBand === 'below_floor') return 'Below owner floor';
  if (policy.ownerBand === 'above_soft_ceiling') return 'Above soft ceiling';
  return 'Inside owner plan';
}

export function OffseasonCommandCenterPanel({ commandCenter }: { commandCenter: OffseasonCommandCenterView }) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface">
      <div className="flex flex-col gap-3 border-b border-dynasty-border px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-[0.18em] text-dynasty-text">
            Offseason Command Center
          </h2>
          <p className="mt-1 font-heading text-xs text-dynasty-muted">
            Opening Day Projection
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right sm:grid-cols-4">
          <div>
            <div className="font-data text-lg font-semibold text-dynasty-textBright">
              {commandCenter.projectedOpeningDay.activeRosterCount}/{commandCenter.projectedOpeningDay.activeRosterLimit}
            </div>
            <div className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Active
            </div>
          </div>
          <div>
            <div className="font-data text-lg font-semibold text-dynasty-textBright">
              {commandCenter.projectedOpeningDay.fortyManCount}/{commandCenter.projectedOpeningDay.fortyManLimit}
            </div>
            <div className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              40-Man
            </div>
          </div>
          <div>
            <div className="font-data text-lg font-semibold text-dynasty-textBright">
              {moneyLabel(commandCenter.projectedOpeningDay.payroll)}
            </div>
            <div className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Payroll
            </div>
          </div>
          <div>
            <div
              className={`font-data text-lg font-semibold ${
                commandCenter.projectedOpeningDay.payrollSpace < 0 ? 'text-red-300' : 'text-dynasty-textBright'
              }`}
            >
              {signedMoneyLabel(commandCenter.projectedOpeningDay.payrollSpace)}
            </div>
            <div className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
              Payroll Space
            </div>
          </div>
        </div>
      </div>

      {commandCenter.projectedOpeningDay.ownerPayrollPolicy ? (
        <div className="grid gap-2 border-b border-dynasty-border bg-dynasty-elevated/50 px-4 py-3 font-data text-xs text-dynasty-text sm:grid-cols-2 lg:grid-cols-5">
          <div><span className="text-dynasty-muted">Owner status</span><br />{ownerBandLabel(commandCenter.projectedOpeningDay.ownerPayrollPolicy)}</div>
          <div><span className="text-dynasty-muted">Floor</span><br />{moneyLabel(commandCenter.projectedOpeningDay.ownerPayrollPolicy.floor)}</div>
          <div><span className="text-dynasty-muted">Soft ceiling</span><br />{moneyLabel(commandCenter.projectedOpeningDay.ownerPayrollPolicy.softCeiling)}</div>
          <div><span className="text-dynasty-muted">Tax line</span><br />{moneyLabel(commandCenter.projectedOpeningDay.ownerPayrollPolicy.taxThreshold)}</div>
          <div><span className="text-dynasty-muted">Projected exposure</span><br />{moneyLabel(commandCenter.projectedOpeningDay.ownerPayrollPolicy.projectedTax)}</div>
        </div>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[1fr_0.8fr]">
        <div className="border-b border-dynasty-border lg:border-b-0 lg:border-r">
          <div className="grid gap-px bg-dynasty-border sm:grid-cols-2 xl:grid-cols-3">
            {commandCenter.checklist.map((item) => (
              <div key={item.id} className="bg-dynasty-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-heading text-sm font-semibold text-dynasty-textBright">
                      {item.label}
                    </div>
                    <div className="mt-1 font-heading text-xs leading-5 text-dynasty-muted">
                      {item.detail}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] ${commandStatusClasses(item.status)}`}>
                    {commandStatusLabel(item.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warnings
          </div>
          {commandCenter.warnings.length > 0 ? (
            <div className="space-y-2">
              {commandCenter.warnings.map((warning) => (
                <div
                  key={warning.id}
                  className={`rounded border px-3 py-2 ${
                    warning.severity === 'danger'
                      ? 'border-red-500/40 bg-red-500/10'
                      : 'border-accent-warning/40 bg-accent-warning/10'
                  }`}
                >
                  <div
                    className={`font-heading text-sm font-semibold ${
                      warning.severity === 'danger' ? 'text-red-300' : 'text-accent-warning'
                    }`}
                  >
                    {warning.title}
                  </div>
                  <div className="mt-1 font-data text-xs text-dynasty-text">
                    {warning.detail}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-3 font-heading text-sm text-dynasty-muted">
              No roster or budget blockers detected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
