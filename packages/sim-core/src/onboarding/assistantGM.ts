import type { GameRNG } from '../math/prng.js';
import type { GMPhilosophy } from './flowEngine.js';
import { pickTemplate } from './shared.js';

export type AssistantGMBackground =
  | 'former_player'
  | 'career_scout'
  | 'front_office_lifer'
  | 'analytics_pioneer'
  | 'old_school_baseball_man';

export type AssistantGMPersonality =
  | 'straight_shooter'
  | 'dry_wit'
  | 'enthusiastic_mentor'
  | 'grizzled_veteran'
  | 'analytical_mind';

export interface BaseballPhilosophy {
  pitchingOrHitting: 'pitching_wins' | 'offense_wins' | 'balanced';
  developmentVsFA: 'grow_your_own' | 'buy_stars' | 'hybrid';
  riskTolerance: 'conservative' | 'calculated' | 'aggressive';
}

export interface DialogueVoice {
  formality: 'casual' | 'professional' | 'folksy';
  usesAnalogy: boolean;
  usesStats: boolean;
  emotionalRange: 'reserved' | 'moderate' | 'expressive';
}

export interface AssistantGMProfile {
  name: string;
  nickname: string;
  age: number;
  background: AssistantGMBackground;
  personality: AssistantGMPersonality;
  baseballPhilosophy: BaseballPhilosophy;
  catchphrase: string;
  yearsInBaseball: number;
  bio: string;
}

const AGE_MIN = 45;
const AGE_MAX = 70;
const YEARS_IN_BASEBALL_MIN = 18;
const YEARS_IN_BASEBALL_MAX = 45;
const NAME_PART_COUNT = 2;

const FIRST_NAMES = [
  'Jack',
  'Frank',
  'Eddie',
  'Walter',
  'Tommy',
  'Ray',
  'Cal',
  'Pete',
  'Marty',
  'Lou',
  'Darren',
  'Sam',
  'Nick',
  'Bobby',
  'Lenny',
  'Max',
  'Victor',
  'Tony',
  'Dean',
  'Ron',
] as const;

const LAST_NAMES = [
  'Mercer',
  'Doyle',
  'Keller',
  'Sutton',
  'Pritchard',
  'Marlowe',
  'Hollis',
  'Keegan',
  'Bishop',
  'Rowan',
  'Caldwell',
  'Tanner',
  'Quincy',
  'Maddox',
  'Sheffield',
  'Brennan',
  'Walsh',
  'Parker',
  'Keenan',
  'Sloane',
] as const;

const NICKNAMES = [
  'Skip',
  'Doc',
  'Red',
  'Chief',
  'Buck',
  'Ace',
  'Mack',
  'Lefty',
  'Bird',
  'Hawk',
] as const;

const BACKGROUNDS: readonly AssistantGMBackground[] = [
  'former_player',
  'career_scout',
  'front_office_lifer',
  'analytics_pioneer',
  'old_school_baseball_man',
] as const;

const PERSONALITIES: readonly AssistantGMPersonality[] = [
  'straight_shooter',
  'dry_wit',
  'enthusiastic_mentor',
  'grizzled_veteran',
  'analytical_mind',
] as const;

const PHILOSOPHY_OPTIONS = {
  pitchingOrHitting: ['pitching_wins', 'offense_wins', 'balanced'],
  developmentVsFA: ['grow_your_own', 'buy_stars', 'hybrid'],
  riskTolerance: ['conservative', 'calculated', 'aggressive'],
} as const satisfies {
  pitchingOrHitting: readonly BaseballPhilosophy['pitchingOrHitting'][];
  developmentVsFA: readonly BaseballPhilosophy['developmentVsFA'][];
  riskTolerance: readonly BaseballPhilosophy['riskTolerance'][];
};

