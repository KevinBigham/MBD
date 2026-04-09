import type { GameRNG } from '../math/prng.js';
import type { AssistantGMProfile } from './assistantGM.js';
import type { DialogueLine } from './chapterDialogue.js';
import type { GMPhilosophy } from './flowEngine.js';

export interface ChoiceReaction {
  agreement: 'strongly_agree' | 'agree' | 'neutral' | 'disagree' | 'strongly_disagree';
  dialogueLines: DialogueLine[];
  recommendation: string | null;
  alternativeSuggestion: string | null;
}

function makeLine(
  text: string,
  tone: DialogueLine['tone'],
  referencedStat: string,
): DialogueLine {
  return {
    speaker: 'assistant_gm',
    text,
    tone,
    emphasis: null,
    referencedPlayerName: null,
    referencedStat,
  };
}

function disagreeText(profile: AssistantGMProfile, wrongCall: string, why: string): string {
  switch (profile.personality) {
    case 'straight_shooter':
      return `I'll be honest. ${wrongCall} ${why}`;
    case 'dry_wit':
      return `${wrongCall} Bold choice. The kind of bold that keeps a front office up at night. ${why}`;
    case 'enthusiastic_mentor':
      return `I like the conviction, but ${why}`;
    case 'grizzled_veteran':
      return `I've seen this call before, and it usually gets expensive. ${why}`;
    case 'analytical_mind':
    default:
      return `${wrongCall} The evidence points the other way. ${why}`;
  }
}

function agreeText(profile: AssistantGMProfile, message: string): string {
  switch (profile.personality) {
    case 'enthusiastic_mentor':
      return `${message} I like that.`;
    case 'dry_wit':
      return `${message} Nice when the obvious answer is also the smart one.`;
    case 'grizzled_veteran':
      return `${message} That is how clubs avoid talking themselves into trouble.`;
    case 'analytical_mind':
      return `${message} The numbers support it.`;
    case 'straight_shooter':
    default:
      return message;
  }
}

function toneForAgreement(agreement: ChoiceReaction['agreement']): DialogueLine['tone'] {
  switch (agreement) {
    case 'strongly_agree':
      return 'excited';
    case 'agree':
      return 'encouraging';
    case 'neutral':
      return 'informative';
    case 'disagree':
      return 'cautionary';
    case 'strongly_disagree':
    default:
      return 'concerned';
  }
}

function recommendationFromAgreement(
  agreement: ChoiceReaction['agreement'],
  preferred: string | null,
): Pick<ChoiceReaction, 'recommendation' | 'alternativeSuggestion'> {
  if (agreement === 'disagree' || agreement === 'strongly_disagree') {
    return {
      recommendation: `It's your call, and I'll make it work. Keep a close eye on the downside if you stay here.`,
      alternativeSuggestion: preferred,
    };
  }

  return {
    recommendation: preferred == null ? null : `This choice lines up with the board. Stay committed once you make it.`,
    alternativeSuggestion: null,
  };
}

function isDisagreement(agreement: ChoiceReaction['agreement']): boolean {
  return agreement === 'disagree' || agreement === 'strongly_disagree';
}

function seasonGoalAgreement(goal: GMPhilosophy['seasonGoal'], teamStrength: number): ChoiceReaction['agreement'] {
  if (goal === 'championship') {
    if (teamStrength >= 82) return 'strongly_agree';
    if (teamStrength >= 70) return 'agree';
    if (teamStrength >= 60) return 'neutral';
    if (teamStrength >= 50) return 'disagree';
    return 'strongly_disagree';
  }
  if (goal === 'rebuild') {
    if (teamStrength >= 82) return 'strongly_disagree';
    if (teamStrength >= 70) return 'disagree';
    if (teamStrength >= 60) return 'neutral';
    if (teamStrength >= 50) return 'agree';
    return 'strongly_agree';
  }
  if (goal === 'playoff') {
    if (teamStrength >= 75) return 'agree';
    if (teamStrength >= 60) return 'neutral';
    return 'disagree';
  }
  return teamStrength >= 65 ? 'agree' : 'neutral';
}

export function reactToSeasonGoal(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  goal: GMPhilosophy['seasonGoal'],
  teamStrength: number,
): ChoiceReaction {
  const agreement = seasonGoalAgreement(goal, teamStrength);
  const preferred = teamStrength >= 75 ? 'championship' : teamStrength <= 55 ? 'rebuild' : 'playoff';
  const lead = agreement === 'disagree' || agreement === 'strongly_disagree'
    ? disagreeText(profile, `${goal} does not match this roster yet.`, `Team strength is sitting at ${teamStrength}.`)
    : agreeText(profile, `${goal} matches the club better than most front offices admit.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `team strength ${teamStrength}`),
      makeLine(`That number tells me whether this room should push, hold, or start over.`, toneForAgreement(agreement), `team strength ${teamStrength}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === goal ? null : preferred),
  };
}

function gradeRank(grade: string): number {
  switch (grade) {
    case 'A':
      return 5;
    case 'B':
      return 4;
    case 'C':
      return 3;
    case 'D':
      return 2;
    case 'F':
    default:
      return 1;
  }
}

