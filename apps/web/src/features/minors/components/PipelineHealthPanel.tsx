import { humanizeLabel } from '@/shared/lib/labels';
import type { ProspectPipelineView } from './PipelineView';

export type PipelineHealthView = ProspectPipelineView['health'];

export default function PipelineHealthPanel({
  health,
}: {
  health: PipelineHealthView | null;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
      <div className="font-heading text-xs uppercase text-dynasty-muted">Pipeline Health</div>
      <div className="mt-3 font-data text-3xl text-dynasty-text">
        {health?.score ?? 0}
      </div>
      <div className="mt-2 font-heading text-sm text-dynasty-text">{humanizeLabel(health?.label ?? 'building')}</div>
      <div className="mt-3 text-sm text-dynasty-muted">
        {health
          ? `${health.readyNow} ready / ${health.nextWave} next / ${health.longTerm} long / ${health.organizationalDepth} depth`
          : 'Prospect depth will populate as the system develops.'}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-2">
          <div className="font-data text-lg text-dynasty-text">{health?.readyNow ?? 0}</div>
          <div className="font-heading text-[11px] uppercase text-dynasty-muted">Ready</div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-2">
          <div className="font-data text-lg text-dynasty-text">{health?.nextWave ?? 0}</div>
          <div className="font-heading text-[11px] uppercase text-dynasty-muted">Next</div>
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated px-2 py-2">
          <div className="font-data text-lg text-dynasty-text">{health?.longTerm ?? 0}</div>
          <div className="font-heading text-[11px] uppercase text-dynasty-muted">Long</div>
        </div>
      </div>
    </div>
  );
}
