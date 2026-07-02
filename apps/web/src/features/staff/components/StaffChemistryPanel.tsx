import { Badge } from '@mbd/ui';
import { AlertTriangle, Handshake, Link2, Unlink2 } from 'lucide-react';
import { DensePanel } from '@/shared/components/DensePanel';
import type { ChemistryView } from '../hooks/useStaffRouteData';
import CoachingRadarChart from './CoachingRadarChart';

interface StaffChemistryPanelProps {
  chemistry: ChemistryView | null;
}

export function StaffChemistryPanel({ chemistry }: StaffChemistryPanelProps) {
  if (!chemistry) {
    return null;
  }

  return (
    <DensePanel
      title="Staff Chemistry"
      icon={<Handshake className="h-4 w-4 text-accent-primary" />}
      bodyClassName="space-y-5"
    >
        <div className="flex items-center gap-4">
          <span
            className={`font-data text-4xl font-bold ${
              chemistry.harmony.overallScore >= 70
                ? 'text-accent-success'
                : chemistry.harmony.overallScore >= 40
                  ? 'text-accent-warning'
                  : 'text-accent-danger'
            }`}
          >
            {chemistry.harmony.overallScore}
          </span>
          <span className="font-heading text-sm text-dynasty-muted">
            Harmony Score
          </span>
        </div>

        <CoachingRadarChart
          coaches={chemistry.coaches.map((c) => ({
            name: c.name,
            teaching: c.teaching,
            impact: c.impact,
            fit: c.fit,
            role: c.role,
          }))}
        />

        {chemistry.issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-heading text-sm text-dynasty-text">Issues</h4>
            {chemistry.issues.map((issue, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-lg border border-dynasty-border bg-dynasty-elevated/60 p-3"
              >
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    issue.severity === 'high'
                      ? 'text-accent-danger'
                      : issue.severity === 'medium'
                        ? 'text-accent-warning'
                        : 'text-dynasty-muted'
                  }`}
                />
                <div className="flex-1">
                  <Badge
                    variant={
                      issue.severity === 'high'
                        ? 'danger'
                        : issue.severity === 'medium'
                          ? 'warning'
                          : 'outline'
                    }
                    className="mb-1"
                  >
                    {issue.severity}
                  </Badge>
                  <p className="font-data text-sm text-dynasty-text">
                    {issue.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {chemistry.harmony.strongestBond && (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent-success" />
                <span className="font-heading text-sm text-dynasty-text">Strongest Bond</span>
              </div>
              <span className="font-data text-2xl font-bold text-accent-success">
                {chemistry.harmony.strongestBond.synergyScore}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {chemistry.harmony.strongestBond.factors.map((factor) => (
                  <Badge key={factor} variant="outline" className="text-[10px]">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {chemistry.harmony.weakestLink && (
            <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-4">
              <div className="mb-2 flex items-center gap-2">
                <Unlink2 className="h-4 w-4 text-accent-danger" />
                <span className="font-heading text-sm text-dynasty-text">Weakest Link</span>
              </div>
              <span className="font-data text-2xl font-bold text-accent-danger">
                {chemistry.harmony.weakestLink.synergyScore}
              </span>
              <div className="mt-2 flex flex-wrap gap-1">
                {chemistry.harmony.weakestLink.factors.map((factor) => (
                  <Badge key={factor} variant="outline" className="text-[10px]">
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
    </DensePanel>
  );
}
