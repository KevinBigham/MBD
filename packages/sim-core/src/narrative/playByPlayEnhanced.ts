import type { GameRNG } from '../math/prng.js';
import type { PAOutcome, PAResult } from '../sim/plateAppearance.js';

interface TemplateVariant {
  readonly build: (context: PlayByPlayContext) => string;
  readonly weight: number;
  readonly excitement: number;
}

export interface PlayByPlayContext {
  inning: number;
  outs: number;
  runnersOn: number;
  scoreDifferential: number;
  isHomeTeam: boolean;
  batterName: string;
  pitcherName: string;
  gameImportance: 'regular' | 'playoff' | 'world_series';
}

export interface EnhancedPlayByPlayEntry {
  text: string;
  excitement: 1 | 2 | 3 | 4 | 5;
  isHighlight: boolean;
  situation: string;
}

export const SITUATION_CONTEXTS: Record<string, string> = {
  walk_off: 'Final swing with the home club able to end the game immediately.',
  bases_loaded: 'Every base is occupied and one swing can flip the inning.',
  two_outs_runners_on: 'The inning hangs on this pitch with traffic aboard.',
  extra_innings: 'The game has pushed beyond regulation.',
  ninth_inning: 'A late-game moment in the ninth inning.',
  tie_game_late: 'A tie game in the late innings.',
  blowout: 'The score margin has stretched into a lopsided game.',
  first_inning: 'The opening inning tone-setter.',
  standard: 'A standard game situation.',
};

