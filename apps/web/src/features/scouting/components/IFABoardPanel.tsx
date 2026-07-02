import { ClipboardList, Target } from 'lucide-react';
import { getTeamById } from '@mbd/sim-core';
import type { IFAPoolView, IFAProspectView } from '@/workers/sim.worker.helpers';

interface IFABoardPanelProps {
  ifaLoading: boolean;
  ifaPool: IFAPoolView | null;
  onScoutProspect: (prospect: IFAProspectView) => void | Promise<void>;
}

function formatIFAMoney(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function regionLabel(region: string): string {
  return region
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function teamDisplay(teamId: string | null): string {
  if (!teamId) return 'Unsigned';
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

export default function IFABoardPanel({
  ifaLoading,
  ifaPool,
  onScoutProspect,
}: IFABoardPanelProps): JSX.Element {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-accent-warning" />
        <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">IFA Board</h2>
      </div>
      {ifaLoading && (
        <div className="mb-3 flex items-center gap-2 py-3">
          <Target className="h-5 w-5 animate-spin text-accent-primary" />
          <span className="font-heading text-xs text-dynasty-muted">Updating international reports...</span>
        </div>
      )}
      {ifaPool && ifaPool.prospects.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-dynasty-border text-dynasty-muted">
                <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Prospect</th>
                <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Region</th>
                <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Exp. Bonus</th>
                <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Looks</th>
                <th className="py-2 pr-4 text-right font-heading text-[10px] font-semibold uppercase">Your OVR</th>
                <th className="py-2 pr-4 font-heading text-[10px] font-semibold uppercase">Status</th>
                <th className="py-2 text-right font-heading text-[10px] font-semibold uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {ifaPool.prospects.map((prospect) => (
                <tr key={prospect.id} className="border-b border-dynasty-border/50 hover:bg-dynasty-elevated/50">
                  <td className="py-2 pr-4">
                    <div className="font-heading text-sm text-dynasty-text">{prospect.playerName}</div>
                    <div className="font-data text-xs text-dynasty-muted">{prospect.position} / Age {prospect.age}</div>
                    {prospect.scoutConflict ? (
                      <div className="mt-1 font-data text-[10px] uppercase tracking-[0.16em] text-accent-warning">
                        Divergence {prospect.scoutConflict.divergence}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 font-data text-xs text-dynasty-muted">
                    {regionLabel(prospect.region)} / {prospect.country}
                  </td>
                  <td className="py-2 pr-4 text-right font-data text-sm text-dynasty-textBright">{formatIFAMoney(prospect.expectedBonus)}</td>
                  <td className="py-2 pr-4 text-right font-data text-xs text-dynasty-muted">{prospect.looks}</td>
                  <td className="py-2 pr-4 text-right font-data text-sm text-dynasty-textBright">
                    {prospect.overall ?? '--'}
                    {prospect.confidence ? <span className="ml-1 text-[10px] text-dynasty-muted">&plusmn;{prospect.confidence}</span> : null}
                  </td>
                  <td className="py-2 pr-4 font-heading text-xs">
                    {prospect.status === 'available' ? (
                      <span className="text-accent-success">Available</span>
                    ) : (
                      <span className="text-dynasty-muted">
                        {teamDisplay(prospect.signedTeamId)} {prospect.signedBonus ? `(${formatIFAMoney(prospect.signedBonus)})` : ''}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      data-mobile-critical-control="scouting-ifa-scout"
                      disabled={prospect.status !== 'available'}
                      onClick={() => { void onScoutProspect(prospect); }}
                      className="focus-ring mobile-critical-control rounded bg-dynasty-elevated px-3 py-1.5 font-heading text-[11px] font-semibold text-dynasty-text hover:border-accent-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Scout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
          No international prospects are loaded for this season yet.
        </p>
      )}
    </section>
  );
}
