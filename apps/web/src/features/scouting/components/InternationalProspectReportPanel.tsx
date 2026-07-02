import { Handshake, Shield } from 'lucide-react';
import { estimateProjectedWarRange } from '@mbd/sim-core';
import { sourceLabel } from '@/shared/lib/labels';
import type { IFAPoolView, IFAReportView } from '@/workers/sim.worker.helpers';

interface InternationalProspectReportPanelProps {
  ifaBonus: string;
  ifaPool: IFAPoolView;
  ifaReport: IFAReportView | null;
  onChangeIFABonus: (bonus: string) => void;
  onSignProspect: () => void | Promise<void>;
}

const hitterAttrs = ['Contact', 'Power', 'Eye', 'Speed', 'Defense', 'Durability'];
const pitcherAttrs = ['Stuff', 'Control', 'Stamina', 'Velocity', 'Movement'];

function formatScoutingMoney(value: number): string {
  return `$${value.toFixed(2)}M`;
}

function regionLabel(region: string): string {
  return region
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function projectedWarLabels(overall: number, floor: number | null, ceiling: number | null, isPitcher: boolean) {
  const projection = estimateProjectedWarRange({ overall, floor, ceiling, isPitcher });
  return {
    current: projection.currentWar.toFixed(1),
    floor: projection.floorWar?.toFixed(1) ?? '--',
    ceiling: projection.ceilingWar?.toFixed(1) ?? '--',
  };
}

function ScoutGradeBar({ label, grade, confidence }: { label: string; grade: number; confidence: number }) {
  const pct = ((grade - 20) / 60) * 100;
  const color = grade >= 60 ? 'bg-accent-success' : grade >= 50 ? 'bg-accent-info' : grade >= 40 ? 'bg-accent-warning' : 'bg-accent-danger';
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-right font-heading text-xs text-dynasty-muted">{label}</span>
      <div className="relative h-4 flex-1 rounded bg-dynasty-elevated">
        <div className={`h-full rounded ${color}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <span className="w-8 text-right font-data text-sm text-dynasty-text">{grade}</span>
      <span className="w-14 text-right font-data text-xs text-dynasty-muted">[&plusmn;{confidence}]</span>
    </div>
  );
}

export default function InternationalProspectReportPanel({
  ifaBonus,
  ifaPool,
  ifaReport,
  onChangeIFABonus,
  onSignProspect,
}: InternationalProspectReportPanelProps): JSX.Element {
  const ifaAttrs = ifaReport && ['SP', 'RP', 'CL'].includes(ifaReport.position) ? pitcherAttrs : hitterAttrs;

  return (
    <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="mb-3 flex items-center gap-2">
        <Handshake className="h-4 w-4 text-accent-warning" />
        <h3 className="font-heading text-sm font-semibold text-dynasty-textBright">Selected Prospect</h3>
      </div>
      {ifaReport ? (
        <div className="space-y-3">
          <div>
            <div className="font-heading text-base font-semibold text-dynasty-textBright">{ifaReport.playerName}</div>
            <div className="font-data text-xs text-dynasty-muted">
              {ifaReport.position} | Age {ifaReport.age} | {regionLabel(ifaReport.region)} / {ifaReport.country}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-heading text-[10px] uppercase text-dynasty-muted">Your Grade</div>
              <div className="font-data text-3xl font-bold text-accent-primary">{ifaReport.overall}</div>
            </div>
            <div className="text-right font-data text-xs text-dynasty-muted">
              <div>{ifaReport.looks} look{ifaReport.looks === 1 ? '' : 's'}</div>
              <div>Target {formatScoutingMoney(ifaReport.expectedBonus)}</div>
            </div>
          </div>
          <div className="space-y-2">
            {ifaAttrs.map((attr) => (
              <ScoutGradeBar
                key={attr}
                label={attr}
                grade={ifaReport.grades[attr.toLowerCase()] ?? 50}
                confidence={ifaReport.confidence}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <div className="font-heading text-[10px] uppercase text-dynasty-muted">Ceiling</div>
              <div className="font-data text-lg font-bold text-accent-success">{ifaReport.ceiling}</div>
            </div>
            <div>
              <div className="font-heading text-[10px] uppercase text-dynasty-muted">Floor</div>
              <div className="font-data text-lg font-bold text-accent-danger">{ifaReport.floor}</div>
            </div>
            <div>
              <div className="font-heading text-[10px] uppercase text-dynasty-muted">Reliability</div>
              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((index) => (
                  <Shield key={index} className={`h-3 w-3 ${index <= ifaReport.reliability ? 'text-accent-info' : 'text-dynasty-border'}`} />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-3 border-t border-dynasty-border pt-3 sm:grid-cols-3">
            {(() => {
              const projectedWar = projectedWarLabels(
                ifaReport.overall,
                ifaReport.floor,
                ifaReport.ceiling,
                ifaReport.position === 'SP' || ifaReport.position === 'RP' || ifaReport.position === 'CL',
              );
              return (
                <>
                  <div>
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">WAR Floor</div>
                    <div className="font-data text-lg font-bold text-accent-danger">{projectedWar.floor}</div>
                  </div>
                  <div>
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">WAR Now</div>
                    <div className="font-data text-lg font-bold text-dynasty-textBright">{projectedWar.current}</div>
                  </div>
                  <div>
                    <div className="font-heading text-[10px] uppercase text-dynasty-muted">WAR Ceiling</div>
                    <div className="font-data text-lg font-bold text-accent-success">{projectedWar.ceiling}</div>
                  </div>
                </>
              );
            })()}
          </div>
          <div className="border-t border-dynasty-border pt-3">
            <div className="font-heading text-[10px] uppercase text-dynasty-muted">Notes</div>
            <p className="mt-1 font-heading text-xs italic text-dynasty-text">{ifaReport.notes}</p>
          </div>
          {ifaReport.scoutConflict ? (
            <div className="border-t border-dynasty-border pt-3">
              <div className="font-heading text-[10px] uppercase text-dynasty-muted">
                Scout Debate &middot; Divergence {ifaReport.scoutConflict.divergence}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                {ifaReport.scoutConflict.opinions.map((opinion) => (
                  <div key={`${ifaReport.playerId}-${opinion.source}`} className="rounded border border-dynasty-border bg-dynasty-surface p-3">
                    <div className="font-heading text-[10px] uppercase tracking-[0.16em] text-dynasty-muted">
                      {sourceLabel(opinion.source)}
                    </div>
                    <div className="mt-2 font-data text-xl text-dynasty-textBright">{opinion.overallGrade}</div>
                    <div className="mt-1 font-data text-[10px] text-dynasty-muted">
                      Floor {opinion.floor} &middot; Ceiling {opinion.ceiling} &middot; Confidence {opinion.confidence}
                    </div>
                    <div className="mt-2 font-heading text-xs text-dynasty-muted">{opinion.summary}</div>
                  </div>
                ))}
              </div>
              {ifaReport.scoutConflict.outcomeSummary ? (
                <div className="mt-3 font-heading text-xs text-dynasty-muted">
                  {ifaReport.scoutConflict.outcomeSummary}
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="border-t border-dynasty-border pt-3">
            <div className="mb-2 font-heading text-[10px] uppercase text-dynasty-muted">Bonus Offer</div>
            <div className="flex gap-2">
              <input
                type="number"
                data-mobile-critical-control="scouting-ifa-bonus-offer"
                min="0.05"
                step="0.05"
                value={ifaBonus}
                onChange={(event) => onChangeIFABonus(event.target.value)}
                className="mobile-critical-control flex-1 rounded border border-dynasty-border bg-dynasty-surface px-3 py-2 font-data text-sm text-dynasty-text outline-none focus:border-accent-primary"
              />
              <button
                type="button"
                data-mobile-critical-control="scouting-ifa-sign"
                disabled={!ifaPool.signingWindowOpen}
                onClick={() => { void onSignProspect(); }}
                className="focus-ring mobile-critical-control rounded bg-accent-warning px-4 py-2 font-heading text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sign
              </button>
            </div>
            {!ifaPool.signingWindowOpen && (
              <p className="mt-2 font-heading text-xs text-dynasty-muted">
                Signing opens during the dedicated international phase of the offseason.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="font-heading text-xs text-dynasty-muted">
          Scout a prospect from the table to reveal your report and set a bonus offer.
        </p>
      )}
    </div>
  );
}
