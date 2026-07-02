import { useMemo, useState } from 'react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { DraftRoomProspect } from '@/workers/sim.worker.helpers';

function gradeTextClass(grade: number): string {
  if (grade >= 60) return 'text-accent-success';
  if (grade >= 50) return 'text-accent-info';
  if (grade >= 40) return 'text-accent-warning';
  return 'text-dynasty-muted';
}

function formatBonus(value: number | null | undefined): string {
  return `$${(value ?? 0).toFixed(2)}M`;
}

interface DraftProspectsPanelProps {
  prospects: DraftRoomProspect[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
}

export function DraftProspectsPanel({
  prospects,
  selectedProspectId,
  onSelect,
}: DraftProspectsPanelProps) {
  const [sortKey, setSortKey] = useState<'grade' | 'position'>('grade');

  const sortedProspects = useMemo(() => {
    const next = [...prospects];
    next.sort((left, right) => {
      if (sortKey === 'grade') {
        if (right.scoutingGrade !== left.scoutingGrade) {
          return right.scoutingGrade - left.scoutingGrade;
        }
        return left.name.localeCompare(right.name);
      }
      if (left.position !== right.position) {
        return left.position.localeCompare(right.position);
      }
      return right.scoutingGrade - left.scoutingGrade;
    });
    return next;
  }, [prospects, sortKey]);

  return (
    <DensePanel
      title="Available Prospects"
      subtitle={`Board Sorted ${sortKey === 'grade' ? 'By Grade' : 'By Position'}`}
      headerClassName="flex-row items-center justify-between"
      bodyClassName="max-h-[32rem] overflow-y-auto p-0"
      meta={
        <button
          onClick={() => setSortKey((current) => (current === 'grade' ? 'position' : 'grade'))}
          className="rounded border border-dynasty-border px-3 py-1 font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted transition-colors hover:border-accent-info hover:text-accent-info"
        >
          Sort {sortKey === 'grade' ? 'POS' : 'Grade'}
        </button>
      }
    >
      <table className="w-full">
        <thead className="sticky top-0 bg-dynasty-surface">
          <tr className="border-b border-dynasty-border text-left font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
            <th className="px-4 py-2">Board</th>
            <th className="px-2 py-2">Player</th>
            <th className="px-2 py-2">POS</th>
            <th className="px-2 py-2 text-right">Age</th>
            <th className="px-2 py-2">Looks</th>
            <th className="px-2 py-2">Origin</th>
            <th className="px-2 py-2 text-right">User</th>
            <th className="px-2 py-2 text-right">Cns</th>
            <th className="px-4 py-2 text-right">Ask</th>
          </tr>
        </thead>
        <tbody>
          {sortedProspects.map((prospect, index) => {
            const selected = selectedProspectId === prospect.id;
            return (
              <tr
                key={prospect.id}
                onClick={() => onSelect(prospect.id)}
                className={`cursor-pointer border-b border-dynasty-border/50 text-sm transition-colors ${
                  selected ? 'bg-accent-primary/12' : 'hover:bg-dynasty-elevated'
                }`}
              >
                <td className="px-4 py-2 font-data text-dynasty-muted">
                  {prospect.bigBoardRank ?? index + 1}
                </td>
                <td className="px-2 py-2 font-heading font-medium text-dynasty-textBright">{prospect.name}</td>
                <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.position}</td>
                <td className="px-2 py-2 text-right font-data text-dynasty-muted">{prospect.age}</td>
                <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.looks ?? 0}</td>
                <td className="px-2 py-2 font-data text-dynasty-muted">{prospect.origin}</td>
                <td className={`px-4 py-2 text-right font-data font-semibold ${gradeTextClass(prospect.scoutingGrade)}`}>
                  {prospect.scoutingGrade}
                </td>
                <td className={`px-2 py-2 text-right font-data ${gradeTextClass(prospect.consensusGrade ?? prospect.scoutingGrade)}`}>
                  {prospect.consensusGrade ?? prospect.scoutingGrade}
                </td>
                <td className="px-4 py-2 text-right font-data text-dynasty-muted">{formatBonus(prospect.askBonus)}</td>
              </tr>
            );
          })}
          {sortedProspects.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-10 text-center font-heading text-sm text-dynasty-muted">
                No prospects remain on the board.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </DensePanel>
  );
}
