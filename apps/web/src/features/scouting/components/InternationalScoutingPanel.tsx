import {
  Coins,
  Globe2,
} from 'lucide-react';
import type { IFAPoolView, IFAProspectView, IFAReportView } from '@/workers/sim.worker.helpers';
import IFABoardPanel from './IFABoardPanel';
import InternationalProspectReportPanel from './InternationalProspectReportPanel';

export interface ScoutingTradeTarget {
  id: string;
  city: string;
  name: string;
}

interface InternationalScoutingPanelProps {
  actionMessage: string | null;
  ifaBonus: string;
  ifaLoading: boolean;
  ifaPool: IFAPoolView | null;
  ifaReport: IFAReportView | null;
  onChangeIFABonus: (bonus: string) => void;
  onChangeTradeAmount: (amount: string) => void;
  onChangeTradeTarget: (teamId: string) => void;
  onScoutProspect: (prospect: IFAProspectView) => void | Promise<void>;
  onSignProspect: () => void | Promise<void>;
  onTradePoolSpace: () => void | Promise<void>;
  tradeAmount: string;
  tradeTarget: string;
  tradeTargets: ScoutingTradeTarget[];
}

export function formatScoutingMoney(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function regionLabel(region: string): string {
  return region
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function InternationalScoutingPanel({
  actionMessage,
  ifaBonus,
  ifaLoading,
  ifaPool,
  ifaReport,
  onChangeIFABonus,
  onChangeTradeAmount,
  onChangeTradeTarget,
  onScoutProspect,
  onSignProspect,
  onTradePoolSpace,
  tradeAmount,
  tradeTarget,
  tradeTargets,
}: InternationalScoutingPanelProps): JSX.Element {
  return (
    <>
      <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-accent-warning" />
          <h2 className="font-heading text-sm font-semibold text-dynasty-textBright">International Bonus Pool</h2>
        </div>
        {ifaPool ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-4">
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-[10px] uppercase text-dynasty-muted">Window</div>
                <div className={`mt-1 font-data text-2xl font-bold ${ifaPool.signingWindowOpen ? 'text-accent-success' : 'text-accent-warning'}`}>
                  {ifaPool.signingWindowOpen ? 'OPEN' : 'CLOSED'}
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-text">
                  {ifaPool.currentPhase ? regionLabel(ifaPool.currentPhase) : 'Pre-offseason'}
                </div>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-[10px] uppercase text-dynasty-muted">Remaining Pool</div>
                <div className="mt-1 font-data text-2xl font-bold text-accent-primary">{formatScoutingMoney(ifaPool.budget.remaining)}</div>
                <div className="mt-2 font-heading text-xs text-dynasty-text">
                  Committed {formatScoutingMoney(ifaPool.budget.committed)}
                </div>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-[10px] uppercase text-dynasty-muted">Trade Delta</div>
                <div className="mt-1 font-data text-2xl font-bold text-dynasty-textBright">
                  {formatScoutingMoney(ifaPool.budget.tradedIn - ifaPool.budget.tradedOut)}
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-text">
                  In {formatScoutingMoney(ifaPool.budget.tradedIn)} / Out {formatScoutingMoney(ifaPool.budget.tradedOut)}
                </div>
              </div>
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="font-heading text-[10px] uppercase text-dynasty-muted">Dept. Accuracy</div>
                <div className="mt-1 font-data text-2xl font-bold text-accent-info">
                  {(ifaPool.staffAccuracy * 100).toFixed(0)}%
                </div>
                <div className="mt-2 font-heading text-xs text-dynasty-text">
                  Better looks reduce report noise.
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Coins className="h-4 w-4 text-accent-info" />
                  <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Pool Space Transfer</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr,120px,auto]">
                  <select
                    data-mobile-critical-control="scouting-ifa-trade-target"
                    value={tradeTarget}
                    onChange={(event) => onChangeTradeTarget(event.target.value)}
                    className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-heading text-sm text-dynasty-text outline-none focus:border-accent-primary"
                  >
                    {tradeTargets.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.city} {team.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    data-mobile-critical-control="scouting-ifa-trade-amount"
                    min="0.05"
                    step="0.05"
                    value={tradeAmount}
                    onChange={(event) => onChangeTradeAmount(event.target.value)}
                    className="mobile-critical-control rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text outline-none focus:border-accent-primary"
                  />
                  <button
                    type="button"
                    data-mobile-critical-control="scouting-ifa-transfer"
                    onClick={() => { void onTradePoolSpace(); }}
                    className="focus-ring mobile-critical-control rounded bg-accent-primary px-4 py-2 font-heading text-xs font-semibold text-black hover:opacity-90"
                  >
                    Transfer
                  </button>
                </div>
                <p className="mt-2 font-heading text-xs text-dynasty-muted">
                  Direct pool-space moves are enabled here ahead of the broader trade-asset UI.
                </p>
              </div>

              <InternationalProspectReportPanel
                ifaBonus={ifaBonus}
                ifaPool={ifaPool}
                ifaReport={ifaReport}
                onChangeIFABonus={onChangeIFABonus}
                onSignProspect={onSignProspect}
              />
            </div>

            {actionMessage && (
              <div className="rounded border border-dynasty-border bg-dynasty-elevated px-3 py-2 font-heading text-xs text-dynasty-text">
                {actionMessage}
              </div>
            )}
          </div>
        ) : (
          <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
            International scouting data is not available yet.
          </p>
        )}
      </section>

      <IFABoardPanel
        ifaLoading={ifaLoading}
        ifaPool={ifaPool}
        onScoutProspect={onScoutProspect}
      />
    </>
  );
}
