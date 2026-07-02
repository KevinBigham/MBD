import type { ReactNode } from 'react';
import {
  REVISED_CHAPTER_ORDER,
  type GMPhilosophy,
  type OnboardingFlowState,
  type RevisedChapterScript,
  type StaffHireChoices,
} from '@mbd/sim-core';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import RevisedOnboardingChapterPanel, {
  buildFallbackBody,
  type ChoiceField,
} from './RevisedOnboardingChapterPanel';
import {
  OnboardingErrorBanner,
  OnboardingPageShell,
  OnboardingProgressAside,
  OnboardingRouteHeader,
} from './RevisedOnboardingChrome';

type RevisedChapter = (typeof REVISED_CHAPTER_ORDER)[number];

interface RevisedOnboardingFlowContentProps {
  agmPanel: ReactNode;
  currentChapter: RevisedChapter;
  currentScript: RevisedChapterScript | null;
  data: RevisedOnboardingData;
  error: string | null;
  flowState: OnboardingFlowState;
  onChoice: <K extends ChoiceField>(field: K, value: GMPhilosophy[K]) => void;
  onEnterFrontOffice: () => void;
  onRosterAdvance: () => void;
  onScoutingHire: (scoutingDirectorId: string) => void;
  onStaffHires: (hires: StaffHireChoices) => void;
  submitting: boolean;
}

export default function RevisedOnboardingFlowContent({
  agmPanel,
  currentChapter,
  currentScript,
  data,
  error,
  flowState,
  onChoice,
  onEnterFrontOffice,
  onRosterAdvance,
  onScoutingHire,
  onStaffHires,
  submitting,
}: RevisedOnboardingFlowContentProps) {
  return (
    <OnboardingPageShell>
      <OnboardingRouteHeader
        eyebrow="Revised Day One"
        title={flowState.isComplete ? 'Front Office Ready' : currentChapter.label}
        body={flowState.isComplete
          ? 'Your AGM, staff hires, scouting director, and operating philosophy are ready to write back to the save.'
          : buildFallbackBody(currentChapter.id)}
        aside={(
          <OnboardingProgressAside
            currentChapter={flowState.currentChapter}
            totalChapters={REVISED_CHAPTER_ORDER.length}
            chapters={REVISED_CHAPTER_ORDER}
          />
        )}
      />

      {error ? <OnboardingErrorBanner message={error} /> : null}

      <section className={`grid gap-6 ${agmPanel ? 'xl:grid-cols-[1.1fr_0.9fr]' : ''}`}>
        <div className="rounded-lg border border-dynasty-border bg-dynasty-surface p-6">
          <RevisedOnboardingChapterPanel
            chapterId={currentChapter.id}
            script={currentScript}
            data={data}
            isComplete={flowState.isComplete}
            isSubmitting={submitting}
            onChoice={onChoice}
            onRosterAdvance={onRosterAdvance}
            onStaffHires={onStaffHires}
            onScoutingHire={onScoutingHire}
            onEnterFrontOffice={onEnterFrontOffice}
          />
        </div>

        {agmPanel}
      </section>
    </OnboardingPageShell>
  );
}
