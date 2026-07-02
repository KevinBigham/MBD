import { useCallback } from 'react';
import {
  Award,
  DollarSign,
  FileText,
  Gavel,
  Globe2,
  ShieldCheck,
  Tent,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import { getAudioEngine, type AudioEffectName } from '@/shared/lib/audio';
import { useOffseasonActionHandlers } from './useOffseasonActionHandlers';
import { useOffseasonRouteData } from './useOffseasonRouteData';
import type { OffseasonPageContentProps } from '../components/OffseasonPageContent';

export const OFFSEASON_PHASE_CONFIG: Record<string, { label: string; icon: LucideIcon; description: string }> = {
  season_review: {
    label: 'Season Review',
    icon: Award,
    description: 'Review your season performance, awards, and franchise standings.',
  },
  arbitration: {
    label: 'Arbitration',
    icon: DollarSign,
    description: 'Negotiate salaries with arbitration-eligible players.',
  },
  tender_nontender: {
    label: 'Tender / Non-Tender',
    icon: UserMinus,
    description: 'Decide which players to tender contracts and which to non-tender.',
  },
  extensions: {
    label: 'Extensions',
    icon: FileText,
    description: 'Open extension talks with core players before the free-agent market resets leverage.',
  },
  qualifying_offers: {
    label: 'Qualifying Offers',
    icon: FileText,
    description: 'Extend qualifying offers to eligible free agents before the market opens.',
  },
  free_agency: {
    label: 'Free Agency',
    icon: FileText,
    description: 'Sign free agents to fill roster gaps and improve your team.',
  },
  draft: {
    label: 'Amateur Draft',
    icon: FileText,
    description: 'Select prospects to build the future of your franchise.',
  },
  protection_audit: {
    label: 'Protection Audit',
    icon: ShieldCheck,
    description: 'Protect Rule 5-eligible prospects before the 40-man deadline.',
  },
  rule5_draft: {
    label: 'Rule 5 Draft',
    icon: Gavel,
    description: 'Manage the major-league Rule 5 board and active roster obligations.',
  },
  international_signing: {
    label: 'International Signing',
    icon: Globe2,
    description: 'Scout and sign the current international amateur class.',
  },
  coaching_changes: {
    label: 'Coaching Changes',
    icon: ShieldCheck,
    description: 'Refresh your development staff before spring training opens.',
  },
  spring_training: {
    label: 'Spring Training',
    icon: Tent,
    description: 'Finalize your roster and prepare for the upcoming season.',
  },
};

export const OFFSEASON_PHASES = [
  'season_review',
  'arbitration',
  'tender_nontender',
  'extensions',
  'qualifying_offers',
  'free_agency',
  'draft',
  'protection_audit',
  'rule5_draft',
  'international_signing',
  'coaching_changes',
  'spring_training',
] as const;

const OFFSEASON_PHASE_STEPS: OffseasonPageContentProps['phaseSteps'] = OFFSEASON_PHASES.map((phaseId) => {
  const config = OFFSEASON_PHASE_CONFIG[phaseId]!;
  return {
    id: phaseId,
    label: config.label,
    icon: config.icon,
  };
});

interface OffseasonPageWorker {
  advanceOffseason: () => Promise<unknown>;
  getExtensionCandidates: (teamId?: string) => Promise<unknown>;
  getOffseasonHeadline: (season?: number) => Promise<unknown>;
  getOffseasonState: () => Promise<unknown>;
  getQualifyingOfferEligible: (teamId?: string) => Promise<unknown>;
  getQualifyingOfferSalary: () => Promise<unknown>;
  getSeasonRecap: (season?: number) => Promise<unknown>;
  getSpringTrainingView: () => Promise<unknown>;
  isReady: boolean;
  issueQualifyingOffer: (playerId: string) => Promise<unknown>;
  lockRule5Protection: () => Promise<unknown>;
  makeRule5Pick: (playerId: string) => Promise<unknown>;
  passRule5Pick: () => Promise<unknown>;
  resolveQualifyingOffers: () => Promise<unknown>;
  resolveRule5OfferBack: (playerId: string, acceptReturn: boolean) => Promise<unknown>;
  skipOffseasonPhase: () => Promise<unknown>;
  toggleRule5Protection: (playerId: string) => Promise<unknown>;
}

export interface UseOffseasonPageControllerOptions {
  autosaveActiveGame: (options?: { season?: number }) => Promise<unknown>;
  isInitialized: boolean;
  phase: string;
  playEffect?: (name: AudioEffectName) => void;
  season: number;
  userTeamId: string | null;
  worker: OffseasonPageWorker;
}

interface UseOffseasonPageControllerResult {
  contentProps: OffseasonPageContentProps | null;
}

export function useOffseasonPageController({
  autosaveActiveGame,
  isInitialized,
  phase,
  playEffect,
  season,
  userTeamId,
  worker,
}: UseOffseasonPageControllerOptions): UseOffseasonPageControllerResult {
  const defaultPlayEffect = useCallback((effectName: AudioEffectName) => {
    getAudioEngine().playEffect(effectName);
  }, []);
  const playOffseasonEffect = playEffect ?? defaultPlayEffect;

  const {
    applyOffseasonData,
    expandedPhases,
    extensionCandidates,
    fetchOffseason,
    offseason,
    offseasonHeadline,
    qualifyingOfferEligible,
    qualifyingOfferSalary,
    seasonRecap,
    setExpandedPhases,
    springTraining,
  } = useOffseasonRouteData({
    getExtensionCandidates: worker.getExtensionCandidates,
    getOffseasonHeadline: worker.getOffseasonHeadline,
    getOffseasonState: worker.getOffseasonState,
    getQualifyingOfferEligible: worker.getQualifyingOfferEligible,
    getQualifyingOfferSalary: worker.getQualifyingOfferSalary,
    getSeasonRecap: worker.getSeasonRecap,
    getSpringTrainingView: worker.getSpringTrainingView,
    isInitialized,
    phase,
    playEffect: playOffseasonEffect,
    season,
    userTeamId,
    workerReady: worker.isReady,
  });

  const {
    advancing,
    handleAdvance,
    handleIssueQualifyingOffer,
    handleLockProtection,
    handlePassRule5Pick,
    handleResolveOfferBack,
    handleResolveQualifyingOffers,
    handleRule5Pick,
    handleSkip,
    handleToggleProtection,
  } = useOffseasonActionHandlers({
    advanceOffseason: worker.advanceOffseason,
    applyOffseasonData,
    autosaveActiveGame,
    fetchOffseason,
    issueQualifyingOffer: worker.issueQualifyingOffer,
    lockRule5Protection: worker.lockRule5Protection,
    makeRule5Pick: worker.makeRule5Pick,
    passRule5Pick: worker.passRule5Pick,
    resolveQualifyingOffers: worker.resolveQualifyingOffers,
    resolveRule5OfferBack: worker.resolveRule5OfferBack,
    season,
    skipOffseasonPhase: worker.skipOffseasonPhase,
    toggleRule5Protection: worker.toggleRule5Protection,
  });

  const toggleGroup = useCallback((groupPhase: string) => {
    setExpandedPhases((current) => ({
      ...current,
      [groupPhase]: !current[groupPhase],
    }));
  }, [setExpandedPhases]);

  if (phase !== 'offseason') {
    return { contentProps: null };
  }

  const fallbackPhaseConfig = OFFSEASON_PHASE_CONFIG.season_review!;
  const currentPhaseConfig: OffseasonPageContentProps['currentPhaseConfig'] = offseason
    ? OFFSEASON_PHASE_CONFIG[offseason.currentPhase] ?? fallbackPhaseConfig
    : fallbackPhaseConfig;
  const currentPhaseIndex = offseason
    ? OFFSEASON_PHASES.findIndex((phaseId) => phaseId === offseason.currentPhase)
    : 0;

  return {
    contentProps: {
      advancing,
      currentPhaseConfig,
      currentPhaseIndex,
      expandedPhases,
      extensionCandidates,
      marketDaySummaries: offseason?.marketDaySummaries ?? [],
      offseason,
      offseasonHeadline,
      onAdvance: handleAdvance,
      onIssueQualifyingOffer: handleIssueQualifyingOffer,
      onLockProtection: handleLockProtection,
      onPassRule5Pick: handlePassRule5Pick,
      onResolveOfferBack: handleResolveOfferBack,
      onResolveQualifyingOffers: handleResolveQualifyingOffers,
      onRule5Pick: handleRule5Pick,
      onSkip: handleSkip,
      onToggleGroup: toggleGroup,
      onToggleProtection: handleToggleProtection,
      phaseSteps: OFFSEASON_PHASE_STEPS,
      qualifyingOfferEligible,
      qualifyingOfferSalary,
      season,
      seasonRecap,
      springTraining,
      userTeamId,
    },
  };
}
