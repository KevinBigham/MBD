import type { FinancialPlaybook } from '@mbd/sim-core';
import { GradeBadge } from '../shared';

interface Props {
  data: FinancialPlaybook;
}

const PRIMARY_EXTENSION_LIMIT = 4;

export function FinancialView({ data }: Props) {
  const primaryExtensions = data.extensions.slice(0, PRIMARY_EXTENSION_LIMIT);
  const overflowExtensions = data.extensions.slice(PRIMARY_EXTENSION_LIMIT);

  return (
    <div className="space-y-5">
      {/* Payroll breakdown */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Payroll Breakdown
        </h4>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <PayrollStat label="Total" value={`$${data.payroll.totalPayroll.toFixed(1)}M`} />
          <PayrollStat label="Hitters" value={`$${data.payroll.hitterPayroll.toFixed(1)}M`} />
          <PayrollStat label="Pitchers" value={`$${data.payroll.pitcherPayroll.toFixed(1)}M`} />
        </div>
        <div className="mt-3 rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2">
          <span className="font-data text-[10px] uppercase text-dynasty-muted">Top Paid: </span>
          <span className="font-heading text-sm text-dynasty-text">
            {data.payroll.topPaidPlayer.name}
          </span>
          <span className="ml-2 font-data text-xs text-accent-primary">
            ${data.payroll.topPaidPlayer.salary.toFixed(1)}M
          </span>
        </div>
      </div>

      {/* Financial flexibility */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Financial Flexibility
        </h4>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Grade</span>
            <GradeBadge grade={data.flexibility.grade} className="mt-1" size="lg" />
          </div>
          <div className="flex-1 space-y-1">
            <InfoRow label="Available Space" value={`$${data.flexibility.availableSpace.toFixed(1)}M`} />
            <InfoRow label="Luxury Tax Room" value={`$${data.flexibility.luxuryTaxRoom.toFixed(1)}M`} />
            <InfoRow label="Can Add Star?" value={data.flexibility.canAddStar ? 'Yes' : 'No'} />
            <InfoRow label="Can Add Role Player?" value={data.flexibility.canAddRole ? 'Yes' : 'No'} />
          </div>
        </div>
        <p className="mt-3 font-data text-xs text-dynasty-muted">{data.flexibility.narrativeSummary}</p>
      </div>

      {/* Extension priorities */}
      {data.extensions.length > 0 && (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
          <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
            Extension Priorities
          </h4>
          <div className="mt-3 space-y-2">
            {primaryExtensions.map((ext) => (
              <ExtensionPriorityRow
                key={ext.playerId}
                ext={ext}
                testId="primary-extension-priority"
              />
            ))}
          </div>
          {overflowExtensions.length > 0 ? (
            <details className="mt-3 rounded border border-dynasty-border/50 bg-dynasty-bg/30 px-3 py-2">
              <summary className="cursor-pointer font-data text-xs text-dynasty-muted">
                Show {overflowExtensions.length} more extension {overflowExtensions.length === 1 ? 'priority' : 'priorities'}
              </summary>
              <div className="mt-3 space-y-2">
                {overflowExtensions.map((ext) => (
                  <ExtensionPriorityRow
                    key={ext.playerId}
                    ext={ext}
                    testId="overflow-extension-priority"
                  />
                ))}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ExtensionPriorityRow({
  ext,
  testId,
}: {
  ext: FinancialPlaybook['extensions'][number];
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center justify-between rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
    >
      <div className="min-w-0 flex-1">
        <span className="font-heading text-sm text-dynasty-text">{ext.name}</span>
        {' '}
        <span className="font-data text-xs text-dynasty-muted">&middot; {ext.position}</span>
      </div>
      <div className="flex items-center gap-3">
        <UrgencyBadge urgency={ext.urgency} />
        <span className="font-data text-xs text-dynasty-muted">
          {ext.yearsRemaining}yr left &middot; ${ext.currentSalary.toFixed(1)}M
        </span>
      </div>
    </div>
  );
}

function PayrollStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <span className="block font-data text-[10px] uppercase tracking-wider text-dynasty-muted">{label}</span>
      <span className="mt-1 block font-data text-sm font-semibold text-dynasty-text">{value}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-data text-xs text-dynasty-muted">{label}</span>
      <span className="font-data text-xs text-dynasty-text">{value}</span>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const styles: Record<string, string> = {
    extend_now: 'bg-accent-danger/15 text-accent-danger',
    monitor: 'bg-accent-warning/15 text-accent-warning',
    let_walk: 'bg-dynasty-muted/15 text-dynasty-muted',
  };
  const labels: Record<string, string> = {
    extend_now: 'Extend Now',
    monitor: 'Monitor',
    let_walk: 'Let Walk',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 font-data text-[10px] uppercase ${styles[urgency] ?? ''}`}>
      {labels[urgency] ?? urgency}
    </span>
  );
}
