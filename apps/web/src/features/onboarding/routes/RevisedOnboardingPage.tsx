import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Users,
} from 'lucide-react';
import {
  REVISED_CHAPTER_ORDER,
  advanceRevisedChapter,
  createRevisedOnboardingState,
  getOnboardingResult,
  selectAGMInFlow,
  setPhilosophyChoiceInFlow,
  setScoutingHireInFlow,
  setStaffHiresInFlow,
  type AGMCandidate,
  type AGMCandidateId,
  type GMPhilosophy,
  type OnboardingFlowState,
  type RevisedChapterId,
  type RevisedChapterScript,
  type StaffHireChoices,
} from '@mbd/sim-core';
import { useGameStore } from '@/shared/hooks/useGameStore';
import { useWorker } from '@/shared/hooks/useWorker';
import { loadGameById, saveGame, saveGameById } from '@/shared/lib/saveSystem';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import { AGMRuntimePanel } from '../components/AGMRuntimePanel';
import { AGMSelectionPanel } from '../components/AGMSelectionPanel';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ChapterProgress } from '../components/ChapterProgress';
import { HireCoachesView } from '../components/chapters/HireCoachesView';
import { HireScoutsView } from '../components/chapters/HireScoutsView';
import { GuidedStartNudgeCard, useNudges } from '../nudges';

type ChoiceField =
  | 'seasonGoal'
  | 'developmentStyle'
  | 'spendingStyle'
  | 'tradeApproach'
  | 'mediaTone';

interface ChoiceOption {
  id: string;
  label: string;
  description: string;
}

interface WorkerMutationResult {
  success: boolean;
  flowStateChanged: boolean;
}

function readErrorMessage(caughtError: unknown, fallback: string) {
  return caughtError instanceof Error ? caughtError.message : fallback;
}

function requireSnapshotObject(snapshot: unknown): object {
  if (snapshot == null || typeof snapshot !== 'object') {
    throw new Error('Worker did not return a valid snapshot object.');
  }

  return snapshot;
}

function getCurrentChapter(state: OnboardingFlowState) {
  return REVISED_CHAPTER_ORDER[state.currentChapter] ?? REVISED_CHAPTER_ORDER[0]!;
}

function buildDialogueText(chapter: RevisedChapterScript | null, key: 'intro' | 'reaction') {
  return chapter?.[key].map((line) => line.text).join(' ') ?? '';
}

function buildFallbackBody(chapterId: RevisedChapterId) {
  switch (chapterId) {
    case 'owners_office':
      return 'The owner is setting the mandate. Pick the operating target your front office will answer to.';
    case 'roster_review':
      return 'Review the major-league room before you start assigning people to fix it.';
    case 'hire_coaches':
      return 'Fill the manager, pitching coach, and hitting coach offices before the season starts moving.';
    case 'farm_system':
      return 'Set the development posture that will shape promotions and prospect patience.';
    case 'hire_scouts':
      return 'Pick the scouting director whose specialty becomes the organization acquisition lens.';
    case 'financial_plan':
      return 'Choose how aggressively this front office should use payroll flexibility.';
    case 'season_strategy':
      return 'Set the trade-market posture for the first competitive window.';
    case 'press_conference':
      return 'Decide how directly you want to set public expectations.';
    case 'agm_selection':
    default:
      return 'Choose the assistant GM who will narrate the rest of Day One.';
  }
}

