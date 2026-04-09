import type { ChapterScript } from '@mbd/sim-core';
import { OwnerMeetingView } from './chapters/OwnerMeetingView';
import { RosterAssessmentView } from './chapters/RosterAssessmentView';
import { FarmAssessmentView } from './chapters/FarmAssessmentView';
import { StaffEvaluationView } from './chapters/StaffEvaluationView';
import { FinancialView } from './chapters/FinancialView';
import { ScoutingBriefingView } from './chapters/ScoutingBriefingView';
import { SeasonStrategyView } from './chapters/SeasonStrategyView';
import { PressConferenceView } from './chapters/PressConferenceView';

interface AssessmentPanelProps {
  chapter: ChapterScript;
}

export function AssessmentPanel({ chapter }: AssessmentPanelProps) {
  const data = chapter.assessmentData;
  const chapterId = chapter.chapter.id;

  switch (chapterId) {
    case 'owners_office':
      return data.owner ? <OwnerMeetingView data={data.owner} /> : null;
    case 'know_your_stars':
      return data.roster ? <RosterAssessmentView data={data.roster} /> : null;
    case 'the_farm':
      return data.farm ? <FarmAssessmentView data={data.farm} /> : null;
    case 'coaching_staff':
      return data.staff ? <StaffEvaluationView data={data.staff} /> : null;
    case 'financial_playbook':
      return data.financial ? <FinancialView data={data.financial} /> : null;
    case 'scouting_intel':
      return data.scouting ? <ScoutingBriefingView data={data.scouting} /> : null;
    case 'season_strategy':
      return data.strategy ? <SeasonStrategyView data={data.strategy} /> : null;
    case 'press_conference':
      return data.press ? <PressConferenceView data={data.press} /> : null;
    default:
      return null;
  }
}
