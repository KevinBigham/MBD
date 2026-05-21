/**
 * Fixed AGM candidates for the "Day 1" onboarding selection flow.
 *
 * These three characters replace the procedural AGM generator when
 * ONBOARDING_MODE === 'selection'. Each candidate has a fully authored
 * voice, strengths, weaknesses, and catchphrases. Content is sourced
 * from REFERENCE/MUSE_SPARK_ONBOARDING_CHARACTERS.md.
 *
 * The character IDs are stable and persisted into the save schema via
 * `AGMCandidateIdEnum`. Do not rename without a schema migration.
 */
import type {
  AssistantGMBackground as AGMBackground,
  AssistantGMPersonality as AGMPersonality,
  AssistantGMProfile,
  BaseballPhilosophy as AGMPhilosophy,
} from './assistantGM.js';

export type { AGMBackground, AGMPersonality, AGMPhilosophy };

export type AGMCandidateId = 'marcus_chen' | 'elena_vargas' | 'walt_kowalski';

export interface VoiceStyle {
  sentenceLength: 'short' | 'medium' | 'long' | 'varied';
  usesAnalogy: boolean;
  usesStats: boolean;
  humor: 'dry' | 'warm' | 'gruff' | 'none';
  formality: 'casual' | 'professional' | 'folksy';
  emotionalRange: 'reserved' | 'moderate' | 'expressive';
}

export interface AGMCandidate {
  id: AGMCandidateId;
  name: string;
  nickname: string;
  gender: 'male' | 'female';
  age: number;
  background: AGMBackground;
  personality: AGMPersonality;
  philosophy: AGMPhilosophy;
  strengths: readonly [string, string, string];
  weaknesses: readonly [string, string];
  catchphrases: readonly [string, string, string, string, string];
  bio: string;
  selectionScreenBio: string;
  voiceStyle: VoiceStyle;
}

/**
 * The three fixed candidates. Order is stable and used by tests.
 * - Index 0: Marcus Chen (analytical, dry)
 * - Index 1: Walt Kowalski (grizzled veteran)
 * - Index 2: Elena Vargas (enthusiastic mentor)
 */
