/**
 * Revised Onboarding Page — "Day One" experience
 *
 * Nine-chapter flow gated on AGM selection:
 *  0. AGM Selection (NEW)
 *  1. Owner's Office (reframed)
 *  2. Roster Review (reframed)
 *  3. Hire Coaching Staff (NEW)
 *  4. Farm System (reframed)
 *  5. Hire Scouting Director (NEW)
 *  6. Financial Playbook (reframed)
 *  7. Season Strategy (reframed)
 *  8. Press Conference (reframed)
 *
 * Uses the existing chapter assessment views for 1-2, 4, 6-8 and the new
 * hiring views for 3 and 5. Selection is gated on the fixed AGM candidates
 * from sim-core.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, SkipForward } from 'lucide-react';
import {
  REVISED_CHAPTER_ORDER,
  type AGMCandidate,
  type AGMCandidateId,
  type AllChapterData,
  type DialogueLine,
  type GMPhilosophy,
  type RevisedChapterId,
  type RevisedOnboardingScript,
  type ScoutingHiringSlate,
  type StaffHireChoices,
  type StaffHiringSlate,
} from '@mbd/sim-core';
import { useWorker } from '@/shared/hooks/useWorker';
import { AGMPanel } from '../components/AGMPanel';
import { AGMSelectionPanel } from '../components/AGMSelectionPanel';
import { ChoiceSelector } from '../components/ChoiceSelector';
import { HireCoachesView } from '../components/chapters/HireCoachesView';
import { HireScoutsView } from '../components/chapters/HireScoutsView';
import { OwnerMeetingView } from '../components/chapters/OwnerMeetingView';
import { RosterAssessmentView } from '../components/chapters/RosterAssessmentView';
import { FarmAssessmentView } from '../components/chapters/FarmAssessmentView';
import { FinancialView } from '../components/chapters/FinancialView';
import { SeasonStrategyView } from '../components/chapters/SeasonStrategyView';
import { PressConferenceView } from '../components/chapters/PressConferenceView';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | { kind: 'loading_candidates' }
  | { kind: 'selecting_agm'; candidates: readonly AGMCandidate[] }
  | { kind: 'loading_script' }
  | { kind: 'running' }
  | { kind: 'complete' };

interface RunningFlow {
  chapterIndex: number;
  choices: Partial<Record<RevisedChapterId, string>>;
  staffHires: StaffHireChoices | null;
  scoutingHire: string | null;
}

// Legacy chapter IDs that have pre-built assessment views
const LEGACY_VIEW_CHAPTERS: ReadonlySet<RevisedChapterId> = new Set([
  'owners_office',
  'roster_review',
  'farm_system',
  'financial_plan',
  'season_strategy',
  'press_conference',
]);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RevisedOnboardingPage() {
  const navigate = useNavigate();
  const worker = useWorker();

  const [phase, setPhase] = useState<Phase>({ kind: 'loading_candidates' });
  const [script, setScript] = useState<RevisedOnboardingScript | null>(null);
  const [chapterData, setChapterData] = useState<AllChapterData | null>(null);
  const [staffSlate, setStaffSlate] = useState<StaffHiringSlate | null>(null);
  const [scoutingSlate, setScoutingSlate] = useState<ScoutingHiringSlate | null>(null);
  const [flow, setFlow] = useState<RunningFlow>({
    chapterIndex: 1, // 0 was AGM selection
    choices: {},
    staffHires: null,
    scoutingHire: null,
  });

  // Load candidates on mount
  useEffect(() => {
    if (!worker.isReady || phase.kind !== 'loading_candidates') return;

    void worker.getAGMCandidates()
      .then((candidates) => {
        setPhase({ kind: 'selecting_agm', candidates });
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[onboarding] Failed to load AGM candidates:', err);
      });
  }, [worker, phase.kind]);

  // Handle AGM selection
  const handleSelectAGM = useCallback((agmId: AGMCandidateId) => {
    if (!worker.isReady) return;
    setPhase({ kind: 'loading_script' });

    void worker.getRevisedOnboardingData(agmId)
      .then((result) => {
        setScript(result.script);
        setChapterData(result.chapterData);
        setStaffSlate(result.staffSlate);
        setScoutingSlate(result.scoutingSlate);
        setPhase({ kind: 'running' });
      })
      .catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('[onboarding] Failed to load revised onboarding data:', err);
      });
  }, [worker]);

  // Current chapter
  const currentChapter = useMemo(() => {
    if (phase.kind !== 'running') return null;
    return REVISED_CHAPTER_ORDER[flow.chapterIndex] ?? null;
  }, [phase.kind, flow.chapterIndex]);

  const currentChapterScript = useMemo(() => {
    if (!script || !currentChapter) return null;
    return script.chapters[currentChapter.id];
  }, [script, currentChapter]);

  // Advance to next chapter
  const advance = useCallback(() => {
    setFlow((prev) => {
      const nextIndex = prev.chapterIndex + 1;
      if (nextIndex >= REVISED_CHAPTER_ORDER.length) {
        return prev;
      }
      return { ...prev, chapterIndex: nextIndex };
    });
  }, []);

  // Chapter completion handlers
  const handleLegacyChoice = useCallback((chapterId: RevisedChapterId, choiceId: string) => {
    setFlow((prev) => ({
      ...prev,
      choices: { ...prev.choices, [chapterId]: choiceId },
    }));
  }, []);

  const handleStaffHires = useCallback((hires: StaffHireChoices) => {
    if (!worker.isReady) return;
    void worker.applyStaffHires(hires).then(() => {
      setFlow((prev) => ({ ...prev, staffHires: hires }));
      advance();
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[onboarding] Failed to apply staff hires:', err);
    });
  }, [worker, advance]);

  const handleScoutingHire = useCallback((scoutingDirectorId: string) => {
    if (!worker.isReady) return;
    void worker.applyScoutingHire(scoutingDirectorId).then(() => {
      setFlow((prev) => ({ ...prev, scoutingHire: scoutingDirectorId }));
      advance();
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[onboarding] Failed to apply scouting hire:', err);
    });
  }, [worker, advance]);

  const handleComplete = useCallback(() => {
    if (!worker.isReady || !script) return;

    const selectedAGMId = script.agm.id;
    const philosophy: GMPhilosophy = {
      seasonGoal: (flow.choices.owners_office ?? 'compete') as GMPhilosophy['seasonGoal'],
      developmentStyle: (flow.choices.farm_system ?? 'balanced') as GMPhilosophy['developmentStyle'],
      spendingStyle: (flow.choices.financial_plan ?? 'balanced') as GMPhilosophy['spendingStyle'],
      tradeApproach: (flow.choices.season_strategy ?? 'opportunistic') as GMPhilosophy['tradeApproach'],
      mediaTone: (flow.choices.press_conference ?? 'measured') as GMPhilosophy['mediaTone'],
      scoutingFocus: 'draft', // replaced server-side based on scoutingHire
    };

    void worker.completeRevisedOnboarding({
      selectedAGMId,
      staffHires: flow.staffHires ?? { managerId: '', pitchingCoachId: '', hittingCoachId: '' },
      scoutingHire: flow.scoutingHire ?? '',
      gmPhilosophy: philosophy,
    }).then(() => {
      navigate('/dashboard');
    }).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('[onboarding] Failed to complete onboarding:', err);
    });
  }, [worker, script, flow, navigate]);

  const handleSkip = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  // ---------- Render ----------

  if (phase.kind === 'loading_candidates' || phase.kind === 'loading_script') {
    return (
      <div className="flex h-screen items-center justify-center bg-dynasty-bg">
        <div className="text-center">
          <div className="mb-3 font-brand text-3xl text-accent-primary motion-safe:animate-pulse">
            MBD
          </div>
          <div className="font-data text-sm text-dynasty-muted">Preparing Day One...</div>
        </div>
      </div>
    );
  }

  if (phase.kind === 'selecting_agm') {
    return (
      <div className="flex min-h-screen flex-col bg-dynasty-bg">
        <Header onSkip={handleSkip} agmName={null} />
        <AGMSelectionPanel candidates={phase.candidates} onSelect={handleSelectAGM} />
      </div>
    );
  }

  if (phase.kind === 'complete') {
    return (
      <div className="flex h-screen items-center justify-center bg-dynasty-bg">
        <div className="text-center">
          <div className="mb-3 font-brand text-3xl text-accent-primary">Day One Complete.</div>
          <button
            type="button"
            onClick={handleComplete}
            className="mt-4 flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90"
          >
            Enter Front Office
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // phase.kind === 'running'
  if (!script || !chapterData || !currentChapter || !currentChapterScript) {
    return null;
  }

  const isLegacyChapter = LEGACY_VIEW_CHAPTERS.has(currentChapter.id);
  // Narrowing: when hasChoice is a literal false (roster_review), TS excludes
  // it from the union, so this expression is already correctly narrowed.
  const hasChoice = currentChapter.hasChoice && isLegacyChapter;

  const selectedChoiceId = flow.choices[currentChapter.id] ?? null;
  const choiceOptions = getChapterChoiceOptions(currentChapter.id, chapterData);
  const choiceReaction = selectedChoiceId
    ? currentChapterScript.choiceReactions[selectedChoiceId] ?? null
    : null;

  const canAdvance = !hasChoice || selectedChoiceId != null;
  const isLastChapter = flow.chapterIndex === REVISED_CHAPTER_ORDER.length - 1;

  const handleNextChapter = () => {
    if (isLastChapter) {
      setPhase({ kind: 'complete' });
      return;
    }
    advance();
  };

  // Build dialogue for AGM panel
  const agmDialogue: DialogueLine[] = [
    ...currentChapterScript.intro,
    ...currentChapterScript.reaction,
  ];

  return (
    <div className="flex min-h-screen flex-col bg-dynasty-bg">
      <Header onSkip={handleSkip} agmName={script.agm.nickname ?? script.agm.name} />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-6">
        {/* Chapter title */}
        <div className="mb-5">
          <h2 className="font-heading text-xl font-bold text-dynasty-text">
            {currentChapter.label}
          </h2>
          <p className="mt-1 font-data text-xs text-dynasty-muted">
            Chapter {flow.chapterIndex + 1} of {REVISED_CHAPTER_ORDER.length}
          </p>
        </div>

        {/* Split layout */}
        <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 200px)' }}>
          {/* Left 70%: chapter content */}
          <div className="flex-[7] overflow-y-auto pr-2">
            {/* Hiring chapters */}
            {currentChapter.id === 'hire_coaches' && staffSlate && (
              <HireCoachesView
                slate={staffSlate}
                opinions={script.staffOpinions}
                onConfirm={handleStaffHires}
              />
            )}
            {currentChapter.id === 'hire_scouts' && scoutingSlate && (
              <HireScoutsView
                slate={scoutingSlate}
                opinions={script.scoutOpinions}
                onConfirm={handleScoutingHire}
              />
            )}

            {/* Legacy assessment chapters */}
            {currentChapter.id === 'owners_office' && chapterData.owner && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={choiceOptions}
                selectedChoiceId={selectedChoiceId}
                choiceReaction={choiceReaction}
                onSelectChoice={(id) => handleLegacyChoice('owners_office', id)}
                onAdvance={canAdvance ? handleNextChapter : null}
                isLastChapter={isLastChapter}
              >
                <OwnerMeetingView data={chapterData.owner} />
              </LegacyChapter>
            )}
            {currentChapter.id === 'roster_review' && chapterData.roster && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={null}
                selectedChoiceId={null}
                choiceReaction={null}
                onSelectChoice={() => {}}
                onAdvance={handleNextChapter}
                isLastChapter={isLastChapter}
              >
                <RosterAssessmentView data={chapterData.roster} />
              </LegacyChapter>
            )}
            {currentChapter.id === 'farm_system' && chapterData.farm && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={choiceOptions}
                selectedChoiceId={selectedChoiceId}
                choiceReaction={choiceReaction}
                onSelectChoice={(id) => handleLegacyChoice('farm_system', id)}
                onAdvance={canAdvance ? handleNextChapter : null}
                isLastChapter={isLastChapter}
              >
                <FarmAssessmentView data={chapterData.farm} />
              </LegacyChapter>
            )}
            {currentChapter.id === 'financial_plan' && chapterData.financial && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={choiceOptions}
                selectedChoiceId={selectedChoiceId}
                choiceReaction={choiceReaction}
                onSelectChoice={(id) => handleLegacyChoice('financial_plan', id)}
                onAdvance={canAdvance ? handleNextChapter : null}
                isLastChapter={isLastChapter}
              >
                <FinancialView data={chapterData.financial} />
              </LegacyChapter>
            )}
            {currentChapter.id === 'season_strategy' && chapterData.strategy && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={choiceOptions}
                selectedChoiceId={selectedChoiceId}
                choiceReaction={choiceReaction}
                onSelectChoice={(id) => handleLegacyChoice('season_strategy', id)}
                onAdvance={canAdvance ? handleNextChapter : null}
                isLastChapter={isLastChapter}
              >
                <SeasonStrategyView data={chapterData.strategy} />
              </LegacyChapter>
            )}
            {currentChapter.id === 'press_conference' && chapterData.press && (
              <LegacyChapter
                chapterTitle={currentChapter.label}
                choiceOptions={choiceOptions}
                selectedChoiceId={selectedChoiceId}
                choiceReaction={choiceReaction}
                onSelectChoice={(id) => handleLegacyChoice('press_conference', id)}
                onAdvance={canAdvance ? handleNextChapter : null}
                isLastChapter={isLastChapter}
              >
                <PressConferenceView data={chapterData.press} />
              </LegacyChapter>
            )}
          </div>

          {/* Right 30%: AGM panel */}
          <div className="flex-[3] border-l border-dynasty-border pl-6">
            <AGMPanel
              profile={{
                name: script.agm.name,
                nickname: script.agm.nickname ?? script.agm.name,
                age: script.agm.age,
                background: script.agm.background,
                personality: script.agm.personality,
                baseballPhilosophy: script.agm.philosophy,
                catchphrase: script.agm.catchphrases[0],
                yearsInBaseball: Math.max(10, script.agm.age - 22),
                bio: script.agm.bio,
              }}
              dialogueLines={agmDialogue}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Legacy chapter wrapper
