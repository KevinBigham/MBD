import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, SkipForward } from 'lucide-react';
import { useWorker } from '@/shared/hooks/useWorker';
import { AGMPanel } from '../components/AGMPanel';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ChapterProgress } from '../components/ChapterProgress';
import { ChoiceSelector } from '../components/ChoiceSelector';
import { OnboardingComplete } from '../components/OnboardingComplete';
import {
  useOnboardingState,
  extractPhilosophy,
} from '../hooks/useOnboardingState';
import type { DialogueLine, ChapterScript } from '@mbd/sim-core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Chapters that present choices to the user. */
const CHOICE_CHAPTERS = new Set([
  'owners_office',
  'the_farm',
  'financial_playbook',
  'scouting_intel',
  'season_strategy',
  'press_conference',
]);

function getChapterChoiceOptions(chapter: ChapterScript): Array<{ id: string; label: string; description: string }> | null {
  const data = chapter.assessmentData;
  const id = chapter.chapter.id;

  switch (id) {
    case 'owners_office':
      return data.owner?.seasonGoalOptions ?? null;
    case 'the_farm':
      return data.farm?.developmentOptions ?? null;
    case 'financial_playbook':
      return data.financial?.spendingOptions ?? null;
    case 'scouting_intel':
      return data.scouting?.scoutingFocusOptions ?? null;
    case 'season_strategy':
      return data.strategy?.strategyOptions ?? null;
    case 'press_conference':
      return data.press?.openingStatementOptions.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.statement,
      })) ?? null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingPage() {
  const navigate = useNavigate();
  const worker = useWorker();
  const { state: wizard, dispatch } = useOnboardingState();
  const [greetingDone, setGreetingDone] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (!worker.isReady || wizard.phase !== 'loading') return;

    void worker.getOnboardingData()
      .then((result) => {
        dispatch({
          type: 'LOADED',
          script: result.script,
          chapterData: result.chapterData,
        });
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[onboarding] Failed to load data:', err);
      });
  }, [worker, wizard.phase, dispatch]);

  // Current chapter script
  const currentChapterScript = useMemo(() => {
    if (!wizard.script || wizard.phase !== 'chapter') return null;
    return wizard.script.chapters[wizard.currentChapter] ?? null;
  }, [wizard.script, wizard.phase, wizard.currentChapter]);

  // Dialogue lines for AGM panel
  const agmDialogue = useMemo((): DialogueLine[] => {
    if (!wizard.script) return [];

    if (wizard.phase === 'greeting') {
      return [{
        speaker: 'assistant_gm' as const,
        text: wizard.script.greeting,
        tone: 'informative' as const,
        emphasis: null,
        referencedPlayerName: null,
        referencedStat: null,
      }];
    }

    if (wizard.phase === 'chapter' && currentChapterScript) {
      return [
        ...currentChapterScript.intro,
        ...currentChapterScript.reaction,
      ];
    }

    return [];
  }, [wizard.script, wizard.phase, currentChapterScript]);

  // Choice handling
  const choiceOptions = currentChapterScript ? getChapterChoiceOptions(currentChapterScript) : null;
  const selectedChoiceId = currentChapterScript
    ? wizard.choices[currentChapterScript.chapter.id] ?? null
    : null;
  const choiceReaction = selectedChoiceId && currentChapterScript
    ? currentChapterScript.choiceReactions[selectedChoiceId] ?? null
    : null;

  const hasChoice = CHOICE_CHAPTERS.has(currentChapterScript?.chapter.id ?? '');
  const canAdvance = !hasChoice || selectedChoiceId != null;

  const handleSelectChoice = useCallback((choiceId: string) => {
    if (!currentChapterScript) return;
    dispatch({ type: 'SELECT_CHOICE', chapterId: currentChapterScript.chapter.id, choiceId });
  }, [currentChapterScript, dispatch]);

  const handleReactionComplete = useCallback(() => {
    dispatch({ type: 'REACTION_COMPLETE' });
  }, [dispatch]);

  const handleNextChapter = useCallback(() => {
    dispatch({ type: 'NEXT_CHAPTER' });
  }, [dispatch]);

  const handleSkip = useCallback(() => {
    const philosophy = extractPhilosophy({});
    void worker.completeOnboarding(philosophy);
    navigate('/dashboard');
  }, [worker, navigate]);

  const handleEnterFrontOffice = useCallback(() => {
    const philosophy = extractPhilosophy(wizard.choices);
    void worker.completeOnboarding(philosophy);
    navigate('/dashboard');
  }, [worker, wizard.choices, navigate]);

  // Loading
  if (wizard.phase === 'loading' || !wizard.script) {
    return (
      <div className="flex h-screen items-center justify-center bg-dynasty-bg">
        <div className="text-center">
          <div className="mb-3 font-brand text-3xl text-accent-primary motion-safe:animate-pulse">
            MBD
          </div>
          <div className="font-data text-sm text-dynasty-muted">Preparing your briefing...</div>
        </div>
      </div>
    );
  }

  // Completion screen
  if (wizard.phase === 'complete') {
    const farewellLines: DialogueLine[] = [{
      speaker: 'assistant_gm' as const,
      text: wizard.script.farewell,
      tone: 'philosophical' as const,
      emphasis: null,
      referencedPlayerName: null,
      referencedStat: null,
    }];

    return (
      <div className="flex min-h-screen flex-col bg-dynasty-bg">
        <Header agmName={wizard.script.assistantProfile.nickname} onSkip={handleSkip} showSkip={false} />
        <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <div className="flex gap-6">
            {/* Left: completion content */}
            <div className="flex-[7] overflow-y-auto">
              <OnboardingComplete
                highlights={wizard.script.highlights}
                quickReference={wizard.script.quickReference}
                farewellLines={farewellLines}
                onEnterFrontOffice={handleEnterFrontOffice}
              />
            </div>
            {/* Right: AGM panel */}
            <div className="flex-[3]">
              <AGMPanel
                profile={wizard.script.assistantProfile}
                dialogueLines={farewellLines}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Greeting phase
  if (wizard.phase === 'greeting') {
    return (
      <div className="flex min-h-screen flex-col bg-dynasty-bg">
        <Header agmName={wizard.script.assistantProfile.nickname} onSkip={handleSkip} />
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6">
          <AGMPanel
            profile={wizard.script.assistantProfile}
            dialogueLines={agmDialogue}
            onDialogueComplete={() => setGreetingDone(true)}
          />
          {greetingDone && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'ADVANCE_TO_CHAPTERS' })}
              className="mt-6 flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90"
            >
              Let&apos;s Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Chapter flow
  return (
    <div className="flex min-h-screen flex-col bg-dynasty-bg">
      <Header agmName={wizard.script.assistantProfile.nickname} onSkip={handleSkip} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {/* Chapter title */}
        {currentChapterScript && (
          <div className="mb-5">
            <h2 className="font-heading text-xl font-bold text-dynasty-text">
              {currentChapterScript.chapter.title}
            </h2>
            <p className="mt-1 font-data text-xs text-dynasty-muted">
              {currentChapterScript.chapter.subtitle}
            </p>
          </div>
        )}

        {/* Split layout */}
        <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* Left 70%: Assessment data + choices */}
          <div className="flex-[7] overflow-y-auto pr-2">
            {currentChapterScript && (
              <div className="space-y-5">
                <AssessmentPanel chapter={currentChapterScript} />

                {/* Choices */}
                {choiceOptions && (
                  <div className="mt-5">
                    <h4 className="mb-3 font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
                      Your Decision
                    </h4>
                    <ChoiceSelector
                      options={choiceOptions}
                      selectedId={selectedChoiceId}
                      reaction={choiceReaction}
                      onSelect={handleSelectChoice}
                      onReactionComplete={handleReactionComplete}
                    />
                  </div>
                )}

                {/* Next chapter button */}
                {canAdvance && (
                  <div className="flex justify-end pt-3">
                    <button
                      type="button"
                      onClick={handleNextChapter}
                      className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90"
                    >
                      {wizard.currentChapter < 7 ? 'Next Chapter' : 'Finish'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right 30%: AGM panel */}
          <div className="flex-[3] border-l border-dynasty-border pl-6">
            <AGMPanel
              profile={wizard.script.assistantProfile}
              dialogueLines={agmDialogue}
            />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="sticky bottom-0 border-t border-dynasty-border bg-dynasty-bg/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <ChapterProgress currentChapter={wizard.currentChapter} />
          <span className="font-data text-[11px] text-dynasty-muted">
            Chapter {wizard.currentChapter + 1} of 8
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function Header({
  agmName,
  onSkip,
  showSkip = true,
}: {
  agmName: string;
  onSkip: () => void;
  showSkip?: boolean;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-dynasty-border bg-dynasty-bg/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-brand text-lg text-accent-primary">MBD</span>
        <span className="font-data text-xs text-dynasty-muted">&middot;</span>
        <span className="font-heading text-sm text-dynasty-text">
          First 10 Minutes with {agmName}
        </span>
      </div>
      {showSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center gap-1.5 rounded border border-dynasty-border px-3 py-1.5 font-data text-xs text-dynasty-muted transition-colors hover:border-dynasty-text/30 hover:text-dynasty-text"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip
        </button>
      )}
    </div>
  );
}
