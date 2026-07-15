import { FileText, Gavel, Scale } from 'lucide-react';

export type ArbitrationCaseStage = 'filing' | 'exchange' | 'hearing' | 'resolved';

export interface OffseasonArbitrationCaseView {
  playerId: string;
  playerName: string;
  teamId: string;
  serviceClass: string;
  previousSalary: number;
  teamOffer: number;
  playerAsk: number;
  projectedSalary: number;
  awardedSalary: number | null;
  winner: 'club' | 'player' | null;
  stage: ArbitrationCaseStage;
}

function money(value: number): string {
  return `$${value.toFixed(1)}M`;
}

const stageCopy: Record<ArbitrationCaseStage, { label: string; detail: string }> = {
  filing: {
    label: 'Filed',
    detail: 'The case is open. Club and player figures have not been exchanged publicly yet.',
  },
  exchange: {
    label: 'Figures exchanged',
    detail: 'Both one-year filings are on the record. The panel will choose one figure.',
  },
  hearing: {
    label: 'Hearing',
    detail: 'The record is closed and the panel is deliberating.',
  },
  resolved: {
    label: 'Award issued',
    detail: 'The one-year award is final and saved to the contract ledger.',
  },
};

export function OffseasonArbitrationPanel({ cases }: { cases: OffseasonArbitrationCaseView[] }) {
  if (cases.length === 0) return null;

  return (
    <section
      aria-labelledby="arbitration-docket-title"
      className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="rounded bg-accent-primary/10 p-2 text-accent-primary" aria-hidden="true">
          <Scale className="h-5 w-5" />
        </div>
        <div>
          <h2 id="arbitration-docket-title" className="font-heading text-lg font-semibold text-dynasty-textBright">
            Arbitration docket
          </h2>
          <p className="mt-1 font-heading text-sm text-dynasty-muted">
            Automatic, one-year hearings use the same service-time and salary rules for every club.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {cases.map((entry) => {
          const copy = stageCopy[entry.stage];
          const figuresVisible = entry.stage !== 'filing';
          return (
            <article
              key={entry.playerId}
              className="rounded-md border border-dynasty-border bg-dynasty-elevated p-4"
              aria-label={`${entry.playerName} arbitration case: ${copy.label}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-heading font-semibold text-dynasty-textBright">{entry.playerName}</h3>
                  <p className="font-data text-xs text-dynasty-muted">
                    {entry.serviceClass} · Prior salary {money(entry.previousSalary)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-accent-primary/40 px-2.5 py-1 font-heading text-xs font-semibold text-dynasty-text">
                  {entry.stage === 'resolved' ? <Gavel className="h-3.5 w-3.5" aria-hidden="true" /> : <FileText className="h-3.5 w-3.5" aria-hidden="true" />}
                  {copy.label}
                </span>
              </div>

              <p className="mt-2 font-heading text-sm text-dynasty-muted">{copy.detail}</p>

              {figuresVisible ? (
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div>
                    <dt className="font-heading text-xs text-dynasty-muted">Club filing</dt>
                    <dd className="font-data font-semibold text-dynasty-text">{money(entry.teamOffer)}</dd>
                  </div>
                  <div>
                    <dt className="font-heading text-xs text-dynasty-muted">Player filing</dt>
                    <dd className="font-data font-semibold text-dynasty-text">{money(entry.playerAsk)}</dd>
                  </div>
                  <div>
                    <dt className="font-heading text-xs text-dynasty-muted">Model projection</dt>
                    <dd className="font-data font-semibold text-dynasty-text">{money(entry.projectedSalary)}</dd>
                  </div>
                  <div>
                    <dt className="font-heading text-xs text-dynasty-muted">Award</dt>
                    <dd className="font-data font-semibold text-dynasty-textBright">
                      {entry.awardedSalary == null ? 'Pending' : money(entry.awardedSalary)}
                    </dd>
                  </div>
                </dl>
              ) : null}

              {entry.winner ? (
                <p className="mt-3 font-heading text-sm font-semibold text-dynasty-textBright">
                  Hearing result: {entry.winner === 'club' ? 'club filing selected' : 'player filing selected'}.
                </p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
