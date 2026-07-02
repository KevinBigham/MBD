import { Suspense, lazy } from 'react';
import { SeasonNarrativePanel } from '@/shared/components/SeasonNarrativePanel';
import { GuidedStartNudgeCard, type GuidedStartNudgeId } from '@/features/onboarding/nudges';
import type { SeasonRecapView, OffseasonHeadlineView } from '@/workers/sim.worker.seasonNarrative';
import ActiveStorylinesPanel from './ActiveStorylinesPanel';
import AttentionDesk from './AttentionDesk';
import type { AttentionDeskItem } from './AttentionDesk';
import CareerCrossroadsPanel from './CareerCrossroadsPanel';
import DashboardBroadcastSection from './DashboardBroadcastSection';
import DashboardLazyIntelligenceGrid from './DashboardLazyIntelligenceGrid';
import { DashboardCardFallback } from './DashboardLoadingStates';
import DashboardSimControlsPanel from './DashboardSimControlsPanel';
import DynastyEndedPanel from './DynastyEndedPanel';
import FirstDayBriefingPanel from './FirstDayBriefingPanel';
import FranchiseIdentityPanel from './FranchiseIdentityPanel';
import type { GamePlayByPlayView, GameRecapView } from './gameDayBroadcast';
import OpeningDayChecklistPanel from './OpeningDayChecklistPanel';
import ReportsQuickstartHub from './ReportsQuickstartHub';
import RivalryHistoryStack from './RivalryHistoryStack';
import TopPerformersPanel from './TopPerformersPanel';
import type { GMCareerView, JobMarketView } from '../hooks/useDashboardRouteData';
import type { DashboardSummary, SimAction } from '../lib/dashboardPageTransforms';

const PlayByPlayPanel = lazy(() => import('./PlayByPlayPanel'));
const GameAdvisor = lazy(() => import('./GameAdvisor'));

export interface DashboardPageContentProps {
  applyingTeamId: string | null;
  attentionItems: AttentionDeskItem[];
  career: GMCareerView | null;
  currentDashboardNudge: GuidedStartNudgeId | null;
  jobMarket: JobMarketView | null;
  offseasonHeadline: OffseasonHeadlineView | null;
  onApplyForJob: (teamId: string) => void;
  onDismissDashboardNudge: (id: GuidedStartNudgeId) => void;
  onDismissWelcomeBriefing: () => void;
  onExportGuidedStartBackup: () => Promise<void> | void;
  onSelectGame: (gameIndex: number) => void;
  onSimDay: () => void;
  onSimMonth: () => void;
  onSimWeek: () => void;
  phase: string;
  playByPlayLoading: boolean;
  recentRecaps: GameRecapView[];
  season: number;
  seasonRecap: SeasonRecapView | null;
  selectedGameDetail: GamePlayByPlayView | null;
  selectedGameIndex: number | null;
  showOpeningDayChecklist: boolean;
  simAction: SimAction;
  summary: DashboardSummary | null;
  userTeamId: string;
}

