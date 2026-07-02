import { LayoutGrid } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { DraftBoardCell, DraftRoomPick, DraftRoomView } from '@/workers/sim.worker.helpers';

function toneClasses(tone: DraftRoomPick['tone'] | DraftBoardCell['tone']): string {
  switch (tone) {
    case 'user':
      return 'border-accent-success/35 bg-accent-success/12 text-accent-success';
    case 'division_rival':
      return 'border-accent-warning/35 bg-accent-warning/12 text-accent-warning';
    default:
      return 'border-dynasty-border bg-dynasty-elevated text-dynasty-text';
  }
}

function compensationContextLabel(
  compensation: DraftRoomPick['compensation'] | DraftBoardCell['compensation'] | null | undefined,
): string | null {
  if (!compensation) {
    return null;
  }

  return compensation.compensationFromTeamName
    ? `QO for ${compensation.compensationForPlayerName} from ${compensation.compensationFromTeamName}`
    : `QO for ${compensation.compensationForPlayerName}`;
}

interface DraftBoardProps {
  draft: DraftRoomView;
  visibleCount: number;
}

export function DraftBoard({ draft, visibleCount }: DraftBoardProps) {
  const visiblePickNumbers = new Set(
    draft.completedPicks.slice(0, visibleCount).map((pick) => pick.pickNumber),
  );

  return (
    <DensePanel
      title="Draft Board"
      subtitle="User picks in green, division rivals in amber"
      icon={<LayoutGrid className="h-4 w-4 text-dynasty-muted" />}
      headerClassName="flex-row items-center justify-start"
      bodyClassName="overflow-x-auto p-0"
    >
      <table className="min-w-[96rem] border-separate border-spacing-0">
        <thead>
          <tr className="bg-dynasty-surface">
            <th className="sticky left-0 z-20 border-b border-r border-dynasty-border bg-dynasty-surface px-3 py-2 text-left font-heading text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              Rd
            </th>
            {draft.board.teams.map((team, index) => (
              <th
                key={`${team.teamId}-${index}`}
                className="border-b border-dynasty-border px-2 py-2 text-center font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted"
              >
                {team.abbreviation}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {draft.board.rounds.map((row) => (
            <tr key={row.round}>
              <td className="sticky left-0 z-10 border-r border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-xs text-dynasty-muted">
                {row.round}
              </td>
              {row.cells.map((cell) => {
                const visiblePick = cell.pick && visiblePickNumbers.has(cell.pick.pickNumber) ? cell.pick : null;
                return (
                  <td key={cell.slotId} className="border-b border-r border-dynasty-border/60 p-1 align-top">
                    <div className={`min-h-14 rounded border px-2 py-1 ${visiblePick ? toneClasses(cell.tone) : 'border-dynasty-border bg-dynasty-elevated/60 text-dynasty-muted'}`}>
                      {visiblePick ? (
                        <>
                          <div className="flex items-center justify-between gap-2 font-data text-[10px] uppercase tracking-[0.18em]">
                            <span>{visiblePick.pickNumber}</span>
                            {visiblePick.compensation && (
                              <span className="rounded border border-accent-warning/30 bg-accent-warning/10 px-1.5 py-0.5 text-accent-warning">
                                QO
                              </span>
                            )}
                          </div>
                          <div className="mt-1 font-heading text-xs font-semibold leading-tight">
                            {visiblePick.playerName}
                          </div>
                          <div className="mt-1 font-data text-[10px] text-dynasty-muted">
                            {visiblePick.position} · {visiblePick.scoutingGrade}
                          </div>
                          {visiblePick.compensation && (
                            <div className="mt-1 font-data text-[10px] text-accent-warning">
                              {compensationContextLabel(visiblePick.compensation)}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2 font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted/70">
                            <span>{cell.teamAbbreviation}</span>
                            {cell.compensation && (
                              <span className="rounded border border-accent-warning/30 bg-accent-warning/10 px-1.5 py-0.5 text-accent-warning">
                                QO
                              </span>
                            )}
                          </div>
                          {cell.compensation && (
                            <div className="mt-1 font-data text-[10px] text-accent-warning">
                              {compensationContextLabel(cell.compensation)}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </DensePanel>
  );
}