export function reactToDevelopmentStyle(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  style: GMPhilosophy['developmentStyle'],
  farmGrade: string,
): ChoiceReaction {
  const rank = gradeRank(farmGrade);
  const agreement =
    style === 'aggressive' ? (rank >= 4 ? 'agree' : rank <= 2 ? 'disagree' : 'neutral')
      : style === 'patient' ? (rank <= 2 ? 'strongly_agree' : rank >= 5 ? 'neutral' : 'agree')
        : 'neutral';
  const preferred = rank >= 4 ? 'aggressive' : rank <= 2 ? 'patient' : 'balanced';
  const lead = isDisagreement(agreement)
    ? disagreeText(profile, `${style} development is risky here.`, `A farm grade of ${farmGrade} needs more protection.`)
    : agreeText(profile, `${style} development fits what the pipeline can support.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `farm grade ${farmGrade}`),
      makeLine(`Development style changes how hard you press a ${farmGrade} system.`, toneForAgreement(agreement), `farm grade ${farmGrade}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === style ? null : preferred),
  };
}

export function reactToSpendingStyle(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  style: GMPhilosophy['spendingStyle'],
  financialGrade: string,
): ChoiceReaction {
  const rank = gradeRank(financialGrade);
  const agreement =
    style === 'big_spender' ? (rank >= 4 ? 'agree' : rank === 3 ? 'neutral' : 'strongly_disagree')
      : style === 'penny_pincher' ? (rank <= 2 ? 'strongly_agree' : rank >= 5 ? 'disagree' : 'agree')
        : 'neutral';
  const preferred = rank >= 4 ? 'big_spender' : rank <= 2 ? 'penny_pincher' : 'balanced';
  const lead = isDisagreement(agreement)
    ? disagreeText(profile, `${style} spending is the wrong fit.`, `A financial grade of ${financialGrade} cannot carry that posture cleanly.`)
    : agreeText(profile, `${style} spending lines up with the budget picture.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `financial grade ${financialGrade}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === style ? null : preferred),
  };
}

export function reactToTradeApproach(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  approach: GMPhilosophy['tradeApproach'],
  windowStatus: string,
): ChoiceReaction {
  const agreement =
    approach === 'buyer' ? (windowStatus === 'win_now' || windowStatus === 'stable_contender' ? 'strongly_agree' : windowStatus === 'rebuild' ? 'strongly_disagree' : 'neutral')
      : approach === 'seller' ? (windowStatus === 'rebuild' ? 'strongly_agree' : windowStatus === 'win_now' ? 'strongly_disagree' : 'disagree')
        : windowStatus === 'transitioning' || windowStatus === 'retooling' ? 'agree' : 'neutral';
  const preferred =
    windowStatus === 'win_now' || windowStatus === 'stable_contender' ? 'buyer'
      : windowStatus === 'rebuild' ? 'seller'
        : 'opportunistic';
  const lead = isDisagreement(agreement)
    ? disagreeText(profile, `${approach} is out of sync with the window.`, `This club reads like ${windowStatus.replaceAll('_', ' ')}.`)
    : agreeText(profile, `${approach} fits a ${windowStatus.replaceAll('_', ' ')} club.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `window ${windowStatus}`),
      makeLine(`Trade posture is where philosophy starts costing assets.`, toneForAgreement(agreement), `window ${windowStatus}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === approach ? null : preferred),
  };
}

export function reactToScoutingFocus(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  focus: GMPhilosophy['scoutingFocus'],
  farmGrade: string,
): ChoiceReaction {
  const rank = gradeRank(farmGrade);
  const agreement =
    focus === 'draft' ? (rank <= 3 ? 'agree' : 'neutral')
      : focus === 'pro_scouting' ? (rank >= 4 ? 'agree' : 'neutral')
        : rank <= 2 ? 'disagree' : 'neutral';
  const preferred = rank >= 4 ? 'pro_scouting' : 'draft';
  const lead = isDisagreement(agreement)
    ? disagreeText(profile, `${focus} is not the first lane I would fund.`, `A farm grade of ${farmGrade} suggests a different priority.`)
    : agreeText(profile, `${focus} is a defensible scouting lane for this board.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `farm grade ${farmGrade}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === focus ? null : preferred),
  };
}

export function reactToMediaTone(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  tone: GMPhilosophy['mediaTone'],
): ChoiceReaction {
  const preferred =
    profile.personality === 'analytical_mind' ? 'measured'
      : profile.personality === 'grizzled_veteran' ? 'humble'
        : profile.personality === 'enthusiastic_mentor' ? 'confident'
          : 'measured';
  const agreement =
    tone === preferred ? 'agree'
      : tone === 'measured' ? 'neutral'
        : 'disagree';
  const lead = isDisagreement(agreement)
    ? disagreeText(profile, `${tone} is a risky public posture.`, `I would rather open with ${preferred}.`)
    : agreeText(profile, `${tone} works if the clubhouse can wear it for six months.`);

  return {
    agreement,
    dialogueLines: [
      makeLine(lead, toneForAgreement(agreement), `media tone ${tone}`),
    ],
    ...recommendationFromAgreement(agreement, preferred === tone ? null : preferred),
  };
}
