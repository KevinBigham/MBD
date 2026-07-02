import { humanizeLabel, minorLevelLabel } from '@/shared/lib/labels';
import type { ProspectPipelineView } from './PipelineView';

export type PipelineProspect = ProspectPipelineView['prospects'][number];

export default function PipelineTriageColumn({
  title,
  empty,
  prospects,
}: {
  title: string;
  empty: string;
  prospects: PipelineProspect[];
}): JSX.Element {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
      <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">{title}</div>
      <div className="mt-3 space-y-2">
        {prospects.length > 0 ? prospects.slice(0, 4).map((prospect) => (
          <div key={`${title}-${prospect.playerId}`} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
            <div className="font-heading text-sm text-dynasty-textBright">{prospect.playerName}</div>
            <div className="mt-1 font-heading text-xs text-dynasty-muted">
              {prospect.position} · {minorLevelLabel(prospect.level)} · Age {prospect.age} · {humanizeLabel(prospect.prospectTier)}
            </div>
          </div>
        )) : (
          <div className="font-heading text-sm text-dynasty-muted">{empty}</div>
        )}
      </div>
    </div>
  );
}
