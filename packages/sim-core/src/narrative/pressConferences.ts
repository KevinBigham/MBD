import { GameRNG } from '../math/prng.js';

export const PRESS_CONFERENCE_RESPONSE_TONES = [
  'confident',
  'measured',
  'deflect',
  'aggressive',
] as const;

export type PressConferenceResponseTone = (typeof PRESS_CONFERENCE_RESPONSE_TONES)[number];

export const PRESS_CONFERENCE_TOPIC_CATEGORIES = [
  'TRADE_DEADLINE',
  'PROSPECT_CALLUP',
  'LOSING_STREAK',
  'WINNING_STREAK',
  'INJURY_UPDATE',
  'RIVALRY_PREVIEW',
  'PENNANT_RACE',
  'OFFSEASON_PLANS',
  'MILESTONE_CHASE',
  'COACHING_CHANGE',
  'ALL_STAR_BREAK',
  'CONTROVERSY',
  'ARBITRATION',
  'HOLDOUT',
] as const;

export type PressConferenceTopicCategory = (typeof PRESS_CONFERENCE_TOPIC_CATEGORIES)[number];

export interface PressConferenceSeasonRange {
  startDay: number;
  endDay: number;
  offseasonOnly?: boolean;
}

export interface PressConferenceTopicContext {
  season: number;
  day: number;
  teamId: string;
  teamRecord: {
    wins: number;
    losses: number;
  };
  recentResults: Array<'W' | 'L'>;
  ownerTone: 'supportive' | 'neutral' | 'impatient';
  hasInjuredStar: boolean;
  hasRecentTrade: boolean;
  hasRecentCallup: boolean;
  isPlayoffContender: boolean;
  divisionRank: number;
  gamesBack: number;
  isOffseason?: boolean;
  hasPlayerNearMilestone?: boolean;
  hasRecentCoachingChange?: boolean;
  isAllStarBreak?: boolean;
  hasRecentControversy?: boolean;
  isDivisionRivalrySeries?: boolean;
}

export interface EnhancedPressConferenceResponse {
  id: string;
  label: string;
  tone: PressConferenceResponseTone;
  quote: string;
  moraleDelta: number;
  ownerDelta: number;
  fanSentimentDelta: number;
  generatesNews: boolean;
  followUpTopicId?: string;
}

export interface PressConferenceTopic {
  id: string;
  category: PressConferenceTopicCategory;
  questionTemplate: string;
  availableResponses: [
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
  ];
  seasonRange: PressConferenceSeasonRange;
  requiredContext: string[];
}

export interface EnhancedPressConference {
  id: string;
  topicId: string;
  category: PressConferenceTopicCategory;
  question: string;
  ownerTone: PressConferenceTopicContext['ownerTone'];
  teamId: string;
  season: number;
  day: number;
  responses: [
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
    EnhancedPressConferenceResponse,
  ];
}

export interface PressConferenceOutcome {
  conferenceId: string;
  responseId: string;
  tone: PressConferenceResponseTone;
  moraleDelta: number;
  ownerDelta: number;
  fanSentimentDelta: number;
  generatesNews: boolean;
  followUpTopicId: string | null;
  followUpTopic: PressConferenceTopic | null;
}

interface ResponseTemplateDefinition {
  label: string;
  quoteOptions: readonly string[];
  moraleDelta: number;
  ownerDelta: number;
  fanSentimentDelta: number;
  generatesNews: boolean;
  followUpTopicId?: string;
}

interface PressConferenceTopicDefinition {
  id: string;
  category: PressConferenceTopicCategory;
  questionOptions: readonly string[];
  seasonRange: PressConferenceSeasonRange;
  requiredContext: string[];
  priority: number;
  tieBreakWeight: number;
  relevance: (context: PressConferenceTopicContext) => number;
  responses: Record<PressConferenceResponseTone, ResponseTemplateDefinition>;
}

const DAY_ZERO = 0;
const FULL_SEASON_END_DAY = 200;
const TRADE_DEADLINE_START_DAY = 80;
const TRADE_DEADLINE_END_DAY = 100;
const ALL_STAR_BREAK_START_DAY = 84;
const ALL_STAR_BREAK_END_DAY = 92;
const PENNANT_RACE_START_DAY = 140;
const STREAK_TRIGGER_LENGTH = 5;
const CONTENDER_GAMES_BACK_MAX = 5;
const QUESTION_VARIANT_WEIGHT = 1;
const QUOTE_VARIANT_WEIGHT = 1;

