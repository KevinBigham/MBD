import { Badge, Card, CardContent, CardHeader, CardTitle } from '@mbd/ui';
import type { DevelopmentReportsView } from './playerProfileShared';
import { labelize } from './playerProfileShared';

type DevelopmentDecision = NonNullable<DevelopmentReportsView['developmentDecision']>;

function riskBadgeVariant(level: DevelopmentDecision['risk']['level']): 'success' | 'info' | 'warning' {
  if (level === 'high') {
    return 'warning';
  }

  if (level === 'medium') {
    return 'info';
  }

  return 'success';
}

function mentorshipCardLabel(role: DevelopmentDecision['mentorship']['relationshipRole']): string {
  if (role === 'mentor') {
    return 'Protege';
  }

  if (role === 'protegee') {
    return 'Mentor';
  }

  return 'Mentorship';
}

function mentorshipCardName(mentorship: DevelopmentDecision['mentorship']): string {
  if (mentorship.relationshipRole === 'mentor') {
    return mentorship.partnerName ?? 'No protege';
  }

  if (mentorship.relationshipRole === 'protegee') {
    return mentorship.mentorName ?? mentorship.partnerName ?? 'No mentor';
  }

  return mentorship.partnerName ?? mentorship.mentorName ?? 'No pairing';
}

export default function DevelopmentDecisionPanel({
  decision,
}: {
  decision: DevelopmentDecision;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-dynasty-text">Development Decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Plan</div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{decision.plan.label}</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{decision.plan.summary}</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Risk</div>
            <div className="mt-1">
              <Badge variant={riskBadgeVariant(decision.risk.level)}>
                {labelize(decision.risk.level)} Risk
              </Badge>
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{decision.risk.summary}</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Coach Fit</div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{decision.coachFit.coachName ?? 'Unassigned'}</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{decision.coachFit.summary}</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">
              {mentorshipCardLabel(decision.mentorship.relationshipRole)}
            </div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">
              {mentorshipCardName(decision.mentorship)}
            </div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{decision.mentorship.summary}</div>
          </div>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-elevated p-3">
            <div className="font-data text-[11px] uppercase tracking-[0.18em] text-dynasty-muted">Next Milestone</div>
            <div className="mt-1 font-heading text-sm text-dynasty-text">{decision.nextMilestone.label}</div>
            <div className="mt-2 font-heading text-xs text-dynasty-muted">{decision.nextMilestone.summary}</div>
          </div>
        </div>
        {decision.evidence.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {decision.evidence.map((item) => (
              <div key={item} className="rounded-lg border border-dynasty-border bg-dynasty-card px-3 py-2 font-heading text-xs text-dynasty-muted">
                {item}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