const CATCHPHRASES: Record<AssistantGMPersonality, readonly string[]> = {
  straight_shooter: [
    'The truth plays in every park.',
    'Say it plain and build it right.',
    'This game rewards honesty.',
    'Cut the noise and fix the roster.',
    'Ballclubs improve when excuses stop.',
  ],
  dry_wit: [
    'Bold plans are cheaper on paper.',
    'Hope is not a depth chart.',
    'Nothing wakes up ownership like a bad fifth starter.',
    'The standings have a cruel sense of humor.',
    'Every rival looks smarter in April.',
  ],
  enthusiastic_mentor: [
    'There is a move here if we stay sharp.',
    'Good clubs get built one conviction at a time.',
    'This is where patient work starts paying off.',
    'Teach well and talent will answer.',
    'Let the roster know we believe in real standards.',
  ],
  grizzled_veteran: [
    "The game doesn't care what you think. It shows you.",
    'A season tells the truth eventually.',
    'Baseball humbles every room in the building.',
    'I trust what the grind keeps repeating.',
    'Windows close faster than owners admit.',
  ],
  analytical_mind: [
    'Patterns matter more than hunches.',
    'The numbers are a map, not a prayer.',
    'Good process compounds.',
    'If the evidence changes, so should the plan.',
    'Every roster decision leaves a trail in the data.',
  ],
};

function chooseName(rng: GameRNG): string {
  const name = `${pickTemplate(rng, FIRST_NAMES)} ${pickTemplate(rng, LAST_NAMES)}`;

  if (name.split(' ').length !== NAME_PART_COUNT) {
    throw new Error('Assistant GM name must contain exactly two parts.');
  }

  return name;
}

function choosePhilosophy(rng: GameRNG): BaseballPhilosophy {
  return {
    pitchingOrHitting: pickTemplate(rng.fork(), PHILOSOPHY_OPTIONS.pitchingOrHitting),
    developmentVsFA: pickTemplate(rng.fork(), PHILOSOPHY_OPTIONS.developmentVsFA),
    riskTolerance: pickTemplate(rng.fork(), PHILOSOPHY_OPTIONS.riskTolerance),
  };
}

function buildBio(profile: Omit<AssistantGMProfile, 'bio'>): string {
  const intro = `${profile.name}, known around the league as ${profile.nickname}, has spent ${profile.yearsInBaseball} years in baseball.`;
  const backgroundLine = (() => {
    switch (profile.background) {
      case 'former_player':
        return 'He played long enough to learn how a real clubhouse breathes and how a uniform changes the pressure on every pitch.';
      case 'career_scout':
        return 'He came up as a scout, living on backfields and chasing kids with real instincts before the rest of the league caught on.';
      case 'front_office_lifer':
        return 'He has spent most of his adult life in a front office, learning how executive discipline wins even when the headlines wander.';
      case 'analytics_pioneer':
        return 'He built his reputation on numbers, data, and models that could explain why a club was winning before the standings admitted it.';
      case 'old_school_baseball_man':
      default:
        return 'He still talks like an old school baseball man, and every story begins with back in my day because the lessons still hold.';
    }
  })();
  const philosophyLine = (() => {
    const pitchOrHit = profile.baseballPhilosophy.pitchingOrHitting === 'pitching_wins'
      ? 'pitching still sets the floor for October'
      : profile.baseballPhilosophy.pitchingOrHitting === 'offense_wins'
        ? 'impact bats change a franchise faster than anything else'
        : 'balance keeps the roster from lying to itself';
    const development = profile.baseballPhilosophy.developmentVsFA === 'grow_your_own'
      ? 'player development should carry the long view'
      : profile.baseballPhilosophy.developmentVsFA === 'buy_stars'
        ? 'star power is worth buying when the window is open'
        : 'the best clubs know when to develop and when to pay';

    return `He believes ${pitchOrHit}, and that ${development}.`;
  })();

  return `${intro} ${backgroundLine} ${philosophyLine}`;
}

export function generateAssistantGM(rng: GameRNG): AssistantGMProfile {
  const personality = pickTemplate(rng.fork(), PERSONALITIES);
  const profileWithoutBio: Omit<AssistantGMProfile, 'bio'> = {
    name: chooseName(rng.fork()),
    nickname: pickTemplate(rng.fork(), NICKNAMES),
    age: rng.nextInt(AGE_MIN, AGE_MAX),
    background: pickTemplate(rng.fork(), BACKGROUNDS),
    personality,
    baseballPhilosophy: choosePhilosophy(rng.fork()),
    catchphrase: pickTemplate(rng.fork(), CATCHPHRASES[personality]),
    yearsInBaseball: rng.nextInt(YEARS_IN_BASEBALL_MIN, YEARS_IN_BASEBALL_MAX),
  };

  return {
    ...profileWithoutBio,
    bio: buildBio(profileWithoutBio),
  };
}