const TOPIC_ID_BY_CATEGORY: Record<PressConferenceTopicCategory, string> = {
  TRADE_DEADLINE: 'trade-deadline',
  PROSPECT_CALLUP: 'prospect-callup',
  LOSING_STREAK: 'losing-streak',
  WINNING_STREAK: 'winning-streak',
  INJURY_UPDATE: 'injury-update',
  RIVALRY_PREVIEW: 'rivalry-preview',
  PENNANT_RACE: 'pennant-race',
  OFFSEASON_PLANS: 'offseason-plans',
  MILESTONE_CHASE: 'milestone-chase',
  COACHING_CHANGE: 'coaching-change',
  ALL_STAR_BREAK: 'all-star-break',
  CONTROVERSY: 'controversy',
  ARBITRATION: 'arbitration',
  HOLDOUT: 'holdout',
};

const ROLE_COMPETITION_WEIGHT = 3;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countOpeningStreak(results: Array<'W' | 'L'>, result: 'W' | 'L'): number {
  let streak = 0;
  for (const entry of results) {
    if (entry !== result) {
      break;
    }
    streak += 1;
  }
  return streak;
}

function isWithinSeasonRange(
  seasonRange: PressConferenceSeasonRange,
  context: PressConferenceTopicContext,
): boolean {
  if (seasonRange.offseasonOnly) {
    return Boolean(context.isOffseason);
  }

  if (context.isOffseason) {
    return false;
  }

  return context.day >= seasonRange.startDay && context.day <= seasonRange.endDay;
}

function pickWeightedVariant(rng: GameRNG, variants: readonly string[]): string {
  return rng.weightedPick(
    variants,
    variants.map(() => QUESTION_VARIANT_WEIGHT),
  );
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.max(1, hash >>> 0);
}

function ownerToneLead(ownerTone: PressConferenceTopicContext['ownerTone']): string {
  switch (ownerTone) {
    case 'supportive':
      return 'A steady voice from the room set it up this way:';
    case 'impatient':
      return 'The room pushed for a sharper answer:';
    default:
      return 'The room asked the obvious question:';
  }
}

function responseTemplate(
  label: string,
  quoteOptions: readonly string[],
  moraleDelta: number,
  ownerDelta: number,
  fanSentimentDelta: number,
  generatesNews: boolean,
  followUpTopicId?: string,
): ResponseTemplateDefinition {
  return {
    label,
    quoteOptions,
    moraleDelta,
    ownerDelta,
    fanSentimentDelta,
    generatesNews,
    followUpTopicId,
  };
}

