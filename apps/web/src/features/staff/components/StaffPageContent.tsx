import { useMemo } from 'react';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@mbd/ui';
import type { ChemistryView, CoachingImpactView } from '../hooks/useStaffRouteData';
import { StaffBudgetPanel } from './StaffBudgetPanel';
import { StaffChemistryPanel } from './StaffChemistryPanel';
import { StaffCurrentStaffPanel } from './StaffCurrentStaffPanel';
import { StaffImpactPanel } from './StaffImpactPanel';
import { StaffMarketPanel } from './StaffMarketPanel';
import { StaffMentorshipPanel, type MentorshipView } from './StaffMentorshipPanel';
import { StaffOnboardingImpactPanel } from './StaffOnboardingImpactPanel';
import type { CoachView, PlayerAffinityView, StaffBudgetView } from './staffPresentation';

export type StaffPageTab = 'overview' | 'market';

export interface StaffPageContentProps {
  readonly activeTab: StaffPageTab;
  readonly budget: StaffBudgetView | null;
  readonly busyCoachId: string | null;
  readonly canManage: boolean;
  readonly chemistry: ChemistryView | null;
  readonly impact: CoachingImpactView[];
  readonly market: readonly CoachView[];
  readonly mentorship: MentorshipView | null;
  readonly onFire: (coachId: string) => void | Promise<void>;
  readonly onHire: (coachId: string) => void | Promise<void>;
  readonly onTabChange: (tab: StaffPageTab) => void;
  readonly staff: readonly CoachView[];
  readonly topAffinities: readonly PlayerAffinityView[];
}

export default function StaffPageContent({
  activeTab,
  budget,
  busyCoachId,
  canManage,
  chemistry,
  impact,
  market,
  mentorship,
  onFire,
  onHire,
  onTabChange,
  staff,
  topAffinities,
}: StaffPageContentProps) {
  const projectedVacancies = useMemo(() => new Set(staff.map((coach) => coach.role)), [staff]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dynasty-text">Staff Overview</h1>
          <p className="font-data text-sm text-dynasty-muted">
            Twelve roles, one development pipeline, no wasted budget.
          </p>
        </div>
        <Badge variant="outline" className="uppercase">
          {canManage ? 'Hiring Window Open' : 'Read Only'}
        </Badge>
      </div>

      <StaffBudgetPanel budget={budget} />

      <StaffOnboardingImpactPanel
        staff={staff}
        topAffinities={topAffinities}
      />

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as StaffPageTab)}>
        <TabsList>
          <TabsTrigger
            value="overview"
            data-mobile-critical-control="staff-view-tab"
            className="mobile-critical-control focus-ring"
            onClick={() => onTabChange('overview')}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="market"
            data-mobile-critical-control="staff-view-tab"
            className="mobile-critical-control focus-ring"
            onClick={() => onTabChange('market')}
          >
            Market
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <StaffCurrentStaffPanel
              busyCoachId={busyCoachId}
              canManage={canManage}
              onFire={onFire}
              staff={staff}
            />

            <StaffImpactPanel impact={impact} />
          </div>

          <StaffChemistryPanel chemistry={chemistry} />

          {mentorship ? <StaffMentorshipPanel mentorship={mentorship} /> : null}
        </TabsContent>

        <TabsContent value="market">
          <StaffMarketPanel
            busyCoachId={busyCoachId}
            canManage={canManage}
            market={market}
            onFire={onFire}
            onHire={onHire}
            projectedVacancies={projectedVacancies}
            staff={staff}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