export function getDialogueVoice(profile: AssistantGMProfile): DialogueVoice {
  switch (profile.personality) {
    case 'straight_shooter':
      return {
        formality: 'professional',
        usesAnalogy: false,
        usesStats: true,
        emotionalRange: 'reserved',
      };
    case 'dry_wit':
      return {
        formality: 'casual',
        usesAnalogy: true,
        usesStats: false,
        emotionalRange: 'moderate',
      };
    case 'enthusiastic_mentor':
      return {
        formality: 'casual',
        usesAnalogy: true,
        usesStats: false,
        emotionalRange: 'expressive',
      };
    case 'grizzled_veteran':
      return {
        formality: 'folksy',
        usesAnalogy: true,
        usesStats: false,
        emotionalRange: 'moderate',
      };
    case 'analytical_mind':
    default:
      return {
        formality: 'professional',
        usesAnalogy: false,
        usesStats: true,
        emotionalRange: 'reserved',
      };
  }
}

function backgroundReference(background: AssistantGMBackground): string {
  switch (background) {
    case 'former_player':
      return 'I played long enough to know what a real clubhouse sounds like when a club can win.';
    case 'career_scout':
      return 'I spent years scouting kids on backfields, so I can usually tell when a roster has real pulse.';
    case 'front_office_lifer':
      return 'I grew up in the front office side of this game, where every executive decision leaves a scar or a banner.';
    case 'analytics_pioneer':
      return 'I trust the numbers and the data, but only when they still sound like baseball.';
    case 'old_school_baseball_man':
    default:
      return 'Back in my day, the old school baseball men could size up a club in ten minutes, and the good ones were usually right.';
  }
}

export function generateGreeting(
  rng: GameRNG,
  profile: AssistantGMProfile,
  gmName: string,
  teamName: string,
): string {
  const openers = [
    `${gmName}, welcome in. I'm ${profile.name}, and around here they call me ${profile.nickname}.`,
    `${gmName}, good to have you. ${profile.name} here, though most people in this game still use ${profile.nickname}.`,
    `${gmName}, let's get to work. I'm ${profile.name}, and ${profile.nickname} has been good enough for every clubhouse I've walked into.`,
  ] as const;
  const teamReferences = [
    `The ${teamName} deserve a first read that sounds like baseball instead of paperwork.`,
    `This ${teamName} job comes with real stakes, which is the only kind worth taking seriously.`,
    `A club like the ${teamName} tells you a lot if you listen before you talk.`,
  ] as const;

  return `${pickTemplate(rng.fork(), openers)} ${backgroundReference(profile.background)} ${pickTemplate(rng.fork(), teamReferences)}`;
}

function seasonGoalAdvice(philosophy: GMPhilosophy): string {
  switch (philosophy.seasonGoal) {
    case 'championship':
      return 'If you are chasing a championship, act like a ring matters every day and not just in July.';
    case 'playoff':
      return 'A playoff push means building for October without pretending the regular season is automatic.';
    case 'rebuild':
      return 'A rebuild only works if your patience holds when the future finally asks to be trusted.';
    case 'compete':
    default:
      return 'If the plan is to compete, keep the window honest and keep the roster fighting for useful games.';
  }
}

export function generateFarewell(
  rng: GameRNG,
  profile: AssistantGMProfile,
  gmName: string,
  philosophy: GMPhilosophy,
): string {
  const closers = [
    `${gmName}, that's the board as I see it.`,
    `${gmName}, now you know where the pressure lives.`,
    `${gmName}, that is the club in plain language.`,
  ] as const;
  const supportLine = philosophy.tradeApproach === 'buyer'
    ? 'If the window opens, be ready to buy without flinching.'
    : philosophy.tradeApproach === 'seller'
      ? 'If the market tells you to sell, do it before sentiment gets expensive.'
      : 'Stay opportunistic, because smart clubs take value wherever the room gives it up.';

  return `${pickTemplate(rng.fork(), closers)} ${seasonGoalAdvice(philosophy)} ${supportLine} ${profile.catchphrase}`;
}
