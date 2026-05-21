import type { ChapterScript, RevisedChapterScript } from '@mbd/sim-core';
import { OwnerMeetingView } from './chapters/OwnerMeetingView';
import { RosterAssessmentView } from './chapters/RosterAssessmentView';
import { FarmAssessmentView } from './chapters/FarmAssessmentView';
import { StaffEvaluationView } from './chapters/StaffEvaluationView';
import { FinancialView } from './chapters/FinancialView';
import { ScoutingBriefingView } from './chapters/ScoutingBriefingView';
import { SeasonStrategyView } from './chapters/SeasonStrategyView';
import { PressConferenceView } from './chapters/PressConferenceView';

interface AssessmentPanelProps {
  chapter: ChapterScript | RevisedChapterScript;
}

export function AssessmentPanel({ chapter }: AssessmentPanelProps) {
  const data = chapter.assessmentData;
  if (data == null) {
    return null;
  }

  const chapterId = chapter.chapter.id;

  switch (chapterId) {
    case 'owners_office':
      return data.owner ? <OwnerMeetingView data={data.owner} /> : null;
    case 'know_your_stars':
    case 'roster_review':
      return data.roster ? <RosterAssessmentView data={data.roster} /> : null;
    case 'the_farm':
    case 'farm_system':
      return data.farm ? <FarmAssessmentView data={data.farm} /> : null;
    case 'coaching_staff':
    case 'hire_coaches':
      return data.staff ? <StaffEvaluationView data={data.staff} /> : null;
    case 'financial_playbook':
    case 'financial_plan':
      return data.financial ? <FinancialView data={data.financial} /> : null;
    case 'scouting_intel':
    case 'hire_scouts':
      return data.scouting ? <ScoutingBriefingView data={data.scouting} /> : null;
    case 'season_strategy':
      return data.strategy ? <SeasonStrategyView data={data.strategy} /> : null;
    case 'press_conference':
      return data.press ? <PressConferenceView data={data.press} /> : null;
    default:
      return null;
  }
}
