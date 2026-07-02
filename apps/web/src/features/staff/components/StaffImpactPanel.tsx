import { Badge, StatLine } from '@mbd/ui';
import { Sparkles } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { roleLabel } from '@/shared/lib/labels';
import type { CoachingImpactView } from '../hooks/useStaffRouteData';

interface StaffImpactPanelProps {
  impact: CoachingImpactView[];
}

export function StaffImpactPanel({ impact }: StaffImpactPanelProps) {
  return (
    <DensePanel
      title="Staff Impact"
      icon={<Sparkles className="h-4 w-4 text-accent-success" />}
      bodyClassName="space-y-3"
    >
        {impact.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="font-heading text-sm text-dynasty-text">{entry.name}</div>
              <Badge variant="info">{entry.specialty}</Badge>
            </div>
            <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {roleLabel(entry.role)}
            </div>
            <StatLine
              className="mt-3"
              stats={[
                { label: 'Teach', value: `${Math.round(entry.teachingAbility * 100)}%` },
                { label: 'Dev', value: `${Math.round(entry.developmentBonus * 100)}%` },
                { label: 'Fit', value: `${Math.round(entry.personalityFit * 100)}%` },
              ]}
            />
          </div>
        ))}
    </DensePanel>
  );
}
