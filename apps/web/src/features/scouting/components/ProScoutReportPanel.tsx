import { FileText, Shield } from 'lucide-react';
import { estimateProjectedWarRange } from '@mbd/sim-core';

export interface ScoutReportView {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  teamName: string;
  isPitcher: boolean;
  grades: Record<string, number>;
  confidence: number;
  overall: number;
  ceiling: number;
  floor: number;
  notes: string;
  scoutName: string;
  date: string;
  reliability: number;
}

interface ProScoutReportPanelProps {
  report: ScoutReportView;
}

const hitterAttrs = ['Contact', 'Power', 'Eye', 'Speed', 'Defense', 'Durability'];
const pitcherAttrs = ['Stuff', 'Control', 'Stamina', 'Velocity', 'Movement'];

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

function projectedWarLabels(overall: number, floor: number | null, ceiling: number | null, isPitcher: boolean) {
  const projection = estimateProjectedWarRange({ overall, floor, ceiling, isPitcher });
  return {
    current: projection.currentWar.toFixed(1),
    floor: projection.floorWar?.toFixed(1) ?? '--',
    ceiling: projection.ceilingWar?.toFixed(1) ?? '--',
  };
}

export default function ProScoutReportPanel({ report }: ProScoutReportPanelProps) {
  const attrs = report.isPitcher ? pitcherAttrs : hitterAttrs;
  const projectedWar = projectedWarLabels(
    report.overall,
    report.floor,
    report.ceiling,
    report.isPitcher,
  );

  return (
    <div className="mt-4 space-y-4 rounded border border-dynasty-border bg-dynasty-elevated p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading text-base font-bold text-dynasty-textBright">{report.playerName}</h3>
          <p className="font-data text-xs text-dynasty-muted">
            {report.position} | Age {report.age} | {report.teamName}
          </p>
        </div>
        <div className="text-right">
          <p className="font-data text-3xl font-bold text-accent-primary">{report.overall}</p>
          <p className="font-heading text-[10px] text-dynasty-muted">Overall Grade</p>
        </div>
      </div>

      <div className="space-y-2">
        {attrs.map((attr) => (
          <ScoutGradeBar
            key={attr}
            label={attr}
            grade={report.grades[attr.toLowerCase()] ?? 50}
            confidence={report.confidence}
          />
        ))}
      </div>

      <div className="flex gap-6 border-t border-dynasty-border pt-3">
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">Ceiling</p>
          <p className="font-data text-lg font-bold text-accent-success">{report.ceiling}</p>
        </div>
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">Floor</p>
          <p className="font-data text-lg font-bold text-accent-danger">{report.floor}</p>
        </div>
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">Reliability</p>
          <div className="mt-0.5 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((index) => (
              <Shield key={index} className={`h-3 w-3 ${index <= report.reliability ? 'text-accent-info' : 'text-dynasty-border'}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-dynasty-border pt-3 sm:grid-cols-3">
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">WAR Floor</p>
          <p className="font-data text-lg font-bold text-accent-danger">{projectedWar.floor}</p>
        </div>
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">WAR Now</p>
          <p className="font-data text-lg font-bold text-dynasty-textBright">{projectedWar.current}</p>
        </div>
        <div>
          <p className="font-heading text-[10px] text-dynasty-muted">WAR Ceiling</p>
          <p className="font-data text-lg font-bold text-accent-success">{projectedWar.ceiling}</p>
        </div>
      </div>

      {report.notes && (
        <div className="border-t border-dynasty-border pt-3">
          <div className="mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3 text-dynasty-muted" />
            <p className="font-heading text-[10px] text-dynasty-muted">Scout Notes ({report.scoutName})</p>
          </div>
          <p className="font-heading text-xs italic text-dynasty-text">{report.notes}</p>
        </div>
      )}
    </div>
  );
}
