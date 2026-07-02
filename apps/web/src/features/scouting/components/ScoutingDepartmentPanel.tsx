import { Users } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';

export interface ScoutView {
  id: string;
  name: string;
  quality: number;
  specialty: string;
  bias: string;
}

function QualityBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-accent-success' : value >= 50 ? 'bg-accent-info' : value >= 30 ? 'bg-accent-warning' : 'bg-accent-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded bg-dynasty-elevated">
        <div className={`h-full rounded ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-data text-xs text-dynasty-muted">{value}</span>
    </div>
  );
}

interface ScoutingDepartmentPanelProps {
  scouts: ScoutView[];
}

export function ScoutingDepartmentPanel({ scouts }: ScoutingDepartmentPanelProps) {
  return (
    <DensePanel
      title="Your Scouting Department"
      icon={<Users className="h-4 w-4 text-accent-primary" />}
      titleClassName="text-dynasty-textBright"
    >
      {scouts.length === 0 ? (
        <p className="py-4 text-center font-heading text-xs text-dynasty-muted">
          Scouting staff data unavailable. Start a game to populate your department.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scouts.map((scout) => (
            <div key={scout.id} className="rounded border border-dynasty-border bg-dynasty-elevated p-3">
              <p className="font-heading text-sm font-semibold text-dynasty-text">{scout.name}</p>
              <QualityBar value={scout.quality} />
              <div className="mt-1 flex gap-3 font-data text-[10px] text-dynasty-muted">
                <span>{scout.specialty}</span>
                <span className="text-accent-warning">{scout.bias}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </DensePanel>
  );
}
