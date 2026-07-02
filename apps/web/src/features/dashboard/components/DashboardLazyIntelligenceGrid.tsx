import { Suspense, lazy } from 'react';
import type { DashboardSummary } from '../lib/dashboardPageTransforms';
import DashboardIntelligenceGrid from './DashboardIntelligenceGrid';
import { DashboardCardFallback } from './DashboardLoadingStates';

const StandingsCard = lazy(() => import('./StandingsCard'));
const RosterHealthCard = lazy(() => import('./RosterHealthCard'));
const TradeIntelCard = lazy(() => import('./TradeIntelCard'));
const FarmReportCard = lazy(() => import('./FarmReportCard'));
const FinancialCard = lazy(() => import('./FinancialCard'));
const PressDigestCard = lazy(() => import('./PressDigestCard'));
const MilestoneTrackerCard = lazy(() => import('./MilestoneTrackerCard'));
const ChaseWatchCard = lazy(() => import('./ChaseWatchCard'));
const PennantRaceCard = lazy(() => import('./PennantRaceCard'));
const AwardRaceCard = lazy(() => import('./AwardRaceCard'));
const RecentMomentsCard = lazy(() => import('./RecentMomentsCard'));
const ThisWeekInHistoryCard = lazy(() => import('./ThisWeekInHistoryCard'));
const PlayerArcOfSeasonCard = lazy(() => import('./PlayerArcOfSeasonCard'));
const FranchiseLegacyCard = lazy(() => import('./FranchiseLegacyCard'));
const CareerRetrospectiveCard = lazy(() => import('./CareerRetrospectiveCard'));

interface DashboardLazyIntelligenceGridProps {
  phase: string;
  summary: DashboardSummary | null;
  userTeamId: string;
}

export default function DashboardLazyIntelligenceGrid({
  phase,
  summary,
  userTeamId,
}: DashboardLazyIntelligenceGridProps) {
  return (
    <DashboardIntelligenceGrid
      standingsSlot={(
        <Suspense fallback={<DashboardCardFallback title="Standings" />}>
          <StandingsCard standings={summary?.divisionStandings ?? []} userTeamId={userTeamId} />
        </Suspense>
      )}
      rosterHealthSlot={(
        <Suspense fallback={<DashboardCardFallback title="Roster Health" />}>
          <RosterHealthCard
            injuredCount={summary?.roster.injuredCount ?? 0}
            nextReturnDays={summary?.roster.nextReturnDays ?? null}
            fatigueWarnings={summary?.roster.fatigueWarnings ?? []}
          />
        </Suspense>
      )}
      tradeIntelSlot={(
        <Suspense fallback={<DashboardCardFallback title="Trade Intel" />}>
          <TradeIntelCard
            daysUntilDeadline={summary?.tradeIntel.daysUntilDeadline ?? null}
            phase={phase}
            activeTradeOffers={summary?.tradeIntel.activeTradeOffers ?? 0}
            recentSummary={summary?.tradeIntel.recentSummary ?? null}
            recentTrades={summary?.tradeIntel.recentTrades ?? []}
          />
        </Suspense>
      )}
      farmReportSlot={(
        <Suspense fallback={<DashboardCardFallback title="Farm Report" />}>
          <FarmReportCard
            prospects={summary?.farmIntel.topProspects ?? []}
            recentMoves={summary?.farmIntel.recentMoves ?? []}
          />
        </Suspense>
      )}
      financialsSlot={(
        <Suspense fallback={<DashboardCardFallback title="Financials" />}>
          <FinancialCard
            payroll={summary?.roster.payroll ?? 0}
            budget={summary?.roster.budget ?? 0}
            luxuryTax={summary?.roster.luxuryTax ?? 0}
            annualBudget={summary?.franchise.owner?.annualBudget}
            payrollCap={summary?.franchise.owner?.payrollCap}
          />
        </Suspense>
      )}
      pressDigestSlot={(
        <Suspense fallback={<DashboardCardFallback title="Press Digest" />}>
          <PressDigestCard
            feed={summary?.pressRoom.feed ?? []}
            unreadCount={summary?.pressRoom.unreadCount ?? 0}
          />
        </Suspense>
      )}
      milestoneWatchSlot={(
        <Suspense fallback={<DashboardCardFallback title="Milestone Watch" />}>
          <MilestoneTrackerCard />
        </Suspense>
      )}
      chaseWatchSlot={(
        <Suspense fallback={<DashboardCardFallback title="Chase Watch" />}>
          <ChaseWatchCard />
        </Suspense>
      )}
      pennantRaceSlot={(
        <Suspense fallback={<DashboardCardFallback title="Pennant Race Heat" />}>
          <PennantRaceCard />
        </Suspense>
      )}
      awardRaceSlot={(
        <Suspense fallback={<DashboardCardFallback title="Award Race" />}>
          <AwardRaceCard />
        </Suspense>
      )}
      signatureMomentsSlot={(
        <Suspense fallback={<DashboardCardFallback title="Signature Moments" />}>
          <RecentMomentsCard />
        </Suspense>
      )}
      thisWeekInHistorySlot={(
        <Suspense fallback={<DashboardCardFallback title="This Week in History" />}>
          <ThisWeekInHistoryCard />
        </Suspense>
      )}
      playerArcsSlot={(
        <Suspense fallback={<DashboardCardFallback title="Player Arcs of the Season" />}>
          <PlayerArcOfSeasonCard />
        </Suspense>
      )}
      franchiseLegacySlot={(
        <Suspense fallback={<DashboardCardFallback title="Franchise Legacy" />}>
          <FranchiseLegacyCard />
        </Suspense>
      )}
      careerRetrospectiveSlot={(
        <Suspense fallback={<DashboardCardFallback title="Career Retrospective" />}>
          <CareerRetrospectiveCard />
        </Suspense>
      )}
    />
  );
}