export default function DashboardPageContent({
  applyingTeamId,
  attentionItems,
  career,
  currentDashboardNudge,
  jobMarket,
  offseasonHeadline,
  onApplyForJob,
  onDismissDashboardNudge,
  onDismissWelcomeBriefing,
  onExportGuidedStartBackup,
  onSelectGame,
  onSimDay,
  onSimMonth,
  onSimWeek,
  phase,
  playByPlayLoading,
  recentRecaps,
  season,
  seasonRecap,
  selectedGameDetail,
  selectedGameIndex,
  showOpeningDayChecklist,
  simAction,
  summary,
  userTeamId,
}: DashboardPageContentProps) {
  const ownerMeterValue = summary?.franchise.owner?.satisfaction ?? summary?.franchise.owner?.patience ?? 0;
  const topRivalry = summary?.intel.rivalries?.[0] ?? null;

  return (
    <>
      <div className="space-y-6" data-tour="dashboard-grid" data-tour-ready={summary?.franchise.welcomeBriefingPending === false ? 'true' : undefined}>
        <FranchiseIdentityPanel
          division={summary?.franchise.division ?? 'Division'}
          divisionRank={summary?.franchise.divisionRank ?? 1}
          dynastyGrade={summary?.franchise.dynasty.grade ?? 'F'}
          dynastyScore={summary?.franchise.dynasty.score ?? 0}
          fanSentimentScore={summary?.fanSentiment.score ?? 50}
          fanSentimentSummary={summary?.fanSentiment.summary ?? 'Stable'}
          fanSentimentTrend={summary?.fanSentiment.trend ?? 'stable'}
          gmName={summary?.franchise.gmName ?? 'General Manager'}
          ownerMeterValue={ownerMeterValue}
          ownerSummary={summary?.franchise.owner?.summary ?? 'Owner state unavailable'}
          record={summary?.franchise.record ?? '0-0'}
          season={season}
          teamId={userTeamId}
          teamName={summary?.franchise.teamName ?? 'Front Office'}
        />

        <DashboardSimControlsPanel
          activeStorylineCount={summary?.storylinesToWatch.length ?? 0}
          challengeName={summary?.challenge?.name ?? null}
          onSimDay={onSimDay}
          onSimMonth={onSimMonth}
          onSimWeek={onSimWeek}
          simAction={simAction}
        />

        <ReportsQuickstartHub />

        {summary?.franchise.welcomeBriefingPending ? (
          <FirstDayBriefingPanel
            gmName={summary.franchise.gmName}
            onDismiss={onDismissWelcomeBriefing}
          />
        ) : null}

        <Suspense fallback={null}>
          <GameAdvisor />
        </Suspense>

        {attentionItems.length > 0 ? <AttentionDesk items={attentionItems} /> : null}

        {showOpeningDayChecklist ? (
          <OpeningDayChecklistPanel
            activeTradeOffers={summary?.tradeIntel.activeTradeOffers ?? 0}
            pressUnreadCount={summary?.pressRoom.unreadCount ?? 0}
            topProspectName={summary?.intel.topProspect?.name ?? null}
          />
        ) : null}

        {career?.jobSearchActive && (jobMarket?.availableJobs.length ?? 0) > 0 ? (
          <CareerCrossroadsPanel
            applyingTeamId={applyingTeamId}
            jobs={jobMarket?.availableJobs ?? []}
            lastFiredReason={career.lastFiredReason}
            onApplyForJob={onApplyForJob}
          />
        ) : null}

        {summary?.franchise.status === 'fired' ? (
          <DynastyEndedPanel endReason={summary.franchise.endReason} />
        ) : null}

        {phase === 'offseason' && seasonRecap && offseasonHeadline ? (
          <SeasonNarrativePanel
            season={seasonRecap.season}
            title="Offseason Outlook"
            headline={offseasonHeadline.headline}
            recap={seasonRecap.recap}
            storylines={seasonRecap.storylines}
          />
        ) : null}

        <TopPerformersPanel performers={summary?.roster.topPerformers ?? []} />

        <DashboardBroadcastSection
          recaps={recentRecaps}
          selectedGameIndex={selectedGameIndex}
          onSelectGame={onSelectGame}
          playByPlaySlot={(
            <Suspense fallback={<DashboardCardFallback title="Broadcast Booth" />}>
              <PlayByPlayPanel detail={selectedGameDetail} loading={playByPlayLoading} />
            </Suspense>
          )}
        />

        <DashboardLazyIntelligenceGrid phase={phase} summary={summary} userTeamId={userTeamId} />

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <ActiveStorylinesPanel storylines={summary?.storylinesToWatch ?? []} />

          <RivalryHistoryStack
            franchiseAbbreviation={summary?.franchise.abbreviation}
            rivalry={topRivalry}
            thisDayInHistory={summary?.thisDayInHistory ?? null}
          />
        </section>
      </div>
      <GuidedStartNudgeCard
        current={currentDashboardNudge}
        onDismiss={onDismissDashboardNudge}
        onExportBackup={onExportGuidedStartBackup}
      />
    </>
  );
}