// ---------------------------------------------------------------------------

interface LegacyChapterProps {
  chapterTitle: string;
  choiceOptions: Array<{ id: string; label: string; description: string }> | null;
  selectedChoiceId: string | null;
  choiceReaction: import('@mbd/sim-core').ChoiceReaction | null;
  onSelectChoice: (id: string) => void;
  onAdvance: (() => void) | null;
  isLastChapter: boolean;
  children: React.ReactNode;
}

function LegacyChapter({
  choiceOptions,
  selectedChoiceId,
  choiceReaction,
  onSelectChoice,
  onAdvance,
  isLastChapter,
  children,
}: LegacyChapterProps) {
  return (
    <div className="space-y-5">
      {children}

      {choiceOptions && (
        <div className="mt-5">
          <h4 className="mb-3 font-heading text-xs font-medium uppercase tracking-wider text-dynasty-muted">
            Your Decision
          </h4>
          <ChoiceSelector
            options={choiceOptions}
            selectedId={selectedChoiceId}
            reaction={choiceReaction}
            onSelect={onSelectChoice}
            onReactionComplete={() => {}}
          />
        </div>
      )}

      {onAdvance && (
        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={onAdvance}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 font-heading text-sm font-semibold text-dynasty-bg transition-colors hover:bg-accent-primary/90"
          >
            {isLastChapter ? 'Finish' : 'Next Chapter'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chapter choice options helper
// ---------------------------------------------------------------------------

function getChapterChoiceOptions(
  chapterId: RevisedChapterId,
  data: AllChapterData,
): Array<{ id: string; label: string; description: string }> | null {
  switch (chapterId) {
    case 'owners_office':
      return data.owner?.seasonGoalOptions ?? null;
    case 'farm_system':
      return data.farm?.developmentOptions ?? null;
    case 'financial_plan':
      return data.financial?.spendingOptions ?? null;
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
// Header
// ---------------------------------------------------------------------------

function Header({
  agmName,
  onSkip,
}: {
  agmName: string | null;
  onSkip: () => void;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-dynasty-border bg-dynasty-bg/95 px-6 py-3 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="font-brand text-lg text-accent-primary">MBD</span>
        <span className="font-data text-xs text-dynasty-muted">&middot;</span>
        <span className="font-heading text-sm text-dynasty-text">
          {agmName ? `Day One with ${agmName}` : 'Day One: First Decision'}
        </span>
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="flex items-center gap-1.5 rounded border border-dynasty-border px-3 py-1.5 font-data text-xs text-dynasty-muted transition-colors hover:border-dynasty-text/30 hover:text-dynasty-text"
      >
        <SkipForward className="h-3.5 w-3.5" />
        Skip
      </button>
    </div>
  );
}
