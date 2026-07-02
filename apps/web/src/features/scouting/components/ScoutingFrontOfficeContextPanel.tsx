import { Briefcase } from 'lucide-react';
import type { TeamChemistry } from '@mbd/contracts';
import { DensePanel } from '@/shared/components/DensePanel';

export interface ScoutingOwnerStateView {
  hotSeat: boolean;
  patience: number;
  confidence: number;
  summary: string;
}

interface ScoutingFrontOfficeContextPanelProps {
  chemistry: TeamChemistry | null;
  ownerState: ScoutingOwnerStateView | null;
}

function chemistryTone(tier: string | undefined): string {
  switch (tier) {
    case 'electric': return 'text-accent-success';
    case 'connected': return 'text-accent-info';
    case 'steady': return 'text-dynasty-text';
    case 'tense': return 'text-accent-warning';
    case 'fractured': return 'text-accent-danger';
    default: return 'text-dynasty-muted';
  }
}

export function ScoutingFrontOfficeContextPanel({
  chemistry,
  ownerState,
}: ScoutingFrontOfficeContextPanelProps) {
  return (
    <DensePanel
      title="Front Office Context"
      icon={<Briefcase className="h-4 w-4 text-accent-info" />}
      titleClassName="text-dynasty-textBright"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="font-heading text-[10px] uppercase text-dynasty-muted">Owner outlook</div>
          <div className={`mt-1 font-data text-2xl font-bold ${ownerState?.hotSeat ? 'text-accent-danger' : 'text-dynasty-textBright'}`}>
            {ownerState?.hotSeat ? 'HOT SEAT' : 'STABLE'}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {ownerState?.summary ?? 'Owner narrative not available yet.'}
          </div>
          {ownerState && (
            <div className="mt-3 flex gap-4 font-data text-xs text-dynasty-muted">
              <span>Patience {ownerState.patience}</span>
              <span>Confidence {ownerState.confidence}</span>
            </div>
          )}
        </div>
        <div className="rounded border border-dynasty-border bg-dynasty-elevated p-4">
          <div className="font-heading text-[10px] uppercase text-dynasty-muted">Clubhouse read</div>
          <div className={`mt-1 font-data text-2xl font-bold ${chemistryTone(chemistry?.tier)}`}>
            {chemistry?.score ?? '--'}
          </div>
          <div className="mt-2 font-heading text-sm text-dynasty-text">
            {chemistry?.summary ?? 'Chemistry data not available yet.'}
          </div>
          {chemistry && (
            <div className="mt-3 font-data text-xs uppercase text-dynasty-muted">
              {chemistry.tier} clubhouse
            </div>
          )}
        </div>
      </div>
    </DensePanel>
  );
}
