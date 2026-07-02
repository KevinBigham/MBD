export interface CareerCrossroadsJob {
  teamId: string;
  budget: string;
  expectations: string;
  difficulty: string;
  attractiveness: number;
}

interface CareerCrossroadsPanelProps {
  jobs: CareerCrossroadsJob[];
  lastFiredReason: string | null;
  applyingTeamId: string | null;
  onApplyForJob: (teamId: string) => void;
}

export default function CareerCrossroadsPanel({
  jobs,
  lastFiredReason,
  applyingTeamId,
  onApplyForJob,
}: CareerCrossroadsPanelProps) {
  return (
    <section className="rounded-xl border border-accent-warning/40 bg-accent-warning/10 p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.18em] text-accent-warning">Career Crossroads</div>
          <h2 className="mt-2 font-brand text-3xl text-dynasty-textBright">Ownership made a change</h2>
          <p className="mt-2 max-w-3xl font-heading text-sm leading-6 text-dynasty-text">
            {lastFiredReason ?? 'Your last club moved on.'} Career mode keeps the dynasty alive, but you need a new front office to continue.
          </p>
        </div>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-4 py-3 font-heading text-sm text-dynasty-muted">
          Choose one opening to take over immediately.
        </div>
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-2">
        {jobs.map((job) => (
          <div key={job.teamId} className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-heading text-base text-dynasty-textBright">{job.teamId.toUpperCase()}</div>
                <div className="mt-1 font-heading text-xs uppercase tracking-[0.18em] text-dynasty-muted">
                  {job.budget} · {job.expectations}
                </div>
              </div>
              <div className="font-data text-lg text-accent-primary">{job.attractiveness}</div>
            </div>
            <div className="mt-3 font-heading text-sm text-dynasty-muted">{job.difficulty}</div>
            <button
              type="button"
              disabled={applyingTeamId != null}
              onClick={() => {
                onApplyForJob(job.teamId);
              }}
              className="mt-4 rounded bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
            >
              {applyingTeamId === job.teamId ? 'Applying...' : `Take Over ${job.teamId.toUpperCase()}`}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
