import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ShieldAlert,
  Users,
  WalletCards,
} from 'lucide-react';
import type { AGMCandidate, GMPhilosophy } from '@mbd/sim-core';
import type { DayOneSession } from '@/workers/sim.worker.onboarding';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import { AGMRuntimePanel } from '../components/AGMRuntimePanel';

type OpeningPlanDraft = NonNullable<DayOneSession['choices']['openingDayPlan']>;
type OpeningPlanOption = NonNullable<DayOneSession['openingPlanView']>['lineupOptions'][number];

interface OpeningPlanWarnings {
  lineup: string[];
  rotation: string[];
  bullpen: string[];
}

const STEP_LABELS: Record<DayOneSession['currentStep'], string> = {
  owner_intro: 'Owner Intro',
  agm_select: 'Choose AGM',
  org_review: 'Org Review',
  season_goal: 'Season Goal',
  budget: 'Budget Allocation',
  opening_day_plan: 'Opening Day Plan',
  development: 'Development Philosophy',
  crisis: 'First Crisis',
  recap: 'Recap',
  complete: 'Ready',
};

const SEASON_GOAL_OPTIONS: Array<{
  id: GMPhilosophy['seasonGoal'];
  title: string;
  summary: string;
}> = [
  { id: 'championship', title: 'Championship', summary: 'Treat the roster like a title threat from day one.' },
  { id: 'playoff', title: 'Playoff Push', summary: 'Expect October baseball and manage the room accordingly.' },
  { id: 'compete', title: 'Compete', summary: 'Push for traction without sacrificing every future edge.' },
  { id: 'rebuild', title: 'Rebuild', summary: 'Protect runway and force the long view to stay honest.' },
];

const BUDGET_OPTIONS = [
  { id: 'spend_now' as const, title: 'Spend Now', summary: 'Front-load support and treat the current roster as urgent.' },
  { id: 'balanced' as const, title: 'Balanced', summary: 'Support the club while preserving some in-season maneuvering.' },
  { id: 'future_flex' as const, title: 'Future Flex', summary: 'Keep powder dry for injuries, trades, and opportunistic moves.' },
];

const DEVELOPMENT_OPTIONS: Array<{
  id: NonNullable<DayOneSession['choices']['developmentStyle']>;
  title: string;
  summary: string;
}> = [
  { id: 'aggressive', title: 'Aggressive', summary: 'Push prospects fast and tolerate more development risk.' },
  { id: 'balanced', title: 'Balanced', summary: 'Blend urgency and patience without locking into either extreme.' },
  { id: 'patient', title: 'Patient', summary: 'Protect development time and trust the longer runway.' },
];

const PROMOTION_OPTIONS = [
  { id: 'aggressive' as const, title: 'Aggressive Promotions', summary: 'Great minor-league performance triggers fast call-up pressure.' },
  { id: 'measured' as const, title: 'Measured Promotions', summary: 'Promotions stay available, but only when the timing is clean.' },
  { id: 'patient' as const, title: 'Patient Promotions', summary: 'Prospects need clear proof before they move.' },
];

function buildPlanOptionLabel(option: { name: string; position: string }) {
  return `${option.name} · ${option.position}`;
}

function buildOpeningPlanWarnings(
  plan: OpeningPlanDraft | null,
  view: DayOneSession['openingPlanView'],
): OpeningPlanWarnings {
  if (plan == null || view == null) {
    return { lineup: [], rotation: [], bullpen: [] };
  }

  const optionLookup = new Map<string, OpeningPlanOption>();
  for (const option of [...view.lineupOptions, ...view.rotationOptions, ...view.bullpenOptions]) {
    optionLookup.set(option.playerId, option);
  }

  const playerLabel = (playerId: string) => optionLookup.get(playerId)?.name ?? playerId;
  const duplicateLabels = (playerIds: Array<string | null | undefined>) => {
    const counts = new Map<string, number>();
    for (const playerId of playerIds) {
      if (!playerId) {
        continue;
      }
      counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([playerId]) => playerLabel(playerId));
  };

  const lineupDuplicates = duplicateLabels(plan.lineupPlayerIds);
  const rotationDuplicates = duplicateLabels(plan.rotationPlayerIds);
  const bullpenRoles = [
    plan.bullpen?.closerId ?? null,
    ...(plan.bullpen?.setupIds ?? []),
    plan.bullpen?.longReliefId ?? null,
  ];
  const bullpenDuplicates = duplicateLabels(bullpenRoles);
  const starterOverlap = [...new Set(
    bullpenRoles
      .filter((playerId): playerId is string => Boolean(playerId))
      .filter((playerId) => plan.rotationPlayerIds.includes(playerId)),
  )].map(playerLabel);

  return {
    lineup: lineupDuplicates.map((label) => `${label} is assigned to multiple lineup spots.`),
    rotation: rotationDuplicates.map((label) => `${label} is assigned to multiple rotation spots.`),
    bullpen: [
      ...bullpenDuplicates.map((label) => `${label} is assigned to multiple bullpen roles.`),
      ...starterOverlap.map((label) => `${label} is assigned in both the rotation and the bullpen.`),
    ],
  };
}

