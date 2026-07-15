import type { LucideIcon } from 'lucide-react';
import { SeasonNarrativePanel } from '@/shared/components/SeasonNarrativePanel';
import type { SeasonRecapView, OffseasonHeadlineView } from '@/workers/sim.worker.seasonNarrative';
import type { OffseasonData } from '../hooks/useOffseasonRouteData';
import { OffseasonCommandCenterPanel } from './OffseasonCommandCenterPanel';
import { OffseasonArbitrationPanel } from './OffseasonArbitrationPanel';
import { OffseasonCurrentPhasePanel } from './OffseasonCurrentPhasePanel';
import { OffseasonExtensionCandidatesPanel, type ExtensionCandidateView } from './OffseasonExtensionCandidatesPanel';
import { OffseasonMarketDayBriefingPanel, type OffseasonMarketDaySummaryView } from './OffseasonMarketDayBriefingPanel';
import { OffseasonPhaseTrackerPanel, type OffseasonPhaseStepView } from './OffseasonPhaseTrackerPanel';
import {
  OffseasonQualifyingOffersPanel,
  type QualifyingOfferEligibleView,
  type QualifyingOfferResultView,
} from './OffseasonQualifyingOffersPanel';
import { OffseasonResultSummaryGrid } from './OffseasonResultSummaryGrid';
import { OffseasonRule5Panel } from './OffseasonRule5Panel';
import { OffseasonSpringTrainingPanel, type SpringTrainingView } from './OffseasonSpringTrainingPanel';
import { OffseasonTransactionLedgerPanel } from './OffseasonTransactionLedgerPanel';

export interface OffseasonPageContentProps {
  advancing: boolean;
  currentPhaseConfig: {
    description: string;
    icon: LucideIcon;
    label: string;
  };
  currentPhaseIndex: number;
  expandedPhases: Record<string, boolean>;
  extensionCandidates: ExtensionCandidateView[];
  marketDaySummaries: OffseasonMarketDaySummaryView[];
  offseason: OffseasonData | null;
  offseasonHeadline: OffseasonHeadlineView | null;
  onAdvance: () => void | Promise<void>;
  onIssueQualifyingOffer: (playerId: string) => void | Promise<void>;
  onLockProtection: () => void | Promise<void>;
  onPassRule5Pick: () => void | Promise<void>;
  onResolveOfferBack: (playerId: string, acceptReturn: boolean) => void | Promise<void>;
  onResolveQualifyingOffers: () => void | Promise<void>;
  onRule5Pick: (playerId: string) => void | Promise<void>;
  onSkip: () => void | Promise<void>;
  onToggleGroup: (groupPhase: string) => void;
  onToggleProtection: (playerId: string) => void | Promise<void>;
  phaseSteps: OffseasonPhaseStepView[];
  qualifyingOfferEligible: QualifyingOfferEligibleView[];
  qualifyingOfferSalary: number | null;
  season: number;
  seasonRecap: SeasonRecapView | null;
  springTraining: SpringTrainingView | null;
  userTeamId: string | null;
}

export default function OffseasonPageContent({
  advancing,
  currentPhaseConfig,
  currentPhaseIndex,
  expandedPhases,
  extensionCandidates,
  marketDaySummaries,
  offseason,
  offseasonHeadline,
  onAdvance,
  onIssueQualifyingOffer,
  onLockProtection,
  onPassRule5Pick,
  onResolveOfferBack,
  onResolveQualifyingOffers,
  onRule5Pick,
  onSkip,
  onToggleGroup,
  onToggleProtection,
  phaseSteps,
  qualifyingOfferEligible,
  qualifyingOfferSalary,
  season,
  seasonRecap,
  springTraining,
  userTeamId,
}: OffseasonPageContentProps) {
  const commandCenter = offseason?.commandCenter;
  const rule5 = offseason?.rule5;
  const transactionGroups = offseason?.transactionGroups ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-brand text-4xl tracking-wide text-dynasty-textBright">
          Offseason - Season {season}
        </h1>
        <p className="mt-1 font-heading text-sm text-dynasty-muted">
          Navigate through each phase to prepare for the next season.
        </p>
      </div>

      <OffseasonPhaseTrackerPanel phases={phaseSteps} currentPhaseIndex={currentPhaseIndex} />

      <OffseasonCurrentPhasePanel
        label={currentPhaseConfig.label}
        description={currentPhaseConfig.description}
        icon={currentPhaseConfig.icon}
        phaseDay={offseason?.phaseDay ?? null}
        advancing={advancing}
        onAdvance={onAdvance}
        onSkip={onSkip}
      />

      {seasonRecap && offseasonHeadline ? (
        <SeasonNarrativePanel
          season={seasonRecap.season}
          title="Offseason Narrative"
          headline={offseasonHeadline.headline}
          recap={seasonRecap.recap}
          storylines={seasonRecap.storylines}
        />
      ) : null}

      {commandCenter ? (
        <OffseasonCommandCenterPanel commandCenter={commandCenter} />
      ) : null}

      {(offseason?.arbitrationCases?.length ?? 0) > 0 ? (
        <OffseasonArbitrationPanel cases={offseason?.arbitrationCases ?? []} />
      ) : null}

      {marketDaySummaries.length > 0 ? (
        <OffseasonMarketDayBriefingPanel summaries={marketDaySummaries} />
      ) : null}

      {offseason ? (
        <OffseasonResultSummaryGrid phaseResults={offseason.phaseResults} />
      ) : null}

      {offseason?.currentPhase === 'extensions' ? (
        <OffseasonExtensionCandidatesPanel candidates={extensionCandidates} />
      ) : null}

      {offseason && (
        offseason.currentPhase === 'qualifying_offers'
        || offseason.phaseResults.qualifyingOffers.length > 0
      ) ? (
        <OffseasonQualifyingOffersPanel
          eligible={qualifyingOfferEligible}
          qualifyingOfferSalary={qualifyingOfferSalary}
          results={offseason.phaseResults.qualifyingOffers as QualifyingOfferResultView[]}
          active={offseason.currentPhase === 'qualifying_offers'}
          advancing={advancing}
          onIssue={(playerId) => void onIssueQualifyingOffer(playerId)}
          onResolve={() => void onResolveQualifyingOffers()}
        />
      ) : null}

      {rule5 ? (
        <OffseasonRule5Panel
          rule5={rule5}
          userTeamId={userTeamId}
          advancing={advancing}
          onToggleProtection={(playerId) => void onToggleProtection(playerId)}
          onLockProtection={() => void onLockProtection()}
          onRule5Pick={(playerId) => void onRule5Pick(playerId)}
          onPassRule5Pick={() => void onPassRule5Pick()}
          onResolveOfferBack={(playerId, acceptReturn) => void onResolveOfferBack(playerId, acceptReturn)}
        />
      ) : null}

      {offseason?.currentPhase === 'spring_training' && springTraining ? (
        <OffseasonSpringTrainingPanel springTraining={springTraining} />
      ) : null}

      {transactionGroups.length > 0 ? (
        <OffseasonTransactionLedgerPanel
          transactionGroups={transactionGroups}
          expandedPhases={expandedPhases}
          onToggleGroup={onToggleGroup}
        />
      ) : null}
    </div>
  );
}
