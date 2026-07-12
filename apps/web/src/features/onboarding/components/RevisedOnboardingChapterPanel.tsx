import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type {
  GMPhilosophy,
  RevisedChapterId,
  RevisedChapterScript,
  StaffHireChoices,
} from '@mbd/sim-core';
import type { RevisedOnboardingData } from '@/workers/sim.worker.onboarding';
import { AssessmentPanel } from './AssessmentPanel';
import { HireCoachesView } from './chapters/HireCoachesView';
import { HireScoutsView } from './chapters/HireScoutsView';
import { OnboardingChoiceGrid } from './OnboardingChoiceGrid';

export type ChoiceField =
  | 'seasonGoal'
  | 'developmentStyle'
  | 'spendingStyle'
  | 'tradeApproach'
  | 'mediaTone';

export interface RevisedOnboardingChapterPanelProps {
  chapterId: RevisedChapterId;
  script: RevisedChapterScript | null;
  data: RevisedOnboardingData;
  isComplete: boolean;
  mutationBlocked: boolean;
  isSubmitting: boolean;
  onChoice: <K extends ChoiceField>(field: K, value: GMPhilosophy[K]) => void;
  onRosterAdvance: () => void;
  onStaffHires: (hires: StaffHireChoices) => void;
  onScoutingHire: (scoutingDirectorId: string) => void;
  onEnterFrontOffice: () => void;
}

export function buildDialogueText(chapter: RevisedChapterScript | null, key: 'intro' | 'reaction') {
  return chapter?.[key].map((line) => line.text).join(' ') ?? '';
}

export function buildFallbackBody(chapterId: RevisedChapterId) {
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

export default function RevisedOnboardingChapterPanel({
  chapterId,
  script,
  data,
  isComplete,
  mutationBlocked,
  isSubmitting,
  onChoice,
  onRosterAdvance,
  onStaffHires,
  onScoutingHire,
  onEnterFrontOffice,
}: RevisedOnboardingChapterPanelProps) {
  if (isComplete) {
    return (
      <CompletionPanel
        data={data}
        isSubmitting={mutationBlocked}
        onEnterFrontOffice={onEnterFrontOffice}
      />
    );
  }

  return (
    <ChapterBody
      chapterId={chapterId}
      script={script}
      data={data}
      mutationBlocked={mutationBlocked}
      isSubmitting={isSubmitting}
      onChoice={onChoice}
      onRosterAdvance={onRosterAdvance}
      onStaffHires={onStaffHires}
      onScoutingHire={onScoutingHire}
    />
  );
}

function ChapterBody({
  chapterId,
  script,
  data,
  mutationBlocked,
  isSubmitting,
  onChoice,
  onRosterAdvance,
  onStaffHires,
  onScoutingHire,
}: {
  chapterId: RevisedChapterId;
  script: RevisedChapterScript | null;
  data: RevisedOnboardingData;
  mutationBlocked: boolean;
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
          <OnboardingChoiceGrid
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
            isSubmitting={mutationBlocked}
          />
        </ChapterLayout>
      );
    case 'farm_system':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <OnboardingChoiceGrid
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
            isSubmitting={mutationBlocked}
          />
        </ChapterLayout>
      );
    case 'financial_plan':
      return (
        <ChapterLayout script={script}>
          {script ? <AssessmentPanel chapter={script} /> : null}
          <OnboardingChoiceGrid
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
          <OnboardingChoiceGrid
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
          <OnboardingChoiceGrid
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