const OUTCOME_TEMPLATES: Record<PAOutcome, readonly TemplateVariant[]> = {
  HR: [
    { weight: 4, excitement: 4, build: ({ batterName, pitcherName }) => `${batterName} unloads on ${pitcherName} and sends a towering drive screaming into the seats.` },
    { weight: 3, excitement: 4, build: ({ batterName, pitcherName }) => `${batterName} turns on ${pitcherName} and launches one deep enough that nobody bothers chasing it.` },
    { weight: 2, excitement: 5, build: ({ batterName, pitcherName }) => `${pitcherName} leaves a mistake up, and ${batterName} punishes it with a moonshot.` },
    { weight: 3, excitement: 4, build: ({ batterName, pitcherName }) => `${batterName} drives ${pitcherName}'s offering a long way to the pull side for a no-doubt homer.` },
    { weight: 2, excitement: 5, build: ({ batterName, pitcherName }) => `${batterName} hammers ${pitcherName} with a blast that changes the shape of this game.` },
  ],
  K: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} ties up ${batterName} and finishes the at-bat with a strikeout.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} chases late, and ${pitcherName} records the punchout.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} wins the sequence, freezing ${batterName} for strike three.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} cannot catch up to ${pitcherName}, who collects another strikeout.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} climbs the ladder and ${batterName} comes up empty.` },
  ],
  SINGLE: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} lines ${pitcherName}'s pitch into the outfield for a clean single.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} shoots a sharp single off ${pitcherName} to keep the inning alive.` },
    { weight: 3, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} gives up a firm base hit as ${batterName} punches one through the infield.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} stays on ${pitcherName}'s pitch and slaps it safely into center.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} drops a single in front of the outfielders against ${pitcherName}.` },
  ],
  DOUBLE: [
    { weight: 4, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} rips ${pitcherName}'s pitch into the gap and hustles into second.` },
    { weight: 3, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} is burned by ${batterName}, who drives a ringing double off the wall.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} splits the alleys off ${pitcherName} for extra bases.` },
    { weight: 2, excitement: 3, build: ({ batterName, pitcherName }) => `${batterName} turns on ${pitcherName} and is standing on second with a loud double.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} cannot keep ${batterName} in the yard, and the result is a sprinting double.` },
  ],
  TRIPLE: [
    { weight: 3, excitement: 3, build: ({ batterName, pitcherName }) => `${batterName} shoots one past everybody off ${pitcherName} and tears all the way to third.` },
    { weight: 2, excitement: 4, build: ({ batterName, pitcherName }) => `${pitcherName} watches helplessly as ${batterName} races around the bases for a triple.` },
    { weight: 2, excitement: 3, build: ({ batterName, pitcherName }) => `${batterName} finds the alley against ${pitcherName} and never slows down until third base.` },
    { weight: 2, excitement: 4, build: ({ batterName, pitcherName }) => `${batterName} stretches ${pitcherName}'s mistake into a roaring triple.` },
    { weight: 1, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} gets tagged and ${batterName} flies into third with three bases earned.` },
  ],
  BB: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} misses off the edge, and ${batterName} takes the walk.` },
    { weight: 3, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} stays patient and works ${pitcherName} for ball four.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} cannot finish ${batterName}, who earns a free pass.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} wins the count against ${pitcherName} and heads to first.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} falls behind, and ${batterName} gladly accepts the walk.` },
  ],
  GB_OUT: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} rolls ${pitcherName}'s pitch on the ground for a routine out.` },
    { weight: 3, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} gets the ground ball he wanted from ${batterName}.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} beats the ball into the dirt, but ${pitcherName} still gets the out.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} coaxes a soft grounder, and ${batterName} is retired.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} taps one harmlessly against ${pitcherName}, who lets the defense handle it.` },
  ],
  FB_OUT: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} gets under ${pitcherName}'s pitch and sends a harmless fly ball into a glove.` },
    { weight: 3, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} gets ${batterName} to lift one lazily for the out.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} drives it to the air, but ${pitcherName} survives with a routine fly out.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} keeps ${batterName} off balance and induces a playable fly.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} sends one to the outfield, though not far enough to hurt ${pitcherName}.` },
  ],
  LD_OUT: [
    { weight: 4, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} stings a liner off ${pitcherName}, but it is caught for the out.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} nearly gets burned, yet ${batterName}'s liner finds leather.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} squares ${pitcherName} up, and a defender still steals the hit.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} watches ${batterName} line out on a ball that looked promising off the bat.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} barrels it, but ${pitcherName} gets the result anyway with a lineout.` },
  ],
  DOUBLE_PLAY: [
    { weight: 4, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} gets the exact grounder he needed, and ${batterName} is erased in a double play.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} rolls one over against ${pitcherName}, and two outs arrive in a blur.` },
    { weight: 3, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} escapes the jam as ${batterName} bounces into the twin killing.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} cannot beat it out after ${pitcherName} induces an inning-changing double play.` },
    { weight: 2, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} turns trouble into relief when ${batterName} grounds into two.` },
  ],
  HBP: [
    { weight: 4, excitement: 1, build: ({ batterName, pitcherName }) => `${pitcherName} runs one too far inside and clips ${batterName}.` },
    { weight: 3, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} wears a pitch from ${pitcherName} and takes first base.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} loses the handle on an inside pitch, and ${batterName} is hit.` },
    { weight: 2, excitement: 1, build: ({ batterName, pitcherName }) => `${batterName} gets plunked by ${pitcherName} and trots to first.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} misses badly, sending ${batterName} aboard with a hit-by-pitch.` },
  ],
  SAC_FLY: [
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} drives a deep fly off ${pitcherName} that is plenty deep for the run to score.` },
    { weight: 3, excitement: 2, build: ({ batterName, pitcherName }) => `${pitcherName} records the out, but ${batterName} still lifts home a run with a sacrifice fly.` },
    { weight: 2, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} sends a productive fly ball against ${pitcherName}, and the runner tags safely.` },
    { weight: 2, excitement: 3, build: ({ batterName, pitcherName }) => `${pitcherName} gives up a costly sacrifice fly as ${batterName} gets the job done.` },
    { weight: 1, excitement: 2, build: ({ batterName, pitcherName }) => `${batterName} cannot beat ${pitcherName}, but he does deliver a run with the sac fly.` },
  ],
} as const;

