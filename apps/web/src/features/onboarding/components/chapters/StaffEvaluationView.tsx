import type { StaffEvaluation } from '@mbd/sim-core';
import { GradeBadge } from '../shared';
import { roleLabel } from '@/shared/lib/labels';

interface Props {
  data: StaffEvaluation;
}

export function StaffEvaluationView({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Staff overview */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Staff Assessment
        </h4>
        <div className="mt-3 flex items-center gap-4">
          <div className="text-center">
            <span className="block font-data text-[10px] uppercase text-dynasty-muted">Overall</span>
            <GradeBadge grade={data.strengths.overallGrade} className="mt-1" size="lg" />
          </div>
          <div className="flex-1 space-y-1">
            <InfoRow label="Best Area" value={data.strengths.bestArea} />
            <InfoRow label="Weakest Area" value={data.strengths.weakestArea} />
            <InfoRow
              label="Budget Utilization"
              value={`${Math.round(data.strengths.budgetUtilization * 100)}%`}
            />
          </div>
        </div>
        <p className="mt-3 font-data text-xs text-dynasty-muted">
          {data.strengths.narrativeSummary}
        </p>
      </div>

      {/* Key coaches */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Key Coaches
        </h4>
        <div className="mt-3 space-y-2">
          {data.keyCoaches.map((coach) => (
            <div
              key={coach.coachId}
              className="flex items-center justify-between rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <span className="font-heading text-sm font-medium text-dynasty-text">{coach.name}</span>
                <span className="ml-2 font-data text-xs capitalize text-dynasty-muted">
                  {roleLabel(coach.role)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <span className="block font-data text-[9px] uppercase text-dynasty-muted">Teach</span>
                  <GradeBadge grade={coach.teachingGrade} />
                </div>
                <div className="text-center">
                  <span className="block font-data text-[9px] uppercase text-dynasty-muted">Impact</span>
                  <GradeBadge grade={coach.impactGrade} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="flex gap-3">
        <BudgetCard label="Staff Budget" value={`$${data.staffBudget.toFixed(1)}M`} />
        <BudgetCard label="Staff Payroll" value={`$${data.staffPayroll.toFixed(1)}M`} />
        <BudgetCard label="Remaining" value={`$${data.budgetRemaining.toFixed(1)}M`} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-data text-xs text-dynasty-muted">{label}</span>
      <span className="font-data text-xs capitalize text-dynasty-text">{value}</span>
    </div>
  );
}

function BudgetCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded border border-dynasty-border/50 bg-dynasty-surface/40 px-3 py-2 text-center">
      <span className="block font-data text-[10px] uppercase tracking-wider text-dynasty-muted">{label}</span>
      <span className="mt-1 block font-data text-sm font-semibold text-dynasty-text">{value}</span>
    </div>
  );
}