export const AGM_CANDIDATES: readonly [AGMCandidate, AGMCandidate, AGMCandidate] = [
  {
    id: 'marcus_chen',
    name: 'Marcus Chen',
    nickname: 'Marcus',
    gender: 'male',
    age: 34,
    background: 'analytics_pioneer',
    personality: 'analytical_mind',
    philosophy: {
      pitchingOrHitting: 'balanced',
      developmentVsFA: 'hybrid',
      riskTolerance: 'calculated',
    },
    strengths: [
      'Player valuation to the dollar',
      'Financial modeling across five-year horizons',
      'Market inefficiency detection',
    ],
    weaknesses: [
      'Thinks clubhouse chemistry is noise in the data',
      'Trusts numbers over the eyes',
    ],
    catchphrases: [
      'The numbers say...',
      'Small sample size, but...',
      'Expected value is...',
      'My model hates this, but...',
      'Updating priors.',
    ],
    bio: 'Marcus Chen built one of the best projection systems in the league during three years at Portland Sasquatch. MIT applied math before that, three years at a quant hedge fund before that. Left Portland last year after a disagreement about trading a 23-year-old shortstop -- they traded him, Marcus was right, the kid is now a 5-WAR player in Austin. Available because he does not interview well.',
    selectionScreenBio: 'Marcus Chen, 34. Former quant, current baseball ops refugee. Built one of the best projection systems in the league, got fired for using it too aggressively. Thinks in spreadsheets, talks in WAR, sleeps maybe four hours a night. Will tell you exactly what every player is worth and exactly why you are wrong. Sometimes both at once.',
    voiceStyle: {
      sentenceLength: 'short',
      usesAnalogy: false,
      usesStats: true,
      humor: 'dry',
      formality: 'professional',
      emotionalRange: 'reserved',
    },
  },
  {
    id: 'walt_kowalski',
    name: 'Walter Kowalski',
    nickname: 'Walt',
    gender: 'male',
    age: 58,
    background: 'former_player',
    personality: 'grizzled_veteran',
    philosophy: {
      pitchingOrHitting: 'pitching_wins',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'conservative',
    },
    strengths: [
      'Clubhouse culture reads',
      'Player evaluation by eye',
      'Managing personalities across 35 years of rooms',
    ],
    weaknesses: [
      'Skeptical of metrics he cannot see with his eyes',
      'Treats modern contract structures as over-engineered',
    ],
    catchphrases: [
      "Kid's got...",
      'Plays the game the right way',
      "I've seen this before",
      'Back when travel days were travel days...',
      "Baseball's a funny game",
    ],
    bio: 'Walter Kowalski played twelve seasons as a first baseman, mostly with Detroit Motor Kings. .271 lifetime, 187 home runs, one World Series appearance (lost). Coached eight years, managed four in the minors, scouted six. Last team was Milwaukee Suds -- they hired a 32-year-old GM who wanted a more modern voice in the front office. Walt took it personally.',
    selectionScreenBio: 'Walt Kowalski, 58. Twelve years as a player, eight as a coach, six as a scout. Has been in baseball since 1987. Found a 19th-round closer, lost a playoff game by being too loyal, still thinks about it. Believes in heart, hustle, and playing the game right. Does not trust numbers he cannot see. Has forgotten more baseball than most people ever learn.',
    voiceStyle: {
      sentenceLength: 'short',
      usesAnalogy: false,
      usesStats: false,
      humor: 'gruff',
      formality: 'folksy',
      emotionalRange: 'moderate',
    },
  },
  {
    id: 'elena_vargas',
    name: 'Elena Vargas',
    nickname: 'Vargs',
    gender: 'female',
    age: 47,
    background: 'career_scout',
    personality: 'enthusiastic_mentor',
    philosophy: {
      pitchingOrHitting: 'balanced',
      developmentVsFA: 'grow_your_own',
      riskTolerance: 'calculated',
    },
    strengths: [
      'Player development calibrated to each prospect',
      'International scouting network across DR and Venezuela',
      'Clear communication with owners, players, and media alike',
    ],
    weaknesses: [
      'Gets attached -- will fight for a guy one year too long',
      'Tolerates budgets rather than loving them',
    ],
    catchphrases: [
      'Let me tell you about...',
      "Kid's got...",
      "I've seen this before",
      'Trust me on this one',
      'Tiene [fuego].',
    ],
    bio: 'Elena Vargas signed out of high school in the Dominican Republic, played six years in the minors as a utility infielder, never made The Show. Moved into scouting at 26 and spent fourteen years on the road in the DR and Venezuela. Joined Kansas City Fountains as Director of International Scouting in 2018. Left last month when a new GM brought in his own people.',
    selectionScreenBio: 'Elena Vargas, 47. Fourteen years scouting in the Dominican and Venezuela, six years playing in the minors before that. Signed an $80K kid who became a $180M star. Knows every prospect\'s family, every coach\'s phone number, every back road to every academy. Believes players are people first. Will fight for her guys. Sometimes too hard.',
    voiceStyle: {
      sentenceLength: 'varied',
      usesAnalogy: true,
      usesStats: false,
      humor: 'warm',
      formality: 'casual',
      emotionalRange: 'expressive',
    },
  },
] as const;

const CANDIDATE_BY_ID = new Map<AGMCandidateId, AGMCandidate>(
  AGM_CANDIDATES.map((candidate) => [candidate.id, candidate]),
);

const MIN_YEARS_IN_BASEBALL = 10;

function yearsInBaseballFromAge(age: number): number {
  return Math.max(MIN_YEARS_IN_BASEBALL, age - 22);
}

export function selectAGM(id: AGMCandidateId): AGMCandidate {
  const candidate = CANDIDATE_BY_ID.get(id);
  if (candidate == null) {
    throw new Error(`Unknown AGM candidate: ${id}`);
  }

  return candidate;
}

/**
 * Convert a fixed candidate into the legacy AssistantGMProfile shape.
 * This keeps all downstream dialogue/choice-reaction/opinion code
 * working against the existing profile interface.
 */
export function toAssistantGMProfile(candidate: AGMCandidate): AssistantGMProfile {
  return {
    name: candidate.name,
    nickname: candidate.nickname,
    age: candidate.age,
    background: candidate.background,
    personality: candidate.personality,
    baseballPhilosophy: candidate.philosophy,
    catchphrase: candidate.catchphrases[0],
    yearsInBaseball: yearsInBaseballFromAge(candidate.age),
    bio: candidate.bio,
  };
}