const WALK_OFF_TEMPLATES: readonly TemplateVariant[] = [
  { weight: 4, excitement: 5, build: ({ batterName, pitcherName }) => `${batterName} delivers the walk-off blow against ${pitcherName}, and the stadium erupts at once.` },
  { weight: 3, excitement: 5, build: ({ batterName, pitcherName }) => `${pitcherName} cannot survive the moment, and ${batterName} ends it with a walk-off swing.` },
  { weight: 3, excitement: 5, build: ({ batterName, pitcherName }) => `${batterName} sends ${pitcherName} into heartbreak with a walk-off finish.` },
  { weight: 2, excitement: 5, build: ({ batterName, pitcherName }) => `${batterName} is mobbed after walking it off against ${pitcherName}.` },
  { weight: 2, excitement: 5, build: ({ batterName, pitcherName }) => `${pitcherName} makes one last mistake, and ${batterName} turns it into a walk-off memory.` },
] as const;

function clamp(value: number, min: number, max: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(min, Math.min(max, value)) as 1 | 2 | 3 | 4 | 5;
}

function pickTemplate(rng: GameRNG, templates: readonly TemplateVariant[]): TemplateVariant {
  return rng.weightedPick(
    templates,
    templates.map((template) => template.weight),
  );
}

function getImportanceLead(context: PlayByPlayContext): string {
  switch (context.gameImportance) {
    case 'playoff':
      return 'Postseason pressure: ';
    case 'world_series':
      return 'World Series spotlight: ';
    default:
      return '';
  }
}

function getSituationTag(paResult: PAResult, context: PlayByPlayContext): string {
  if (paResult.isWalkOff) {
    return 'walk_off';
  }
  if (context.runnersOn === 3) {
    return 'bases_loaded';
  }
  if (context.outs === 2 && context.runnersOn > 0) {
    return 'two_outs_runners_on';
  }
  if (context.inning >= 10) {
    return 'extra_innings';
  }
  if (context.inning === 9) {
    return 'ninth_inning';
  }
  if (context.inning >= 8 && context.scoreDifferential === 0) {
    return 'tie_game_late';
  }
  if (Math.abs(context.scoreDifferential) >= 5) {
    return 'blowout';
  }
  if (context.inning === 1) {
    return 'first_inning';
  }
  return 'standard';
}

function getExcitementBoost(
  context: PlayByPlayContext,
  situation: string,
): number {
  let boost = 0;

  if (context.gameImportance === 'playoff') {
    boost += 1;
  } else if (context.gameImportance === 'world_series') {
    boost += 2;
  }

  if (situation === 'tie_game_late' || situation === 'bases_loaded') {
    boost += 1;
  }
  if (situation === 'extra_innings') {
    boost += 1;
  }

  return boost;
}

function isHighlightOutcome(paResult: PAResult, situation: string): boolean {
  return paResult.outcome === 'HR'
    || paResult.isWalkOff
    || situation === 'bases_loaded'
    || situation === 'extra_innings';
}

export function generateEnhancedPlayByPlay(
  rng: GameRNG,
  paResult: PAResult,
  context: PlayByPlayContext,
): EnhancedPlayByPlayEntry {
  const situation = getSituationTag(paResult, context);
  const templates = paResult.isWalkOff
    ? WALK_OFF_TEMPLATES
    : OUTCOME_TEMPLATES[paResult.outcome];
  const template = pickTemplate(rng, templates);
  const importanceLead = getImportanceLead(context);
  const excitement = paResult.isWalkOff
    ? 5
    : clamp(template.excitement + getExcitementBoost(context, situation), 1, 5);

  return {
    text: `${importanceLead}${template.build(context)}`,
    excitement,
    isHighlight: isHighlightOutcome(paResult, situation),
    situation,
  };
}