const PRESS_CONFERENCE_TOPIC_DEFINITIONS: readonly PressConferenceTopicDefinition[] = [
  {
    id: TOPIC_ID_BY_CATEGORY.TRADE_DEADLINE,
    category: 'TRADE_DEADLINE',
    questionOptions: [
      'The deadline is closing in. Are you buying, selling, or holding this roster together?',
      'The market is moving. How aggressive will you be before the deadline passes?',
    ],
    seasonRange: { startDay: TRADE_DEADLINE_START_DAY, endDay: TRADE_DEADLINE_END_DAY },
    requiredContext: ['Day must fall between 80 and 100.'],
    priority: 3,
    tieBreakWeight: 4,
    relevance: (context) => (context.day >= TRADE_DEADLINE_START_DAY && context.day <= TRADE_DEADLINE_END_DAY ? 80 + (context.isPlayoffContender ? 10 : 0) : 0),
    responses: {
      confident: responseTemplate(
        'We are in the hunt',
        [
          'We know where this club stands, and we will act like contenders.',
          'Our board is set. If a real upgrade is there, we will move fast.',
        ],
        3,
        4,
        2,
        true,
      ),
      measured: responseTemplate(
        'We will stay disciplined',
        [
          'The deadline rewards patience as much as aggression. We will not chase noise.',
          'We owe the clubhouse a smart deadline, not a loud one.',
        ],
        1,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'Our focus is today',
        [
          'I am not negotiating through microphones. We have games to win tonight.',
          'The staff is preparing for tonight, not feeding rumor cycles.',
        ],
        0,
        -1,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'No one is untouchable',
        [
          'If the price makes sense, every part of this roster is on the table.',
          'We are not sentimental. We are here to improve the organization.',
        ],
        -2,
        3,
        -2,
        true,
        TOPIC_ID_BY_CATEGORY.CONTROVERSY,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.PROSPECT_CALLUP,
    category: 'PROSPECT_CALLUP',
    questionOptions: [
      'You just brought up a prospect. Why was this the right moment?',
      'Fans have waited on this promotion. What convinced you to make the call now?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['A recent call-up must have occurred.'],
    priority: 3,
    tieBreakWeight: 3,
    relevance: (context) => (context.hasRecentCallup ? 88 : 0),
    responses: {
      confident: responseTemplate(
        'He earned this',
        [
          'He forced the issue with his work. This is a reward for performance, not hope.',
          'The player earned the room and the roster spot. We trust him.',
        ],
        4,
        2,
        3,
        true,
      ),
      measured: responseTemplate(
        'We will support him',
        [
          'Development does not stop in the majors. We will put him in spots to succeed.',
          'The next step is structure and support, not pressure.',
        ],
        2,
        1,
        2,
        false,
      ),
      deflect: responseTemplate(
        'The roster needed a move',
        [
          'Roster decisions are fluid. We will see how the next few weeks unfold.',
          'It was the right roster move for now. We will let the results speak.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'He is here to change us',
        [
          'We did not bring him here to sit quietly. He is here to raise the standard.',
          'If veterans are uncomfortable with competition, that is their problem.',
        ],
        3,
        -1,
        -2,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.LOSING_STREAK,
    category: 'LOSING_STREAK',
    questionOptions: [
      'This club has dropped several in a row. What needs to change immediately?',
      'The losses are stacking up. How do you stop the slide before it spreads?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['Five or more consecutive losses in recent results.'],
    priority: 4,
    tieBreakWeight: 3,
    relevance: (context) => {
      const streak = countOpeningStreak(context.recentResults, 'L');
      return streak >= STREAK_TRIGGER_LENGTH ? 85 + streak : 0;
    },
    responses: {
      confident: responseTemplate(
        'We will snap it fast',
        [
          'Bad stretches happen. This one ends because we are too talented to let it linger.',
          'I know exactly what needs cleaning up, and it is already being addressed.',
        ],
        2,
        1,
        1,
        true,
      ),
      measured: responseTemplate(
        'We have to tighten details',
        [
          'The margin has been thin. Better execution, cleaner baseball, and steadier at-bats will matter.',
          'We need calmer baseball. The answer is discipline, not panic.',
        ],
        1,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'The season is long',
        [
          'You do not rewrite the whole organization over one ugly week.',
          'The noise gets louder during a skid. We are not making emotional decisions.',
        ],
        -1,
        -1,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'Jobs are being evaluated',
        [
          'No one should assume their role is safe if this standard continues.',
          'Accountability is here now, not at the end of the month.',
        ],
        -3,
        3,
        -2,
        true,
        TOPIC_ID_BY_CATEGORY.CONTROVERSY,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.WINNING_STREAK,
    category: 'WINNING_STREAK',
    questionOptions: [
      'The club is rolling right now. What is driving this run?',
      'You have built real momentum. What feels different inside the room?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['Five or more consecutive wins in recent results.'],
    priority: 3,
    tieBreakWeight: 3,
    relevance: (context) => {
      const streak = countOpeningStreak(context.recentResults, 'W');
      return streak >= STREAK_TRIGGER_LENGTH ? 82 + streak : 0;
    },
    responses: {
      confident: responseTemplate(
        'We expected this',
        [
          'This is what the roster was built to look like when everyone pulls together.',
          'The group believes it belongs here, and that matters.',
        ],
        4,
        2,
        2,
        true,
      ),
      measured: responseTemplate(
        'The process is better',
        [
          'The at-bat quality and game planning have improved. That is more sustainable than a hot streak.',
          'We are doing more small things well, and the scoreboard is reflecting it.',
        ],
        2,
        1,
        1,
        false,
      ),
      deflect: responseTemplate(
        'Tomorrow resets it',
        [
          'Momentum is useful only if you respect how fast it can disappear.',
          'The next game matters more than the last five.',
        ],
        1,
        0,
        0,
        false,
      ),
      aggressive: responseTemplate(
        'The division should notice',
        [
          'Other teams should understand this race just changed shape.',
          'We are done acting like the standings are settled.',
        ],
        3,
        1,
        3,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.INJURY_UPDATE,
    category: 'INJURY_UPDATE',
    questionOptions: [
      'A star player is down. How does the club absorb that hit?',
      'Losing a centerpiece changes the outlook. What is your message to the roster?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['A star injury must be active.'],
    priority: 5,
    tieBreakWeight: 3,
    relevance: (context) => (context.hasInjuredStar ? 96 : 0),
    responses: {
      confident: responseTemplate(
        'We have enough depth',
        [
          'That player matters, but this is still a complete organization.',
          'Depth is why you invest in a roster instead of one name.',
        ],
        2,
        1,
        0,
        true,
      ),
      measured: responseTemplate(
        'We have to absorb it together',
        [
          'No single player replaces that production. The answer has to be collective.',
          'We will adjust the workload and support the next man up.',
        ],
        1,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'Medical updates come first',
        [
          'I am not speculating beyond what the medical staff has confirmed.',
          'We will keep the focus on recovery and let the timetable settle.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'This is why others are here',
        [
          'If backup plans cannot handle one injury, they were never real plans.',
          'Now we learn who is serious about helping us survive this.',
        ],
        -2,
        -1,
        -2,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.RIVALRY_PREVIEW,
    category: 'RIVALRY_PREVIEW',
    questionOptions: [
      'A division rival is next. Does this series feel different inside your room?',
      'These rivalry games tend to carry extra weight. How much do you lean into that?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['An upcoming division rivalry series must be active.'],
    priority: 2,
    tieBreakWeight: 2,
    relevance: (context) => (context.isDivisionRivalrySeries ? 76 + ROLE_COMPETITION_WEIGHT : 0),
    responses: {
      confident: responseTemplate(
        'The room knows what this means',
        [
          'You do not have to manufacture energy for this series. It is already there.',
          'The players understand the standings and the history. That focus is enough.',
        ],
        3,
        1,
        2,
        true,
      ),
      measured: responseTemplate(
        'It still counts as one series',
        [
          'The stakes are obvious, but the preparation has to stay ordinary.',
          'Emotion helps only if execution survives it.',
        ],
        1,
        1,
        1,
        false,
      ),
      deflect: responseTemplate(
        'We respect every opponent',
        [
          'The schedule calls it a rivalry. We still need to pitch, defend, and execute.',
          'The standings care about wins, not slogans.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'We want to make a statement',
        [
          'If you want separation in the division, take it from the teams near you.',
          'This is not a series to tiptoe through.',
        ],
        2,
        1,
        3,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.PENNANT_RACE,
    category: 'PENNANT_RACE',
    questionOptions: [
      'September pressure is here. How does the club handle the pennant race tightening up?',
      'You are within striking distance late. What has to hold under September pressure?',
    ],
    seasonRange: { startDay: PENNANT_RACE_START_DAY, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['Day must be in September range and team must be within five games of first.'],
    priority: 4,
    tieBreakWeight: 4,
    relevance: (context) => (
      !context.isOffseason
      && context.day >= PENNANT_RACE_START_DAY
      && context.isPlayoffContender
      && context.gamesBack <= CONTENDER_GAMES_BACK_MAX
        ? 90 + (CONTENDER_GAMES_BACK_MAX - Math.floor(context.gamesBack))
        : 0
    ),
    responses: {
      confident: responseTemplate(
        'Pressure is the point',
        [
          'If you want October baseball, you have to welcome September heat.',
          'We built this group to play meaningful games now, not hide from them.',
        ],
        4,
        3,
        2,
        true,
      ),
      measured: responseTemplate(
        'We need clean baseball',
        [
          'The race will punish giveaways. Our margin is execution and recovery between games.',
          'The answer is calmer baseball, not bigger speeches.',
        ],
        2,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'The standings will move either way',
        [
          'We gain nothing by staring at the scoreboard every night.',
          'The math changes daily. The work cannot.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'We are coming for the lead',
        [
          'The teams ahead of us should feel us now.',
          'We are not chasing a wild card mindset. We want the top of the board.',
        ],
        3,
        2,
        3,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.OFFSEASON_PLANS,
    category: 'OFFSEASON_PLANS',
    questionOptions: [
      'The season is over. What does your offseason blueprint look like?',
      'With the offseason underway, where does the organization need the most work?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY, offseasonOnly: true },
    requiredContext: ['The game must be in an offseason phase.'],
    priority: 2,
    tieBreakWeight: 2,
    relevance: (context) => (context.isOffseason ? 84 : 0),
    responses: {
      confident: responseTemplate(
        'We know our needs',
        [
          'The board is clear. We know which holes are urgent and which bets are worth making.',
          'The offseason starts with a plan, not a shopping spree.',
        ],
        1,
        3,
        1,
        true,
      ),
      measured: responseTemplate(
        'We will audit everything',
        [
          'The right answer might be player development, not just spending.',
          'We owe the roster a clear-eyed review before we make promises.',
        ],
        0,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'It is too early for specifics',
        [
          'The offseason has stages. We are not skipping to the headline phase.',
          'We will not announce targets through a press room.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'Some roles will turn over',
        [
          'Comfort is over. We need sharper competition everywhere.',
          'The standard is higher than what we just showed.',
        ],
        -1,
        2,
        -2,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.MILESTONE_CHASE,
    category: 'MILESTONE_CHASE',
    questionOptions: [
      'A player is closing on a milestone. Do you let the moment breathe or keep it ordinary?',
      'The milestone watch is getting louder. How do you balance the individual moment with team goals?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['A player must be nearing a major milestone.'],
    priority: 2,
    tieBreakWeight: 2,
    relevance: (context) => (context.hasPlayerNearMilestone ? 79 : 0),
    responses: {
      confident: responseTemplate(
        'It is earned attention',
        [
          'Milestones matter because the work behind them matters.',
          'The room can celebrate it and still keep the team first.',
        ],
        2,
        1,
        2,
        true,
      ),
      measured: responseTemplate(
        'The team goal stays first',
        [
          'It is a meaningful moment, but our preparation cannot drift.',
          'We acknowledge it without letting it pull focus from wins.',
        ],
        1,
        2,
        1,
        false,
      ),
      deflect: responseTemplate(
        'The player has earned privacy too',
        [
          'Not every personal milestone needs a daily countdown from me.',
          'He knows what is in front of him. That is enough.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'The team should match that standard',
        [
          'If one player can handle that spotlight, everyone else can handle a little pressure too.',
          'A milestone should raise the standard around him, not distract from it.',
        ],
        1,
        -1,
        -1,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.COACHING_CHANGE,
    category: 'COACHING_CHANGE',
    questionOptions: [
      'You made a coaching change. What problem were you trying to solve?',
      'After the staff move, what do you expect to change first inside the team?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['A recent coaching hire or firing must have occurred.'],
    priority: 4,
    tieBreakWeight: 3,
    relevance: (context) => (context.hasRecentCoachingChange ? 89 : 0),
    responses: {
      confident: responseTemplate(
        'The staff needed a jolt',
        [
          'Good organizations act before drift becomes identity.',
          'The move was about clarity, standards, and faster correction.',
        ],
        1,
        3,
        1,
        true,
      ),
      measured: responseTemplate(
        'We were not aligned enough',
        [
          'It was a fit decision, not a public performance.',
          'The goal is stronger communication and cleaner development work.',
        ],
        0,
        2,
        0,
        false,
      ),
      deflect: responseTemplate(
        'Staff matters stay inside',
        [
          'I am not turning internal conversations into theater.',
          'The staff deserves professional handling, not a press-room reenactment.',
        ],
        -1,
        -1,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'Standards were not being met',
        [
          'We do not carry misalignment just because it is comfortable.',
          'The message is simple: standards matter more than titles.',
        ],
        -2,
        2,
        -2,
        true,
        TOPIC_ID_BY_CATEGORY.CONTROVERSY,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.ALL_STAR_BREAK,
    category: 'ALL_STAR_BREAK',
    questionOptions: [
      'The All-Star break is here. What has your first-half read been on this club?',
      'At the break, where has the team exceeded expectations and where has it lagged?',
    ],
    seasonRange: { startDay: ALL_STAR_BREAK_START_DAY, endDay: ALL_STAR_BREAK_END_DAY },
    requiredContext: ['The game must be at the All-Star break.'],
    priority: 4,
    tieBreakWeight: 2,
    relevance: (context) => (
      context.isAllStarBreak || (context.day >= ALL_STAR_BREAK_START_DAY && context.day <= ALL_STAR_BREAK_END_DAY)
        ? 77
        : 0
    ),
    responses: {
      confident: responseTemplate(
        'We are positioned well',
        [
          'The first half built a base we can press from.',
          'This club has shown enough to justify bigger expectations.',
        ],
        2,
        2,
        2,
        true,
      ),
      measured: responseTemplate(
        'The second half will define us',
        [
          'There are good signs, but too much unfinished work to celebrate early.',
          'The break is for recalibration, not self-congratulation.',
        ],
        1,
        1,
        1,
        false,
      ),
      deflect: responseTemplate(
        'The calendar does not hand out prizes',
        [
          'A midpoint is useful only if it sharpens the next decision.',
          'We will use the pause and move on.',
        ],
        0,
        0,
        -1,
        false,
      ),
      aggressive: responseTemplate(
        'Some players need a stronger second half',
        [
          'The second half will expose who is comfortable and who is committed.',
          'Our expectations are rising, and some people will feel that.',
        ],
        -1,
        1,
        -1,
        true,
      ),
    },
  },
  {
    id: TOPIC_ID_BY_CATEGORY.CONTROVERSY,
    category: 'CONTROVERSY',
    questionOptions: [
      'The last move has stirred criticism. Do you think the backlash is fair?',
      'There is real controversy around the organization right now. How do you answer it?',
    ],
    seasonRange: { startDay: DAY_ZERO, endDay: FULL_SEASON_END_DAY },
    requiredContext: ['A recent controversy, bad trade, or firing must exist.'],
    priority: 5,
    tieBreakWeight: 5,
    relevance: (context) => {
      if (context.hasRecentControversy) {
        return 97;
      }
      if (context.hasRecentTrade && context.ownerTone === 'impatient') {
        return 90;
      }
      return 0;
    },
    responses: {
      confident: responseTemplate(
        'We can defend the decision',
        [
          'Short-term noise does not change the quality of the decision.',
          'Leadership has to survive criticism without flinching.',
        ],
        1,
        2,
        -1,
        true,
      ),
      measured: responseTemplate(
        'Time has to settle it',
        [
          'People are reacting before the full picture can play out.',
          'Some decisions look worse before they look right.',
        ],
        0,
        1,
        -1,
        false,
      ),
      deflect: responseTemplate(
        'I am not feeding the cycle',
        [
          'The loudest voices are rarely the most useful ones.',
          'I have no interest in extending a manufactured storm.',
        ],
        -1,
        -2,
        -2,
        false,
      ),
      aggressive: responseTemplate(
        'Criticism is cheap',
        [
          'Everyone loves bold decisions after they work. Few can stomach them before.',
          'We are not here to win a popularity poll.',
        ],
        -3,
        1,
        -3,
        true,
      ),
    },
  },
] as const;

function buildResponse(
  rng: GameRNG,
  conferenceId: string,
  topic: PressConferenceTopicDefinition,
  tone: PressConferenceResponseTone,
): EnhancedPressConferenceResponse {
  const template = topic.responses[tone];
  return {
    id: `${conferenceId}-${tone}`,
    label: template.label,
    tone,
    quote: rng.weightedPick(
      template.quoteOptions,
      template.quoteOptions.map(() => QUOTE_VARIANT_WEIGHT),
    ),
    moraleDelta: template.moraleDelta,
    ownerDelta: template.ownerDelta,
    fanSentimentDelta: template.fanSentimentDelta,
    generatesNews: template.generatesNews,
    followUpTopicId: template.followUpTopicId,
  };
}

function materializeTopic(
  rng: GameRNG,
  definition: PressConferenceTopicDefinition,
): PressConferenceTopic {
  const baseConferenceId = `topic-template-${definition.id}`;
  return {
    id: definition.id,
    category: definition.category,
    questionTemplate: pickWeightedVariant(rng, definition.questionOptions),
    availableResponses: PRESS_CONFERENCE_RESPONSE_TONES.map((tone) =>
      buildResponse(rng, baseConferenceId, definition, tone),
    ) as PressConferenceTopic['availableResponses'],
    seasonRange: definition.seasonRange,
    requiredContext: [...definition.requiredContext],
  };
}

function definitionById(id: string): PressConferenceTopicDefinition | null {
  return PRESS_CONFERENCE_TOPIC_DEFINITIONS.find((definition) => definition.id === id) ?? null;
}

function conferenceId(topicId: string, context: PressConferenceTopicContext): string {
  return `press-conference-${context.teamId}-${context.season}-${context.day}-${topicId}`;
}

function parseConferenceId(value: string): { teamId: string; season: number; day: number; topicId: string } | null {
  const match = /^press-conference-([a-z]+)-(\d+)-(\d+)-(.+)$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    teamId: match[1] ?? '',
    season: Number(match[2]),
    day: Number(match[3]),
    topicId: match[4] ?? '',
  };
}

function parseResponseTone(responseId: string): PressConferenceResponseTone | null {
  const tone = responseId.split('-').pop();
  if (!tone) {
    return null;
  }

  return PRESS_CONFERENCE_RESPONSE_TONES.find((entry) => entry === tone) ?? null;
}

export function selectPressConferenceTopic(
  rng: GameRNG,
  context: PressConferenceTopicContext,
): PressConferenceTopic | null {
  const matches = PRESS_CONFERENCE_TOPIC_DEFINITIONS
    .filter((definition) => isWithinSeasonRange(definition.seasonRange, context))
    .map((definition) => ({
      definition,
      relevance: definition.relevance(context),
    }))
    .filter((entry) => entry.relevance > 0);

  if (matches.length === 0) {
    return null;
  }

  const highestPriority = Math.max(...matches.map((entry) => entry.definition.priority));
  const priorityMatches = matches.filter((entry) => entry.definition.priority === highestPriority);
  const highestRelevance = Math.max(...priorityMatches.map((entry) => entry.relevance));
  const finalMatches = priorityMatches.filter((entry) => entry.relevance === highestRelevance);
  const chosen = finalMatches.length === 1
    ? finalMatches[0]!.definition
    : rng.weightedPick(
      finalMatches.map((entry) => entry.definition),
      finalMatches.map((entry) => entry.definition.tieBreakWeight),
    );

  return materializeTopic(rng, chosen);
}

export function generateEnhancedPressConference(
  rng: GameRNG,
  context: PressConferenceTopicContext,
): EnhancedPressConference | null {
  const topic = selectPressConferenceTopic(rng, context);
  if (!topic) {
    return null;
  }

  const resolvedConferenceId = conferenceId(topic.id, context);

  return {
    id: resolvedConferenceId,
    topicId: topic.id,
    category: topic.category,
    question: `${ownerToneLead(context.ownerTone)} ${topic.questionTemplate}`,
    ownerTone: context.ownerTone,
    teamId: context.teamId,
    season: context.season,
    day: context.day,
    responses: PRESS_CONFERENCE_RESPONSE_TONES.map((tone) =>
      buildResponse(rng, resolvedConferenceId, definitionById(topic.id)!, tone),
    ) as EnhancedPressConference['responses'],
  };
}

export function evaluatePressConferenceResponse(
  conferenceIdValue: string,
  responseId: string,
): PressConferenceOutcome {
  const parsedConference = parseConferenceId(conferenceIdValue);
  const tone = parseResponseTone(responseId);
  if (!parsedConference || !tone) {
    throw new Error('Invalid press conference identifier.');
  }

  const definition = definitionById(parsedConference.topicId);
  if (!definition) {
    throw new Error(`Unknown press conference topic: ${parsedConference.topicId}`);
  }

  const response = definition.responses[tone];
  const followUpTopic = response.followUpTopicId
    ? materializeTopic(new GameRNG(hashString(`${conferenceIdValue}:${response.followUpTopicId}`)), definitionById(response.followUpTopicId)!)
    : null;

  return {
    conferenceId: conferenceIdValue,
    responseId,
    tone,
    moraleDelta: response.moraleDelta,
    ownerDelta: response.ownerDelta,
    fanSentimentDelta: response.fanSentimentDelta,
    generatesNews: response.generatesNews,
    followUpTopicId: response.followUpTopicId ?? null,
    followUpTopic,
  };
}