function hasOpeningPlanWarnings(warnings: OpeningPlanWarnings) {
  return warnings.lineup.length > 0 || warnings.rotation.length > 0 || warnings.bullpen.length > 0;
}

export default function RevisedOnboardingPage() {
  const worker = useWorker();
  const navigate = useNavigate();
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const activeSaveSlot = useGameStore((state) => state.activeSaveSlot);
  const gmName = useGameStore((state) => state.gmName);
  const [session, setSession] = useState<DayOneSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [developmentStyle, setDevelopmentStyle] = useState<NonNullable<DayOneSession['choices']['developmentStyle']>>('balanced');
  const [promotionStance, setPromotionStance] = useState<NonNullable<DayOneSession['choices']['promotionStance']>>('measured');
  const [openingPlanDraft, setOpeningPlanDraft] = useState<OpeningPlanDraft | null>(null);

  const refreshSession = useCallback(async () => {
    if (!worker.isReady) {
      return;
    }
    setLoading(true);
    try {
      const nextSession = await worker.getDayOneSession();
      setSession(nextSession);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load Day One.');
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (session?.currentStep !== 'development') {
      return;
    }
    setDevelopmentStyle(session.choices.developmentStyle ?? 'balanced');
    setPromotionStance(session.choices.promotionStance ?? 'measured');
  }, [session]);

  useEffect(() => {
    if (session?.currentStep !== 'opening_day_plan' || session.choices.openingDayPlan == null) {
      return;
    }
    setOpeningPlanDraft({
      lineupPlayerIds: [...session.choices.openingDayPlan.lineupPlayerIds],
      rotationPlayerIds: [...session.choices.openingDayPlan.rotationPlayerIds],
      bullpen: session.choices.openingDayPlan.bullpen == null
        ? null
        : {
          closerId: session.choices.openingDayPlan.bullpen.closerId,
          setupIds: [...session.choices.openingDayPlan.bullpen.setupIds],
          longReliefId: session.choices.openingDayPlan.bullpen.longReliefId,
        },
    });
  }, [session]);

  const performAction = useCallback(async (action: () => Promise<unknown>) => {
    setLoading(true);
    try {
      await action();
      const nextSession = await worker.getDayOneSession();
      setSession(nextSession);
      setError(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Day One action failed.');
    } finally {
      setLoading(false);
    }
  }, [worker]);

  const persistDayOneCompletion = useCallback(async () => {
    const snapshot = await worker.exportSnapshot();
    if (activeSaveId) {
      const existingSave = await loadGameById(activeSaveId);
      if (existingSave) {
        await saveGameById(existingSave.id, existingSave.name, snapshot, {
          slotNumber: existingSave.slotNumber,
          parentSaveId: existingSave.parentSaveId,
          isRootSave: existingSave.isRootSave,
          branchMeta: existingSave.branchMeta,
        });
        return;
      }
    }

    if (activeSaveSlot != null) {
      const teamName = session?.teamCard.teamName ?? 'Franchise';
      await saveGame(activeSaveSlot, `${gmName} • ${teamName}`, snapshot);
    }
  }, [activeSaveId, activeSaveSlot, gmName, session, worker]);

  const enterFrontOffice = useCallback(async () => {
    setLoading(true);
    try {
      await worker.finishDayOne();
      await persistDayOneCompletion();
      setError(null);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to enter the front office.');
    } finally {
      setLoading(false);
    }
  }, [navigate, persistDayOneCompletion, worker]);

  const updateOpeningPlanDraft = useCallback((updater: (current: OpeningPlanDraft) => OpeningPlanDraft) => {
    setOpeningPlanDraft((current) => {
      const baseline = current ?? session?.choices.openingDayPlan;
      return baseline ? updater(baseline) : current;
    });
  }, [session]);

  const updateLineupSlot = useCallback((index: number, playerId: string) => {
    updateOpeningPlanDraft((current) => {
      const next = [...current.lineupPlayerIds];
      next[index] = playerId;
      return {
        ...current,
        lineupPlayerIds: next,
      };
    });
  }, [updateOpeningPlanDraft]);

  const updateRotationSlot = useCallback((index: number, playerId: string) => {
    updateOpeningPlanDraft((current) => {
      const next = [...current.rotationPlayerIds];
      next[index] = playerId;
      return {
        ...current,
        rotationPlayerIds: next,
      };
    });
  }, [updateOpeningPlanDraft]);

  const updateBullpenRole = useCallback((role: 'closer' | 'longRelief' | 'setup0' | 'setup1', playerId: string) => {
    updateOpeningPlanDraft((current) => {
      const bullpen = current.bullpen ?? {
        closerId: null,
        setupIds: ['', ''],
        longReliefId: null,
      };
      const nextSetupIds = [...bullpen.setupIds];
      if (role === 'closer') {
        return {
          ...current,
          bullpen: {
            ...bullpen,
            closerId: playerId,
            setupIds: nextSetupIds,
          },
        };
      }
      if (role === 'longRelief') {
        return {
          ...current,
          bullpen: {
            ...bullpen,
            longReliefId: playerId,
            setupIds: nextSetupIds,
          },
        };
      }
      nextSetupIds[role === 'setup0' ? 0 : 1] = playerId;
      return {
        ...current,
        bullpen: {
          ...bullpen,
          setupIds: nextSetupIds,
        },
      };
    });
  }, [updateOpeningPlanDraft]);

  const openingPlanWarnings = useMemo(
    () => buildOpeningPlanWarnings(openingPlanDraft, session?.openingPlanView ?? null),
    [openingPlanDraft, session?.openingPlanView],
  );
  const openingPlanHasWarnings = hasOpeningPlanWarnings(openingPlanWarnings);

  const resetLineupToRecommended = useCallback(() => {
    const recommendedPlan = session?.choices.openingDayPlan;
    if (recommendedPlan == null) {
      return;
    }
    updateOpeningPlanDraft((current) => ({
      ...current,
      lineupPlayerIds: [...recommendedPlan.lineupPlayerIds],
    }));
  }, [session?.choices.openingDayPlan, updateOpeningPlanDraft]);

  const resetRotationToRecommended = useCallback(() => {
    const recommendedPlan = session?.choices.openingDayPlan;
    if (recommendedPlan == null) {
      return;
    }
    updateOpeningPlanDraft((current) => ({
      ...current,
      rotationPlayerIds: [...recommendedPlan.rotationPlayerIds],
    }));
  }, [session?.choices.openingDayPlan, updateOpeningPlanDraft]);

  const resetBullpenToRecommended = useCallback(() => {
    const recommendedBullpen = session?.choices.openingDayPlan?.bullpen;
    if (recommendedBullpen == null) {
      return;
    }
    updateOpeningPlanDraft((current) => ({
      ...current,
      bullpen: {
        closerId: recommendedBullpen.closerId,
        setupIds: [...recommendedBullpen.setupIds],
        longReliefId: recommendedBullpen.longReliefId,
      },
    }));
  }, [session?.choices.openingDayPlan, updateOpeningPlanDraft]);

  const agmPanel = useMemo(() => {
    if (!session?.selectedAGM) {
      return null;
    }

    const expression = session.currentStep === 'crisis'
      ? 'concerned'
      : session.currentStep === 'complete' || session.currentStep === 'recap'
        ? 'confident'
        : session.currentStep === 'opening_day_plan' || session.currentStep === 'development'
          ? 'focused'
          : 'neutral';

    const eyebrow = session.currentStep === 'crisis'
      ? 'Crisis Beat'
      : session.currentStep === 'complete' || session.currentStep === 'recap'
        ? 'Day One Recap'
        : session.currentStep === 'org_review'
          ? 'Org Diagnosis'
          : 'Desk-Side AGM';

    const headline = session.currentStep === 'crisis'
      ? (session.crisis?.title ?? 'The room needs a call.')
      : session.currentStep === 'recap' || session.currentStep === 'complete'
        ? 'The room has its marching orders.'
        : session.currentStep === 'org_review'
          ? `${session.teamCard.teamName} is ${session.orgReview.mlbTier} now and ${session.orgReview.farmTier} underneath.`
          : `${session.selectedAGM.name} is guiding Day One.`;

    const body = session.currentStep === 'crisis'
      ? (session.crisis?.summary ?? 'Your first real test is already on the desk.')
      : session.currentStep === 'recap' || session.currentStep === 'complete'
        ? (session.recap?.summary ?? 'Day One decisions are locked in and the front office is live.')
        : session.currentStep === 'org_review'
          ? session.orgReview.inheritedStory
          : `Your AGM is framing each decision around Season 1 pressure, organizational leverage, and what kind of franchise you want to become.`;

    return (
      <AGMRuntimePanel
        candidate={session.selectedAGM}
        mode={session.currentStep === 'crisis' || session.currentStep === 'recap' || session.currentStep === 'complete' ? 'chapter' : 'desk'}
        expression={expression}
        eyebrow={session.stepCopy.eyebrow || eyebrow}
        headline={session.stepCopy.headline || headline}
        body={session.stepCopy.body || body}
      />
    );
  }, [session]);

  if (loading && session == null) {
    return <LoadingState label="Preparing Day One..." />;
  }

  if (!session) {
    return <LoadingState label="Loading front office..." />;
  }

  return (
    <div className="min-h-screen bg-dynasty-base px-6 py-8 text-dynasty-text">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
                {session.mode === 'quick' ? 'Quick Start' : 'Full Day One'}
              </div>
              <h1 className="mt-3 font-brand text-4xl text-dynasty-textBright">
                {session.teamCard.teamName}
              </h1>
              <p className="mt-3 max-w-4xl font-heading text-sm leading-6 text-dynasty-muted">
                {session.teamCard.franchiseHook}
              </p>
            </div>
            <div className="rounded-xl border border-dynasty-border bg-dynasty-base/50 px-4 py-3">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Current Step</div>
              <div className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">
                {STEP_LABELS[session.currentStep]}
              </div>
            </div>
          </div>

          {session.projectedImpacts.length > 0 ? (
            <div className="mt-5 grid gap-3 lg:grid-cols-4">
              {session.projectedImpacts.map((impact) => (
                <ImpactCard key={impact.label} label={impact.label} direction={impact.direction} summary={impact.summary} />
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-xl border border-accent-danger/40 bg-accent-danger/10 px-4 py-3 font-heading text-sm text-accent-danger">
              {error}
            </div>
          ) : null}
        </section>

        <section className={`grid gap-6 ${agmPanel ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface p-6">
            {renderCurrentStep({
              session,
              loading,
              onAdvanceIntro: () => performAction(() => worker.advanceDayOneIntro()),
              onChooseAGM: (agmId) => performAction(() => worker.chooseDayOneAGM(agmId)),
              onAdvanceOrgReview: () => performAction(() => worker.advanceDayOneOrgReview()),
              onSetSeasonGoal: (seasonGoal) => performAction(() => worker.setDayOneSeasonGoal(seasonGoal)),
              onSetBudget: (budgetAllocation) => performAction(() => worker.setDayOneBudgetAllocation(budgetAllocation)),
              onLockOpeningPlan: () => performAction(() => worker.setDayOneOpeningPlan(openingPlanDraft ?? session.choices.openingDayPlan!)),
              onSetDevelopmentPlan: () => performAction(() => worker.setDayOneDevelopmentPlan({
                developmentStyle,
                promotionStance,
              })),
              onResolveCrisis: (responseId) => performAction(() => worker.resolveDayOneCrisis(responseId)),
              onEnterFrontOffice: enterFrontOffice,
              developmentStyle,
              promotionStance,
              openingPlanDraft,
              onPickDevelopmentStyle: setDevelopmentStyle,
              onPickPromotionStance: setPromotionStance,
              onUpdateLineupSlot: updateLineupSlot,
              onUpdateRotationSlot: updateRotationSlot,
              onUpdateBullpenRole: updateBullpenRole,
              onResetLineup: resetLineupToRecommended,
              onResetRotation: resetRotationToRecommended,
              onResetBullpen: resetBullpenToRecommended,
              openingPlanWarnings,
              openingPlanHasWarnings,
            })}
          </div>

          {agmPanel}
        </section>
      </div>
    </div>
  );
}

function renderCurrentStep(args: {
  session: DayOneSession;
  loading: boolean;
  onAdvanceIntro: () => void;
  onChooseAGM: (agmId: AGMCandidate['id']) => void;
  onAdvanceOrgReview: () => void;
  onSetSeasonGoal: (seasonGoal: GMPhilosophy['seasonGoal']) => void;
  onSetBudget: (budgetAllocation: 'spend_now' | 'balanced' | 'future_flex') => void;
  onLockOpeningPlan: () => void;
  onSetDevelopmentPlan: () => void;
  onResolveCrisis: (responseId: string) => void;
  onEnterFrontOffice: () => void;
  developmentStyle: NonNullable<DayOneSession['choices']['developmentStyle']>;
  promotionStance: NonNullable<DayOneSession['choices']['promotionStance']>;
  openingPlanDraft: OpeningPlanDraft | null;
  onPickDevelopmentStyle: (value: NonNullable<DayOneSession['choices']['developmentStyle']>) => void;
  onPickPromotionStance: (value: NonNullable<DayOneSession['choices']['promotionStance']>) => void;
  onUpdateLineupSlot: (index: number, playerId: string) => void;
  onUpdateRotationSlot: (index: number, playerId: string) => void;
  onUpdateBullpenRole: (role: 'closer' | 'longRelief' | 'setup0' | 'setup1', playerId: string) => void;
  onResetLineup: () => void;
  onResetRotation: () => void;
  onResetBullpen: () => void;
  openingPlanWarnings: OpeningPlanWarnings;
  openingPlanHasWarnings: boolean;
}) {
  const {
    session,
    loading,
    onAdvanceIntro,
    onChooseAGM,
    onAdvanceOrgReview,
    onSetSeasonGoal,
    onSetBudget,
    onLockOpeningPlan,
    onSetDevelopmentPlan,
    onResolveCrisis,
    onEnterFrontOffice,
    developmentStyle,
    promotionStance,
    openingPlanDraft,
    onPickDevelopmentStyle,
    onPickPromotionStance,
    onUpdateLineupSlot,
    onUpdateRotationSlot,
    onUpdateBullpenRole,
    onResetLineup,
    onResetRotation,
    onResetBullpen,
    openingPlanWarnings,
    openingPlanHasWarnings,
  } = args;

  switch (session.currentStep) {
    case 'owner_intro':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={BriefcaseBusiness}
            title={session.ownerScene.title}
            body={session.ownerScene.summary}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <NarrativeCard title="Expectation" body={session.ownerScene.expectation} />
            <NarrativeCard title="Stakes" body={session.ownerScene.stakes} />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onAdvanceIntro}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            Meet The AGM Candidates
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    case 'agm_select':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={Users}
            title="Choose Your Assistant GM"
            body={session.mode === 'quick'
              ? 'Pick the lieutenant you trust. Quick Start will auto-resolve the rest of Day One immediately after this choice.'
              : 'Each AGM will frame the organization differently. Pick the one you want beside you for every Day One decision.'}
          />
          <div className="grid gap-4 xl:grid-cols-3">
            {session.agmCandidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                disabled={loading}
                onClick={() => onChooseAGM(candidate.id)}
                className="rounded-2xl border border-dynasty-border bg-dynasty-base/50 p-4 text-left transition-colors hover:border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
              >
                <div className="font-heading text-lg font-semibold text-dynasty-textBright">{candidate.name}</div>
                <div className="mt-1 font-data text-[10px] uppercase tracking-[0.18em] text-accent-warning">{candidate.nickname}</div>
                <p className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">{candidate.selectionScreenBio}</p>
                <div className="mt-4 font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Strengths</div>
                <div className="mt-2 space-y-2">
                  {candidate.strengths.slice(0, 3).map((strength) => (
                    <div key={strength} className="rounded-lg border border-dynasty-border/70 px-3 py-2 font-heading text-xs text-dynasty-text">
                      {strength}
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    case 'org_review':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={ChartNoAxesCombined}
            title="Your Inherited Organization"
            body={session.orgReview.inheritedStory}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Projected Record" value={session.teamCard.projectedRecord} />
            <MetricCard label="MLB Rank" value={`#${session.orgReview.mlbRank}`} />
            <MetricCard label="Farm Rank" value={`#${session.orgReview.farmRank}`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ListBlock title="Core Strengths" items={session.orgReview.strengths} />
            <ListBlock title="Pressure Points" items={session.orgReview.weaknesses} />
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onAdvanceOrgReview}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            Set The Season Goal
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    case 'season_goal':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={ShieldAlert}
            title="Owner Mandate"
            body="Lock the posture you want the room to feel immediately. This is the first sentence in your Season 1 story."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            {SEASON_GOAL_OPTIONS.map((option) => (
              <DecisionCard
                key={option.id}
                title={option.title}
                summary={option.summary}
                onClick={() => onSetSeasonGoal(option.id)}
                disabled={loading}
              />
            ))}
          </div>
        </div>
      );
    case 'budget':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={WalletCards}
            title="Budget Allocation"
            body="Decide how aggressive you want the front office to feel in Season 1. This is about baseball ops and in-season flexibility, not fake admin work."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {BUDGET_OPTIONS.map((option) => (
              <DecisionCard
                key={option.id}
                title={option.title}
                summary={option.summary}
                onClick={() => onSetBudget(option.id)}
                disabled={loading}
              />
            ))}
          </div>
        </div>
      );
    case 'opening_day_plan':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={ChartNoAxesCombined}
            title="Opening Day Plan"
            body="Your AGM has loaded the recommended lineup, rotation, and bullpen ladder. Change the slots you want, then lock the real Season 1 opening plan."
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <PlanEditorBlock
              title="Lineup"
              labels={['1', '2', '3', '4', '5', '6', '7', '8', '9']}
              values={openingPlanDraft?.lineupPlayerIds ?? session.choices.openingDayPlan?.lineupPlayerIds ?? []}
              recommendedValues={session.choices.openingDayPlan?.lineupPlayerIds ?? []}
              options={session.openingPlanView?.lineupOptions ?? []}
              onChange={onUpdateLineupSlot}
              onReset={onResetLineup}
              warnings={openingPlanWarnings.lineup}
            />
            <PlanEditorBlock
              title="Rotation"
              labels={['SP1', 'SP2', 'SP3', 'SP4', 'SP5']}
              values={openingPlanDraft?.rotationPlayerIds ?? session.choices.openingDayPlan?.rotationPlayerIds ?? []}
              recommendedValues={session.choices.openingDayPlan?.rotationPlayerIds ?? []}
              options={session.openingPlanView?.rotationOptions ?? []}
              onChange={onUpdateRotationSlot}
              onReset={onResetRotation}
              warnings={openingPlanWarnings.rotation}
            />
            <BullpenEditorBlock
              values={{
                closerId: openingPlanDraft?.bullpen?.closerId ?? session.choices.openingDayPlan?.bullpen?.closerId ?? null,
                setupIds: openingPlanDraft?.bullpen?.setupIds ?? session.choices.openingDayPlan?.bullpen?.setupIds ?? [],
                longReliefId: openingPlanDraft?.bullpen?.longReliefId ?? session.choices.openingDayPlan?.bullpen?.longReliefId ?? null,
              }}
              recommendedValues={{
                closerId: session.choices.openingDayPlan?.bullpen?.closerId ?? null,
                setupIds: session.choices.openingDayPlan?.bullpen?.setupIds ?? [],
                longReliefId: session.choices.openingDayPlan?.bullpen?.longReliefId ?? null,
              }}
              options={session.openingPlanView?.bullpenOptions ?? []}
              onChange={onUpdateBullpenRole}
              onReset={onResetBullpen}
              warnings={openingPlanWarnings.bullpen}
            />
          </div>
          <div className="rounded-xl border border-dynasty-border bg-dynasty-base/40 p-4 font-heading text-sm text-dynasty-muted">
            Pressure points today: {session.orgReview.weaknesses.join(' · ')}.
          </div>
          {openingPlanHasWarnings ? (
            <div className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-4 font-heading text-sm text-accent-danger">
              Fix the duplicate role warnings before locking the Opening Day plan.
            </div>
          ) : null}
          <button
            type="button"
            disabled={loading || session.choices.openingDayPlan == null || openingPlanHasWarnings}
            onClick={onLockOpeningPlan}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            Lock Opening Day Plan
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    case 'development':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={Users}
            title="Development Philosophy"
            body="Set how aggressively the organization develops talent, then separately decide how quickly prospects get promoted when they force the issue."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">Development Style</div>
              {DEVELOPMENT_OPTIONS.map((option) => (
                <ToggleCard
                  key={option.id}
                  active={developmentStyle === option.id}
                  title={option.title}
                  summary={option.summary}
                  onClick={() => onPickDevelopmentStyle(option.id)}
                />
              ))}
            </div>
            <div className="space-y-3">
              <div className="font-heading text-sm font-semibold text-dynasty-textBright">Promotion Stance</div>
              {PROMOTION_OPTIONS.map((option) => (
                <ToggleCard
                  key={option.id}
                  active={promotionStance === option.id}
                  title={option.title}
                  summary={option.summary}
                  onClick={() => onPickPromotionStance(option.id)}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onSetDevelopmentPlan}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            Lock Development Posture
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
    case 'crisis':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={AlertTriangle}
            title={session.crisis?.title ?? 'Roster Crisis'}
            body={session.crisis?.summary ?? 'The roster is already forcing a hard call.'}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {(session.crisis?.responseOptions ?? []).map((option) => (
              <DecisionCard
                key={option.id}
                title={option.label}
                summary={option.summary}
                onClick={() => onResolveCrisis(option.id)}
                disabled={loading}
              />
            ))}
          </div>
        </div>
      );
    case 'recap':
    case 'complete':
      return (
        <div className="space-y-6">
          <StepHeading
            icon={BriefcaseBusiness}
            title={session.recap?.title ?? 'Day One Complete'}
            body={session.recap?.summary ?? 'The front office is ready.'}
          />
          {session.teaser ? (
            <TeaserBeat teaser={session.teaser} />
          ) : null}
          <ListBlock title="What You Locked In" items={session.recap?.bullets ?? []} />
          <button
            type="button"
            disabled={loading}
            onClick={onEnterFrontOffice}
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
          >
            Enter The Front Office
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      );
  }
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dynasty-base">
      <div className="rounded-2xl border border-dynasty-border bg-dynasty-surface px-6 py-5">
        <div className="font-brand text-3xl text-dynasty-textBright">MBD</div>
        <div className="mt-2 font-heading text-sm text-dynasty-muted">{label}</div>
      </div>
    </div>
  );
}

function StepHeading({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BriefcaseBusiness;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 font-data text-[11px] uppercase tracking-[0.2em] text-accent-warning">
        <Icon className="h-4 w-4" />
        Day One
      </div>
      <h2 className="mt-3 font-brand text-3xl text-dynasty-textBright">{title}</h2>
      <p className="mt-3 max-w-3xl font-heading text-sm leading-6 text-dynasty-muted">{body}</p>
    </div>
  );
}

function DecisionCard({
  title,
  summary,
  disabled,
  onClick,
}: {
  title: string;
  summary: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl border border-dynasty-border bg-dynasty-base/50 p-4 text-left transition-colors hover:border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
    >
      <div className="font-heading text-base font-semibold text-dynasty-textBright">{title}</div>
      <div className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">{summary}</div>
    </button>
  );
}

function ToggleCard({
  active,
  title,
  summary,
  onClick,
}: {
  active: boolean;
  title: string;
  summary: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
        active
          ? 'border-accent-primary bg-accent-primary/10'
          : 'border-dynasty-border bg-dynasty-base/50 hover:bg-dynasty-elevated'
      }`}
    >
      <div className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</div>
      <div className="mt-2 font-heading text-xs leading-5 text-dynasty-muted">{summary}</div>
    </button>
  );
}

function NarrativeCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{title}</div>
      <div className="mt-2 font-heading text-sm leading-6 text-dynasty-text">{body}</div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-2 font-brand text-3xl text-dynasty-textBright">{value}</div>
    </div>
  );
}

function PlanSelectControl({
  label,
  value,
  recommendedPlayerId,
  options,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  recommendedPlayerId?: string | null;
  options: Array<{ playerId: string; name: string; position: string }>;
  onChange: (playerId: string) => void;
}) {
  const recommendedOption = recommendedPlayerId
    ? options.find((option) => option.playerId === recommendedPlayerId) ?? null
    : null;

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
        {recommendedOption ? (
          <div className={`rounded-full px-2 py-1 font-data text-[9px] uppercase tracking-[0.14em] ${
            value === recommendedPlayerId
              ? 'bg-accent-success/15 text-accent-success'
              : 'bg-accent-warning/15 text-accent-warning'
          }`}>
            {value === recommendedPlayerId ? 'AGM Recommended' : `AGM: ${recommendedOption.name}`}
          </div>
        ) : null}
      </div>
      <select
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-dynasty-border bg-dynasty-base px-3 py-2 font-heading text-sm text-dynasty-textBright"
      >
        {options.map((option) => (
          <option key={option.playerId} value={option.playerId}>
            {buildPlanOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlanEditorBlock({
  title,
  labels,
  values,
  recommendedValues,
  options,
  onChange,
  onReset,
  warnings,
}: {
  title: string;
  labels: string[];
  values: string[];
  recommendedValues: string[];
  options: Array<{ playerId: string; name: string; position: string }>;
  onChange: (index: number, playerId: string) => void;
  onReset: () => void;
  warnings: string[];
}) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted transition-colors hover:border-accent-primary hover:text-dynasty-textBright"
        >
          Reset {title}
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {labels.map((label, index) => (
          <PlanSelectControl
            key={label}
            label={label}
            value={values[index]}
            recommendedPlayerId={recommendedValues[index]}
            options={options}
            onChange={(playerId) => onChange(index, playerId)}
          />
        ))}
      </div>
      <WarningList warnings={warnings} />
    </div>
  );
}

function BullpenEditorBlock({
  values,
  recommendedValues,
  options,
  onChange,
  onReset,
  warnings,
}: {
  values: {
    closerId: string | null;
    setupIds: string[];
    longReliefId: string | null;
  };
  recommendedValues: {
    closerId: string | null;
    setupIds: string[];
    longReliefId: string | null;
  };
  options: Array<{ playerId: string; name: string; position: string }>;
  onChange: (role: 'closer' | 'longRelief' | 'setup0' | 'setup1', playerId: string) => void;
  onReset: () => void;
  warnings: string[];
}) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-heading text-sm font-semibold text-dynasty-textBright">Bullpen Roles</div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-dynasty-border px-3 py-1 font-data text-[10px] uppercase tracking-[0.16em] text-dynasty-muted transition-colors hover:border-accent-primary hover:text-dynasty-textBright"
        >
          Reset Bullpen
        </button>
      </div>
      <div className="mt-3 space-y-3">
        <PlanSelectControl
          label="Closer"
          value={values.closerId}
          recommendedPlayerId={recommendedValues.closerId}
          options={options}
          onChange={(playerId) => onChange('closer', playerId)}
        />
        <PlanSelectControl
          label="Setup 1"
          value={values.setupIds[0]}
          recommendedPlayerId={recommendedValues.setupIds[0]}
          options={options}
          onChange={(playerId) => onChange('setup0', playerId)}
        />
        <PlanSelectControl
          label="Setup 2"
          value={values.setupIds[1]}
          recommendedPlayerId={recommendedValues.setupIds[1]}
          options={options}
          onChange={(playerId) => onChange('setup1', playerId)}
        />
        <PlanSelectControl
          label="Long Relief"
          value={values.longReliefId}
          recommendedPlayerId={recommendedValues.longReliefId}
          options={options}
          onChange={(playerId) => onChange('longRelief', playerId)}
        />
      </div>
      <WarningList warnings={warnings} />
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-dynasty-border bg-dynasty-base/40 p-4">
      <div className="font-heading text-sm font-semibold text-dynasty-textBright">{title}</div>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-dynasty-border/70 px-3 py-2 font-heading text-sm text-dynasty-text">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactCard({
  label,
  direction,
  summary,
}: {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  summary: string;
}) {
  const accent = direction === 'up'
    ? 'border-accent-success/40 bg-accent-success/10'
    : direction === 'down'
      ? 'border-accent-danger/40 bg-accent-danger/10'
      : 'border-accent-info/40 bg-accent-info/10';

  return (
    <div className={`rounded-xl border px-4 py-3 ${accent}`}>
      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-2 font-heading text-xs leading-5 text-dynasty-text">{summary}</div>
    </div>
  );
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-2 rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3">
      {warnings.map((warning) => (
        <div key={warning} className="font-heading text-xs leading-5 text-accent-danger">
          {warning}
        </div>
      ))}
    </div>
  );
}

function TeaserBeat({ teaser }: { teaser: NonNullable<DayOneSession['teaser']> }) {
  return (
    <div className="rounded-2xl border border-accent-warning/30 bg-accent-warning/8 p-5">
      <div className="font-data text-[10px] uppercase tracking-[0.2em] text-accent-warning">April Watch</div>
      <h3 className="mt-2 font-heading text-lg font-semibold text-dynasty-textBright">{teaser.headline}</h3>
      <p className="mt-3 font-heading text-sm leading-6 text-dynasty-text">{teaser.agmReaction}</p>
      <p className="mt-3 font-heading text-sm leading-6 text-dynasty-muted">{teaser.localPressNote}</p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {teaser.aprilWatchItems.map((item) => (
          <div key={item} className="rounded-xl border border-dynasty-border/80 bg-dynasty-base/50 px-3 py-3 font-heading text-sm text-dynasty-text">
            {item}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-xl border border-dynasty-border/80 bg-dynasty-base/40 px-4 py-3 font-heading text-sm text-dynasty-textBright">
        {teaser.openingDayPrompt}
      </div>
    </div>
  );
}
