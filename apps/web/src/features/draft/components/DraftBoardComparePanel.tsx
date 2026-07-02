import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

interface DraftComparisonRow {
  label: string;
  prospect: DraftRoomProspect;
  gradeDelta: number;
  signabilityDelta: number;
  riskDelta: number;
}

function gradeChipClass(grade: number): string {
  if (grade >= 60) return 'border-accent-success/30 bg-accent-success/10 text-accent-success';
  if (grade >= 50) return 'border-accent-info/30 bg-accent-info/10 text-accent-info';
  if (grade >= 40) return 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning';
  return 'border-dynasty-border bg-dynasty-elevated text-dynasty-muted';
}

function formatBonus(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}M`;
}

function formatSignedDelta(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function compareByGrade(left: DraftRoomProspect, right: DraftRoomProspect): number {
  if (right.scoutingGrade !== left.scoutingGrade) {
    return right.scoutingGrade - left.scoutingGrade;
  }
  if (right.decisionInputs.signability.value !== left.decisionInputs.signability.value) {
    return right.decisionInputs.signability.value - left.decisionInputs.signability.value;
  }
  if (left.decisionInputs.risk.value !== right.decisionInputs.risk.value) {
    return left.decisionInputs.risk.value - right.decisionInputs.risk.value;
  }
  return left.name.localeCompare(right.name);
}

function buildDraftComparisonRows(
  selectedProspect: DraftRoomProspect | null,
  prospects: DraftRoomProspect[],
): DraftComparisonRow[] {
  if (!selectedProspect) {
    return [];
  }

  const alternatives = prospects.filter((prospect) => prospect.id !== selectedProspect.id);
  const buildRow = (label: string, prospect: DraftRoomProspect): DraftComparisonRow => ({
    label,
    prospect,
    gradeDelta: prospect.scoutingGrade - selectedProspect.scoutingGrade,
    signabilityDelta: prospect.decisionInputs.signability.value - selectedProspect.decisionInputs.signability.value,
    riskDelta: prospect.decisionInputs.risk.value - selectedProspect.decisionInputs.risk.value,
  });

  const rows = [buildRow('Selected Read', selectedProspect)];
  const bestGrade = [...alternatives].sort(compareByGrade)[0];
  if (bestGrade) {
    rows.push(buildRow('Best Grade', bestGrade));
  }

  const safestSign = [...alternatives].sort((left, right) => (
    right.decisionInputs.signability.value - left.decisionInputs.signability.value
    || compareByGrade(left, right)
  ))[0];
  if (safestSign) {
    rows.push(buildRow('Safer Sign', safestSign));
  }

  const lowestRisk = [...alternatives].sort((left, right) => (
    left.decisionInputs.risk.value - right.decisionInputs.risk.value
    || compareByGrade(left, right)
  ))[0];
  if (lowestRisk) {
    rows.push(buildRow('Lower Risk', lowestRisk));
  }

  return rows;
}

interface DraftBoardComparePanelProps {
  selectedProspect: DraftRoomProspect | null;
  prospects: DraftRoomProspect[];
}

export function DraftBoardComparePanel({ selectedProspect, prospects }: DraftBoardComparePanelProps) {
  const comparisonRows = buildDraftComparisonRows(selectedProspect, prospects);

  if (comparisonRows.length <= 1) {
    return null;
  }

  return (
    <div className="mt-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">
        Board Compare
      </div>
      <div className="mt-3 space-y-2">
        {comparisonRows.map((row) => (
          <div key={`${row.label}-${row.prospect.id}`} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-xs uppercase tracking-[0.16em] text-dynasty-muted">
                  {row.label}
                </div>
                <div className="mt-1 font-heading text-sm font-semibold text-dynasty-textBright">
                  {row.prospect.name}
                </div>
                <div className="mt-1 font-data text-[11px] text-dynasty-muted">
                  {row.prospect.position} · {row.prospect.origin} · Ask {formatBonus(row.prospect.askBonus)}
                </div>
              </div>
              <div className={`rounded border px-2 py-1 font-data text-lg font-semibold ${gradeChipClass(row.prospect.scoutingGrade)}`}>
                {row.prospect.scoutingGrade}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 font-data text-[11px] text-dynasty-muted">
              <span>{formatSignedDelta(row.gradeDelta)} grade vs selected</span>
              <span>{formatSignedDelta(row.signabilityDelta)} signability vs selected</span>
              <span>{formatSignedDelta(row.riskDelta)} risk vs selected</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
