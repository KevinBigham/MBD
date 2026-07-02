import { Badge, Button, GradeBar, StatLine } from '@mbd/ui';
import { BriefcaseBusiness } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import { roleLabel } from '@/shared/lib/labels';
import {
  moneyLabel,
  ratingFromFraction,
  type CoachView,
} from './staffPresentation';

interface StaffCurrentStaffPanelProps {
  busyCoachId: string | null;
  canManage: boolean;
  onFire: (coachId: string) => void | Promise<void>;
  staff: readonly CoachView[];
}

export function StaffCurrentStaffPanel({
  busyCoachId,
  canManage,
  onFire,
  staff,
}: StaffCurrentStaffPanelProps) {
  return (
    <DensePanel
      title="Current Staff"
      icon={<BriefcaseBusiness className="h-4 w-4 text-accent-info" />}
      bodyClassName="grid gap-3 md:grid-cols-2"
    >
      {staff.map((coach) => (
        <div key={coach.id} className="rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-heading text-sm text-dynasty-text">
                {coach.firstName} {coach.lastName}
              </div>
              <div className="mt-1 font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
                {roleLabel(coach.role)}
              </div>
            </div>
            <Badge variant="outline">{coach.specialty}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            <GradeBar label="Teach" grade={ratingFromFraction(coach.teachingAbility)} />
            <GradeBar label="Impact" grade={ratingFromFraction(0.5 + coach.developmentBonus)} />
            <GradeBar label="Fit" grade={ratingFromFraction(coach.personalityFit)} />
          </div>
          <StatLine
            className="mt-3"
            stats={[
              { label: 'Salary', value: moneyLabel(coach.annualSalary) },
              { label: 'Bonus', value: `${Math.round(coach.developmentBonus * 100)}%` },
            ]}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-mobile-critical-control="staff-fire-coach"
            className="mobile-critical-control focus-ring mt-3 w-full"
            disabled={!canManage}
            loading={busyCoachId === coach.id}
            onClick={() => void onFire(coach.id)}
          >
            Fire
          </Button>
        </div>
      ))}
    </DensePanel>
  );
}
