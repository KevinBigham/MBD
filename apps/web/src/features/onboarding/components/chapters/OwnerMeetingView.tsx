import type { OwnerMeetingBriefing } from '@mbd/sim-core';
import { GradeBadge } from '../shared';

interface Props {
  data: OwnerMeetingBriefing;
}

export function OwnerMeetingView({ data }: Props) {
  return (
    <div className="space-y-5">
      {/* Owner personality */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Owner Profile
        </h4>
        <p className="mt-2 font-heading text-sm text-dynasty-text">
          {data.ownerPersonality.personalityDescription}
        </p>
        <div className="mt-3 flex gap-3">
          <StatChip label="Expectations" value={data.ownerPersonality.expectationLevel} />
          <StatChip label="Archetype" value={data.ownerPersonality.archetype.replace(/_/g, ' ')} />
        </div>
      </div>

      {/* Budget overview */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          Budget Overview
        </h4>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <StatCard label="Total Budget" value={`$${data.budgetOverview.totalBudget.toFixed(1)}M`} />
          <StatCard label="Current Payroll" value={`$${data.budgetOverview.currentPayroll.toFixed(1)}M`} />
          <StatCard label="Available Space" value={`$${data.budgetOverview.availableSpace.toFixed(1)}M`} />
          <StatCard label="Spending Grade" value={data.budgetOverview.spendingGrade} grade />
        </div>
        <p className="mt-3 font-data text-xs text-dynasty-muted">
          {data.budgetOverview.narrativeSummary}
        </p>
      </div>

      {/* Expectations + market context */}
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface/40 p-4">
        <h4 className="font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
          The Mandate
        </h4>
        <p className="mt-2 font-heading text-sm text-dynasty-text">{data.expectations}</p>
        <p className="mt-2 font-data text-xs text-dynasty-muted">{data.marketContext}</p>
        <p className="mt-1 font-data text-xs text-dynasty-muted">{data.divisionOutlook}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, grade }: { label: string; value: string; grade?: boolean }) {
  return (
    <div className="rounded border border-dynasty-border/50 bg-dynasty-bg/40 px-3 py-2">
      <span className="block font-data text-[10px] uppercase tracking-wider text-dynasty-muted">{label}</span>
      {grade ? (
        <GradeBadge grade={value} className="mt-1" />
      ) : (
        <span className="mt-1 block font-data text-lg font-semibold text-dynasty-text">{value}</span>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-dynasty-bg/60 px-2.5 py-1">
      <span className="font-data text-[10px] uppercase text-dynasty-muted">{label}: </span>
      <span className="font-data text-xs capitalize text-dynasty-text">{value}</span>
    </div>
  );
}
