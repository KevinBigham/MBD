import { Badge } from '@mbd/ui';
import { Sparkles } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { humanizeLabel, roleLabel } from '@/shared/lib/labels';
import type { CoachView, PlayerAffinityView } from './staffPresentation';

interface StaffOnboardingImpactPanelProps {
  staff: readonly CoachView[];
  topAffinities: readonly PlayerAffinityView[];
}

export function StaffOnboardingImpactPanel({
  staff,
  topAffinities,
}: StaffOnboardingImpactPanelProps) {
  return (
    <DensePanel
      title="Onboarding Staff Impact"
      icon={<Sparkles className="h-4 w-4 text-accent-success" />}
    >
        <div className="grid gap-3 lg:grid-cols-3">
          {staff.slice(0, 3).map((coach) => (
            <div key={`impact-${coach.id}`} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-heading text-sm text-dynasty-textBright">{coach.firstName} {coach.lastName}</div>
                  <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                    {roleLabel(coach.role)}
                  </div>
                </div>
                <Badge variant={coach.personalityFit >= 0.68 ? 'success' : coach.personalityFit >= 0.5 ? 'warning' : 'outline'}>
                  {Math.round(coach.personalityFit * 100)}% fit
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm">
                <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                  <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Boost</div>
                  <div className="mt-1 text-dynasty-text">{Math.round(coach.developmentBonus * 100)}% development lift in {humanizeLabel(coach.specialty)}</div>
                </div>
                <div className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                  <div className="font-heading text-[10px] uppercase tracking-wide text-dynasty-muted">Risk</div>
                  <div className="mt-1 text-dynasty-muted">
                    {coach.personalityFit >= 0.5 ? 'No major culture drag flagged.' : 'Monitor fit with the room before changing development plans.'}
                  </div>
                </div>
                <div className="rounded border border-accent-info/30 bg-accent-info/5 px-3 py-2">
                  <div className="font-heading text-[10px] uppercase tracking-wide text-accent-info">Affected system</div>
                  <div className="mt-1 text-dynasty-text">
                    {roleLabel(coach.role)} decisions, player growth, and clubhouse chemistry.
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {topAffinities.length > 0 ? (
          <div className="mt-4 rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
            <div className="font-heading text-xs uppercase tracking-wide text-dynasty-muted">Player fit readout</div>
            <div className="mt-3 grid gap-2 lg:grid-cols-3">
              {topAffinities.map((entry) => (
                <div key={entry.playerId} className="rounded border border-dynasty-border bg-dynasty-surface px-3 py-2">
                  <div className="font-heading text-sm text-dynasty-textBright">{entry.playerName}</div>
                  <div className="mt-1 font-heading text-xs text-dynasty-muted">
                    {entry.position} · best with {entry.bestCoach?.coachName ?? 'staff'} · {entry.bestCoach?.affinityScore ?? 0} affinity
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
    </DensePanel>
  );
}