export default function RevisedOnboardingPage() {
  const worker = useWorker();
  const navigate = useNavigate();
  const activeSaveId = useGameStore((state) => state.activeSaveId);
  const activeSaveSlot = useGameStore((state) => state.activeSaveSlot);
  const gmName = useGameStore((state) => state.gmName);
  const saveSlotId = activeSaveSlot != null ? `save-slot-${activeSaveSlot}` : activeSaveId;
  const introNudges = useNudges({
    saveSlotId,
    triggers: ['intro_scroll'],
  });

  const [candidates, setCandidates] = useState<AGMCandidate[]>([]);
  const [data, setData] = useState<RevisedOnboardingData | null>(null);
  const [flowState, setFlowState] = useState<OnboardingFlowState>(() => createRevisedOnboardingState());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasSaveTarget = Boolean(activeSaveId) || activeSaveSlot != null;
  const currentChapter = getCurrentChapter(flowState);
  const currentScript = data?.script.chapters[currentChapter.id] ?? null;
  const selectedAGM = data?.script.agm ?? candidates.find((candidate) => candidate.id === flowState.selectedAGMId) ?? null;
  const isBusy = loading || submitting;

  const loadCandidates = useCallback(async () => {
    if (!worker.isReady) {
      return;
    }

    setLoading(true);
    try {
      const nextCandidates = await worker.getAGMCandidates();
      setCandidates(nextCandidates);
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to load AGM candidates.'));
    } finally {
      setLoading(false);
    }
  }, [worker]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const persistCompletion = useCallback(async (snapshot: object) => {
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
      await saveGame(activeSaveSlot, `${gmName} • Franchise`, snapshot);
    }
  }, [activeSaveId, activeSaveSlot, gmName]);

  const handleSelectAGM = useCallback(async (agmId: AGMCandidateId) => {
    setSubmitting(true);
    try {
      const nextData = await worker.getRevisedOnboardingData(agmId);
      setData(nextData);
      setFlowState(selectAGMInFlow(createRevisedOnboardingState(), agmId));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to load revised onboarding.'));
    } finally {
      setSubmitting(false);
    }
  }, [worker]);

  const completeLocalChapter = useCallback((nextState: OnboardingFlowState) => {
    setFlowState(nextState);
    setError(null);
  }, []);

  const handleChoice = useCallback(<K extends ChoiceField>(field: K, value: GMPhilosophy[K]) => {
    completeLocalChapter(setPhilosophyChoiceInFlow(flowState, field, value));
  }, [completeLocalChapter, flowState]);

  const handleRosterAdvance = useCallback(() => {
    completeLocalChapter(advanceRevisedChapter(flowState));
  }, [completeLocalChapter, flowState]);

  const handleStaffHires = useCallback(async (hires: StaffHireChoices) => {
    setSubmitting(true);
    try {
      await worker.applyStaffHires(hires) as WorkerMutationResult;
      setFlowState(setStaffHiresInFlow(flowState, hires));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to apply staff hires.'));
    } finally {
      setSubmitting(false);
    }
  }, [flowState, worker]);

  const handleScoutingHire = useCallback(async (scoutingDirectorId: string) => {
    setSubmitting(true);
    try {
      await worker.applyScoutingHire(scoutingDirectorId) as WorkerMutationResult;
      setFlowState(setScoutingHireInFlow(flowState, scoutingDirectorId));
      setError(null);
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to apply scouting hire.'));
    } finally {
      setSubmitting(false);
    }
  }, [flowState, worker]);

  const handleEnterFrontOffice = useCallback(async () => {
    if (data == null) {
      setError('Revised onboarding data is missing.');
      return;
    }

    setSubmitting(true);
    try {
      const result = getOnboardingResult(flowState, data.scoutingSlate);
      await worker.completeRevisedOnboarding(result) as WorkerMutationResult;
      const snapshot = requireSnapshotObject(await worker.exportSnapshot());
      await persistCompletion(snapshot);
      setError(null);
      navigate('/dashboard');
    } catch (caughtError) {
      setError(readErrorMessage(caughtError, 'Failed to complete revised onboarding.'));
    } finally {
      setSubmitting(false);
    }
  }, [data, flowState, navigate, persistCompletion, worker]);

  const agmPanel = useMemo(() => {
    if (selectedAGM == null || data == null) {
      return null;
    }

    const introText = buildDialogueText(currentScript, 'intro');
    const reactionText = buildDialogueText(currentScript, 'reaction');

    return (
      <AGMRuntimePanel
        candidate={selectedAGM}
        mode={flowState.isComplete ? 'chapter' : 'desk'}
        expression={flowState.isComplete ? 'confident' : currentChapter.isHiring ? 'focused' : 'neutral'}
        eyebrow={flowState.isComplete ? 'Front Office Ready' : currentChapter.label}
        headline={introText || `${selectedAGM.name} is guiding the room.`}
        body={reactionText || introText || buildFallbackBody(currentChapter.id)}
      />
    );
  }, [currentChapter, currentScript, data, flowState.isComplete, selectedAGM]);

  const nudgeCard = (
    <GuidedStartNudgeCard
      current={introNudges.current}
      onDismiss={introNudges.dismiss}
    />
  );

  if (loading && candidates.length === 0) {
    return (
      <>
        <LoadingState label="Loading AGM candidates..." />
        {nudgeCard}
      </>
    );
  }

  if (!hasSaveTarget) {
    return (
      <>
        <PageShell>
          <EmptyState
            title="No active save selected"
            body="Revised onboarding needs an active save slot so the final front-office snapshot can be preserved."
            actionLabel="Return to Save Hub"
            onAction={() => navigate('/')}
          />
        </PageShell>
        {nudgeCard}
      </>
    );
  }

  if (data == null) {
    return (
      <>
        <PageShell>
          <Header
            eyebrow="Revised Day One"
            title="Choose Your Assistant GM"
            body="The revised onboarding path starts with the AGM candidates from the worker, then builds every assessment, hire, and final save from that selection."
          />
          {error ? <ErrorBanner message={error} /> : null}
          <AGMSelectionPanel
            candidates={candidates}
            onSelect={handleSelectAGM}
            isLoading={isBusy}
          />
        </PageShell>
        {nudgeCard}
      </>
    );
  }

  return (
    <>
      <PageShell>
        <Header
          eyebrow="Revised Day One"
          title={flowState.isComplete ? 'Front Office Ready' : currentChapter.label}
          body={flowState.isComplete
            ? 'Your AGM, staff hires, scouting director, and operating philosophy are ready to write back to the save.'
            : buildFallbackBody(currentChapter.id)}
          aside={(
            <div className="rounded-lg border border-dynasty-border bg-dynasty-base/50 px-4 py-3">
              <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">Progress</div>
              <div className="mt-2">
                <ChapterProgress
                  currentChapter={flowState.currentChapter}
                  totalChapters={REVISED_CHAPTER_ORDER.length}
                  chapters={REVISED_CHAPTER_ORDER}
                />
              </div>
            </div>
          )}
        />

        {error ? <ErrorBanner message={error} /> : null}

        <section className={`grid gap-6 ${agmPanel ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
            {flowState.isComplete ? (
              <CompletionPanel
                data={data}
                isSubmitting={submitting}
                onEnterFrontOffice={handleEnterFrontOffice}
              />
            ) : (
              <ChapterBody
                chapterId={currentChapter.id}
                script={currentScript}
                data={data}
                isSubmitting={submitting}
                onChoice={handleChoice}
                onRosterAdvance={handleRosterAdvance}
                onStaffHires={handleStaffHires}
                onScoutingHire={handleScoutingHire}
              />
            )}
          </div>

          {agmPanel}
        </section>
      </PageShell>
      {nudgeCard}
    </>
  );
}

function ChapterBody({
  chapterId,
  script,
  data,
  isSubmitting,
  onChoice,
  onRosterAdvance,
  onStaffHires,
  onScoutingHire,
}: {
  chapterId: RevisedChapterId;
  script: RevisedChapterScript | null;
  data: RevisedOnboardingData;
  isSubmitting: boolean;
  onChoice: <K extends ChoiceField>(field: K, value: GMPhilosophy[K]) => void;
  onRosterAdvance: () => void;
  onStaffHires: (hires: StaffHireChoices) => void;
  onScoutingHire: (scoutingDirectorId: string) => void;
}) {
  switch (chapterId) {
    case 'owners_office':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ChoiceGrid
            title="Choose the season mandate"
            options={data.chapterData.owner.seasonGoalOptions}
            onSelect={(id) => onChoice('seasonGoal', id as GMPhilosophy['seasonGoal'])}
            disabled={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'roster_review':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ActionFooter>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onRosterAdvance}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
            >
              Continue Roster Review
              <ArrowRight className="h-4 w-4" />
            </button>
          </ActionFooter>
        </ChapterLayout>
      );
    case 'hire_coaches':
      return (
        <ChapterLayout script={script}>
          <HireCoachesView
            slate={data.staffSlate}
            opinions={data.script.staffOpinions}
            onConfirm={onStaffHires}
            isSubmitting={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'farm_system':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ChoiceGrid
            title="Choose the development posture"
            options={data.chapterData.farm.developmentOptions}
            onSelect={(id) => onChoice('developmentStyle', id as GMPhilosophy['developmentStyle'])}
            disabled={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'hire_scouts':
      return (
        <ChapterLayout script={script}>
          <HireScoutsView
            slate={data.scoutingSlate}
            opinions={data.script.scoutOpinions}
            onConfirm={onScoutingHire}
            isSubmitting={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'financial_plan':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ChoiceGrid
            title="Choose the spending posture"
            options={data.chapterData.financial.spendingOptions}
            onSelect={(id) => onChoice('spendingStyle', id as GMPhilosophy['spendingStyle'])}
            disabled={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'season_strategy':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ChoiceGrid
            title="Choose the trade posture"
            options={data.chapterData.strategy.strategyOptions}
            onSelect={(id) => onChoice('tradeApproach', id as GMPhilosophy['tradeApproach'])}
            disabled={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'press_conference':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <ChoiceGrid
            title="Choose the first public tone"
            options={data.chapterData.press.openingStatementOptions.map((option) => ({
              id: option.id,
              label: option.label,
              description: option.statement,
            }))}
            onSelect={(id) => onChoice('mediaTone', id as GMPhilosophy['mediaTone'])}
            disabled={isSubmitting}
          />
        </ChapterLayout>
      );
    case 'agm_selection':
    default:
      return null;
  }
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-dynasty-base px-6 py-8 text-dynasty-text">
      <div className="mx-auto max-w-7xl space-y-6">{children}</div>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  body,
  aside,
}: {
  eyebrow: string;
  title: string;
  body: string;
  aside?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="font-data text-[11px] uppercase tracking-[0.22em] text-accent-warning">
            {eyebrow}
          </div>
          <h1 className="mt-3 font-brand text-4xl text-dynasty-textBright">
            {title}
          </h1>
          <p className="mt-3 max-w-4xl font-heading text-sm leading-6 text-dynasty-muted">
            {body}
          </p>
        </div>
        {aside}
      </div>
    </section>
  );
}

function ChapterLayout({ script, children }: { script: RevisedChapterScript | null; children: ReactNode }) {
  const intro = buildDialogueText(script, 'intro');

  return (
    <div className="space-y-6">
      {script ? (
        <div className="rounded-lg border border-dynasty-border bg-dynasty-base/50 p-4">
          <div className="font-data text-[10px] uppercase tracking-[0.2em] text-accent-primary">
            {script.chapter.label}
          </div>
          {intro ? (
            <p className="mt-2 font-heading text-sm leading-6 text-dynasty-muted">
              {intro}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ChoiceGrid({
  title,
  options,
  onSelect,
  disabled,
}: {
  title: string;
  options: readonly ChoiceOption[];
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="font-data text-[10px] uppercase tracking-[0.2em] text-dynasty-muted">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className="rounded-lg border border-dynasty-border bg-dynasty-base/50 p-4 text-left transition-colors hover:border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
          >
            <div className="font-heading text-sm font-semibold text-dynasty-textBright">{option.label}</div>
            <p className="mt-2 font-data text-xs leading-5 text-dynasty-muted">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CompletionPanel({
  data,
  isSubmitting,
  onEnterFrontOffice,
}: {
  data: RevisedOnboardingData;
  isSubmitting: boolean;
  onEnterFrontOffice: () => void;
}) {
  const farewell = data.script.farewell.map((line) => line.text).join(' ');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-accent-success/40 bg-accent-success/10 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-accent-success" />
          <div>
            <div className="font-heading text-lg font-semibold text-dynasty-textBright">Revised onboarding complete</div>
            <p className="mt-1 font-heading text-sm leading-6 text-dynasty-muted">
              {farewell || 'Your front office is ready for the dashboard.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Assistant GM" value={data.script.agm.name} />
        <SummaryCard label="Staff Choices" value="Manager, pitching coach, hitting coach" />
        <SummaryCard label="Scouting Director" value="Ready to write to save" />
      </div>

      <ActionFooter>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onEnterFrontOffice}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover disabled:opacity-50"
        >
          Enter the Front Office
          <ArrowRight className="h-4 w-4" />
        </button>
      </ActionFooter>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-base/50 px-4 py-3">
      <div className="font-data text-[10px] uppercase tracking-[0.18em] text-dynasty-muted">{label}</div>
      <div className="mt-2 font-heading text-sm font-semibold text-dynasty-textBright">{value}</div>
    </div>
  );
}

function ActionFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end border-t border-dynasty-border pt-5">
      {children}
    </div>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-8 text-center">
      <BriefcaseBusiness className="mx-auto h-8 w-8 text-accent-warning" />
      <h1 className="mt-4 font-heading text-2xl font-semibold text-dynasty-textBright">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl font-heading text-sm leading-6 text-dynasty-muted">{body}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 font-heading text-sm font-semibold text-white hover:bg-accent-primaryHover"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 px-4 py-3 font-heading text-sm text-accent-danger">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dynasty-base text-dynasty-text">
      <div className="rounded-lg border border-dynasty-border bg-dynasty-surface px-6 py-5">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent-primary" />
          <ClipboardList className="h-5 w-5 text-accent-warning" />
          <span className="font-heading text-sm text-dynasty-muted">{label}</span>
        </div>
      </div>
    </div>
  );
}
