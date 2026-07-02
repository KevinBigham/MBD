import { TeamLogo } from '@/shared/components/TeamLogo';
import type { WorkerApi } from '@/workers/sim.worker';

type DraftPostDraftGradesView = Awaited<ReturnType<WorkerApi['getDraftPostDraftGrades']>>;

export function DraftPostDraftGradesPanel({ gradesView }: { gradesView: DraftPostDraftGradesView | null }) {
  if (!gradesView || gradesView.grades.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-heading text-sm uppercase tracking-[0.18em] text-dynasty-muted">Post-Draft Grades</p>
          <h2 className="mt-1 font-heading text-xl font-semibold text-dynasty-textBright">League Reaction Board</h2>
        </div>
        {gradesView.userTeamGrade ? (
          <div className="rounded border border-accent-success/30 bg-accent-success/10 px-4 py-3">
            <p className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-success">Your Class</p>
            <p className="mt-1 font-heading text-2xl font-semibold text-dynasty-textBright">
              {gradesView.userTeamGrade.grade}
            </p>
            <p className="mt-1 font-heading text-xs text-dynasty-muted">{gradesView.userTeamGrade.summary}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {gradesView.grades.slice(0, 6).map((grade, index) => (
          <div
            key={grade.teamId}
            className={`rounded border px-4 py-3 ${
              grade.teamId === gradesView.userTeamId
                ? 'border-accent-success/30 bg-accent-success/10'
                : 'border-dynasty-border bg-dynasty-elevated/70'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Rank {index + 1}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <TeamLogo teamId={grade.teamId} size="sm" />
                  <span className="font-heading text-sm font-semibold text-dynasty-textBright">{grade.teamName}</span>
                </div>
                <p className="mt-1 font-heading text-xs text-dynasty-muted">{grade.summary}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl font-semibold text-dynasty-textBright">{grade.grade}</p>
                <p className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                  Avg {grade.averageScoutingGrade}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
